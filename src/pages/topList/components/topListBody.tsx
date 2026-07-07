import React, { useCallback, useEffect, useMemo, useState } from "react";
import rpx from "@/utils/rpx";
import { useSortedEnabledPluginsWithAbility } from "@/core/pluginManager";
import { TabView } from "react-native-tab-view";
import BoardPanelWrapper from "./boardPanelWrapper";
import NoPlugin from "@/components/base/noPlugin";
import i18n from "@/core/i18n";
import SourceTabBar from "@/components/base/sourceTabBar";

export default function TopListBody() {
    const plugins = useSortedEnabledPluginsWithAbility("getTopLists");
    const routes = useMemo(
        () => plugins.map(_ => ({
            key: _.hash,
            title: _.name,
        })),
        [plugins],
    );
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (index >= routes.length) {
            setIndex(Math.max(routes.length - 1, 0));
        }
    }, [index, routes.length]);
    const activeIndex = routes.length ? Math.min(index, routes.length - 1) : 0;

    const renderScene = useCallback(
        (props: { route: { key: string } }) => (
            <BoardPanelWrapper hash={props?.route?.key} />
        ),
        [],
    );
    if (!routes?.length) {
        return <NoPlugin notSupportType={i18n.t("topList.title")} />;
    }

    return (
        <TabView
            lazy
            navigationState={{
                index: activeIndex,
                routes,
            }}
            renderTabBar={props => (
                <SourceTabBar
                    {...props}
                    fallbackTitle={i18n.t("common.unknownName")}
                />
            )}
            renderScene={renderScene}
            onIndexChange={setIndex}
            initialLayout={{ width: rpx(750) }}
        />
    );
}
