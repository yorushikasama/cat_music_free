import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Toast from "@/utils/toast";
import { StyleSheet, View } from "react-native";
import rpx, { vmax, vw } from "@/utils/rpx";

import Button from "@/components/base/textButton.tsx";
import PanelBase from "../../base/panelBase";
import useSearchLrc from "./useSearchLrc";
import { useSortedSearchablePlugins } from "@/core/pluginManager";
import { SceneMap, TabView } from "react-native-tab-view";
import LyricList from "./LyricList";
import globalStyle from "@/constants/globalStyle";
import NoPlugin from "@/components/base/noPlugin";
import { useI18N } from "@/core/i18n";
import SearchInput from "@/components/base/searchInput";
import SourceTabBar from "@/components/base/sourceTabBar";
import searchResultStore from "./searchResultStore";

interface INewMusicSheetProps {
    musicItem?: IMusic.IMusicItem | null;
}

export default function SearchLrc(props: INewMusicSheetProps) {
    const { musicItem } = props;
    const [input, setInput] = useState(
        musicItem?.alias ?? musicItem?.title ?? "",
    );
    const { t } = useI18N();

    const searchLrc = useSearchLrc();
    const [searching, setSearching] = useState(false);
    const searchLockRef = useRef(false);
    const activeQueryRef = useRef("");

    const handleSearch = useCallback(async (query: string) => {
        if (searchLockRef.current) {
            return;
        }

        searchLockRef.current = true;
        setSearching(true);
        activeQueryRef.current = query;
        try {
            await searchLrc(query, 1);
            const results = searchResultStore.getValue().data;
            const hasResult = Object.values(results).some(
                result => result?.data?.length,
            );
            if (activeQueryRef.current === query && !hasResult) {
                Toast.warn(t("common.emptyListDescription"));
            }
        } finally {
            searchLockRef.current = false;
            setSearching(false);
        }
    }, [searchLrc, t]);

    useEffect(() => {
        if (musicItem) {
            handleSearch(musicItem.alias || musicItem.title);
        }
    }, [handleSearch, musicItem]);

    return (
        <PanelBase
            keyboardAvoidBehavior="none"
            height={vmax(80)}
            positionMethod='top'
            dismissDisabled={searching}
            renderBody={() => (
                <View style={style.wrapper}>
                    <View style={style.titleContainer}>
                        <SearchInput
                            value={input}
                            onChangeText={_ => {
                                setInput(_);
                            }}
                            editable={!searching}
                            onSubmitEditing={() => {
                                handleSearch(input);
                            }}
                            containerStyle={style.input}
                            placeholder={t("panel.searchLrc.inputPlaceholder")}
                            maxLength={80}
                            onClear={() => {
                                if (searching) {
                                    return;
                                }
                                setInput("");
                            }}
                        />
                        <Button
                            style={style.searchBtn}
                            loading={searching}
                            disabled={searching}
                            onPress={() => {
                                handleSearch(input);
                            }}>
                            {t("common.search")}
                        </Button>
                    </View>
                    <LyricResultBodyWrapper />
                </View>
            )}
        />
    );
}

const style = StyleSheet.create({
    wrapper: {
        width: rpx(750),
        paddingTop: rpx(36),
        flex: 1,
    },
    titleContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: rpx(6),
        paddingHorizontal: rpx(24),
    },

    opeartions: {
        width: rpx(750),
        paddingHorizontal: rpx(24),
        flexDirection: "row",
        height: rpx(100),
        alignItems: "center",
        justifyContent: "space-between",
    },
    input: {
        flex: 1,
        minHeight: rpx(64),
    },
    searchBtn: {
        marginLeft: rpx(12),
    },
});

function LyricResultBodyWrapper() {
    const [index, setIndex] = useState(0);
    const { t } = useI18N();
    const plugins = useSortedSearchablePlugins("lyric");

    const routes = useMemo(() => plugins.map(
        _ => ({
            key: _.hash,
            title: _.name,
        }),
    ), [plugins]);

    useEffect(() => {
        if (index >= routes.length) {
            setIndex(Math.max(routes.length - 1, 0));
        }
    }, [index, routes.length]);
    const activeIndex = routes.length ? Math.min(index, routes.length - 1) : 0;

    const sceneMap = useMemo(() => {
        const scene: Record<string, any> = {};
        routes.forEach(r => {
            scene[r.key] = LyricList;
        });
        return SceneMap(scene);

    }, [routes]);

    return routes?.length ? (
        <TabView
            style={globalStyle.fwflex1}
            lazy
            navigationState={{
                index: activeIndex,
                routes,
            }}
            renderTabBar={_ => (
                <SourceTabBar
                    {..._}
                    fallbackTitle={t("panel.searchLrc.unnamed")}
                />
            )}
            renderScene={sceneMap}
            onIndexChange={setIndex}
            initialLayout={{ width: vw(100) }}
        />
    ) : (
        <NoPlugin notSupportType={t("panel.searchLrc.notSupported")} />
    );
}
