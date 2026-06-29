import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    View,
} from "react-native";
import axios from "axios";
import Color from "color";

import AppBar from "@/components/base/appBar";
import Empty from "@/components/base/empty";
import Icon from "@/components/base/icon";
import SearchInput from "@/components/base/searchInput";
import SkeletonList from "@/components/base/skeleton";
import ThemeText from "@/components/base/themeText";
import { Button } from "@/components/base/button";
import HorizontalSafeAreaView from "@/components/base/horizontalSafeAreaView.tsx";
import { showDialog } from "@/components/dialogs/useDialog";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import Config from "@/core/appConfig";
import { useI18N } from "@/core/i18n";
import PluginManager, { useSortedPlugins } from "@/core/pluginManager";
import useColors from "@/hooks/useColors";
import { IInstallPluginResult } from "@/types/core/pluginManager";
import rpx from "@/utils/rpx";
import Toast from "@/utils/toast";

const MARKET_URL = "https://music.nairocy.com/file.json";
const MARKET_FILE_BASE_URL = "https://music.nairocy.com/";

interface IMarketPlugin {
    id: number;
    name: string;
    url: string;
    localFile?: string;
}

type FilterKey = "all" | "notInstalled" | "installed" | "warning";

function getHost(url: string) {
    const matched = url.match(/^https?:\/\/([^/]+)/i);
    return matched?.[1] ?? url;
}

function isHttpUrl(url: string) {
    return url.startsWith("http://");
}

function isNonJsUrl(url: string) {
    return !url.toLowerCase().endsWith(".js");
}

function normalizeName(name?: string) {
    return (name ?? "").trim().toLowerCase();
}

function getFallbackUrl(item: IMarketPlugin) {
    if (!item.localFile) {
        return null;
    }
    return encodeURI(MARKET_FILE_BASE_URL + item.localFile);
}

async function installMarketPlugin(item: IMarketPlugin) {
    const config = {
        notCheckVersion: Config.getConfig("basic.notCheckPluginVersion"),
    };
    const result = await PluginManager.installPluginFromUrl(item.url, config);
    if (result.success) {
        return result;
    }

    const fallbackUrl = getFallbackUrl(item);
    if (!fallbackUrl || fallbackUrl === item.url) {
        return result;
    }
    const fallbackResult = await PluginManager.installPluginFromUrl(
        fallbackUrl,
        config,
    );
    return fallbackResult.success ? fallbackResult : result;
}

