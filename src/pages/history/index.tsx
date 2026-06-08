import React, { memo, useCallback, useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import VerticalSafeAreaView from "@/components/base/verticalSafeAreaView";
import globalStyle from "@/constants/globalStyle";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import { ImgAsset } from "@/constants/assetsConst";
import StatusBar from "@/components/base/statusBar";
import Color from "color";
import musicHistory, { useMusicHistory } from "@/core/musicHistory";
import MusicBar from "@/components/musicBar";
import AppBar from "@/components/base/appBar";
import { ROUTE_PATH, useNavigate } from "@/core/router";
import { useI18N } from "@/core/i18n";
import useColors from "@/hooks/useColors";
import rpx from "@/utils/rpx";
import { getMediaUniqueKey } from "@/utils/mediaUtils";
import ThemeText from "@/components/base/themeText";
import Icon from "@/components/base/icon.tsx";
import FastImage from "@/components/base/fastImage";
import TrackPlayer from "@/core/trackPlayer";
import { showPanel } from "@/components/panels/usePanel";
import { showDialog } from "@/components/dialogs/useDialog";
import TitleAndTag from "@/components/mediaItem/titleAndTag";
import LocalMusicSheet from "@/core/localMusicSheet";
import ListEmpty from "@/components/base/listEmpty";
import { RequestStateCode, musicHistorySheetId } from "@/constants/commonConst";

const ITEM_HEIGHT = rpx(152);

interface IHistoryItemProps {
    musicItem: IMusic.IMusicItem;
    index: number;
    musicSheet: IMusic.IMusicSheetItem;
}

const HistoryItem = memo(function HistoryItem(props: IHistoryItemProps) {
    const { musicItem, index, musicSheet } = props;
    const colors = useColors();

    const handlePress = useCallback(() => {
        TrackPlayer.play(musicItem);
    }, [musicItem]);

    const handleMore = useCallback(() => {
        showPanel("MusicItemOptions", { musicItem, musicSheet });
    }, [musicItem, musicSheet]);

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={handlePress}
            style={[styles.itemRow, { borderBottomColor: colors.divider }]}>
            <ThemeText
                fontSize="subTitle"
                fontColor="textSecondary"
                style={styles.itemIndex}>
                {index}
            </ThemeText>
            <FastImage
                style={styles.itemArtwork}
                source={musicItem.artwork}
                placeholderSource={ImgAsset.albumDefault}
            />
            <View style={styles.itemContent}>
                <TitleAndTag
                    title={musicItem.title}
                    tag={musicItem.platform}
                />
                <View style={styles.itemDescRow}>
                    {LocalMusicSheet.isLocalMusic(musicItem) && (
                        <Icon
                            style={styles.localIcon}
                            color={colors.primary}
                            name="check-circle"
                            size={rpx(22)}
                        />
                    )}
                    <ThemeText
                        numberOfLines={1}
                        fontSize="description"
                        fontColor="textSecondary">
                        {musicItem.artist}
                        {musicItem.album ? ` - ${musicItem.album}` : ""}
                    </ThemeText>
                </View>
            </View>
            <Icon
                name="ellipsis-vertical"
                size={rpx(28)}
                color={colors.textSecondary}
                onPress={handleMore}
                style={styles.itemMore}
            />
        </TouchableOpacity>
    );
});

function HistoryHeader({ count }: { count: number }) {
    const colors = useColors();
    const { t } = useI18N();

    return (
        <View
            style={[
                styles.headerCard,
                { backgroundColor: colors.surfacePrimary },
            ]}>
            <View style={[styles.headerIconWrap, { backgroundColor: Color(colors.primary).alpha(0.1).toString() }]}>
                <Icon
                    name="clock-outline"
                    size={rpx(40)}
                    color={colors.primary}
                />
            </View>
            <View style={styles.headerInfo}>
                <ThemeText
                    fontSize="subTitle"
                    fontWeight="bold"
                    style={{ color: colors.text }}>
                    {t("history.title")}
                </ThemeText>
                <ThemeText
                    fontSize="description"
                    fontColor="textSecondary"
                    style={styles.headerCount}>
                    {t("history.count", { count })}
                </ThemeText>
            </View>
        </View>
    );
}

