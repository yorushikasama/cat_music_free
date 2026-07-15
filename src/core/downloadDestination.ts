import Config from "@/core/appConfig";
import StorageAccess from "@/native/storageAccess";
import { PermissionsAndroid, Platform } from "react-native";

export interface IDownloadDestination {
    publish(
        sourcePath: string,
        fileName: string,
        mimeType: string,
        musicItem: IMusic.IMusicItem,
    ): Promise<string>;
}

class MediaStoreDownloadDestination implements IDownloadDestination {
    async publish(
        sourcePath: string,
        fileName: string,
        mimeType: string,
        musicItem: IMusic.IMusicItem,
    ) {
        if (
            Platform.OS === "android" &&
            Number(Platform.Version) <= 28 &&
            !(await PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
            ))
        ) {
            const result = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
            );
            if (result !== PermissionsAndroid.RESULTS.GRANTED) {
                throw Object.assign(new Error("Storage permission denied"), {
                    code: "PUBLISH_AUDIO_PERMISSION_DENIED",
                });
            }
        }
        return StorageAccess.publishAudio(
            sourcePath,
            fileName,
            mimeType,
            musicItem.artist,
            musicItem.album,
        );
    }
}

class SafTreeDownloadDestination implements IDownloadDestination {
    constructor(private readonly treeUri: string) {}

    publish(sourcePath: string, fileName: string, mimeType: string) {
        return StorageAccess.copyFileToTree(
            sourcePath,
            this.treeUri,
            fileName,
            mimeType,
        );
    }
}

export function getDownloadDestination(): IDownloadDestination {
    const treeUri = Config.getConfig("basic.downloadDirectoryUri")?.trim();
    return treeUri
        ? new SafTreeDownloadDestination(treeUri)
        : new MediaStoreDownloadDestination();
}
