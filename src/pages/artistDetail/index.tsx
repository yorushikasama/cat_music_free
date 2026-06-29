import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Header from "./components/header";
import Body from "./components/body";
import { useAtom, useSetAtom } from "jotai";
import { initQueryResult, queryResultAtom, scrollToTopAtom } from "./store/atoms";
import { ROUTE_PATH, useNavigate, useParams } from "@/core/router";
import globalStyle from "@/constants/globalStyle";
import useOrientation from "@/hooks/useOrientation";
import AppBar from "@/components/base/appBar";
import { useI18N } from "@/core/i18n";
import PageShell from "@/components/base/pageShell";
import CompactMediaAppBarTitle from "@/components/mediaDetailHeader/compactTitle";
import { useAtomValue } from "jotai";
import useColors from "@/hooks/useColors";

export default function ArtistDetail() {
    const [queryResult, setQueryResult] = useAtom(queryResultAtom);
    const { artistItem } = useParams<"artist-detail">();
    const setScrollToTopState = useSetAtom(scrollToTopAtom);
    const navigate = useNavigate();
    const orientation = useOrientation();
    const { t } = useI18N();
    const colors = useColors();
    const scrollToTopState = useAtomValue(scrollToTopAtom);
    const compactTitleVisible = orientation !== "horizontal" && !scrollToTopState;

    useEffect(() => {
        return () => {
            setQueryResult(initQueryResult);
            setScrollToTopState(true);
        };
    }, []);

    return (
        <PageShell
            appBar={(
                <AppBar
                    menu={[
                        {
                            title: t("artistDetail.menu.batchEditMusic"),
                            icon: "pencil-square",
                            onPress() {
                                navigate(ROUTE_PATH.MUSIC_LIST_EDITOR, {
                                    musicList: queryResult?.music?.data ?? [],
                                    musicSheet: {
                                        title: t("artistDetail.musicSheet", {
                                            artist: artistItem.name,
                                        }),
                                    },
                                });
                            },
                        },
                    ]}>
                    <CompactMediaAppBarTitle
                        label={t("common.artist")}
                        title={artistItem.name}
                        visible={compactTitleVisible}
                        color={colors.text}
                    />
                </AppBar>
            )}
            horizontalEdges={[]}
            musicBar>
            <View
                style={
                    orientation === "horizontal"
                        ? style.horizontal
                        : globalStyle.flex1
                }>
                <Header neverFold={orientation === "horizontal"} />
                <Body />
            </View>
        </PageShell>
    );
}

const style = StyleSheet.create({
    horizontal: {
        flexDirection: "row",
        flex: 1,
    },
});
