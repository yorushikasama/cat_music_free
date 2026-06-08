import React, { useEffect, useMemo } from "react";
import rpx from "@/utils/rpx";
import { ImgAsset } from "@/constants/assetsConst";
import FastImage from "@/components/base/fastImage";
import useOrientation from "@/hooks/useOrientation";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useCurrentMusic, useMusicState } from "@/core/trackPlayer";
import { musicIsPaused } from "@/utils/trackUtils";
import globalStyle from "@/constants/globalStyle";
import { View, StyleSheet } from "react-native";
import Operations from "./operations";
import { showPanel } from "@/components/panels/usePanel.ts";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
    cancelAnimation,
} from "react-native-reanimated";

interface IProps {
    onTurnPageClick?: () => void;
}

export default function AlbumCover(props: IProps) {
    const { onTurnPageClick } = props;

    const musicItem = useCurrentMusic();
    const orientation = useOrientation();
    const musicState = useMusicState();
    const isPaused = musicIsPaused(musicState);

    const rotation = useSharedValue(0);

    const artworkSize = useMemo(() => {
        return orientation === "vertical" ? rpx(500) : rpx(260);
    }, [orientation]);

    useEffect(() => {
        if (isPaused) {
            cancelAnimation(rotation);
        } else {
            rotation.value = withRepeat(
                withTiming(rotation.value + 360, {
                    duration: 40000,
                    easing: Easing.linear,
                }),
                -1,
                false,
            );
        }
    }, [isPaused]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value % 360}deg` }],
    }));

    const longPress = Gesture.LongPress()
        .onStart(() => {
            if (musicItem?.artwork) {
                showPanel("ImageViewer", {
                    url: musicItem.artwork,
                });
            }
        })
        .runOnJS(true);

    const tap = Gesture.Tap()
        .onStart(() => {
            onTurnPageClick?.();
        })
        .runOnJS(true);

    const combineGesture = Gesture.Race(tap, longPress);

    return (
        <>
            <GestureDetector gesture={combineGesture}>
                <View style={globalStyle.fullCenter}>
                    <Animated.View style={[styles.cover, { width: artworkSize, height: artworkSize, borderRadius: artworkSize / 2 }, animatedStyle]}>
                        <FastImage
                            style={styles.coverImage}
                            source={musicItem?.artwork}
                            placeholderSource={ImgAsset.albumDefault}
                        />
                    </Animated.View>
                </View>
            </GestureDetector>
            <Operations />
        </>
    );
}

const styles = StyleSheet.create({
    cover: {
        overflow: "hidden",
    },
    coverImage: {
        position: "absolute",
        top: -1,
        left: -1,
        right: -1,
        bottom: -1,
    },
});
