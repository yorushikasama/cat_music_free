import Color from "color";
import { CustomizedColors } from "@/hooks/useColors";

export function withAlpha(color: string | undefined, alpha: number) {
    if (!color) {
        return "transparent";
    }

    try {
        return Color(color).alpha(alpha).rgb().string();
    } catch {
        return color;
    }
}

export function getDetailControlPalette(colors: CustomizedColors) {
    const iconColor = colors.playControlIconColor ?? colors.text;
    const surface =
        colors.surfacePrimary ??
        colors.card ??
        colors.controlBackground ??
        "transparent";
    const controlSurface =
        colors.controlBackground ?? colors.surfaceSecondary ?? surface;
    const primary = colors.primary ?? iconColor;
    const activeSurface =
        colors.selectedBackground ??
        withAlpha(primary, colors.hasCustomBackground ? 0.16 : 0.1);
    const activeBorder =
        colors.selectedBorder ??
        withAlpha(primary, colors.hasCustomBackground ? 0.3 : 0.22);

    return {
        iconColor,
        mutedIconColor: withAlpha(iconColor, 0.68),
        seekTextColor: colors.hasCustomBackground
            ? withAlpha(iconColor, 0.78)
            : colors.seekTextColor ?? withAlpha(iconColor, 0.72),
        panelSurface: colors.hasCustomBackground
            ? withAlpha(surface, 0.72)
            : withAlpha(surface, 0.94),
        capsuleSurface: colors.hasCustomBackground
            ? withAlpha(surface, 0.78)
            : withAlpha(surface, 0.94),
        buttonSurface: colors.hasCustomBackground
            ? withAlpha(controlSurface, 0.58)
            : controlSurface,
        borderColor:
            colors.controlBorder ??
            colors.divider ??
            withAlpha(iconColor, colors.hasCustomBackground ? 0.18 : 0.14),
        pressedOverlay: colors.pressedOverlay ?? withAlpha(iconColor, 0.08),
        activeSurface,
        activeBorder,
        mediaLabelTextColor: withAlpha(iconColor, 0.9),
    };
}
