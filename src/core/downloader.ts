import { internalSerializeKey, supportLocalMediaType } from "@/constants/commonConst";
import pathConst from "@/constants/pathConst";
import { IAppConfig } from "@/types/core/config";
import { IInjectable } from "@/types/infra";
import { addFileScheme, escapeCharacter } from "@/utils/fileUtils";
import { errorLog } from "@/utils/log";
import { patchMediaExtra } from "@/utils/mediaExtra";
import { getMediaUniqueKey, isSameMediaItem } from "@/utils/mediaUtils";
import network from "@/utils/network";
import { getQualityOrder } from "@/utils/qualities";
import EventEmitter from "eventemitter3";
import { atom, getDefaultStore, useAtomValue } from "jotai";
import { nanoid } from "nanoid/non-secure";
import { useEffect, useState } from "react";
import { downloadFile, stopDownload, unlink } from "react-native-fs";
import LocalMusicSheet from "./localMusicSheet";
import { IPluginManager } from "@/types/core/pluginManager";
import { getDownloadDestination } from "./downloadDestination";
import StorageAccess from "@/native/storageAccess";


export enum DownloadStatus {
    // 等待下载
    Pending,
    // 准备下载链接
    Preparing,
    // 下载中
    Downloading,
    // 下载完成
    Completed,
    // 下载失败
    Error,
    Cancelled,
}


export enum DownloaderEvent {
    // 某次下载行为出错
    DownloadError = "download-error",

    // 下载任务更新
    DownloadTaskUpdate = "download-task-update",

    // 下载某个音乐时出错
    DownloadTaskError = "download-task-error",

    // 下载完成
    DownloadQueueCompleted = "download-queue-completed",
}

export enum DownloadFailReason {
    /** 无网络 */
    NetworkOffline = "network-offline",
    /** 设置-禁止在移动网络下下载 */
    NotAllowToDownloadInCellular = "not-allow-to-download-in-cellular",
    /** 无法获取到媒体源 */
    FailToFetchSource = "no-valid-source",
    /** 没有文件写入的权限 */
    NoWritePermission = "no-write-permission",
    Unknown = "unknown",
}

interface IDownloadTaskInfo {
    // 状态
    status: DownloadStatus;
    // 目标文件名
    filename: string;
    // 下载id
    jobId?: number;
    // 下载音质
    quality?: IMusic.IQualityKey;
    // 文件大小
    fileSize?: number;
    // 已下载大小
    downloadedSize?: number;
    // 音乐信息
    musicItem: IMusic.IMusicItem;
    // 如果下载失败，下载失败的原因
    errorReason?: DownloadFailReason;
}

export interface IDownloadEnqueueResult {
    /** 成功加入下载队列的歌曲数量。 */
    enqueuedCount: number;
    /** 因已经下载或已在队列中而跳过的歌曲数量。 */
    skippedCount: number;
    /** 本次请求被拒绝的原因；未拒绝时为 undefined。 */
    rejectionReason?: DownloadFailReason;
}


const downloadQueueAtom = atom<IMusic.IMusicItem[]>([]);
const downloadTasks = new Map<string, IDownloadTaskInfo>();


interface IEvents {
    /** 某次下载行为出现报错 */
    [DownloaderEvent.DownloadError]: (reason: DownloadFailReason, error?: Error) => void;
    /** 下载某个媒体时报错 */
    [DownloaderEvent.DownloadTaskError]: (reason: DownloadFailReason, mediaItem: IMusic.IMusicItem, error?: Error) => void;
    /** 下载任务更新 */
    [DownloaderEvent.DownloadTaskUpdate]: (task: IDownloadTaskInfo) => void;
    /** 下载队列清空 */
    [DownloaderEvent.DownloadQueueCompleted]: () => void;
}

export class Downloader extends EventEmitter<IEvents> implements IInjectable {
    private configService!: IAppConfig;
    private pluginManagerService!: IPluginManager;

    private downloadingCount = 0;
    private queueCompletionEmitted = false;
    private cancelledTaskKeys = new Set<string>();

    private static generateFilename(musicItem: IMusic.IMusicItem) {
        return `${escapeCharacter(musicItem.platform)}@${escapeCharacter(
            musicItem.id,
        )}@${escapeCharacter(musicItem.title)}@${escapeCharacter(
            musicItem.artist,
        )}`.slice(0, 200);
    }


    injectDependencies(configService: IAppConfig, pluginManager: IPluginManager): void {
        this.configService = configService;
        this.pluginManagerService = pluginManager;
    }

