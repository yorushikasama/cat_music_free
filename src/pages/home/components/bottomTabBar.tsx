import React, { useEffect } from "react";
import { StyleSheet, TouchableOpacity, View, Vibration } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    interpolateColor,
} from "react-native-reanimated";
import useColors from "@/hooks/useColors";
import rpx from "@/utils/rpx";
import Icon from "@/components/base/icon.tsx";
import ThemeText from "@/components/base/themeText";
import { useI18N } from "@/core/i18n";

interface ITabItem {
    name: string;
    icon: string;
    activeIcon: string;
    labelKey: string;
}

const tabs: ITabItem[] = [
    {
        name: "Discover",
        icon: "play-circle-outline",
        activeIcon: "play-circle",
        labelKey: "home.discover",
    },
    {
        name: "Sheets",
        icon: "heart-outline",
        activeIcon: "heart",
        labelKey: "home.sheets",
    },
    {
        name: "Profile",
        icon: "user",
        activeIcon: "user",
        labelKey: "home.profile",
    },
];

const TAB_BAR_HEIGHT = rpx(98);
const ICON_SIZE = rpx(44);
const INDICATOR_WIDTH = rpx(32);
const INDICATOR_HEIGHT = rpx(6);

function TabItem({
    tab,
    isFocused,
    onPress,
    primaryColor,
    inactiveColor,
}: {
    tab: ITabItem;
    isFocused: boolean;
    onPress: () => void;
    primaryColor: string;
    inactiveColor: string;
}) {
    const { t } = useI18N();

    const progress = useSharedValue(isFocused ? 1 : 0);

    useEffect(() => {
        progress.value = withTiming(isFocused ? 1 : 0, {
            duration: 250,
        });
    }, [isFocused]);

    const iconColorStyle = useAnimatedStyle(() => ({
        color: interpolateColor(progress.value, [0, 1], [inactiveColor, primaryColor]),
    }));

    const indicatorStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
        transform: [{ scaleX: progress.value }],
    }));

    const labelColorStyle = useAnimatedStyle(() => ({
        color: interpolateColor(progress.value, [0, 1], [inactiveColor, primaryColor]),
    }));

    const iconName = isFocused ? tab.activeIcon : tab.icon;

    return (
        <TouchableOpacity
            style={styles.tabItem}
            onPress={onPress}
            activeOpacity={0.7}>
            <View style={styles.tabContent}>
                <Animated.View style={iconColorStyle}>
                    <Icon
                        name={iconName as any}
                        size={ICON_SIZE}
                        color={isFocused ? primaryColor : inactiveColor}
                    />
                </Animated.View>
                <Animated.View style={[styles.indicator, { backgroundColor: primaryColor }, indicatorStyle]} />
                <Animated.View style={labelColorStyle}>
                    <ThemeText
                        fontSize="description"
                        fontWeight={isFocused ? "semibold" : "regular"}
                        fontColor={isFocused ? "textHighlight" : "textSecondary"}>
                        {t(tab.labelKey as any)}
                    </ThemeText>
                </Animated.View>
            </View>
        </TouchableOpacity>
    );
}

export default function BottomTabBar(props: BottomTabBarProps) {
    const { state, navigation } = props;
    const colors = useColors();

    const primaryColor = colors.primary;
    const inactiveColor = colors.textSecondary ?? "#999999";

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: colors.tabBar ?? colors.surfacePrimary,
                    borderTopColor: colors.divider,
                },
            ]}>
            {tabs.map((tab, index) => {
                const isFocused = state.index === index;

                return (
                    <TabItem
                        key={tab.name}
                        tab={tab}
                        isFocused={isFocused}
                        primaryColor={primaryColor}
                        inactiveColor={inactiveColor}
                        onPress={() => {
                            try {
                                Vibration.vibrate(10);
                            } catch {}
                            const event = navigation.emit({
                                type: "tabPress",
                                target: state.routes[index].key,
                                canPreventDefault: true,
                            });

                            if (!isFocused && !event.defaultPrevented) {
                                navigation.navigate(tab.name);
                            }
                        }}
                    />
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-around",
        height: TAB_BAR_HEIGHT,
        paddingTop: rpx(12),
        borderTopWidth: StyleSheet.hairlineWidth,
        overflow: "hidden",
    },
    tabItem: {
        flex: 1,
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: rpx(4),
    },
    tabContent: {
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: rpx(4),
    },
    indicator: {
        width: INDICATOR_WIDTH,
        height: INDICATOR_HEIGHT,
        borderRadius: INDICATOR_HEIGHT / 2,
    },
});
