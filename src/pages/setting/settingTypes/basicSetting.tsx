import ColorBlock from "@/components/base/colorBlock";
import ListItem from "@/components/base/listItem";
import Paragraph from "@/components/base/paragraph";
import ThemeSwitch from "@/components/base/switch";
import ThemeText from "@/components/base/themeText";
import ParticleEffectSelector from "@/components/base/particleEffectSelector";
import { showDialog } from "@/components/dialogs/useDialog";
import { showPanel } from "@/components/panels/usePanel";
import { SortType } from "@/constants/commonConst.ts";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import Config, { useAppConfig } from "@/core/appConfig";
import { useI18N } from "@/core/i18n";
import useColors from "@/hooks/useColors";
import LyricUtil, {
    getStatusBarLyricConfig,
    NativeTextAlignment,
} from "@/native/lyricUtil";
import StorageAccess from "@/native/storageAccess";
import { AppConfigPropertyKey } from "@/types/core/config";
import { clearCache, getCacheSize, sizeFormatter } from "@/utils/fileUtils";
import { clearLog, getErrorLogContent } from "@/utils/log";
import { qualityKeys } from "@/utils/qualities";
import rpx from "@/utils/rpx";
import Toast from "@/utils/toast";
import Clipboard from "@react-native-clipboard/clipboard";
import Slider from "@react-native-community/slider";
import Color from "color";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    AppState,
    SectionList,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import type { ViewToken } from "react-native";
import { FlatList, ScrollView } from "react-native-gesture-handler";
import { requestNotificationPermission } from "@/utils/notificationPermission";

function createSwitch(
    title: string,
    changeKey: AppConfigPropertyKey,
    value: boolean,
    callback?: (newValue: boolean) => void,
) {
    const onPress = () => {
        if (callback) {
            callback(!value);
        } else {
            Config.setConfig(changeKey, !value);
        }
    };
    return {
        title,
        onPress,
        right: <ThemeSwitch value={value} onValueChange={onPress} />,
    };
}

const createRadio = function (
    title: string,
    changeKey: AppConfigPropertyKey,
    candidates: Array<string | number>,
    value: string | number,
    valueMap?: Record<string | number, string | number>,
    onChange?: (value: string | number) => void,
) {
    const onPress = () => {
        showDialog("RadioDialog", {
            title,
            content: valueMap
                ? candidates.map(_ => ({
                    label: valueMap[_] as string,
                    value: _,
                }))
                : candidates,
            onOk(val) {
                Config.setConfig(changeKey, val);
                onChange?.(val);
            },
        });
    };
    return {
        title,
        right: (
            <ThemeText style={styles.centerText}>
                {valueMap ? valueMap[value] : value}
            </ThemeText>
        ),
        onPress,
    };
};

function useCacheSize() {
    const [cacheSize, setCacheSize] = useState({
        music: 0,
        lyric: 0,
        image: 0,
    });

    const refreshCacheSize = useCallback(async () => {
        try {
            const [musicCache, lyricCache, imageCache] = await Promise.all([
                getCacheSize("music"),
                getCacheSize("lyric"),
                getCacheSize("image"),
            ]);
            setCacheSize({
                music: musicCache,
                lyric: lyricCache,
                image: imageCache,
            });
        } catch {
            // 缓存容量读取失败不应影响设置页的其它操作。
        }
    }, []);

    return [cacheSize, refreshCacheSize] as const;
}

type SectionTitleViewToken = ViewToken & {
    section?: {
        title?: string;
    };
};

