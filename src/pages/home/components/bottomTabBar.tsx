import React, { useEffect } from "react";
import {
    Image,
    ImageSourcePropType,
    StyleSheet,
    TouchableOpacity,
    View,
    Vibration,
} from "react-native";
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
import Theme from "@/core/theme";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import { timingConfig } from "@/constants/commonConst";
import { ImgAsset } from "@/constants/assetsConst";
import { HOME_TAB_BAR_HEIGHT } from "./bottomAreaMetrics";

interface ITabItem {
    name: string;
    icon: IIconName;
    activeIcon: IIconName;
    mascots: {
        acg: ImageSourcePropType;
        firefly: ImageSourcePropType;
    };
    labelKey: string;
}

const tabs: ITabItem[] = [
    {
        name: "Discover",
        icon: "play-circle-outline",
        activeIcon: "play-circle",
        mascots: {
            acg: ImgAsset.xilianTabIcons.catDiscover,
            firefly: ImgAsset.xilianTabIcons.sakura,
        },
        labelKey: "home.discover",
    },
    {
        name: "Sheets",
        icon: "heart-outline",
        activeIcon: "heart",
        mascots: {
            acg: ImgAsset.xilianTabIcons.catSheets,
            firefly: ImgAsset.xilianTabIcons.fish,
        },
        labelKey: "home.sheets",
    },
    {
        name: "Profile",
        icon: "user",
        activeIcon: "user",
        mascots: {
            acg: ImgAsset.xilianTabIcons.catProfile,
            firefly: ImgAsset.xilianTabIcons.sunset,
        },
        labelKey: "home.profile",
    },
];

const TAB_PILL_HEIGHT = rpx(104);
const ICON_SIZE = rpx(28);
const ACTIVE_ITEM_WIDTH = rpx(98);

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
    mascot,
}: {
    tab: ITabItem;
    isFocused: boolean;
    onPress: () => void;
    primaryColor: string;
    inactiveColor: string;
    activeBackgroundColor: string;
    activeLabelColor: string;
    mascot?: ImageSourcePropType;
}) {
    const { t } = useI18N();

    const progress = useSharedValue(isFocused ? 1 : 0);

    useEffect(() => {
        progress.value = withTiming(
            isFocused ? 1 : 0,
            timingConfig.animationNormal,
        );
    }, [isFocused, progress]);

    const itemStyle = useAnimatedStyle(() => ({
        transform: [{ scale: 0.98 + progress.value * 0.02 }],
    }));

    const activeSurfaceStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
    }));

    const indicatorStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
        transform: [{ scaleX: 0.4 + progress.value * 0.6 }],
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
            <Animated.View style={[styles.tabInner, itemStyle]}>
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.activeBackground,
                        { backgroundColor: activeBackgroundColor },
                        activeSurfaceStyle,
                    ]}
                />
                {mascot ? (
                    <Image
                        source={mascot}
                        style={styles.mascotIcon}
                        resizeMode="contain"
                    />
                ) : (
                    <Icon
                        name={iconName}
                        size={ICON_SIZE}
                        color={isFocused ? primaryColor : inactiveColor}
                    />
                )}
                <ThemeText
                    fontSize="description"
                    fontWeight={isFocused ? "semibold" : "medium"}
                    color={isFocused ? activeLabelColor : inactiveColor}
                    numberOfLines={1}
                    style={styles.tabLabel}>
                    {label}
                </ThemeText>
                <Animated.View
                    style={[
                        styles.activeIndicator,
                        { backgroundColor: primaryColor },
                        indicatorStyle,
                    ]}
                />
            </Animated.View>
        </TouchableOpacity>
    );
}

export default function BottomTabBar(props: BottomTabBarProps) {
    const { state, navigation } = props;
    const colors = useColors();
    const theme = Theme.useTheme();
    const mascotTheme =
        theme.id === "p-acg"
            ? "acg"
            : theme.id === "p-acg-firefly"
                ? "firefly"
                : undefined;
    const primaryColor = colors.primary;
    const inactiveColor = colors.textSecondary ?? "#999999";
    const dockBackgroundColor = alpha(
        colors.surfacePrimary ?? colors.card ?? colors.background,
        colors.hasBackgroundImage ? 0.88 : 0.96,
    );
    const activeBackgroundColor = alpha(
        colors.text,
        colors.hasBackgroundImage ? 0.11 : 0.06,
    );

    return (
        <View style={styles.container}>
            <View
                style={[
                    styles.pill,
                    {
                        backgroundColor: dockBackgroundColor,
                        shadowColor: colors.shadow ?? "#000000",
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
                            mascot={
                                mascotTheme
                                    ? tab.mascots[mascotTheme]
                                    : undefined
                            }
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
        height: HOME_TAB_BAR_HEIGHT,
        paddingHorizontal: spacing.sm,
        paddingTop: rpx(4),
        backgroundColor: "transparent",
    },
    pill: {
        height: TAB_PILL_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        borderRadius: radius.pill,
        overflow: "hidden",
        paddingHorizontal: rpx(6),
        shadowOffset: { width: 0, height: rpx(2) },
        shadowOpacity: 0.1,
        shadowRadius: rpx(4),
        elevation: 3,
    },
    tabItem: {
        flex: 1,
        height: TAB_PILL_HEIGHT,
        alignItems: "center",
        justifyContent: "center",
    },
    tabInner: {
        width: ACTIVE_ITEM_WIDTH,
        height: rpx(94),
        alignItems: "center",
        justifyContent: "center",
    },
    activeBackground: {
        position: "absolute",
        width: ACTIVE_ITEM_WIDTH,
        height: rpx(92),
        borderRadius: radius.pill,
    },
    mascotIcon: {
        width: rpx(34),
        height: rpx(34),
    },
    tabLabel: {
        marginTop: rpx(3),
        maxWidth: rpx(112),
    },
    activeIndicator: {
        width: rpx(10),
        height: rpx(3),
        borderRadius: radius.pill,
        marginTop: rpx(2),
    },
});
