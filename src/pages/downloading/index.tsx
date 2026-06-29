import React from "react";
import DownloadingList from "./downloadingList";
import AppBar from "@/components/base/appBar";
import { useI18N } from "@/core/i18n";
import PageShell from "@/components/base/pageShell";

export default function Downloading() {
    const { t } = useI18N();

    return (
        <PageShell
            appBar={<AppBar>{t("downloading.title")}</AppBar>}
            musicBar>
            <DownloadingList />
        </PageShell>
    );
}
