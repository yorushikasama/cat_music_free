import RNFS, { CachesDirectoryPath } from "react-native-fs";

export const basePath = RNFS.ExternalDirectoryPath;

export default {
    basePath,
    pluginPath: `${basePath}/plugins/`,
    logPath: `${basePath}/log/`,
    dataPath: `${basePath}/data/`,
    cachePath: `${basePath}/cache/`,
    musicCachePath: CachesDirectoryPath + "/TrackPlayer",
    imageCachePath: CachesDirectoryPath + "/image_manager_disk_cache",
    localLrcPath: `${basePath}/local_lrc/`,
    lrcCachePath: `${basePath}/cache/lrc/`,
    downloadCachePath: `${basePath}/cache/download/`,
    downloadPath: `${basePath}/download/`,
    downloadMusicPath: `${basePath}/download/music/`,
    mmkvPath: `${basePath}/mmkv`,
    mmkvCachePath: `${basePath}/cache/mmkv`,
};
