import React, { ReactNode, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Color from "color";

import FastImage from "@/components/base/fastImage";
import Tag from "@/components/base/tag";
import ThemeText from "@/components/base/themeText";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import { ImgAsset } from "@/constants/assetsConst";
import { fontSizeConst } from "@/constants/uiConst";
import useColors from "@/hooks/useColors";
import rpx from "@/utils/rpx";

interface IMediaDetailHeaderProps {
    cover?: string;
    title?: string;
    subtitle?: string;
    description?: string;
    platform?: string;
    footer?: ReactNode;
}

export default function MediaDetailHeader(props: IMediaDetailHeaderProps) {
    const { cover, title, subtitle, description, platform, footer } = props;
    const colors = useColors();
    const [maxLines, setMaxLines] = useState<number | undefined>(4);

    const tagBgColor = Color(colors.primary).alpha(0.12).rgb().string();
    const tagTextColor = colors.accent ?? colors.primary;
    const descriptionColor = colors.textSecondary ?? colors.text;

    return (
        <View
            style={[
                styles.wrapper,
                {
                    backgroundColor: colors.surfacePrimary ?? colors.card,
                    borderBottomColor: colors.divider,
                },
            ]}>
            <View style={styles.hero}>
                <View
                    style={[
                        styles.coverShadow,
                        { shadowColor: colors.shadowMedium ?? colors.shadow ?? "#000" },
                    ]}>
                    <FastImage
                        style={styles.cover}
                        source={cover}
                        placeholderSource={ImgAsset.albumDefault}
                    />
                </View>
                <View style={styles.info}>
                    <View>
                        <ThemeText
                            fontSize="title"
                            fontWeight="bold"
                            numberOfLines={3}
                            lineHeight
                            style={styles.title}>
                            {title || "--"}
                        </ThemeText>
                        <View style={styles.metaRow}>
                            {subtitle ? (
                                <ThemeText
                                    fontSize="subTitle"
                                    fontColor="textSecondary"
                                    numberOfLines={1}
                                    style={styles.subtitle}>
                                    {subtitle}
                                </ThemeText>
                            ) : null}
                            {platform ? (
                                <Tag
                                    tagName={platform}
                                    containerStyle={[
                                        styles.platformTag,
                                        {
                                            backgroundColor: tagBgColor,
                                            borderColor: Color(colors.primary)
                                                .alpha(0.18)
                                                .rgb()
                                                .string(),
                                        },
                                    ]}
                                    style={{ color: tagTextColor }}
                                />
                            ) : null}
                        </View>
                    </View>
                    {description ? (
                        <Pressable
                            onPress={() => {
                                setMaxLines(maxLines ? undefined : 4);
                            }}
                            hitSlop={spacing.sm}>
                            <ThemeText
                                fontSize="description"
                                color={descriptionColor}
                                lineHeight
                                numberOfLines={maxLines}
                                style={styles.description}>
                                {description}
                            </ThemeText>
                        </Pressable>
                    ) : null}
                </View>
            </View>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        width: "100%",
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    hero: {
        width: "100%",
        minHeight: rpx(286),
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
        flexDirection: "row",
        alignItems: "center",
    },
    coverShadow: {
        width: rpx(216),
        height: rpx(216),
        borderRadius: radius.xl,
        shadowOffset: { width: 0, height: rpx(8) },
        shadowOpacity: 0.18,
        shadowRadius: rpx(12),
        elevation: 8,
        backgroundColor: "transparent",
    },
    cover: {
        width: "100%",
        height: "100%",
        borderRadius: radius.xl,
        overflow: "hidden",
    },
    info: {
        flex: 1,
        minHeight: rpx(216),
        marginLeft: spacing.lg,
        justifyContent: "center",
    },
    title: {
        lineHeight: fontSizeConst.title * 1.32,
    },
    metaRow: {
        minHeight: rpx(40),
        marginTop: spacing.sm,
        flexDirection: "row",
        alignItems: "center",
    },
    subtitle: {
        flexShrink: 1,
        marginRight: spacing.sm,
    },
    platformTag: {
        marginLeft: 0,
    },
    description: {
        marginTop: spacing.md,
    },
    footer: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
    },
});
