import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import rpx from "@/utils/rpx";

import { fontSizeConst, iconSizeConst } from "@/constants/uiConst";
import Icon from "@/components/base/icon.tsx";
import { showPanel } from "@/components/panels/usePanel";
import LocalMusicSheet from "@/core/localMusicSheet";
import downloader from "@/core/downloader";
import i18n from "@/core/i18n";
import { ROUTE_PATH } from "@/core/router";
import TrackPlayer, {
    useCurrentMusic,
    useMusicQuality,
} from "@/core/trackPlayer";
import useColors from "@/hooks/useColors";
import useOrientation from "@/hooks/useOrientation";
import Toast from "@/utils/toast";
import PersistStatus from "@/utils/persistStatus";
import HeartIcon from "../heartIcon";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import { getDetailControlPalette } from "../../controlPalette";

const QUALITY_LABELS = {
    low: "低",
    standard: "标",
    high: "高",
    super: "超",
} as const;

function getRateLabel(rate: number) {
    const value = rate / 100;

    if (Number.isInteger(value)) {
        return `${value.toFixed(1)}x`;
    }

    return `${value.toFixed(2).replace(/0$/, "")}x`;
}

export default function Operations() {
    const musicItem = useCurrentMusic();
    const currentQuality = useMusicQuality();
    const isDownloaded = LocalMusicSheet.useIsLocal(musicItem);

    const rate = PersistStatus.useValue("music.rate", 100);
    const orientation = useOrientation();
    const colors = useColors();
    const palette = getDetailControlPalette(colors);

    const pressedStyle = { backgroundColor: palette.pressedOverlay };
    const mediaLabelTextStyle = { color: palette.mediaLabelTextColor };
    const rateLabel = getRateLabel(rate ?? 100);
    const qualityLabel = QUALITY_LABELS[currentQuality] ?? "标";

    return (
        <View
            style={[
                styles.wrapper,
                orientation === "horizontal" ? styles.horizontalWrapper : null,
                {
                    backgroundColor: palette.capsuleSurface,
                    borderColor: palette.borderColor,
                    shadowColor: colors.shadowMedium ?? colors.shadow ?? "#000",
                },
            ]}>
            <View style={styles.actionButton}>
                <HeartIcon />
            </View>
            <Pressable
                style={({ pressed }) => [
                    styles.actionButton,
                    pressed ? pressedStyle : null,
                ]}
                onPress={() => {
                    if (!musicItem) {
                        return;
                    }
                    showPanel("MusicQuality", {
                        musicItem,
                        async onQualityPress(quality) {
                            const changeResult =
                                await TrackPlayer.changeQuality(quality);
                            if (!changeResult) {
                                Toast.warn(
                                    i18n.t(
                                        "toast.currentQualityNotAvailableForCurrentMusic",
                                    ),
                                );
                            }
                        },
                    });
                }}>
                <Text style={[styles.mediaLabelText, mediaLabelTextStyle]}>
                    {qualityLabel}
                </Text>
            </Pressable>
            <Pressable
                style={({ pressed }) => [
                    styles.actionButton,
                    pressed ? pressedStyle : null,
                ]}
                onPress={() => {
                    if (musicItem && !isDownloaded) {
                        showPanel("MusicQuality", {
                            type: "download",
                            musicItem,
                            async onQualityPress(quality) {
                                downloader.download(musicItem, quality);
                            },
                        });
                    }
                }}>
                <Icon
                    name={
                        isDownloaded
                            ? "check-circle-outline"
                            : "arrow-down-tray"
                    }
                    size={iconSizeConst.normal}
                    color={palette.iconColor}
                />
            </Pressable>
            <Pressable
                style={({ pressed }) => [
                    styles.actionButton,
                    pressed ? pressedStyle : null,
                ]}
                onPress={() => {
                    if (!musicItem) {
                        return;
                    }
                    showPanel("PlayRate", {
                        async onRatePress(newRate) {
                            if (rate !== newRate) {
                                try {
                                    await TrackPlayer.setRate(newRate / 100);
                                    PersistStatus.set("music.rate", newRate);
                                } catch {}
                            }
                        },
                    });
                }}>
                <Text style={[styles.mediaLabelText, mediaLabelTextStyle]}>
                    {rateLabel}
                </Text>
            </Pressable>
            <Pressable
                style={({ pressed }) => [
                    styles.actionButton,
                    pressed ? pressedStyle : null,
                ]}
                onPress={() => {
                    if (musicItem) {
                        showPanel("MusicItemOptions", {
                            musicItem: musicItem,
                            from: ROUTE_PATH.MUSIC_DETAIL,
                        });
                    }
                }}>
                <Icon
                    name="ellipsis-vertical"
                    size={iconSizeConst.normal}
                    color={palette.iconColor}
                />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        alignSelf: "center",
        minWidth: rpx(540),
        height: rpx(76),
        marginBottom: rpx(10),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacing.xs,
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        shadowOffset: { width: 0, height: rpx(3) },
        shadowOpacity: 0.04,
        shadowRadius: rpx(7),
        elevation: 1,
    },
    horizontalWrapper: {
        marginBottom: 0,
        minWidth: rpx(468),
    },
    actionButton: {
        width: rpx(68),
        height: rpx(68),
        borderRadius: radius.pill,
        justifyContent: "center",
        alignItems: "center",
    },
    mediaLabelText: {
        fontSize: fontSizeConst.content,
        fontWeight: "700",
        includeFontPadding: false,
        letterSpacing: 0,
        textAlign: "center",
    },
});
