import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";
import { SkeletonBlock } from "@/components/base/skeleton";
import Chip from "@/components/base/chip";
import useSearch from "../hooks/useSearch";
import {
    addHistory,
    getHistory,
    removeAllHistory,
    removeHistory,
} from "../common/historySearch";
import { useSetAtom } from "jotai";
import {
    PageStatus,
    initSearchResults,
    pageStatusAtom,
    queryAtom,
    searchResultsAtom,
} from "../store/atoms";
import ThemeText from "@/components/base/themeText";
import Button from "@/components/base/textButton.tsx";
import Empty from "@/components/base/empty";
import { useI18N } from "@/core/i18n";
import useColors from "@/hooks/useColors";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import Color from "color";

export default function () {
    const [history, setHistory] = useState<string[] | null>(null);
    const search = useSearch();

    const setQuery = useSetAtom(queryAtom);
    const setPageStatus = useSetAtom(pageStatusAtom);
    const setSearchResultsState = useSetAtom(searchResultsAtom);
    const { t } = useI18N();
    const colors = useColors();
    const chipBackground = Color(colors.primary).alpha(0.1).rgb().string();
    const chipBorder = Color(colors.primary).alpha(0.16).rgb().string();

    useEffect(() => {
        getHistory().then(setHistory);
    }, []);

    return (
        <View style={style.wrapper}>
            {history === null ? (
                <View style={style.loadingContent}>
                    <SkeletonBlock width="38%" height={rpx(34)} />
                    <View style={style.loadingChips}>
                        {Array.from({ length: 10 }).map((_, index) => (
                            <SkeletonBlock
                                key={index}
                                width={index % 3 === 0 ? rpx(164) : rpx(116)}
                                height={rpx(56)}
                                radius={radius.pill}
                                style={style.loadingChip}
                            />
                        ))}
                    </View>
                </View>
            ) : (
                <>
                    <View style={style.header}>
                        <ThemeText fontSize="title" fontWeight="semibold">
                            {t("searchPage.history")}
                        </ThemeText>
                        <Button
                            style={[
                                style.clearButton,
                                {
                                    backgroundColor: colors.surfaceSecondary,
                                    borderColor: colors.divider,
                                },
                            ]}
                            fontColor="textSecondary"
                            onPress={async () => {
                                await removeAllHistory();
                                getHistory().then(setHistory);
                            }}>
                            {t("common.clear")}
                        </Button>
                    </View>
                    <ScrollView
                        style={style.historyContent}
                        contentContainerStyle={style.historyContentConainer}>
                        {history.length ? (
                            history.map(_ => (
                                <Chip
                                    key={`search-history-${_}`}
                                    containerStyle={[
                                        style.chip,
                                        {
                                            backgroundColor: chipBackground,
                                            borderColor: chipBorder,
                                        },
                                    ]}
                                    onClose={async () => {
                                        await removeHistory(_);
                                        getHistory().then(setHistory);
                                    }}
                                    onPress={() => {
                                        setSearchResultsState(
                                            initSearchResults,
                                        );
                                        setPageStatus(PageStatus.SEARCHING);
                                        search(_, 1);
                                        addHistory(_);
                                        setQuery(_);
                                    }}>
                                    {_}
                                </Chip>
                            ))
                        ) : (
                            <Empty
                                icon="clock-outline"
                                title={t("searchPage.history")}
                                description={t("common.emptyListDescription")}
                                minHeight={rpx(420)}
                            />
                        )}
                    </ScrollView>
                </>
            )}
        </View>
    );
}

const style = StyleSheet.create({
    wrapper: {
        width: "100%",
        maxWidth: "100%",
        flexDirection: "column",
        paddingHorizontal: spacing.md,
        flex: 1,
    },
    header: {
        width: "100%",
        flexDirection: "row",
        paddingVertical: spacing.lg,
        justifyContent: "space-between",
        alignItems: "center",
    },
    clearButton: {
        height: rpx(52),
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.md,
        justifyContent: "center",
    },
    historyContent: {
        width: "100%",
        flex: 1,
    },
    historyContentConainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        paddingBottom: rpx(160),
    },
    chip: {
        flexGrow: 0,
        marginRight: spacing.sm,
        marginBottom: spacing.sm,
        borderWidth: StyleSheet.hairlineWidth,
    },
    loadingContent: {
        paddingTop: spacing.lg,
    },
    loadingChips: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginTop: spacing.lg,
    },
    loadingChip: {
        marginRight: spacing.sm,
        marginBottom: spacing.sm,
    },
});
