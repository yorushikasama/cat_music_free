import React, { useState } from "react";
import ThemeText from "@/components/base/themeText";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import rpx, { vh } from "@/utils/rpx";
import openUrl from "@/utils/openUrl";
import Clipboard from "@react-native-clipboard/clipboard";
import { ScrollView, TouchableOpacity } from "react-native-gesture-handler";
import { hideDialog } from "../useDialog";
import Checkbox from "@/components/base/checkbox";
import Dialog from "./base";
import PersistStatus from "@/utils/persistStatus";
import { useI18N } from "@/core/i18n";
import NativeUtils from "@/native/utils";
import Toast from "@/utils/toast";
import useColors from "@/hooks/useColors";
import Color from "color";
import Icon, { IIconName } from "@/components/base/icon";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";

interface IDownloadDialogProps {
    version: string;
    content: string[];
    fromUrl: string;
    backUrl?: string;
    downloadUrls?: string[];
}

export default function DownloadDialog(props: IDownloadDialogProps) {
    const { content, fromUrl, backUrl, version, downloadUrls } = props;
    const [skipState, setSkipState] = useState(false);
    const [backgroundDownloading, setBackgroundDownloading] = useState(false);

    const { t } = useI18N();
    const colors = useColors();
    const browserDownloadUrls = getBrowserDownloadUrls(downloadUrls, fromUrl, backUrl);
    const backgroundDownloadUrl = fromUrl;
    const changelog = content?.filter(Boolean) ?? [];
    const primarySoft = Color(colors.primary).alpha(0.12).rgb().string();
    const primarySofter = Color(colors.primary).alpha(0.07).rgb().string();
    const dividerSoft = Color(colors.divider ?? colors.text).alpha(0.55).rgb().string();

    async function startBackgroundDownload(url: string) {
        if (backgroundDownloading) {
            return;
        }

        setBackgroundDownloading(true);
        try {
            PersistStatus.set("app.skipVersion", undefined);
            await NativeUtils.downloadAndInstallApk(
                url,
                `CatMusicFree ${version}`,
            );
            hideDialog();
            Toast.success(t("dialog.downloadDialog.backgroundDownloadStarted"));
        } catch (e: any) {
            Toast.warn(
                e?.message ??
                    t("dialog.downloadDialog.backgroundDownloadFailed"),
            );
        } finally {
            setBackgroundDownloading(false);
        }
    }

    return (
        <Dialog
            onDismiss={() => {
                if (skipState) {
                    PersistStatus.set("app.skipVersion", version);
                }
                hideDialog();
            }}>
            <View style={style.header}>
                <View
                    style={[
                        style.iconWrap,
                        {
                            backgroundColor: primarySoft,
                            borderColor: Color(colors.primary).alpha(0.18).rgb().string(),
                        },
                    ]}>
                    <Icon
                        name="arrow-down-tray"
                        size={rpx(34)}
                        color={colors.primary}
                    />
                </View>
                <ThemeText
                    fontSize="title"
                    fontWeight="bold"
                    numberOfLines={1}
                    style={style.title}>
                    {t("dialog.downloadDialog.title", { version })}
                </ThemeText>
                <View
                    style={[
                        style.versionBadge,
                        { backgroundColor: primarySofter },
                    ]}>
                    <ThemeText
                        fontSize="description"
                        fontWeight="semibold"
                        color={colors.primary}
                        numberOfLines={1}>
                        v{version}
                    </ThemeText>
                </View>
            </View>

            <ScrollView
                style={style.scrollView}
                contentContainerStyle={style.scrollContent}
                showsVerticalScrollIndicator={false}>
                <View style={style.sectionHeader}>
                    <ThemeText fontWeight="semibold">
                        {t("dialog.downloadDialog.changeLogTitle")}
                    </ThemeText>
                    <ThemeText fontSize="description" fontColor="textSecondary">
                        {t("dialog.downloadDialog.changeLogSubtitle")}
                    </ThemeText>
                </View>

                <View style={style.changeLogList}>
                    {changelog.length ? changelog.map((item, index) => (
                        <View key={`${index}-${item}`} style={style.changeLogItem}>
                            <View
                                style={[
                                    style.changeLogDot,
                                    { backgroundColor: colors.primary },
                                ]}
                            />
                            <ThemeText
                                lineHeight
                                style={style.changeLogText}>
                                {item}
                            </ThemeText>
                        </View>
                    )) : (
                        <ThemeText
                            fontColor="textSecondary"
                            lineHeight
                            style={style.emptyText}>
                            {t("dialog.downloadDialog.emptyChangeLog")}
                        </ThemeText>
                    )}
                </View>
            </ScrollView>

            <View
                style={[
                    style.actionPanel,
                    {
                        borderTopColor: dividerSoft,
                        backgroundColor: colors.surfacePrimary,
                    },
                ]}>
                <View style={style.downloadActions}>
                    {browserDownloadUrls.map((item, index) => (
                        <DownloadAction
                            key={`${item.label}-${item.url}`}
                            icon="arrow-right-end-on-rectangle"
                            title={t("dialog.downloadDialog.downloadUsingBrowser", {
                                source: item.label,
                            })}
                            description={t("dialog.downloadDialog.browserDownloadDesc", {
                                source: item.label,
                            })}
                            primary={index === 0}
                            disabled={backgroundDownloading}
                            onPress={() => {
                                PersistStatus.set("app.skipVersion", undefined);
                                openUrl(item.url);
                                Clipboard.setString(item.url);
                            }}
                        />
                    ))}
                    <DownloadAction
                        icon="inbox-arrow-down"
                        title={t("dialog.downloadDialog.backgroundDownload")}
                        description={t("dialog.downloadDialog.backgroundDownloadDesc")}
                        loading={backgroundDownloading}
                        disabled={backgroundDownloading}
                        onPress={async () => {
                            await startBackgroundDownload(backgroundDownloadUrl);
                        }}
                    />
                </View>

                <View style={style.footerRow}>
                    <TouchableOpacity
                        disabled={backgroundDownloading}
                        onPress={() => {
                            setSkipState(state => !state);
                        }}>
                        <View style={style.checkboxGroup}>
                            <Checkbox checked={skipState} />
                            <ThemeText
                                fontSize="description"
                                fontColor="textSecondary"
                                style={style.checkboxHint}>
                                {t("dialog.downloadDialog.skipThisVersion")}
                            </ThemeText>
                        </View>
                    </TouchableOpacity>
                    <Pressable
                        hitSlop={spacing.sm}
                        disabled={backgroundDownloading}
                        onPress={() => {
                            hideDialog();
                            if (skipState) {
                                PersistStatus.set("app.skipVersion", version);
                            }
                        }}>
                        <ThemeText
                            fontWeight="medium"
                            color={colors.primary}>
                            {t("common.cancel")}
                        </ThemeText>
                    </Pressable>
                </View>
            </View>
        </Dialog>
    );
}

