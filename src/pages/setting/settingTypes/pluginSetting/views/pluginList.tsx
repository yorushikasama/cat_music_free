import React, { useRef, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import rpx, { vmax } from "@/utils/rpx";
import SkeletonList from "@/components/base/skeleton";

import PluginManager, { useSortedPlugins } from "@/core/pluginManager";
import { trace } from "@/utils/log";

import Toast from "@/utils/toast";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import Config from "@/core/appConfig";
import Empty from "@/components/base/empty";
import HorizontalSafeAreaView from "@/components/base/horizontalSafeAreaView.tsx";
import { showDialog } from "@/components/dialogs/useDialog";
import { showPanel } from "@/components/panels/usePanel";
import AppBar from "@/components/base/appBar";
import Fab from "@/components/base/fab";
import PluginItem from "../components/pluginItem";
import { IIconName } from "@/components/base/icon.tsx";
import { IInstallPluginResult } from "@/types/core/pluginManager";
import { useI18N } from "@/core/i18n";
import { spacing } from "@/constants/spacing";
import StorageAccess from "@/native/storageAccess";

interface IOption {
    icon: IIconName;
    title: string;
    onPress?: () => void | Promise<void>;
}

export default function PluginList() {
    const plugins = useSortedPlugins();
    const { t } = useI18N();

    const [loading, setLoading] = useState(false);
    const operationLockRef = useRef(false);

    const navigator = useNavigation<any>();

    const runPluginOperation = async <T,>(operation: () => Promise<T>) => {
        if (operationLockRef.current) {
            return { started: false as const };
        }

        operationLockRef.current = true;
        setLoading(true);
        try {
            return {
                started: true as const,
                value: await operation(),
            };
        } finally {
            operationLockRef.current = false;
            setLoading(false);
        }
    };

    const showInstallResults = (
        result: IInstallPluginResult[],
        type: "install" | "update" = "install",
    ) => {
        const successResults = result.filter(it => it.success);
        const failResults = result.filter(it => !it.success);

        if (!result.length) {
            Toast.warn(
                type === "update"
                    ? t("checkUpdate.error.latestVersion")
                    : t("toast.allPluginInstallFailed"),
            );
            return;
        }

        if (!failResults.length) {
            Toast.success(
                type === "update"
                    ? t("toast.updatePluginSuccess")
                    : t("toast.installPluginSuccess"),
            );
            return;
        }

        Toast.warn(
            successResults.length
                ? type === "update"
                    ? t("toast.partialPluginUpdateFailed")
                    : t("toast.partialPluginInstallFailed")
                : type === "update"
                    ? t("toast.allPluginUpdateFailed")
                    : t("toast.allPluginInstallFailed"),
            {
                type: "warn",
                actionText: t("common.view"),
                onActionClick: () => {
                    showDialog("SimpleDialog", {
                        title: t(
                            type === "update"
                                ? "pluginSetting.menu.pluginUpdateFailedDialogTitle"
                                : "pluginSetting.menu.pluginInstallFailedDialogTitle",
                        ),
                        content: t(
                            type === "update"
                                ? "pluginSetting.pluginUpdateFailedDialogContent"
                                : "pluginSetting.pluginInstallFailedDialogContent",
                            {
                                detail: failResults
                                    .map(
                                        it =>
                                            (it.pluginUrl ?? "") +
                                            "\n" +
                                            t("pluginSetting.failReason", {
                                                reason: it.message ?? "",
                                            }),
                                    )
                                    .join("\n-----\n"),
                            },
                        ),
                    });
                },
            },
        );
    };

    const menuOptions: IOption[] = [
        {
            icon: "circle-stack",
            title: t("pluginSetting.fabOptions.pluginMarket"),
            async onPress() {
                navigator.navigate("/pluginsetting/market");
            },
        },
        {
            icon: "bookmark-square",
            title: t("pluginSetting.menu.subscriptionSetting"),
            async onPress() {
                navigator.navigate("/pluginsetting/subscribe");
            },
        },
        {
            icon: "bars-3",
            title: t("pluginSetting.menu.sort"),
            onPress() {
                navigator.navigate("/pluginsetting/sort");
            },
        },
        {
            icon: "trash-outline",
            title: t("pluginSetting.menu.uninstallAll"),
            onPress() {
                if (operationLockRef.current) {
                    return;
                }
                showDialog("SimpleDialog", {
                    title: t("pluginSetting.menu.uninstallAll"),
                    content: t("pluginSetting.menu.uninstallAllContent"),
                    async onOk() {
                        const result = await runPluginOperation(async () => {
                            await PluginManager.uninstallAllPlugins();
                        });
                        if (result.started) {
                            Toast.success(t("toast.pluginUninstalled"));
                        }
                    },
                });
            },
        },
    ];

    async function onInstallFromLocalClick() {
        try {
            const results = await StorageAccess.openDocuments(
                ["text/javascript", "application/javascript", "application/json", "text/plain"],
                true,
            );
            if (!results?.length) return;
            const jsFiles = results.filter(it =>
                it.name?.endsWith(".js") || it.name?.endsWith(".json"),
            );
            if (!jsFiles?.length) {
                Toast.warn(t("pluginSetting.menu.noValidPluginFile", { defaultValue: "未选择有效的插件文件（.js）" }));
                return;
            }

            const operation = await runPluginOperation(() =>
                Promise.all(
                    jsFiles.map(async it => {
                        try {
                            return await PluginManager.installPluginFromLocalFile(
                                it.uri,
                                {
                                    notCheckVersion: Config.getConfig(
                                        "basic.notCheckPluginVersion",
                                    ),
                                    useExpoFs: true,
                                },
                            );
                        } catch (e: any) {
                            return {
                                success: false,
                                message: e?.message ?? "",
                                pluginUrl: it.name ?? it.uri,
                            };
                        }
                    }),
                ),
            );
            if (operation.started) {
                showInstallResults(operation.value);
            }
        } catch (e: any) {
            trace("插件安装失败", e?.message);
            Toast.warn(t("toast.installPluginFail", {
                reason: e?.message ?? "",
            }));
        }
    }

    async function onInstallFromNetworkClick() {
        showPanel("SimpleInput", {
            title: t("pluginSetting.menu.installPlugin"),
            placeholder: t("pluginSetting.menu.installPluginDialogPlaceholder"),
            maxLength: 200,
            async onOk(text, closePanel) {
                const operation = await runPluginOperation(() =>
                    installPluginFromUrl(text.trim()),
                );
                if (!operation.started) {
                    return;
                }

                showInstallResults(operation.value);
                closePanel();
            },
        });
    }

    async function onSubscribeClick() {
        const urls = Config.getConfig("plugin.subscribeUrl");
        if (!urls) {
            Toast.warn(t("toast.noSubscription"));
            return;
        }

        const operation = await runPluginOperation(async () => {
            try {
                const urlItems = JSON.parse(urls);
                if (!Array.isArray(urlItems)) {
                    throw new Error();
                }

                const subscribeUrls = urlItems
                    .map((item: any) => item?.url)
                    .filter((url: any): url is string => !!url?.trim?.());
                if (!subscribeUrls.length) {
                    return [];
                }

                const results = await Promise.all(
                    subscribeUrls.map(url => installPluginFromUrl(url)),
                );
                return results.flat();
            } catch {
                return installPluginFromUrl(urls);
            }
        });
        if (!operation.started) {
            return;
        }

        if (!operation.value.length) {
            Toast.warn(t("toast.subscriptionInvalid"));
            return;
        }
        showInstallResults(operation.value);
    }

    async function onUpdateAllClick() {
        const updateUrls = PluginManager.getEnabledPlugins()
            .map(plugin => plugin.instance.srcUrl)
            .filter((url: any): url is string => !!url?.trim?.());
        if (!updateUrls.length) {
            Toast.warn(t("checkUpdate.error.latestVersion"));
            return;
        }

        try {
            const operation = await runPluginOperation(async () => {
                const results = await Promise.all(
                    updateUrls.map(url => installPluginFromUrl(url)),
                );
                return results.flat();
            });
            if (!operation.started) {
                return;
            }

            showInstallResults(operation.value, "update");
        } catch (e: any) {
            Toast.warn(t("toast.unknownError", {
                reason: e?.message ?? e,
            }));
        }
    }

    return (
        <>
            <AppBar menu={menuOptions}>{t("sidebar.pluginManagement")}</AppBar>
            <HorizontalSafeAreaView style={style.wrapper}>
                <>
                    {loading ? (
                        <SkeletonList
                            count={6}
                            withArtwork
                            style={style.loadingList}
                        />
                    ) : (
                        <FlatList
                            contentContainerStyle={style.listContent}
                            showsVerticalScrollIndicator={false}
                            ListEmptyComponent={
                                <Empty
                                    icon="code-bracket-square"
                                    title={t("noPlugin.title")}
                                    description={t("noPlugin.description")}
                                    minHeight={rpx(520)}
                                />
                            }
                            ListFooterComponent={<View style={style.blank} />}
                            data={plugins ?? []}
                            keyExtractor={_ => _.hash}
                            renderItem={({ item: plugin }) => (
                                <PluginItem key={plugin.hash} plugin={plugin} />
                            )}
                        />
                    )}

                    <Fab
                        icon="plus"
                        accessibilityLabel={t("a11y.add")}
                        disabled={loading}
                        loading={loading}
                        onPress={() => {
                            if (operationLockRef.current) {
                                return;
                            }
                            showPanel("SimpleSelect", {
                                height: vmax(72),
                                header: t("pluginSetting.menu.installPlugin"),
                                candidates: [
                                    {
                                        value: "local",
                                        title: t("pluginSetting.fabOptions.installFromLocal"),
                                        icon: "folder-plus",
                                    },
                                    {
                                        value: "network",
                                        title: t("pluginSetting.fabOptions.installFromNetwork"),
                                        icon: "link",
                                    },
                                    {
                                        value: "batch",
                                        title: t("pluginSetting.fabOptions.batchInstall"),
                                        icon: "inbox-arrow-down",
                                    },
                                    {
                                        value: "updateAll",
                                        title: t("pluginSetting.fabOptions.updateAllPlugins"),
                                        icon: "arrow-path",
                                    },
                                    {
                                        value: "subscription",
                                        title: t("pluginSetting.fabOptions.updateSubscription"),
                                        icon: "bookmark-square",
                                    },
                                ],
                                async onPress(item) {
                                    if (item.value === "local") {
                                        await onInstallFromLocalClick();
                                    } else if (item.value === "network") {
                                        await onInstallFromNetworkClick();
                                    } else if (item.value === "batch") {
                                        showPanel("BatchInstall");
                                    } else if (item.value === "subscription") {
                                        await onSubscribeClick();
                                    } else if (item.value === "updateAll") {
                                        await onUpdateAllClick();
                                    }
                                },
                            });
                        }}
                    />
                </>
            </HorizontalSafeAreaView>
        </>
    );
}

const style = StyleSheet.create({
    wrapper: {
        width: "100%",
        flex: 1,
    },
    blank: {
        height: rpx(200),
    },
    listContent: {
        paddingTop: spacing.sm,
    },
    loadingList: {
        paddingTop: spacing.sm,
    },
});



async function installPluginFromUrl(text: string): Promise<IInstallPluginResult[]> {
    try {
        let urls: string[] = [];
        const inputUrl = text.trim();
        if (text.endsWith(".json")) {
            const jsonFile = (
                await axios.get(inputUrl, {
                    headers: {
                        "Cache-Control": "no-cache",
                        Pragma: "no-cache",
                        Expires: "0",
                    },
                })
            ).data;
            /**
             * {
             *     plugins: [{
             *          version: xxx,
             *          url: xxx
             *      }]
             * }
             */
            urls = (jsonFile?.plugins ?? []).map((_: any) => _.url);
        } else {
            urls = [inputUrl];
        }
        return await Promise.all(
            urls.map(url =>
                PluginManager.installPluginFromUrl(url, {
                    notCheckVersion: Config.getConfig(
                        "basic.notCheckPluginVersion",
                    ),
                }),
            ),
        );
    } catch (e: any) {
        return [{ success: false, message: e?.message, pluginUrl: text }];
    }
}
