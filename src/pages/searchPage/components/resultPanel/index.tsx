/**
 * 搜索结果面板 一级页
 */
import React, { memo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { vw } from "@/utils/rpx";
import { SceneMap, TabView } from "react-native-tab-view";
import ResultSubPanel from "./resultSubPanel";
import results from "./results";
import { useI18N } from "@/core/i18n";
import ResultTabBar from "./resultTabBar";

const routes = results;

const getRouterScene = (
    routeList: Array<{ key: ICommon.SupportMediaType; title: string }>,
) => {
    const scene: Record<string, () => React.ReactElement> = {};
    routeList.forEach(r => {
        scene[r.key] = () => <ResultSubPanel tab={r.key} />;
    });
    return SceneMap(scene);
};

const renderScene = getRouterScene(routes);

function ResultPanel() {
    const [index, setIndex] = useState(0);
    const { t } = useI18N();

    return (
        <View style={styles.wrapper}>
            <TabView
                lazy
                navigationState={{
                    index,
                    routes,
                }}
                renderTabBar={props => (
                    <ResultTabBar
                        {...props}
                        getLabel={route =>
                            route.i18nKey
                                ? t(route.i18nKey as any)
                                : route.title
                        }
                    />
                )}
                renderScene={renderScene}
                onIndexChange={setIndex}
                initialLayout={{ width: vw(100) }}
            />
        </View>
    );
}

export default memo(ResultPanel);

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
    },
});
