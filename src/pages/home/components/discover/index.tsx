import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { FlashList } from "@shopify/flash-list";
import { useAtomValue } from "jotai";
import Color from "color";

import globalStyle from "@/constants/globalStyle";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import { fontSizeConst, fontWeightConst } from "@/constants/uiConst";
import { ImgAsset } from "@/constants/assetsConst";
import { RequestStateCode, musicHistorySheetId } from "@/constants/commonConst";

import { showPanel } from "@/components/panels/usePanel";
import useColors from "@/hooks/useColors";
import rpx from "@/utils/rpx";
import { getMediaUniqueKey } from "@/utils/mediaUtils";

import Tag from "@/components/base/tag";
import ThemeText from "@/components/base/themeText";
import Icon, { IIconName } from "@/components/base/icon.tsx";
import FastImage from "@/components/base/fastImage";
import ListEmpty from "@/components/base/listEmpty";
import { SkeletonBlock } from "@/components/base/skeleton";
import SearchInput from "@/components/base/searchInput";

import { useI18N } from "@/core/i18n";
import { ROUTE_PATH, useNavigate } from "@/core/router";
import PluginManager, { usePlugins } from "@/core/pluginManager";
import { useMusicHistory } from "@/core/musicHistory";
import TrackPlayer, { useCurrentMusic } from "@/core/trackPlayer";

import { pluginsTopListAtom } from "@/pages/topList/store/atoms";
import useGetTopList from "@/pages/topList/hooks/useGetTopList";

// ==================== 常量 ====================
const SECTION_TITLE_SIZE = fontSizeConst.title;
const HEADER_TITLE_SIZE = rpx(48);
const SHEET_CARD_WIDTH = rpx(280);
const SHEET_IMAGE_SIZE = rpx(280);
const SONG_IMAGE_SIZE = rpx(112);
const RECENT_PLAY_COUNT = 6;
const QUICK_GRID_GAP = spacing.md;
const HOME_BOTTOM_OVERLAY_SPACE = rpx(286);

function alpha(color: string, value: number) {
    try {
        return Color(color).alpha(value).rgb().string();
    } catch {
        return color;
    }
}

function readableOn(color: string) {
    try {
        const base = Color(color);
        const light = Color("#ffffff");
        const dark = Color("#111111");
        return base.contrast(light) >= base.contrast(dark) ? "#ffffff" : "#111111";
    } catch {
        return "#ffffff";
    }
}

// ==================== 类型 ====================
interface IDiscoverSectionProps {
    title: string;
    actionText?: string;
    onAction?: () => void;
    children: React.ReactNode;
}

interface ISheetCardProps {
    sheet: IMusic.IMusicSheetItemBase;
    pluginHash: string;
}

interface ISongRowProps {
    music: IMusic.IMusicItem;
}

interface IQuickAction {
    icon: IIconName;
    title: string;
    description: string;
    onPress: () => void;
}

// ==================== 子组件 ====================

/** 分区标题栏 */
function DiscoverSection(props: IDiscoverSectionProps) {
    const { title, actionText, onAction, children } = props;
    const colors = useColors();

    return (
        <View style={[styles.sectionContainer, { backgroundColor: colors.surfacePrimary }]}>
            <View style={styles.sectionHeader}>
                <ThemeText
                    fontSize="title"
                    fontWeight="bold"
                    style={{ color: colors.text, fontSize: SECTION_TITLE_SIZE }}>
                    {title}
                </ThemeText>
                {actionText ? (
                    <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
                        <ThemeText
                            fontSize="subTitle"
                            fontColor="textSecondary"
                            style={styles.sectionAction}>
                            {actionText}
                        </ThemeText>
                    </TouchableOpacity>
                ) : null}
            </View>
            {children}
        </View>
    );
}

