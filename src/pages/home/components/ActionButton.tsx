import ThemeText from "@/components/base/themeText";
import useColors from "@/hooks/useColors";
import rpx from "@/utils/rpx";
import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import Icon, { IIconName } from "@/components/base/icon.tsx";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import { BlurView } from "@react-native-community/blur";
import Theme from "@/core/theme";

interface IActionButtonProps {
    iconName: IIconName;
    iconColor?: string;
    title: string;
    action?: () => void;
    style?: StyleProp<ViewStyle>;
}

export default function ActionButton(props: IActionButtonProps) {
    const { iconName, iconColor, title, action, style } = props;
    const colors = useColors();
    const theme = Theme.useTheme();
    return (
        <TouchableOpacity
            onPress={action}
            activeOpacity={0.7}
            style={[
                styles.wrapper,
                {
                    shadowColor: colors.shadow,
                },
                style,
            ]}>
            <BlurView
                style={StyleSheet.absoluteFill}
                blurType={theme.dark ? "dark" : "light"}
                blurAmount={8}
                reducedTransparencyFallbackColor={colors.surfaceSecondary}
            />
            <View style={styles.content}>
                <View
                    style={[
                        styles.iconContainer,
                        { backgroundColor: `${colors.surfaceTertiary}80` },
                    ]}>
                    <Icon
                        accessible={false}
                        name={iconName}
                        color={iconColor ?? colors.primary}
                        size={rpx(40)}
                    />
                </View>
                <ThemeText
                    accessible={false}
                    fontSize="description"
                    fontWeight="medium"
                    style={styles.text}>
                    {title}
                </ThemeText>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        minWidth: rpx(120),
        height: rpx(156),
        borderRadius: radius.md,
        flexGrow: 1,
        flexShrink: 0,
        overflow: "hidden",
        shadowOffset: { width: 0, height: rpx(4) },
        shadowOpacity: 0.1,
        shadowRadius: rpx(10),
        elevation: 3,
    },
    content: {
        flex: 1,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
    },
    iconContainer: {
        width: rpx(64),
        height: rpx(64),
        borderRadius: radius.lg,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: spacing.sm,
    },
    text: {
        marginTop: spacing.xs,
    },
});
