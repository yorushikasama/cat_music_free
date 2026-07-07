import React, { ReactNode, useState } from "react";
import {
    ImageRequireSource,
    Pressable,
    StyleSheet,
    View,
} from "react-native";

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
    cover?: string | ImageRequireSource;
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

    const tagTextColor = colors.accent ?? colors.primary;
    const platformTagTextStyle = { color: tagTextColor };
    const descriptionColor = colors.textSecondary ?? colors.text;
    const wrapperStyle = {
        backgroundColor: colors.hasCustomBackground
            ? colors.surfacePrimary ?? colors.card
            : "transparent",
        borderBottomColor: colors.controlBorder ?? colors.divider,
    };

    return (
        <View
            style={[
                styles.wrapper,
                wrapperStyle,
            ]}>
            <View style={styles.hero}>
                <View
                    style={[
                        styles.coverShadow,
                        {
                            borderColor: colors.controlBorder ?? colors.divider,
                            shadowColor: colors.shadowMedium ?? colors.shadow ?? "#000",
                        },
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
                                            backgroundColor: colors.selectedBackground,
                                            borderColor: colors.selectedBorder,
                                        },
                                    ]}
                                    style={platformTagTextStyle}
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
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        shadowOffset: { width: 0, height: rpx(5) },
        shadowOpacity: 0.12,
        shadowRadius: rpx(9),
        elevation: 4,
        backgroundColor: "transparent",
    },
    cover: {
        width: "100%",
        height: "100%",
        borderRadius: radius.lg,
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
