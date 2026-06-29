import React, { useCallback, useMemo, useState } from "react";
import rpx from "@/utils/rpx";
import PluginManager from "@/core/pluginManager";
import { TabView } from "react-native-tab-view";
import BoardPanelWrapper from "./boardPanelWrapper";
import NoPlugin from "@/components/base/noPlugin";
import i18n from "@/core/i18n";
import SourceTabBar from "@/components/base/sourceTabBar";

export default function TopListBody() {
    const routes = useMemo(
        () => PluginManager.getSortedPluginsWithAbility("getTopLists").map(_ => ({
            key: _.hash,
            title: _.name,
        })),
        [],
    );
    const [index, setIndex] = useState(0);

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
                index,
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
