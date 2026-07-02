import { RequestStateCode } from "@/constants/commonConst";
import PluginManager from "@/core/pluginManager";
import { resetMediaItem } from "@/utils/mediaUtils";
import { useCallback, useEffect, useRef, useState } from "react";

const RANDOM_REFRESH_PAGE_WINDOW = 5;

export default function (pluginHash: string, tag: ICommon.IUnique) {
    const [sheets, setSheets] = useState<IMusic.IMusicSheetItemBase[]>([]);
    const [requestState, setRequestState] = useState(RequestStateCode.IDLE);
    const [refreshing, setRefreshing] = useState(false);
    const currentTagRef = useRef<string>();
    const pageRef = useRef(0);

    const query = useCallback(async (refresh = false) => {
        if (
            !refresh &&
            (requestState === RequestStateCode.FINISHED ||
                requestState === RequestStateCode.PENDING_FIRST_PAGE ||
                requestState === RequestStateCode.PENDING_REST_PAGE) &&
            currentTagRef.current === tag.id
        ) {
            return;
        }
        try {
            let nextPage = pageRef.current + 1;
            if (refresh) {
                setRefreshing(true);
                nextPage = tag.id
                    ? 1
                    : Math.floor(Math.random() * RANDOM_REFRESH_PAGE_WINDOW) + 1;
            } else if (currentTagRef.current !== tag.id) {
                setSheets([]);
                nextPage = 1;
            }
            currentTagRef.current = tag.id;
            const plugin = PluginManager.getByHash(pluginHash);
            if (plugin) {
                if (nextPage === 1 && !refresh) {
                    setRequestState(RequestStateCode.PENDING_FIRST_PAGE);
                } else {
                    setRequestState(RequestStateCode.PENDING_REST_PAGE);
                }
                const res = await plugin.methods?.getRecommendSheetsByTag?.(
                    tag,
                    nextPage,
                );
                const nextSheets = res?.data?.map(item =>
                    resetMediaItem(item, plugin.instance.platform),
                ) ?? [];

                if (res?.isEnd) {
                    setRequestState(RequestStateCode.FINISHED);
                } else {
                    setRequestState(RequestStateCode.PARTLY_DONE);
                }
                if (tag.id === currentTagRef.current) {
                    setSheets(prev =>
                        refresh ? nextSheets : [...prev, ...nextSheets],
                    );
                    pageRef.current = nextPage;
                }

            } else {
                setRequestState(RequestStateCode.FINISHED);
                setSheets([]);
            }
        } catch {
            setRequestState(RequestStateCode.ERROR);
        } finally {
            if (refresh) {
                setRefreshing(false);
            }
        }
    }, [pluginHash, tag, requestState]);

    useEffect(() => {
        query();
    }, [tag]);


    return [query, sheets, requestState, refreshing] as const;
}
