import { RequestStateCode } from "@/constants/commonConst";
import PluginManager, { Plugin } from "@/core/pluginManager";
import { devLog, errorLog } from "@/utils/log";
import { produce } from "immer";
import { useCallback, useRef } from "react";
import searchResultStore from "./searchResultStore";

export default function useSearchLrc() {
    // 当前正在搜索
    const currentQueryRef = useRef<string>("");

    /**
     * query: 搜索词
     * queryPage: 搜索页码
     * pluginHash: 搜索条件
     */
    const search = useCallback(async function (
        query?: string,
        queryPage?: number,
        pluginHash?: string,
    ) {
        /** 如果没有指定插件，就用所有插件搜索 */
        let plugins: Plugin[] = [];
        if (pluginHash) {
            const tgtPlugin = PluginManager.getByHash(pluginHash);
            tgtPlugin && (plugins = [tgtPlugin]);
        } else {
            plugins = PluginManager.getSearchablePlugins("lyric");
        }
        if (plugins.length === 0) {
            searchResultStore.setValue(
                produce(draft => {
                    draft.data = {};
                }),
            );
            return;
        }
        const normalizedQuery = query ?? searchResultStore.getValue().query ?? "";
        const isNewSearch = query !== undefined || queryPage === 1;
        if (isNewSearch) {
            searchResultStore.setValue(
                produce(draft => {
                    draft.query = normalizedQuery;
                }),
            );
        }

        currentQueryRef.current = normalizedQuery;
        const searchToken = normalizedQuery;

        // 等待所有来源完成，让调用方能准确表达“搜索中”的状态。
        await Promise.all(plugins.map(async plugin => {
            const _platform = plugin.instance.platform;
            const _hash = plugin.hash;
            if (!_platform || !_hash) {
                // 插件无效，此时直接进入结果页
                searchResultStore.setValue(
                    produce(draft => {
                        draft.data = {};
                    }),
                );
                return;
            }

            // 上一份搜索结果
            const prevPluginResult =
                searchResultStore.getValue().data[plugin.hash];
            /** 上一份搜索还没返回/已经结束 */
            if (
                (prevPluginResult?.state ===
                    RequestStateCode.PENDING_FIRST_PAGE ||
                    prevPluginResult?.state === RequestStateCode.PENDING_REST_PAGE ||
                    prevPluginResult?.state === RequestStateCode.FINISHED) &&
                undefined === query
            ) {
                return;
            }

            // 是否是一次新的搜索
            const newSearch =
                isNewSearch ||
                prevPluginResult?.page === undefined ||
                queryPage === 1;

            // 本次搜索关键词
            const currentQuery = normalizedQuery;

            /** 搜索的页码 */
            const page =
                queryPage ?? newSearch ? 1 : (prevPluginResult?.page ?? 0) + 1;
            try {
                searchResultStore.setValue(
                    produce(draft => {
                        const prevMediaResult = draft.data;
                        prevMediaResult[_hash] = {
                            state: newSearch
                                ? RequestStateCode.PENDING_FIRST_PAGE
                                : RequestStateCode.PENDING_REST_PAGE,
                            // @ts-ignore
                            data: newSearch
                                ? []
                                : prevMediaResult[_hash]?.data ?? [],
                            page,
                        };
                    }),
                );
                const result = await plugin?.methods?.search?.(
                    currentQuery,
                    page,
                    "lyric",
                );
                /** 如果搜索结果不是本次结果 */
                if (currentQueryRef.current !== searchToken) {
                    return;
                }
                /** 切换到结果页 */
                if (!result) {
                    throw new Error("搜索结果为空");
                }
                searchResultStore.setValue(
                    produce(draft => {
                        const prevMediaResult = draft.data;

                        const previousPluginPage: any = prevMediaResult[
                            _hash
                        ] ?? {
                            data: [],
                        };
                        const currResult = result.data ?? [];

                        prevMediaResult[_hash] = {
                            state:
                                // result?.isEnd === false && result?.data?.length
                                //     ? RequestStateCode.PARTLY_DONE
                                //     : RequestStateCode.FINISHED,
                                RequestStateCode.FINISHED,
                            page,
                            data: newSearch
                                ? currResult
                                : (previousPluginPage.data ?? []).concat(
                                    currResult,
                                ),
                        };
                        return draft;
                    }),
                );
            } catch (e: any) {
                errorLog("搜索失败", e?.message);
                devLog(
                    "error",
                    "搜索失败",
                    `Plugin: ${plugin.name} Query: ${currentQuery} Page: ${page}`,
                    e,
                    e?.message,
                );
                /** 如果搜索结果不是本次结果 */
                if (currentQueryRef.current !== searchToken) {
                    return;
                }
                searchResultStore.setValue(
                    produce(draft => {
                        const prevMediaResult = draft.data;
                        const previousPluginPage = prevMediaResult[_hash] ?? {
                            data: [],
                        };

                        previousPluginPage.state = RequestStateCode.FINISHED;
                        return draft;
                    }),
                );
            }
        }));
    },
    []);

    return search;
}
