import React from "react";
import { Pressable } from "react-native";
import ThemeText from "./themeText";
import { spacing } from "@/constants/spacing";
import { CustomizedColors } from "@/hooks/useColors";

interface IButtonProps {
    withHorizontalPadding?: boolean;
    style?: any;
    hitSlop?: number;
    children: string;
    fontColor?: keyof CustomizedColors;
    onPress?: () => void;
    disabled?: boolean;
    loading?: boolean;
    accessibilityLabel?: string;
}
export default function (props: IButtonProps) {
    const {
        children,
        onPress,
        fontColor,
        hitSlop,
        withHorizontalPadding,
        disabled = false,
        loading = false,
        accessibilityLabel,
    } = props;
    const isDisabled = disabled || loading || !onPress;
    return (
        <Pressable
            {...props}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? children}
            accessibilityState={{
                busy: loading,
                disabled: isDisabled,
            }}
            android_ripple={{ color: "rgba(0,0,0,0.12)" }}
            disabled={isDisabled}
            style={({ pressed }) => [
                withHorizontalPadding
                    ? {
                        paddingHorizontal: spacing.md,
                    }
                    : null,
                isDisabled ? style.disabled : pressed ? style.pressed : null,
                props.style,
            ]}
            hitSlop={hitSlop ?? (withHorizontalPadding ? 0 : spacing.md)}
            onPress={onPress}
            accessible>
            <ThemeText fontColor={fontColor}>{children}</ThemeText>
        </Pressable>
    );
}

const style = {
    pressed: {
        opacity: 0.66,
    },
    disabled: {
        opacity: 0.5,
    },
};
