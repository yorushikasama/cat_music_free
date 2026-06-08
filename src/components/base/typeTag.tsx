import React from "react";
import {
    ColorValue,
    StyleProp,
    StyleSheet,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import ThemeText from "@/components/base/themeText";
import useColors from "@/hooks/useColors";

interface ITypeTagProps {
    title: string;
    selected?: boolean;
    onPress?: () => void;
    backgroundColor?: ColorValue;
    style?: StyleProp<ViewStyle>;
}

export default function TypeTag(props: ITypeTagProps) {
    const {
        title,
        onPress,
        selected = false,
        // backgroundColor,
        style: _style,
    } = props;
    const colors = useColors();
    return (
        <TouchableOpacity onPress={onPress}>
            <View
                style={[
                    style.wrapper,
                    {
                        backgroundColor: colors.card,
                        borderColor: colors.divider,
                    },
                    _style,
                ]}>
                <ThemeText
                    fontSize="subTitle"
                    fontColor={selected ? "primary" : "text"}>
                    {title}
                </ThemeText>
            </View>
        </TouchableOpacity>
    );
}

const style = StyleSheet.create({
    wrapper: {
        flexGrow: 0,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        marginHorizontal: spacing.sm,
        borderWidth: 1,
        borderStyle: "solid",
    },
});
