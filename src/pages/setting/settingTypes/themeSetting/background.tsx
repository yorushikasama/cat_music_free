import React from "react";
import { StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";
import ThemeText from "@/components/base/themeText";
import Config, { useAppConfig } from "@/core/appConfig";
import ThemeCard from "./themeCard";
import { ROUTE_PATH, useNavigate } from "@/core/router";
import Theme from "@/core/theme";
import { useI18N } from "@/core/i18n";

export default function Background() {
    const { t } = useI18N();

    const themeBackground = useAppConfig("theme.background");
    const themeSelectedTheme = useAppConfig("theme.selectedTheme");

    const navigate = useNavigate();

    return (
        <View>
            <ThemeText
                fontSize="subTitle"
                fontWeight="bold"
                style={style.header}>
                {t("themeSettings.setTheme")}
            </ThemeText>
            <View style={style.sectionWrapper}>
                <ThemeCard
                    preview="#fff"
                    title={t("themeSettings.lightMode")}
                    selected={themeSelectedTheme === "p-light"}
                    onPress={() => {
                        if (themeSelectedTheme !== "p-light") {
                            Theme.setTheme("p-light");
                            Config.setConfig("theme.followSystem", false);
                        }
                    }}
                />
                <ThemeCard
                    preview="#131313"
                    title={t("themeSettings.darkMode")}
                    selected={themeSelectedTheme === "p-dark"}
                    onPress={() => {
                        if (themeSelectedTheme !== "p-dark") {
                            Theme.setTheme("p-dark");
                            Config.setConfig("theme.followSystem", false);
                        }
                    }}
                />

                <ThemeCard
                    preview="#1A1714"
                    title="复古怀旧"
                    selected={themeSelectedTheme === "p-retro"}
                    onPress={() => {
                        if (themeSelectedTheme !== "p-retro") {
                            Theme.setTheme("p-retro");
                            Config.setConfig("theme.followSystem", false);
                        }
                    }}
                />

                <ThemeCard
                    preview="#ff7e95"
                    title="梦幻二次元"
                    selected={themeSelectedTheme === "p-acg"}
                    onPress={() => {
                        if (themeSelectedTheme !== "p-acg") {
                            Theme.setTheme("p-acg");
                            Config.setConfig("theme.followSystem", false);
                        }
                    }}
                />

                <ThemeCard
                    preview="#121212"
                    title="Spotify"
                    selected={themeSelectedTheme === "p-spotify"}
                    onPress={() => {
                        if (themeSelectedTheme !== "p-spotify") {
                            Theme.setTheme("p-spotify");
                            Config.setConfig("theme.followSystem", false);
                        }
                    }}
                />

                <ThemeCard
                    title={t("themeSettings.customMode")}
                    selected={themeSelectedTheme === "custom"}
                    preview={themeBackground}
                    onPress={() => {
                        if (themeSelectedTheme !== "custom") {
                            Config.setConfig("theme.followSystem", false);
                            Theme.setTheme("custom", {
                                colors: Config.getConfig(
                                    "theme.customColors",
                                ),
                            });
                        }
                        navigate(ROUTE_PATH.SET_CUSTOM_THEME);
                    }}
                />
            </View>
        </View>
    );
}

const style = StyleSheet.create({
    header: {
        marginTop: rpx(36),
        paddingLeft: rpx(24),
    },
    sectionWrapper: {
        marginTop: rpx(28),
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: rpx(24),
    },
});
