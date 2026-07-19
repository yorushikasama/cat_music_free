import AppBar from "@/components/base/appBar";
import ThemeText from "@/components/base/themeText";
import Icon, { IIconName } from "@/components/base/icon";
import { useI18N } from "@/core/i18n";
import LyricUtil from "@/native/lyricUtil";
import rpx from "@/utils/rpx";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    AppState,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import PageShell from "@/components/base/pageShell";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import useColors from "@/hooks/useColors";
import Color from "color";
import {
    hasNotificationPermission,
    requestNotificationPermission,
} from "@/utils/notificationPermission";
import Toast from "@/utils/toast";

type IPermissionTypes = "floatingWindow" | "notification";

export default function Permissions() {
    const appState = useRef(AppState.currentState);
    const [permissions, setPermissions] = useState<
        Record<IPermissionTypes, boolean>
    >({
        floatingWindow: false,
        notification: false,
    });
    const { t } = useI18N();
    const colors = useColors();
    const [requestingType, setRequestingType] = useState<IPermissionTypes | null>(
        null,
    );
    const pendingFloatWindowRequestRef = useRef(false);

    const checkPermission = useCallback(async (type?: IPermissionTypes) => {
        const newPermission: Partial<Record<IPermissionTypes, boolean>> = {};
        if (!type || type === "floatingWindow") {
            const hasPermission = await LyricUtil.checkSystemAlertPermission();
            newPermission.floatingWindow = hasPermission;
        }
        if (!type || type === "notification") {
            newPermission.notification = await hasNotificationPermission();
        }

        setPermissions(prev => ({
            ...prev,
            ...newPermission,
        }));
    }, []);

    useEffect(() => {
        checkPermission();
        const subscription = AppState.addEventListener(
            "change",
            nextAppState => {
                if (
                    appState.current.match(/inactive|background/) &&
                    nextAppState === "active"
                ) {
                    const refreshPermission = async () => {
                        await checkPermission();
                        if (pendingFloatWindowRequestRef.current) {
                            pendingFloatWindowRequestRef.current = false;
                            const granted =
                                await LyricUtil.checkSystemAlertPermission();
                            setRequestingType(null);
                            if (granted) {
                                Toast.success(t("permissionSetting.granted"));
                            } else {
                                Toast.warn(t("toast.noFloatWindowPermission"));
                            }
                        }
                    };
                    refreshPermission();
                }

                appState.current = nextAppState;
            },
        );

        return () => {
            subscription.remove();
        };
    }, [checkPermission, t]);

    const requestFloatWindowPermission = useCallback(async () => {
        if (requestingType) {
            return;
        }

        pendingFloatWindowRequestRef.current = true;
        setRequestingType("floatingWindow");
        try {
            await LyricUtil.requestSystemAlertPermission();
        } catch (error: any) {
            pendingFloatWindowRequestRef.current = false;
            setRequestingType(null);
            Toast.warn(error?.message ?? t("toast.noFloatWindowPermission"));
        }
    }, [requestingType, t]);

    const requestNotification = useCallback(async () => {
        if (requestingType) {
            return;
        }

        setRequestingType("notification");
        try {
            const granted = await requestNotificationPermission();
            await checkPermission("notification");
            if (granted) {
                Toast.success(t("permissionSetting.granted"));
            } else {
                Toast.warn(t("toast.notificationPermissionDenied"));
            }
        } catch (error: any) {
            Toast.warn(error?.message ?? t("toast.notificationPermissionDenied"));
        } finally {
            setRequestingType(null);
        }
    }, [checkPermission, requestingType, t]);

    const permissionItems: Array<{
        type: IPermissionTypes;
        icon: IIconName;
        title: string;
        description: string;
        onPress: () => void | Promise<void>;
    }> = [
        {
            type: "floatingWindow",
            icon: "chat-bubble-oval-left-ellipsis",
            title: t("permissionSetting.floatWindowPermission"),
            description: t("permissionSetting.floatWindowPermissionDescription"),
            onPress: requestFloatWindowPermission,
        },
        {
            type: "notification",
            icon: "alarm-outline",
            title: t("permissionSetting.notificationPermission"),
            description: t("permissionSetting.notificationPermissionDescription"),
            onPress: requestNotification,
        },
    ];

    return (
        <PageShell appBar={<AppBar>{t("permissionSetting.title")}</AppBar>}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}>
                <View
                    style={[
                        styles.intro,
                        {
                            backgroundColor: colors.surfacePrimary,
                            borderColor: colors.controlBorder ?? colors.divider,
                        },
                    ]}>
                    <ThemeText fontSize="title" fontWeight="semibold">
                        {t("permissionSetting.title")}
                    </ThemeText>
                    <ThemeText
                        fontSize="description"
                        fontColor="textSecondary"
                        lineHeight
                        style={styles.description}>
                        {t("permissionSetting.description")}
                    </ThemeText>
                </View>
                {permissionItems.map(item => {
                    const granted = permissions[item.type];
                    const requesting = requestingType === item.type;
                    return (
                        <Pressable
                            key={item.type}
                            accessibilityRole="button"
                            onPress={item.onPress}
                            disabled={requestingType !== null}
                            accessibilityState={{
                                busy: requesting,
                                disabled: requestingType !== null,
                            }}
                            style={({ pressed }) => [
                                styles.permissionCard,
                                {
                                    backgroundColor: colors.surfacePrimary,
                                    borderColor: granted
                                        ? colors.selectedBorder
                                        : colors.controlBorder ?? colors.divider,
                                    opacity:
                                        requestingType !== null
                                            ? 0.56
                                            : pressed
                                                ? 0.82
                                                : 1,
                                },
                            ]}>
                            <View
                                style={[
                                    styles.permissionIcon,
                                    {
                                        backgroundColor: Color(granted ? colors.primary : colors.textSecondary)
                                            .alpha(granted ? 0.12 : 0.1)
                                            .rgb()
                                            .string(),
                                    },
                                ]}>
                                <Icon
                                    name={item.icon}
                                    size={rpx(34)}
                                    color={granted ? colors.primary : colors.textSecondary}
                                />
                            </View>
                            <View style={styles.permissionContent}>
                                <View style={styles.permissionTitleRow}>
                                    <ThemeText
                                        fontSize="subTitle"
                                        fontWeight="semibold"
                                        numberOfLines={1}
                                        style={styles.permissionTitle}>
                                        {item.title}
                                    </ThemeText>
                                    {requesting ? (
                                        <ActivityIndicator
                                            color={colors.primary}
                                            size="small"
                                        />
                                    ) : (
                                        <Icon
                                            name="chevron-right"
                                            size={rpx(26)}
                                            color={colors.textSecondary}
                                        />
                                    )}
                                </View>
                                <ThemeText
                                    fontSize="description"
                                    fontColor="textSecondary"
                                    lineHeight
                                    style={styles.permissionDescription}>
                                    {item.description}
                                </ThemeText>
                                <View style={styles.permissionFooter}>
                                    <View
                                        style={[
                                            styles.permissionBadge,
                                            {
                                                backgroundColor: Color(granted ? colors.primary : colors.textSecondary)
                                                    .alpha(granted ? 0.12 : 0.08)
                                                    .rgb()
                                                    .string(),
                                                borderColor: granted
                                                    ? colors.selectedBorder
                                                    : colors.controlBorder ?? colors.divider,
                                            },
                                        ]}>
                                        <ThemeText
                                            fontSize="description"
                                            fontWeight="semibold"
                                            color={granted ? colors.primary : colors.textSecondary}>
                                            {granted
                                                ? t("permissionSetting.granted")
                                                : t("permissionSetting.goAuthorize")}
                                        </ThemeText>
                                    </View>
                                </View>
                            </View>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </PageShell>
    );
}

const styles = StyleSheet.create({
    scroll: {
        flex: 1,
    },
    content: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.xl,
    },
    intro: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    description: {
        marginTop: spacing.sm,
    },
    permissionCard: {
        flexDirection: "row",
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    permissionIcon: {
        width: rpx(68),
        height: rpx(68),
        borderRadius: radius.lg,
        justifyContent: "center",
        alignItems: "center",
        marginRight: spacing.md,
    },
    permissionContent: {
        flex: 1,
    },
    permissionTitleRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    permissionTitle: {
        flex: 1,
        marginRight: spacing.md,
    },
    permissionDescription: {
        marginTop: spacing.xs,
    },
    permissionFooter: {
        marginTop: spacing.md,
        flexDirection: "row",
    },
    permissionBadge: {
        minHeight: rpx(38),
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.sm,
        alignItems: "center",
        justifyContent: "center",
    },
});