export default function History() {
    const musicHistoryList = useMusicHistory();
    const navigate = useNavigate();
    const { t } = useI18N();

    const musicSheet = useMemo(
        () =>
            ({
                id: musicHistorySheetId,
                title: t("history.title"),
                musicList: musicHistoryList,
            }) as IMusic.IMusicSheetItem,
        [t, musicHistoryList],
    );

    const renderItem = useCallback(
        ({ item, index }: { item: IMusic.IMusicItem; index: number }) => (
            <HistoryItem
                musicItem={item}
                index={index + 1}
                musicSheet={musicSheet}
            />
        ),
        [musicSheet],
    );

    return (
        <VerticalSafeAreaView style={globalStyle.fwflex1}>
            <StatusBar />
            <AppBar
                menu={[
                    {
                        icon: "trash-outline",
                        title: t("history.clearHistory"),
                        onPress() {
                            if (musicHistoryList.length) {
                                showDialog("SimpleDialog", {
                                    title: t("history.clearHistory"),
                                    content: t("history.clearHistoryConfirm"),
                                    async onOk() {
                                        musicHistory.clearMusic();
                                    },
                                });
                            }
                        },
                    },
                    {
                        icon: "pencil-square",
                        title: t("common.edit"),
                        onPress() {
                            navigate(ROUTE_PATH.MUSIC_LIST_EDITOR, {
                                musicList: musicHistoryList,
                                musicSheet: {
                                    id: musicHistorySheetId,
                                    title: t("history.title"),
                                },
                            });
                        },
                    },
                ]}>
                {t("history.title")}
            </AppBar>
            {musicHistoryList.length > 0 ? (
                <FlashList
                    data={musicHistoryList}
                    renderItem={renderItem}
                    estimatedItemSize={ITEM_HEIGHT}
                    keyExtractor={getMediaUniqueKey}
                    ListHeaderComponent={
                        <HistoryHeader count={musicHistoryList.length} />
                    }
                    contentContainerStyle={styles.listContent}
                />
            ) : (
                <View style={globalStyle.fwflex1}>
                    <ListEmpty
                        state={RequestStateCode.FINISHED}
                    />
                    <ThemeText
                        fontColor="textSecondary"
                        style={{ textAlign: "center", paddingHorizontal: spacing.xl, marginBottom: spacing.xl }}>
                        {t("history.emptyGuide")}
                    </ThemeText>
                </View>
            )}
            <MusicBar />
        </VerticalSafeAreaView>
    );
}

const styles = StyleSheet.create({
    listContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.xl,
    },
    headerCard: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
        borderRadius: radius.lg,
        marginBottom: spacing.lg,
    },
    headerIconWrap: {
        width: rpx(72),
        height: rpx(72),
        borderRadius: radius.lg,
        justifyContent: "center",
        alignItems: "center",
        marginRight: spacing.md,
    },
    headerInfo: {
        flex: 1,
        justifyContent: "center",
    },
    headerCount: {
        marginTop: rpx(4),
    },
    itemRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.lg,
        paddingLeft: spacing.sm,
        paddingRight: spacing.xs,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    itemIndex: {
        width: rpx(56),
        fontSize: rpx(26),
        fontFamily: "monospace",
        fontStyle: "normal",
        fontWeight: "300",
        textAlign: "right",
        opacity: 0.45,
        marginRight: spacing.md,
    },
    itemArtwork: {
        width: rpx(112),
        height: rpx(112),
        borderRadius: radius.md,
        overflow: "hidden",
        marginRight: spacing.md,
    },
    itemContent: {
        flex: 1,
        justifyContent: "center",
        height: rpx(112),
    },
    itemDescRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: rpx(8),
    },
    localIcon: {
        marginLeft: spacing.xs,
    },
    itemMore: {
        padding: spacing.sm,
    },
});
