import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";

import TranslationIcon from "@/assets/icons/translation.svg";
import { iconSizeConst } from "@/constants/uiConst";
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
import {
    ensureAIDataSharingConsent,
    getLocalizedAIErrorMessage,
    isAIConfigured,
} from "@/core/ai";
import { useI18N } from "@/core/i18n";
import { radius } from "@/constants/borderRadius";
import { getDetailControlPalette } from "../../controlPalette";
import IconButton from "@/components/base/iconButton";

interface ILyricOperationsProps {
    scrollToCurrentLrcItem: () => void;
}

export default function LyricOperations(props: ILyricOperationsProps) {
    const { scrollToCurrentLrcItem } = props;

    const detailFontSize = useAppConfig("lyric.detailFontSize");
    const { t } = useI18N();
    const [translating, setTranslating] = useState(false);

    const { hasTranslation } = useLyricState();
    const showTranslation = PersistStatus.useValue(
        "lyric.showTranslation",
        false,
    );
    const colors = useColors();
    const palette = getDetailControlPalette(colors);
    const orientation = useOrientation();
    const theme = Theme.useTheme();
    const isRetro = theme.id === "p-retro";
    const isAcg = theme.id.startsWith("p-acg");
    const isEmeraldNight = theme.id === "p-emerald-night";

    let iconColor: string | undefined = "white";
    if (isEmeraldNight) {
        iconColor = colors.textSecondary;
    } else if (isAcg || isRetro) {
        iconColor = colors.text;
    }

    return (
        <View style={styles.container}>
            {orientation === "vertical" ? <HeartIcon /> : null}
            <IconButton
                name="font-size"
                sizeType="normal"
                color={iconColor}
                accessibilityLabel={t("a11y.fontSize")}
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
            <IconButton
                name="arrows-left-right"
                sizeType="normal"
                color={iconColor}
                accessibilityLabel={t("a11y.lyricOffset")}
                onPress={() => {
                    const currentMusicItem = TrackPlayer.currentMusic;

                    if (currentMusicItem) {
                        showPanel("SetLyricOffset", {
                            musicItem: currentMusicItem,
                            onSubmit(offset) {
                                lyricManager.updateLyricOffset(
                                    currentMusicItem,
                                    offset,
                                );
                                scrollToCurrentLrcItem();
                                hidePanel();
                            },
                        });
                    }
                }}
            />

            <IconButton
                name="magnifying-glass"
                sizeType="normal"
                color={iconColor}
                accessibilityLabel={t("a11y.searchLyrics")}
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
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(
                    translating
                        ? "aiTranslation.started"
                        : "aiSettings.lyricTranslation",
                )}
                accessibilityState={{
                    busy: translating,
                    disabled: translating,
                    selected: Boolean(hasTranslation && showTranslation),
                }}
                disabled={translating}
                hitSlop={rpx(12)}
                style={({ pressed }) => [
                    styles.translationButton,
                    pressed
                        ? { backgroundColor: palette.pressedOverlay }
                        : null,
                ]}
                onPress={async () => {
                    if (hasTranslation) {
                        PersistStatus.set(
                            "lyric.showTranslation",
                            !showTranslation,
                        );
                        scrollToCurrentLrcItem();
                        return;
                    }

                    setTranslating(true);
                    try {
                        if (!(await isAIConfigured())) {
                            Toast.warn(t("aiTranslation.configureFirst"));
                            return;
                        }
                        if (
                            !(await ensureAIDataSharingConsent("translation"))
                        ) {
                            return;
                        }

                        Toast.success(t("aiTranslation.started"));
                        const result =
                            await lyricManager.translateCurrentLyricWithAI();
                        if (result === "already-target") {
                            Toast.success(t("aiTranslation.alreadyTarget"));
                            return;
                        }
                        PersistStatus.set("lyric.showTranslation", true);
                        scrollToCurrentLrcItem();
                        Toast.success(t("aiTranslation.success"));
                    } catch (error: any) {
                        Toast.warn(
                            t("aiTranslation.failed", {
                                reason: getLocalizedAIErrorMessage(error),
                            }),
                        );
                    } finally {
                        setTranslating(false);
                    }
                }}>
                {translating ? (
                    <ActivityIndicator
                        animating
                        color={colors.primary}
                        size="small"
                    />
                ) : (
                    <TranslationIcon
                        width={iconSizeConst.normal}
                        height={iconSizeConst.normal}
                        color={
                            showTranslation && hasTranslation
                                ? colors.primary
                                : iconColor
                        }
                    />
                )}
            </Pressable>
            <IconButton
                name="ellipsis-vertical"
                sizeType="normal"
                color={iconColor}
                accessibilityLabel={t("a11y.lyricOptions")}
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
    translationButton: {
        width: iconSizeConst.normal,
        height: iconSizeConst.normal,
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
    },
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