    private updateDownloadTask(musicItem: IMusic.IMusicItem, patch: Partial<IDownloadTaskInfo>) {
        const newValue = {
            ...downloadTasks.get(getMediaUniqueKey(musicItem)),
            ...patch,
        } as IDownloadTaskInfo;
        downloadTasks.set(getMediaUniqueKey(musicItem), newValue);
        this.emit(DownloaderEvent.DownloadTaskUpdate, newValue);
        return newValue;
    }

    // 开始下载
    private markTaskAsStarted(musicItem: IMusic.IMusicItem) {
        this.downloadingCount++;
        this.updateDownloadTask(musicItem, {
            status: DownloadStatus.Preparing,
        });
    }

    private markTaskAsCompleted(musicItem: IMusic.IMusicItem) {
        this.downloadingCount--;
        this.updateDownloadTask(musicItem, {
            status: DownloadStatus.Completed,
        });
    }

    private markTaskAsError(musicItem: IMusic.IMusicItem, reason: DownloadFailReason, error?: Error) {
        this.downloadingCount--;
        this.updateDownloadTask(musicItem, {
            status: DownloadStatus.Error,
            errorReason: reason,
        });
        this.emit(DownloaderEvent.DownloadTaskError, reason, musicItem, error);
    }

    private markTaskAsCancelled(musicItem: IMusic.IMusicItem) {
        const key = getMediaUniqueKey(musicItem);
        this.downloadingCount = Math.max(0, this.downloadingCount - 1);
        this.updateDownloadTask(musicItem, {
            status: DownloadStatus.Cancelled,
        });
        this.cancelledTaskKeys.delete(key);
        downloadTasks.delete(key);
        const queue = getDefaultStore().get(downloadQueueAtom);
        getDefaultStore().set(
            downloadQueueAtom,
            queue.filter(item => !isSameMediaItem(item, musicItem)),
        );
    }

    private isTaskCancelled(musicItem: IMusic.IMusicItem) {
        return this.cancelledTaskKeys.has(getMediaUniqueKey(musicItem));
    }

    /** 匹配文件后缀 */
    private getExtensionName(url: string) {
        try {
            const pathname = new URL(url).pathname;
            return pathname.match(/\.([^./]+)$/)?.[1]?.toLowerCase() ?? "mp3";
        } catch {
            return "mp3";
        }
    };

    /** 获取缓存的下载路径 */
    private getCacheDownloadPath(fileName: string) {
        const cachePath = pathConst.downloadCachePath;
        if (!cachePath.endsWith("/")) {
            return `${cachePath}/${fileName ?? ""}`;
        }
        return fileName ? cachePath + fileName : cachePath;
    }


    private pumpDownloadQueue() {
        const maxDownloadCount = Math.max(1, Math.min(+(this.configService.getConfig("basic.maxDownload") || 3), 10));
        while (this.downloadingCount < maxDownloadCount) {
            const queue = getDefaultStore().get(downloadQueueAtom);
            const nextTask = queue
                .map(musicItem => downloadTasks.get(getMediaUniqueKey(musicItem)))
                .find(task => task?.status === DownloadStatus.Pending);

            if (!nextTask) {
                if (this.downloadingCount === 0 && !this.queueCompletionEmitted) {
                    this.queueCompletionEmitted = true;
                    this.emit(DownloaderEvent.DownloadQueueCompleted);
                }
                return;
            }

            this.markTaskAsStarted(nextTask.musicItem);
            this.runDownloadTask(nextTask)
                .catch(error => {
                    const task = downloadTasks.get(
                        getMediaUniqueKey(nextTask.musicItem),
                    );
                    if (
                        task?.status === DownloadStatus.Preparing ||
                        task?.status === DownloadStatus.Downloading
                    ) {
                        this.markTaskAsError(
                            nextTask.musicItem,
                            DownloadFailReason.Unknown,
                            error,
                        );
                    }
                })
                .finally(() => {
                    this.pumpDownloadQueue();
                });
        }
    }

