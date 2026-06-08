import {
    GestureResponderEvent,
    Insets,
    StyleProp,
    StyleSheet,
    TouchableOpacity,
    ViewStyle,
} from "react-native";
import useColors from "@/hooks/useColors";
import ThemeText from "@/components/base/themeText";
import React from "react";
import rpx from "@/utils/rpx";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import { fontSizeConst } from "@/constants/uiConst";
import { CustomizedColors } from "@/hooks/useColors";

type ButtonType = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "small" | "medium" | "large";

interface IButtonProps {
    type?: ButtonType;
    size?: ButtonSize;
    text: string;
    style?: StyleProp<ViewStyle>;
    onPress?: (evt: GestureResponderEvent) => void;
    disabled?: boolean;
    fontColor?: keyof CustomizedColors | string;
    hitSlop?: Insets;
}

const sizeConfig: Record<ButtonSize, { height: number; paddingHorizontal: number; fontSize: keyof typeof fontSizeConst }> = {
    small: { height: rpx(56), paddingHorizontal: spacing.md, fontSize: "subTitle" },
    medium: { height: rpx(72), paddingHorizontal: spacing.lg, fontSize: "content" },
    large: { height: rpx(88), paddingHorizontal: spacing.xl, fontSize: "title" },
};

export function Button(props: IButtonProps) {
    const { type = "primary", size = "medium", text, style, onPress, disabled = false, fontColor, hitSlop } = props;
    const colors = useColors();
    const cfg = sizeConfig[size];

    const bgMap: Record<ButtonType, string> = {
        primary: colors.primary,
        secondary: colors.surfaceTertiary ?? colors.placeholder ?? "#eaeaea",
        outline: "transparent",
        ghost: "transparent",
        danger: colors.danger ?? "#FC5F5F",
    };

    const textColorMap: Record<ButtonType, string> = {
        primary: "#ffffff",
        secondary: colors.text,
        outline: colors.primary,
        ghost: colors.textSecondary ?? colors.text,
        danger: "#ffffff",
    };

    const borderMap: Record<ButtonType, { width: number; color: string }> = {
        primary: { width: 0, color: "transparent" },
        secondary: { width: 0, color: "transparent" },
        outline: { width: 1, color: colors.primary },
        ghost: { width: 0, color: "transparent" },
        danger: { width: 0, color: "transparent" },
    };

    const border = borderMap[type];
    const resolvedFontColor = fontColor
        ? (colors[fontColor as keyof CustomizedColors] ?? fontColor)
        : textColorMap[type];

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPress ? () => onPress({} as GestureResponderEvent) : undefined}
            disabled={disabled}
            hitSlop={hitSlop}
            style={[
                styles.container,
                {
                    height: cfg.height,
                    paddingHorizontal: cfg.paddingHorizontal,
                    backgroundColor: bgMap[type],
                    borderRadius: radius.sm,
                    borderWidth: border.width,
                    borderColor: border.color,
                    opacity: disabled ? 0.4 : 1,
                },
                style,
            ]}>
            <ThemeText
                color={resolvedFontColor}
                fontSize={cfg.fontSize}
                fontWeight="medium">
                {text}
            </ThemeText>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexShrink: 0,
        justifyContent: "center",
        alignItems: "center",
    },
});
