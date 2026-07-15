import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Color from "color";
import rpx from "@/utils/rpx";
import useColors, { CustomizedColors } from "@/hooks/useColors";
import ThemeText from "@/components/base/themeText";
import ThemePreview, {
    ThemePreviewEffect,
} from "@/components/base/themePreview";
import Icon from "@/components/base/icon";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import { getReadableTextColor } from "@/core/colorSafety";

interface IThemeCardProps {
    selected?: boolean;
    previewColors: Partial<CustomizedColors>;
    previewEffect?: ThemePreviewEffect;
    onPress?: () => void;
    title: string;
    description?: string;
}

export default function ThemeCard(props: IThemeCardProps) {
    const {
        selected = false,
        previewColors,
        previewEffect,
        onPress,
        title,
        description,
    } = props;
    const colors = useColors();

    return (
        <Pressable
            accessibilityHint={description}
            accessibilityLabel={title}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            android_ripple={{
                color: Color(colors.primary).alpha(0.12).rgb().string(),
                borderless: false,
            }}
            onPress={onPress}
            style={({ pressed }) => [
                styles.root,
                {
                    backgroundColor: selected
                        ? colors.selectedBackground
                        : colors.controlBackground,
                    borderColor: selected
                        ? colors.selectedBorder
                        : colors.controlBorder ?? colors.divider,
                    borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
                },
                pressed ? styles.pressed : null,
            ]}>
            <ThemePreview
                colors={previewColors}
                effect={previewEffect}
                style={styles.preview}
            />
            <View style={styles.titleRow}>
                <ThemeText
                    numberOfLines={2}
                    fontSize="subTitle"
                    fontWeight={selected ? "semibold" : "medium"}
                    fontColor="text"
                    style={styles.title}>
                    {title}
                </ThemeText>
                {selected ? (
                    <View
                        accessible={false}
                        style={[
                            styles.selectedMark,
                            { backgroundColor: colors.primary },
                        ]}>
                        <Icon
                            name="check"
                            size={rpx(18)}
                            color={getReadableTextColor(colors.primary, {
                                backdrop:
                                    colors.selectedBackground ??
                                    colors.surfacePrimary,
                            })}
                        />
                    </View>
                ) : null}
            </View>
            {description ? (
                <ThemeText
                    numberOfLines={2}
                    fontSize="description"
                    fontColor="textSecondary"
                    style={styles.description}>
                    {description}
                </ThemeText>
            ) : null}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    root: {
        width: rpx(224),
        minHeight: rpx(278),
        marginRight: spacing.md,
        marginBottom: spacing.lg,
        padding: spacing.sm,
        borderRadius: radius.lg,
        overflow: "hidden",
    },
    pressed: {
        opacity: 0.86,
    },
    preview: {
        width: "100%",
    },
    titleRow: {
        minHeight: rpx(44),
        flexDirection: "row",
        alignItems: "center",
        marginTop: spacing.sm,
    },
    title: {
        flex: 1,
        minWidth: 0,
    },
    selectedMark: {
        width: rpx(36),
        height: rpx(36),
        marginLeft: spacing.xs,
        borderRadius: radius.pill,
        justifyContent: "center",
        alignItems: "center",
    },
    description: {
        marginTop: spacing.xs,
        minHeight: rpx(42),
    },
});