/** 推荐歌单卡片 */
function SheetCard(props: ISheetCardProps) {
    const { sheet, pluginHash } = props;
    const navigate = useNavigate();
    const colors = useColors();

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            style={styles.sheetCard}
            onPress={() => {
                navigate(ROUTE_PATH.PLUGIN_SHEET_DETAIL, {
                    pluginHash,
                    sheetInfo: sheet,
                });
            }}>
            <FastImage
                style={styles.sheetImage}
                source={sheet.artwork ?? sheet.coverImg}
                placeholderSource={ImgAsset.albumDefault}
            />
            <ThemeText
                fontSize="subTitle"
                fontWeight="medium"
                numberOfLines={2}
                style={[styles.sheetTitle, { color: colors.text }]}>
                {sheet.title}
            </ThemeText>
        </TouchableOpacity>
    );
}

/** 歌曲行 */
const SongRow = memo(function SongRow(props: ISongRowProps) {
    const { music } = props;
    const colors = useColors();
    const currentMusic = useCurrentMusic();
    const isActive = currentMusic && getMediaUniqueKey(currentMusic) === getMediaUniqueKey(music);

    const handlePlay = useCallback(() => {
        TrackPlayer.play(music);
    }, [music]);

    const handleMore = useCallback(() => {
        showPanel("MusicItemOptions", {
            musicItem: music,
            musicSheet: {
                id: musicHistorySheetId,
                title: "",
                platform: "",
                musicList: [],
            } as IMusic.IMusicSheetItem,
        });
    }, [music]);

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.songRow, { borderBottomColor: colors.divider ?? "rgba(0,0,0,0.06)" }]}
            onPress={handlePlay}>
            <FastImage
                style={[
                    styles.songImage,
                    isActive && { borderWidth: rpx(4), borderColor: colors.primary },
                ]}
                source={music.artwork}
                placeholderSource={ImgAsset.albumDefault}
            />
            <View style={styles.songInfo}>
                <ThemeText
                    fontSize="content"
                    fontWeight="medium"
                    numberOfLines={1}
                    style={{ color: isActive ? colors.primary : colors.text }}>
                    {music.title}
                </ThemeText>
                <ThemeText
                    fontSize="description"
                    fontColor="textSecondary"
                    numberOfLines={1}
                    style={styles.songArtist}>
                    {music.artist}
                    {music.album ? ` · ${music.album}` : ""}
                </ThemeText>
                {music.platform ? (
                    <Tag
                        tagName={music.platform}
                        numberOfLines={1}
                        containerStyle={[
                            styles.songSourceTag,
                            {
                                backgroundColor: alpha(colors.primary, 0.08),
                                borderColor: alpha(colors.primary, 0.18),
                            },
                        ]}
                        style={{ color: colors.textSecondary }}
                    />
                ) : null}
            </View>
            <TouchableOpacity
                style={styles.songMore}
                onPress={handleMore}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                <Icon
                    name="ellipsis-vertical"
                    size={rpx(28)}
                    color={colors.textSecondary}
                />
            </TouchableOpacity>
        </TouchableOpacity>
    );
});

/** 横向歌单列表 */
function HorizontalSheetList(props: {
    sheets: IMusic.IMusicSheetItemBase[];
    pluginHash: string;
}) {
    const { sheets, pluginHash } = props;

    const renderItem = useCallback(
        ({ item }: { item: IMusic.IMusicSheetItemBase }) => (
            <SheetCard sheet={item} pluginHash={pluginHash} />
        ),
        [pluginHash],
    );

    return (
        <FlashList
            data={sheets}
            renderItem={renderItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContent}
            estimatedItemSize={SHEET_CARD_WIDTH}
            keyExtractor={(item, index) =>
                `sheet-${item.platform}-${item.id}-${index}`
            }
        />
    );
}

