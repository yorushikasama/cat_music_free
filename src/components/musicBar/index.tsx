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

type IMusicBarVariant = "default" | "floating";

interface IMusicBarProps {
    variant?: IMusicBarVariant;
}

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

function MusicBar(props: IMusicBarProps) {
    const { variant = "default" } = props;
    const musicItem = useCurrentMusic();
    const colors = useColors();
    const safeAreaInsets = useSafeAreaInsets();
    const theme = Theme.useTheme();

    const isFloating = variant === "floating";
    const barBgColor = colors.musicBar ?? colors.surfacePrimary;
    const playlistIconColor = colors.playlistIconColor;

    const wrapperBorderRadius = isFloating
        ? radius.xxl
        : theme.dark
            ? radius.md
            : radius.xl;
    const horizontalInset = isFloating ? spacing.md : 0;
    const musicInfoPaddingLeft = isFloating ? spacing.md : undefined;
    const wrapperVariantStyle = isFloating
        ? styles.floatingWrapper
        : styles.dockedWrapper;
    const actionGroupVariantStyle = isFloating
        ? styles.floatingActionGroup
        : null;
    const shadowStyle = isFloating
        ? styles.floatingShadow
        : styles.dockedShadow;

    return (
        <View
            style={[
                styles.wrapper,
                wrapperVariantStyle,
                shadowStyle,
                {
                    borderRadius: wrapperBorderRadius,
                    backgroundColor: barBgColor,
                    marginHorizontal: horizontalInset,
                    paddingRight:
                        (isFloating ? 0 : safeAreaInsets.right) + spacing.md,
                    shadowColor: colors.shadowMedium,
                },
            ]}
            accessible
            accessibilityLabel={`歌曲: ${musicItem?.title} 歌手: ${musicItem?.artist}`}
        >
            <MusicInfo
                musicItem={musicItem}
                paddingLeft={musicInfoPaddingLeft}
            />
            <View
                style={[
                    styles.actionGroup,
                    actionGroupVariantStyle,
                ]}>
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
        height: rpx(132),
        flexDirection: "row",
        alignItems: "center",
        overflow: "hidden",
    },
    dockedWrapper: {
        width: "100%",
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
    floatingWrapper: {
        height: rpx(112),
    },
    dockedShadow: {
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 8,
    },
    floatingShadow: {
        shadowOffset: { width: 0, height: rpx(8) },
        shadowOpacity: 0.18,
        shadowRadius: rpx(12),
        elevation: 10,
    },
    actionGroup: {
        width: rpx(200),
        justifyContent: "flex-end",
        flexDirection: "row",
        alignItems: "center",
    },
    floatingActionGroup: {
        width: rpx(172),
    },
    actionIcon: {
        marginLeft: rpx(28),
    },
});
