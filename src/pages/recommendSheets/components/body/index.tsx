import NoPlugin from "@/components/base/noPlugin";
import { useI18N } from "@/core/i18n";
import { useSortedEnabledPluginsWithAbility } from "@/core/pluginManager";
import { vw } from "@/utils/rpx";
import React, { useEffect, useMemo, useState } from "react";
import { TabView } from "react-native-tab-view";
import SheetBody from "./sheetBody";
import SourceTabBar from "@/components/base/sourceTabBar";

export default function Body() {
    const [index, setIndex] = useState(0);
    const plugins = useSortedEnabledPluginsWithAbility("getRecommendSheetsByTag");
    const routes = useMemo(
        () => plugins.map(_ => ({
            key: _.hash,
            title: _.name,
        })),
        [plugins],
    );
    const { t } = useI18N();

    useEffect(() => {
        if (index >= routes.length) {
            setIndex(Math.max(routes.length - 1, 0));
        }
    }, [index, routes.length]);
    const activeIndex = routes.length ? Math.min(index, routes.length - 1) : 0;

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
                index: activeIndex,
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