function SheetSkeletonRow() {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContent}>
            {Array.from({ length: 4 }).map((_, index) => (
                <View key={index} style={styles.sheetCard}>
                    <SkeletonBlock
                        width={SHEET_IMAGE_SIZE}
                        height={SHEET_IMAGE_SIZE}
                        radius={radius.xl}
                    />
                    <SkeletonBlock
                        width="86%"
                        height={rpx(28)}
                        style={styles.sheetSkeletonTitle}
                    />
                    <SkeletonBlock
                        width="58%"
                        height={rpx(22)}
                        style={styles.sheetSkeletonMeta}
                    />
                </View>
            ))}
        </ScrollView>
    );
}

function TopListSkeletonSection() {
    return (
        <DiscoverSection title="">
            <View style={styles.topListGroup}>
                {Array.from({ length: 3 }).map((_, index) => (
                    <View key={index} style={styles.topListItem}>
                        <SkeletonBlock
                            width={SONG_IMAGE_SIZE}
                            height={SONG_IMAGE_SIZE}
                            radius={radius.lg}
                            style={styles.topListImage}
                        />
                        <View style={styles.topListInfo}>
                            <SkeletonBlock width="64%" height={rpx(26)} />
                            <SkeletonBlock
                                width="42%"
                                height={rpx(22)}
                                style={styles.topListDesc}
                            />
                        </View>
                    </View>
                ))}
            </View>
        </DiscoverSection>
    );
}

