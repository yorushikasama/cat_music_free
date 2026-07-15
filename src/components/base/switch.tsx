import React, { useEffect } from "react";
import { Pressable, StyleSheet, SwitchProps, View } from "react-native";
import useColors from "@/hooks/useColors";
import rpx from "@/utils/rpx";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { timingConfig } from "@/constants/commonConst";
import { radius } from "@/constants/borderRadius";
import { getAccessibleSwitchColors } from "@/core/colorSafety";

interface IThemeSwitchProps extends SwitchProps {
    /** Let a larger parent row own interaction while retaining the same visual. */
    interactive?: boolean;
}

const trackWidth = Math.max(rpx(88), 44);
const trackHeight = Math.max(rpx(48), 24);
const thumbSize = trackHeight - rpx(6);
const thumbInset = rpx(3);
const thumbTranslation = trackWidth - thumbSize - thumbInset * 2;

export default function ThemeSwitch(props: IThemeSwitchProps) {
    const {
        value,
        onValueChange,
        disabled = false,
        interactive = true,
        accessibilityLabel,
        accessibilityHint,
        style,
    } = props;
    const colors = useColors();
    const sharedValue = useSharedValue(value ? 1 : 0);
    const trackColor = value
        ? colors.primary
        : colors.textSecondary ?? colors.text;
    const trackBackdrop =
        colors.surfacePrimary ??
        colors.pageBackground ??
        colors.background ??
        "#ffffff";
    const { thumbColor, thumbOutlineColor } = getAccessibleSwitchColors(
        trackColor,
        { backdrop: trackBackdrop },
    );

    useEffect(() => {
        sharedValue.value = value ? 1 : 0;
    }, [sharedValue, value]);

    const thumbStyle = useAnimatedStyle(() => ({
        transform: [
            {
                translateX: withTiming(
                    sharedValue.value * thumbTranslation,
                    timingConfig.animationNormal,
                ),
            },
        ],
    }));

    const track = (
        <View
            pointerEvents="none"
            style={[
                styles.track,
                {
                    backgroundColor: trackColor,
                },
                disabled ? styles.disabled : null,
            ]}>
            <Animated.View
                style={[
                    styles.thumb,
                    {
                        backgroundColor: thumbColor,
                        borderColor: thumbOutlineColor,
                    },
                    thumbStyle,
                ]}
            />
        </View>
    );

    if (!interactive) {
        return <View style={[styles.hitTarget, style]}>{track}</View>;
    }

    return (
        <Pressable
            accessibilityHint={accessibilityHint}
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="switch"
            accessibilityState={{ checked: !!value, disabled }}
            disabled={disabled}
            hitSlop={8}
            onPress={() => onValueChange?.(!value)}
            style={({ pressed }) => [
                styles.hitTarget,
                style,
                pressed && !disabled ? styles.pressed : null,
            ]}>
            {track}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    hitTarget: {
        minWidth: 48,
        minHeight: 48,
        alignItems: "center",
        justifyContent: "center",
    },
    pressed: {
        opacity: 0.76,
    },
    disabled: {
        opacity: 0.52,
    },
    track: {
        width: trackWidth,
        height: trackHeight,
        borderRadius: radius.pill,
        justifyContent: "center",
    },
    thumb: {
        width: thumbSize,
        height: thumbSize,
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        left: thumbInset,
    },
});
