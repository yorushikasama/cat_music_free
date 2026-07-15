import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Config, { useAppConfig } from "@/core/appConfig";
import ThemeCard from "./themeCard";
import { ROUTE_PATH, useNavigate } from "@/core/router";
import Theme, {
    acgFireflyTheme,
    acgLightTheme,
    darkTheme,
    emeraldNightTheme,
    lightTheme,
    retroTheme,
} from "@/core/theme";
import { useI18N } from "@/core/i18n";
import SettingSection from "../../components/settingSection";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import ThemeText from "@/components/base/themeText";
import useColors from "@/hooks/useColors";

const everydayThemes = [
    {
        id: "p-light",
        colors: lightTheme.colors,
        titleKey: "themeSettings.lightMode",
        descriptionKey: "themeSettings.lightModeDescription",
    },
    {
        id: "p-dark",
        colors: darkTheme.colors,
        titleKey: "themeSettings.darkMode",
        descriptionKey: "themeSettings.darkModeDescription",
    },
] as const;

const expressiveThemes = [
    {
        id: "p-retro",
        colors: retroTheme.colors,
        titleKey: "themeSettings.retroMode",
        descriptionKey: "themeSettings.retroModeDescription",
    },
    {
        id: "p-acg",
        colors: acgLightTheme.colors,
        titleKey: "themeSettings.acgMode",
        descriptionKey: "themeSettings.acgModeDescription",
    },
    {
        id: "p-acg-firefly",
        colors: acgFireflyTheme.colors,
        titleKey: "themeSettings.fireflyMode",
        descriptionKey: "themeSettings.fireflyModeDescription",
    },
    {
        id: "p-emerald-night",
        colors: emeraldNightTheme.colors,
        titleKey: "themeSettings.emeraldNightMode",
        descriptionKey: "themeSettings.emeraldNightModeDescription",
    },
] as const;

const presetThemes = [...everydayThemes, ...expressiveThemes] as const;
type ThemeOption = (typeof presetThemes)[number];