export default function PluginMarket() {
    const { t } = useI18N();
    const colors = useColors();
    const installedPlugins = useSortedPlugins();
    const [plugins, setPlugins] = useState<IMarketPlugin[]>([]);
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<FilterKey>("all");
    const [selectedIds, setSelectedIds] = useState<Record<number, true>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [installing, setInstalling] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    const installedNames = useMemo(() => {
        return new Set(installedPlugins.map(it => normalizeName(it.name)));
    }, [installedPlugins]);

    const loadMarket = useCallback(async (asRefresh = false) => {
        if (asRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        try {
            const response = await axios.get(MARKET_URL, {
                timeout: 10_000,
                headers: {
                    "Cache-Control": "no-cache",
                    Pragma: "no-cache",
                    Expires: "0",
                },
            });
            const nextPlugins = Array.isArray(response.data?.plugins)
                ? response.data.plugins
                    .filter((it: any) => it?.name && it?.url)
                    .map((it: any) => ({
                        id: Number(it.id),
                        name: String(it.name),
                        url: String(it.url),
                        localFile: it.localFile ? String(it.localFile) : undefined,
                    }))
                : [];
            setPlugins(nextPlugins);
        } catch (e: any) {
            Toast.warn(t("pluginSetting.market.loadFailed", {
                reason: e?.message ?? "",
            }));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [t]);

    useEffect(() => {
        loadMarket();
    }, [loadMarket]);

    const filteredPlugins = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return plugins.filter(item => {
            const installed = installedNames.has(normalizeName(item.name));
            const warning = isHttpUrl(item.url) || isNonJsUrl(item.url);
            const matchesQuery =
                !normalizedQuery ||
                item.name.toLowerCase().includes(normalizedQuery) ||
                item.url.toLowerCase().includes(normalizedQuery);
            const matchesFilter =
                filter === "all" ||
                (filter === "notInstalled" && !installed) ||
                (filter === "installed" && installed) ||
                (filter === "warning" && warning);
            return matchesQuery && matchesFilter;
        });
    }, [filter, installedNames, plugins, query]);

    const selectedPlugins = useMemo(() => {
        return plugins.filter(item => selectedIds[item.id]);
    }, [plugins, selectedIds]);

    const toggleSelected = useCallback((item: IMarketPlugin) => {
        if (installedNames.has(normalizeName(item.name)) || installing) {
            return;
        }
        setSelectedIds(prev => {
            const next = { ...prev };
            if (next[item.id]) {
                delete next[item.id];
            } else {
                next[item.id] = true;
            }
            return next;
        });
    }, [installedNames, installing]);

    const selectAllVisible = useCallback(() => {
        const next: Record<number, true> = {};
        filteredPlugins.forEach(item => {
            if (!installedNames.has(normalizeName(item.name))) {
                next[item.id] = true;
            }
        });
        setSelectedIds(next);
    }, [filteredPlugins, installedNames]);

    const showFailedResults = useCallback((failResults: IInstallPluginResult[]) => {
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
    }, [t]);

    const installItems = useCallback(async (items: IMarketPlugin[]) => {
        if (!items.length || installing) {
            return;
        }
        setInstalling(true);
        setProgress({ current: 0, total: items.length });

        const successResults: IInstallPluginResult[] = [];
        const failResults: IInstallPluginResult[] = [];
        for (let index = 0; index < items.length; index++) {
            setProgress({ current: index + 1, total: items.length });
            const item = items[index];
            try {
                const result = await installMarketPlugin(item);
                if (result.success) {
                    successResults.push(result);
                } else {
                    failResults.push(result);
                }
            } catch (e: any) {
                failResults.push({
                    success: false,
                    pluginUrl: item.url,
                    message: e?.message ?? "",
                });
            }
        }

        setInstalling(false);
        setSelectedIds({});
        if (!failResults.length) {
            Toast.success(t("pluginSetting.batchInstall.allSuccess", {
                count: successResults.length,
            }));
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
                    onActionClick: () => showFailedResults(failResults),
                },
            );
        }
    }, [installing, showFailedResults, t]);

    const filterItems: Array<{ key: FilterKey; title: string }> = [
        { key: "all", title: t("pluginSetting.market.filterAll") },
        { key: "notInstalled", title: t("pluginSetting.market.filterNotInstalled") },
        { key: "installed", title: t("pluginSetting.market.filterInstalled") },
        { key: "warning", title: t("pluginSetting.market.filterWarning") },
    ];

    return (
        <>
            <AppBar
                actions={[
                    {
                        icon: "arrow-path",
                        onPress() {
                            loadMarket(true);
                        },
                    },
                ]}>
                {t("pluginSetting.market.title")}
            </AppBar>
            <HorizontalSafeAreaView style={styles.wrapper}>
                <View style={styles.toolbar}>
                    <SearchInput
                        value={query}
                        onChangeText={setQuery}
                        onClear={() => setQuery("")}
                        placeholder={t("pluginSetting.market.searchPlaceholder")}
                        accessibilityLabel={t("pluginSetting.market.searchPlaceholder")}
                    />
                    <FlatList
                        horizontal
                        data={filterItems}
                        keyExtractor={item => item.key}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterContent}
                        renderItem={({ item }) => {
                            const active = item.key === filter;
                            return (
                                <Pressable
                                    onPress={() => setFilter(item.key)}
                                    style={({ pressed }) => [
                                        styles.filterChip,
                                        {
                                            backgroundColor: active
                                                ? Color(colors.primary).alpha(0.14).rgb().string()
                                                : colors.surfaceSecondary,
                                            borderColor: active
                                                ? Color(colors.primary).alpha(0.32).rgb().string()
                                                : colors.divider,
                                            opacity: pressed ? 0.82 : 1,
                                        },
                                    ]}>
                                    <ThemeText
                                        fontSize="description"
                                        fontWeight={active ? "semibold" : "medium"}
                                        color={active ? colors.primary : colors.text}>
                                        {item.title}
                                    </ThemeText>
                                </Pressable>
                            );
                        }}
                    />
                    <View
                        style={[
                            styles.notice,
                            {
                                backgroundColor: colors.surfacePrimary,
                                borderColor: colors.divider,
                            },
                        ]}>
                        <Icon
                            name="information-circle"
                            size={rpx(30)}
                            color={colors.textSecondary}
                        />
                        <ThemeText
                            fontSize="description"
                            fontColor="textSecondary"
                            lineHeight
                            style={styles.noticeText}>
                            {t("pluginSetting.market.securityNotice")}
                        </ThemeText>
                    </View>
                </View>

                {loading ? (
                    <SkeletonList
                        count={8}
                        withArtwork={false}
                        style={styles.loadingList}
                    />
                ) : (
                    <FlatList
                        data={filteredPlugins}
                        keyExtractor={item => String(item.id)}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={() => loadMarket(true)}
                                tintColor={colors.primary}
                                colors={[colors.primary]}
                            />
                        }
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={[
                            styles.listContent,
                            selectedPlugins.length ? styles.listWithBar : null,
                        ]}
                        ListEmptyComponent={
                            <Empty
                                icon="code-bracket-square"
                                title={t("pluginSetting.market.emptyTitle")}
                                description={t("pluginSetting.market.emptyDescription")}
                                minHeight={rpx(520)}
                            />
                        }
                        renderItem={({ item }) => {
                            const installed = installedNames.has(normalizeName(item.name));
                            const selected = !!selectedIds[item.id];
                            const warning = isHttpUrl(item.url) || isNonJsUrl(item.url);
                            return (
                                <MarketPluginItem
                                    item={item}
                                    installed={installed}
                                    selected={selected}
                                    warning={warning}
                                    installing={installing}
                                    onToggle={() => toggleSelected(item)}
                                    onInstall={() => installItems([item])}
                                />
                            );
                        }}
                    />
                )}

                {selectedPlugins.length ? (
                    <View
                        style={[
                            styles.bottomBar,
                            {
                                backgroundColor: colors.surfacePrimary,
                                borderColor: colors.divider,
                                shadowColor: colors.shadow,
                            },
                        ]}>
                        <View style={styles.bottomInfo}>
                            <ThemeText fontSize="subTitle" fontWeight="semibold">
                                {installing
                                    ? t("pluginSetting.batchInstall.installing", {
                                        current: progress.current,
                                        total: progress.total,
                                    })
                                    : t("pluginSetting.market.selectedCount", {
                                        count: selectedPlugins.length,
                                    })}
                            </ThemeText>
                            <Pressable
                                hitSlop={spacing.sm}
                                disabled={installing}
                                onPress={selectAllVisible}>
                                <ThemeText
                                    fontSize="description"
                                    color={colors.primary}
                                    fontWeight="medium">
                                    {t("common.selectAll")}
                                </ThemeText>
                            </Pressable>
                        </View>
                        <View style={styles.bottomActions}>
                            <Button
                                type="secondary"
                                size="small"
                                text={t("common.cancel")}
                                disabled={installing}
                                onPress={() => setSelectedIds({})}
                            />
                            <Button
                                size="small"
                                text={t("pluginSetting.batchInstall.install")}
                                disabled={installing}
                                onPress={() => installItems(selectedPlugins)}
                                style={styles.installButton}
                            />
                        </View>
                    </View>
                ) : <></>}
            </HorizontalSafeAreaView>
        </>
    );
}

