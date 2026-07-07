import React from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";
import useColors from "@/hooks/useColors";
import ThemeText from "@/components/base/themeText";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";

interface ILogoCardProps {
    selected?: boolean;
    logo: number;
    onPress?: () => void;
    title?: string;
}
export default function LogoCard(props: ILogoCardProps) {
    const { selected, logo, onPress, title } = props;

    const colors = useColors();

    return (
        <View>
            <Pressable
                onPress={onPress}
                style={[
                    styles.borderContainer,
                    {
                        backgroundColor: selected
                            ? colors.selectedBackground
                            : colors.controlBackground,
                        borderColor: selected
                            ? colors.selectedBorder
                            : colors.controlBorder ?? colors.divider,
                    },
                ]}>
                <View style={styles.imageContainer}>
                    <Image style={styles.image} source={logo} />
                </View>
            </Pressable>
            <ThemeText
                numberOfLines={1}
                fontSize="description"
                fontWeight={selected ? "semibold" : "medium"}
                style={styles.title}
                fontColor={selected ? "primary" : "text"}>
                {title}
            </ThemeText>
        </View>
    );
}

const styles = StyleSheet.create({
    borderContainer: {
        width: rpx(160),
        height: rpx(160),
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        marginRight: spacing.md,
        justifyContent: "center",
        alignItems: "center",
    },
    imageContainer: {
        width: rpx(136),
        height: rpx(136),
        borderRadius: radius.md,
        overflow: "hidden",
    },
    title: {
        textAlign: "center",
        marginTop: spacing.sm,
        width: rpx(160),
    },
    image: {
        width: "100%",
        height: "100%",
        borderRadius: radius.md,
    },
});
