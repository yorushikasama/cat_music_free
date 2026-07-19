import useColors from "@/hooks/useColors";
import rpx from "@/utils/rpx";
import Color from "color";
import React, { useState } from "react";
import {
    Pressable,
    StyleSheet,
    TextInput,
    TextInputProps,
    View,
} from "react-native";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import ThemeText from "@/components/base/themeText";
import Icon from "@/components/base/icon";
import { useI18N } from "@/core/i18n";

type InputVariant = "filled" | "outlined" | "underline";

interface IInputProps extends TextInputProps {
    fontColor?: string;
    hasHorizontalPadding?: boolean;
    variant?: InputVariant;
    error?: boolean;
    errorMessage?: string;
    success?: boolean;
    onClear?: () => void;
    clearAccessibilityLabel?: string;
}

export default function Input(props: IInputProps) {
    const {
        fontColor,
        hasHorizontalPadding = true,
        variant = "filled",
        error = false,
        errorMessage,
        success = false,
        onClear,
        clearAccessibilityLabel,
        value,
        style,
        onFocus,
        onBlur,
        ...inputProps
    } = props;
    const colors = useColors();
    const { t } = useI18N();
    const [focused, setFocused] = useState(false);
    const canClear = !!onClear && typeof value === "string" && value.length > 0;

    const currentColor = fontColor ?? colors.text;

    const borderColor = error
        ? colors.danger
        : success
            ? colors.success
            : focused
                ? colors.primary
                : colors.divider ?? "rgba(0,0,0,0.1)";

    const borderWidth =
        focused || error || success
            ? 1.5
            : variant === "underline" || variant === "outlined"
                ? 1
                : 0;

    const variantStyle = (() => {
        switch (variant) {
        case "filled":
            return {
                backgroundColor:
                        colors.surfaceTertiary ?? colors.placeholder,
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

    const statusIcon = error ? "x-mark" : success ? "check" : null;
    const statusColor = error ? colors.danger : colors.success;

    return (
        <View style={styles.wrapper}>
            <TextInput
                {...inputProps}
                value={value}
                placeholderTextColor={Color(currentColor).alpha(0.5).toString()}
                onFocus={e => {
                    setFocused(true);
                    onFocus?.(e);
                }}
                onBlur={e => {
                    setFocused(false);
                    onBlur?.(e);
                }}
                style={[
                    hasHorizontalPadding
                        ? styles.container
                        : styles.containerWithoutPadding,
                    { color: currentColor },
                    variantStyle,
                    style,
                    canClear && styles.containerWithClearButton,
                ]}
            />
            {canClear ? (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                        clearAccessibilityLabel ?? t("common.clear")
                    }
                    android_ripple={{ color: colors.pressedOverlay }}
                    hitSlop={rpx(6)}
                    onPress={onClear}
                    style={({ pressed }) => [
                        styles.clearButton,
                        pressed && styles.clearButtonPressed,
                    ]}>
                    <Icon
                        name="x-mark"
                        size={rpx(20)}
                        color={colors.textSecondary}
                    />
                </Pressable>
            ) : null}
            {(error || success) && (
                <View style={styles.statusRow}>
                    {statusIcon && (
                        <Icon
                            name={statusIcon}
                            size={rpx(18)}
                            color={statusColor}
                            style={styles.statusIcon}
                        />
                    )}
                    {errorMessage && (
                        <ThemeText color={statusColor} fontSize="tag">
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
    containerWithClearButton: {
        paddingRight: rpx(58),
    },
    clearButton: {
        position: "absolute",
        top: spacing.xs,
        right: spacing.xs,
        width: rpx(44),
        height: rpx(44),
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
    },
    clearButtonPressed: {
        opacity: 0.62,
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
