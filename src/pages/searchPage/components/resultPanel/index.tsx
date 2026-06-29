/**
 * 搜索结果面板 一级页
 */
import React, { memo, useState } from "react";
import { StyleSheet, View } from "react-native";
import rpx, { vw } from "@/utils/rpx";
import { SceneMap, TabBar, TabView } from "react-native-tab-view";
import ResultSubPanel from "./resultSubPanel";
import results from "./results";
import useColors from "@/hooks/useColors";
import { useI18N } from "@/core/i18n";
import ThemeText from "@/components/base/themeText";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import Color from "color";

const routes = results;

const getRouterScene = (
    routeList: Array<{ key: ICommon.SupportMediaType; title: string }>,
) => {
    const scene: Record<string, () => JSX.Element> = {};
    routeList.forEach(r => {
        scene[r.key] = () => <ResultSubPanel tab={r.key} />;
    });
    return SceneMap(scene);
};

const renderScene = getRouterScene(routes);

function ResultPanel() {
    const [index, setIndex] = useState(0);
    const colors = useColors();
    const { t } = useI18N();
    const activeBg = Color(colors.primary).alpha(0.12).rgb().string();
    const activeBorder = Color(colors.primary).alpha(0.18).rgb().string();
    const activeLabelStyle = {
        backgroundColor: activeBg,
        borderColor: activeBorder,
    };

    return (
        <View style={styles.wrapper}>
            <TabView
                lazy
                navigationState={{
                    index,
                    routes,
                }}
                renderTabBar={props => (
                    <TabBar
                        {...props}
                        scrollEnabled
                        style={styles.tabBar}
                        contentContainerStyle={styles.tabBarContent}
                        tabStyle={styles.tab}
                        pressColor="transparent"
                        indicatorStyle={styles.indicator}
                        renderLabel={({ route, focused }) => (
                            <View
                                style={[
                                    styles.label,
                                    focused
                                        ? activeLabelStyle
                                        : styles.inactiveLabel,
                                ]}>
                                <ThemeText
                                    numberOfLines={1}
                                    fontWeight={focused ? "bold" : "medium"}
                                    color={focused ? colors.primary : colors.textSecondary}
                                    style={styles.labelText}>
                                    {route.i18nKey ? t(route.i18nKey as any) : route.title}
                                </ThemeText>
                            </View>
                        )}
                    />
                )}
                renderScene={renderScene}
                onIndexChange={setIndex}
                initialLayout={{ width: vw(100) }}
            />
        </View>
    );
}

export default memo(ResultPanel);

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
    },
    tabBar: {
        backgroundColor: "transparent",
        shadowColor: "transparent",
        elevation: 0,
        borderColor: "transparent",
        minHeight: rpx(64),
    },
    tabBarContent: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xs,
        alignItems: "center",
    },
    tab: {
        width: "auto",
        minHeight: rpx(52),
        paddingHorizontal: 0,
    },
    label: {
        minWidth: rpx(104),
        height: rpx(44),
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.md,
        marginRight: spacing.xs,
        alignItems: "center",
        justifyContent: "center",
    },
    inactiveLabel: {
        backgroundColor: "transparent",
        borderColor: "transparent",
    },
    labelText: {
        textAlign: "center",
    },
    indicator: {
        height: 0,
        backgroundColor: "transparent",
    },
});
