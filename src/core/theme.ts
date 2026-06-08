import Config from "@/core/appConfig";

import { DarkTheme as _DarkTheme, DefaultTheme as _DefaultTheme } from "@react-navigation/native";
import { GlobalState } from "@/utils/stateMapper";
import { CustomizedColors } from "@/hooks/useColors";
import Color from "color";

export const lightTheme = {
    id: "p-light",
    ..._DefaultTheme,
    dark: false,
    colors: {
        ..._DefaultTheme.colors,
        background: "transparent",
        text: "#333333",
        textSecondary: Color("#333333").alpha(0.7).toString(),
        primary: "#f17d34",
        pageBackground: "#f5f5f7",
        shadow: "#000",
        appBar: "#f17d34",
        appBarText: "#fefefe",
        musicBar: "#ffffff",
        musicBarText: "#333333",
        divider: "rgba(0,0,0,0.06)",
        listActive: "rgba(0,0,0,0.06)",
        mask: "rgba(51,51,51,0.2)",
        backdrop: "#ffffff",
        tabBar: "#f0f0f0",
        placeholder: "#eaeaea",
        success: "#08A34C",
        danger: "#FC5F5F",
        info: "#0A95C8",
        card: "#ffffff",
        notification: "#f0f0f0",
        surfacePrimary: "#ffffff",
        surfaceSecondary: "#f0f0f2",
        surfaceTertiary: "#e8e8eb",
        accent: "#FFA062",
        gradientStart: "#f17d34",
        gradientEnd: "#e06520",
        shadowLight: "rgba(0,0,0,0.04)",
        shadowMedium: "rgba(0,0,0,0.08)",
        shadowHeavy: "rgba(0,0,0,0.16)",
        progressActiveColor: "#f17d34",
        progressInactiveColor: "rgba(0,0,0,0.08)",
        seekTrackColor: "#f17d34",
        seekInactiveTrackColor: "#cccccc",
        seekThumbColor: "#dddddd",
        seekTextColor: "#cccccc",
        playlistIconColor: "#333333",
        detailGradientColors: ["rgba(0,0,0,0.1)", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.7)"],
        detailBgColor: "#f5f5f7",
        detailBlurRadius: 50,
        detailBlurOpacity: 0.5,
        playControlIconColor: "#333333",
        playControlBtnColor: "#333333",
        playControlBtnBg: "transparent",
        playControlBtnBorder: "rgba(0,0,0,0.12)",
    },
};

export const darkTheme = {
    id: "p-dark",
    ..._DarkTheme,
    dark: true,
    colors: {
        ..._DarkTheme.colors,
        background: "transparent",
        text: "#fcfcfc",
        textSecondary: Color("#fcfcfc").alpha(0.7).toString(),
        primary: "#3FA3B5",
        pageBackground: "#0f0f0f",
        shadow: "#999",
        appBar: "#1a1a1a",
        appBarText: "#fcfcfc",
        musicBar: "#1a1a1a",
        musicBarText: "#fcfcfc",
        divider: "rgba(255,255,255,0.06)",
        listActive: "rgba(255,255,255,0.06)",
        mask: "rgba(33,33,33,0.8)",
        backdrop: "#2a2a2a",
        tabBar: "#1a1a1a",
        placeholder: "#2e2e2e",
        success: "#08A34C",
        danger: "#FC5F5F",
        info: "#0A95C8",
        card: "#1a1a1a",
        notification: "#1a1a1a",
        surfacePrimary: "#1a1a1a",
        surfaceSecondary: "#242424",
        surfaceTertiary: "#2e2e2e",
        accent: "#6DD5ED",
        gradientStart: "#3FA3B5",
        gradientEnd: "#2A7A8A",
        shadowLight: "rgba(0,0,0,0.15)",
        shadowMedium: "rgba(0,0,0,0.25)",
        shadowHeavy: "rgba(0,0,0,0.4)",
        progressActiveColor: "#3FA3B5",
        progressInactiveColor: "rgba(255,255,255,0.08)",
        seekTrackColor: "#3FA3B5",
        seekInactiveTrackColor: "#999999",
        seekThumbColor: "#dddddd",
        seekTextColor: "#cccccc",
        playlistIconColor: "#fcfcfc",
        detailGradientColors: ["rgba(0,0,0,0.1)", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.7)"],
        detailBgColor: "#0f0f0f",
        detailBlurRadius: 50,
        detailBlurOpacity: 0.5,
        playControlIconColor: "#fcfcfc",
        playControlBtnColor: "#fcfcfc",
        playControlBtnBg: "transparent",
        playControlBtnBorder: "rgba(255,255,255,0.2)",
    },
};

