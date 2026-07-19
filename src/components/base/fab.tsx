import React from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";
import rpx from "@/utils/rpx";
import useColors from "@/hooks/useColors";
import { iconSizeConst } from "@/constants/uiConst";
import Icon, { IIconName } from "@/components/base/icon.tsx";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";

interface IFabProps {
    icon?: IIconName;
    onPress?: () => void;
    accessibilityLabel?: string;
    disabled?: boolean;
    loading?: boolean;
}
export default function Fab(props: IFabProps) {
    const {
        icon,
        onPress,
        accessibilityLabel,
        disabled = false,
        loading = false,
    } = props;

    const colors = useColors();
    const isDisabled = disabled || loading || !onPress;

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={
                accessibilityLabel ??
                (icon ? icon.replace(/-/g, " ") : undefined)
            }
            accessibilityState={{ busy: loading, disabled: isDisabled }}
            android_ripple={{ color: "rgba(255,255,255,0.24)" }}
            disabled={isDisabled}
            onPress={onPress}
            style={({ pressed }) => [
                styles.container,
                {
                    backgroundColor: colors.primary,
                    shadowColor: colors.shadow,
                    opacity: isDisabled ? 0.56 : pressed ? 0.84 : 1,
                },
            ]}>
            {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
            ) : icon ? (
                <Icon name={icon} color="#ffffff" size={iconSizeConst.normal} />
            ) : null}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        width: rpx(108),
        height: rpx(108),
        borderRadius: radius.pill,
        position: "absolute",
        zIndex: 10010,
        right: spacing.xxxl,
        bottom: spacing.xxxl,
        justifyContent: "center",
        alignItems: "center",
        shadowOffset: {
            width: 0,
            height: 5,
        },
        shadowOpacity: 0.34,
        shadowRadius: 6.27,

        elevation: 10,
    },
});
