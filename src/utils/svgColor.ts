import Color from "color";

export function colorNumberToRgba(color: number) {
    // React Native encodes native colors as unsigned ARGB integers.
    /* eslint-disable no-bitwise */
    const argb = color >>> 0;
    const alpha = ((argb >> 24) & 255) / 255;
    const red = (argb >> 16) & 255;
    const green = (argb >> 8) & 255;
    const blue = argb & 255;
    /* eslint-enable no-bitwise */

    if (alpha >= 1) {
        return `rgb(${red},${green},${blue})`;
    }

    return `rgba(${red},${green},${blue},${Number(alpha.toFixed(3))})`;
}

export function normalizeSvgColor(color: unknown) {
    if (typeof color === "string") {
        return color;
    }

    if (typeof color === "number") {
        return colorNumberToRgba(color);
    }

    return undefined;
}

export function toSvgColor(color: string | number | undefined, fallback = "rgba(255,255,255,1)") {
    try {
        const parsed = Color(normalizeSvgColor(color) ?? fallback);
        const rgb = parsed.rgb();
        const alpha = Number(parsed.alpha().toFixed(3));

        return `rgba(${Math.round(rgb.red())},${Math.round(rgb.green())},${Math.round(rgb.blue())},${alpha})`;
    } catch {
        return fallback;
    }
}
