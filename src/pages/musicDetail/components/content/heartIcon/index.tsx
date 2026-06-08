import React from "react";

import { iconSizeConst } from "@/constants/uiConst";
import Icon from "@/components/base/icon.tsx";
import MusicSheet, { useFavorite } from "@/core/musicSheet";
import Theme from "@/core/theme";
import { useCurrentMusic } from "@/core/trackPlayer";
import useColors from "@/hooks/useColors";

export default function HeartIconButton() {
    const musicItem = useCurrentMusic();
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

    const isFavorite = useFavorite(musicItem);

    return isFavorite ? (
        <Icon
            name="heart"
            size={iconSizeConst.normal}
            color={isSpotify ? colors.primary : (isAcg ? colors.primary : "red")}
            onPress={() => {
                if (!musicItem) {
                    return;
                }
                MusicSheet.removeMusic(MusicSheet.defaultSheet.id, musicItem);
            }}
        />
    ) : (
        <Icon
            name="heart-outline"
            size={iconSizeConst.normal}
            color={iconColor}
            onPress={() => {
                if (musicItem) {
                    MusicSheet.addMusic(MusicSheet.defaultSheet.id, musicItem);
                }
            }}
        />
    );
}