export default function BasicSetting() {
    const colors = useColors();

    const autoPlayWhenAppStart = useAppConfig("basic.autoPlayWhenAppStart");
    const useCelluarNetworkPlay = useAppConfig("basic.useCelluarNetworkPlay");
    const useCelluarNetworkDownload = useAppConfig("basic.useCelluarNetworkDownload");
    const maxDownload = useAppConfig("basic.maxDownload");
    const clickMusicInSearch = useAppConfig("basic.clickMusicInSearch");
    const clickMusicInAlbum = useAppConfig("basic.clickMusicInAlbum");
    const downloadDirectoryUri = useAppConfig("basic.downloadDirectoryUri");
    const downloadDirectoryName = useAppConfig("basic.downloadDirectoryName");
    const legacyDownloadPath = useAppConfig("basic.legacyDownloadPath");
    const notInterrupt = useAppConfig("basic.notInterrupt");
    const tempRemoteDuck = useAppConfig("basic.tempRemoteDuck");
    const tempRemoteDuckVolume = useAppConfig("basic.tempRemoteDuckVolume");
    const autoStopWhenError = useAppConfig("basic.autoStopWhenError");
    const maxCacheSize = useAppConfig("basic.maxCacheSize");
    const defaultPlayQuality = useAppConfig("basic.defaultPlayQuality");
    const playQualityOrder = useAppConfig("basic.playQualityOrder");
    const defaultDownloadQuality = useAppConfig("basic.defaultDownloadQuality");
    const downloadQualityOrder = useAppConfig("basic.downloadQualityOrder");
    const musicDetailDefault = useAppConfig("basic.musicDetailDefault");
    const musicDetailAwake = useAppConfig("basic.musicDetailAwake");
    const maxHistoryLen = useAppConfig("basic.maxHistoryLen");
    const autoUpdatePlugin = useAppConfig("basic.autoUpdatePlugin");
    const notCheckPluginVersion = useAppConfig("basic.notCheckPluginVersion");
    const lazyLoadPlugin = useAppConfig("basic.lazyLoadPlugin");
    const associateLyricType = useAppConfig("basic.associateLyricType");
    const showExitOnNotification = useAppConfig("basic.showExitOnNotification");
    const musicOrderInLocalSheet = useAppConfig("basic.musicOrderInLocalSheet");
    const tryChangeSourceWhenPlayFail = useAppConfig("basic.tryChangeSourceWhenPlayFail");

    const { t } = useI18N();

    const debugEnableErrorLog = useAppConfig("debug.errorLog");
    const debugEnableTraceLog = useAppConfig("debug.traceLog");
    const debugEnableDevLog = useAppConfig("debug.devLog");


    const [cacheSize, refreshCacheSize] = useCacheSize();
    const [activeSection, setActiveSection] = useState(0);

    const sectionListRef = useRef<SectionList | null>(null);
    const headerListRef = useRef<FlatList<string> | null>(null);
    const sectionTitleIndexRef = useRef<Record<string, number>>({});
    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 1,
    }).current;
    const onViewableItemsChanged = useRef((info: {
        viewableItems: SectionTitleViewToken[];
    }) => {
        const firstVisibleSection = info.viewableItems.find(
            item => item.isViewable && item.section?.title,
        )?.section;
        const nextSectionIndex = firstVisibleSection?.title
            ? sectionTitleIndexRef.current[firstVisibleSection.title]
            : undefined;

        if (nextSectionIndex !== undefined) {
            setActiveSection(current =>
                current === nextSectionIndex ? current : nextSectionIndex,
            );
        }
    }).current;

    useEffect(() => {
        refreshCacheSize();
    }, [refreshCacheSize]);

    useEffect(() => {
        if (activeSection === 0) {
            headerListRef.current?.scrollToOffset({
                offset: 0,
                animated: true,
            });
            return;
        }

        headerListRef.current?.scrollToIndex({
            index: activeSection,
            animated: true,
            viewPosition: 0.5,
        });
    }, [activeSection]);

    const basicOptions = [
        {
            title: t("particleEffect"),
            data: [{ key: "particleEffect" }],
            footer: null,
        },
        {
            title: t("basicSettings.common"),
            data: [
                createRadio(
                    t("basicSettings.maxHistoryLength"),
                    "basic.maxHistoryLen",
                    [20, 50, 100, 200, 500],
                    maxHistoryLen ?? 50,
                ),
                createRadio(
                    t("basicSettings.musicDetailDefault"),
                    "basic.musicDetailDefault",
                    ["album", "lyric"],
                    musicDetailDefault ?? "album",
                    {
                        album: t("basicSettings.musicDetailDefault.album"),
                        lyric: t("basicSettings.musicDetailDefault.lyric"),
                    },
                ),
                createSwitch(
                    t("basicSettings.musicDetailAwake"),
                    "basic.musicDetailAwake",
                    musicDetailAwake ?? false,
                ),
                createRadio(
                    t("basicSettings.associateLyricType"),
                    "basic.associateLyricType",
                    ["input", "search"],
                    associateLyricType ?? "search",
                    {
                        input: t("basicSettings.associateLyricType.input"),
                        search: t("basicSettings.associateLyricType.search"),
                    },
                ),
                createSwitch(
                    t("basicSettings.showExitOnNotification"),
                    "basic.showExitOnNotification",
                    showExitOnNotification ?? false,
                    async newValue => {
                        if (newValue && !(await requestNotificationPermission())) {
                            Toast.warn(t("toast.notificationPermissionDenied"));
                            return;
                        }
                        Config.setConfig("basic.showExitOnNotification", newValue);
                    },
                ),
            ],
        },
        {
            title: t("basicSettings.sheetAndAlbum"),
            data: [
                createRadio(
                    t("basicSettings.clickMusicInSearch"),
                    "basic.clickMusicInSearch",
                    ["playMusic", "playMusicAndReplace"],
                    clickMusicInSearch ?? "playMusic",
                    {
                        playMusic: t("basicSettings.clickMusicInSearch.playMusic"),
                        playMusicAndReplace: t("basicSettings.clickMusicInSearch.playMusicAndReplace"),
                    },
                ),
                createRadio(
                    t("basicSettings.clickMusicInAlbum"),
                    "basic.clickMusicInAlbum",
                    ["playMusic", "playAlbum"],
                    clickMusicInAlbum ?? "playAlbum",
                    {
                        playMusic: t("basicSettings.clickMusicInAlbum.playMusic"),
                        playAlbum: t("basicSettings.clickMusicInAlbum.playAlbum"),
                    },
                ),
                createRadio(
                    t("basicSettings.musicDetailDefault"),
                    "basic.musicDetailDefault",
                    ["album", "lyric"],
                    musicDetailDefault ?? "album",
                    {
                        album: t("basicSettings.musicDetailDefault.album"),
                        lyric: t("basicSettings.musicDetailDefault.lyric"),
                    },
                ),
                createRadio(
                    t("basicSettings.musicOrderInLocalSheet"),
                    "basic.musicOrderInLocalSheet",
                    [
                        SortType.Title,
                        SortType.Artist,
                        SortType.Album,
                        SortType.Newest,
                        SortType.Oldest,
                    ],
                    musicOrderInLocalSheet ?? "end",
                    {
                        [SortType.Title]: t("basicSettings.musicOrderInLocalSheet.title"),
                        [SortType.Artist]: t("basicSettings.musicOrderInLocalSheet.artist"),
                        [SortType.Album]: t("basicSettings.musicOrderInLocalSheet.album"),
                        [SortType.Newest]: t("basicSettings.musicOrderInLocalSheet.newest"),
                        [SortType.Oldest]: t("basicSettings.musicOrderInLocalSheet.oldest"),
                    },
                ),
            ],
        },
        {
            title: t("basicSettings.plugin"),
            data: [
                createSwitch(
                    t("basicSettings.autoUpdatePlugin"),
                    "basic.autoUpdatePlugin",
                    autoUpdatePlugin ?? false,
                ),
                createSwitch(
                    t("basicSettings.notCheckPluginVersion"),
                    "basic.notCheckPluginVersion",
                    notCheckPluginVersion ?? false,
                ),
                createSwitch(
                    t("basicSettings.lazyLoadPlugin"),
                    "basic.lazyLoadPlugin",
                    lazyLoadPlugin ?? false,
                ),
            ],
        },
        {
            title: t("basicSettings.playback"),
            data: [
                createSwitch(
                    t("basicSettings.notInterrupt"),
                    "basic.notInterrupt",
                    notInterrupt ?? false,
                ),
                createSwitch(
                    t("basicSettings.autoPlayWhenAppStart"),
                    "basic.autoPlayWhenAppStart",
                    autoPlayWhenAppStart ?? false,
                ),
                createSwitch(
                    t("basicSettings.tryChangeSourceWhenPlayFail"),
                    "basic.tryChangeSourceWhenPlayFail",
                    tryChangeSourceWhenPlayFail ?? false,
                ),
                createSwitch(
                    t("basicSettings.autoStopWhenError"),
                    "basic.autoStopWhenError",
                    autoStopWhenError ?? false,
                ),
                createRadio(
                    t("basicSettings.tempRemoteDuck"),
                    "basic.tempRemoteDuck",
                    ["pause", "lowerVolume"],
                    tempRemoteDuck ?? "pause",
                    {
                        pause: t("basicSettings.tempRemoteDuck.pause"),
                        "lowerVolume": t("basicSettings.tempRemoteDuck.lowerVolume"),
                    }
                ),
                ...(tempRemoteDuck === "lowerVolume" ? [
                    createRadio(
                        t("basicSettings.tempRemoteDuck.volumeDecreaseLevel"),
                        "basic.tempRemoteDuckVolume",
                        [0.3, 0.5, 0.8],
                        tempRemoteDuckVolume ?? 0.5,
                        {
                            0.3: "30%",
                            0.5: "50%",
                            0.8: "80%",
                        }
                    ),
                ] : []),
                createRadio(
                    t("basicSettings.defaultPlayQuality"),
                    "basic.defaultPlayQuality",
                    qualityKeys,
                    defaultPlayQuality ?? "standard",
                    {
                        low: t("musicQuality.low"),
                        standard: t("musicQuality.standard"),
                        high: t("musicQuality.high"),
                        super: t("musicQuality.super"),
                    },
                ),
                createRadio(
                    t("basicSettings.playQualityOrder"),
                    "basic.playQualityOrder",
                    ["asc", "desc"],
                    playQualityOrder ?? "asc",
                    {
                        asc: t("basicSettings.playQualityOrder.asc"),
                        desc: t("basicSettings.playQualityOrder.desc"),
                    },
                ),
            ],
        },
        {
            title: t("basicSettings.download"),
            data: [
                {
                    title: t("basicSettings.downloadPath"),
                    right: (
                        <ThemeText
                            fontSize="subTitle"
                            style={styles.centerText}
                            numberOfLines={3}>
                            {downloadDirectoryName ??
                                (legacyDownloadPath
                                    ? t("basicSettings.downloadPathNeedsReselection", {
                                        path: legacyDownloadPath,
                                    })
                                    : t("basicSettings.defaultDownloadPath"))}
                        </ThemeText>
                    ),
                    async onPress() {
                        try {
                            const directory = await StorageAccess.selectDirectory(
                                downloadDirectoryUri,
                            );
                            if (!directory) return;
                            Config.setConfig(
                                "basic.downloadDirectoryUri",
                                directory.uri,
                            );
                            Config.setConfig(
                                "basic.downloadDirectoryName",
                                directory.name ?? directory.uri,
                            );
                            Config.setConfig("basic.legacyDownloadPath", undefined);
                            Config.setConfig("basic.downloadPath", undefined);
                        } catch {
                            Toast.warn(t("toast.folderNotExistOrNoPermission"));
                        }
                    },
                },
                createRadio(
                    t("basicSettings.maxDownload"),
                    "basic.maxDownload",
                    [1, 3, 5, 7],
                    maxDownload ?? 3,
                ),
                createRadio(
                    t("basicSettings.defaultDownloadQuality"),
                    "basic.defaultDownloadQuality",
                    qualityKeys,
                    defaultDownloadQuality ?? "standard",
                    {
                        low: t("musicQuality.low"),
                        standard: t("musicQuality.standard"),
                        high: t("musicQuality.high"),
                        super: t("musicQuality.super"),
                    },
                ),
                createRadio(
                    t("basicSettings.downloadQualityOrder"),
                    "basic.downloadQualityOrder",
                    ["asc", "desc"],
                    downloadQualityOrder ?? "asc",
                    {
                        asc: t("basicSettings.downloadQualityOrder.asc"),
                        desc: t("basicSettings.downloadQualityOrder.desc"),
                    },
                ),
            ],
        },
        {
            title: t("basicSettings.network"),
            data: [
                createSwitch(
                    t("basicSettings.useCelluarNetworkPlay"),
                    "basic.useCelluarNetworkPlay",
                    useCelluarNetworkPlay ?? false,
                ),
                createSwitch(
                    t("basicSettings.useCelluarNetworkDownload"),
                    "basic.useCelluarNetworkDownload",
                    useCelluarNetworkDownload ?? false,
                ),
            ],
        },
        {
            title: t("basicSettings.lyric"),
            data: [{ key: "lyricSetting" }],
            footer: null,
        },
        {
            title: t("basicSettings.cache"),
            data: [
                {
                    title: t("basicSettings.cache.musicCacheLimit"),
                    right: (
                        <ThemeText style={styles.centerText}>
                            {maxCacheSize
                                ? sizeFormatter(maxCacheSize)
                                : "512M"}
                        </ThemeText>
                    ),
                    onPress() {
                        showPanel("SimpleInput", {
                            title: t("dialog.setCacheTitle"),
                            placeholder: t("dialog.setCachePlaceholder"),
                            onOk(text, closePanel) {
                                let val = parseInt(text, 10);
                                if (val < 100) {
                                    val = 100;
                                } else if (val > 8192) {
                                    val = 8192;
                                }
                                if (val >= 100 && val <= 8192) {
                                    Config.setConfig(
                                        "basic.maxCacheSize",
                                        val * 1024 * 1024,
                                    );
                                    closePanel();
                                    Toast.success(t("toast.cacheSetSuccess"));
                                }
                            },
                        });
                    },
                },

                {
                    title: t("basicSettings.cache.clearMusicCache"),
                    right: (
                        <ThemeText style={styles.centerText}>
                            {sizeFormatter(cacheSize.music)}
                        </ThemeText>
                    ),
                    onPress() {
                        showDialog("SimpleDialog", {
                            title: t("dialog.clearMusicCacheTitle"),
                            content: t("dialog.clearMusicCacheContent"),
                            async onOk() {
                                await clearCache("music");
                                Toast.success(t("toast.musicCacheCleared"));
                                await refreshCacheSize();
                            },
                        });
                    },
                },
                {
                    title: t("basicSettings.cache.clearLyricCache"),
                    right: (
                        <ThemeText style={styles.centerText}>
                            {sizeFormatter(cacheSize.lyric)}
                        </ThemeText>
                    ),
                    onPress() {
                        showDialog("SimpleDialog", {
                            title: t("dialog.clearLyricCacheTitle"),
                            content: t("dialog.clearLyricCacheContent"),
                            async onOk() {
                                await clearCache("lyric");
                                Toast.success(t("toast.lyricCacheCleared"));
                                await refreshCacheSize();
                            },
                        });
                    },
                },
                {
                    title: t("basicSettings.cache.clearImageCache"),
                    right: (
                        <ThemeText style={styles.centerText}>
                            {sizeFormatter(cacheSize.image)}
                        </ThemeText>
                    ),
                    onPress() {
                        showDialog("SimpleDialog", {
                            title: t("dialog.clearImageCacheTitle"),
                            content: t("dialog.clearImageCacheContent"),
                            async onOk() {
                                await clearCache("image");
                                Toast.success(t("toast.imageCacheCleared"));
                                await refreshCacheSize();
                            },
                        });
                    },
                },
            ],
        },
        {
            title: t("basicSettings.developer"),
            data: [
                createSwitch(
                    t("basicSettings.developer.errorLog"),
                    "debug.errorLog",
                    debugEnableErrorLog ?? false,
                ),
                createSwitch(
                    t("basicSettings.developer.traceLog"),
                    "debug.traceLog",
                    debugEnableTraceLog ?? false,
                ),
                createSwitch(
                    t("basicSettings.developer.devLog"),
                    "debug.devLog",
                    debugEnableDevLog ?? false,
                ),
                {
                    title: t("basicSettings.developer.viewErrorLog"),
                    right: undefined,
                    async onPress() {
                        try {
                            const errorLogContent = await getErrorLogContent();
                            showDialog("SimpleDialog", {
                                title: t("dialog.errorLogTitle"),
                                content: (
                                    <ScrollView>
                                        <Paragraph>
                                            {errorLogContent || t("dialog.errorLogNoRecord")}
                                        </Paragraph>
                                    </ScrollView>
                                ),
                                cancelText: t("dialog.errorLogKnow"),
                                okText: t("dialog.errorLogCopy"),
                                onOk() {
                                    Clipboard.setString(errorLogContent);
                                    Toast.success(t("toast.copiedToClipboard"));
                                },
                            });
                        } catch (error: any) {
                            Toast.warn(
                                t("toast.unknownError", {
                                    reason: error?.message ?? error,
                                }),
                            );
                        }
                    },
                },
                {
                    title: t("basicSettings.developer.clearLog"),
                    right: undefined,
                    async onPress() {
                        try {
                            await clearLog();
                            Toast.success(t("toast.logCleared"));
                        } catch (error: any) {
                            Toast.warn(
                                t("toast.unknownError", {
                                    reason: error?.message ?? error,
                                }),
                            );
                        }
                    },
                },
            ],
        },
    ];
    sectionTitleIndexRef.current = basicOptions.reduce<Record<string, number>>(
        (indexMap, section, index) => {
            indexMap[section.title] = index;
            return indexMap;
        },
        {},
    );

    return (
        <View style={styles.wrapper}>
            <FlatList
                ref={headerListRef}
                style={styles.headerContainer}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.headerContentContainer}
                horizontal
                data={basicOptions.map(it => it.title)}
                onScrollToIndexFailed={({ index }) => {
                    headerListRef.current?.scrollToOffset({
                        offset: Math.max(0, index * rpx(96)),
                        animated: true,
                    });
                }}
                renderItem={({ item, index }) => (
                    <TouchableOpacity
                        onPress={() => {
                            setActiveSection(index);
                            try {
                                sectionListRef.current?.scrollToLocation({
                                    sectionIndex: index,
                                    itemIndex: 0,
                                    viewPosition: 0,
                                });
                            } catch { }
                        }}
                        activeOpacity={0.7}
                        style={[
                            styles.headerItemStyle,
                            {
                                backgroundColor: activeSection === index
                                    ? Color(colors.primary).alpha(0.14).rgb().string()
                                    : colors.surfaceSecondary,
                                borderColor: activeSection === index
                                    ? Color(colors.primary).alpha(0.36).rgb().string()
                                    : colors.divider,
                            },
                        ]}>
                        <ThemeText
                            fontWeight={activeSection === index ? "bold" : "medium"}
                            fontColor={activeSection === index ? "primary" : "text"}>
                            {item}
                        </ThemeText>
                    </TouchableOpacity>
                )}
            />
            <SectionList
                sections={basicOptions}
                stickySectionHeadersEnabled={false}
                showsVerticalScrollIndicator={false}
                viewabilityConfig={viewabilityConfig}
                onViewableItemsChanged={onViewableItemsChanged}
                contentContainerStyle={styles.listContentContainer}
                renderSectionHeader={({ section }) => (
                    <View style={styles.sectionHeader}>
                        <View
                            style={[
                                styles.sectionDot,
                                {
                                    backgroundColor: Color(colors.primary).alpha(0.72).rgb().string(),
                                },
                            ]}
                        />
                        <ThemeText
                            fontSize="subTitle"
                            fontWeight="bold">
                            {section.title}
                        </ThemeText>
                    </View>
                )}
                ref={sectionListRef}
                renderSectionFooter={({ section }) => {
                    return section.footer ?? null;
                }}
                renderItem={({ item, index, section }) => {
                    if (item.key === "particleEffect") {
                        return <ParticleEffectSelector />;
                    }
                    if (item.key === "lyricSetting") {
                        return <LyricSetting />;
                    }
                    const Right = item.right;
                    const isFirst = index === 0;
                    const isLast = index === section.data.length - 1 && !section.footer;

                    return (
                        <View style={[
                            styles.cardItemWrapper,
                            {
                                backgroundColor: colors.surfacePrimary,
                                borderColor: colors.divider,
                            },
                            isFirst && styles.cardItemFirst,
                            isLast && styles.cardItemLast,
                            !isLast && styles.cardItemDivider,
                        ]}>
                            <ListItem
                                withHorizontalPadding
                                heightType="small"
                                onPress={item.onPress}>
                                <ListItem.Content title={item.title} />
                                {Right}
                            </ListItem>
                        </View>
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        width: "100%",
        paddingBottom: spacing.md,
        flex: 1,
    },
    centerText: {
        textAlignVertical: "center",
        maxWidth: rpx(400),
    },
    sectionHeader: {
        paddingHorizontal: spacing.md,
        height: spacing.xxxl,
        flexDirection: "row",
        alignItems: "center",
        marginTop: spacing.xl,
    },
    headerContainer: {
        height: rpx(88),
    },
    headerContentContainer: {
        height: rpx(88),
        alignItems: "center",
        paddingHorizontal: spacing.md,
    },
    headerItemStyle: {
        paddingHorizontal: spacing.lg,
        height: rpx(56),
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        marginRight: spacing.sm,
        justifyContent: "center",
        alignItems: "center",
    },
    listContentContainer: {
        paddingBottom: spacing.xxxl,
    },
    cardItemWrapper: {
        marginHorizontal: spacing.md,
        borderLeftWidth: StyleSheet.hairlineWidth,
        borderRightWidth: StyleSheet.hairlineWidth,
    },
    cardItemFirst: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        overflow: "hidden",
    },
    cardItemLast: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomLeftRadius: radius.xl,
        borderBottomRightRadius: radius.xl,
        overflow: "hidden",
    },
    cardItemDivider: {
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    sectionDot: {
        width: rpx(12),
        height: rpx(12),
        borderRadius: radius.pill,
        marginRight: spacing.sm,
    },
});

