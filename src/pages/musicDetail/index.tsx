import globalStyle from "@/constants/globalStyle";
import useOrientation from "@/hooks/useOrientation";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import PageShell from "@/components/base/pageShell";
import Background from "./components/background";
import Bottom from "./components/bottom";
import Content from "./components/content";
import Lyric from "./components/content/lyric";
import NavBar from "./components/navBar";
import Config from "@/core/appConfig";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";

export default function MusicDetail() {
    const orientation = useOrientation();

    useEffect(() => {
        const needAwake = Config.getConfig("basic.musicDetailAwake");
        if (needAwake) {
            activateKeepAwakeAsync();
        }
        return () => {
            if (needAwake) {
                deactivateKeepAwake();
            }
        };
    }, []);

    return (
        <PageShell
            background={<Background />}
            withBackground={false}
            statusBarBackgroundColor="transparent"
            horizontalEdges={[]}
            contentStyle={style.content}>
            <View style={style.bodyWrapper}>
                <View style={globalStyle.flex1}>
                    <NavBar />
                    <Content />
                    <Bottom />
                </View>
                {orientation === "horizontal" ? (
                    <View style={globalStyle.flex1}>
                        <Lyric />
                    </View>
                ) : null}
            </View>
        </PageShell>
    );
}

const style = StyleSheet.create({
    content: {
        backgroundColor: "transparent",
    },
    bodyWrapper: {
        width: "100%",
        flex: 1,
        flexDirection: "row",
    },
});
