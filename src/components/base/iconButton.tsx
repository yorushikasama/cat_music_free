import React from "react";
import { ColorKey, colorMap, iconSizeConst } from "@/constants/uiConst";
import { TapGestureHandler } from "react-native-gesture-handler";
import { StyleSheet, View } from "react-native";
import useColors, { CustomizedColors } from "@/hooks/useColors";
import { SvgProps } from "react-native-svg";
import Icon, { IIconName } from "@/components/base/icon.tsx";

interface IIconButtonProps extends SvgProps {
    name: IIconName;
    style?: SvgProps["style"];
    sizeType?: keyof typeof iconSizeConst;
    fontColor?: ColorKey;
    color?: string;
    onPress?: () => void;
    accessibilityLabel?: string;
}

function getIconColor(colors: CustomizedColors, fontColor: ColorKey) {
    const value = colors[colorMap[fontColor]];
    return typeof value === "string" ? value : undefined;
}

export function IconButtonWithGesture(props: IIconButtonProps) {
    const {
        name,
        sizeType: size = "normal",
        fontColor = "normal",
        onPress,
        style,
        accessibilityLabel,
    } = props;
    const colors = useColors();
    const textSize = iconSizeConst[size];
    const color = getIconColor(colors, fontColor);
    return (
        <TapGestureHandler onActivated={onPress}>
            <View style={styles.wrapper}>
                <Icon
                    accessible
                    accessibilityLabel={accessibilityLabel}
                    name={name}
                    color={color}
                    style={[styles.icon, style]}
                    size={textSize}
                />
            </View>
        </TapGestureHandler>
    );
}

export default function IconButton(props: IIconButtonProps) {
    const { sizeType = "normal", fontColor = "normal", style, color, onPress, accessibilityLabel } = props;
    const colors = useColors();
    const size = iconSizeConst[sizeType];
    const iconColor = color ?? getIconColor(colors, fontColor);

    if (onPress) {
        return (
            <TapGestureHandler onActivated={onPress}>
                <View style={[styles.wrapper, { minWidth: size }, style]}>
                    <Icon
                        accessible
                        accessibilityLabel={accessibilityLabel}
                        name={props.name}
                        color={iconColor}
                        style={styles.icon}
                        size={size}
                    />
                </View>
            </TapGestureHandler>
        );
    }

    return (
        <Icon
            {...props}
            color={iconColor}
            style={[styles.icon, { minWidth: size }, style]}
            size={size}
        />
    );
}

const styles = StyleSheet.create({
    wrapper: {
        alignItems: "center",
        justifyContent: "center",
    },
    icon: {
        alignSelf: "center",
    },
});
