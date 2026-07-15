import { describe, expect, it } from "@jest/globals";
import enUS from "../languages/en-us.json";
import zhCN from "../languages/zh-cn.json";
import zhTW from "../languages/zh-tw.json";

const requiredThemeKeys = [
    "themeSettings.followSystemThemeHint",
    "themeSettings.themeSelectionHint",
    "themeSettings.lightModeDescription",
    "themeSettings.darkModeDescription",
    "themeSettings.retroMode",
    "themeSettings.retroModeDescription",
    "themeSettings.acgMode",
    "themeSettings.acgModeDescription",
    "themeSettings.fireflyMode",
    "themeSettings.fireflyModeDescription",
    "themeSettings.emeraldNightMode",
    "themeSettings.emeraldNightModeDescription",
    "themeSettings.customModeDescription",
    "setCustomTheme.close",
    "setCustomTheme.autoSaveHint",
    "setCustomTheme.preview",
    "setCustomTheme.readabilityProtected",
    "setCustomTheme.restoreBackground",
    "setCustomTheme.resetColors",
    "setCustomTheme.backgroundError",
    "setCustomTheme.groupBase",
    "setCustomTheme.groupPlayer",
    "setCustomTheme.groupSurfaces",
];

const locales: Record<string, Record<string, string>> = {
    "en-US": enUS,
    "zh-CN": zhCN,
    "zh-TW": zhTW,
};

describe("theme settings translations", () => {
    it.each(Object.entries(locales))(
        "provides every new theme label in %s",
        (_locale, messages) => {
            requiredThemeKeys.forEach(key => {
                expect(messages[key]?.trim()).not.toBe("");
            });
        },
    );
});
