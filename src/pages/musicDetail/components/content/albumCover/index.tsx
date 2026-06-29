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
import useColors from "@/hooks/useColors";
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
    const colors = useColors();

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
    }, [isPaused, rotation]);

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
    const coverStageBackgroundColor = colors.hasCustomBackground
        ? colors.surfaceSecondary
        : "rgba(255,255,255,0.08)";

    return (
        <>
            <GestureDetector gesture={combineGesture}>
                <View style={globalStyle.fullCenter}>
                    <View
                        style={[
                            styles.coverStage,
                            {
                                width: artworkSize + rpx(44),
                                height: artworkSize + rpx(44),
                                borderRadius: (artworkSize + rpx(44)) / 2,
                                backgroundColor: coverStageBackgroundColor,
                                borderColor: colors.divider ?? "rgba(255,255,255,0.16)",
                                shadowColor: colors.shadowHeavy ?? colors.shadow ?? "#000",
                            },
                        ]}>
                        <View
                            style={[
                                styles.innerRing,
                                {
                                    width: artworkSize + rpx(18),
                                    height: artworkSize + rpx(18),
                                    borderRadius: (artworkSize + rpx(18)) / 2,
                                    borderColor: colors.divider ?? "rgba(255,255,255,0.16)",
                                },
                            ]}>
                            <Animated.View style={[styles.cover, { width: artworkSize, height: artworkSize, borderRadius: artworkSize / 2 }, animatedStyle]}>
                                <FastImage
                                    style={styles.coverImage}
                                    source={musicItem?.artwork}
                                    placeholderSource={ImgAsset.albumDefault}
                                />
                            </Animated.View>
                        </View>
                    </View>
                </View>
            </GestureDetector>
            <Operations />
        </>
    );
}

const styles = StyleSheet.create({
    coverStage: {
        justifyContent: "center",
        alignItems: "center",
        borderWidth: StyleSheet.hairlineWidth,
        shadowOffset: { width: 0, height: rpx(14) },
        shadowOpacity: 0.24,
        shadowRadius: rpx(22),
        elevation: 12,
    },
    innerRing: {
        justifyContent: "center",
        alignItems: "center",
        borderWidth: StyleSheet.hairlineWidth,
    },
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
