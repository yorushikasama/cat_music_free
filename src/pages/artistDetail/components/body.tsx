import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import rpx from "@/utils/rpx";
import { SceneMap, TabBar, TabView } from "react-native-tab-view";
import { fontWeightConst } from "@/constants/uiConst";
import ResultList from "./resultList";
import { useAtomValue } from "jotai";
import { queryResultAtom } from "../store/atoms";
import content from "./content";
import useColors from "@/hooks/useColors";
import { useI18N } from "@/core/i18n";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import Color from "color";

const sceneMap: Record<string, React.FC> = {
    album: BodyContentWrapper,
    music: BodyContentWrapper,
};

const routes = [
    {
        key: "music",
        i18nKey: "common.singleMusic",
        title: "单曲",
    },
    {
        key: "album",
        i18nKey: "common.album",
        title: "专辑",
    },
];

export default function Body() {
    const [index, setIndex] = useState(0);
    const colors = useColors();
    const { t } = useI18N();
    const activeBg = Color(colors.primary).alpha(0.12).rgb().string();
    const activeBorder = Color(colors.primary).alpha(0.18).rgb().string();
    const activeLabelStyle = {
        backgroundColor: activeBg,
        borderColor: activeBorder,
    };

    return (
        <TabView
            lazy
            style={style.wrapper}
            navigationState={{
                index,
                routes,
            }}
            renderTabBar={props => (
                <TabBar
                    {...props}
                    style={style.transparentColor}
                    contentContainerStyle={style.tabBarContent}
                    tabStyle={style.tab}
                    renderIndicator={() => null}
                    pressColor="transparent"
                    inactiveColor={colors.text}
                    activeColor={colors.primary}
                    renderLabel={({ route, focused, color }) => (
                        <View
                            style={[
                                style.label,
                                focused
                                    ? activeLabelStyle
                                    : style.inactiveLabel,
                            ]}>
                            <Text
                                numberOfLines={1}
                                style={[
                                    style.labelText,
                                    {
                                        fontWeight: focused
                                            ? fontWeightConst.bolder
                                            : fontWeightConst.medium,
                                        color,
                                    },
                                ]}>
                                {t(route.i18nKey as any) ?? route.title}
                            </Text>
                        </View>
                    )}
                />
            )}
            renderScene={SceneMap(sceneMap)}
            onIndexChange={setIndex}
            initialLayout={{ width: rpx(750) }}
        />
    );
}

export function BodyContentWrapper(props: any) {
    const tab: IArtist.ArtistMediaType = props.route.key;
    const queryResult = useAtomValue(queryResultAtom);

    const Component = content[tab];
    const renderItem = ({ item, index }: any) => (
        <Component item={item} index={index} />
    );

    return (
        <ResultList tab={tab} data={queryResult[tab]} renderItem={renderItem} />
    );
}

const style = StyleSheet.create({
    wrapper: {
        zIndex: 100,
    },
    transparentColor: {
        backgroundColor: "transparent",
        shadowColor: "transparent",
        borderColor: "transparent",
        minHeight: rpx(64),
    },
    tabBarContent: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xs,
        alignItems: "center",
    },
    tab: {
        width: "auto",
        minHeight: rpx(52),
        paddingHorizontal: 0,
    },
    label: {
        minWidth: rpx(104),
        height: rpx(44),
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.md,
        marginRight: spacing.xs,
        alignItems: "center",
        justifyContent: "center",
    },
    inactiveLabel: {
        backgroundColor: "transparent",
        borderColor: "transparent",
    },
    labelText: {
        textAlign: "center",
    },
});