interface IMarketPluginItemProps {
    item: IMarketPlugin;
    installed: boolean;
    selected: boolean;
    warning: boolean;
    installing: boolean;
    onToggle: () => void;
    onInstall: () => void;
}

function MarketPluginItem(props: IMarketPluginItemProps) {
    const {
        item,
        installed,
        selected,
        warning,
        installing,
        onToggle,
        onInstall,
    } = props;
    const colors = useColors();
    const { t } = useI18N();
    const host = getHost(item.url);
    const selectedColor = Color(colors.primary).alpha(0.12).rgb().string();

    return (
        <Pressable
            disabled={installing}
            onPress={onToggle}
            style={({ pressed }) => [
                styles.item,
                {
                    backgroundColor: selected
                        ? selectedColor
                        : colors.surfacePrimary,
                    borderColor: selected
                        ? Color(colors.primary).alpha(0.34).rgb().string()
                        : colors.divider,
                    opacity: pressed ? 0.82 : 1,
                },
            ]}>
            <View
                style={[
                    styles.selectBox,
                    {
                        backgroundColor: selected || installed
                            ? colors.primary
                            : colors.surfaceSecondary,
                        borderColor: selected || installed
                            ? colors.primary
                            : colors.divider,
                    },
                ]}>
                <Icon
                    name={installed || selected ? "check" : "plus"}
                    size={rpx(24)}
                    color={installed || selected ? "#ffffff" : colors.textSecondary}
                />
            </View>
            <View style={styles.itemContent}>
                <View style={styles.itemTitleRow}>
                    <ThemeText
                        fontSize="content"
                        fontWeight="semibold"
                        numberOfLines={1}
                        style={styles.itemTitle}>
                        {item.name}
                    </ThemeText>
                    {installed ? (
                        <StatusTag
                            text={t("pluginSetting.market.installed")}
                            color={colors.primary}
                        />
                    ) : null}
                    {warning ? (
                        <StatusTag
                            text={
                                isHttpUrl(item.url)
                                    ? t("pluginSetting.market.httpTag")
                                    : t("pluginSetting.market.nonJsTag")
                            }
                            color={colors.textSecondary ?? colors.text}
                        />
                    ) : null}
                </View>
                <ThemeText
                    fontSize="description"
                    fontColor="textSecondary"
                    numberOfLines={1}
                    style={styles.hostText}>
                    {host}
                </ThemeText>
                <ThemeText
                    fontSize="description"
                    fontColor="textSecondary"
                    numberOfLines={1}>
                    {item.url}
                </ThemeText>
            </View>
            <Button
                type={installed ? "secondary" : "outline"}
                size="small"
                text={installed
                    ? t("pluginSetting.market.installed")
                    : t("pluginSetting.batchInstall.install")}
                disabled={installed || installing}
                onPress={event => {
                    event.stopPropagation?.();
                    onInstall();
                }}
                style={styles.itemButton}
            />
        </Pressable>
    );
}

