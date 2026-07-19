import React from "react";
import {
    ActivityIndicator,
    StyleProp,
    StyleSheet,
    ViewStyle,
} from "react-native";
import { spacing } from "@/constants/spacing";
import ThemeText from "./themeText";
import { iconSizeConst } from "@/constants/uiConst";
import useColors from "@/hooks/useColors";
import { TouchableOpacity } from "react-native-gesture-handler";
import Icon, { IIconName } from "@/components/base/icon.tsx";
import { getIconAccessibilityLabel } from "@/utils/iconAccessibility";

interface IProps {
    icon: IIconName;
    onPress?: () => void;
    containerStyle?: StyleProp<ViewStyle>;
    children?: string;
    accessibilityLabel?: string;
    disabled?: boolean;
    loading?: boolean;
}
export default function (props: IProps) {
    const {
        icon,
        children,
        onPress,
        containerStyle,
        accessibilityLabel,
        disabled = false,
        loading = false,
    } = props;
    const colors = useColors();
    const isDisabled = disabled || loading || !onPress;

    return (
        <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={
                accessibilityLabel ??
                children ??
                getIconAccessibilityLabel(icon)
            }
            accessibilityState={{ busy: loading, disabled: isDisabled }}
            activeOpacity={0.7}
            disabled={isDisabled}
            style={[
                style.container,
                isDisabled && style.disabled,
                containerStyle,
            ]}
            onPress={onPress}>
            {loading ? (
                <ActivityIndicator color={colors.primary} size="small" />
            ) : (
                <Icon
                    name={icon}
                    size={iconSizeConst.light}
                    color={colors.text}
                />
            )}
            <ThemeText style={style.text} fontSize={"content"}>
                {children}
            </ThemeText>
        </TouchableOpacity>
    );
}

const style = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },
    text: {
        marginLeft: spacing.xs,
    },
    disabled: {
        opacity: 0.56,
    },
});
