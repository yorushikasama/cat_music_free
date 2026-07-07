import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import FastImage from "@/components/base/fastImage";
import Tag from "@/components/base/tag";
import ThemeText from "@/components/base/themeText";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import { ImgAsset } from "@/constants/assetsConst";
import { useCurrentMusic } from "@/core/trackPlayer";
import useColors from "@/hooks/useColors";
import useOrientation from "@/hooks/useOrientation";
import rpx from "@/utils/rpx";
import { showPanel } from "@/components/panels/usePanel.ts";
import Operations from "./operations";

interface IProps {
    onTurnPageClick?: () => void;
}

export default function AlbumCover(props: IProps) {
    const { onTurnPageClick } = props;

    const musicItem = useCurrentMusic();
    const orientation = useOrientation();
    const colors = useColors();

    const artworkSize = useMemo(() => {
        return orientation === "vertical" ? rpx(470) : rpx(260);
    }, [orientation]);

    const longPress = Gesture.LongPress()
        .onStart(() => {
            if (musicItem?.artwork) {
                showPanel("ImageViewer", {
                    url: musicItem.artwork,
                });
            }
        })
        .runOnJS(true);

    const tap = Gesture.Tap()
        .onStart(() => {
            onTurnPageClick?.();
        })
        .runOnJS(true);

    const combineGesture = Gesture.Race(tap, longPress);
    const tagTextColor = colors.accent ?? colors.primary;
    const platformTagTextStyle = { color: tagTextColor };

    return (
        <>
            <GestureDetector gesture={combineGesture}>
                <View
                    style={[
                        styles.wrapper,
                        orientation === "horizontal" ? styles.horizontalWrapper : null,
                    ]}>
                    <View
                        style={[
                            styles.coverFrame,
                            {
                                width: artworkSize,
                                height: artworkSize,
                                borderColor: colors.controlBorder ?? colors.divider,
                                shadowColor: colors.shadowMedium ?? colors.shadow ?? "#000",
                            },
                        ]}>
                        <FastImage
                            style={[
                                styles.coverImage,
                                {
                                    width: artworkSize,
                                    height: artworkSize,
                                    borderRadius: radius.lg,
                                },
                            ]}
                            source={musicItem?.artwork}
                            placeholderSource={ImgAsset.albumDefault}
                        />
                    </View>

                    <View
                        style={[
                            styles.trackInfo,
                            orientation === "horizontal" ? styles.horizontalTrackInfo : null,
                        ]}>
                        <ThemeText
                            fontSize="title"
                            fontWeight="bold"
                            numberOfLines={2}
                            lineHeight
                            style={styles.trackTitle}>
                            {musicItem?.title ?? "--"}
                        </ThemeText>
                        <View style={styles.metaRow}>
                            {musicItem?.artist ? (
                                <ThemeText
                                    fontSize="subTitle"
                                    fontColor="textSecondary"
                                    numberOfLines={1}
                                    style={styles.artist}>
                                    {musicItem.artist}
                                </ThemeText>
                            ) : null}
                            {musicItem?.platform ? (
                                <Tag
                                    tagName={musicItem.platform}
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
                </View>
            </GestureDetector>
            <Operations />
        </>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        width: "100%",
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.sm,
    },
    horizontalWrapper: {
        paddingTop: 0,
        paddingHorizontal: spacing.lg,
    },
    coverFrame: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radius.lg,
        backgroundColor: "rgba(255,255,255,0.08)",
        overflow: "hidden",
        shadowOffset: { width: 0, height: rpx(5) },
        shadowOpacity: 0.12,
        shadowRadius: rpx(8),
        elevation: 4,
    },
    coverImage: {
        overflow: "hidden",
    },
    trackInfo: {
        width: "100%",
        alignItems: "center",
        marginTop: spacing.lg,
        paddingHorizontal: spacing.md,
    },
    horizontalTrackInfo: {
        marginTop: spacing.md,
    },
    trackTitle: {
        textAlign: "center",
    },
    metaRow: {
        maxWidth: "100%",
        marginTop: spacing.xs,
        minHeight: rpx(34),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    artist: {
        flexShrink: 1,
    },
    platformTag: {
        marginLeft: spacing.xs,
    },
});
