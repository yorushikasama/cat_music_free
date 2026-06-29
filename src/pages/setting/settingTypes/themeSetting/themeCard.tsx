import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";
import useColors from "@/hooks/useColors";
import ThemeText from "@/components/base/themeText";
import Image from "@/components/base/image";
import { ImgAsset } from "@/constants/assetsConst";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import Color from "color";

interface IThemeCardProps {
    selected?: boolean;
    preview?: string;
    onPress?: () => void;
    title?: string;
}
export default function ThemeCard(props: IThemeCardProps) {
    const { selected, preview, onPress, title } = props;

    const isPreviewColor = preview?.startsWith("#") ? true : false;

    const colors = useColors();

    return (
        <View style={styles.root}>
            <Pressable
                onPress={onPress}
                android_ripple={{
                    color: Color(colors.primary).alpha(0.08).rgb().string(),
                    borderless: false,
                }}
                style={[
                    styles.borderContainer,
                    {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: selected
                            ? colors.primary
                            : colors.divider,
                    },
                ]}>
                <View
                    style={[
                        styles.container,
                        isPreviewColor
                            ? {
                                backgroundColor: preview,
                            }
                            : null,
                    ]}>
                    {isPreviewColor ? null : (
                        <Image
                            style={styles.image}
                            uri={preview}
                            emptySrc={ImgAsset.add}
                        />
                    )}
                </View>
            </Pressable>
            <ThemeText
                numberOfLines={1}
                fontSize="subTitle"
                style={styles.title}
                fontColor={selected ? "primary" : "text"}>
                {title}
            </ThemeText>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        marginRight: spacing.md,
        marginBottom: spacing.lg,
    },
    borderContainer: {
        width: rpx(156),
        height: rpx(156),
        borderRadius: radius.xl,
        borderWidth: StyleSheet.hairlineWidth,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    container: {
        width: rpx(128),
        height: rpx(128),
        borderRadius: radius.md,
        overflow: "hidden",
    },
    title: {
        textAlign: "center",
        marginTop: spacing.sm,
        width: rpx(156),
    },
    image: {
        width: "100%",
        height: "100%",
        borderRadius: radius.md,
    },
});
