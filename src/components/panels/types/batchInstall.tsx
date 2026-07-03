import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import rpx, { vmax } from "@/utils/rpx";
import { fontSizeConst } from "@/constants/uiConst";
import useColors from "@/hooks/useColors";
import ThemeText from "@/components/base/themeText";
import { TouchableOpacity } from "react-native-gesture-handler";
import PanelBase from "../base/panelBase";
import { hidePanel } from "../usePanel";
import PanelHeader from "../base/panelHeader";
import { useI18N } from "@/core/i18n";
import * as DocumentPicker from "expo-document-picker";
import axios from "axios";
import PluginManager from "@/core/pluginManager";
import Config from "@/core/appConfig";
import { IInstallPluginResult } from "@/types/core/pluginManager";
import Toast from "@/utils/toast";
import { showDialog } from "@/components/dialogs/useDialog";
import Icon from "@/components/base/icon";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import Color from "color";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type InputMode = "urls" | "file";

interface IBatchInstallProps {
    onBatchComplete?: (results: IInstallPluginResult[]) => void;
}

export default function BatchInstallPanel(props: IBatchInstallProps) {
    const { t } = useI18N();
    const colors = useColors();
    const { onBatchComplete } = props;
    const safeAreaInsets = useSafeAreaInsets();

    const [mode, setMode] = useState<InputMode>("urls");
    const [urlText, setUrlText] = useState("");
    const [installing, setInstalling] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const progressRatio = useMemo(() => {
        if (!progress.total) {
            return 0;
        }
        return Math.min(1, Math.max(0, progress.current / progress.total));
    }, [progress.current, progress.total]);
    const parseUrls = useCallback((text: string): string[] => {
        return text
            .split(/[\n,;，；]+/)
            .map(u => u.trim())
            .filter(u => u.length > 0 && (u.startsWith("http://") || u.startsWith("https://")));
    }, []);
    const parsedUrlCount = useMemo(
        () => parseUrls(urlText).length,
        [parseUrls, urlText],
    );

    const parseCsvUrls = useCallback((csvText: string): string[] => {
        const lines = csvText.split(/[\r\n]+/).filter(l => l.trim());
        const urls: string[] = [];
        for (const line of lines) {
            const parts = line.split(",");
            const url = parts[0]?.trim();
            if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
                urls.push(url);
            }
        }
        return urls;
    }, []);

    const installBatch = useCallback(async (urls: string[]) => {
        if (!urls.length) {
            Toast.warn(t("pluginSetting.batchInstall.noValidUrls"));
            return;
        }

        setInstalling(true);
        setProgress({ current: 0, total: urls.length });

        const successResults: IInstallPluginResult[] = [];
        const failResults: IInstallPluginResult[] = [];

        for (let i = 0; i < urls.length; i++) {
            setProgress({ current: i + 1, total: urls.length });
            try {
                const result = await PluginManager.installPluginFromUrl(urls[i], {
                    notCheckVersion: Config.getConfig("basic.notCheckPluginVersion"),
                });
                if (result.success) {
                    successResults.push(result);
                } else {
                    failResults.push(result);
                }
            } catch (e: any) {
                failResults.push({
                    success: false,
                    message: e?.message ?? "",
                    pluginUrl: urls[i],
                });
            }
        }

        setInstalling(false);
        hidePanel();

        const allResults = [...successResults, ...failResults];
        onBatchComplete?.(allResults);

        if (!failResults.length) {
            Toast.success(
                t("pluginSetting.batchInstall.allSuccess", {
                    count: successResults.length,
                }),
            );
        } else {
            Toast.warn(
                successResults.length
                    ? t("pluginSetting.batchInstall.partialFailed", {
                        successCount: successResults.length,
                        failCount: failResults.length,
                    })
                    : t("pluginSetting.batchInstall.allFailed"),
                {
                    type: "warn",
                    actionText: t("common.view"),
                    onActionClick: () => {
                        showDialog("SimpleDialog", {
                            title: t("pluginSetting.menu.pluginInstallFailedDialogTitle"),
                            content: t("pluginSetting.pluginInstallFailedDialogContent", {
                                detail: failResults
                                    .map(it =>
                                        (it.pluginUrl ?? "") +
                                        "\n" +
                                        t("pluginSetting.failReason", {
                                            reason: it.message ?? "",
                                        }),
                                    )
                                    .join("\n-----\n"),
                            }),
                        });
                    },
                },
            );
        }
    }, [t, onBatchComplete]);

    const handleOk = useCallback(async () => {
        if (mode === "urls") {
            const urls = parseUrls(urlText);
            await installBatch(urls);
        }
    }, [mode, urlText, parseUrls, installBatch]);

    const handleImportFile = useCallback(async () => {
        try {
            const results = await DocumentPicker.getDocumentAsync({
                copyToCacheDirectory: true,
                multiple: false,
                type: "*/*",
            });
            if (results.canceled || !results.assets?.length) {
                return;
            }

            const file = results.assets[0];
            setInstalling(true);

            let urls: string[] = [];

            if (file.name?.endsWith(".json")) {
                const response = await axios.get(file.uri, {
                    headers: {
                        "Cache-Control": "no-cache",
                        Pragma: "no-cache",
                        Expires: "0",
                    },
                });
                const data = response.data;
                if (Array.isArray(data?.plugins)) {
                    urls = data.plugins
                        .map((_: any) => _?.url)
                        .filter((u: string) => u);
                } else if (Array.isArray(data)) {
                    urls = data
                        .map((_: any) => typeof _ === "string" ? _ : _?.url)
                        .filter((u: string) => u && (u.startsWith("http://") || u.startsWith("https://")));
                }
            } else if (file.name?.endsWith(".csv")) {
                const response = await axios.get(file.uri);
                urls = parseCsvUrls(response.data);
            } else if (file.name?.endsWith(".txt")) {
                const response = await axios.get(file.uri);
                urls = parseUrls(response.data);
            } else {
                setInstalling(false);
                Toast.warn(t("pluginSetting.batchInstall.unsupportedFileType"));
                return;
            }

            await installBatch(urls);
        } catch (e: any) {
            setInstalling(false);
            Toast.warn(t("pluginSetting.batchInstall.fileParseError", {
                reason: e?.message ?? "",
            }));
        }
    }, [parseUrls, parseCsvUrls, installBatch, t]);

    const handleImportFromUrl = useCallback(async () => {
        if (!urlText.trim()) {
            Toast.warn(t("pluginSetting.batchInstall.noValidUrls"));
            return;
        }

        const inputUrl = urlText.trim();
        if (!inputUrl.startsWith("http://") && !inputUrl.startsWith("https://")) {
            Toast.warn(t("pluginSetting.batchInstall.noValidUrls"));
            return;
        }

        if (inputUrl.endsWith(".json") || inputUrl.endsWith(".csv") || inputUrl.endsWith(".txt")) {
            setInstalling(true);
            try {
                const response = await axios.get(inputUrl, {
                    headers: {
                        "Cache-Control": "no-cache",
                        Pragma: "no-cache",
                        Expires: "0",
                    },
                });
                let urls: string[] = [];

                if (inputUrl.endsWith(".json")) {
                    const data = response.data;
                    if (Array.isArray(data?.plugins)) {
                        urls = data.plugins.map((_: any) => _?.url).filter((u: string) => u);
                    } else if (Array.isArray(data)) {
                        urls = data
                            .map((_: any) => typeof _ === "string" ? _ : _?.url)
                            .filter((u: string) => u && (u.startsWith("http://") || u.startsWith("https://")));
                    }
                } else if (inputUrl.endsWith(".csv")) {
                    urls = parseCsvUrls(response.data);
                } else {
                    urls = parseUrls(response.data);
                }

                await installBatch(urls);
            } catch (e: any) {
                setInstalling(false);
                Toast.warn(t("pluginSetting.batchInstall.fileParseError", {
                    reason: e?.message ?? "",
                }));
            }
        } else {
            await installBatch([inputUrl]);
        }
    }, [urlText, parseUrls, parseCsvUrls, installBatch, t]);

    if (installing) {
        return (
            <PanelBase
                height={vmax(30)}
                renderBody={() => (
                    <View style={styles.loadingContainer}>
                        <View
                            style={[
                                styles.installIcon,
                                {
                                    backgroundColor: Color(colors.primary).alpha(0.12).rgb().string(),
                                    borderColor: Color(colors.primary).alpha(0.22).rgb().string(),
                                },
                            ]}>
                            <Icon
                                name="inbox-arrow-down"
                                size={rpx(44)}
                                color={colors.primary}
                            />
                        </View>
                        <ThemeText
                            fontSize="title"
                            fontWeight="semibold"
                            style={styles.installTitle}>
                            {t("pluginSetting.batchInstall.title")}
                        </ThemeText>
                        <View
                            style={[
                                styles.progressTrack,
                                { backgroundColor: colors.surfaceSecondary ?? colors.placeholder },
                            ]}>
                            <View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: `${progressRatio * 100}%`,
                                        backgroundColor: colors.primary,
                                    },
                                ]}
                            />
                        </View>
                        <ThemeText
                            fontSize="content"
                            fontColor="textSecondary"
                            style={styles.progressText}>
                            {t("pluginSetting.batchInstall.installing", {
                                current: progress.current,
                                total: progress.total,
                            })}
                        </ThemeText>
                    </View>
                )}
            />
        );
    }

    return (
        <PanelBase
            keyboardAvoidBehavior="height"
            height={vmax(65)}
            renderBody={() => (
                <>
                    <PanelHeader
                        title={t("pluginSetting.batchInstall.title")}
                        hideButtons
                    />

                    <View style={[styles.modeCard, { backgroundColor: colors.surfaceSecondary }]}>
                        <TouchableOpacity
                            style={[
                                styles.tab,
                                mode === "urls" && {
                                    backgroundColor: colors.surfacePrimary,
                                    shadowColor: colors.shadowMedium ?? colors.shadow,
                                },
                            ]}
                            onPress={() => setMode("urls")}>
                            <Icon
                                name="link"
                                size={rpx(28)}
                                color={mode === "urls" ? colors.primary : colors.textSecondary}
                            />
                            <ThemeText
                                fontSize="subTitle"
                                fontColor={mode === "urls" ? "primary" : "textSecondary"}
                                fontWeight={mode === "urls" ? "semibold" : "regular"}
                                style={styles.tabText}>
                                {t("pluginSetting.batchInstall.tabManualInput")}
                            </ThemeText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.tab,
                                mode === "file" && {
                                    backgroundColor: colors.surfacePrimary,
                                    shadowColor: colors.shadowMedium ?? colors.shadow,
                                },
                            ]}
                            onPress={() => setMode("file")}>
                            <Icon
                                name="document-outline"
                                size={rpx(28)}
                                color={mode === "file" ? colors.primary : colors.textSecondary}
                            />
                            <ThemeText
                                fontSize="subTitle"
                                fontColor={mode === "file" ? "primary" : "textSecondary"}
                                fontWeight={mode === "file" ? "semibold" : "regular"}
                                style={styles.tabText}>
                                {t("pluginSetting.batchInstall.tabImportFile")}
                            </ThemeText>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.body}
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator
                        contentContainerStyle={[
                            styles.bodyContent,
                            { paddingBottom: safeAreaInsets.bottom + spacing.xxl },
                        ]}>
                        {mode === "urls" ? (
                            <>
                                <View
                                    style={[
                                        styles.inputCard,
                                        {
                                            backgroundColor: colors.surfaceSecondary,
                                            borderColor: colors.divider,
                                        },
                                    ]}>
                                    <View style={styles.inputHeader}>
                                        <View style={styles.inputTitleWrap}>
                                            <ThemeText fontWeight="semibold">
                                                {t("pluginSetting.batchInstall.tabManualInput")}
                                            </ThemeText>
                                            <ThemeText
                                                fontSize="description"
                                                fontColor="textSecondary"
                                                numberOfLines={2}
                                                style={styles.hint}>
                                                {t("pluginSetting.batchInstall.urlHint")}
                                            </ThemeText>
                                        </View>
                                        {parsedUrlCount ? (
                                            <View
                                                style={[
                                                    styles.countBadge,
                                                    { backgroundColor: Color(colors.primary).alpha(0.1).rgb().string() },
                                                ]}>
                                                <ThemeText
                                                    fontSize="description"
                                                    fontWeight="semibold"
                                                    color={colors.primary}>
                                                    {parsedUrlCount}
                                                </ThemeText>
                                            </View>
                                        ) : null}
                                    </View>
                                    <TextInput
                                        value={urlText}
                                        accessible
                                        autoFocus
                                        multiline
                                        accessibilityLabel={t("pluginSetting.batchInstall.urlInputLabel")}
                                        onChangeText={setUrlText}
                                        style={[
                                            styles.textInput,
                                            {
                                                color: colors.text,
                                                backgroundColor: colors.surfacePrimary,
                                                borderColor: colors.divider,
                                            },
                                        ]}
                                        placeholderTextColor={Color(colors.textSecondary ?? colors.text).alpha(0.7).rgb().string()}
                                        placeholder={t("pluginSetting.batchInstall.urlPlaceholder")}
                                        textAlignVertical="top"
                                    />
                                    <TouchableOpacity
                                        style={[
                                            styles.secondaryAction,
                                            {
                                                backgroundColor: Color(colors.primary).alpha(0.09).rgb().string(),
                                            },
                                        ]}
                                        onPress={handleImportFromUrl}>
                                        <Icon
                                            name="arrow-down-tray"
                                            size={rpx(28)}
                                            color={colors.primary}
                                        />
                                        <ThemeText
                                            fontSize="subTitle"
                                            fontColor="primary"
                                            fontWeight="semibold"
                                            style={styles.secondaryActionText}>
                                            {t("pluginSetting.batchInstall.installFromListUrl")}
                                        </ThemeText>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            <>
                                <View
                                    style={[
                                        styles.inputCard,
                                        {
                                            backgroundColor: colors.surfaceSecondary,
                                            borderColor: colors.divider,
                                        },
                                    ]}>
                                    <View style={styles.fileHero}>
                                        <View
                                            style={[
                                                styles.fileIcon,
                                                { backgroundColor: Color(colors.primary).alpha(0.12).rgb().string() },
                                            ]}>
                                            <Icon
                                                name="document-outline"
                                                size={rpx(44)}
                                                color={colors.primary}
                                            />
                                        </View>
                                        <ThemeText
                                            fontWeight="semibold"
                                            style={styles.fileHeroTitle}>
                                            {t("pluginSetting.batchInstall.fileHint")}
                                        </ThemeText>
                                    </View>
                                    <TouchableOpacity
                                        style={[
                                            styles.fileBtn,
                                            {
                                                backgroundColor: colors.surfacePrimary,
                                                borderColor: Color(colors.primary).alpha(0.22).rgb().string(),
                                            },
                                        ]}
                                        onPress={handleImportFile}>
                                        <Icon
                                            name="folder-plus"
                                            size={rpx(32)}
                                            color={colors.primary}
                                        />
                                        <View style={styles.fileBtnText}>
                                            <ThemeText fontSize="content" fontColor="primary" fontWeight="semibold">
                                            {t("pluginSetting.batchInstall.selectFile")}
                                            </ThemeText>
                                            <ThemeText fontSize="description" fontColor="textSecondary" style={styles.fileBtnSub}>
                                                {t("pluginSetting.batchInstall.supportedFormats")}
                                            </ThemeText>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                                <View
                                    style={[
                                        styles.formatExamples,
                                        {
                                            backgroundColor: colors.surfaceSecondary,
                                            borderColor: colors.divider,
                                        },
                                    ]}>
                                    <ThemeText fontSize="description" fontColor="textSecondary" fontWeight="medium">
                                        {t("pluginSetting.batchInstall.formatExamplesTitle")}
                                    </ThemeText>
                                    <View style={[styles.codeBlock, { backgroundColor: colors.surfacePrimary }]}>
                                        <Text style={[styles.codeText, { color: colors.textSecondary }]}>
                                            {"JSON:\n{\n  \"plugins\": [\n    {\"url\": \"https://...\"}\n  ]\n}"}
                                        </Text>
                                    </View>
                                    <View style={[styles.codeBlock, { backgroundColor: colors.surfacePrimary }]}>
                                        <Text style={[styles.codeText, { color: colors.textSecondary }]}>
                                            {"CSV:\nhttps://plugin1.js\nhttps://plugin2.js"}
                                        </Text>
                                    </View>
                                </View>
                            </>
                        )}
                    </ScrollView>

                    <View
                        style={[
                            styles.bottomBar,
                            {
                                backgroundColor: colors.surfacePrimary,
                                borderTopColor: colors.divider,
                                paddingBottom: safeAreaInsets.bottom + spacing.md,
                            },
                        ]}>
                        <Pressable
                            style={styles.cancelBtn}
                            onPress={() => {
                                hidePanel();
                            }}>
                            <ThemeText fontWeight="medium">
                                {t("common.cancel")}
                            </ThemeText>
                        </Pressable>
                        <Pressable
                            style={({ pressed }) => [
                                styles.primaryBtn,
                                {
                                    backgroundColor: colors.primary,
                                    opacity: pressed ? 0.78 : 1,
                                },
                            ]}
                            onPress={mode === "urls" ? handleOk : handleImportFile}>
                            <Icon
                                name={mode === "urls" ? "inbox-arrow-down" : "folder-plus"}
                                size={rpx(30)}
                                color="#fff"
                            />
                            <ThemeText
                                fontWeight="semibold"
                                color="#fff"
                                style={styles.primaryBtnText}>
                                {mode === "urls"
                                    ? t("pluginSetting.batchInstall.install")
                                    : t("pluginSetting.batchInstall.selectFile")}
                            </ThemeText>
                        </Pressable>
                    </View>
                </>
            )}
        />
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: spacing.xxl,
    },
    installIcon: {
        width: rpx(104),
        height: rpx(104),
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: spacing.md,
    },
    installTitle: {
        textAlign: "center",
        marginBottom: spacing.lg,
    },
    progressTrack: {
        width: "100%",
        height: rpx(10),
        borderRadius: radius.pill,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        borderRadius: radius.pill,
    },
    progressText: {
        marginTop: spacing.md,
        textAlign: "center",
    },
    modeCard: {
        flexDirection: "row",
        marginHorizontal: spacing.md,
        marginBottom: spacing.md,
        padding: rpx(6),
        borderRadius: radius.pill,
    },
    tab: {
        flex: 1,
        height: rpx(68),
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        borderRadius: radius.pill,
    },
    tabText: {
        marginLeft: rpx(8),
    },
    body: {
        flex: 1,
    },
    bodyContent: {
        paddingHorizontal: spacing.md,
    },
    hint: {
        marginTop: rpx(8),
    },
    inputCard: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radius.xl,
        padding: spacing.md,
    },
    inputHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: spacing.md,
    },
    inputTitleWrap: {
        flex: 1,
        minWidth: 0,
    },
    countBadge: {
        minWidth: rpx(48),
        height: rpx(48),
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: spacing.sm,
    },
    textInput: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radius.lg,
        fontSize: fontSizeConst.content,
        lineHeight: fontSizeConst.content * 1.5,
        padding: spacing.md,
        minHeight: rpx(260),
        maxHeight: rpx(420),
    },
    secondaryAction: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        minHeight: rpx(76),
        borderRadius: radius.lg,
        marginTop: spacing.md,
    },
    secondaryActionText: {
        marginLeft: rpx(8),
    },
    fileHero: {
        alignItems: "center",
        marginBottom: spacing.md,
    },
    fileIcon: {
        width: rpx(88),
        height: rpx(88),
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: spacing.sm,
    },
    fileHeroTitle: {
        textAlign: "center",
    },
    fileBtn: {
        width: "100%",
        minHeight: rpx(96),
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radius.lg,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.md,
    },
    fileBtnText: {
        flex: 1,
        marginLeft: spacing.sm,
    },
    fileBtnSub: {
        marginTop: rpx(8),
    },
    formatExamples: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radius.xl,
        marginTop: spacing.md,
        padding: spacing.md,
    },
    codeBlock: {
        marginTop: spacing.sm,
        padding: spacing.sm,
        borderRadius: radius.md,
    },
    codeText: {
        fontSize: fontSizeConst.description,
        fontFamily: "monospace",
        lineHeight: fontSizeConst.description * 1.6,
    },
    bottomBar: {
        borderTopWidth: StyleSheet.hairlineWidth,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
    },
    cancelBtn: {
        width: rpx(148),
        height: rpx(76),
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.pill,
        marginRight: spacing.sm,
    },
    primaryBtn: {
        flex: 1,
        height: rpx(76),
        borderRadius: radius.pill,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    primaryBtnText: {
        marginLeft: rpx(8),
    },
});
