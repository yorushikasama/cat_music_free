import NoPlugin from "@/components/base/noPlugin";
import { useI18N } from "@/core/i18n";
import PluginManager from "@/core/pluginManager";
import { vw } from "@/utils/rpx";
import React, { useState } from "react";
import { TabView } from "react-native-tab-view";
import SheetBody from "./sheetBody";
import SourceTabBar from "@/components/base/sourceTabBar";

export default function Body() {
    const [index, setIndex] = useState(0);
    const routes = PluginManager.getSortedPluginsWithAbility("getRecommendSheetsByTag").map(
        _ => ({
            key: _.hash,
            title: _.name,
        }),
    );
    const { t } = useI18N();

    const renderTabBar = (_: any) => (
        <SourceTabBar
            {..._}
            fallbackTitle={`(${t("common.unknownName")})`}
        />
    );

    if (!routes?.length) {
        return <NoPlugin notSupportType={t("recommendSheet.title")} />;
    }
    return (
        <TabView
            lazy
            navigationState={{
                index,
                routes,
            }}
            renderTabBar={renderTabBar}
            renderScene={props => {
                return <SheetBody hash={props.route.key} />;
            }}
            onIndexChange={setIndex}
            initialLayout={{ width: vw(100) }}
        />
    );
}
