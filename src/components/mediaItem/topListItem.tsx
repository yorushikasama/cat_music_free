import React from "react";
import { StyleSheet, View } from "react-native";

import ListItem from "@/components/base/listItem";
import { ImgAsset } from "@/constants/assetsConst";
import { ROUTE_PATH, useNavigate } from "@/core/router";
import ThemeText from "@/components/base/themeText";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import useColors from "@/hooks/useColors";
import { getSheetCover } from "@/utils/mediaUtils";
import rpx from "@/utils/rpx";

interface ITopListResultsProps {
    pluginHash: string;
    topListItem: IMusic.IMusicSheetItemBase;
}

export default function TopListItem(props: ITopListResultsProps) {
    const { pluginHash, topListItem } = props;
    const navigate = useNavigate();
    const colors = useColors();
    const description = topListItem.description?.replace(/<br\s*\/?>/gi, " ");

    return (
        <ListItem
            withHorizontalPadding
            heightType="none"
            style={[
                styles.row,
                {
                    backgroundColor: colors.surfacePrimary,
                    borderColor: colors.controlBorder ?? colors.divider,
                },
            ]}
            onPress={() => {
                navigate(ROUTE_PATH.TOP_LIST_DETAIL, {
                    pluginHash: pluginHash,
                    topList: topListItem,
                });
            }}>
            <ListItem.ListItemImage
                uri={getSheetCover(topListItem)}
                fallbackImg={ImgAsset.albumDefault}
                contentStyle={styles.cover}
            />
            <ListItem.Content
                title={(
                    <ThemeText
                        numberOfLines={1}
                        fontSize="subTitle"
                        fontWeight="semibold">
                        {topListItem.title}
                    </ThemeText>
                )}
                description={(
                    <View>
                        {description ? (
                            <ThemeText
                                numberOfLines={2}
                                fontSize="description"
                                fontColor="textSecondary"
                                lineHeight>
                                {description}
                            </ThemeText>
                        ) : null}
                        {topListItem.platform ? (
                            <View
                                style={[
                                    styles.platformPill,
                                    {
                                        backgroundColor: colors.selectedBackground,
                                        borderColor: colors.selectedBorder,
                                    },
                                ]}>
                                <ThemeText
                                    numberOfLines={1}
                                    fontSize="tag"
                                    color={colors.primary}>
                                    {topListItem.platform}
                                </ThemeText>
                            </View>
                        ) : null}
                    </View>
                )}
            />
        </ListItem>
    );
}

const styles = StyleSheet.create({
    row: {
        width: "auto",
        height: rpx(132),
        marginHorizontal: spacing.xl,
        marginBottom: spacing.md,
        borderRadius: radius.md,
        borderWidth: StyleSheet.hairlineWidth,
        paddingVertical: spacing.xs,
    },
    cover: {
        width: rpx(84),
        height: rpx(84),
        borderRadius: radius.md,
    },
    platformPill: {
        alignSelf: "flex-start",
        minHeight: rpx(30),
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.xs,
        justifyContent: "center",
        marginTop: spacing.xs,
    },
});
