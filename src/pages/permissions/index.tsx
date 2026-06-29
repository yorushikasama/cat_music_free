import AppBar from "@/components/base/appBar";
import ThemeSwitch from "@/components/base/switch";
import ThemeText from "@/components/base/themeText";
import Icon, { IIconName } from "@/components/base/icon";
import { useI18N } from "@/core/i18n";
import LyricUtil from "@/native/lyricUtil";
import NativeUtils from "@/native/utils";
import rpx from "@/utils/rpx";
import React, { useEffect, useRef, useState } from "react";
import { AppState, Pressable, ScrollView, StyleSheet, View } from "react-native";
import PageShell from "@/components/base/pageShell";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import useColors from "@/hooks/useColors";
import Color from "color";

type IPermissionTypes = "floatingWindow" | "fileStorage";

export default function Permissions() {
    const appState = useRef(AppState.currentState);
    const [permissions, setPermissions] = useState<
        Record<IPermissionTypes, boolean>
    >({
        floatingWindow: false,
        fileStorage: false,
    });
    const { t } = useI18N();
    const colors = useColors();

    async function checkPermission(type?: IPermissionTypes) {
        let newPermission = {
            ...permissions,
        };
        if (!type || type === "floatingWindow") {
            const hasPermission = await LyricUtil.checkSystemAlertPermission();
            newPermission.floatingWindow = hasPermission;
        }
        if (!type || type === "fileStorage") {
            const hasPermission = await NativeUtils.checkStoragePermission();
            newPermission.fileStorage = hasPermission;
        }

        setPermissions(newPermission);
    }

    useEffect(() => {
        checkPermission();
        const subscription = AppState.addEventListener(
            "change",
            nextAppState => {
                if (
                    appState.current.match(/inactive|background/) &&
                    nextAppState === "active"
                ) {
                    checkPermission();
                }

                appState.current = nextAppState;
            },
        );

        return () => {
            subscription.remove();
        };
    }, []);

    const permissionItems: Array<{
        type: IPermissionTypes;
        icon: IIconName;
        title: string;
        description: string;
        onPress: () => void;
    }> = [
        {
            type: "floatingWindow",
            icon: "chat-bubble-oval-left-ellipsis",
            title: t("permissionSetting.floatWindowPermission"),
            description: t("permissionSetting.floatWindowPermissionDescription"),
            onPress: () => LyricUtil.requestSystemAlertPermission(),
        },
        {
            type: "fileStorage",
            icon: "folder-music-outline",
            title: t("permissionSetting.fileReadWritePermission"),
            description: t("permissionSetting.fileReadWritePermissionDescription"),
            onPress: () => NativeUtils.requestStoragePermission(),
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
                            borderColor: colors.divider,
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
                    return (
                        <Pressable
                            key={item.type}
                            accessibilityRole="button"
                            onPress={item.onPress}
                            style={({ pressed }) => [
                                styles.permissionCard,
                                {
                                    backgroundColor: colors.surfacePrimary,
                                    borderColor: granted
                                        ? Color(colors.primary).alpha(0.26).rgb().string()
                                        : colors.divider,
                                    opacity: pressed ? 0.82 : 1,
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
                                    <ThemeSwitch value={granted} />
                                </View>
                                <ThemeText
                                    fontSize="description"
                                    fontColor="textSecondary"
                                    lineHeight
                                    style={styles.permissionDescription}>
                                    {item.description}
                                </ThemeText>
                                <ThemeText
                                    fontSize="description"
                                    fontWeight="semibold"
                                    color={granted ? colors.primary : colors.textSecondary}
                                    style={styles.permissionState}>
                                    {granted
                                        ? t("permissionSetting.granted")
                                        : t("permissionSetting.goAuthorize")}
                                </ThemeText>
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
        borderRadius: radius.xl,
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    description: {
        marginTop: spacing.sm,
    },
    permissionCard: {
        flexDirection: "row",
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radius.xl,
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
    permissionState: {
        marginTop: spacing.md,
    },
});