    private async runDownloadTask(nextTask: IDownloadTaskInfo) {
        const musicItem = nextTask.musicItem;
        let url = musicItem.url;
        let headers = musicItem.headers;
        const plugin = this.pluginManagerService.getByName(musicItem.platform);

        try {
            if (plugin) {
                const qualityOrder = getQualityOrder(
                    nextTask.quality ??
                    this.configService.getConfig("basic.defaultDownloadQuality") ??
                    "standard",
                    this.configService.getConfig("basic.downloadQualityOrder") ?? "asc",
                );
                let data: IPlugin.IMediaSourceResult | null = null;
                for (let quality of qualityOrder) {
                    try {
                        data = await plugin.methods.getMediaSource(
                            musicItem,
                            quality,
                            1,
                            true,
                        );
                        if (!data?.url) {
                            continue;
                        }
                        break;
                    } catch { }
                }
                url = data?.url ?? url;
                headers = data?.headers;
            }
            if (!url) {
                throw new Error(DownloadFailReason.FailToFetchSource);
            }
        } catch (e: any) {
            /** 无法下载，跳过 */
            errorLog("下载失败-无法获取下载链接", {
                item: {
                    id: musicItem.id,
                    title: musicItem.title,
                    platform: musicItem.platform,
                    quality: nextTask.quality,
                },
                reason: e?.message ?? e,
            });

            if (e.message === DownloadFailReason.FailToFetchSource) {
                this.markTaskAsError(musicItem, DownloadFailReason.FailToFetchSource, e);
            } else {
                this.markTaskAsError(musicItem, DownloadFailReason.Unknown, e);
            }
            return;
        }

        if (this.isTaskCancelled(musicItem)) {
            this.markTaskAsCancelled(musicItem);
            return;
        }

        // 下载逻辑
        // 识别文件后缀
        let extension = this.getExtensionName(url);
        if (supportLocalMediaType.every(item => item !== ("." + extension))) {
            extension = "mp3";
        }

        // 缓存下载地址
        const cacheDownloadPath = addFileScheme(
            this.getCacheDownloadPath(`${nanoid()}.${extension}`),
        );

        const targetFileName = `${nextTask.filename}.${extension}`;
        const mimeType =
            extension === "flac"
                ? "audio/flac"
                : extension === "m4a"
                    ? "audio/mp4"
                    : extension === "wav"
                        ? "audio/wav"
                        : "audio/mpeg";

        // 下载
        const { promise } = downloadFile({
            fromUrl: url ?? "",
            toFile: cacheDownloadPath,
            headers: headers,
            background: true,
            progressInterval: 300,
            begin: (res) => {
                this.updateDownloadTask(musicItem, {
                    status: DownloadStatus.Downloading,
                    downloadedSize: 0,
                    fileSize: res.contentLength,
                    jobId: res.jobId,
                });
            },
            progress: (res) => {
                this.updateDownloadTask(musicItem, {
                    status: DownloadStatus.Downloading,
                    downloadedSize: res.bytesWritten,
                    fileSize: res.contentLength,
                    jobId: res.jobId,
                });
            },
        });

        try {
            await promise;
            if (this.isTaskCancelled(musicItem)) {
                this.markTaskAsCancelled(musicItem);
                try {
                    await unlink(cacheDownloadPath);
                } catch {}
                return;
            }
            const targetUri = await getDownloadDestination().publish(
                cacheDownloadPath,
                targetFileName,
                mimeType,
                musicItem,
            );
            if (this.isTaskCancelled(musicItem)) {
                try {
                    if (targetUri.startsWith("content://")) {
                        await StorageAccess.deleteDocument(targetUri);
                    } else {
                        await unlink(targetUri);
                    }
                } catch {}
                this.markTaskAsCancelled(musicItem);
                try {
                    await unlink(cacheDownloadPath);
                } catch {}
                return;
            }

            await LocalMusicSheet.addMusic({
                ...musicItem,
                [internalSerializeKey]: {
                    localPath: targetUri,
                },
            });

            patchMediaExtra(musicItem, {
                downloaded: true,
                localPath: targetUri,
            });

            this.markTaskAsCompleted(musicItem);
        } catch (e: any) {
            if (this.isTaskCancelled(musicItem)) {
                this.markTaskAsCancelled(musicItem);
                try {
                    await unlink(cacheDownloadPath);
                } catch {}
                return;
            }
            const reason = String(e?.code ?? "").includes("TREE") ||
                String(e?.code ?? "").includes("PUBLISH")
                ? DownloadFailReason.NoWritePermission
                : DownloadFailReason.Unknown;
            this.markTaskAsError(musicItem, reason, e);
        }

        // 清理工作
        try {
            await unlink(cacheDownloadPath);
        } catch {}

        // 如果任务状态是完成，则从队列中移除
        const key = getMediaUniqueKey(musicItem);
        if (downloadTasks.get(key)?.status === DownloadStatus.Completed) {
            downloadTasks.delete(key);
            const queue = getDefaultStore().get(downloadQueueAtom);
            const newDownloadQueue = queue.filter(
                item => !isSameMediaItem(item, musicItem),
            );
            getDefaultStore().set(downloadQueueAtom, newDownloadQueue);
        }
    }

