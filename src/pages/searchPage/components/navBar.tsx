import AppBar from "@/components/base/appBar";
import Icon from "@/components/base/icon.tsx";
import IconButton from "@/components/base/iconButton";
import Input from "@/components/base/input";
import Button from "@/components/base/textButton.tsx";
import { iconSizeConst } from "@/constants/uiConst";
import { useI18N } from "@/core/i18n";
import useColors from "@/hooks/useColors";
import rpx from "@/utils/rpx";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import Color from "color";
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
    const colors = useColors();
    const setSearchResultsState = useSetAtom(searchResultsAtom);
    const { t } = useI18N();

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

    const hintTextColor = Color(colors.text).alpha(0.6).toString();

    return (
        <AppBar containerStyle={style.appbar} contentStyle={style.appbar}>
            <View style={style.searchBarContainer}>
                <Icon
                    name="magnifying-glass"
                    color={hintTextColor}
                    size={iconSizeConst.small}
                    style={style.magnify}
                />
                <Input
                    autoFocus
                    variant="outlined"
                    style={[
                        style.searchBar,
                        {
                            color: colors.text,
                        },
                    ]}
                    accessible
                    accessibilityLabel={t("searchPage.searchLabel.a11y")}
                    accessibilityHint={t("searchPage.searchPlaceHolder")}
                    onFocus={() => {
                        setPageStatus(PageStatus.EDITING);
                    }}
                    placeholderTextColor={hintTextColor}
                    placeholder={t("searchPage.searchPlaceHolder")}
                    onSubmitEditing={onSearchSubmit}
                    onChangeText={_ => {
                        if (_ === "") {
                            setPageStatus(PageStatus.EDITING);
                        }
                        setQuery(_);
                    }}
                    value={query}
                />
                {query.length ? (
                    <IconButton
                        style={style.close}
                        sizeType="light"
                        onPress={() => {
                            setQuery("");
                            setPageStatus(PageStatus.EDITING);
                        }}
                        color={hintTextColor}
                        name="x-mark"
                    />
                ) : null}
            </View>
            <Button
                style={[style.button]}
                hitSlop={0}
                fontColor={"appBarText"}
                onPress={onSearchSubmit}>
                {t("common.search")}
            </Button>
        </AppBar>
    );
}

const style = StyleSheet.create({
    appbar: {
        paddingRight: 0,
    },
    button: {
        paddingHorizontal: spacing.md,
        height: "100%",
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
        paddingHorizontal: spacing.xxxl,
        borderRadius: radius.pill,
        height: spacing.xxxl,
        maxHeight: spacing.xxxl,
        alignItems: "center",
    },
    magnify: {
        position: "absolute",
        left: spacing.sm,
        zIndex: 100,
    },
    close: {
        position: "absolute",
        right: spacing.sm,
    },
});
