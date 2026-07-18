import {
    StorageKeys,
    internalSerializeKey,
    supportLocalMediaType,
} from "@/constants/commonConst";
import mp3Util, { IBasicMeta } from "@/native/mp3Util";
import { addFileScheme, getFileName } from "@/utils/fileUtils.ts";
import {
    getLocalPath,
    isSameMediaItem,
} from "@/utils/mediaUtils";
import {
    collectLocalMediaPaths,
    mergeUniqueLocalMusic,
} from "./localMusicUtils";
import StateMapper from "@/utils/stateMapper";
import { getStorage, setStorage } from "@/utils/storage";
import asyncFilterInBatches from "@/utils/asyncFilterInBatches";
import CryptoJs from "crypto-js";
import { nanoid } from "nanoid/non-secure";
import { useEffect, useState } from "react";
import { ReadDirItem, exists, readDir, unlink } from "react-native-fs";
import StorageAccess, { IStorageDocument } from "@/native/storageAccess";

let localSheet: IMusic.IMusicItem[] = [];
const localSheetStateMapper = new StateMapper(() => localSheet);
interface ILocalMusicMeta {
    lastScanAt?: number;
}
let localMeta: ILocalMusicMeta = {};
const localMetaStateMapper = new StateMapper(() => localMeta);

export async function setup() {
    const meta = await getStorage(StorageKeys.LocalMusicMeta);
    localMeta = meta && typeof meta === "object" ? meta : {};
    const sheet = await getStorage(StorageKeys.LocalMusicSheet);
    if (sheet) {
        const musicSheet = sheet as IMusic.IMusicItem[];
        const validSheet = await asyncFilterInBatches<IMusic.IMusicItem>(
            musicSheet,
            async musicItem => {
                const localPath = getLocalPath(musicItem);
                return !!localPath &&
                    (localPath.startsWith("content://")
                        ? StorageAccess.documentExists(localPath)
                        : exists(localPath));
            },
        );
        if (validSheet.length !== musicSheet.length) {
            await setStorage(StorageKeys.LocalMusicSheet, validSheet);
        }
        localSheet = validSheet;
    } else {
        await setStorage(StorageKeys.LocalMusicSheet, []);
    }
    localSheetStateMapper.notify();
    localMetaStateMapper.notify();
}

export async function addMusic(
    musicItem: IMusic.IMusicItem | IMusic.IMusicItem[],
) {
    if (!Array.isArray(musicItem)) {
        musicItem = [musicItem];
    }
    const newSheet = mergeUniqueLocalMusic(localSheet, musicItem);
    await setStorage(StorageKeys.LocalMusicSheet, newSheet);
    localSheet = newSheet;
    localSheetStateMapper.notify();
}

function addMusicDraft(musicItem: IMusic.IMusicItem | IMusic.IMusicItem[]) {
    if (!Array.isArray(musicItem)) {
        musicItem = [musicItem];
    }
    const newSheet = mergeUniqueLocalMusic(localSheet, musicItem);
    localSheet = newSheet;
    localSheetStateMapper.notify();
}

async function saveLocalSheet() {
    await setStorage(StorageKeys.LocalMusicSheet, localSheet);
}

async function saveLocalMeta() {
    await setStorage(StorageKeys.LocalMusicMeta, localMeta);
    localMetaStateMapper.notify();
}

export async function removeMusic(
    musicItem: IMusic.IMusicItem,
    deleteOriginalFile = false,
) {
    const idx = localSheet.findIndex(_ => isSameMediaItem(_, musicItem));
    let newSheet = [...localSheet];
    if (idx !== -1) {
        const localMusicItem = localSheet[idx];
        newSheet.splice(idx, 1);
        const localPath =
            musicItem[internalSerializeKey]?.localPath ??
            localMusicItem[internalSerializeKey]?.localPath;
        if (deleteOriginalFile && localPath) {
            try {
                if (localPath.startsWith("content://")) {
                    await StorageAccess.deleteDocument(localPath);
                } else {
                    await unlink(localPath);
                }
            } catch (e: any) {
                if (e.message !== "File does not exist") {
                    throw e;
                }
            }
        }
    }
    localSheet = newSheet;
    localSheetStateMapper.notify();
    saveLocalSheet();
}

function parseFilename(fn: string): Partial<IMusic.IMusicItem> | null {
    const data = fn.slice(0, fn.lastIndexOf(".")).split("@");
    const [platform, id, title, artist] = data;
    if (!platform || !id) {
        return null;
    }
    return {
        id,
        platform: platform,
        title: title ?? "",
        artist: artist ?? "",
    };
}

function localMediaFilter(filename: string) {
    return supportLocalMediaType.some(ext => filename.toLowerCase().endsWith(ext));
}

let importToken: string | null = null;
// 获取本地的文件列表
async function getMusicStats(folderPaths: string[]) {
    const _importToken = nanoid();
    importToken = _importToken;
    const musicList = await collectLocalMediaPaths(
        folderPaths,
        path => readDir(path) as Promise<ReadDirItem[]>,
        localMediaFilter,
        () => importToken === _importToken,
    );

    return { musicList, token: _importToken };
}

