import { describe, expect, it, jest } from "@jest/globals";
import type { CustomizedColors } from "@/hooks/useColors";

jest.mock("../appConfig", () => ({
    __esModule: true,
    default: {
        getConfig: require("@jest/globals").jest.fn(),
        setConfig: require("@jest/globals").jest.fn(),
    },
}));

jest.mock("@/core/appConfig", () => ({
    __esModule: true,
    default: {
        getConfig: require("@jest/globals").jest.fn(),
        setConfig: require("@jest/globals").jest.fn(),
    },
}));

jest.mock("../../utils/stateMapper", () => {
    class MockGlobalState<T> {
        private value: T;

        constructor(value: T) {
            this.value = value;
        }

        setValue = (value: any) => {
            this.value =
                typeof value === "function" ? value(this.value) : value;
        };

        getValue = () => this.value;

        useValue = () => this.value;
    }

    return { GlobalState: MockGlobalState };
});

jest.mock("@react-navigation/native", () => ({
    DarkTheme: {
        dark: true,
        colors: {
            primary: "#ffffff",
            background: "#000000",
            card: "#111111",
            text: "#ffffff",
            border: "#333333",
            notification: "#ffffff",
        },
    },
    DefaultTheme: {
        dark: false,
        colors: {
            primary: "#000000",
            background: "#ffffff",
            card: "#ffffff",
            text: "#111111",
            border: "#dddddd",
            notification: "#111111",
        },
    },
}));

import Theme, {
    acgFireflyTheme,
    acgLightTheme,
    darkTheme,
    emeraldNightTheme,
    lightTheme,
    retroTheme,
} from "../theme";
import {
    getAccessibleSwitchColors,
    getContrastRatio,
    MINIMUM_CONTROL_CONTRAST,
    MINIMUM_TEXT_CONTRAST,
} from "../colorSafety";

const presetThemes = [
    lightTheme,
    darkTheme,
    retroTheme,
    acgLightTheme,
    acgFireflyTheme,
    emeraldNightTheme,
];

function getConfigMocks() {
    return [
        (
            jest.requireMock("../appConfig") as {
                default: { setConfig: jest.Mock };
            }
        ).default,
        (
            jest.requireMock("@/core/appConfig") as {
                default: { setConfig: jest.Mock };
            }
        ).default,
    ];
}

function clearConfigMocks() {
    getConfigMocks().forEach(config => config.setConfig.mockClear());
}

function wasConfigWritten(key: string) {
    return getConfigMocks().some(config =>
        config.setConfig.mock.calls.some(([writtenKey]) => writtenKey === key),
    );
}

describe("preset theme accessibility", () => {
    it.each(presetThemes)("keeps core text pairs readable for $id", theme => {
        const colors = theme.colors;
        const pageBackground = colors.pageBackground ?? colors.background;

        expect(
            getContrastRatio(colors.text, pageBackground),
        ).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST);
        expect(
            getContrastRatio(colors.textSecondary, pageBackground),
        ).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST);
        expect(
            getContrastRatio(colors.appBarText, colors.appBar, pageBackground),
        ).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST);
        expect(
            getContrastRatio(
                colors.musicBarText,
                colors.musicBar,
                pageBackground,
            ),
        ).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST);
    });
});

function expectSwitchContrast(colors: CustomizedColors) {
    const backdrop =
        colors.surfacePrimary ??
        colors.pageBackground ??
        colors.background ??
        "#ffffff";

    [colors.primary, colors.textSecondary ?? colors.text].forEach(
        trackColor => {
            const { thumbColor, thumbOutlineColor } = getAccessibleSwitchColors(
                trackColor,
                { backdrop },
            );

            expect(
                getContrastRatio(thumbColor, trackColor, backdrop),
            ).toBeGreaterThanOrEqual(MINIMUM_CONTROL_CONTRAST);
            expect(
                getContrastRatio(thumbOutlineColor, thumbColor, trackColor),
            ).toBeGreaterThanOrEqual(MINIMUM_CONTROL_CONTRAST);
        },
    );
}

describe("theme switch accessibility", () => {
    it.each(presetThemes)("keeps the switch visible for $id", theme => {
        expectSwitchContrast(theme.colors);
    });

    it("keeps the switch visible across generated custom palettes", () => {
        [
            Theme.createCustomThemeColors("#7C3AED", "light"),
            Theme.createCustomThemeColors("#7C3AED", "dark"),
            Theme.createCustomThemeColors("#E2A92B", "light"),
            Theme.createCustomThemeColors("#0A7B88", "dark"),
        ].forEach(expectSwitchContrast);
    });
});

describe("theme transitions", () => {
    it("normalizes unsafe custom pairs", () => {
        clearConfigMocks();
        Theme.setTheme("custom", {
            colors: {
                text: "#ffffff",
                pageBackground: "#ffffff",
                appBar: "#ffffff",
                appBarText: "#ffffff",
                musicBar: "#ffffff",
                musicBarText: "#ffffff",
            },
        });

        const colors = Theme.getTheme().colors;
        expect(
            getContrastRatio(colors.text, colors.pageBackground),
        ).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST);
        expect(
            getContrastRatio(
                colors.appBarText,
                colors.appBar,
                colors.pageBackground,
            ),
        ).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST);
        expect(
            getContrastRatio(
                colors.musicBarText,
                colors.musicBar,
                colors.pageBackground,
            ),
        ).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST);
        expect(wasConfigWritten("theme.customColors")).toBe(true);

        Theme.resetCustomColors();
        const resetColors = Theme.getTheme().colors;
        expect(Theme.getTheme().id).toBe("custom");
        expect(
            getContrastRatio(resetColors.text, resetColors.pageBackground),
        ).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST);
    });

    it("migrates the legacy Spotify selection to Emerald Night", () => {
        clearConfigMocks();
        Theme.setTheme("p-spotify");

        expect(Theme.getTheme().id).toBe("p-emerald-night");
        expect(wasConfigWritten("theme.selectedTheme")).toBe(true);
        expect(wasConfigWritten("theme.particleEffect")).toBe(false);
    });
});
