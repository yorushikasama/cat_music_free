import Input from "@/components/base/input";
import ThemeText from "@/components/base/themeText";
import Config, { useAppConfig } from "@/core/appConfig";
import { testAIConnection } from "@/core/ai";
import { useI18N } from "@/core/i18n";
import useColors from "@/hooks/useColors";
import Toast from "@/utils/toast";
import React, { useState } from "react";
import {
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/borderRadius";
import SettingSection from "../components/settingSection";
import Color from "color";

export default function AISetting() {
    const { t, getLanguage } = useI18N();
    const colors = useColors();
    const savedBaseUrl = useAppConfig("ai.baseUrl");
    const savedApiKey = useAppConfig("ai.apiKey");
    const savedModel = useAppConfig("ai.model");
    const savedTargetLanguage = useAppConfig("ai.lyricTargetLanguage");

    const [baseUrl, setBaseUrl] = useState(
        savedBaseUrl || "https://api.openai.com/v1",
    );
    const [apiKey, setApiKey] = useState(savedApiKey || "");
    const [model, setModel] = useState(savedModel || "gpt-4o-mini");
    const [targetLanguage, setTargetLanguage] = useState(
        savedTargetLanguage && savedTargetLanguage !== "auto"
            ? savedTargetLanguage
            : "",
    );
    const [testing, setTesting] = useState(false);
    const primaryTextColor = Color(colors.primary).isDark()
        ? "#ffffff"
        : "#000000";

    function save() {
        Config.setConfig("ai.baseUrl", baseUrl.trim());
        Config.setConfig("ai.apiKey", apiKey.trim());
        Config.setConfig("ai.model", model.trim());
        Config.setConfig(
            "ai.lyricTargetLanguage",
            targetLanguage.trim() || "auto",
        );
    }

    async function testConnection() {
        if (!baseUrl.trim() || !apiKey.trim() || !model.trim()) {
            Toast.warn(t("aiSettings.incomplete"));
            return;
        }

        save();
        setTesting(true);
        try {
            await testAIConnection();
            Toast.success(t("aiSettings.testSuccess"));
        } catch (error: any) {
            Toast.warn(
                t("aiSettings.testFailed", {
                    reason: error?.message ?? error,
                }),
            );
        } finally {
            setTesting(false);
        }
    }

    return (
        <ScrollView
            style={styles.wrapper}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}>
            <SettingSection
                title={t("aiSettings.connection")}
                description={t("aiSettings.connectionDescription")}>
                <View style={styles.fields}>
                    <Field label={t("aiSettings.baseUrl")}>
                        <Input
                            value={baseUrl}
                            onChangeText={setBaseUrl}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="url"
                            variant="outlined"
                        />
                    </Field>
                    <Field label={t("aiSettings.apiKey")}>
                        <Input
                            value={apiKey}
                            onChangeText={setApiKey}
                            autoCapitalize="none"
                            autoCorrect={false}
                            secureTextEntry
                            variant="outlined"
                        />
                    </Field>
                    <Field label={t("aiSettings.model")}>
                        <Input
                            value={model}
                            onChangeText={setModel}
                            autoCapitalize="none"
                            autoCorrect={false}
                            variant="outlined"
                        />
                    </Field>
                </View>
            </SettingSection>

            <SettingSection title={t("aiSettings.lyricTranslation")}>
                <View style={styles.fields}>
                    <Field label={t("aiSettings.targetLanguage")}>
                        <Input
                            value={targetLanguage}
                            onChangeText={setTargetLanguage}
                            placeholder={`${t("aiSettings.followAppLanguage")} (${getLanguage().name})`}
                            variant="outlined"
                        />
                        <ThemeText
                            fontSize="description"
                            style={[styles.fieldHint, { color: colors.textSecondary }]}>
                            {t("aiSettings.targetLanguageDescription")}
                        </ThemeText>
                    </Field>
                </View>
            </SettingSection>

            <View style={styles.actions}>
                <TouchableOpacity
                    activeOpacity={0.76}
                    style={[
                        styles.secondaryButton,
                        {
                            borderColor: colors.controlBorder ?? colors.divider,
                        },
                    ]}
                    disabled={testing}
                    onPress={testConnection}>
                    <ThemeText fontWeight="semibold">
                        {testing
                            ? t("aiSettings.testing")
                            : t("aiSettings.testConnection")}
                    </ThemeText>
                </TouchableOpacity>
                <TouchableOpacity
                    activeOpacity={0.76}
                    style={[
                        styles.primaryButton,
                        { backgroundColor: colors.primary },
                    ]}
                    onPress={() => {
                        save();
                        Toast.success(t("toast.saveSuccess"));
                    }}>
                    <ThemeText
                        fontWeight="semibold"
                        style={{ color: primaryTextColor }}>
                        {t("common.save")}
                    </ThemeText>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <View style={styles.field}>
            <ThemeText
                fontSize="description"
                fontWeight="semibold"
                style={styles.fieldLabel}>
                {label}
            </ThemeText>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        width: "100%",
    },
    content: {
        paddingBottom: spacing.xxxl,
    },
    fields: {
        padding: spacing.md,
    },
    field: {
        marginBottom: spacing.md,
    },
    fieldLabel: {
        marginBottom: spacing.xs,
    },
    fieldHint: {
        marginTop: spacing.xs,
    },
    actions: {
        flexDirection: "row",
        gap: spacing.md,
        paddingHorizontal: spacing.md,
        marginTop: spacing.lg,
    },
    primaryButton: {
        flex: 1,
        minHeight: 44,
        borderRadius: radius.sm,
        alignItems: "center",
        justifyContent: "center",
    },
    secondaryButton: {
        flex: 1,
        minHeight: 44,
        borderRadius: radius.sm,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: "center",
        justifyContent: "center",
    },
});
