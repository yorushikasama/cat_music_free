import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";

import repeatModeConst from "@/constants/repeatModeConst";
import Icon from "@/components/base/icon.tsx";
import { showPanel } from "@/components/panels/usePanel";
import TrackPlayer, { useMusicState, useRepeatMode } from "@/core/trackPlayer";
import Theme from "@/core/theme";
import useColors from "@/hooks/useColors";
import useOrientation from "@/hooks/useOrientation";
import { musicIsPaused } from "@/utils/trackUtils";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import { getDetailControlPalette } from "../controlPalette";

/**
 * 播放控制组件
 * 包含循环模式、上一曲、播放/暂停、下一曲、播放列表五个控制按钮
 * 根据当前主题动态调整按钮颜色和样式
 */
export default function PlayControl() {
    const repeatMode = useRepeatMode();
    const musicState = useMusicState();

    const orientation = useOrientation();
    const theme = Theme.useTheme();
    const colors = useColors();
    const palette = getDetailControlPalette(colors);
    const isRetro = theme.id === "p-retro";
    const isAcg = theme.id.startsWith("p-acg");
    const isSpotify = theme.id === "p-spotify";
    const isPaused = musicIsPaused(musicState);

    /*********** 控件颜色配置 ***********/
    const iconColor = palette.iconColor;
    const mutedIconColor = palette.mutedIconColor;
    const playBtnBg =
        colors.playControlBtnBg ?? palette.buttonSurface ?? colors.primary;
    const playBtnColor = colors.playControlBtnColor ?? colors.primary;
    const playBtnBorder =
        colors.playControlBtnBorder ?? palette.borderColor ?? "transparent";
    const sideButtonBg = palette.buttonSurface;
    const sideButtonBorder = palette.borderColor;
    const pressedOverlay = palette.pressedOverlay;

    const isSpecialTheme = isSpotify || isAcg || isRetro;

    return (
        <>
            <View
                style={[
                    style.wrapper,
                    orientation === "horizontal"
                        ? style.horizontalWrapper
                        : null,
                ]}>
                {/* 循环模式按钮 */}
                <Pressable
                    style={({ pressed }) => [
                        style.sideButton,
                        {
                            backgroundColor: sideButtonBg,
                            borderColor: sideButtonBorder,
                            shadowColor:
                                colors.shadowMedium ?? colors.shadow ?? "#000",
                        },
                        pressed ? { backgroundColor: pressedOverlay } : null,
                    ]}
                    onPress={() => {
                        TrackPlayer.toggleRepeatMode();
                    }}>
                    <Icon
                        color={iconColor}
                        name={repeatModeConst[repeatMode].icon}
                        size={rpx(42)}
                    />
                </Pressable>
                <Pressable
                    style={({ pressed }) => [
                        style.skipButton,
                        pressed ? { backgroundColor: pressedOverlay } : null,
                    ]}
                    onPress={() => {
                        TrackPlayer.skipToPrevious();
                    }}>
                    <Icon
                        color={mutedIconColor}
                        name={"skip-left"}
                        size={rpx(58)}
                    />
                </Pressable>
                {/* 播放/暂停按钮 */}
                <Pressable
                    style={({ pressed }) => [
                        style.playBtnWrapper,
                        isSpecialTheme && style.specialPlayBtn,
                        {
                            borderColor: playBtnBorder,
                            backgroundColor: playBtnBg,
                            shadowColor:
                                colors.shadowMedium ?? colors.shadow ?? "#000",
                        },
                        pressed ? style.playBtnPressed : null,
                    ]}
                    onPress={() => {
                        if (musicIsPaused(musicState)) {
                            TrackPlayer.play();
                        } else {
                            TrackPlayer.pause();
                        }
                    }}>
                    <Icon
                        color={playBtnColor}
                        name={isPaused ? "play" : "pause"}
                        size={isPaused ? rpx(56) : rpx(52)}
                    />
                </Pressable>
                {/* 下一曲 */}
                <Pressable
                    style={({ pressed }) => [
                        style.skipButton,
                        pressed ? { backgroundColor: pressedOverlay } : null,
                    ]}
                    onPress={() => {
                        TrackPlayer.skipToNext();
                    }}>
                    <Icon
                        color={mutedIconColor}
                        name={"skip-right"}
                        size={rpx(58)}
                    />
                </Pressable>
                {/* 播放列表 */}
                <Pressable
                    style={({ pressed }) => [
                        style.sideButton,
                        {
                            backgroundColor: sideButtonBg,
                            borderColor: sideButtonBorder,
                            shadowColor:
                                colors.shadowMedium ?? colors.shadow ?? "#000",
                        },
                        pressed ? { backgroundColor: pressedOverlay } : null,
                    ]}
                    onPress={() => {
                        showPanel("PlayList");
                    }}>
                    <Icon color={iconColor} name={"playlist"} size={rpx(42)} />
                </Pressable>
            </View>
        </>
    );
}

const style = StyleSheet.create({
    wrapper: {
        width: "100%",
        marginTop: spacing.xs,
        height: rpx(108),
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: spacing.md,
    },
    horizontalWrapper: {
        marginTop: 0,
    },
    sideButton: {
        width: rpx(62),
        height: rpx(62),
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        justifyContent: "center",
        alignItems: "center",
        shadowOffset: { width: 0, height: rpx(2) },
        shadowOpacity: 0.03,
        shadowRadius: rpx(5),
        elevation: 1,
    },
    skipButton: {
        width: rpx(76),
        height: rpx(76),
        borderRadius: radius.pill,
        justifyContent: "center",
        alignItems: "center",
    },
    playBtnWrapper: {
        width: rpx(96),
        height: rpx(96),
        borderRadius: rpx(48),
        borderWidth: StyleSheet.hairlineWidth,
        justifyContent: "center",
        alignItems: "center",
        shadowOffset: { width: 0, height: rpx(3) },
        shadowOpacity: 0.08,
        shadowRadius: rpx(7),
        elevation: 3,
    },
    playBtnPressed: {
        opacity: 0.82,
    },
    specialPlayBtn: {
        width: rpx(102),
        height: rpx(102),
        borderRadius: rpx(51),
    },
});