/** 榜单分组项 */
function TopListSection(props: {
    pluginHash: string;
    group: IMusic.IMusicSheetGroupItem;
}) {
    const { pluginHash, group } = props;
    const navigate = useNavigate();

    return (
        <DiscoverSection title={group.title ?? ""}>
            <View style={styles.topListGroup}>
                {group.data?.slice(0, 4).map(item => (
                    <TouchableOpacity
                        key={`${item.platform}-${item.id}`}
                        activeOpacity={0.7}
                        style={styles.topListItem}
                        onPress={() => {
                            navigate(ROUTE_PATH.TOP_LIST_DETAIL, {
                                pluginHash,
                                topList: item,
                            });
                        }}>
                        <FastImage
                            style={styles.topListImage}
                            source={item.coverImg}
                            placeholderSource={ImgAsset.albumDefault}
                        />
                        <View style={styles.topListInfo}>
                            <ThemeText
                                fontSize="content"
                                fontWeight="medium"
                                numberOfLines={1}>
                                {item.title}
                            </ThemeText>
                            <ThemeText
                                fontSize="description"
                                fontColor="textSecondary"
                                numberOfLines={1}
                                style={styles.topListDesc}>
                                {item.description ?? ""}
                            </ThemeText>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </DiscoverSection>
    );
}

/** 最近播放区域 */
const RecentPlaySection = memo(function RecentPlaySection() {
    const { t } = useI18N();
    const navigate = useNavigate();
    const history = useMusicHistory();
    const recentSongs = useMemo(
        () => history.slice(0, RECENT_PLAY_COUNT),
        [history],
    );

    if (recentSongs.length === 0) {
        return null;
    }

    return (
        <DiscoverSection
            title={t("home.playHistory")}
            actionText={t("common.view")}
            onAction={() => navigate(ROUTE_PATH.HISTORY)}>
            <View style={styles.songList}>
                {recentSongs.map(music => (
                    <SongRow
                        key={getMediaUniqueKey(music)}
                        music={music}
                    />
                ))}
            </View>
        </DiscoverSection>
    );
});

// ==================== 主组件 ====================

export default function Discover() {
    const colors = useColors();
    const { t } = useI18N();
    const navigate = useNavigate();
    const navigation = useNavigation<any>();
    const { width } = useWindowDimensions();

    usePlugins();

    // 获取支持推荐歌单的插件
    const recommendPlugins = PluginManager.getSortedPluginsWithAbility(
        "getRecommendSheetsByTag",
    );

    // 获取支持榜单的插件
    const topListPlugins = PluginManager.getSortedPluginsWithAbility("getTopLists");

    // 推荐歌单数据
    const [recommendSheets, setRecommendSheets] = useState<
        IMusic.IMusicSheetItemBase[]
    >([]);
    const [recommendState, setRecommendState] = useState(
        RequestStateCode.IDLE,
    );

    const firstRecommendPlugin = recommendPlugins[0];

    const fetchRecommendSheets = useCallback(async () => {
        if (!firstRecommendPlugin) return;
        setRecommendState(RequestStateCode.PENDING_FIRST_PAGE);
        try {
            const result =
                await firstRecommendPlugin.methods?.getRecommendSheetsByTag?.(
                    { title: t("common.default"), id: "" },
                    1,
                );
            if (result?.data) {
                setRecommendSheets(result.data.slice(0, 10));
                setRecommendState(RequestStateCode.FINISHED);
            } else {
                setRecommendState(RequestStateCode.ERROR);
            }
        } catch {
            setRecommendState(RequestStateCode.ERROR);
        }
    }, [firstRecommendPlugin, t]);

    useEffect(() => {
        fetchRecommendSheets();
    }, [fetchRecommendSheets]);

    // 榜单数据
    const topLists = useAtomValue(pluginsTopListAtom);
    const getTopList = useGetTopList();

    const firstTopListPlugin = topListPlugins[0];
    const firstTopListData = firstTopListPlugin
        ? topLists[firstTopListPlugin.hash]
        : null;

    useEffect(() => {
        if (firstTopListPlugin) {
            getTopList(firstTopListPlugin.hash);
        }
    }, [firstTopListPlugin, getTopList]);

    // 快捷入口数据
    const quickActions = useMemo<IQuickAction[]>(
        () => [
            {
                icon: "fire",
                title: t("home.recommendSheet"),
                description: t("home.quickRecommendDesc"),
                onPress: () => navigate(ROUTE_PATH.RECOMMEND_SHEETS),
            },
            {
                icon: "trophy",
                title: t("home.topList"),
                description: t("home.quickTopListDesc"),
                onPress: () => navigate(ROUTE_PATH.TOP_LIST),
            },
            {
                icon: "clock-outline",
                title: t("home.playHistory"),
                description: t("home.quickHistoryDesc"),
                onPress: () => navigate(ROUTE_PATH.HISTORY),
            },
            {
                icon: "folder-music-outline",
                title: t("home.localMusic"),
                description: t("home.quickLocalDesc"),
                onPress: () => navigate(ROUTE_PATH.LOCAL),
            },
        ],
        [t, navigate],
    );

    const showEmptyGuide = !firstRecommendPlugin && !firstTopListPlugin;
    const quickGridWidth = width - spacing.lg * 2;
    const quickActionWidth = Math.max(
        rpx(138),
        (quickGridWidth - QUICK_GRID_GAP * 3) / 4,
    );

    return (
        <ScrollView
            style={globalStyle.fwflex1}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
                <View style={styles.heroHeader}>
                    <View style={styles.heroCopy}>
                        <ThemeText
                            fontSize="appbar"
                            fontWeight="bold"
                            style={[styles.headerTitle, { color: colors.text }]}>
                            {t("home.discover")}
                        </ThemeText>
                    </View>
                </View>

                <SearchInput
                    containerStyle={styles.searchBar}
                    accessible
                    accessibilityLabel={t("home.clickToSearch")}
                    placeholder={t("home.clickToSearch")}
                    value=""
                    editable={false}
                    onPress={() => {
                        navigation.navigate(ROUTE_PATH.SEARCH_PAGE);
                    }}
                />
            </View>

            <View style={styles.quickHeader}>
                <ThemeText
                    fontSize="title"
                    fontWeight="bold"
                    style={{ color: colors.text }}>
                    {t("home.quickStart")}
                </ThemeText>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickGrid}>
                {quickActions.map(action => (
                    <TouchableOpacity
                        key={action.title}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel={action.title}
                        style={[
                            styles.quickActionItem,
                            { width: quickActionWidth },
                        ]}
                        onPress={action.onPress}>
                        <View
                            style={[
                                styles.quickActionIcon,
                                { backgroundColor: alpha(colors.primary, 0.12) },
                            ]}>
                            <Icon
                                name={action.icon}
                                size={rpx(32)}
                                color={colors.primary}
                            />
                        </View>
                        <ThemeText
                            fontSize="description"
                            fontWeight="semibold"
                            numberOfLines={1}
                            style={{ color: colors.text }}>
                            {action.title}
                        </ThemeText>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {showEmptyGuide ? (
                <View
                    style={[
                        styles.emptyGuide,
                        {
                            backgroundColor: colors.surfacePrimary,
                            borderColor: colors.divider,
                        },
                    ]}>
                    <View
                        style={[
                            styles.emptyGuideIcon,
                            { backgroundColor: alpha(colors.primary, 0.12) },
                        ]}>
                        <Icon
                            name="folder-plus"
                            size={rpx(38)}
                            color={colors.primary}
                        />
                    </View>
                    <ThemeText
                        fontSize="title"
                        fontWeight="bold"
                        style={[styles.emptyGuideTitle, { color: colors.text }]}>
                        {t("home.emptyDiscoverTitle")}
                    </ThemeText>
                    <ThemeText
                        fontSize="description"
                        fontColor="textSecondary"
                        lineHeight
                        style={styles.emptyGuideDesc}>
                        {t("home.emptyDiscoverDescription")}
                    </ThemeText>
                    <View style={styles.emptyGuideActions}>
                        <TouchableOpacity
                            activeOpacity={0.78}
                            accessibilityRole="button"
                            style={[
                                styles.emptyPrimaryAction,
                                { backgroundColor: colors.primary },
                            ]}
                            onPress={() => navigate(ROUTE_PATH.SETTING, { type: "plugin" })}>
                            <ThemeText
                                fontSize="description"
                                fontWeight="semibold"
                                color={readableOn(colors.primary)}>
                                {t("home.emptyDiscoverPrimaryAction")}
                            </ThemeText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            activeOpacity={0.78}
                            accessibilityRole="button"
                            style={[
                                styles.emptySecondaryAction,
                                { borderColor: colors.divider },
                            ]}
                            onPress={() => navigate(ROUTE_PATH.LOCAL)}>
                            <ThemeText
                                fontSize="description"
                                fontWeight="semibold"
                                style={{ color: colors.text }}>
                                {t("home.emptyDiscoverSecondaryAction")}
                            </ThemeText>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : null}

            {/* 推荐歌单 */}
            {firstRecommendPlugin ? (
                <DiscoverSection
                    title={t("home.recommendSheet")}
                    actionText={t("common.view")}
                    onAction={() => navigate(ROUTE_PATH.RECOMMEND_SHEETS)}>
                    {recommendState === RequestStateCode.PENDING_FIRST_PAGE ? (
                        <SheetSkeletonRow />
                    ) : recommendSheets.length > 0 ? (
                        <HorizontalSheetList
                            sheets={recommendSheets}
                            pluginHash={firstRecommendPlugin.hash}
                        />
                    ) : (
                        <ListEmpty
                            state={recommendState}
                            onRetry={fetchRecommendSheets}
                        />
                    )}
                </DiscoverSection>
            ) : null}

            {/* 最近播放 */}
            <RecentPlaySection />

            {/* 榜单 */}
            {firstTopListPlugin && firstTopListData?.data ? (
                firstTopListData.data
                    .slice(0, 3)
                    .map(group => (
                        <TopListSection
                            key={group.title}
                            pluginHash={firstTopListPlugin.hash}
                            group={group}
                        />
                    ))
            ) : firstTopListPlugin &&
              firstTopListData?.state === RequestStateCode.PENDING_REST_PAGE ? (
                    <TopListSkeletonSection />
                ) : null}

            {/* 底部留白 */}
            <View style={styles.bottomSpacing} />
        </ScrollView>
    );
}

// ==================== 样式 ====================

const styles = StyleSheet.create({
    scrollContent: {
        paddingTop: spacing.lg,
    },
    hero: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.xl,
    },
    heroHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: spacing.md,
    },
    heroCopy: {
        flex: 1,
    },
    headerTitle: {
        fontSize: HEADER_TITLE_SIZE,
        fontWeight: fontWeightConst.bold as any,
    },
    searchBar: {
        minHeight: rpx(68),
    },
    quickHeader: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.sm,
    },
    quickGrid: {
        flexDirection: "row",
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.xl,
        gap: QUICK_GRID_GAP,
    },
    quickActionItem: {
        minHeight: rpx(116),
        borderRadius: radius.xl,
        alignItems: "center",
        justifyContent: "center",
    },
    quickActionIcon: {
        width: rpx(60),
        height: rpx(60),
        borderRadius: radius.pill,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.xs,
    },
    emptyGuide: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.xl,
        padding: spacing.lg,
        borderRadius: radius.xxl,
        borderWidth: StyleSheet.hairlineWidth,
    },
    emptyGuideIcon: {
        width: rpx(64),
        height: rpx(64),
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: spacing.md,
    },
    emptyGuideTitle: {
        marginBottom: spacing.sm,
    },
    emptyGuideDesc: {
        marginBottom: spacing.lg,
    },
    emptyGuideActions: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: spacing.md,
    },
    emptyPrimaryAction: {
        minHeight: rpx(56),
        borderRadius: radius.pill,
        paddingHorizontal: spacing.lg,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 1,
    },
    emptySecondaryAction: {
        minHeight: rpx(56),
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.lg,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 1,
    },
    sectionContainer: {
        marginBottom: spacing.xl,
        marginHorizontal: spacing.lg,
        borderRadius: radius.xl,
        overflow: "hidden",
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: spacing.lg,
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
    sectionAction: {
        paddingVertical: spacing.xs,
        paddingLeft: spacing.md,
    },
    horizontalListContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
    },
    sheetCard: {
        width: SHEET_CARD_WIDTH,
        marginRight: spacing.md,
    },
    sheetImage: {
        width: SHEET_IMAGE_SIZE,
        height: SHEET_IMAGE_SIZE,
        borderRadius: radius.xl,
        overflow: "hidden",
        marginBottom: spacing.sm,
    },
    sheetTitle: {
        lineHeight: rpx(36),
        paddingHorizontal: rpx(4),
    },
    sheetSkeletonTitle: {
        marginTop: spacing.sm,
        marginLeft: rpx(4),
    },
    sheetSkeletonMeta: {
        marginTop: spacing.xs,
        marginLeft: rpx(4),
    },
    songList: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
    },
    songRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    songImage: {
        width: SONG_IMAGE_SIZE,
        height: SONG_IMAGE_SIZE,
        borderRadius: radius.lg,
        overflow: "hidden",
        marginRight: spacing.md,
    },
    songInfo: {
        flex: 1,
        justifyContent: "center",
    },
    songArtist: {
        marginTop: rpx(4),
    },
    songSourceTag: {
        alignSelf: "flex-start",
        maxWidth: "52%",
        height: rpx(28),
        marginLeft: 0,
        marginTop: rpx(6),
        paddingHorizontal: spacing.sm,
        borderWidth: StyleSheet.hairlineWidth,
    },
    songMore: {
        padding: spacing.sm,
    },
    topListGroup: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
    },
    topListItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.sm,
    },
    topListImage: {
        width: SONG_IMAGE_SIZE,
        height: SONG_IMAGE_SIZE,
        borderRadius: radius.lg,
        overflow: "hidden",
        marginRight: spacing.md,
    },
    topListInfo: {
        flex: 1,
        justifyContent: "center",
    },
    topListDesc: {
        marginTop: rpx(4),
    },
    bottomSpacing: {
        height: HOME_BOTTOM_OVERLAY_SPACE,
    },
});
