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
import Theme from "@/core/theme";
import TrackPlayer, { useCurrentMusic, useMusicQuality } from "@/core/trackPlayer";
import useColors from "@/hooks/useColors";
import useOrientation from "@/hooks/useOrientation";
import Toast from "@/utils/toast";
import toast from "@/utils/toast";
import PersistStatus from "@/utils/persistStatus";
import HeartIcon from "../heartIcon";

export default function Operations() {
    const musicItem = useCurrentMusic();
    const currentQuality = useMusicQuality();
    const isDownloaded = LocalMusicSheet.useIsLocal(musicItem);

    const rate = PersistStatus.useValue("music.rate", 100);
    const orientation = useOrientation();
    const theme = Theme.useTheme();
    const colors = useColors();
    const isRetro = theme.id === "p-retro";
    const isAcg = theme.id.startsWith("p-acg");
    const isSpotify = theme.id === "p-spotify";

    const iconColor = isSpotify
        ? "#b3b3b3"
        : (isAcg
            ? colors.text
            : (isRetro ? colors.text : "white"));

    const supportComment = useMemo(() => {
        return !musicItem
            ? false
            : !!PluginManager.getByMedia(musicItem)?.supportedMethods.has("getMusicComments");
    }, [musicItem]);

    const qualityImgStyle = isAcg
        ? [styles.quality, styles.acgQualityImg]
        : styles.quality;

    return (
        <View
            style={[
                styles.wrapper,
                orientation === "horizontal" ? styles.horizontalWrapper : null,
            ]}>
            <HeartIcon />
            <Pressable
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
        width: "100%",
        height: rpx(88),
        marginBottom: rpx(16),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-evenly",
        paddingHorizontal: rpx(24),
    },
    horizontalWrapper: {
        marginBottom: 0,
    },
    quality: {
        width: rpx(52),
        height: rpx(52),
    },
    acgQualityImg: {
        borderRadius: rpx(8),
        backgroundColor: "rgba(157,121,232,0.1)",
    },
});
