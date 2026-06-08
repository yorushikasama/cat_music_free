import React from "react";
import { StyleSheet, View } from "react-native";
import settingTypes from "./settingTypes";
import { SafeAreaView } from "react-native-safe-area-context";
import StatusBar from "@/components/base/statusBar";
import { useParams } from "@/core/router";
import HorizontalSafeAreaView from "@/components/base/horizontalSafeAreaView.tsx";
import { useI18N } from "@/core/i18n";
import useColors from "@/hooks/useColors";
import ThemeText from "@/components/base/themeText";
import { spacing } from "@/constants/spacing";

export default function Setting() {
    const { type } = useParams<"setting">();
    const settingItem = settingTypes[type];

    const { t } = useI18N();
    const colors = useColors();

    if (!settingItem) {
        return (
            <SafeAreaView edges={["bottom", "top"]} style={[style.wrapper, { backgroundColor: colors.pageBackground }]}>
                <StatusBar />
                <View style={style.titleHeader}>
                    <ThemeText
                        fontSize="appbar"
                        fontWeight="bold"
                        style={{ color: colors.text }}>
                        {t("setting.unknown")}
                    </ThemeText>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={["bottom", "top"]} style={[style.wrapper, { backgroundColor: colors.pageBackground }]}>
            <StatusBar />
            {settingItem.showNav === false ? null : (
                <View style={style.titleHeader}>
                    <ThemeText
                        fontSize="appbar"
                        fontWeight="bold"
                        style={{ color: colors.text }}>
                        {t(settingItem.i18nKey as any)}
                    </ThemeText>
                </View>
            )}

            {type === "plugin" ? (
                <settingItem.component />
            ) : (
                <HorizontalSafeAreaView style={style.wrapper}>
                    <settingItem.component />
                </HorizontalSafeAreaView>
            )}
        </SafeAreaView>
    );
}

const style = StyleSheet.create({
    wrapper: {
        width: "100%",
        flex: 1,
    },
    titleHeader: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        paddingBottom: spacing.md,
    },
    appbar: {
        shadowColor: "transparent",
        backgroundColor: "transparent",
    },
    header: {
        backgroundColor: "transparent",
        shadowColor: "transparent",
    },
});
