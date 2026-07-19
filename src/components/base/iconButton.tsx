import React from "react";
import {
    ActivityIndicator,
    Insets,
    LayoutChangeEvent,
    Pressable,
    StyleProp,
    StyleSheet,
    ViewStyle,
} from "react-native";
import { ColorKey, colorMap, iconSizeConst } from "@/constants/uiConst";
import rpx from "@/utils/rpx";
import useColors, { CustomizedColors } from "@/hooks/useColors";
import Icon, { IIconName } from "@/components/base/icon.tsx";
import { getIconAccessibilityLabel } from "@/utils/iconAccessibility";

interface IIconButtonProps {
    name: IIconName;
    style?: StyleProp<ViewStyle>;
    sizeType?: keyof typeof iconSizeConst;
    fontColor?: ColorKey;
    color?: string;
    onPress?: () => void;
    onLayout?: (event: LayoutChangeEvent) => void;
    hitSlop?: Insets | number;
    disabled?: boolean;
    loading?: boolean;
    accessibilityLabel?: string;
    accessibilityHint?: string;
}

const minTouchSize = rpx(96);

function getIconColor(colors: CustomizedColors, fontColor: ColorKey) {
    const value = colors[colorMap[fontColor]];
    return typeof value === "string" ? value : undefined;
}

function InteractiveIconButton(props: IIconButtonProps) {
    const {
        name,
        sizeType = "normal",
        fontColor = "normal",
        style,
        color,
        onPress,
        onLayout,
        hitSlop,
        disabled = false,
        loading = false,
        accessibilityLabel,
        accessibilityHint,
    } = props;
    const colors = useColors();
    const size = iconSizeConst[sizeType];
    const iconColor = color ?? getIconColor(colors, fontColor);
    const isDisabled = disabled || loading;
    const defaultHitSlop = Math.max(0, (minTouchSize - size) / 2);

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={
                accessibilityLabel ?? getIconAccessibilityLabel(name)
            }
            accessibilityHint={accessibilityHint}
            accessibilityState={{
                busy: loading,
                disabled: isDisabled,
            }}
            android_ripple={{ color: colors.pressedOverlay }}
            disabled={isDisabled}
            hitSlop={hitSlop ?? defaultHitSlop}
            onLayout={onLayout}
            onPress={onPress}
            style={({ pressed }) => [
                styles.wrapper,
                {
                    minWidth: size,
                    minHeight: size,
                    opacity: isDisabled ? 0.48 : pressed ? 0.72 : 1,
                    backgroundColor: pressed
                        ? colors.pressedOverlay
                        : "transparent",
                },
                style,
            ]}>
            {loading ? (
                <ActivityIndicator
                    animating
                    color={iconColor ?? colors.primary}
                    size="small"
                />
            ) : (
                <Icon name={name} color={iconColor} size={size} />
            )}
        </Pressable>
    );
}

export function IconButtonWithGesture(props: IIconButtonProps) {
    return <InteractiveIconButton {...props} />;
}

export default function IconButton(props: IIconButtonProps) {
    const colors = useColors();

    if (props.onPress) {
        return <InteractiveIconButton {...props} />;
    }

    const {
        sizeType = "normal",
        fontColor = "normal",
        style,
        color,
        name,
    } = props;
    const size = iconSizeConst[sizeType];
    const iconColor = color ?? getIconColor(colors, fontColor);

    return (
        <Icon
            name={name}
            color={iconColor}
            style={[styles.icon, style]}
            size={size}
        />
    );
}

const styles = StyleSheet.create({
    wrapper: {
        alignItems: "center",
        borderRadius: rpx(48),
        justifyContent: "center",
        overflow: "hidden",
    },
    icon: {
        alignSelf: "center",
    },
});
