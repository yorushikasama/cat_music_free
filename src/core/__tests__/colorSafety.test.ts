import { describe, expect, it } from "@jest/globals";
import type { CustomizedColors } from "@/hooks/useColors";
import {
    createThemeColorsFromSeed,
    getContrastRatio,
    getReadableTextColor,
    MINIMUM_TEXT_CONTRAST,
    normalizeThemeColors,
} from "../colorSafety";

const baseColors = {
    primary: "#4A6FA5",
    background: "#FFFFFF",
    card: "#FFFFFF",
    text: "#222222",
    border: "#DDDDDD",
    notification: "#FFFFFF",
    pageBackground: "#FFFFFF",
    appBar: "#1F2937",
    appBarText: "#FFFFFF",
    musicBar: "#F8FAFC",
    musicBarText: "#111827",
} as CustomizedColors;

describe("getContrastRatio", () => {
    it("composites alpha before calculating contrast", () => {
        const ratio = getContrastRatio("rgba(0, 0, 0, 0.5)", "#FFFFFF");

        expect(ratio).toBeCloseTo(3.95, 1);
        expect(ratio).toBeLessThan(MINIMUM_TEXT_CONTRAST);
    });

    it("uses the supplied underlay for translucent surfaces", () => {
        const ratio = getContrastRatio(
            "#000000",
            "rgba(255, 255, 255, 0.5)",
            "#000000",
        );

        expect(ratio).toBeCloseTo(5.32, 1);
    });
});

describe("theme text safety", () => {
    it("chooses a readable dark or light foreground", () => {
        expect(getReadableTextColor("#FFFFFF")).toBe("#000000");
        expect(getReadableTextColor("#111827")).toBe("#ffffff");
    });

    it("normalizes unsafe core foreground/surface pairs", () => {
        const colors = normalizeThemeColors(
            {
                text: "#FFFFFF",
                textSecondary: "rgba(255, 255, 255, 0.45)",
                pageBackground: "#FFFFFF",
                appBar: "#F8FAFC",
                appBarText: "#FFFFFF",
                musicBar: "#111827",
                musicBarText: "#334155",
            },
            baseColors,
        );

        expect(
            getContrastRatio(colors.text, colors.pageBackground ?? "#FFFFFF"),
        ).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST);
        expect(
            getContrastRatio(
                colors.textSecondary ?? "#FFFFFF",
                colors.pageBackground ?? "#FFFFFF",
            ),
        ).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST);
        expect(
            getContrastRatio(
                colors.appBarText ?? "#FFFFFF",
                colors.appBar ?? "#FFFFFF",
                colors.pageBackground ?? "#FFFFFF",
            ),
        ).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST);
        expect(
            getContrastRatio(
                colors.musicBarText ?? "#FFFFFF",
                colors.musicBar ?? "#FFFFFF",
                colors.pageBackground ?? "#FFFFFF",
            ),
        ).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST);
    });
});

describe("createThemeColorsFromSeed", () => {
    it("builds distinct safe light and dark palettes from an extracted seed", () => {
        const light = createThemeColorsFromSeed("#7C3AED", "light");
        const dark = createThemeColorsFromSeed("#7C3AED", "dark");

        expect(light.pageBackground).not.toBe(dark.pageBackground);
        expect(light.card).not.toBe(dark.card);
        expect(
            getContrastRatio(light.text ?? "#FFFFFF", light.pageBackground ?? "#FFFFFF"),
        ).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST);
        expect(
            getContrastRatio(dark.text ?? "#FFFFFF", dark.pageBackground ?? "#FFFFFF"),
        ).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST);
        expect(
            getContrastRatio(
                light.appBarText ?? "#FFFFFF",
                light.appBar ?? "#FFFFFF",
                light.pageBackground ?? "#FFFFFF",
            ),
        ).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST);
        expect(
            getContrastRatio(
                dark.appBarText ?? "#FFFFFF",
                dark.appBar ?? "#FFFFFF",
                dark.pageBackground ?? "#FFFFFF",
            ),
        ).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST);
    });
});
