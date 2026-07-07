import React from "react";
import { StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";
import SeekBar from "./seekBar";
import PlayControl from "./playControl";
import useOrientation from "@/hooks/useOrientation";
import useColors from "@/hooks/useColors";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import { getDetailControlPalette } from "../controlPalette";

export default function Bottom() {
    const orientation = useOrientation();
    const colors = useColors();
    const palette = getDetailControlPalette(colors);
    const isHorizontal = orientation === "horizontal";
    const showConsoleSurface = colors.hasCustomBackground;
    const consoleSurfaceStyle = {
        backgroundColor: showConsoleSurface
            ? palette.panelSurface
            : "transparent",
        borderColor: showConsoleSurface ? palette.borderColor : "transparent",
        shadowColor: colors.shadowMedium ?? colors.shadow ?? "#000",
        shadowOpacity: showConsoleSurface ? 0.03 : 0,
        elevation: showConsoleSurface ? 1 : 0,
    };

    return (
        <View
            style={[
                style.wrapper,
                isHorizontal ? style.horizontalWrapper : undefined,
            ]}>
            <View
                style={[
                    style.console,
                    isHorizontal ? style.horizontalConsole : undefined,
                    consoleSurfaceStyle,
                ]}>
                <SeekBar />
                <PlayControl />
            </View>
        </View>
    );
}

const style = StyleSheet.create({
    wrapper: {
        width: "100%",
        height: rpx(220),
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.lg,
        justifyContent: "flex-end",
    },
    horizontalWrapper: {
        height: rpx(138),
        paddingBottom: spacing.sm,
    },
    console: {
        width: "100%",
        alignSelf: "center",
        maxWidth: rpx(650),
        minHeight: rpx(184),
        borderRadius: radius.xxl,
        borderWidth: StyleSheet.hairlineWidth,
        paddingTop: spacing.xs,
        paddingBottom: spacing.xs,
        shadowOffset: { width: 0, height: rpx(3) },
        shadowOpacity: 0.03,
        shadowRadius: rpx(7),
        elevation: 1,
    },
    horizontalConsole: {
        minHeight: rpx(124),
        borderRadius: radius.xl,
        paddingTop: 0,
        paddingBottom: 0,
    },
});
