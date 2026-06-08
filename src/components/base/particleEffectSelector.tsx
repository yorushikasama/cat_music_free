import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import Color from "color";
import ThemeText from "@/components/base/themeText";
import useColors from "@/hooks/useColors";
import Config, { useAppConfig } from "@/core/appConfig";
import { useI18N } from "@/core/i18n";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import rpx from "@/utils/rpx";
import { ParticleEffectType } from "@/components/base/particleEffect";

const EFFECT_OPTIONS: ParticleEffectType[] = ["none", "sakura", "snow", "star", "firefly"];

const EFFECT_I18N_KEYS: Record<ParticleEffectType, string> = {
    none: "particleEffectNone",
    sakura: "particleEffectSakura",
    snow: "particleEffectSnow",
    star: "particleEffectStar",
    firefly: "particleEffectFirefly",
};

export default function ParticleEffectSelector() {
    const colors = useColors();
    const { t } = useI18N();
    const currentEffect = useAppConfig("theme.particleEffect") ?? "none";

    return (
        <View style={[styles.container, { backgroundColor: colors.surfacePrimary }]}>
            <ThemeText fontSize="subTitle" fontWeight="bold" style={styles.title}>
                {t("particleEffect")}
            </ThemeText>
            <View style={styles.optionList}>
                {EFFECT_OPTIONS.map(option => {
                    const isSelected = currentEffect === option;
                    return (
                        <TouchableOpacity
                            key={option}
                            activeOpacity={0.7}
                            style={[
                                styles.optionItem,
                                {
                                    backgroundColor: isSelected
                                        ? Color(colors.primary).alpha(0.09).rgb().string()
                                        : "transparent",
                                    borderColor: isSelected
                                        ? colors.primary
                                        : colors.divider,
                                },
                            ]}
                            onPress={() => {
                                Config.setConfig("theme.particleEffect", option);
                            }}>
                            <View style={[
                                styles.radioOuter,
                                { borderColor: isSelected ? colors.primary : colors.divider },
                            ]}>
                                {isSelected && (
                                    <View style={[
                                        styles.radioInner,
                                        { backgroundColor: colors.primary },
                                    ]} />
                                )}
                            </View>
                            <ThemeText
                                fontSize="content"
                                fontWeight={isSelected ? "bold" : "regular"}
                                style={[
                                    styles.optionLabel,
                                    { color: isSelected ? colors.primary : colors.text },
                                ]}>
                                {t(EFFECT_I18N_KEYS[option] as any)}
                            </ThemeText>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: spacing.md,
        marginVertical: spacing.sm,
        borderRadius: radius.md,
        overflow: "hidden",
        paddingVertical: spacing.md,
    },
    title: {
        paddingHorizontal: spacing.md,
        marginBottom: spacing.sm,
    },
    optionList: {
        paddingHorizontal: spacing.sm,
    },
    optionItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.md,
        paddingVertical: rpx(20),
        borderRadius: radius.sm,
        borderWidth: 1,
        marginBottom: rpx(8),
    },
    radioOuter: {
        width: rpx(32),
        height: rpx(32),
        borderRadius: rpx(16),
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
        marginRight: spacing.md,
    },
    radioInner: {
        width: rpx(16),
        height: rpx(16),
        borderRadius: rpx(8),
    },
    optionLabel: {
        flex: 1,
    },
});
