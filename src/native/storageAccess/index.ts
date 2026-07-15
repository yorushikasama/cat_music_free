import { NativeModules } from "react-native";

export interface IStorageDocument {
    uri: string;
    name?: string;
    mimeType?: string;
    size?: number;
}

interface IStorageAccessModule {
    selectDirectory(initialUri?: string | null): Promise<IStorageDocument | null>;
    createDocument(
        fileName: string,
        mimeType: string,
    ): Promise<IStorageDocument | null>;
    openDocuments(
        mimeTypes: string[],
        multiple: boolean,
    ): Promise<IStorageDocument[] | null>;
    writeText(uri: string, content: string): Promise<boolean>;
    readText(uri: string): Promise<string>;
    copyFileToUri(sourcePath: string, destinationUri: string): Promise<string>;
    copyFileToTree(
        sourcePath: string,
        treeUri: string,
        displayName: string,
        mimeType: string,
    ): Promise<string>;
    publishAudio(
        sourcePath: string,
        displayName: string,
        mimeType: string,
        artist?: string,
        album?: string,
    ): Promise<string>;
    documentExists(uri: string): Promise<boolean>;
    deleteDocument(uri: string): Promise<boolean>;
}

const StorageAccess = NativeModules.StorageAccess as IStorageAccessModule;

export default StorageAccess;
