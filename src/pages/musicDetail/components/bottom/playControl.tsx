import React from "react";
import { StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";

import repeatModeConst from "@/constants/repeatModeConst";
import Icon from "@/components/base/icon.tsx";
import { showPanel } from "@/components/panels/usePanel";
import TrackPlayer, { useMusicState, useRepeatMode } from "@/core/trackPlayer";
import Theme from "@/core/theme";
import useColors from "@/hooks/useColors";
import useOrientation from "@/hooks/useOrientation";
import { musicIsPaused } from "@/utils/trackUtils";

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

    const isSpecialTheme = isSpotify || isAcg || isRetro;

    return (
        <>
            <View
                style={[
                    style.wrapper,
                    orientation === "horizontal"
                        ? {
                            marginTop: 0,
                        }
                        : null,
                ]}>
                {/* 循环模式按钮 */}
                <Icon
                    color={iconColor}
                    name={repeatModeConst[repeatMode].icon}
                    size={rpx(48)}
                    onPress={() => {
                        TrackPlayer.toggleRepeatMode();
                    }}
                />
                <Icon
                    color={iconColor}
                    name={"skip-left"}
                    size={rpx(60)}
                    onPress={() => {
                        TrackPlayer.skipToPrevious();
                    }}
                />
                {/* 播放/暂停按钮 */}
                <View
                    style={[
                        style.playBtnWrapper,
                        isSpecialTheme && style.specialPlayBtn,
                        {
                            borderColor: playBtnBorder,
                            backgroundColor: playBtnBg,
                        },
                    ]}>
                    <Icon
                        color={playBtnColor}
                        name={musicIsPaused(musicState) ? "play" : "pause"}
                        size={rpx(80)}
                        onPress={() => {
                            if (musicIsPaused(musicState)) {
                                TrackPlayer.play();
                            } else {
                                TrackPlayer.pause();
                            }
                        }}
                    />
                </View>
                {/* 下一曲 */}
                <Icon
                    color={iconColor}
                    name={"skip-right"}
                    size={rpx(60)}
                    onPress={() => {
                        TrackPlayer.skipToNext();
                    }}
                />
                {/* 播放列表 */}
                <Icon
                    color={iconColor}
                    name={"playlist"}
                    size={rpx(48)}
                    onPress={() => {
                        showPanel("PlayList");
                    }}
                />
            </View>
        </>
    );
}

const style = StyleSheet.create({
    wrapper: {
        width: "100%",
        marginTop: rpx(24),
        height: rpx(140),
        flexDirection: "row",
        justifyContent: "space-evenly",
        alignItems: "center",
        paddingHorizontal: rpx(16),
    },
    playBtnWrapper: {
        width: rpx(108),
        height: rpx(108),
        borderRadius: rpx(54),
        borderWidth: rpx(2),
        justifyContent: "center",
        alignItems: "center",
    },
    specialPlayBtn: {
        width: rpx(120),
        height: rpx(120),
        borderRadius: rpx(60),
    },
});
