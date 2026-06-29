import { RequestStateCode } from "@/constants/commonConst";
import PluginManager from "@/core/pluginManager";
import { produce } from "immer";
import { getDefaultStore, useSetAtom } from "jotai";
import { useCallback } from "react";
import { pluginsTopListAtom } from "../store/atoms";

export default function useGetTopList() {
    const setPluginsTopList = useSetAtom(pluginsTopListAtom);

    const getTopList = useCallback(
        async (pluginHash: string) => {
            try {
                const pluginsTopList =
                    getDefaultStore().get(pluginsTopListAtom);
                const currentTopList = pluginsTopList[pluginHash];
                // 有数据/加载中直接返回
                if (
                    currentTopList?.data?.length ||
                    currentTopList?.state ===
                        RequestStateCode.PENDING_FIRST_PAGE ||
                    currentTopList?.state === RequestStateCode.PENDING_REST_PAGE
                ) {
                    return;
                }
                // 获取plugin
                const plugin = PluginManager.getByHash(pluginHash);
                if (!plugin) {
                    return;
                }

                setPluginsTopList(
                    produce(draft => {
                        draft[pluginHash] = {
                            state: RequestStateCode.PENDING_FIRST_PAGE,
                            data: currentTopList?.data ?? [],
                        };
                    }),
                );
                const result = await plugin?.methods?.getTopLists();
                setPluginsTopList(
                    produce(draft => {
                        draft[pluginHash] = {
                            data: result,
                            state: RequestStateCode.FINISHED,
                        };
                    }),
                );
            } catch {
                setPluginsTopList(
                    produce(draft => {
                        draft[pluginHash] = {
                            state: RequestStateCode.ERROR,
                            data: draft[pluginHash]?.data ?? [],
                        };
                    }),
                );
            }
        },
        [setPluginsTopList],
    );

    return getTopList;
}