function LyricSetting() {
    const showStatusBarLyric = useAppConfig("lyric.showStatusBarLyric");
    const topPercent = useAppConfig("lyric.topPercent");
    const leftPercent = useAppConfig("lyric.leftPercent");
    const align = useAppConfig("lyric.align");
    const color = useAppConfig("lyric.color");
    const backgroundColor = useAppConfig("lyric.backgroundColor");
    const widthPercent = useAppConfig("lyric.widthPercent");
    const fontSize = useAppConfig("lyric.fontSize");
    const locked = useAppConfig("lyric.locked");
    const lyricMode = useAppConfig("lyric.mode");
    const lyricStyle = useAppConfig("lyric.style");
    const keepAlive = useAppConfig("lyric.keepAlive");
    const emptyBehavior = useAppConfig("lyric.emptyBehavior");
    const enableAutoSearchLyric = useAppConfig("lyric.autoSearchLyric");

    const colors = useColors();

    const { t } = useI18N();
    const pendingOpenStatusBarLyricRef = useRef(false);
    const lyricRequestAppStateRef = useRef(AppState.currentState);
    const [desktopLyricBusy, setDesktopLyricBusy] = useState(false);

    useEffect(() => {
        const subscription = AppState.addEventListener("change", async state => {
            if (
                !lyricRequestAppStateRef.current.match(/inactive|background/) ||
                state !== "active" ||
                !pendingOpenStatusBarLyricRef.current
            ) {
                lyricRequestAppStateRef.current = state;
                return;
            }

            pendingOpenStatusBarLyricRef.current = false;
            lyricRequestAppStateRef.current = state;
            try {
                const hasPermission =
                    await LyricUtil.checkSystemAlertPermission();
                if (hasPermission) {
                    await LyricUtil.showStatusBarLyric(
                        "CatMusicFree",
                        getStatusBarLyricConfig(),
                    );
                    Config.setConfig("lyric.showStatusBarLyric", true);
                    Toast.success(t("toast.settingSuccess"));
                } else {
                    Toast.warn(t("toast.noFloatWindowPermission"));
                }
            } catch (error: any) {
                Toast.warn(error?.message ?? t("toast.noFloatWindowPermission"));
            } finally {
                setDesktopLyricBusy(false);
            }
        });

        return () => subscription.remove();
    }, [t]);

    const autoSearchLyric = createSwitch(
        t("basicSettings.lyric.autoSearchLyric"),
        "lyric.autoSearchLyric",
        enableAutoSearchLyric ?? false,
    );

    const openStatusBarLyric = createSwitch(
        t("basicSettings.lyric.showStatusBarLyric"),
        "lyric.showStatusBarLyric",
        showStatusBarLyric ?? false,
        async newValue => {
            if (desktopLyricBusy) {
                return;
            }

            setDesktopLyricBusy(true);
            try {
                if (newValue) {
                    if (!(await requestNotificationPermission())) {
                        Toast.warn(t("toast.notificationPermissionDenied"));
                        return;
                    }
                    const hasPermission =
                        await LyricUtil.checkSystemAlertPermission();

                    if (hasPermission) {
                        await LyricUtil.showStatusBarLyric(
                            "CatMusicFree",
                            getStatusBarLyricConfig(),
                        );
                        Config.setConfig("lyric.showStatusBarLyric", true);
                        Toast.success(t("toast.settingSuccess"));
                    } else {
                        pendingOpenStatusBarLyricRef.current = true;
                        await LyricUtil.requestSystemAlertPermission();
                        return;
                    }
                } else {
                    await LyricUtil.hideStatusBarLyric();
                    Config.setConfig("lyric.showStatusBarLyric", false);
                    Toast.success(t("toast.settingSuccess"));
                }
            } catch (error: any) {
                Toast.warn(error?.message ?? t("toast.noFloatWindowPermission"));
            } finally {
                if (!pendingOpenStatusBarLyricRef.current) {
                    setDesktopLyricBusy(false);
                }
            }
        },
    );

    const lockStatusBarLyric = createSwitch(
        t("basicSettings.lyric.locked"),
        "lyric.locked",
        locked ?? true,
        newVal => {
            Config.setConfig("lyric.locked", newVal);
            if (showStatusBarLyric) {
                LyricUtil.setStatusBarLyricLocked(newVal);
            }
        },
    );

    const keepAliveStatusBarLyric = createSwitch(
        t("basicSettings.lyric.keepAlive"),
        "lyric.keepAlive",
        keepAlive ?? true,
        newVal => {
            Config.setConfig("lyric.keepAlive", newVal);
            if (showStatusBarLyric) {
                LyricUtil.setStatusBarLyricKeepAlive(newVal);
            }
        },
    );

    const emptyBehaviorStatusBarLyric = createRadio(
        t("basicSettings.lyric.emptyBehavior"),
        "lyric.emptyBehavior",
        ["track", "hide", "app"],
        emptyBehavior ?? "track",
        {
            track: t("basicSettings.lyric.emptyBehavior.track"),
            hide: t("basicSettings.lyric.emptyBehavior.hide"),
            app: t("basicSettings.lyric.emptyBehavior.app"),
        },
        value => {
            if (showStatusBarLyric) {
                LyricUtil.setStatusBarLyricEmptyBehavior(value as any, "CatMusicFree");
            }
        },
    );

    const modeStatusBarLyric = createRadio(
        t("basicSettings.lyric.mode"),
        "lyric.mode",
        ["single", "double"],
        lyricMode ?? "double",
        {
            single: t("basicSettings.lyric.mode.single"),
            double: t("basicSettings.lyric.mode.double"),
        },
        value => {
            if (showStatusBarLyric) {
                LyricUtil.setStatusBarLyricMode(value as any);
            }
        },
    );

    const styleStatusBarLyric = createRadio(
        t("basicSettings.lyric.style"),
        "lyric.style",
        ["glass", "neon", "plain", "dark"],
        lyricStyle ?? "glass",
        {
            glass: t("basicSettings.lyric.style.glass"),
            neon: t("basicSettings.lyric.style.neon"),
            plain: t("basicSettings.lyric.style.plain"),
            dark: t("basicSettings.lyric.style.dark"),
        },
        value => {
            if (showStatusBarLyric) {
                LyricUtil.setStatusBarLyricStyle(value as any);
            }
        },
    );

    const alignStatusBarLyric = createRadio(
        t("basicSettings.lyric.align"),
        "lyric.align",
        [
            NativeTextAlignment.LEFT,
            NativeTextAlignment.CENTER,
            NativeTextAlignment.RIGHT,
        ],
        align ?? NativeTextAlignment.CENTER,
        {
            [NativeTextAlignment.LEFT]: t("basicSettings.lyric.align.left"),
            [NativeTextAlignment.CENTER]: t("basicSettings.lyric.align.center"),
            [NativeTextAlignment.RIGHT]: t("basicSettings.lyric.align.right"),
        },
        newVal => {
            if (showStatusBarLyric) {
                LyricUtil.setStatusBarLyricAlign(newVal as any);
            }
        },
    );

    return (
        <View style={[
            lyricStyles.wrapper,
            {
                backgroundColor: colors.surfacePrimary,
                borderColor: colors.divider,
            },
        ]}>
            <ListItem
                withHorizontalPadding
                heightType="small"
                onPress={autoSearchLyric.onPress}>
                <ListItem.Content title={autoSearchLyric.title} />
                {autoSearchLyric.right}
            </ListItem>
            <ListItem
                withHorizontalPadding
                heightType="small"
                disabled={desktopLyricBusy}
                onPress={openStatusBarLyric.onPress}>
                <ListItem.Content title={openStatusBarLyric.title} />
                {desktopLyricBusy ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                    openStatusBarLyric.right
                )}
            </ListItem>
            <ListItem
                withHorizontalPadding
                heightType="small"
                onPress={lockStatusBarLyric.onPress}>
                <ListItem.Content title={lockStatusBarLyric.title} />
                {lockStatusBarLyric.right}
            </ListItem>
            <ListItem
                withHorizontalPadding
                heightType="small"
                onPress={keepAliveStatusBarLyric.onPress}>
                <ListItem.Content title={keepAliveStatusBarLyric.title} />
                {keepAliveStatusBarLyric.right}
            </ListItem>
            <ListItem
                withHorizontalPadding
                heightType="small"
                onPress={modeStatusBarLyric.onPress}>
                <ListItem.Content title={modeStatusBarLyric.title} />
                {modeStatusBarLyric.right}
            </ListItem>
            <ListItem
                withHorizontalPadding
                heightType="small"
                onPress={emptyBehaviorStatusBarLyric.onPress}>
                <ListItem.Content title={emptyBehaviorStatusBarLyric.title} />
                {emptyBehaviorStatusBarLyric.right}
            </ListItem>
            <ListItem
                withHorizontalPadding
                heightType="small"
                onPress={styleStatusBarLyric.onPress}>
                <ListItem.Content title={styleStatusBarLyric.title} />
                {styleStatusBarLyric.right}
            </ListItem>
            <ListItem
                withHorizontalPadding
                heightType="small"
                onPress={() => {
                    const nextLeft = 0.1;
                    const nextTop = 0.08;
                    Config.setConfig("lyric.leftPercent", nextLeft);
                    Config.setConfig("lyric.topPercent", nextTop);
                    if (showStatusBarLyric) {
                        LyricUtil.setStatusBarLyricLeft(nextLeft);
                        LyricUtil.setStatusBarLyricTop(nextTop);
                    }
                }}>
                <ListItem.Content title={t("basicSettings.lyric.resetPosition")} />
            </ListItem>
            <ListItem
                withHorizontalPadding
                heightType="small"
                onPress={() => {
                    if (showStatusBarLyric) {
                        LyricUtil.setStatusBarLyricText(
                            "桌面歌词预览\nDesktop lyric preview",
                        );
                    } else {
                        Toast.warn(t("basicSettings.lyric.previewToast"));
                    }
                }}>
                <ListItem.Content title={t("basicSettings.lyric.previewText")} />
            </ListItem>
            <View style={lyricStyles.sliderContainer}>
                <ThemeText>{t("basicSettings.lyric.leftRightDistance")}</ThemeText>
                <Slider
                    style={lyricStyles.slider}
                    minimumTrackTintColor={colors.primary}
                    maximumTrackTintColor={colors.text ?? "#999999"}
                    thumbTintColor={colors.primary}
                    minimumValue={0}
                    step={0.01}
                    value={leftPercent ?? 0.5}
                    maximumValue={1}
                    onValueChange={val => {
                        if (showStatusBarLyric) {
                            LyricUtil.setStatusBarLyricLeft(val);
                        }
                    }}
                    onSlidingComplete={val => {
                        Config.setConfig("lyric.leftPercent", val);
                    }}
                />
            </View>
            <View style={lyricStyles.sliderContainer}>
                <ThemeText>{t("basicSettings.lyric.topBottomDistance")}</ThemeText>
                <Slider
                    style={lyricStyles.slider}
                    minimumTrackTintColor={colors.primary}
                    maximumTrackTintColor={colors.text ?? "#999999"}
                    thumbTintColor={colors.primary}
                    minimumValue={0}
                    value={topPercent ?? 0}
                    step={0.01}
                    maximumValue={1}
                    onValueChange={val => {
                        if (showStatusBarLyric) {
                            LyricUtil.setStatusBarLyricTop(val);
                        }
                    }}
                    onSlidingComplete={val => {
                        Config.setConfig("lyric.topPercent", val);
                    }}
                />
            </View>
            <View style={lyricStyles.sliderContainer}>
                <ThemeText>{t("basicSettings.lyric.width")}</ThemeText>
                <Slider
                    style={lyricStyles.slider}
                    minimumTrackTintColor={colors.primary}
                    maximumTrackTintColor={colors.text ?? "#999999"}
                    thumbTintColor={colors.primary}
                    minimumValue={0}
                    step={0.01}
                    value={widthPercent ?? 0.5}
                    maximumValue={1}
                    onValueChange={val => {
                        if (showStatusBarLyric) {
                            LyricUtil.setStatusBarLyricWidth(val);
                        }
                    }}
                    onSlidingComplete={val => {
                        Config.setConfig("lyric.widthPercent", val);
                    }}
                />
            </View>
            <View style={lyricStyles.sliderContainer}>
                <ThemeText>{t("basicSettings.lyric.fontSize")}</ThemeText>
                <Slider
                    style={lyricStyles.slider}
                    minimumTrackTintColor={colors.primary}
                    maximumTrackTintColor={colors.text ?? "#999999"}
                    thumbTintColor={colors.primary}
                    minimumValue={Math.round(rpx(18))}
                    step={0.5}
                    maximumValue={Math.round(rpx(56))}
                    value={fontSize ?? Math.round(rpx(24))}
                    onValueChange={val => {
                        if (showStatusBarLyric) {
                            LyricUtil.setStatusBarLyricFontSize(val);
                        }
                    }}
                    onSlidingComplete={val => {
                        Config.setConfig("lyric.fontSize", val);
                    }}
                />
            </View>
            <ListItem
                withHorizontalPadding
                heightType="small"
                onPress={alignStatusBarLyric.onPress}>
                <ListItem.Content title={alignStatusBarLyric.title} />
                {alignStatusBarLyric.right}
            </ListItem>
            <ListItem
                withHorizontalPadding
                heightType="small"
                onPress={() => {
                    showPanel("ColorPicker", {
                        closePanelWhenSelected: true,
                        defaultColor: color ?? "transparent",
                        onSelected(selectedColor) {
                            if (showStatusBarLyric) {
                                const colorStr = selectedColor.hexa();
                                LyricUtil.setStatusBarColors(colorStr, null);
                                Config.setConfig("lyric.color", colorStr);
                            }
                        },
                    });
                }}>
                <ListItem.Content title={t("basicSettings.lyric.textColor")} />
                <ColorBlock color={color ?? "#FFE9D2FF"} />
            </ListItem>
            <ListItem
                withHorizontalPadding
                heightType="small"
                onPress={() => {
                    showPanel("ColorPicker", {
                        closePanelWhenSelected: true,
                        defaultColor:
                            backgroundColor ?? "transparent",
                        onSelected(selectedColor) {
                            if (showStatusBarLyric) {
                                const colorStr = selectedColor.hexa();
                                LyricUtil.setStatusBarColors(null, colorStr);
                                Config.setConfig(
                                    "lyric.backgroundColor",
                                    colorStr,
                                );
                            }
                        },
                    });
                }}>
                <ListItem.Content title={t("basicSettings.lyric.backgroundColor")} />
                <ColorBlock
                    color={backgroundColor ?? "#84888153"}
                />
            </ListItem>
        </View>
    );
}

const lyricStyles = StyleSheet.create({
    wrapper: {
        marginHorizontal: spacing.md,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        borderBottomLeftRadius: radius.xl,
        borderBottomRightRadius: radius.xl,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderLeftWidth: StyleSheet.hairlineWidth,
        borderRightWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        overflow: "hidden",
    },
    slider: {
        flex: 1,
        marginLeft: spacing.md,
    },
    sliderContainer: {
        height: rpx(96),
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.md,
    },
});