function cancelImportLocal() {
    importToken = null;
}

// 导入本地音乐
const groupNum = 25;
async function importLocal(_folderPaths: string[]) {
    const folderPaths = [..._folderPaths.map(it => addFileScheme(it))];
    const { musicList, token } = await getMusicStats(folderPaths);
    if (token !== importToken) {
        throw new Error("Import Broken");
    }
    // 分组请求，不然序列化可能出问题
    let metas: IBasicMeta[] = [];
    const groups = Math.ceil(musicList.length / groupNum);
    for (let i = 0; i < groups; ++i) {
        metas = metas.concat(
            await mp3Util.getMediaMeta(
                musicList.slice(i * groupNum, (i + 1) * groupNum),
            ),
        );
    }
    if (token !== importToken) {
        throw new Error("Import Broken");
    }
    const musicItems: IMusic.IMusicItem[] = musicList.map(
        (musicPath, index) => {
            let { platform, id, title, artist } =
                parseFilename(getFileName(musicPath, true)) ?? {};
            const meta = metas[index];
            if (!platform || !id) {
                platform = "本地";
                id = CryptoJs.MD5(musicPath).toString(CryptoJs.enc.Hex);
            }
            return {
                id,
                platform,
                title: title ?? meta?.title ?? getFileName(musicPath),
                artist: artist ?? meta?.artist ?? "未知歌手",
                duration: parseInt(meta?.duration ?? "0", 10) / 1000,
                album: meta?.album ?? "未知专辑",
                artwork: "",
                [internalSerializeKey]: {
                    localPath: musicPath,
                },
            } as IMusic.IMusicItem;
        },
    );
    if (token !== importToken) {
        throw new Error("Import Broken");
    }
    await addMusic(musicItems);
    localMeta = {
        ...localMeta,
        lastScanAt: Date.now(),
    };
    await saveLocalMeta();
}

async function importDocuments(documents: IStorageDocument[]) {
    const validDocuments = documents.filter(
        document =>
            document.uri &&
            localMediaFilter(document.name ?? document.uri),
    );
    const paths = validDocuments.map(document => document.uri);
    const metas = await mp3Util.getMediaMeta(paths);
    const musicItems = validDocuments.map((document, index) => {
        const fileName = document.name ?? getFileName(document.uri);
        const dotIndex = fileName.lastIndexOf(".");
        const titleFromFileName =
            dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
        let { platform, id, title, artist } =
            parseFilename(fileName) ?? {};
        const meta = metas[index];
        if (!platform || !id) {
            platform = "本地";
            id = CryptoJs.MD5(document.uri).toString(CryptoJs.enc.Hex);
        }
        return {
            id,
            platform,
            title: title ?? meta?.title ?? titleFromFileName,
            artist: artist ?? meta?.artist ?? "未知歌手",
            duration: parseInt(meta?.duration ?? "0", 10) / 1000,
            album: meta?.album ?? "未知专辑",
            artwork: "",
            [internalSerializeKey]: {
                localPath: document.uri,
            },
        } as IMusic.IMusicItem;
    });
    await addMusic(musicItems);
    localMeta = {
        ...localMeta,
        lastScanAt: Date.now(),
    };
    await saveLocalMeta();
    return musicItems.length;
}

/** 是否为本地音乐 */
function isLocalMusic(
    musicItem: ICommon.IMediaBase | null,
): IMusic.IMusicItem | undefined {
    return musicItem
        ? localSheet.find(_ => isSameMediaItem(_, musicItem))
        : undefined;
}

/** 状态-是否为本地音乐 */
function useIsLocal(musicItem: IMusic.IMusicItem | null) {
    const localMusicState = localSheetStateMapper.useMappedState();
    const [isLocal, setIsLocal] = useState<boolean>(!!isLocalMusic(musicItem));
    useEffect(() => {
        if (!musicItem) {
            setIsLocal(false);
        } else {
            setIsLocal(!!isLocalMusic(musicItem));
        }
    }, [localMusicState, musicItem]);
    return isLocal;
}

function getMusicList() {
    return localSheet;
}

function getMeta() {
    return localMeta;
}

async function updateMusicList(newSheet: IMusic.IMusicItem[]) {
    const _localSheet = [...newSheet];
    try {
        await setStorage(StorageKeys.LocalMusicSheet, _localSheet);
        localSheet = _localSheet;
        localSheetStateMapper.notify();
    } catch {}
}

const LocalMusicSheet = {
    setup,
    addMusic,
    removeMusic,
    addMusicDraft,
    saveLocalSheet,
    importLocal,
    importDocuments,
    cancelImportLocal,
    isLocalMusic,
    useIsLocal,
    getMusicList,
    getMeta,
    useMusicList: localSheetStateMapper.useMappedState,
    useMeta: localMetaStateMapper.useMappedState,
    updateMusicList,
};

export default LocalMusicSheet;
