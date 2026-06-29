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
    const isRetro = theme.id === "p-retro";
    const isAcg = theme.id.startsWith("p-acg");
    const isSpotify = theme.id === "p-spotify";

    /*********** 控件颜色配置 ***********/
    const iconColor = colors.playControlIconColor ?? colors.text;
    const playBtnColor = colors.playControlBtnColor ?? colors.text;
    const playBtnBg = colors.playControlBtnBg ?? "transparent";
    const playBtnBorder = colors.playControlBtnBorder ?? colors.divider ?? "rgba(255,255,255,0.2)";
    const sideButtonBg = colors.surfaceSecondary ?? "transparent";
    const sideButtonBorder = colors.divider ?? "transparent";

    const isSpecialTheme = isSpotify || isAcg || isRetro;

    return (
        <>
            <View
                style={[
                    style.wrapper,
                    orientation === "horizontal" ? style.horizontalWrapper : null,
                ]}>
                {/* 循环模式按钮 */}
                <Pressable
                    style={[style.sideButton, { backgroundColor: sideButtonBg, borderColor: sideButtonBorder }]}
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
                    style={style.skipButton}
                    onPress={() => {
                        TrackPlayer.skipToPrevious();
                    }}>
                    <Icon
                        color={iconColor}
                        name={"skip-left"}
                        size={rpx(58)}
                    />
                </Pressable>
                {/* 播放/暂停按钮 */}
                <Pressable
                    style={[
                        style.playBtnWrapper,
                        isSpecialTheme && style.specialPlayBtn,
                        {
                            borderColor: playBtnBorder,
                            backgroundColor: playBtnBg,
                            shadowColor: colors.shadowMedium ?? colors.shadow ?? "#000",
                        },
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
                        name={musicIsPaused(musicState) ? "play" : "pause"}
                        size={rpx(80)}
                    />
                </Pressable>
                {/* 下一曲 */}
                <Pressable
                    style={style.skipButton}
                    onPress={() => {
                        TrackPlayer.skipToNext();
                    }}>
                    <Icon
                        color={iconColor}
                        name={"skip-right"}
                        size={rpx(58)}
                    />
                </Pressable>
                {/* 播放列表 */}
                <Pressable
                    style={[style.sideButton, { backgroundColor: sideButtonBg, borderColor: sideButtonBorder }]}
                    onPress={() => {
                        showPanel("PlayList");
                    }}>
                    <Icon
                        color={iconColor}
                        name={"playlist"}
                        size={rpx(42)}
                    />
                </Pressable>
            </View>
        </>
    );
}

const style = StyleSheet.create({
    wrapper: {
        width: "100%",
        marginTop: spacing.sm,
        height: rpx(126),
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: spacing.lg,
    },
    horizontalWrapper: {
        marginTop: 0,
    },
    sideButton: {
        width: rpx(72),
        height: rpx(72),
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        justifyContent: "center",
        alignItems: "center",
    },
    skipButton: {
        width: rpx(82),
        height: rpx(82),
        justifyContent: "center",
        alignItems: "center",
    },
    playBtnWrapper: {
        width: rpx(108),
        height: rpx(108),
        borderRadius: rpx(54),
        borderWidth: rpx(2),
        justifyContent: "center",
        alignItems: "center",
        shadowOffset: { width: 0, height: rpx(6) },
        shadowOpacity: 0.14,
        shadowRadius: rpx(10),
        elevation: 6,
    },
    specialPlayBtn: {
        width: rpx(120),
        height: rpx(120),
        borderRadius: rpx(60),
    },
});
