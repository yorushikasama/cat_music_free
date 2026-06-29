import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import NavBar from "./components/navBar";
import { useAtom, useSetAtom } from "jotai";
import {
    PageStatus,
    initSearchResults,
    pageStatusAtom,
    queryAtom,
    searchResultsAtom,
} from "./store/atoms";
import HistoryPanel from "./components/historyPanel";
import ResultPanel from "./components/resultPanel";
import NoPlugin from "../../components/base/noPlugin";
import { useI18N } from "@/core/i18n";
import PageShell from "@/components/base/pageShell";
import SkeletonList from "@/components/base/skeleton";

export default function () {
    const [pageStatus, setPageStatus] = useAtom(pageStatusAtom);
    const setQuery = useSetAtom(queryAtom);
    const setSearchResultsState = useSetAtom(searchResultsAtom);
    const { t } = useI18N();

    useEffect(() => {
        setSearchResultsState(initSearchResults);
        return () => {
            setPageStatus(PageStatus.EDITING);
            setQuery("");
        };
    }, []);

    return (
        <PageShell appBar={<NavBar />} musicBar>
            <View style={style.flex1}>
                {pageStatus === PageStatus.EDITING && <HistoryPanel />}
                {pageStatus === PageStatus.SEARCHING && (
                    <SkeletonList count={7} />
                )}
                {pageStatus === PageStatus.RESULT && <ResultPanel />}
                {pageStatus === PageStatus.NO_PLUGIN && (
                    <NoPlugin notSupportType={t("common.search")} />
                )}
            </View>
        </PageShell>
    );
}

const style = StyleSheet.create({
    flex1: {
        flex: 1,
    },
});
