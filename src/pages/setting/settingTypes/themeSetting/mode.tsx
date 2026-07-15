import React from "react";
import { Appearance, Pressable, StyleSheet, View } from "react-native";
import ThemeText from "@/components/base/themeText";
import ListItem from "@/components/base/listItem";
import ThemeSwitch from "@/components/base/switch";
import Config, { useAppConfig } from "@/core/appConfig";
import Theme from "@/core/theme";
import { useI18N } from "@/core/i18n";
import { radius } from "@/constants/borderRadius";
import SettingSection from "../../components/settingSection";

export default function Mode() {
    const { t } = useI18N();
    const mode = useAppConfig("theme.followSystem") ?? false;

    function setFollowSystem(enabled: boolean) {
        if (enabled) {
            const colorScheme = Appearance.getColorScheme();
            if (colorScheme === "dark") {
                Theme.setTheme("p-dark");
            } else if (colorScheme === "light") {
                Theme.setTheme("p-light");
            }
        }
        Config.setConfig("theme.followSystem", enabled);
    }

    return (
        <SettingSection title={t("themeSettings.displayStyle")}>
            <Pressable
                accessibilityHint={t("themeSettings.followSystemThemeHint")}
                accessibilityLabel={t("themeSettings.followSystemTheme")}
                accessibilityRole="switch"
                accessibilityState={{ checked: mode }}
                onPress={() => setFollowSystem(!mode)}
                style={({ pressed }) => [
                    styles.rowPressable,
                    pressed ? styles.rowPressed : null,
                ]}>
                <ListItem withHorizontalPadding>
                    <ListItem.Content>
                        <View style={styles.itemRow}>
                            <View style={styles.copy}>
                                <ThemeText>
                                    {t("themeSettings.followSystemTheme")}
                                </ThemeText>
                                <ThemeText
                                    fontSize="description"
                                    fontColor="textSecondary"
                                    style={styles.hint}>
                                    {t("themeSettings.followSystemThemeHint")}
                                </ThemeText>
                            </View>
                            <ThemeSwitch value={mode} interactive={false} />
                        </View>
                    </ListItem.Content>
                </ListItem>
            </Pressable>
        </SettingSection>
    );
}

const styles = StyleSheet.create({
    rowPressable: {
        borderRadius: radius.md,
    },
    rowPressed: {
        opacity: 0.76,
    },
    itemRow: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    copy: {
        flex: 1,
        minWidth: 0,
        paddingRight: 12,
    },
    hint: {
        marginTop: 4,
    },
});
