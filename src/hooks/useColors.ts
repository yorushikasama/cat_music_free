import { Theme as NavTheme, useTheme } from "@react-navigation/native";
import Color from "color";
import { useMemo } from "react";
import Theme from "@/core/theme";

type IColors = NavTheme["colors"];

export interface CustomizedColors extends IColors {
    /** 普通文字 */
    text: string;
    /** 副标题文字颜色 */
    textSecondary?: string;
    /** 高亮文本颜色，也就是主色调 */
    textHighlight?: string;
    /** 页面背景 */
    pageBackground?: string;
    /** 阴影 */
    shadow?: string;
    /** 标题栏颜色 */
    appBar?: string;
    /** 标题栏字体颜色 */
    appBarText?: string;
    /** 音乐栏颜色 */
    musicBar?: string;
    /** 音乐栏字体颜色 */
    musicBarText?: string;
    /** 分割线 */
    divider?: string;
    /** 高亮颜色 */
    listActive?: string;
    /** 输入框背景色 */
    placeholder?: string;
    /** 弹窗、面板、底部菜单的背景色 */
    backdrop?: string;
    /** 卡片背景色 */
    card: string;
    /** paneltabbar 背景色 */
    tabBar?: string;
    /** 一级表面色 — 卡片、容器背景 */
    surfacePrimary?: string;
    /** 二级表面色 — 嵌套卡片、分组区域 */
    surfaceSecondary?: string;
    /** 三级表面色 — 输入框、标签背景 */
    surfaceTertiary?: string;
    /** 强调色 — 主色补充，用于徽标、标签、次要高亮 */
    accent?: string;
    /** 渐变起始色 — AppBar/音乐栏渐变 */
    gradientStart?: string;
    /** 渐变结束色 — AppBar/音乐栏渐变 */
    gradientEnd?: string;
    /** 轻阴影色 — 卡片阴影 */
    shadowLight?: string;
    /** 中阴影色 — 悬浮层阴影 */
    shadowMedium?: string;
    /** 重阴影色 — 弹窗阴影 */
    shadowHeavy?: string;
    /** 危险/错误色 */
    danger?: string;
    /** 成功色 */
    success?: string;
    /** 信息色 */
    info?: string;
    /** 通知背景色 */
    notification: string;
    /** 遮罩色 */
    mask?: string;
    progressActiveColor?: string;
    progressInactiveColor?: string;
    seekTrackColor?: string;
    seekInactiveTrackColor?: string;
    seekThumbColor?: string;
    seekTextColor?: string;
    playlistIconColor?: string;
    /** 播放详情背景渐变色 — 三色渐变 */
    detailGradientColors?: string[];
    /** 播放详情背景底色 */
    detailBgColor?: string;
    /** 播放详情封面模糊半径 */
    detailBlurRadius?: number;
    /** 播放详情封面模糊透明度 */
    detailBlurOpacity?: number;
    /** 播放详情暗角叠加色（复古主题等） */
    detailVignetteColor?: string;
    /** 播放详情颗粒纹理色 */
    detailGrainColor?: string;
    /** 播放控制 — 侧边图标颜色（循环、上下曲、列表） */
    playControlIconColor?: string;
    /** 播放控制 — 播放按钮图标颜色 */
    playControlBtnColor?: string;
    /** 播放控制 — 播放按钮背景色 */
    playControlBtnBg?: string;
    /** 播放控制 — 播放按钮描边色 */
    playControlBtnBorder?: string;
    hasCustomBackground?: boolean;
}

function toSemiTransparent(colorStr: string, alpha: number): string {
    try {
        const c = Color(colorStr);
        const rgb = c.rgb();
        return `rgba(${rgb.red()},${rgb.green()},${rgb.blue()},${alpha})`;
    } catch {
        return colorStr;
    }
}