export const retroTheme = {
    id: "p-retro",
    ..._DarkTheme,
    dark: true,
    colors: {
        ..._DarkTheme.colors,
        background: "transparent",
        text: "#D4C5A9",
        textSecondary: Color("#D4C5A9").alpha(0.75).toString(),
        primary: "#C4956A",
        pageBackground: "#1A1714",
        shadow: "#000000",
        appBar: "#231F1B",
        appBarText: "#D4C5A9",
        musicBar: "#231F1B",
        musicBarText: "#D4C5A9",
        divider: "rgba(196,149,106,0.12)",
        listActive: "rgba(196,149,106,0.08)",
        mask: "rgba(26,23,20,0.85)",
        backdrop: "#231F1B",
        tabBar: "#231F1B",
        placeholder: "#3A332C",
        success: "#7A9E6B",
        danger: "#C47A6A",
        info: "#6A8FA0",
        card: "#231F1B",
        notification: "#231F1B",
        surfacePrimary: "#231F1B",
        surfaceSecondary: "#2A2420",
        surfaceTertiary: "#3A332C",
        accent: "#D4A574",
        gradientStart: "#C4956A",
        gradientEnd: "#A07A55",
        shadowLight: "rgba(0,0,0,0.2)",
        shadowMedium: "rgba(0,0,0,0.3)",
        shadowHeavy: "rgba(0,0,0,0.45)",
        progressActiveColor: "#C4956A",
        progressInactiveColor: "rgba(196,149,106,0.15)",
        seekTrackColor: "#C4956A",
        seekInactiveTrackColor: "rgba(196,149,106,0.2)",
        seekThumbColor: "#C4956A",
        seekTextColor: "#B0A48A",
        playlistIconColor: "#D4C5A9",
        detailGradientColors: ["rgba(90,60,30,0.15)", "rgba(26,23,20,0.5)", "rgba(26,23,20,0.7)"],
        detailBgColor: "#1A1714",
        detailBlurRadius: 50,
        detailBlurOpacity: 0.5,
        detailVignetteColor: "rgba(26,23,20,0.3)",
        detailGrainColor: "#C4956A",
        playControlIconColor: "#D4C5A9",
        playControlBtnColor: "#C4956A",
        playControlBtnBg: "transparent",
        playControlBtnBorder: "rgba(196,149,106,0.3)",
    },
};

export const acgLightTheme = {
    id: "p-acg",
    ..._DefaultTheme,
    dark: false,
    colors: {
        ..._DefaultTheme.colors,
        background: "transparent",
        text: "#5a4a5a",
        textSecondary: "#8a7a8a",
        primary: "#ff8fa3",
        pageBackground: "#fff5f8",
        shadow: "#ffb7c5",
        appBar: "#fff0f5",
        appBarText: "#5a4a5a",
        musicBar: "rgba(255,240,245,0.92)",
        musicBarText: "#5a4a5a",
        divider: "rgba(255,183,197,0.25)",
        listActive: "rgba(255,143,163,0.08)",
        mask: "rgba(90,74,90,0.12)",
        backdrop: "#fff8fa",
        tabBar: "#fff0f5",
        placeholder: "#ffe8f0",
        success: "#7dd3a8",
        danger: "#ff7a8a",
        info: "#a8d8ff",
        card: "#ffffff",
        notification: "#fff0f5",
        surfacePrimary: "#ffffff",
        surfaceSecondary: "#fff8fa",
        surfaceTertiary: "#ffeef5",
        accent: "#b8a8ff",
        gradientStart: "#ff8fa3",
        gradientEnd: "#ffc8dd",
        shadowLight: "rgba(255,183,197,0.08)",
        shadowMedium: "rgba(255,143,163,0.12)",
        shadowHeavy: "rgba(184,168,255,0.15)",
        progressActiveColor: "#ff8fa3",
        progressInactiveColor: "rgba(255,143,163,0.12)",
        seekTrackColor: "#ff8fa3",
        seekInactiveTrackColor: "#e0e0e0",
        seekThumbColor: "#ffc8dd",
        seekTextColor: "#8a7a8a",
        playlistIconColor: "#ff8fa3",
        detailGradientColors: ["rgba(248,249,250,0.5)", "rgba(245,240,250,0.7)", "rgba(157,121,232,0.08)"],
        detailBgColor: "#f8f9fa",
        detailBlurRadius: 80,
        detailBlurOpacity: 0.25,
        playControlIconColor: "#5a4a5a",
        playControlBtnColor: "#ffffff",
        playControlBtnBg: "#ff8fa3",
        playControlBtnBorder: "#ffccd8",
    },
};

