import ThemeText from "@/components/base/themeText";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import useColors from "@/hooks/useColors";
import React, { ReactNode } from "react";
import {
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";

interface ISettingSectionProps {
    title?: ReactNode;
    description?: ReactNode;
    children?: ReactNode;
    style?: StyleProp<ViewStyle>;
    cardStyle?: StyleProp<ViewStyle>;
}

export default function SettingSection(props: ISettingSectionProps) {
    const { title, description, children, style, cardStyle } = props;
    const colors = useColors();
    const hasHeader = title || description;

    return (
        <View style={[styles.section, style]}>
            {hasHeader ? (
                <View style={styles.header}>
                    {typeof title === "string" ? (
                        <ThemeText
                            fontSize="subTitle"
                            fontWeight="bold"
                            style={styles.title}>
                            {title}
                        </ThemeText>
                    ) : (
                        title
                    )}
                    {typeof description === "string" ? (
                        <ThemeText
                            fontSize="description"
                            fontColor="textSecondary"
                            lineHeight
                            style={styles.description}>
                            {description}
                        </ThemeText>
                    ) : (
                        description
                    )}
                </View>
            ) : null}
            <View
                style={[
                    styles.card,
                    {
                        backgroundColor: colors.surfacePrimary,
                        borderColor: colors.divider,
                    },
                    cardStyle,
                ]}>
                {children}
            </View>
        </View>
    );
}

export function SettingDivider() {
    const colors = useColors();

    return (
        <View
            style={[
                styles.divider,
                {
                    backgroundColor: colors.divider,
                },
            ]}
        />
    );
}

const styles = StyleSheet.create({
    section: {
        marginTop: spacing.xl,
        paddingHorizontal: spacing.md,
    },
    header: {
        marginBottom: spacing.md,
        paddingHorizontal: spacing.xs,
    },
    title: {
        letterSpacing: 0,
    },
    description: {
        marginTop: spacing.xs,
    },
    card: {
        borderRadius: radius.xl,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: "hidden",
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: spacing.lg,
    },
});
