import React from "react";
import { StyleSheet, View } from "react-native";

import ThemeText from "@/components/base/themeText";
import { spacing } from "@/constants/spacing";

interface ICompactMediaAppBarTitleProps {
    title?: string;
    label?: string;
    visible?: boolean;
    color?: string;
}

export default function CompactMediaAppBarTitle(
    props: ICompactMediaAppBarTitleProps,
) {
    const { title, label, visible, color } = props;

    return (
        <View style={styles.wrapper}>
            {label ? (
                <ThemeText
                    fontSize="description"
                    fontColor={color ? undefined : "appBarText"}
                    color={color}
                    opacity={visible ? 0.72 : 0}
                    numberOfLines={1}
                    style={styles.label}>
                    {label}
                </ThemeText>
            ) : null}
            <ThemeText
                fontSize="title"
                fontWeight="bold"
                fontColor={color ? undefined : "appBarText"}
                color={color}
                opacity={visible ? 1 : 0}
                numberOfLines={1}>
                {title || "--"}
            </ThemeText>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        justifyContent: "center",
        minWidth: 0,
    },
    label: {
        marginBottom: spacing.xs / 2,
    },
});
