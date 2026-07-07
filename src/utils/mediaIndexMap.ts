export interface IIndexMap {
    getIndexMap: () => Record<string, Record<string, number>>;
    getIndex: (mediaItem: ICommon.IMediaBase) => number;
    has: (mediaItem: ICommon.IMediaBase) => boolean;
}

export function createMediaIndexMap(
    mediaItems: ICommon.IMediaBase[],
): IIndexMap {
    const indexMap: Record<string, Record<string, number>> = Object.create(null);

    mediaItems.forEach((item, index) => {
        let platformMap = indexMap[item.platform];
        if (!platformMap) {
            platformMap = Object.create(null);
            indexMap[item.platform] = platformMap;
        }
        platformMap[item.id] = index;
    });

    function getIndexMap() {
        return indexMap;
    }

    function getIndex(mediaItem: ICommon.IMediaBase) {
        if (!mediaItem) {
            return -1;
        }
        return indexMap[mediaItem.platform]?.[mediaItem.id] ?? -1;
    }

    function has(mediaItem: ICommon.IMediaBase) {
        if (!mediaItem) {
            return false;
        }

        return indexMap[mediaItem.platform]?.[mediaItem.id] > -1;
    }

    return {
        getIndexMap,
        getIndex,
        has,
    };
}