export default function Background() {
    const { t } = useI18N();
    const colors = useColors();
    const themeSelectedTheme = useAppConfig("theme.selectedTheme");
    const customColors = useAppConfig("theme.customColors");
    const followSystem = useAppConfig("theme.followSystem") ?? false;
    const navigate = useNavigate();
    const hasExpressiveSelection = expressiveThemes.some(
        theme => theme.id === themeSelectedTheme,
    );
    const [areExpressiveThemesExpanded, setAreExpressiveThemesExpanded] =
        useState(hasExpressiveSelection);

    useEffect(() => {
        setAreExpressiveThemesExpanded(hasExpressiveSelection);
    }, [hasExpressiveSelection]);

    const selectedPreset = presetThemes.find(
        theme => theme.id === themeSelectedTheme,
    );
    const activeThemeName = selectedPreset
        ? t(selectedPreset.titleKey)
        : t("themeSettings.customMode");

    function applyPreset(themeId: string) {
        if (themeSelectedTheme !== themeId) {
            Theme.setTheme(themeId);
        }
        // Particle effects are configured independently in Basic Settings.
        Config.setConfig("theme.followSystem", false);
    }

    function applyCustomTheme() {
        if (themeSelectedTheme !== "custom") {
            Theme.setTheme("custom", { colors: customColors });
        }
        Config.setConfig("theme.followSystem", false);
    }

    function renderThemeCard(theme: ThemeOption) {
        return (
            <ThemeCard
                key={theme.id}
                previewColors={theme.colors}
                previewEffect={
                    theme.id === "p-acg-firefly" ? "firefly" : undefined
                }
                title={t(theme.titleKey)}
                description={t(theme.descriptionKey)}
                selected={themeSelectedTheme === theme.id}
                onPress={() => applyPreset(theme.id)}
            />
        );
    }

    return (
        <SettingSection
            title={t("themeSettings.setTheme")}
            description={t("themeSettings.themeSelectionHint")}
            cardStyle={styles.sectionWrapper}>
            {!followSystem ? (
                <View
                    accessibilityLiveRegion="polite"
                    style={[
                        styles.systemPaused,
                        {
                            backgroundColor: colors.selectedBackground,
                            borderColor:
                                colors.selectedBorder ?? colors.primary,
                        },
                    ]}>
                    <View style={styles.systemPausedCopy}>
                        <ThemeText fontSize="description" fontWeight="semibold">
                            {t("themeSettings.systemFollowPaused")}
                        </ThemeText>
                        <ThemeText
                            fontSize="description"
                            fontColor="textSecondary"
                            style={styles.systemPausedDescription}>
                            {t("themeSettings.systemFollowPausedDescription", {
                                themeName: activeThemeName,
                            })}
                        </ThemeText>
                    </View>
                    <Pressable
                        accessibilityHint={t(
                            "themeSettings.followSystemThemeHint",
                        )}
                        accessibilityLabel={t(
                            "themeSettings.resumeFollowSystem",
                        )}
                        accessibilityRole="button"
                        onPress={() =>
                            Config.setConfig("theme.followSystem", true)
                        }
                        style={({ pressed }) => [
                            styles.actionButton,
                            {
                                backgroundColor: colors.controlBackground,
                                borderColor: colors.primary,
                            },
                            pressed ? styles.actionButtonPressed : null,
                        ]}>
                        <ThemeText
                            fontSize="description"
                            fontWeight="semibold"
                            fontColor="primary">
                            {t("themeSettings.resumeFollowSystem")}
                        </ThemeText>
                    </Pressable>
                </View>
            ) : null}

            <View style={styles.groupHeader}>
                <ThemeText fontSize="subTitle" fontWeight="semibold">
                    {t("themeSettings.dailyThemes")}
                </ThemeText>
                <ThemeText fontSize="description" fontColor="textSecondary">
                    {t("themeSettings.dailyThemesHint")}
                </ThemeText>
            </View>
            <View
                accessibilityLabel={t("themeSettings.dailyThemes")}
                accessibilityRole="radiogroup"
                style={styles.presetGroup}>
                {everydayThemes.map(renderThemeCard)}
            </View>

            <Pressable
                accessibilityHint={t("themeSettings.exploreStylesHint")}
                accessibilityLabel={t("themeSettings.exploreStyles")}
                accessibilityRole="button"
                accessibilityState={{ expanded: areExpressiveThemesExpanded }}
                onPress={() =>
                    setAreExpressiveThemesExpanded(expanded => !expanded)
                }
                style={({ pressed }) => [
                    styles.exploreToggle,
                    {
                        backgroundColor: colors.controlBackground,
                        borderColor: colors.controlBorder ?? colors.divider,
                    },
                    pressed ? styles.exploreTogglePressed : null,
                ]}>
                <View style={styles.exploreCopy}>
                    <ThemeText fontSize="subTitle" fontWeight="semibold">
                        {t("themeSettings.exploreStyles")}
                    </ThemeText>
                    <ThemeText fontSize="description" fontColor="textSecondary">
                        {t("themeSettings.exploreStylesHint")}
                    </ThemeText>
                </View>
                <ThemeText
                    fontSize="description"
                    fontWeight="semibold"
                    fontColor="primary">
                    {t(
                        areExpressiveThemesExpanded
                            ? "themeSettings.hideStyles"
                            : "themeSettings.showStyles",
                    )}
                </ThemeText>
            </Pressable>
            {areExpressiveThemesExpanded ? (
                <View
                    accessibilityLabel={t("themeSettings.exploreStyles")}
                    accessibilityRole="radiogroup"
                    style={[styles.presetGroup, styles.expressiveGroup]}>
                    {expressiveThemes.map(renderThemeCard)}
                </View>
            ) : null}

            <View style={styles.groupHeader}>
                <ThemeText fontSize="subTitle" fontWeight="semibold">
                    {t("themeSettings.customMode")}
                </ThemeText>
                <ThemeText fontSize="description" fontColor="textSecondary">
                    {t("themeSettings.customModeDescription")}
                </ThemeText>
            </View>
            <View
                accessibilityLabel={t("themeSettings.customMode")}
                accessibilityRole="radiogroup"
                style={styles.presetGroup}>
                <ThemeCard
                    previewColors={customColors ?? darkTheme.colors}
                    title={t("themeSettings.customMode")}
                    description={t("themeSettings.customModeDescription")}
                    selected={themeSelectedTheme === "custom"}
                    onPress={applyCustomTheme}
                />
            </View>
            {themeSelectedTheme === "custom" ? (
                <Pressable
                    accessibilityHint={t("themeSettings.customizeThemeHint")}
                    accessibilityLabel={t("themeSettings.customizeTheme")}
                    accessibilityRole="button"
                    onPress={() => navigate(ROUTE_PATH.SET_CUSTOM_THEME)}
                    style={({ pressed }) => [
                        styles.actionButton,
                        styles.customizeButton,
                        {
                            backgroundColor: colors.controlBackground,
                            borderColor: colors.primary,
                        },
                        pressed ? styles.actionButtonPressed : null,
                    ]}>
                    <ThemeText
                        fontSize="description"
                        fontWeight="semibold"
                        fontColor="primary">
                        {t("themeSettings.customizeTheme")}
                    </ThemeText>
                </Pressable>
            ) : null}
        </SettingSection>
    );
}

const styles = StyleSheet.create({
    sectionWrapper: {
        padding: spacing.md,
    },
    presetGroup: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    systemPaused: {
        minHeight: 48,
        marginBottom: spacing.lg,
        borderRadius: radius.md,
        borderWidth: StyleSheet.hairlineWidth,
        padding: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: spacing.sm,
    },
    systemPausedCopy: {
        flex: 1,
        minWidth: 180,
    },
    systemPausedDescription: {
        marginTop: spacing.xs,
    },
    groupHeader: {
        marginBottom: spacing.sm,
    },
    exploreToggle: {
        minHeight: 56,
        marginBottom: spacing.md,
        borderRadius: radius.md,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    exploreTogglePressed: {
        opacity: 0.78,
    },
    exploreCopy: {
        flex: 1,
        minWidth: 0,
    },
    expressiveGroup: {
        marginBottom: spacing.lg,
    },
    actionButton: {
        minHeight: 48,
        borderRadius: radius.sm,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.md,
        justifyContent: "center",
        alignItems: "center",
    },
    customizeButton: {
        alignSelf: "flex-start",
        marginTop: -spacing.sm,
    },
    actionButtonPressed: {
        opacity: 0.74,
    },
});
