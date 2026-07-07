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

const TAB_PILL_HEIGHT = rpx(112);
const ACTIVE_ITEM_WIDTH = rpx(108);
const ICON_SIZE = rpx(34);
const ACTIVE_ICON_SIZE = rpx(38);
const ICON_STAGE_SIZE = rpx(60);
const ICON_IMAGE_SIZE = rpx(58);
const ICON_LABEL_GAP = rpx(6);
const ACG_ICON_LABEL_GAP = rpx(2);
const ACTIVE_ITEM_OFFSET = rpx(2);
const ACG_ACTIVE_ITEM_OFFSET = rpx(4);
const ACTIVE_ICON_LIFT = rpx(3);

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
    const hasMascot = mascot != null;

    const progress = useSharedValue(isFocused ? 1 : 0);
    const activeItemOffset = hasMascot
        ? ACG_ACTIVE_ITEM_OFFSET
        : ACTIVE_ITEM_OFFSET;

    useEffect(() => {
        progress.value = withTiming(
            isFocused ? 1 : 0,
            timingConfig.animationNormal,
        );
    }, [isFocused, progress]);

    const activeBackgroundStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
        transform: [
            { translateY: -progress.value * activeItemOffset },
            { scale: 0.94 + progress.value * 0.06 },
        ],
    }));

    const mascotStyle = useAnimatedStyle(() => ({
        opacity: 0.68 + progress.value * 0.32,
        transform: [
            { translateY: -progress.value * ACTIVE_ICON_LIFT },
            { scale: 0.92 + progress.value * 0.1 },
        ],
    }));

    const iconHaloStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
        transform: [{ scale: 0.75 + progress.value * 0.25 }],
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
                    {hasMascot ? (
                        <View style={styles.iconStage}>
                            <Animated.View
                                pointerEvents="none"
                                style={[
                                    styles.iconHalo,
                                    {
                                        backgroundColor: activeBackgroundColor,
                                        borderColor: alpha(primaryColor, 0.38),
                                    },
                                    iconHaloStyle,
                                ]}
                            />
                            <Animated.View
                                style={[styles.mascotWrap, mascotStyle]}>
                                <Image
                                    source={mascot}
                                    style={styles.mascotIcon}
                                    resizeMode="contain"
                                />
                            </Animated.View>
                        </View>
                    ) : (
                        <Icon
                            name={iconName}
                            size={isFocused ? ACTIVE_ICON_SIZE : ICON_SIZE}
                            color={isFocused ? primaryColor : inactiveColor}
                        />
                    )}
                    <ThemeText
                        fontSize="description"
                        fontWeight={isFocused ? "semibold" : "medium"}
                        color={isFocused ? activeLabelColor : inactiveColor}
                        numberOfLines={1}
                        style={[
                            styles.tabLabel,
                            hasMascot
                                ? styles.acgTabLabel
                                : styles.defaultTabLabel,
                        ]}>
                        {label}
                    </ThemeText>
                </Animated.View>
            </View>
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
    const activeBackgroundColor = alpha(
        colors.primary,
        colors.hasCustomBackground ? 0.16 : 0.12,
    );

    return (
        <View style={styles.container}>
            <View style={styles.pill}>
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
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        backgroundColor: "transparent",
    },
    pill: {
        height: TAB_PILL_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
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
        width: rpx(92),
        height: rpx(86),
        borderRadius: radius.pill,
    },
    tabInner: {
        alignItems: "center",
        justifyContent: "center",
    },
    iconStage: {
        width: ICON_STAGE_SIZE,
        height: ICON_STAGE_SIZE,
        alignItems: "center",
        justifyContent: "center",
    },
    iconHalo: {
        position: "absolute",
        width: rpx(54),
        height: rpx(48),
        borderRadius: rpx(16),
        borderWidth: StyleSheet.hairlineWidth,
    },
    mascotWrap: {
        width: ICON_STAGE_SIZE,
        height: ICON_STAGE_SIZE,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: rpx(2) },
        shadowOpacity: 0.1,
        shadowRadius: rpx(4),
        elevation: 3,
    },
    mascotIcon: {
        width: ICON_IMAGE_SIZE,
        height: ICON_IMAGE_SIZE,
    },
    tabLabel: {
        maxWidth: ACTIVE_ITEM_WIDTH - rpx(18),
    },
    defaultTabLabel: {
        marginTop: ICON_LABEL_GAP,
    },
    acgTabLabel: {
        marginTop: ACG_ICON_LABEL_GAP,
    },
});
