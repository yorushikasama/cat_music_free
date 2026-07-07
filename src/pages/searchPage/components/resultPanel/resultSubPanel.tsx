import Empty from "@/components/base/empty";
import { useI18N } from "@/core/i18n";
import { useSortedSearchablePlugins } from "@/core/pluginManager";
import useColors from "@/hooks/useColors";
import rpx, { vw } from "@/utils/rpx";
import { useAtomValue } from "jotai";
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SceneMap, TabBar, TabView } from "react-native-tab-view";
import { searchResultsAtom } from "../../store/atoms";
import { renderMap } from "./results";
import DefaultResults from "./results/defaultResults";
import ResultWrapper from "./resultWrapper";
import ThemeText from "@/components/base/themeText";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";

interface IResultSubPanelProps {
    tab: ICommon.SupportMediaType;
}

// 展示结果的视图
function getResultComponent(
    tab: ICommon.SupportMediaType,
    pluginHash: string,
    pluginName: string,
) {
    return tab in renderMap
        ? memo(
            () => {
                const searchResults = useAtomValue(searchResultsAtom);
                const pluginSearchResult = searchResults[tab][pluginHash];
                const pluginSearchResultRef = useRef(pluginSearchResult);

                useEffect(() => {
                    pluginSearchResultRef.current = pluginSearchResult;
                }, [pluginSearchResult]);

                return (
                    <ResultWrapper
                        tab={tab}
                        searchResult={pluginSearchResult}
                        pluginHash={pluginHash}
                        pluginName={pluginName}
                        pluginSearchResultRef={pluginSearchResultRef}
                    />
                );
            },
            () => true,
        )
        : () => <DefaultResults />;
}

/** 结果scene */
function getSubRouterScene(
    tab: ICommon.SupportMediaType,
    routes: Array<{ key: string; title: string }>,
) {
    const scene: Record<string, React.FC> = {};
    routes.forEach(r => {
        scene[r.key] = getResultComponent(tab, r.key, r.title);
    });
    return SceneMap(scene);
}

function ResultSubPanel(props: IResultSubPanelProps) {
    const [index, setIndex] = useState(0);
    const colors = useColors();
    const { t } = useI18N();
    const plugins = useSortedSearchablePlugins(props.tab);
    const activeLabelStyle = {
        backgroundColor: colors.selectedBackground,
        borderColor: colors.selectedBorder,
    };
    const inactiveLabelStyle = {
        backgroundColor: colors.controlBackground,
        borderColor: colors.controlBorder ?? colors.divider,
    };

    const routes = useMemo(
        () => plugins.map(
            _ => ({
                key: _.hash,
                title: _.name,
            }),
        ),
        [plugins],
    );

    useEffect(() => {
        if (index >= routes.length) {
            setIndex(Math.max(routes.length - 1, 0));
        }
    }, [index, routes.length]);
    const activeIndex = routes.length ? Math.min(index, routes.length - 1) : 0;

    const renderScene = useMemo(
        () => getSubRouterScene(props.tab, routes),
        [props.tab, routes],
    );

    if (!routes.length) {
        return (
            <Empty
                icon="magnifying-glass"
                title={t("common.emptyList")}
                description={t("common.emptyListDescription")}
                minHeight={rpx(520)}
            />
        );
    }

    return (
        <TabView
            lazy
            navigationState={{
                index: activeIndex,
                routes,
            }}
            renderTabBar={_ => (
                <TabBar
                    {..._}
                    scrollEnabled
                    style={styles.pluginTabBar}
                    contentContainerStyle={styles.pluginTabBarContent}
                    tabStyle={styles.pluginTab}
                    renderIndicator={() => null}
                    pressColor="transparent"
                    renderLabel={({ route, focused }) => (
                        <View
                            style={[
                                styles.pluginLabel,
                                focused
                                    ? activeLabelStyle
                                    : inactiveLabelStyle,
                            ]}>
                            <ThemeText
                                numberOfLines={1}
                                fontSize="description"
                                fontWeight={focused ? "bold" : "medium"}
                                color={focused ? colors.primary : colors.textSecondary}
                                style={styles.pluginLabelText}>
                                {route.title ?? `(${t("common.unknownName")})`}
                            </ThemeText>
                        </View>
                    )}
                />
            )}
            renderScene={renderScene}
            onIndexChange={setIndex}
            initialLayout={{ width: vw(100) }}
        />
    );
}

// 不然会一直重新渲染
export default memo(ResultSubPanel);

const styles = StyleSheet.create({
    pluginTabBar: {
        backgroundColor: "transparent",
        shadowColor: "transparent",
        elevation: 0,
        borderColor: "transparent",
        minHeight: rpx(58),
    },
    pluginTabBarContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: 0,
        paddingBottom: spacing.xs,
        alignItems: "center",
    },
    pluginTab: {
        width: "auto",
        minHeight: rpx(50),
        paddingHorizontal: 0,
    },
    pluginLabel: {
        minWidth: rpx(104),
        maxWidth: rpx(260),
        height: rpx(42),
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.sm,
        marginRight: spacing.xs,
        alignItems: "center",
        justifyContent: "center",
    },
    pluginLabelText: {
        textAlign: "center",
    },
});
