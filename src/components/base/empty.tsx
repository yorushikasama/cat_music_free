import React from "react";
import {
    Pressable,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
import rpx from "@/utils/rpx";
import ThemeText from "./themeText";
import { useI18N } from "@/core/i18n";
import Icon, { IIconName } from "@/components/base/icon";
import useColors from "@/hooks/useColors";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import Color from "color";

interface IEmptyProps {
    content?: string;
    title?: string;
    description?: string;
    icon?: IIconName;
    actionText?: string;
    minHeight?: number;
    onAction?: () => void;
    style?: StyleProp<ViewStyle>;
}
export default function Empty(props: IEmptyProps) {
    const { t } = useI18N();
    const colors = useColors();

    const title = props.title ?? props.content ?? t("common.emptyList");
    const iconColor = colors.primary;
    const iconBackground = Color(iconColor).alpha(0.12).rgb().string();
    const iconBorder = Color(iconColor).alpha(0.18).rgb().string();

    return (
        <View
            style={[
                style.wrapper,
                {
                    minHeight: props.minHeight ?? rpx(360),
                },
                props.style,
            ]}>
            <View
                style={[
                    style.iconWrapper,
                    {
                        backgroundColor: iconBackground,
                        borderColor: iconBorder,
                    },
                ]}>
                <Icon
                    name={props.icon ?? "archive-box-x-mark"}
                    size={rpx(52)}
                    color={iconColor}
                />
            </View>
            <ThemeText
                fontSize="title"
                fontWeight="semibold"
                style={style.title}>
                {title}
            </ThemeText>
            {props.description ? (
                <ThemeText
                    fontSize="subTitle"
                    fontColor="textSecondary"
                    lineHeight
                    style={style.description}>
                    {props.description}
                </ThemeText>
            ) : null}
            {props.actionText && props.onAction ? (
                <Pressable
                    accessibilityRole="button"
                    onPress={props.onAction}
                    style={({ pressed }) => [
                        style.actionButton,
                        {
                            backgroundColor: colors.surfaceSecondary,
                            borderColor: colors.divider,
                            opacity: pressed ? 0.78 : 1,
                        },
                    ]}>
                    <ThemeText fontWeight="medium" fontColor="primary">
                        {props.actionText}
                    </ThemeText>
                </Pressable>
            ) : null}
        </View>
    );
}

const style = StyleSheet.create({
    wrapper: {
        width: "100%",
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: spacing.xxl,
    },
    iconWrapper: {
        width: rpx(104),
        height: rpx(104),
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: spacing.md,
    },
    title: {
        textAlign: "center",
    },
    description: {
        textAlign: "center",
        marginTop: spacing.sm,
        maxWidth: rpx(520),
    },
    actionButton: {
        marginTop: spacing.lg,
        minHeight: rpx(64),
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.xl,
        alignItems: "center",
        justifyContent: "center",
    },
});
