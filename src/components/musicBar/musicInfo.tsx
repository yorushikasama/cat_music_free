import React, { memo, useLayoutEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Color from "color";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    SharedValue,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import rpx from "@/utils/rpx";

import FastImage from "../base/fastImage";
import ThemeText from "../base/themeText";
import { ImgAsset } from "@/constants/assetsConst";
import { timingConfig } from "@/constants/commonConst";
import { ROUTE_PATH, useNavigate } from "@/core/router";
import TrackPlayer, { usePlayList } from "@/core/trackPlayer";
import useColors from "@/hooks/useColors";
import { radius } from "@/constants/borderRadius";

interface IBarMusicItemProps {
    musicItem: IMusic.IMusicItem | null;
    activeIndex: number;
    transformSharedValue: SharedValue<number>;
    paddingLeft?: number;
}
function _BarMusicItem(props: IBarMusicItemProps) {
    const { musicItem, activeIndex, transformSharedValue, paddingLeft } = props;
    const colors = useColors();
    const safeAreaInsets = useSafeAreaInsets();

    const animatedStyles = useAnimatedStyle(() => {
        return {
            left: `${(transformSharedValue.value + activeIndex) * 100}%`,
        };
    }, [activeIndex]);

    if (!musicItem) {
        return null;
    }

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    paddingLeft: paddingLeft ?? rpx(24) + safeAreaInsets.left,
                },
                animatedStyles,
            ]}>
            <FastImage
                style={styles.artworkImg}
                source={musicItem.artwork}
                placeholderSource={ImgAsset.albumDefault}
            />
            <View style={styles.textWrapper}>
                <ThemeText
                    fontSize="subTitle"
                    fontColor="musicBarText"
                    numberOfLines={1}>
                    {musicItem?.title}
                </ThemeText>
                {musicItem?.artist ? (
                    <ThemeText
                        fontSize="description"
                        numberOfLines={1}
                        color={Color(colors.musicBarText)
                            .alpha(0.6)
                            .toString()}>
                        {musicItem.artist}
                    </ThemeText>
                ) : null}
            </View>
        </Animated.View>
    );
}

const BarMusicItem = memo(
    _BarMusicItem,
    (prev, curr) =>
        prev.musicItem === curr.musicItem &&
        prev.activeIndex === curr.activeIndex &&
        prev.paddingLeft === curr.paddingLeft,
);

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        width: "100%",
        alignItems: "center",
        position: "absolute",
    },
    textWrapper: {
        flexGrow: 1,
        flexShrink: 1,
    },
    artworkImg: {
        width: rpx(80),
        height: rpx(80),
        borderRadius: radius.md,
        marginRight: rpx(20),
    },
});

interface IMusicInfoProps {
    musicItem: IMusic.IMusicItem | null;
    paddingLeft?: number;
}

function skipMusicItem(direction: number) {
    if (direction === -1) {
        TrackPlayer.skipToNext();
    } else if (direction === 1) {
        TrackPlayer.skipToPrevious();
    }
}

export default function MusicInfo(props: IMusicInfoProps) {
    const { musicItem, paddingLeft } = props;
    const navigate = useNavigate();
    const playLists = usePlayList();
    const siblingMusicItems = useMemo(() => {
        if (!musicItem) {
            return {
                prev: null,
                next: null,
            };
        }
        return {
            prev: TrackPlayer.previousMusic,
            next: TrackPlayer.nextMusic,
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- playLists 变化时需要重新读取 TrackPlayer 的上一首/下一首缓存
    }, [musicItem, playLists]);

    const transformSharedValue = useSharedValue(0);

    const musicItemWidthValue = useSharedValue(0);

    const tapGesture = Gesture.Tap()
        .onStart(() => {
            navigate(ROUTE_PATH.MUSIC_DETAIL);
        })
        .runOnJS(true);

    useLayoutEffect(() => {
        transformSharedValue.value = 0;
    }, [musicItem, transformSharedValue]);

    const panGesture = Gesture.Pan()
        .minPointers(1)
        .maxPointers(1)
        .onUpdate(e => {
            if (musicItemWidthValue.value) {
                transformSharedValue.value =
                    e.translationX / musicItemWidthValue.value;
            }
        })
        .onEnd((e, success) => {
            if (!success) {
                transformSharedValue.value = withTiming(
                    0,
                    timingConfig.animationFast,
                );
            } else {
                const deltaX = e.translationX;
                const vX = e.velocityX;

                let skip = 0;
                if (musicItemWidthValue.value) {
                    const rate = deltaX / musicItemWidthValue.value;

                    if (Math.abs(rate) > 0.3) {
                        skip = vX > 0 ? 1 : -1;
                        transformSharedValue.value = withTiming(
                            skip,
                            timingConfig.animationFast,
                            () => {
                                runOnJS(skipMusicItem)(skip);
                            },
                        );
                    } else if (Math.abs(vX) > 1500) {
                        skip = vX > 0 ? 1 : -1;
                        transformSharedValue.value = skip;
                        runOnJS(skipMusicItem)(skip);
                    } else {
                        transformSharedValue.value = withTiming(
                            0,
                            timingConfig.animationFast,
                        );
                    }
                } else {
                    transformSharedValue.value = 0;
                }
            }
        });

    const gesture = Gesture.Race(panGesture, tapGesture);

    return (
        <GestureDetector gesture={gesture}>
            <View
                style={musicInfoStyles.infoContainer}
                onLayout={e => {
                    musicItemWidthValue.value = e.nativeEvent.layout.width;
                }}>
                <BarMusicItem
                    transformSharedValue={transformSharedValue}
                    musicItem={siblingMusicItems.prev}
                    activeIndex={-1}
                    paddingLeft={paddingLeft}
                />
                <BarMusicItem
                    transformSharedValue={transformSharedValue}
                    musicItem={musicItem}
                    activeIndex={0}
                    paddingLeft={paddingLeft}
                />
                <BarMusicItem
                    transformSharedValue={transformSharedValue}
                    musicItem={siblingMusicItems.next}
                    activeIndex={1}
                    paddingLeft={paddingLeft}
                />
            </View>
        </GestureDetector>
    );
}

const musicInfoStyles = StyleSheet.create({
    infoContainer: {
        flex: 1,
        height: "100%",
        alignItems: "center",
        flexDirection: "row",
        overflow: "hidden",
    },
});
