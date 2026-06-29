import React from "react";

import { iconSizeConst } from "@/constants/uiConst";
import Icon from "@/components/base/icon.tsx";
import MusicSheet, { useFavorite } from "@/core/musicSheet";
import { useCurrentMusic } from "@/core/trackPlayer";
import useColors from "@/hooks/useColors";

export default function HeartIconButton() {
    const musicItem = useCurrentMusic();
    const colors = useColors();
    const iconColor = colors.text;

    const isFavorite = useFavorite(musicItem);

    return isFavorite ? (
        <Icon
            name="heart"
            size={iconSizeConst.normal}
            color={colors.danger ?? colors.primary}
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
