import React from "react";
import TopListBody from "./components/topListBody";
import globalStyle from "@/constants/globalStyle";
import HorizontalSafeAreaView from "@/components/base/horizontalSafeAreaView.tsx";
import AppBar from "@/components/base/appBar";
import { useI18N } from "@/core/i18n";
import PageShell from "@/components/base/pageShell";

export default function TopList() {
    const { t } = useI18N();

    return (
        <PageShell
            appBar={<AppBar>{t("topList.title")}</AppBar>}
            horizontalEdges={[]}
            musicBar>
            <HorizontalSafeAreaView style={globalStyle.flex1}>
                <TopListBody />
            </HorizontalSafeAreaView>
        </PageShell>
    );
}
