import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import rpx, { vmax, vw } from "@/utils/rpx";

import Button from "@/components/base/textButton.tsx";
import PanelBase from "../../base/panelBase";
import useSearchLrc from "./useSearchLrc";
import PluginManager from "@/core/pluginManager";
import { SceneMap, TabView } from "react-native-tab-view";
import LyricList from "./LyricList";
import globalStyle from "@/constants/globalStyle";
import NoPlugin from "@/components/base/noPlugin";
import { useI18N } from "@/core/i18n";
import SearchInput from "@/components/base/searchInput";
import SourceTabBar from "@/components/base/sourceTabBar";

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

    useEffect(() => {
        if (musicItem) {
            searchLrc(musicItem.alias || musicItem.title, 1);
        }
    }, [musicItem, searchLrc]);

    return (
        <PanelBase
            keyboardAvoidBehavior="none"
            height={vmax(80)}
            positionMethod='top'
            renderBody={() => (
                <View style={style.wrapper}>
                    <View style={style.titleContainer}>
                        <SearchInput
                            value={input}
                            onChangeText={_ => {
                                setInput(_);
                            }}
                            onSubmitEditing={() => {
                                searchLrc(input, 1);
                            }}
                            containerStyle={style.input}
                            placeholder={t("panel.searchLrc.inputPlaceholder")}
                            maxLength={80}
                            onClear={() => {
                                setInput("");
                            }}
                        />
                        <Button
                            style={style.searchBtn}
                            onPress={() => {
                                searchLrc(input, 1);
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

    const routes = useMemo(() => PluginManager.getSortedSearchablePlugins("lyric")?.map?.(
        _ => ({
            key: _.hash,
            title: _.name,
        }),
    ) ?? [], []);

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
                index,
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
