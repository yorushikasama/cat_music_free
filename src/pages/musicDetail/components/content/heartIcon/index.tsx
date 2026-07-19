import React, { useState } from "react";

import IconButton from "@/components/base/iconButton";
import MusicSheet, { useFavorite } from "@/core/musicSheet";
import { useI18N } from "@/core/i18n";
import { useCurrentMusic } from "@/core/trackPlayer";
import useColors from "@/hooks/useColors";
import Toast from "@/utils/toast";

export default function HeartIconButton() {
    const musicItem = useCurrentMusic();
    const colors = useColors();
    const iconColor = colors.text;
    const { t } = useI18N();
    const [updatingFavorite, setUpdatingFavorite] = useState(false);

    const isFavorite = useFavorite(musicItem);

    return (
        <IconButton
            accessibilityLabel={
                isFavorite ? t("a11y.unfavorite") : t("a11y.favorite")
            }
            color={isFavorite ? colors.danger ?? colors.primary : iconColor}
            loading={updatingFavorite}
            name={isFavorite ? "heart" : "heart-outline"}
            sizeType="normal"
            onPress={async () => {
                if (!musicItem || updatingFavorite) {
                    return;
                }

                setUpdatingFavorite(true);
                try {
                    if (isFavorite) {
                        await MusicSheet.removeMusic(
                            MusicSheet.defaultSheet.id,
                            musicItem,
                        );
                    } else {
                        await MusicSheet.addMusic(
                            MusicSheet.defaultSheet.id,
                            musicItem,
                        );
                    }
                } catch (error: any) {
                    Toast.warn(
                        t("toast.unknownError", {
                            reason: error?.message ?? error,
                        }),
                    );
                } finally {
                    setUpdatingFavorite(false);
                }
            }}
        />
    );
}