export const spotifyTheme = {
    id: "p-spotify",
    ..._DarkTheme,
    dark: true,
    colors: {
        ..._DarkTheme.colors,
        background: "transparent",
        text: "#ffffff",
        textSecondary: "#b3b3b3",
        primary: "#1ed760",
        pageBackground: "#121212",
        shadow: "#000000",
        appBar: "#181818",
        appBarText: "#ffffff",
        musicBar: "#181818",
        musicBarText: "#ffffff",
        divider: "rgba(255,255,255,0.1)",
        listActive: "rgba(255,255,255,0.1)",
        mask: "rgba(18,18,18,0.85)",
        backdrop: "#1f1f1f",
        tabBar: "#181818",
        placeholder: "#282828",
        success: "#1ed760",
        danger: "#f3727f",
        info: "#539df5",
        card: "#181818",
        notification: "#1f1f1f",
        surfacePrimary: "#181818",
        surfaceSecondary: "#1f1f1f",
        surfaceTertiary: "#282828",
        accent: "#1ed760cc",
        gradientStart: "#1ed760",
        gradientEnd: "#1aab50",
        shadowLight: "rgba(0,0,0,0.3)",
        shadowMedium: "rgba(0,0,0,0.4)",
        shadowHeavy: "rgba(0,0,0,0.5)",
        progressActiveColor: "#1ed760",
        progressInactiveColor: "#4d4d4d",
        seekTrackColor: "#1ed760",
        seekInactiveTrackColor: "#4d4d4d",
        seekThumbColor: "#ffffff",
        seekTextColor: "#b3b3b3",
        playlistIconColor: "#b3b3b3",
        detailGradientColors: ["rgba(18,18,18,0.3)", "rgba(18,18,18,0.7)", "rgba(18,18,18,0.9)"],
        detailBgColor: "#121212",
        detailBlurRadius: 60,
        detailBlurOpacity: 0.3,
        playControlIconColor: "#b3b3b3",
        playControlBtnColor: "#121212",
        playControlBtnBg: "#1ed760",
        playControlBtnBorder: "transparent",
    },
};

interface IBackgroundInfo {
    url?: string;
    blur?: number;
    opacity?: number;
}

const themeStore = new GlobalState(darkTheme);
const backgroundStore = new GlobalState<IBackgroundInfo | null>(null);

function setup() {
    let currentTheme = Config.getConfig("theme.selectedTheme") ?? "p-dark";

    // 兼容旧版 ACG 主题 ID
    if (currentTheme === "p-acg-light" || currentTheme === "p-acg-dark") {
        currentTheme = "p-acg";
        Config.setConfig("theme.selectedTheme", "p-acg");
    }

    if (currentTheme === "p-dark") {
        themeStore.setValue(darkTheme);
    } else if (currentTheme === "p-light") {
        themeStore.setValue(lightTheme);
    } else if (currentTheme === "p-retro") {
        themeStore.setValue(retroTheme);
    } else if (currentTheme === "p-acg") {
        themeStore.setValue(acgLightTheme);
    } else if (currentTheme === "p-spotify") {
        themeStore.setValue(spotifyTheme);
    } else {
        themeStore.setValue({
            id: currentTheme,
            dark: true,
            // @ts-ignore
            colors:
                (Config.getConfig("theme.colors") as CustomizedColors) ??
                darkTheme.colors,
        });
    }

    const bgUrl = Config.getConfig("theme.background");
    const bgBlur = Config.getConfig("theme.backgroundBlur");
    const bgOpacity = Config.getConfig("theme.backgroundOpacity");

    backgroundStore.setValue({
        url: bgUrl,
        blur: bgBlur ?? 20,
        opacity: bgOpacity ?? 0.6,
    });
}