export default function useColors() {
    const { colors } = useTheme();
    const background = Theme.useBackground();
    const hasBg = !!background?.url;

    const cColors: CustomizedColors = useMemo(() => {
        const c = colors as CustomizedColors;
        const isDark = (colors as any).dark ?? Color(c.pageBackground ?? c.background ?? "#000").isDark();

        const rawSurfacePrimary = c.surfacePrimary ?? c.card ?? c.backdrop ?? c.pageBackground;
        const rawSurfaceSecondary = c.surfaceSecondary ?? c.backdrop ?? c.card;
        const rawSurfaceTertiary = c.surfaceTertiary ?? c.placeholder ?? c.card ?? "#e0e0e0";
        const rawCard = c.card;
        const rawBackdrop = c.backdrop;
        const rawPageBg = c.pageBackground ?? c.background;

        let surfacePrimary = rawSurfacePrimary;
        let surfaceSecondary = rawSurfaceSecondary;
        let surfaceTertiary = rawSurfaceTertiary;
        let card = rawCard;
        let backdrop = rawBackdrop;
        let pageBackground = rawPageBg;
        let appBar = c.appBar;
        let musicBar = c.musicBar;

        if (hasBg) {
            const cardAlpha = isDark ? 0.72 : 0.78;
            const surfaceAlpha = isDark ? 0.65 : 0.72;
            const tertiaryAlpha = isDark ? 0.55 : 0.60;
            const barAlpha = isDark ? 0.75 : 0.80;

            surfacePrimary = toSemiTransparent(rawSurfacePrimary, cardAlpha);
            surfaceSecondary = toSemiTransparent(rawSurfaceSecondary, surfaceAlpha);
            surfaceTertiary = toSemiTransparent(rawSurfaceTertiary, tertiaryAlpha);
            card = toSemiTransparent(rawCard, cardAlpha);
            backdrop = toSemiTransparent(rawBackdrop ?? rawCard, surfaceAlpha);
            pageBackground = toSemiTransparent(rawPageBg, 0);
            if (appBar) {
                appBar = toSemiTransparent(appBar, barAlpha);
            }
            if (musicBar) {
                musicBar = toSemiTransparent(musicBar, barAlpha);
            }
        }

        return {
            ...colors,
            textSecondary: c.textSecondary ?? Color(c.text).alpha(0.7).toString(),
            textHighlight: c.textHighlight ?? c.primary,
            // @ts-ignore
            background: pageBackground,
            pageBackground,
            surfacePrimary,
            surfaceSecondary,
            surfaceTertiary,
            card,
            backdrop,
            appBar,
            musicBar,
            accent: c.accent ?? Color(c.primary).alpha(0.7).toString(),
            gradientStart: c.gradientStart ?? c.primary,
            gradientEnd: c.gradientEnd ?? Color(c.primary).darken(0.15).toString(),
            shadowLight: c.shadowLight ?? "rgba(0,0,0,0.08)",
            shadowMedium: c.shadowMedium ?? "rgba(0,0,0,0.16)",
            shadowHeavy: c.shadowHeavy ?? "rgba(0,0,0,0.24)",
            progressActiveColor: c.progressActiveColor ?? c.primary,
            progressInactiveColor: c.progressInactiveColor ?? Color(c.primary).alpha(0.12).rgb().string(),
            seekTrackColor: c.seekTrackColor ?? c.primary,
            seekInactiveTrackColor: c.seekInactiveTrackColor ?? (isDark ? "#999999" : "#cccccc"),
            seekThumbColor: c.seekThumbColor ?? (isDark ? "#dddddd" : "#dddddd"),
            seekTextColor: c.seekTextColor ?? (isDark ? "#cccccc" : "#999999"),
            playlistIconColor: c.playlistIconColor ?? c.musicBarText ?? c.text,
            detailGradientColors: c.detailGradientColors ?? (isDark
                ? ["rgba(0,0,0,0.1)", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.7)"]
                : ["rgba(0,0,0,0.1)", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.7)"]),
            detailBgColor: c.detailBgColor ?? c.pageBackground ?? c.background ?? "#000",
            detailBlurRadius: c.detailBlurRadius ?? 50,
            detailBlurOpacity: c.detailBlurOpacity ?? 0.5,
            detailVignetteColor: c.detailVignetteColor,
            detailGrainColor: c.detailGrainColor,
            playControlIconColor: c.playControlIconColor,
            playControlBtnColor: c.playControlBtnColor,
            playControlBtnBg: c.playControlBtnBg,
            playControlBtnBorder: c.playControlBtnBorder,
            hasCustomBackground: hasBg,
        };
    }, [colors, hasBg]);

    return cColors;
}
