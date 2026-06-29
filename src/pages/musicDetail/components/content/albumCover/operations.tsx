import React, { useMemo } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";

import { ImgAsset } from "@/constants/assetsConst";
import { iconSizeConst } from "@/constants/uiConst";
import Icon from "@/components/base/icon.tsx";
import { showPanel } from "@/components/panels/usePanel";
import LocalMusicSheet from "@/core/localMusicSheet";
import downloader from "@/core/downloader";
import i18n from "@/core/i18n";
import { ROUTE_PATH } from "@/core/router";
import PluginManager from "@/core/pluginManager";
import TrackPlayer, { useCurrentMusic, useMusicQuality } from "@/core/trackPlayer";
import useColors from "@/hooks/useColors";
import useOrientation from "@/hooks/useOrientation";
import Toast from "@/utils/toast";
import toast from "@/utils/toast";
import PersistStatus from "@/utils/persistStatus";
import HeartIcon from "../heartIcon";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";

export default function Operations() {
    const musicItem = useCurrentMusic();
    const currentQuality = useMusicQuality();
    const isDownloaded = LocalMusicSheet.useIsLocal(musicItem);

    const rate = PersistStatus.useValue("music.rate", 100);
    const orientation = useOrientation();
    const colors = useColors();

    const iconColor = colors.text;
    const actionBgColor = colors.hasCustomBackground
        ? colors.surfacePrimary
        : "rgba(255,255,255,0.10)";
    const actionBorderColor = colors.divider ?? "rgba(255,255,255,0.16)";

    const supportComment = useMemo(() => {
        return !musicItem
            ? false
            : !!PluginManager.getByMedia(musicItem)?.supportedMethods.has("getMusicComments");
    }, [musicItem]);

    const qualityImgStyle = styles.quality;

    return (
        <View
            style={[
                styles.wrapper,
                orientation === "horizontal" ? styles.horizontalWrapper : null,
                {
                    backgroundColor: actionBgColor,
                    borderColor: actionBorderColor,
                },
            ]}>
            <View style={styles.actionButton}>
                <HeartIcon />
            </View>
            <Pressable
                style={styles.actionButton}
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
                                Toast.warn(i18n.t("toast.currentQualityNotAvailableForCurrentMusic"));
                            }
                        },
                    });
                }}>
                <Image
                    source={ImgAsset.quality[currentQuality]}
                    style={qualityImgStyle}
                />
            </Pressable>
            <Icon
                style={styles.actionIcon}
                name={isDownloaded ? "check-circle-outline" : "arrow-down-tray"}
                size={iconSizeConst.normal}
                color={iconColor}
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
                }}
            />
            <Pressable
                style={styles.actionButton}
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
                                } catch { }
                            }
                        },
                    });
                }}>
                <Image source={ImgAsset.rate[rate!]} style={qualityImgStyle} />
            </Pressable>
            <Icon
                style={styles.actionIcon}
                name="chat-bubble-oval-left-ellipsis"
                size={iconSizeConst.normal}
                color={iconColor}
                opacity={supportComment ? 1 : 0.2}
                onPress={() => {
                    if (!supportComment) {
                        toast.warn(i18n.t("toast.commmentNotAvaliableForCurrentMusic"));
                        return;
                    }
                    if (musicItem) {
                        showPanel("MusicComment", {
                            musicItem,
                        });
                    }
                }}
            />
            <Icon
                style={styles.actionIcon}
                name="ellipsis-vertical"
                size={iconSizeConst.normal}
                color={iconColor}
                onPress={() => {
                    if (musicItem) {
                        showPanel("MusicItemOptions", {
                            musicItem: musicItem,
                            from: ROUTE_PATH.MUSIC_DETAIL,
                        });
                    }
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        alignSelf: "center",
        minWidth: rpx(620),
        height: rpx(88),
        marginBottom: rpx(16),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
    },
    horizontalWrapper: {
        marginBottom: 0,
        minWidth: rpx(520),
    },
    actionButton: {
        width: rpx(72),
        height: rpx(72),
        justifyContent: "center",
        alignItems: "center",
    },
    actionIcon: {
        width: rpx(72),
        height: rpx(72),
        textAlign: "center",
        textAlignVertical: "center",
    },
    quality: {
        width: rpx(52),
        height: rpx(52),
    },
});
