import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
    StyleSheet,
    View,
    ScrollView,
    Pressable,
    TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { FlashList } from "@shopify/flash-list";
import { useAtomValue } from "jotai";

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
import Icon from "@/components/base/icon.tsx";
import FastImage from "@/components/base/fastImage";
import ListEmpty from "@/components/base/listEmpty";
import Loading from "@/components/base/loading";

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
                        containerStyle={{ marginTop: rpx(4) }}
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

    const plugins = usePlugins();

    // 获取支持推荐歌单的插件
    const recommendPlugins = useMemo(
        () =>
            PluginManager.getSortedPluginsWithAbility(
                "getRecommendSheetsByTag",
            ),
        [plugins],
    );

    // 获取支持榜单的插件
    const topListPlugins = useMemo(
        () => PluginManager.getSortedPluginsWithAbility("getTopLists"),
        [plugins],
    );

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
    const quickActions = useMemo(
        () => [
            {
                icon: "fire" as const,
                title: t("home.recommendSheet"),
                onPress: () => navigate(ROUTE_PATH.RECOMMEND_SHEETS),
            },
            {
                icon: "trophy" as const,
                title: t("home.topList"),
                onPress: () => navigate(ROUTE_PATH.TOP_LIST),
            },
            {
                icon: "clock-outline" as const,
                title: t("home.playHistory"),
                onPress: () => navigate(ROUTE_PATH.HISTORY),
            },
            {
                icon: "folder-music-outline" as const,
                title: t("home.localMusic"),
                onPress: () => navigate(ROUTE_PATH.LOCAL),
            },
        ],
        [t, navigate],
    );

    return (
        <ScrollView
            style={globalStyle.fwflex1}
            showsVerticalScrollIndicator={false}>
            {/* 顶部大标题 */}
            <View style={styles.header}>
                <ThemeText
                    fontSize="appbar"
                    fontWeight="bold"
                    style={[styles.headerTitle, { color: colors.text }]}>
                    {t("home.discover")}
                </ThemeText>
            </View>

            {/* 搜索栏 */}
            <Pressable
                style={[
                    styles.searchBar,
                    {
                        backgroundColor: colors.surfaceTertiary,
                    },
                ]}
                accessible
                accessibilityLabel={t("home.clickToSearch")}
                onPress={() => {
                    navigation.navigate(ROUTE_PATH.SEARCH_PAGE);
                }}>
                <View style={styles.searchBarInner}>
                    <Icon
                        accessible={false}
                        name="magnifying-glass"
                        size={rpx(28)}
                        color={colors.textSecondary}
                    />
                    <ThemeText
                        accessible={false}
                        fontSize="subTitle"
                        fontColor="textSecondary"
                        style={styles.searchText}>
                        {t("home.clickToSearch")}
                    </ThemeText>
                </View>
            </Pressable>

            {/* 快捷入口 */}
            <View style={[styles.quickActions, { backgroundColor: colors.surfacePrimary }]}>
                {quickActions.map(action => (
                    <TouchableOpacity
                        key={action.title}
                        activeOpacity={0.7}
                        style={styles.quickActionItem}
                        onPress={action.onPress}>
                        <View
                            style={[
                                styles.quickActionIcon,
                                {
                                    backgroundColor: colors.surfaceTertiary,
                                },
                            ]}>
                            <Icon
                                name={action.icon}
                                size={rpx(36)}
                                color={colors.primary}
                            />
                        </View>
                        <ThemeText
                            fontSize="description"
                            fontWeight="medium"
                            style={styles.quickActionText}>
                            {action.title}
                        </ThemeText>
                    </TouchableOpacity>
                ))}
            </View>

            {/* 推荐歌单 */}
            {firstRecommendPlugin ? (
                <DiscoverSection
                    title={t("home.recommendSheet")}
                    actionText={t("common.view")}
                    onAction={() => navigate(ROUTE_PATH.RECOMMEND_SHEETS)}>
                    {recommendState === RequestStateCode.PENDING_FIRST_PAGE ? (
                        <Loading />
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
                    <Loading />
                ) : null}

            {/* 底部留白 */}
            <View style={styles.bottomSpacing} />
        </ScrollView>
    );
}

// ==================== 样式 ====================

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
    },
    headerTitle: {
        fontSize: HEADER_TITLE_SIZE,
        fontWeight: fontWeightConst.bold as any,
    },
    searchBar: {
        marginHorizontal: spacing.lg,
        height: rpx(72),
        borderRadius: radius.pill,
        overflow: "hidden",
        marginBottom: spacing.lg,
    },
    searchBarInner: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        height: "100%",
        paddingHorizontal: spacing.lg,
        gap: rpx(8),
    },
    searchText: {
        opacity: 0.6,
        fontWeight: "400",
    },
    quickActions: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginHorizontal: spacing.lg,
        marginBottom: spacing.xl,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.md,
        borderRadius: radius.lg,
    },
    quickActionItem: {
        alignItems: "center",
        width: rpx(140),
    },
    quickActionIcon: {
        width: rpx(80),
        height: rpx(80),
        borderRadius: radius.lg,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    quickActionText: {
        textAlign: "center",
    },
    sectionContainer: {
        marginBottom: spacing.xl,
        marginHorizontal: spacing.lg,
        borderRadius: radius.lg,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: rpx(4) },
        shadowOpacity: 0.06,
        shadowRadius: rpx(12),
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
    sectionAction: {
        opacity: 0.7,
    },
    horizontalListContent: {
        paddingHorizontal: spacing.lg,
    },
    sheetCard: {
        width: SHEET_CARD_WIDTH,
        marginRight: spacing.md,
    },
    sheetImage: {
        width: SHEET_IMAGE_SIZE,
        height: SHEET_IMAGE_SIZE,
        borderRadius: radius.md,
        overflow: "hidden",
        marginBottom: spacing.sm,
    },
    sheetTitle: {
        lineHeight: rpx(36),
        paddingHorizontal: rpx(4),
    },
    songList: {
        paddingHorizontal: spacing.lg,
    },
    songRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    songImage: {
        width: SONG_IMAGE_SIZE,
        height: SONG_IMAGE_SIZE,
        borderRadius: radius.md,
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
    songMore: {
        padding: spacing.sm,
    },
    topListGroup: {
        paddingHorizontal: spacing.lg,
    },
    topListItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.sm,
    },
    topListImage: {
        width: SONG_IMAGE_SIZE,
        height: SONG_IMAGE_SIZE,
        borderRadius: radius.md,
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
        height: spacing.xxxl,
    },
});
