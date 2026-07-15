import Color from "color";
import type { CustomizedColors } from "@/hooks/useColors";

/** WCAG AA contrast requirement for normal-size text. */
export const MINIMUM_TEXT_CONTRAST = 4.5;

/** WCAG contrast requirement for adjacent non-text controls. */
export const MINIMUM_CONTROL_CONTRAST = 3;

export const DEFAULT_CONTRAST_BACKDROP = "#ffffff";

export type ThemeColorMode = "light" | "dark";

export interface ReadableTextColorOptions {
    /**
     * The opaque surface behind a translucent background. It defaults to white
     * so callers get a deterministic result even when no wallpaper is present.
     */
    backdrop?: string;
    /** Candidate used for light surfaces. */
    darkColor?: string;
    /** Candidate used for dark surfaces. */
    lightColor?: string;
}

export interface NormalizeThemeColorsOptions extends ReadableTextColorOptions {
    /** May raise, but never lower, the AA requirement of 4.5:1. */
    minimumContrast?: number;
}

type ParsedColor = ReturnType<typeof Color>;

function clamp(value: number, minimum: number, maximum: number) {
    return Math.min(Math.max(value, minimum), maximum);
}

function parseColor(value: string): ParsedColor {
    try {
        return Color(value).rgb();
    } catch {
        throw new Error(`Invalid color value: ${value}`);
    }
}

/**
 * Alpha-composite a foreground over a background without assuming either is
 * opaque. The returned Color preserves the resulting alpha channel.
 */
function compositeParsedColor(
    foreground: ParsedColor,
    background: ParsedColor,
): ParsedColor {
    const foregroundAlpha = clamp(foreground.alpha(), 0, 1);
    const backgroundAlpha = clamp(background.alpha(), 0, 1);
    const alpha = foregroundAlpha + backgroundAlpha * (1 - foregroundAlpha);

    if (alpha === 0) {
        return Color.rgb(0, 0, 0).alpha(0);
    }

    const channel = (foregroundChannel: number, backgroundChannel: number) =>
        (foregroundChannel * foregroundAlpha +
            backgroundChannel * backgroundAlpha * (1 - foregroundAlpha)) /
        alpha;

    return Color.rgb(
        channel(foreground.red(), background.red()),
        channel(foreground.green(), background.green()),
        channel(foreground.blue(), background.blue()),
    ).alpha(alpha);
}

function toCssColor(color: ParsedColor) {
    return color.alpha() >= 1 ? color.hex() : color.rgb().string();
}

function getOpaqueBackdrop(backdrop: string) {
    return compositeParsedColor(
        parseColor(backdrop),
        parseColor(DEFAULT_CONTRAST_BACKDROP),
    );
}

/**
 * Returns the CSS color produced when `foreground` is drawn over
 * `background`, preserving alpha when the background is translucent.
 */
export function compositeColor(foreground: string, background: string) {
    return toCssColor(
        compositeParsedColor(parseColor(foreground), parseColor(background)),
    );
}

/**
 * Calculate the WCAG contrast ratio for two rendered colors.
 *
 * Both colors may have alpha. A translucent background is first composed over
 * `backdrop`; the foreground is then composed over that rendered background.
 */
export function getContrastRatio(
    foreground: string,
    background: string,
    backdrop: string = DEFAULT_CONTRAST_BACKDROP,
) {
    const renderedBackground = compositeParsedColor(
        parseColor(background),
        getOpaqueBackdrop(backdrop),
    );
    const renderedForeground = compositeParsedColor(
        parseColor(foreground),
        renderedBackground,
    );

    return renderedForeground.contrast(renderedBackground);
}

/**
 * Pick whichever supplied dark/light foreground has the highest rendered
 * contrast against a surface. Defaults are pure black and white, which always
 * give an AA-compliant option for an opaque surface.
 */
export function getReadableTextColor(
    background: string,
    options: ReadableTextColorOptions = {},
) {
    const backdrop = options.backdrop ?? DEFAULT_CONTRAST_BACKDROP;
    const darkColor = options.darkColor ?? "#000000";
    const lightColor = options.lightColor ?? "#ffffff";
    const darkContrast = getContrastRatio(darkColor, background, backdrop);
    const lightContrast = getContrastRatio(lightColor, background, backdrop);

    return lightContrast >= darkContrast ? lightColor : darkColor;
}

/**
 * Resolve a switch thumb and its hairline outline from the actual rendered
 * track. This keeps the moving control legible when a theme uses translucent
 * secondary text as its off-track color.
 */
export function getAccessibleSwitchColors(
    trackColor: string,
    options: ReadableTextColorOptions = {},
) {
    const thumbColor = getReadableTextColor(trackColor, options);
    const thumbOutlineColor = getReadableTextColor(thumbColor, {
        backdrop: trackColor,
    });

    return {
        thumbColor,
        thumbOutlineColor,
    };
}

