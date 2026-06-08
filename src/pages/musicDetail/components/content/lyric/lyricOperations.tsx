import React from "react";
import { StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";

import TranslationIcon from "@/assets/icons/translation.svg";
import { iconSizeConst } from "@/constants/uiConst";
import Icon from "@/components/base/icon.tsx";
import { hidePanel, showPanel } from "@/components/panels/usePanel";
import { useAppConfig } from "@/core/appConfig";
import lyricManager, { useLyricState } from "@/core/lyricManager";
import Theme from "@/core/theme";
import TrackPlayer from "@/core/trackPlayer";
import useColors from "@/hooks/useColors";
import useOrientation from "@/hooks/useOrientation";
import Toast from "@/utils/toast";
import PersistStatus from "@/utils/persistStatus";
import HeartIcon from "../heartIcon";

interface ILyricOperationsProps {
    scrollToCurrentLrcItem: () => void;
}

export default function LyricOperations(props: ILyricOperationsProps) {
    const { scrollToCurrentLrcItem } = props;

    const detailFontSize = useAppConfig("lyric.detailFontSize");

    const { hasTranslation } = useLyricState();
    const showTranslation = PersistStatus.useValue(
        "lyric.showTranslation",
        false,
    );
    const colors = useColors();
    const orientation = useOrientation();
    const theme = Theme.useTheme();
    const isRetro = theme.id === "p-retro";
    const isAcg = theme.id.startsWith("p-acg");
    const isSpotify = theme.id === "p-spotify";

    const iconColor = isSpotify
        ? "#b3b3b3"
        : (isAcg
            ? colors.text
            : (isRetro ? colors.text : "white"));

    return (
        <View style={styles.container}>
            {orientation === "vertical" ? <HeartIcon /> : null}
            <Icon
                name="font-size"
                size={iconSizeConst.normal}
                color={iconColor}
                onPress={() => {
                    showPanel("SetFontSize", {
                        defaultSelect: detailFontSize ?? 1,
                        onSelectChange(value) {
                            PersistStatus.set("lyric.detailFontSize", value);
                            scrollToCurrentLrcItem();
                        },
                    });
                }}
            />
            <Icon
                name="arrows-left-right"
                size={iconSizeConst.normal}
                color={iconColor}
                onPress={() => {
                    const currentMusicItem = TrackPlayer.currentMusic;

                    if (currentMusicItem) {
                        showPanel("SetLyricOffset", {
                            musicItem: currentMusicItem,
                            onSubmit(offset) {
                                lyricManager.updateLyricOffset(currentMusicItem, offset);
                                scrollToCurrentLrcItem();
                                hidePanel();
                            },
                        });
                    }
                }}
            />

            <Icon
                name="magnifying-glass"
                size={iconSizeConst.normal}
                color={iconColor}
                onPress={() => {
                    const currentMusic = TrackPlayer.currentMusic;
                    if (!currentMusic) {
                        return;
                    }
                    showPanel("SearchLrc", {
                        musicItem: currentMusic,
                    });
                }}
            />
            <TranslationIcon
                width={iconSizeConst.normal}
                height={iconSizeConst.normal}
                opacity={!hasTranslation ? 0.2 : showTranslation ? 1 : 0.5}
                color={
                    showTranslation && hasTranslation ? colors.primary : iconColor
                }
                onPress={() => {
                    if (!hasTranslation) {
                        Toast.warn("当前歌曲无翻译");
                        return;
                    }

                    PersistStatus.set(
                        "lyric.showTranslation",
                        !showTranslation,
                    );
                    scrollToCurrentLrcItem();
                }}
            />
            <Icon
                name="ellipsis-vertical"
                size={iconSizeConst.normal}
                color={iconColor}
                onPress={() => {
                    const currentMusic = TrackPlayer.currentMusic;
                    if (currentMusic) {
                        showPanel("MusicItemLyricOptions", {
                            musicItem: currentMusic,
                        });
                    }
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: rpx(88),
        marginBottom: rpx(16),
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-evenly",
        paddingHorizontal: rpx(24),
    },
});
