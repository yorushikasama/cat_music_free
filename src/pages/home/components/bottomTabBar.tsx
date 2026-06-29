import React, { useEffect } from "react";
import { StyleSheet, TouchableOpacity, View, Vibration } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import Color from "color";
import useColors from "@/hooks/useColors";
import rpx from "@/utils/rpx";
import Icon, { IIconName } from "@/components/base/icon.tsx";
import ThemeText from "@/components/base/themeText";
import { useI18N } from "@/core/i18n";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import { timingConfig } from "@/constants/commonConst";

interface ITabItem {
    name: string;
    icon: IIconName;
    activeIcon: IIconName;
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

const TAB_BAR_HEIGHT = rpx(144);
const TAB_PILL_HEIGHT = rpx(112);
const ACTIVE_ITEM_WIDTH = rpx(108);
const ICON_SIZE = rpx(34);
const ACTIVE_ICON_SIZE = rpx(38);
const ICON_LABEL_GAP = rpx(6);
const ACTIVE_DOT_SIZE = rpx(7);
const ACTIVE_ITEM_OFFSET = rpx(2);

function alpha(color: string, value: number) {
    try {
        return Color(color).alpha(value).rgb().string();
    } catch {
        return color;
    }
}

function TabItem({
    tab,
    isFocused,
    onPress,
    primaryColor,
    inactiveColor,
    activeBackgroundColor,
    activeLabelColor,
}: {
    tab: ITabItem;
    isFocused: boolean;
    onPress: () => void;
    primaryColor: string;
    inactiveColor: string;
    activeBackgroundColor: string;
    activeLabelColor: string;
}) {
    const { t } = useI18N();

    const progress = useSharedValue(isFocused ? 1 : 0);

    useEffect(() => {
        progress.value = withTiming(
            isFocused ? 1 : 0,
            timingConfig.animationNormal,
        );
    }, [isFocused, progress]);

    const activeBackgroundStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
        transform: [
            { translateY: -progress.value * ACTIVE_ITEM_OFFSET },
            { scale: 0.94 + progress.value * 0.06 },
        ],
    }));

    const activeDotStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
        transform: [{ scale: 0.65 + progress.value * 0.35 }],
    }));

    const iconName = isFocused ? tab.activeIcon : tab.icon;
    const label = t(tab.labelKey as any);

    return (
        <TouchableOpacity
            style={styles.tabItem}
            onPress={onPress}
            activeOpacity={0.72}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: isFocused }}>
            <View style={styles.tabContent}>
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.activeBackground,
                        { backgroundColor: activeBackgroundColor },
                        activeBackgroundStyle,
                    ]}
                />
                <Animated.View style={styles.tabInner}>
                    <Icon
                        name={iconName}
                        size={isFocused ? ACTIVE_ICON_SIZE : ICON_SIZE}
                        color={isFocused ? primaryColor : inactiveColor}
                    />
                    <ThemeText
                        fontSize="description"
                        fontWeight={isFocused ? "semibold" : "medium"}
                        color={isFocused ? activeLabelColor : inactiveColor}
                        numberOfLines={1}
                        style={styles.tabLabel}>
                        {label}
                    </ThemeText>
                </Animated.View>
                <Animated.View
                    style={[
                        styles.activeDot,
                        { backgroundColor: primaryColor },
                        activeDotStyle,
                    ]}
                />
            </View>
        </TouchableOpacity>
    );
}

export default function BottomTabBar(props: BottomTabBarProps) {
    const { state, navigation } = props;
    const colors = useColors();

    const primaryColor = colors.primary;
    const inactiveColor = colors.textSecondary ?? "#999999";
    const activeBackgroundColor = alpha(colors.primary, 0.12);

    return (
        <View style={styles.container}>
            <View
                style={[
                    styles.pill,
                    {
                        backgroundColor: colors.tabBar ?? colors.surfacePrimary,
                        borderColor: colors.divider,
                        shadowColor: colors.shadowMedium ?? colors.shadow ?? "#000000",
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
                            activeBackgroundColor={activeBackgroundColor}
                            activeLabelColor={colors.text}
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: TAB_BAR_HEIGHT,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        backgroundColor: "transparent",
    },
    pill: {
        height: TAB_PILL_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        shadowOffset: { width: 0, height: rpx(8) },
        shadowOpacity: 0.14,
        shadowRadius: rpx(14),
        elevation: 10,
    },
    tabItem: {
        flex: 1,
        height: TAB_PILL_HEIGHT,
        alignItems: "center",
        justifyContent: "center",
    },
    tabContent: {
        height: TAB_PILL_HEIGHT,
        width: ACTIVE_ITEM_WIDTH,
        alignItems: "center",
        justifyContent: "center",
    },
    activeBackground: {
        position: "absolute",
        width: ACTIVE_ITEM_WIDTH,
        height: rpx(88),
        borderRadius: radius.pill,
    },
    tabInner: {
        alignItems: "center",
        justifyContent: "center",
    },
    tabLabel: {
        marginTop: ICON_LABEL_GAP,
        maxWidth: ACTIVE_ITEM_WIDTH - rpx(18),
    },
    activeDot: {
        position: "absolute",
        bottom: rpx(10),
        width: ACTIVE_DOT_SIZE,
        height: ACTIVE_DOT_SIZE,
        borderRadius: ACTIVE_DOT_SIZE / 2,
    },
});
