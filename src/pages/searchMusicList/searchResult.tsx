import React from "react";
import MusicItem from "@/components/mediaItem/musicItem";
import Empty from "@/components/base/empty";
import { FlashList } from "@shopify/flash-list";
import rpx from "@/utils/rpx.ts";
import { StyleSheet, View } from "react-native";
import ThemeText from "@/components/base/themeText";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import useColors from "@/hooks/useColors";
import { useI18N } from "@/core/i18n";
import Color from "color";

interface ISearchResultProps {
    result: IMusic.IMusicItem[];
    musicSheet?: IMusic.IMusicSheetItem;
    query?: string;
    total?: number;
}

const ITEM_HEIGHT = rpx(120);

export default function SearchResult(props: ISearchResultProps) {
    const { result, musicSheet, query = "", total = result.length } = props;
    const colors = useColors();
    const { t } = useI18N();
    const hasQuery = query.length > 0;

    return (
        <FlashList
            estimatedItemSize={ITEM_HEIGHT}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
                result.length ? (
                    <View
                        style={[
                            styles.header,
                            {
                                backgroundColor: colors.surfacePrimary,
                                borderColor: colors.divider,
                            },
                        ]}>
                        <View>
                            <ThemeText fontWeight="bold">
                                {t(
                                    hasQuery
                                        ? "searchMusicList.resultCount"
                                        : "searchMusicList.totalCount",
                                    {
                                        count: hasQuery ? result.length : total,
                                    },
                                )}
                            </ThemeText>
                            {hasQuery ? (
                                <ThemeText
                                    fontSize="description"
                                    fontColor="textSecondary"
                                    style={styles.keyword}>
                                    {t("searchMusicList.queryHint", {
                                        keyword: query,
                                    })}
                                </ThemeText>
                            ) : null}
                        </View>
                        <View
                            style={[
                                styles.badge,
                                {
                                    backgroundColor: Color(colors.primary).alpha(0.12).rgb().string(),
                                },
                            ]}>
                            <ThemeText
                                fontSize="tag"
                                fontWeight="bold"
                                fontColor="primary">
                                {result.length}
                            </ThemeText>
                        </View>
                    </View>
                ) : null
            }
            ListEmptyComponent={
                <Empty
                    icon="search"
                    title={t("searchMusicList.emptyTitle")}
                    description={t("searchMusicList.emptyDescription")}
                    minHeight={rpx(540)}
                />
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            data={result}
            renderItem={({ item }) => (
                <MusicItem
                    musicItem={item}
                    musicSheet={musicSheet}
                    containerStyle={[
                        styles.item,
                        {
                            backgroundColor: colors.surfacePrimary,
                            borderColor: colors.divider,
                        },
                    ]}
                />
            )}
        />
    );
}

const styles = StyleSheet.create({
    contentContainer: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: rpx(160),
    },
    header: {
        minHeight: rpx(92),
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        marginBottom: spacing.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    keyword: {
        marginTop: spacing.xs,
    },
    badge: {
        minWidth: rpx(56),
        height: rpx(44),
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: spacing.md,
    },
    item: {
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: "hidden",
    },
    separator: {
        height: spacing.sm,
    },
});
