import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";
import { CircularProgressBase } from "react-native-circular-progress-indicator";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showPanel } from "../panels/usePanel";
import useColors from "@/hooks/useColors";
import IconButton from "../base/iconButton";
import Theme from "@/core/theme";
import TrackPlayer, { useCurrentMusic, useMusicState, useProgress } from "@/core/trackPlayer";
import { musicIsPaused } from "@/utils/trackUtils";
import MusicInfo from "./musicInfo";
import Icon from "@/components/base/icon.tsx";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";

function CircularPlayBtn() {
    const progress = useProgress();
    const musicState = useMusicState();
    const colors = useColors();

    const isPaused = musicIsPaused(musicState);

    const activeColor = colors.progressActiveColor;
    const inactiveColor = colors.progressInactiveColor;
    const iconColor = colors.progressActiveColor;

    return (
        <CircularProgressBase
            activeStrokeWidth={rpx(4)}
            inActiveStrokeWidth={rpx(2)}
            inActiveStrokeOpacity={0.2}
            value={
                progress?.duration
                    ? (100 * progress.position) / progress.duration
                    : 0
            }
            duration={100}
            radius={rpx(36)}
            activeStrokeColor={activeColor}
            inActiveStrokeColor={inactiveColor}>
            <IconButton
                accessibilityLabel={"播放或暂停歌曲"}
                name={isPaused ? "play" : "pause"}
                sizeType={"normal"}
                hitSlop={{
                    top: 10,
                    left: 10,
                    right: 10,
                    bottom: 10,
                }}
                color={iconColor}
                onPress={async () => {
                    if (isPaused) {
                        await TrackPlayer.play();
                    } else {
                        await TrackPlayer.pause();
                    }
                }}
            />
        </CircularProgressBase>
    );
}

function MusicBar() {
    const musicItem = useCurrentMusic();
    const colors = useColors();
    const safeAreaInsets = useSafeAreaInsets();
    const theme = Theme.useTheme();

    const barBgColor = colors.musicBar ?? colors.surfacePrimary;
    const playlistIconColor = colors.playlistIconColor;

    const wrapperBorderRadius = theme.dark ? radius.md : radius.xl;

    return (
        <View
            style={[
                styles.wrapper,
                {
                    borderTopLeftRadius: wrapperBorderRadius,
                    borderTopRightRadius: wrapperBorderRadius,
                    backgroundColor: barBgColor,
                    paddingRight: safeAreaInsets.right + spacing.md,
                    shadowColor: colors.shadowMedium,
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 1,
                    shadowRadius: 8,
                    elevation: 8,
                },
            ]}
            accessible
            accessibilityLabel={`歌曲: ${musicItem?.title} 歌手: ${musicItem?.artist}`}
        >
            <MusicInfo musicItem={musicItem} />
            <View style={styles.actionGroup}>
                <CircularPlayBtn />
                <Icon
                    accessible
                    accessibilityLabel="播放列表"
                    name="playlist"
                    size={rpx(56)}
                    onPress={() => {
                        showPanel("PlayList");
                    }}
                    color={playlistIconColor}
                    style={[styles.actionIcon]}
                />
            </View>
        </View>
    );
}

export default memo(MusicBar);

const styles = StyleSheet.create({
    wrapper: {
        width: "100%",
        height: rpx(132),
        flexDirection: "row",
        alignItems: "center",
        overflow: "hidden",
    },
    actionGroup: {
        width: rpx(200),
        justifyContent: "flex-end",
        flexDirection: "row",
        alignItems: "center",
    },
    actionIcon: {
        marginLeft: rpx(36),
    },
});
