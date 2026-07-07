import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";
import { ROUTE_PATH, useNavigate } from "@/core/router";
import FastImage from "@/components/base/fastImage";
import ThemeText from "@/components/base/themeText";
import { ImgAsset } from "@/constants/assetsConst";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import useColors from "@/hooks/useColors";
import { getSheetCover } from "@/utils/mediaUtils";
import Color from "color";

interface ISheetItemProps {
    pluginHash: string;
    sheetInfo: IMusic.IMusicSheetItemBase;
}

export default function SheetItem(props: ISheetItemProps) {
    const { sheetInfo, pluginHash } = props ?? {};
    const navigate = useNavigate();
    const colors = useColors();

    return (
        <View style={style.itemOuter}>
            <Pressable
                style={({ pressed }) => [
                    style.card,
                    {
                        backgroundColor: colors.surfacePrimary,
                        borderColor: colors.controlBorder ?? colors.divider,
                        opacity: pressed ? 0.84 : 1,
                    },
                ]}
                onPress={() => {
                    navigate(ROUTE_PATH.PLUGIN_SHEET_DETAIL, {
                        pluginHash,
                        sheetInfo,
                    });
                }}>
                <View
                    style={[
                        style.coverWrap,
                        {
                            backgroundColor: colors.controlBackground,
                            borderColor: colors.controlBorder ?? colors.divider,
                        },
                    ]}>
                    <FastImage
                        style={style.cover}
                        source={getSheetCover(sheetInfo)}
                        placeholderSource={ImgAsset.albumDefault}
                    />
                    {sheetInfo?.platform ? (
                        <View
                            style={[
                                style.sourcePill,
                                {
                                    backgroundColor: Color(colors.surfacePrimary ?? colors.card)
                                        .alpha(0.9)
                                        .rgb()
                                        .string(),
                                    borderColor: colors.controlBorder ?? colors.divider,
                                },
                            ]}>
                            <ThemeText
                                numberOfLines={1}
                                fontSize="tag"
                                color={colors.textSecondary}>
                                {sheetInfo.platform}
                            </ThemeText>
                        </View>
                    ) : null}
                </View>
                <ThemeText
                    fontSize="description"
                    fontWeight="medium"
                    numberOfLines={2}
                    lineHeight
                    style={style.title}>
                    {sheetInfo?.title ?? ""}
                </ThemeText>
            </Pressable>
        </View>
    );
}
const style = StyleSheet.create({
    itemOuter: {
        width: "100%",
        paddingHorizontal: spacing.xs,
        paddingBottom: spacing.lg,
    },
    card: {
        width: "100%",
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        padding: spacing.xs,
    },
    coverWrap: {
        width: "100%",
        aspectRatio: 1,
        borderRadius: radius.md,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: "hidden",
    },
    cover: {
        width: "100%",
        height: "100%",
    },
    sourcePill: {
        position: "absolute",
        left: spacing.xs,
        bottom: spacing.xs,
        maxWidth: "84%",
        minHeight: rpx(30),
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.xs,
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        marginTop: spacing.sm,
    },
});
