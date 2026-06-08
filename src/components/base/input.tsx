import useColors from "@/hooks/useColors";
import rpx from "@/utils/rpx";
import Color from "color";
import React, { useState } from "react";
import { StyleSheet, TextInput, TextInputProps, View } from "react-native";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import ThemeText from "@/components/base/themeText";

type InputVariant = "filled" | "outlined" | "underline";

interface IInputProps extends TextInputProps {
    fontColor?: string;
    hasHorizontalPadding?: boolean;
    variant?: InputVariant;
    error?: boolean;
    errorMessage?: string;
    success?: boolean;
}

export default function Input(props: IInputProps) {
    const { fontColor, hasHorizontalPadding = true, variant = "filled", error = false, errorMessage, success = false } = props;
    const colors = useColors();
    const [focused, setFocused] = useState(false);

    const currentColor = fontColor ?? colors.text;

    const borderColor = error
        ? colors.danger
        : success
            ? colors.success
            : focused
                ? colors.primary
                : colors.divider ?? "rgba(0,0,0,0.1)";

    const borderWidth = focused || error || success ? 1.5 : variant === "underline" ? 1 : 0;

    const variantStyle = (() => {
        switch (variant) {
        case "filled":
            return {
                backgroundColor: colors.surfaceTertiary ?? colors.placeholder,
                borderRadius: radius.sm,
                borderBottomWidth: borderWidth,
                borderBottomColor: borderColor,
            };
        case "outlined":
            return {
                backgroundColor: "transparent",
                borderRadius: radius.sm,
                borderWidth: borderWidth,
                borderColor: borderColor,
            };
        case "underline":
            return {
                backgroundColor: "transparent",
                borderRadius: 0,
                borderBottomWidth: borderWidth,
                borderBottomColor: borderColor,
            };
        }
    })();

    const statusIcon = error ? "✕" : success ? "✓" : null;

    return (
        <View style={styles.wrapper}>
            <TextInput
                {...props}
                placeholderTextColor={Color(currentColor).alpha(0.5).toString()}
                onFocus={e => {
                    setFocused(true);
                    props.onFocus?.(e);
                }}
                onBlur={e => {
                    setFocused(false);
                    props.onBlur?.(e);
                }}
                style={[
                    hasHorizontalPadding ? styles.container : styles.containerWithoutPadding,
                    { color: currentColor },
                    variantStyle,
                    props?.style,
                ]}
            />
            {(error || success) && (
                <View style={styles.statusRow}>
                    {statusIcon && (
                        <ThemeText
                            color={error ? colors.danger : colors.success}
                            fontSize="tag"
                            style={styles.statusIcon}>
                            {statusIcon}
                        </ThemeText>
                    )}
                    {errorMessage && (
                        <ThemeText
                            color={error ? colors.danger : colors.success}
                            fontSize="tag">
                            {errorMessage}
                        </ThemeText>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        width: "100%",
    },
    container: {
        paddingVertical: rpx(16),
        paddingHorizontal: spacing.md,
    },
    containerWithoutPadding: {
        padding: 0,
    },
    statusRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: rpx(4),
        paddingHorizontal: spacing.md,
    },
    statusIcon: {
        marginRight: rpx(4),
    },
});
