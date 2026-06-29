import React from "react";
import { Pressable, StyleSheet } from "react-native";
import rpx from "@/utils/rpx";
import useColors from "@/hooks/useColors";
import { iconSizeConst } from "@/constants/uiConst";
import Icon, { IIconName } from "@/components/base/icon.tsx";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";

interface IFabProps {
    icon?: IIconName;
    onPress?: () => void;
}
export default function Fab(props: IFabProps) {
    const { icon, onPress } = props;

    const colors = useColors();

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.container,
                {
                    backgroundColor: colors.primary,
                    shadowColor: colors.shadow,
                    opacity: pressed ? 0.84 : 1,
                },
            ]}>
            {icon ? (
                <Icon
                    name={icon}
                    color="#ffffff"
                    size={iconSizeConst.normal}
                />
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