function setTheme(
    themeName: string,
    extra?: {
        colors?: Partial<CustomizedColors>;
        background?: IBackgroundInfo;
    },
) {
    if (themeName === "p-light") {
        themeStore.setValue(lightTheme);
    } else if (themeName === "p-dark") {
        themeStore.setValue(darkTheme);
    } else if (themeName === "p-retro") {
        themeStore.setValue(retroTheme);
    } else if (themeName === "p-acg") {
        themeStore.setValue(acgLightTheme);
    } else if (themeName === "p-spotify") {
        themeStore.setValue(spotifyTheme);
    } else {
        themeStore.setValue({
            id: themeName,
            dark: true,
            colors: {
                ...darkTheme.colors,
                ...(extra?.colors ?? {}),
            },
        });
    }

    Config.setConfig("theme.selectedTheme", themeName);
    Config.setConfig("theme.colors", themeStore.getValue().colors);

    if (extra?.background) {
        const currentBg = backgroundStore.getValue();
        let newBg: IBackgroundInfo = {
            blur: 20,
            opacity: 0.6,
            ...(currentBg ?? {}),
            url: undefined,
        };
        if (typeof extra.background.blur === "number") {
            newBg.blur = extra.background.blur;
        }
        if (typeof extra.background.opacity === "number") {
            newBg.opacity = extra.background.opacity;
        }
        if (extra.background.url) {
            newBg.url = extra.background.url;
        }

        Config.setConfig("theme.background", newBg.url);
        Config.setConfig("theme.backgroundBlur", newBg.blur);
        Config.setConfig("theme.backgroundOpacity", newBg.opacity);

        backgroundStore.setValue(newBg);
    }
}

function setColors(colors: Partial<CustomizedColors>) {
    const currentTheme = themeStore.getValue();
    if (currentTheme.id !== "p-light" && currentTheme.id !== "p-dark" && currentTheme.id !== "p-retro" && currentTheme.id !== "p-acg" && currentTheme.id !== "p-spotify") {
        const newTheme = {
            ...currentTheme,
            colors: {
                ...currentTheme.colors,
                ...colors,
            },
        };
        Config.setConfig("theme.customColors", newTheme.colors);
        Config.setConfig("theme.colors", newTheme.colors);
        themeStore.setValue(newTheme);
    }
}

function setBackground(backgroundInfo: Partial<IBackgroundInfo>) {
    const currentBackgroundInfo = backgroundStore.getValue();
    let newBgInfo = {
        ...(currentBackgroundInfo ?? {
            opacity: 0.6,
            blur: 20,
        }),
    };
    if (typeof backgroundInfo.blur === "number") {
        Config.setConfig("theme.backgroundBlur", backgroundInfo.blur);
        newBgInfo.blur = backgroundInfo.blur;
    }
    if (typeof backgroundInfo.opacity === "number") {
        Config.setConfig("theme.backgroundOpacity", backgroundInfo.opacity);
        newBgInfo.opacity = backgroundInfo.opacity;
    }
    if (backgroundInfo.url !== undefined) {
        Config.setConfig("theme.background", backgroundInfo.url);
        newBgInfo.url = backgroundInfo.url;
    }
    backgroundStore.setValue(newBgInfo);
}

const configableColorKey: Array<keyof CustomizedColors> = [
    "primary",
    "text",
    "appBar",
    "appBarText",
    "musicBar",
    "musicBarText",
    "pageBackground",
    "backdrop",
    "card",
    "placeholder",
    "tabBar",
    "notification",
];


const Theme = {
    setup,
    setTheme,
    setBackground,
    setColors,
    useTheme: themeStore.useValue,
    getTheme: themeStore.getValue,
    useBackground: backgroundStore.useValue,
    configableColorKey,
};

export default Theme;
