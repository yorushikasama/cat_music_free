import Icon from "@/components/base/icon";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import { fontSizeConst } from "@/constants/uiConst";
import useColors from "@/hooks/useColors";
import rpx from "@/utils/rpx";
import Color from "color";
import React, { useState } from "react";
import {
    Pressable,
    StyleProp,
    StyleSheet,
    TextInput,
    TextInputProps,
    View,
    ViewStyle,
} from "react-native";

interface ISearchInputProps extends TextInputProps {
    containerStyle?: StyleProp<ViewStyle>;
    onClear?: () => void;
}

export default function SearchInput(props: ISearchInputProps) {
    const {
        containerStyle,
        style,
        onClear,
        onPress,
        editable,
        value,
        placeholderTextColor,
        onFocus,
        onBlur,
        ...rest
    } = props;
    const colors = useColors();
    const [focused, setFocused] = useState(false);

    const textColor = colors.text;
    const hintColor =
        placeholderTextColor ?? Color(textColor).alpha(0.52).rgb().string();
    const hasValue = typeof value === "string" && value.length > 0;
    const canEdit = editable !== false && !onPress;

    const content = (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: colors.surfacePrimary ?? colors.card,
                    borderColor: focused
                        ? Color(colors.primary).alpha(0.5).rgb().string()
                        : colors.divider ?? Color(textColor).alpha(0.12).rgb().string(),
                },
                containerStyle,
            ]}>
            <Icon
                name="search"
                size={rpx(28)}
                color={hintColor as string}
                style={styles.searchIcon}
            />
            <TextInput
                {...rest}
                value={value}
                editable={canEdit}
                pointerEvents={onPress ? "none" : "auto"}
                placeholderTextColor={hintColor as string}
                onFocus={e => {
                    setFocused(true);
                    onFocus?.(e);
                }}
                onBlur={e => {
                    setFocused(false);
                    onBlur?.(e);
                }}
                style={[
                    styles.input,
                    {
                        color: textColor,
                    },
                    style,
                ]}
            />
            {onClear && hasValue ? (
                <Pressable
                    hitSlop={rpx(10)}
                    style={styles.clearButton}
                    onPress={onClear}>
                    <Icon
                        name="x-mark"
                        size={rpx(22)}
                        color={hintColor as string}
                    />
                </Pressable>
            ) : null}
        </View>
    );

    if (onPress) {
        return (
            <Pressable
                accessibilityRole="button"
                onPress={onPress}
                style={({ pressed }) => ({
                    opacity: pressed ? 0.82 : 1,
                })}>
                {content}
            </Pressable>
        );
    }

    return content;
}

const styles = StyleSheet.create({
    container: {
        minHeight: rpx(68),
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: "row",
        alignItems: "center",
        paddingLeft: spacing.md,
        paddingRight: spacing.sm,
    },
    searchIcon: {
        marginRight: spacing.sm,
    },
    input: {
        flex: 1,
        minWidth: 0,
        height: rpx(66),
        padding: 0,
        fontSize: fontSizeConst.subTitle,
        textAlignVertical: "center",
        includeFontPadding: false,
    },
    clearButton: {
        width: rpx(44),
        height: rpx(44),
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: spacing.xs,
    },
});
