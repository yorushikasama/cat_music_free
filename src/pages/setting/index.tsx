import React from "react";
import settingTypes from "./settingTypes";
import { useParams } from "@/core/router";
import HorizontalSafeAreaView from "@/components/base/horizontalSafeAreaView.tsx";
import { useI18N } from "@/core/i18n";
import PageShell from "@/components/base/pageShell";
import AppBar from "@/components/base/appBar";
import Empty from "@/components/base/empty";

export default function Setting() {
    const { type } = useParams<"setting">();
    const settingItem = settingTypes[type];

    const { t } = useI18N();

    if (!settingItem) {
        return (
            <PageShell appBar={<AppBar>{t("setting.unknown")}</AppBar>}>
                <Empty
                    icon="exclamation-circle"
                    title={t("setting.unknown")}
                    description={t("common.emptyListDescription")}
                />
            </PageShell>
        );
    }

    return (
        <PageShell
            appBar={settingItem.showNav === false ? null : (
                <AppBar>{t(settingItem.i18nKey as any)}</AppBar>
            )}
            horizontalEdges={type === "plugin" ? [] : ["left", "right"]}>
            {type === "plugin" ? (
                <settingItem.component />
            ) : (
                <HorizontalSafeAreaView style={{ width: "100%", flex: 1 }}>
                    <settingItem.component />
                </HorizontalSafeAreaView>
            )}
        </PageShell>
    );
}