    download(
        musicItems: IMusic.IMusicItem | IMusic.IMusicItem[],
        quality?: IMusic.IQualityKey,
    ): IDownloadEnqueueResult {
        if (network.isOffline) {
            this.emit(DownloaderEvent.DownloadError, DownloadFailReason.NetworkOffline);
            return {
                enqueuedCount: 0,
                skippedCount: Array.isArray(musicItems) ? musicItems.length : 1,
                rejectionReason: DownloadFailReason.NetworkOffline,
            };
        }

        if (network.isCellular && !this.configService.getConfig("basic.useCelluarNetworkDownload")) {
            this.emit(DownloaderEvent.DownloadError, DownloadFailReason.NotAllowToDownloadInCellular);
            return {
                enqueuedCount: 0,
                skippedCount: Array.isArray(musicItems) ? musicItems.length : 1,
                rejectionReason: DownloadFailReason.NotAllowToDownloadInCellular,
            };
        }

        // 整理成数组
        if (!Array.isArray(musicItems)) {
            musicItems = [musicItems];
        }

        const requestedCount = musicItems.length;

        // 防止重复下载
        musicItems = musicItems.filter(m => {
            const key = getMediaUniqueKey(m);
            // 如果存在下载任务
            if (downloadTasks.has(key)) {
                return false;
            }
            // TODO: 如果已经下载了，也应该返回false
            if (LocalMusicSheet.isLocalMusic(m)) {
                return false;
            }

            // 设置下载任务
            downloadTasks.set(getMediaUniqueKey(m), {
                status: DownloadStatus.Pending,
                filename: Downloader.generateFilename(m),
                quality: quality,
                musicItem: m,
            });

            return true;
        });

        if (!musicItems.length) {
            return {
                enqueuedCount: 0,
                skippedCount: requestedCount,
            };
        }

        // 添加进任务队列
        const downloadQueue = getDefaultStore().get(downloadQueueAtom);
        const newDownloadQueue = [...downloadQueue, ...musicItems];
        getDefaultStore().set(downloadQueueAtom, newDownloadQueue);

        this.queueCompletionEmitted = false;
        this.pumpDownloadQueue();

        return {
            enqueuedCount: musicItems.length,
            skippedCount: requestedCount - musicItems.length,
        };
    }

    remove(musicItem: IMusic.IMusicItem) {
        // 删除下载任务
        const key = getMediaUniqueKey(musicItem);
        const task = downloadTasks.get(key);
        if (!task) {
            return false;
        }
        if (task.status === DownloadStatus.Pending || task.status === DownloadStatus.Error) {
            downloadTasks.delete(key);
            const downloadQueue = getDefaultStore().get(downloadQueueAtom);
            const newDownloadQueue = downloadQueue.filter(item => !isSameMediaItem(item, musicItem));
            getDefaultStore().set(downloadQueueAtom, newDownloadQueue);
            return true;
        }
        if (
            task.status === DownloadStatus.Preparing ||
            task.status === DownloadStatus.Downloading
        ) {
            this.cancelledTaskKeys.add(key);
            if (task.jobId !== undefined) {
                stopDownload(task.jobId);
            }
            return true;
        }
        return false;
    }

    retry(musicItem: IMusic.IMusicItem) {
        const task = downloadTasks.get(getMediaUniqueKey(musicItem));
        if (task?.status !== DownloadStatus.Error) {
            return false;
        }

        this.updateDownloadTask(musicItem, {
            status: DownloadStatus.Pending,
            errorReason: undefined,
            downloadedSize: 0,
            fileSize: undefined,
            jobId: undefined,
        });
        this.queueCompletionEmitted = false;
        this.pumpDownloadQueue();
        return true;
    }

    getTaskStatus(musicItem: IMusic.IMusicItem) {
        return downloadTasks.get(getMediaUniqueKey(musicItem))?.status;
    }

    onTaskUpdate(callback: () => void) {
        const handler = () => callback();
        this.on(DownloaderEvent.DownloadTaskUpdate, handler);
        return () => {
            this.off(DownloaderEvent.DownloadTaskUpdate, handler);
        };
    }
}


const downloader = new Downloader();
export default downloader;

export function resetDownloaderStateForTests() {
    downloadTasks.clear();
    getDefaultStore().set(downloadQueueAtom, []);
}

export function useDownloadTask(musicItem: IMusic.IMusicItem) {
    const [downloadStatus, setDownloadStatus] = useState(downloadTasks.get(getMediaUniqueKey(musicItem)) ?? null);

    useEffect(() => {
        const callback = (task: IDownloadTaskInfo) => {
            if (isSameMediaItem(task?.musicItem, musicItem)) {
                setDownloadStatus(task);
            }
        };
        downloader.on(DownloaderEvent.DownloadTaskUpdate, callback);

        return () => {
            downloader.off(DownloaderEvent.DownloadTaskUpdate, callback);
        };
    }, [musicItem]);

    return downloadStatus;
}

export const useDownloadQueue = () => useAtomValue(downloadQueueAtom);
