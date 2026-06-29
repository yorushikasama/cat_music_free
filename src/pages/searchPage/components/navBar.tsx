import AppBar from "@/components/base/appBar";
import SearchInput from "@/components/base/searchInput";
import Button from "@/components/base/textButton.tsx";
import { useI18N } from "@/core/i18n";
import useColors from "@/hooks/useColors";
import rpx from "@/utils/rpx";
import { spacing } from "@/constants/spacing";
import { useAtom, useSetAtom } from "jotai";
import React from "react";
import { StyleSheet, View } from "react-native";
import { addHistory } from "../common/historySearch";
import useSearch from "../hooks/useSearch";
import {
    PageStatus,
    initSearchResults,
    pageStatusAtom,
    queryAtom,
    searchResultsAtom,
} from "../store/atoms";

export default function NavBar() {
    const search = useSearch();
    const [query, setQuery] = useAtom(queryAtom);
    const setPageStatus = useSetAtom(pageStatusAtom);
    const setSearchResultsState = useSetAtom(searchResultsAtom);
    const { t } = useI18N();
    const colors = useColors();

    const onSearchSubmit = async () => {
        if (query === "") {
            return;
        }
        setSearchResultsState(initSearchResults);
        setPageStatus(prev =>
            prev === PageStatus.EDITING ? PageStatus.SEARCHING : prev,
        );
        await search(query, 1);
        await addHistory(query);
    };

    return (
        <AppBar
            color={colors.text}
            containerStyle={[
                style.appbar,
                {
                    backgroundColor: colors.pageBackground,
                },
            ]}
            contentStyle={style.appbarContent}>
            <View style={style.searchBarContainer}>
                <SearchInput
                    autoFocus
                    containerStyle={style.searchBar}
                    accessible
                    accessibilityLabel={t("searchPage.searchLabel.a11y")}
                    accessibilityHint={t("searchPage.searchPlaceHolder")}
                    onFocus={() => {
                        setPageStatus(PageStatus.EDITING);
                    }}
                    placeholder={t("searchPage.searchPlaceHolder")}
                    onSubmitEditing={onSearchSubmit}
                    onChangeText={_ => {
                        if (_ === "") {
                            setPageStatus(PageStatus.EDITING);
                        }
                        setQuery(_);
                    }}
                    value={query}
                    onClear={() => {
                        setQuery("");
                        setPageStatus(PageStatus.EDITING);
                    }}
                />
            </View>
            <Button
                style={[style.button]}
                hitSlop={0}
                fontColor={"primary"}
                onPress={onSearchSubmit}>
                {t("common.search")}
            </Button>
        </AppBar>
    );
}

const style = StyleSheet.create({
    appbar: {
        paddingRight: spacing.md,
        paddingLeft: spacing.sm,
        paddingTop: spacing.xs,
        paddingBottom: spacing.xs,
        height: rpx(96),
    },
    appbarContent: {
        paddingHorizontal: spacing.sm,
    },
    button: {
        minWidth: rpx(88),
        paddingHorizontal: spacing.sm,
        height: rpx(64),
        justifyContent: "center",
        flexDirection: "row",
        alignItems: "center",
    },
    searchBarContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
    },
    searchBar: {
        minWidth: rpx(375),
        flex: 1,
        minHeight: rpx(64),
    },
});
