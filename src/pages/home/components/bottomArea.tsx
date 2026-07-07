import React, { useEffect, useRef, useState } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomTabBar from "./bottomTabBar";
import MusicBar from "@/components/musicBar";
import { useCurrentMusic } from "@/core/trackPlayer";
import { timingConfig } from "@/constants/commonConst";
import {
    HOME_FLOATING_MUSIC_BAR_GAP,
    HOME_FLOATING_MUSIC_BAR_HEIGHT,
} from "./bottomAreaMetrics";

export default function BottomArea(props: BottomTabBarProps) {
    const musicItem = useCurrentMusic();
    const safeAreaInsets = useSafeAreaInsets();
    const [showKeyboard, setKeyboardStatus] = useState(false);
    const prevShouldShowRef = useRef(false);

    const barHeight = useSharedValue(0);

    const shouldShowBar = !!musicItem && !showKeyboard;

    useEffect(() => {
        const showSub = Keyboard.addListener("keyboardDidShow", () => {
            setKeyboardStatus(true);
        });
        const hideSub = Keyboard.addListener("keyboardDidHide", () => {
            setKeyboardStatus(false);
        });
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    useEffect(() => {
        if (shouldShowBar !== prevShouldShowRef.current) {
            prevShouldShowRef.current = shouldShowBar;
            barHeight.value = withTiming(
                shouldShowBar
                    ? HOME_FLOATING_MUSIC_BAR_HEIGHT + HOME_FLOATING_MUSIC_BAR_GAP
                    : 0,
                timingConfig.animationFast,
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- barHeight 是 Reanimated SharedValue（稳定引用），无需作为依赖
    }, [shouldShowBar]);

    const musicBarWrapperStyle = useAnimatedStyle(() => ({
        height: barHeight.value,
        paddingBottom: Math.min(barHeight.value, HOME_FLOATING_MUSIC_BAR_GAP),
    }));

    return (
        <View style={styles.container} pointerEvents="box-none">
            <Animated.View
                pointerEvents={shouldShowBar ? "auto" : "none"}
                style={[styles.musicBarWrapper, musicBarWrapperStyle]}>
                <MusicBar variant="floating" />
            </Animated.View>
            <BottomTabBar {...props} />
            <View style={{ height: safeAreaInsets.bottom }} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: "transparent",
    },
    musicBarWrapper: {
        overflow: "hidden",
    },
});
