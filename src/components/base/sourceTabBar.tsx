import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { TabBarProps } from "react-native-tab-view";
import Color from "color";

import ThemeText from "@/components/base/themeText";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import useColors from "@/hooks/useColors";
import rpx from "@/utils/rpx";

interface IRoute {
    key: string;
    title?: string;
}

interface ISourceTabBarProps extends TabBarProps<IRoute> {
    fallbackTitle?: string;
}

export default function SourceTabBar(props: ISourceTabBarProps) {
    const colors = useColors();
    const { navigationState, jumpTo, fallbackTitle } = props;
    const surfaceColor = Color(colors.surfacePrimary ?? colors.card)
        .alpha(colors.hasCustomBackground ? 0.58 : 0.92)
        .rgb()
        .string();
    const activeBg = colors.selectedBackground ?? Color(colors.primary).alpha(0.09).rgb().string();
    const activeBorder = colors.selectedBorder ?? Color(colors.primary).alpha(0.18).rgb().string();
    const quietDivider = Color(colors.divider ?? colors.text)
        .alpha(colors.hasCustomBackground ? 0.12 : 0.22)
        .rgb()
        .string();

    return (
        <View
            style={[
                styles.wrapper,
                {
                    backgroundColor: surfaceColor,
                    borderBottomColor: quietDivider,
                },
            ]}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}>
                {navigationState.routes.map((route, routeIndex) => {
                    const focused = routeIndex === navigationState.index;
                    const tabStateStyle = {
                        backgroundColor: focused
                            ? activeBg
                            : "transparent",
                        borderColor: focused
                            ? activeBorder
                            : "transparent",
                    };
                    const indicatorStyle = {
                        backgroundColor: focused
                            ? colors.primary
                            : "transparent",
                    };
                    return (
                        <Pressable
                            key={route.key}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: focused }}
                            onPress={() => jumpTo(route.key)}
                            style={({ pressed }) => [
                                styles.tab,
                                tabStateStyle,
                                pressed ? styles.pressed : null,
                            ]}>
                            <ThemeText
                                numberOfLines={1}
                                fontSize="subTitle"
                                fontWeight={focused ? "semibold" : "medium"}
                                color={focused ? colors.primary : colors.textSecondary}>
                                {route.title ?? fallbackTitle ?? ""}
                            </ThemeText>
                            <View
                                style={[
                                    styles.indicator,
                                    indicatorStyle,
                                ]}
                            />
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        width: "100%",
        minHeight: rpx(68),
        borderBottomWidth: StyleSheet.hairlineWidth,
        justifyContent: "center",
    },
    scrollContent: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.md,
        paddingTop: spacing.xs,
        paddingBottom: spacing.sm,
    },
    tab: {
        minWidth: rpx(96),
        maxWidth: rpx(286),
        height: rpx(48),
        borderRadius: radius.sm,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.sm,
        alignItems: "center",
        justifyContent: "center",
        marginRight: spacing.sm,
    },
    pressed: {
        opacity: 0.82,
    },
    indicator: {
        position: "absolute",
        bottom: rpx(5),
        width: rpx(24),
        height: rpx(3),
        borderRadius: radius.pill,
    },
});