function getBrowserDownloadUrls(
    downloadUrls: string[] | undefined,
    fromUrl: string,
    backUrl?: string,
) {
    const urls = (downloadUrls?.length ? downloadUrls : [fromUrl, backUrl])
        .filter((url): url is string => !!url);
    return Array.from(new Set(urls)).map(url => ({
        url,
        label: getDownloadSourceLabel(url),
    }));
}

function getDownloadSourceLabel(url: string) {
    if (url.includes("gitee.com")) {
        return "Gitee";
    }
    if (url.includes("github.com")) {
        return "GitHub";
    }
    if (url.includes("gitea.com")) {
        return "Gitea";
    }
    return "Browser";
}

function DownloadAction(props: {
    icon: IIconName;
    title: string;
    description: string;
    primary?: boolean;
    disabled?: boolean;
    loading?: boolean;
    onPress: () => void;
}) {
    const {
        icon,
        title,
        description,
        primary,
        disabled = false,
        loading = false,
        onPress,
    } = props;
    const colors = useColors();
    const borderColor = primary
        ? Color(colors.primary).alpha(0.2).rgb().string()
        : Color(colors.divider ?? colors.text).alpha(0.55).rgb().string();
    const backgroundColor = primary
        ? Color(colors.primary).alpha(0.11).rgb().string()
        : colors.surfaceSecondary;
    const iconBg = primary
        ? Color(colors.primary).alpha(0.14).rgb().string()
        : Color(colors.text).alpha(0.06).rgb().string();
    const iconColor = primary ? colors.primary : colors.textSecondary ?? colors.text;

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={title}
            accessibilityState={{ busy: loading, disabled }}
            disabled={disabled}
            onPress={onPress}
            android_ripple={{ color: Color(colors.primary).alpha(0.08).rgb().string() }}
            style={({ pressed }) => [
                style.downloadAction,
                {
                    backgroundColor,
                    borderColor,
                    opacity: disabled ? 0.52 : pressed ? 0.76 : 1,
                },
            ]}>
            <View style={[style.actionIconWrap, { backgroundColor: iconBg }]}>
                {loading ? (
                    <ActivityIndicator color={iconColor} size="small" />
                ) : (
                    <Icon
                        name={icon}
                        size={rpx(30)}
                        color={iconColor}
                    />
                )}
            </View>
            <View style={style.actionTextWrap}>
                <ThemeText
                    fontWeight="semibold"
                    numberOfLines={1}
                    color={primary ? colors.primary : colors.text}>
                    {title}
                </ThemeText>
                <ThemeText
                    fontSize="description"
                    fontColor="textSecondary"
                    lineHeight
                    style={style.actionDescription}>
                    {description}
                </ThemeText>
            </View>
        </Pressable>
    );
}

const style = StyleSheet.create({
    header: {
        alignItems: "center",
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
        paddingBottom: spacing.md,
    },
    iconWrap: {
        width: rpx(72),
        height: rpx(72),
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: spacing.sm,
    },
    title: {
        maxWidth: "100%",
    },
    versionBadge: {
        marginTop: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: rpx(8),
        borderRadius: radius.pill,
    },
    scrollView: {
        maxHeight: vh(46),
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
    },
    sectionHeader: {
        marginBottom: spacing.md,
    },
    changeLogList: {
        gap: spacing.sm,
    },
    changeLogItem: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    changeLogDot: {
        width: rpx(10),
        height: rpx(10),
        borderRadius: radius.pill,
        marginTop: rpx(14),
        marginRight: spacing.sm,
    },
    changeLogText: {
        flex: 1,
    },
    emptyText: {
        paddingVertical: spacing.sm,
    },
    actionPanel: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
    },
    downloadActions: {
        gap: spacing.sm,
    },
    downloadAction: {
        minHeight: rpx(104),
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    actionIconWrap: {
        width: rpx(56),
        height: rpx(56),
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        marginRight: spacing.sm,
    },
    actionTextWrap: {
        flex: 1,
    },
    actionDescription: {
        marginTop: rpx(6),
    },
    footerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: spacing.md,
    },
    checkboxGroup: {
        flexDirection: "row",
        alignItems: "center",
    },
    checkboxHint: {
        marginLeft: spacing.sm,
    },
});
