import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    StyleSheet,
    View,
    ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import globalStyle from "@/constants/globalStyle";
import ThemeText from "@/components/base/themeText";
import useColors from "@/hooks/useColors";
import rpx from "@/utils/rpx";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import { useI18N } from "@/core/i18n";
import { useNavigate } from "@/core/router";
import { ROUTE_PATH } from "@/core/router/index.ts";
import { showDialog } from "@/components/dialogs/useDialog";
import { showPanel } from "@/components/panels/usePanel";
import Icon from "@/components/base/icon.tsx";
import Theme from "@/core/theme";
import { ImgAsset } from "@/constants/assetsConst";
import {
    checkUpdateAndShowResult,
    useUpdateAvailable,
} from "@/hooks/useCheckUpdate.ts";
import deviceInfoModule from "react-native-device-info";
import { useScheduleCloseCountDown } from "@/utils/scheduleClose";
import timeformat from "@/utils/timeformat";
import { HOME_BOTTOM_CONTENT_SPACING } from "../bottomAreaMetrics";

interface IProfileItem {
    icon: string;
    title: string;
    onPress?: () => void;
    rightText?: string;
    showDot?: boolean;
}

export default function ProfileTab() {
    const colors = useColors();
    const theme = Theme.useTheme();
    const safeAreaInsets = useSafeAreaInsets();
    const { t, getSupportedLanguages, getLanguage, setLanguage } = useI18N();
    const navigate = useNavigate();
    const countDown = useScheduleCloseCountDown();
    const { hasUpdate, refresh: refreshUpdateStatus } = useUpdateAvailable();
    const [checkingUpdate, setCheckingUpdate] = useState(false);
    const isAcgTheme = theme.id === "p-acg-firefly";
    const avatarColorStyle = {
        backgroundColor: isAcgTheme ? "transparent" : colors.selectedBackground,
        borderColor: isAcgTheme ? "transparent" : colors.selectedBorder,
    };
    const pageStyle = { backgroundColor: colors.pageBackground };
    const headerStyle = {
        backgroundColor: colors.surfacePrimary,
        borderColor: colors.controlBorder ?? colors.divider,
    };
    const cardStyle = {
        backgroundColor: colors.surfacePrimary,
        borderColor: colors.controlBorder ?? colors.divider,
    };
    const dividerStyle = {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.divider,
    };
    const iconContainerStyle = {
        backgroundColor: colors.selectedBackground,
        borderColor: colors.selectedBorder,
    };
    const updateDotStyle = {
        backgroundColor: colors.danger ?? "#ff4d4f",
        borderColor: colors.surfacePrimary,
    };
    const titleStyle = {
        color: colors.text,
    };
    const contentContainerStyle = {
        paddingBottom: HOME_BOTTOM_CONTENT_SPACING + safeAreaInsets.bottom,
    };

    function navigateToSetting(settingType: string) {
        navigate(ROUTE_PATH.SETTING, {
            type: settingType,
        });
    }

    const handleCheckUpdate = useCallback(async () => {
        if (checkingUpdate) {
            return;
        }

        setCheckingUpdate(true);
        try {
            await checkUpdateAndShowResult(true);
            await refreshUpdateStatus();
        } finally {
            setCheckingUpdate(false);
        }
    }, [checkingUpdate, refreshUpdateStatus]);

    const settingItems: IProfileItem[] = [
        {
            icon: "cog-8-tooth",
            title: t("sidebar.basicSettings"),
            onPress: () => navigateToSetting("basic"),
        },
        {
            icon: "javascript",
            title: t("sidebar.pluginManagement"),
            onPress: () => navigateToSetting("plugin"),
        },
        {
            icon: "t-shirt-outline",
            title: t("sidebar.themeSettings"),
            onPress: () => navigateToSetting("theme"),
        },
        {
            icon: "strategy",
            title: t("sidebar.aiSettings"),
            onPress: () => navigateToSetting("ai"),
        },
    ];

    const otherItems: IProfileItem[] = [
        {
            icon: "alarm-outline",
            title: t("sidebar.scheduleClose"),
            onPress: () => showPanel("TimingClose"),
            rightText: countDown ? timeformat(countDown) : "",
        },
        {
            icon: "circle-stack",
            title: t("sidebar.backupAndResume"),
            onPress: () => navigateToSetting("backup"),
        },
        {
            icon: "shield-keyhole-outline",
            title: t("sidebar.permissionManagement"),
            onPress: () => navigate(ROUTE_PATH.PERMISSIONS),
        },
        {
            icon: "language",
            title: t("sidebar.languageSettings"),
            onPress: () => {
                showDialog("RadioDialog", {
                    content: getSupportedLanguages().map(item => ({
                        title: item.name,
                        value: item.locale,
                        label: item.name,
                    })),
                    title: t("sidebar.languageSettings"),
                    onOk(value) {
                        setLanguage(value as string);
                    },
                    defaultSelected: getLanguage().locale,
                });
            },
            rightText: getLanguage().name,
        },
    ];

    const softwareItems: IProfileItem[] = [
        {
            icon: "arrow-path",
            title: t("sidebar.checkUpdate"),
            onPress: handleCheckUpdate,
            rightText: `${t(
                "sidebar.currentVersion",
            )}${deviceInfoModule.getVersion()}`,
            showDot: hasUpdate,
        },
        {
            icon: "information-circle",
            title: `${t(
                "common.about",
            )} ${deviceInfoModule.getApplicationName()}`,
            onPress: () => navigateToSetting("about"),
        },
    ];

    const renderSection = (items: IProfileItem[]) => (
        <View style={[styles.card, cardStyle]}>
            {items.map((item, index) => {
                const isFirst = index === 0;
                const isUpdateItem = item.icon === "arrow-path";
                return (
                    <Pressable
                        key={index}
                        accessibilityRole="button"
                        accessibilityLabel={item.title}
                        accessibilityState={{
                            busy: isUpdateItem && checkingUpdate,
                        }}
                        android_ripple={{ color: colors.pressedOverlay }}
                        disabled={isUpdateItem && checkingUpdate}
                        style={({ pressed }) => [
                            styles.item,
                            !isFirst && dividerStyle,
                            {
                                opacity:
                                    pressed || (isUpdateItem && checkingUpdate)
                                        ? 0.72
                                        : 1,
                            },
                        ]}
                        onPress={item.onPress}>
                        <View
                            style={[styles.iconContainer, iconContainerStyle]}>
                            <Icon
                                name={item.icon as any}
                                size={rpx(32)}
                                color={colors.primary}
                            />
                            {item.showDot ? (
                                <View
                                    style={[styles.updateDot, updateDotStyle]}
                                />
                            ) : null}
                        </View>
                        <ThemeText fontSize="content" style={styles.itemTitle}>
                            {item.title}
                        </ThemeText>
                        {item.rightText ? (
                            <ThemeText
                                fontSize="subTitle"
                                fontColor="textSecondary"
                                style={styles.rightText}>
                                {item.rightText}
                            </ThemeText>
                        ) : null}
                        {isUpdateItem && checkingUpdate ? (
                            <ActivityIndicator
                                color={colors.primary}
                                size="small"
                            />
                        ) : (
                            <Icon
                                name="chevron-right"
                                size={rpx(28)}
                                color={colors.textSecondary}
                            />
                        )}
                    </Pressable>
                );
            })}
        </View>
    );

    return (
        <ScrollView
            style={[globalStyle.fwflex1, pageStyle]}
            contentContainerStyle={contentContainerStyle}
            showsVerticalScrollIndicator={false}>
            <View style={[styles.header, headerStyle]}>
                <View style={styles.headerContent}>
                    <View style={[styles.avatarContainer, avatarColorStyle]}>
                        {isAcgTheme ? (
                            <Image
                                source={ImgAsset.xilianTabIcons.maid}
                                style={styles.avatarImage}
                                resizeMode="contain"
                            />
                        ) : (
                            <Icon
                                name="user"
                                size={rpx(56)}
                                color={colors.primary}
                            />
                        )}
                    </View>
                    <View style={styles.headerText}>
                        <ThemeText
                            fontSize="title"
                            fontWeight="bold"
                            style={titleStyle}>
                            {deviceInfoModule.getApplicationName()}
                        </ThemeText>
                        <ThemeText
                            fontSize="subTitle"
                            fontColor="textSecondary">
                            {t("sidebar.currentVersion")}
                            {deviceInfoModule.getVersion()}
                        </ThemeText>
                    </View>
                </View>
            </View>

            <View style={styles.sectionSpacing}>
                {renderSection(settingItems)}
            </View>
            <View style={styles.sectionSpacing}>
                {renderSection(otherItems)}
            </View>
            <View style={styles.sectionSpacing}>
                {renderSection(softwareItems)}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    header: {
        marginHorizontal: spacing.md,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: "hidden",
        height: rpx(160),
        justifyContent: "center",
    },
    headerContent: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.lg,
    },
    avatarContainer: {
        width: rpx(88),
        height: rpx(88),
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarImage: {
        width: rpx(88),
        height: rpx(88),
    },
    headerText: {
        marginLeft: spacing.lg,
        justifyContent: "center",
    },
    sectionSpacing: {
        marginHorizontal: spacing.md,
        marginBottom: spacing.md,
    },
    card: {
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: "hidden",
    },
    item: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    iconContainer: {
        width: rpx(64),
        height: rpx(64),
        borderRadius: radius.md,
        borderWidth: StyleSheet.hairlineWidth,
        justifyContent: "center",
        alignItems: "center",
        marginRight: spacing.md,
        position: "relative",
    },
    updateDot: {
        position: "absolute",
        top: rpx(8),
        right: rpx(8),
        width: rpx(14),
        height: rpx(14),
        borderRadius: radius.pill,
        borderWidth: rpx(3),
    },
    itemTitle: {
        flex: 1,
    },
    rightText: {
        marginRight: spacing.sm,
    },
});
