import { addFileScheme } from "@/utils/fileUtils";
import getOrCreateMMKV from "@/utils/getOrCreateMMKV";
import { safeParse } from "@/utils/jsonUtil";
import { getMediaUniqueKey } from "@/utils/mediaUtils";
import { exists, unlink } from "react-native-fs";

// Internal Method
const mediaCacheStore = getOrCreateMMKV("cache.MediaCache", true);

// 最多缓存800条数据
const maxCacheCount = 800;
const pruneCacheCount = Math.floor(maxCacheCount / 2);

function hasMediaIdentity(mediaItem: ICommon.IMediaBase) {
    return !!(mediaItem.platform && mediaItem.id);
}

function shuffleKeys(keys: string[]) {
    for (let i = keys.length - 1; i > 0; --i) {
        const randomIndex = Math.floor(Math.random() * (i + 1));
        [keys[i], keys[randomIndex]] = [keys[randomIndex], keys[i]];
    }
    return keys;
}

function getPruneKeys(incomingKey: string) {
    const allKeys = mediaCacheStore.getAllKeys();
    if (allKeys.length < maxCacheCount) {
        return [];
    }

    const removableKeys = shuffleKeys(allKeys.filter(key => key !== incomingKey));
    return removableKeys.slice(0, Math.min(pruneCacheCount, removableKeys.length));
}

function removeCacheByKey(cacheKey: string) {
    const rawCacheMedia = mediaCacheStore.getString(cacheKey);
    const cacheData = rawCacheMedia
        ? safeParse<IMusic.IMusicItemCache>(rawCacheMedia)
        : null;
    if (cacheData && typeof cacheData === "object") {
        clearLocalCaches(cacheData).catch(() => undefined);
    }

    mediaCacheStore.delete(cacheKey);
}

/** 获取meta信息 */
const getMediaCache = (mediaItem: ICommon.IMediaBase) => {
    if (hasMediaIdentity(mediaItem)) {
        const cacheMediaItem = mediaCacheStore.getString(
            getMediaUniqueKey(mediaItem),
        );
        return cacheMediaItem
            ? safeParse<ICommon.IMediaBase>(cacheMediaItem)
            : null;
    }

    return null;
};

/** 设置meta信息 */
const setMediaCache = (mediaItem: ICommon.IMediaBase) => {
    if (!hasMediaIdentity(mediaItem)) {
        return false;
    }

    const cacheKey = getMediaUniqueKey(mediaItem);
    if (mediaCacheStore.getString(cacheKey) === undefined) {
        getPruneKeys(cacheKey).forEach(removeCacheByKey);
    }

    mediaCacheStore.set(cacheKey, JSON.stringify(mediaItem));
    return true;
};

async function clearLocalCaches(cacheData: IMusic.IMusicItemCache) {
    if (cacheData.$localLyric) {
        await checkPathAndRemove(cacheData.$localLyric.rawLrc);
        await checkPathAndRemove(cacheData.$localLyric.translation);
    }
}

async function checkPathAndRemove(filePath?: string) {
    if (!filePath) {
        return;
    }
    filePath = addFileScheme(filePath);
    if (await exists(filePath)) {
        await unlink(filePath);
    }
}

/** 移除缓存信息 */
const removeMediaCache = (mediaItem: ICommon.IMediaBase) => {
    if (hasMediaIdentity(mediaItem)) {
        mediaCacheStore.delete(getMediaUniqueKey(mediaItem));
    }

    return false;
};

const MediaCache = {
    getMediaCache,
    setMediaCache,
    removeMediaCache,
};

export default MediaCache;
