import AppBar from "@/components/base/appBar";
import { useI18N } from "@/core/i18n";
import React from "react";
import Body from "./components/body";
import PageShell from "@/components/base/pageShell";

export default function RecommendSheets() {
    const { t } = useI18N();

    return (
        <PageShell
            appBar={<AppBar>{t("recommendSheet.title")}</AppBar>}
            musicBar>
            <Body />
        </PageShell>
    );
}
