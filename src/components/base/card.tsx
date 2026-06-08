import React from "react";
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from "react-native";
import useColors from "@/hooks/useColors";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";

type CardVariant = "elevated" | "outlined" | "filled" | "glass";

interface ICardProps {
    variant?: CardVariant;
    style?: StyleProp<ViewStyle>;
    children?: React.ReactNode;
    onPress?: () => void;
    padding?: keyof typeof spacing;
}

export default function Card(props: ICardProps) {
    const { variant = "elevated", style, children, onPress, padding = "lg" } = props;
    const colors = useColors();

    const variantStyle: ViewStyle = (() => {
        switch (variant) {
        case "elevated":
            return {
                backgroundColor: colors.surfacePrimary ?? colors.card,
                shadowColor: colors.shadowLight ?? "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 1,
                shadowRadius: 3,
                elevation: 2,
            };
        case "outlined":
            return {
                backgroundColor: "transparent",
                borderWidth: 1,
                borderColor: colors.divider ?? "rgba(0,0,0,0.1)",
            };
        case "filled":
            return {
                backgroundColor: colors.surfaceSecondary ?? colors.backdrop,
            };
        case "glass":
            return {
                backgroundColor: (colors.surfacePrimary ?? colors.card) + "AA",
                shadowColor: colors.shadowMedium ?? "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 1,
                shadowRadius: 6,
                elevation: 4,
            };
        }
    })();

    const cardContent = (
        <View
            style={[
                styles.container,
                {
                    borderRadius: radius.md,
                    padding: spacing[padding],
                },
                variantStyle,
                style,
            ]}>
            {children}
        </View>
    );

    if (onPress) {
        return (
            <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
                {cardContent}
            </TouchableOpacity>
        );
    }

    return cardContent;
}

const styles = StyleSheet.create({
    container: {
        overflow: "hidden",
    },
});
