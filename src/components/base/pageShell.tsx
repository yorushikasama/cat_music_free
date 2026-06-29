import React, { ReactNode } from "react";
import {
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
import { Edge, SafeAreaView } from "react-native-safe-area-context";

import MusicBar from "@/components/musicBar";
import PageBackground from "@/components/base/pageBackground";
import StatusBar from "@/components/base/statusBar";
import { MUSIC_BAR_HEIGHT } from "@/constants/layoutConst";
import useColors from "@/hooks/useColors";
import rpx from "@/utils/rpx";

interface IPageShellProps {
    children?: ReactNode;
    appBar?: ReactNode;
    bottom?: ReactNode;
    background?: ReactNode;
    withBackground?: boolean;
    withStatusBar?: boolean;
    statusBarBackgroundColor?: string;
    safeAreaEdges?: Edge[];
    horizontalEdges?: Edge[];
    musicBar?: boolean;
    musicBarVariant?: "default" | "floating";
    avoidMusicBar?: boolean;
    style?: StyleProp<ViewStyle>;
    safeAreaStyle?: StyleProp<ViewStyle>;
    contentStyle?: StyleProp<ViewStyle>;
}

export default function PageShell(props: IPageShellProps) {
    const {
        children,
        appBar,
        bottom,
        background,
        withBackground = true,
        withStatusBar = true,
        statusBarBackgroundColor = "transparent",
        safeAreaEdges = ["top", "bottom"],
        horizontalEdges = ["left", "right"],
        musicBar,
        musicBarVariant = "default",
        avoidMusicBar = false,
        style,
        safeAreaStyle,
        contentStyle,
    } = props;
    const colors = useColors();

    return (
        <View
            style={[
                styles.root,
                {
                    backgroundColor: colors.pageBackground,
                },
                style,
            ]}>
            {withBackground ? <PageBackground /> : null}
            {background}
            <SafeAreaView
                edges={safeAreaEdges}
                style={[styles.safeArea, safeAreaStyle]}>
                {withStatusBar ? (
                    <StatusBar backgroundColor={statusBarBackgroundColor} />
                ) : null}
                {appBar}
                <SafeAreaView
                    edges={horizontalEdges}
                    style={styles.contentSafeArea}>
                    <View
                        style={[
                            styles.content,
                            avoidMusicBar ? styles.avoidMusicBar : null,
                            contentStyle,
                        ]}>
                        {children}
                    </View>
                </SafeAreaView>
                {bottom ?? (musicBar ? (
                    <MusicBar variant={musicBarVariant} />
                ) : null)}
            </SafeAreaView>
        </View>
    );
}

export const pageShellInsets = {
    musicBar: MUSIC_BAR_HEIGHT + rpx(48),
};

const styles = StyleSheet.create({
    root: {
        width: "100%",
        flex: 1,
    },
    safeArea: {
        width: "100%",
        flex: 1,
    },
    contentSafeArea: {
        width: "100%",
        flex: 1,
    },
    content: {
        width: "100%",
        flex: 1,
    },
    avoidMusicBar: {
        paddingBottom: pageShellInsets.musicBar,
    },
});
