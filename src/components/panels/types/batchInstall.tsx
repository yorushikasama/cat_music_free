import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
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

type InputMode = "urls" | "file";

interface IBatchInstallProps {
    onBatchComplete?: (results: IInstallPluginResult[]) => void;
}

export default function BatchInstallPanel(props: IBatchInstallProps) {
    const { t } = useI18N();
    const colors = useColors();
    const { onBatchComplete } = props;

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
                        okText={t("pluginSetting.batchInstall.install")}
                        onOk={mode === "urls" ? handleOk : undefined}
                        onCancel={() => {
                            hidePanel();
                        }}
                    />

                    <View style={styles.tabBar}>
                        <TouchableOpacity
                            style={[styles.tab, mode === "urls" && styles.activeTab, mode === "urls" && { borderColor: colors.primary }]}
                            onPress={() => setMode("urls")}>
                            <ThemeText
                                fontSize="subTitle"
                                fontColor={mode === "urls" ? "primary" : "textSecondary"}
                                fontWeight={mode === "urls" ? "medium" : "regular"}>
                                {t("pluginSetting.batchInstall.tabManualInput")}
                            </ThemeText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, mode === "file" && styles.activeTab, mode === "file" && { borderColor: colors.primary }]}
                            onPress={() => setMode("file")}>
                            <ThemeText
                                fontSize="subTitle"
                                fontColor={mode === "file" ? "primary" : "textSecondary"}
                                fontWeight={mode === "file" ? "medium" : "regular"}>
                                {t("pluginSetting.batchInstall.tabImportFile")}
                            </ThemeText>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
                        {mode === "urls" ? (
                            <>
                                <ThemeText fontSize="description" fontColor="textSecondary" style={styles.hint}>
                                    {t("pluginSetting.batchInstall.urlHint")}
                                </ThemeText>
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
                                            backgroundColor: colors.placeholder,
                                        },
                                    ]}
                                    placeholderTextColor={colors.textSecondary}
                                    placeholder={t("pluginSetting.batchInstall.urlPlaceholder")}
                                    textAlignVertical="top"
                                />
                                <View style={styles.urlActions}>
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: colors.surfaceSecondary ?? colors.placeholder }]}
                                        onPress={handleImportFromUrl}>
                                        <ThemeText fontSize="subTitle" fontColor="primary">
                                            {t("pluginSetting.batchInstall.installFromListUrl")}
                                        </ThemeText>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            <>
                                <ThemeText fontSize="description" fontColor="textSecondary" style={styles.hint}>
                                    {t("pluginSetting.batchInstall.fileHint")}
                                </ThemeText>
                                <View style={styles.fileButtons}>
                                    <TouchableOpacity
                                        style={[styles.fileBtn, { backgroundColor: colors.surfaceSecondary ?? colors.placeholder }]}
                                        onPress={handleImportFile}>
                                        <ThemeText fontSize="content" fontColor="primary" fontWeight="medium">
                                            {t("pluginSetting.batchInstall.selectFile")}
                                        </ThemeText>
                                        <ThemeText fontSize="description" fontColor="textSecondary" style={styles.fileBtnSub}>
                                            {t("pluginSetting.batchInstall.supportedFormats")}
                                        </ThemeText>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.formatExamples}>
                                    <ThemeText fontSize="description" fontColor="textSecondary" fontWeight="medium">
                                        {t("pluginSetting.batchInstall.formatExamplesTitle")}
                                    </ThemeText>
                                    <View style={[styles.codeBlock, { backgroundColor: colors.placeholder }]}>
                                        <Text style={[styles.codeText, { color: colors.textSecondary }]}>
                                            {"JSON:\n{\n  \"plugins\": [\n    {\"url\": \"https://...\"}\n  ]\n}"}
                                        </Text>
                                    </View>
                                    <View style={[styles.codeBlock, { backgroundColor: colors.placeholder }]}>
                                        <Text style={[styles.codeText, { color: colors.textSecondary }]}>
                                            {"CSV:\nhttps://plugin1.js\nhttps://plugin2.js"}
                                        </Text>
                                    </View>
                                </View>
                            </>
                        )}
                    </ScrollView>
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
    tabBar: {
        flexDirection: "row",
        paddingHorizontal: rpx(24),
        marginBottom: rpx(16),
    },
    tab: {
        flex: 1,
        paddingVertical: rpx(16),
        alignItems: "center",
        borderBottomWidth: rpx(4),
        borderBottomColor: "transparent",
    },
    activeTab: {
        borderBottomWidth: rpx(4),
    },
    body: {
        flex: 1,
        paddingHorizontal: rpx(24),
    },
    hint: {
        marginBottom: rpx(12),
    },
    textInput: {
        borderRadius: rpx(12),
        fontSize: fontSizeConst.content,
        lineHeight: fontSizeConst.content * 1.5,
        padding: rpx(16),
        minHeight: rpx(240),
    },
    urlActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: rpx(16),
    },
    actionBtn: {
        paddingHorizontal: rpx(24),
        paddingVertical: rpx(16),
        borderRadius: rpx(12),
    },
    fileButtons: {
        alignItems: "center",
        marginTop: rpx(16),
    },
    fileBtn: {
        width: "100%",
        paddingVertical: rpx(32),
        borderRadius: rpx(16),
        alignItems: "center",
        justifyContent: "center",
    },
    fileBtnSub: {
        marginTop: rpx(8),
    },
    formatExamples: {
        marginTop: rpx(24),
    },
    codeBlock: {
        marginTop: rpx(12),
        padding: rpx(16),
        borderRadius: rpx(12),
    },
    codeText: {
        fontSize: fontSizeConst.description,
        fontFamily: "monospace",
        lineHeight: fontSizeConst.description * 1.6,
    },
});