function ensureReadableTextColor(
    color: string,
    background: string,
    minimumContrast: number,
    options: ReadableTextColorOptions,
) {
    const backdrop = options.backdrop ?? DEFAULT_CONTRAST_BACKDROP;

    if (getContrastRatio(color, background, backdrop) >= minimumContrast) {
        return color;
    }

    return getReadableTextColor(background, options);
}

/**
 * Merge custom overrides into a complete palette and repair the three core
 * text/surface pairs when a user-provided color would fail WCAG AA.
 */
export function normalizeThemeColors(
    overrides: Partial<CustomizedColors>,
    base: CustomizedColors,
    options: NormalizeThemeColorsOptions = {},
): CustomizedColors {
    const colors: CustomizedColors = {
        ...base,
        ...overrides,
    };
    const minimumContrast = Math.max(
        MINIMUM_TEXT_CONTRAST,
        options.minimumContrast ?? MINIMUM_TEXT_CONTRAST,
    );
    const pageBackground =
        colors.pageBackground ?? colors.background ?? DEFAULT_CONTRAST_BACKDROP;
    const appBar = colors.appBar ?? pageBackground;
    const musicBar = colors.musicBar ?? pageBackground;
    const pageOptions: ReadableTextColorOptions = {
        ...options,
        backdrop: options.backdrop ?? DEFAULT_CONTRAST_BACKDROP,
    };
    const appBarOptions: ReadableTextColorOptions = {
        ...options,
        backdrop: pageBackground,
    };

    const text = ensureReadableTextColor(
        colors.text,
        pageBackground,
        minimumContrast,
        pageOptions,
    );
    const textSecondary = ensureReadableTextColor(
        colors.textSecondary ?? text,
        pageBackground,
        minimumContrast,
        pageOptions,
    );

    return {
        ...colors,
        text,
        textSecondary,
        appBarText: ensureReadableTextColor(
            colors.appBarText ?? text,
            appBar,
            minimumContrast,
            appBarOptions,
        ),
        musicBarText: ensureReadableTextColor(
            colors.musicBarText ?? text,
            musicBar,
            minimumContrast,
            appBarOptions,
        ),
    };
}

function hslColor(hue: number, saturation: number, lightness: number) {
    return Color.hsl(
        ((hue % 360) + 360) % 360,
        clamp(saturation, 0, 100),
        clamp(lightness, 0, 100),
    ).hex();
}

function opaqueSeedColor(seedColor: string) {
    return compositeParsedColor(
        parseColor(seedColor),
        parseColor(DEFAULT_CONTRAST_BACKDROP),
    );
}

/**
 * Build a safe, theme-ready set of overrides from a wallpaper's extracted
 * dominant color. It intentionally returns a partial palette so it can be
 * passed through `normalizeThemeColors` with the currently active base theme.
 */
export function createThemeColorsFromSeed(
    seedColor: string,
    mode: ThemeColorMode,
): Partial<CustomizedColors> {
    const seed = opaqueSeedColor(seedColor);
    const hue = seed.hue();
    const seedSaturation = seed.saturationl();
    const primarySaturation = clamp(Math.max(seedSaturation, 52), 52, 84);
    const surfaceSaturation = clamp(seedSaturation, 0, 32);
    const primary = hslColor(hue, primarySaturation, mode === "dark" ? 64 : 43);
    const accent = hslColor(hue, clamp(primarySaturation + 8, 52, 90), 60);

    const pageBackground = hslColor(
        hue,
        surfaceSaturation,
        mode === "dark" ? 8 : 97,
    );
    const card = hslColor(hue, surfaceSaturation, mode === "dark" ? 14 : 100);
    const appBar = hslColor(
        hue,
        mode === "dark" ? clamp(seedSaturation, 18, 45) : primarySaturation,
        mode === "dark" ? 17 : 42,
    );
    const musicBar = hslColor(
        hue,
        surfaceSaturation,
        mode === "dark" ? 12 : 99,
    );
    const text = getReadableTextColor(pageBackground);
    const appBarText = getReadableTextColor(appBar, {
        backdrop: pageBackground,
    });
    const musicBarText = getReadableTextColor(musicBar, {
        backdrop: pageBackground,
    });

    return {
        primary,
        accent,
        text,
        pageBackground,
        appBar,
        appBarText,
        musicBar,
        musicBarText,
        card,
        backdrop: card,
        tabBar: musicBar,
        notification: musicBar,
        surfacePrimary: card,
        surfaceSecondary: hslColor(
            hue,
            surfaceSaturation,
            mode === "dark" ? 19 : 94,
        ),
        surfaceTertiary: hslColor(
            hue,
            surfaceSaturation,
            mode === "dark" ? 24 : 90,
        ),
        textHighlight: accent,
        gradientStart: primary,
        gradientEnd: hslColor(
            hue,
            primarySaturation,
            mode === "dark" ? 48 : 34,
        ),
        progressActiveColor: primary,
        seekTrackColor: primary,
        seekThumbColor: accent,
    };
}