function StatusTag(props: { text: string; color: string }) {
    const colors = useColors();
    return (
        <View
            style={[
                styles.statusTag,
                {
                    backgroundColor: Color(props.color).alpha(0.12).rgb().string(),
                    borderColor: Color(props.color).alpha(0.22).rgb().string(),
                },
            ]}>
            <ThemeText
                fontSize="description"
                color={props.color || colors.textSecondary}
                numberOfLines={1}>
                {props.text}
            </ThemeText>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        width: "100%",
        flex: 1,
    },
    toolbar: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
    },
    filterContent: {
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm,
    },
    filterChip: {
        height: rpx(54),
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.md,
        alignItems: "center",
        justifyContent: "center",
        marginRight: spacing.sm,
    },
    notice: {
        minHeight: rpx(72),
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    noticeText: {
        flex: 1,
        marginLeft: spacing.sm,
    },
    loadingList: {
        paddingTop: spacing.sm,
    },
    listContent: {
        paddingTop: spacing.sm,
        paddingBottom: rpx(160),
    },
    listWithBar: {
        paddingBottom: rpx(260),
    },
    item: {
        marginHorizontal: spacing.md,
        marginBottom: spacing.md,
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        padding: spacing.md,
        flexDirection: "row",
        alignItems: "center",
    },
    selectBox: {
        width: rpx(52),
        height: rpx(52),
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: "center",
        justifyContent: "center",
        marginRight: spacing.md,
    },
    itemContent: {
        flex: 1,
        minWidth: 0,
    },
    itemTitleRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    itemTitle: {
        flexShrink: 1,
        marginRight: spacing.sm,
    },
    hostText: {
        marginTop: spacing.xs,
        marginBottom: spacing.xs,
    },
    statusTag: {
        maxWidth: rpx(150),
        height: rpx(42),
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.sm,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: spacing.xs,
    },
    itemButton: {
        marginLeft: spacing.md,
        minWidth: rpx(104),
    },
    bottomBar: {
        position: "absolute",
        left: spacing.md,
        right: spacing.md,
        bottom: spacing.md,
        borderRadius: radius.xl,
        borderWidth: StyleSheet.hairlineWidth,
        padding: spacing.md,
        shadowOffset: { width: 0, height: rpx(4) },
        shadowOpacity: 0.14,
        shadowRadius: rpx(8),
        elevation: 8,
    },
    bottomInfo: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.md,
    },
    bottomActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
    },
    installButton: {
        marginLeft: spacing.sm,
        minWidth: rpx(156),
    },
});
