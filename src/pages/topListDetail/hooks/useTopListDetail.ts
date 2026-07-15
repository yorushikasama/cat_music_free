import { RequestStateCode } from "@/constants/commonConst";
import PluginManager from "@/core/pluginManager";
import { useCallback, useEffect, useRef, useState } from "react";

export default function useTopListDetail(
    topListItem: IMusic.IMusicSheetItemBase | null,
    pluginHash: string,
) {
    const [mergedTopListItem, setMergedTopListItem] =
        useState<ICommon.WithMusicList<IMusic.IMusicSheetItemBase> | null>(
            topListItem,
        );

    const pageRef = useRef(1);

    const [requestState, setRequestState] = useState(RequestStateCode.IDLE);

    const loadMore = useCallback(async () => {
        if (!topListItem) {
            return;
        }
        try {
            if (
                requestState === RequestStateCode.PENDING_FIRST_PAGE ||
                requestState === RequestStateCode.PENDING_REST_PAGE ||
                requestState === RequestStateCode.FINISHED
            ) {
                return;
            }
            if (pageRef.current === 1) {
                setRequestState(RequestStateCode.PENDING_FIRST_PAGE);
            } else {
                setRequestState(RequestStateCode.PENDING_REST_PAGE);
            }
            const result = await PluginManager.getByHash(
                pluginHash,
            )?.methods?.getTopListDetail(topListItem, pageRef.current);
            if (!result) {
                throw new Error();
            }
            const currentPage = pageRef.current;
            setMergedTopListItem(
                prev =>
                    ({
                        ...prev,
                        ...result.topListItem,
                        musicList:
                            currentPage === 1
                                ? result.musicList ?? []
                                : [
                                    ...(prev?.musicList ?? []),
                                    ...(result.musicList ?? []),
                                ],
                    } as IMusic.IMusicSheetItem),
            );

            if (result.isEnd === false) {
                setRequestState(RequestStateCode.PARTLY_DONE);
            } else {
                setRequestState(RequestStateCode.FINISHED);
            }
            pageRef.current++;
        } catch {
            setRequestState(RequestStateCode.ERROR);
        }
    }, [pluginHash, requestState, topListItem]);

    useEffect(() => {
        if (topListItem === null) {
            return;
        }
        loadMore();
    }, [loadMore, topListItem]);
    return [mergedTopListItem, requestState, loadMore] as const;
}
