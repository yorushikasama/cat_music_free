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
}
export default function (props: IButtonProps) {
    const { children, onPress, fontColor, hitSlop, withHorizontalPadding } =
        props;
    return (
        <Pressable
            {...props}
            style={[
                withHorizontalPadding
                    ? {
                        paddingHorizontal: spacing.md,
                    }
                    : null,
                props.style,
            ]}
            hitSlop={hitSlop ?? (withHorizontalPadding ? 0 : spacing.md)}
            onPress={onPress}
            accessible
            accessibilityLabel={children}>
            <ThemeText fontColor={fontColor}>{children}</ThemeText>
        </Pressable>
    );
}
