import Icon from "@/components/base/icon";
import Input from "@/components/base/input";
import ThemeText from "@/components/base/themeText";
import { showDialog } from "@/components/dialogs/useDialog";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import Config, { useAppConfig } from "@/core/appConfig";
import {
    clearAIApiKey,
    fetchAIModels,
    getAIApiKey,
    getLocalizedAIErrorMessage,
    revokeAIDataSharingConsent,
    setAIApiKey,
    testAIConnection,
} from "@/core/ai";
import { useI18N } from "@/core/i18n";
import useColors from "@/hooks/useColors";
import rpx from "@/utils/rpx";
import Toast from "@/utils/toast";
import Color from "color";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import SettingSection from "../components/settingSection";

export default function AISetting() {
    const { t, getLanguage } = useI18N();
    const colors = useColors();
    const savedBaseUrl = useAppConfig("ai.baseUrl");
    const savedModel = useAppConfig("ai.model");
    const savedTargetLanguage = useAppConfig("ai.lyricTargetLanguage");

    const [baseUrl, setBaseUrl] = useState(
        savedBaseUrl || "https://api.openai.com/v1",
    );
    const [apiKey, setApiKey] = useState("");
    const [hasSavedApiKey, setHasSavedApiKey] = useState(false);
    const [apiKeyVisible, setApiKeyVisible] = useState(false);
    const [model, setModel] = useState(savedModel || "gpt-4o-mini");
    const [targetLanguage, setTargetLanguage] = useState(
        savedTargetLanguage && savedTargetLanguage !== "auto"
            ? savedTargetLanguage
            : "",
    );
    const [testing, setTesting] = useState(false);
    const [fetchingModels, setFetchingModels] = useState(false);
    const [saving, setSaving] = useState(false);
    const draftConfigured = !!(
        baseUrl.trim() &&
        (apiKey.trim() || hasSavedApiKey) &&
        model.trim()
    );
    const endpointName = useMemo(() => {
        try {
            return new URL(baseUrl.trim()).host;
        } catch {
            return baseUrl.trim() || t("aiSettings.endpointMissing");
        }
    }, [baseUrl, t]);
    const primaryTint = Color(colors.primary)
        .alpha(colors.hasBackgroundImage ? 0.18 : 0.12)
        .string();

    useEffect(() => {
        let active = true;
        getAIApiKey().then(value => {
            if (active) {
                setApiKey(value);
                setHasSavedApiKey(!!value);
            }
        });
        return () => {
            active = false;
        };
    }, []);

    async function save() {
        Config.setConfig("ai.baseUrl", baseUrl.trim());
        Config.setConfig("ai.model", model.trim());
        Config.setConfig(
            "ai.lyricTargetLanguage",
            targetLanguage.trim() || "auto",
        );
        if (apiKey.trim()) {
            const normalizedApiKey = apiKey.trim();
            await setAIApiKey(normalizedApiKey);
            setApiKey(normalizedApiKey);
            setApiKeyVisible(false);
            setHasSavedApiKey(true);
        }
    }

    async function toggleApiKeyVisibility() {
        if (apiKeyVisible) {
            setApiKeyVisible(false);
            return;
        }
        if (!apiKey && hasSavedApiKey) {
            setApiKey(await getAIApiKey());
        }
        setApiKeyVisible(true);
    }

    async function getModels() {
        if (fetchingModels || testing || saving) {
            return;
        }
        if (!baseUrl.trim()) {
            Toast.warn(t("aiSettings.endpointIncomplete"));
            return;
        }

        setFetchingModels(true);
        try {
            const models = await fetchAIModels({
                baseUrl,
                apiKey: apiKey.trim() || undefined,
            });
            if (!models.length) {
                Toast.warn(t("aiSettings.modelsEmpty"));
                return;
            }
            Toast.success(
                t("aiSettings.modelsLoaded", { count: models.length }),
            );
            showDialog("RadioDialog", {
                title: t("aiSettings.selectModel"),
                content: models,
                defaultSelected: model,
                onOk(value) {
                    setModel(String(value));
                },
            });
        } catch (error: any) {
            Toast.warn(
                t("aiSettings.modelsFailed", {
                    reason: getLocalizedAIErrorMessage(error),
                }),
            );
        } finally {
            setFetchingModels(false);
        }
    }

    async function testConnection() {
        if (testing || fetchingModels || saving) {
            return;
        }
        if (!draftConfigured) {
            Toast.warn(t("aiSettings.incomplete"));
            return;
        }

        setTesting(true);
        try {
            // A successful connection test is also the user's confirmation of
            // this draft. Persist it first so leaving this page afterwards
            // does not make the rest of the AI features appear unconfigured.
            await save();
            await testAIConnection({
                baseUrl,
                apiKey: apiKey.trim() || undefined,
                model,
            });
            Toast.success(t("aiSettings.testSuccess"));
        } catch (error: any) {
            Toast.warn(
                t("aiSettings.testFailed", {
                    reason: getLocalizedAIErrorMessage(error),
                }),
            );
        } finally {
            setTesting(false);
        }
    }

    async function saveSettings() {
        if (saving || testing || fetchingModels) {
            return;
        }

        setSaving(true);
        try {
            await save();
            Toast.success(t("toast.saveSuccess"));
        } catch (error: any) {
            Toast.warn(
                t("aiSettings.testFailed", {
                    reason: getLocalizedAIErrorMessage(error),
                }),
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <ScrollView
            style={styles.wrapper}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}>
            <View
                style={[
                    styles.statusBand,
                    {
                        borderBottomColor:
                            colors.controlBorder ?? colors.divider,
                    },
                ]}>
                <View
                    style={[
                        styles.statusIcon,
                        {
                            backgroundColor: Color(colors.primary)
                                .alpha(0.12)
                                .string(),
                        },
                    ]}>
                    <Icon
                        name="strategy"
                        size={rpx(28)}
                        color={colors.primary}
                    />
                </View>
                <View style={styles.statusCopy}>
                    <ThemeText fontSize="title" fontWeight="bold">
                        {draftConfigured
                            ? t("aiSettings.statusReady")
                            : t("aiSettings.statusIncomplete")}
                    </ThemeText>
                    <ThemeText
                        fontSize="description"
                        fontColor="textSecondary"
                        numberOfLines={1}>
                        {model.trim()
                            ? `${endpointName} · ${model.trim()}`
                            : endpointName}
                    </ThemeText>
                </View>
                <View
                    style={[
                        styles.statusDot,
                        {
                            backgroundColor: draftConfigured
                                ? colors.success
                                : colors.textSecondary,
                        },
                    ]}
                />
            </View>

            <SettingSection
                title={t("aiSettings.connection")}
                description={t("aiSettings.connectionDescription")}>
                <View style={styles.fields}>
                    <Field
                        label={t("aiSettings.baseUrl")}
                        hint={t("aiSettings.baseUrlDescription")}>
                        <Input
                            value={baseUrl}
                            onChangeText={setBaseUrl}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="url"
                            variant="outlined"
                        />
                    </Field>
                    <Field
                        label={t("aiSettings.apiKey")}
                        hint={t("aiSettings.apiKeyDescription")}>
                        <View style={styles.apiKeyRow}>
                            <View style={styles.apiKeyInput}>
                                <Input
                                    value={apiKey}
                                    onChangeText={setApiKey}
                                    placeholder={
                                        hasSavedApiKey
                                            ? t("aiSettings.apiKeyStored")
                                            : undefined
                                    }
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    secureTextEntry={!apiKeyVisible}
                                    variant="outlined"
                                />
                            </View>
                            <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityLabel={t(
                                    apiKeyVisible
                                        ? "aiSettings.hideApiKey"
                                        : "aiSettings.showApiKey",
                                )}
                                activeOpacity={0.7}
                                onPress={toggleApiKeyVisibility}
                                style={[
                                    styles.keyVisibilityButton,
                                    {
                                        backgroundColor: primaryTint,
                                    },
                                ]}>
                                <ThemeText
                                    fontSize="description"
                                    fontWeight="semibold"
                                    color={colors.primary}>
                                    {t(
                                        apiKeyVisible
                                            ? "aiSettings.hideApiKey"
                                            : "aiSettings.showApiKey",
                                    )}
                                </ThemeText>
                            </TouchableOpacity>
                        </View>
                        {hasSavedApiKey ? (
                            <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityLabel={t("aiSettings.clearApiKey")}
                                activeOpacity={0.7}
                                onPress={async () => {
                                    await clearAIApiKey();
                                    setHasSavedApiKey(false);
                                    setApiKey("");
                                    setApiKeyVisible(false);
                                    Toast.success(
                                        t("aiSettings.apiKeyCleared"),
                                    );
                                }}
                                style={styles.clearKeyButton}>
                                <ThemeText
                                    fontSize="description"
                                    color={colors.danger ?? colors.primary}>
                                    {t("aiSettings.clearApiKey")}
                                </ThemeText>
                            </TouchableOpacity>
                        ) : null}
                    </Field>
                    <Field label={t("aiSettings.model")}>
                        <View style={styles.modelRow}>
                            <View style={styles.modelInput}>
                                <Input
                                    value={model}
                                    onChangeText={setModel}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    variant="outlined"
                                />
                            </View>
                            <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityLabel={t("aiSettings.fetchModels")}
                                activeOpacity={0.72}
                                accessibilityState={{
                                    busy: fetchingModels,
                                    disabled:
                                        fetchingModels || testing || saving,
                                }}
                                disabled={fetchingModels || testing || saving}
                                onPress={getModels}
                                style={[
                                    styles.fetchButton,
                                    {
                                        backgroundColor: primaryTint,
                                    },
                                ]}>
                                {fetchingModels ? (
                                    <ActivityIndicator
                                        size="small"
                                        color={colors.primary}
                                    />
                                ) : (
                                    <Icon
                                        name="arrow-path"
                                        size={rpx(22)}
                                        color={colors.primary}
                                    />
                                )}
                                <ThemeText
                                    fontSize="description"
                                    fontWeight="semibold"
                                    color={colors.primary}
                                    numberOfLines={1}>
                                    {fetchingModels
                                        ? t("aiSettings.fetchingModels")
                                        : t("aiSettings.fetchModels")}
                                </ThemeText>
                            </TouchableOpacity>
                        </View>
                    </Field>
                </View>
            </SettingSection>

            <SettingSection
                title={t("aiSettings.dataPrivacy")}
                description={t("aiSettings.dataPrivacyDescription")}>
                <View style={styles.privacyActions}>
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={t("aiSettings.revokeConsent")}
                        activeOpacity={0.7}
                        onPress={() => {
                            revokeAIDataSharingConsent();
                            Toast.success(t("aiSettings.consentRevoked"));
                        }}>
                        <ThemeText
                            fontSize="description"
                            color={colors.primary}>
                            {t("aiSettings.revokeConsent")}
                        </ThemeText>
                    </TouchableOpacity>
                </View>
            </SettingSection>

            <SettingSection
                title={t("aiSettings.lyricTranslation")}
                description={t("aiSettings.lyricTranslationDescription")}>
                <View style={styles.fields}>
                    <Field
                        label={t("aiSettings.targetLanguage")}
                        hint={t("aiSettings.targetLanguageDescription")}>
                        <Input
                            value={targetLanguage}
                            onChangeText={setTargetLanguage}
                            placeholder={`${t(
                                "aiSettings.followAppLanguage",
                            )} (${getLanguage().name})`}
                            variant="outlined"
                        />
                    </Field>
                </View>
            </SettingSection>

            <View style={styles.actions}>
                <ActionButton
                    icon="check-circle-outline"
                    label={
                        testing
                            ? t("aiSettings.testing")
                            : t("aiSettings.testConnection")
                    }
                    loading={testing}
                    disabled={testing || fetchingModels || saving}
                    backgroundColor={colors.surfaceSecondary}
                    textColor={colors.text}
                    onPress={testConnection}
                />
                <ActionButton
                    icon="check"
                    label={t("common.save")}
                    loading={saving}
                    disabled={saving || testing || fetchingModels}
                    backgroundColor={primaryTint}
                    textColor={colors.primary}
                    onPress={saveSettings}
                />
            </View>
        </ScrollView>
    );
}

function Field({
    label,
    hint,
    children,
}: {
    label: string;
    hint?: string;
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
            {hint ? (
                <ThemeText
                    fontSize="description"
                    fontColor="textSecondary"
                    lineHeight
                    style={styles.fieldHint}>
                    {hint}
                </ThemeText>
            ) : null}
        </View>
    );
}

function ActionButton({
    icon,
    label,
    onPress,
    disabled,
    loading,
    backgroundColor,
    textColor,
}: {
    icon: "check-circle-outline" | "check";
    label: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
    backgroundColor?: string;
    textColor?: string;
}) {
    const colors = useColors();
    const resolvedTextColor = textColor ?? colors.text;

    return (
        <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ busy: loading, disabled }}
            activeOpacity={0.74}
            disabled={disabled}
            onPress={onPress}
            style={[
                styles.actionButton,
                {
                    backgroundColor: backgroundColor ?? "transparent",
                },
                disabled && styles.disabledAction,
            ]}>
            {loading ? (
                <ActivityIndicator size="small" color={resolvedTextColor} />
            ) : (
                <Icon name={icon} size={rpx(22)} color={resolvedTextColor} />
            )}
            <ThemeText
                fontWeight="semibold"
                color={resolvedTextColor}
                numberOfLines={1}>
                {label}
            </ThemeText>
        </TouchableOpacity>
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
    statusBand: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    statusIcon: {
        width: rpx(52),
        height: rpx(52),
        borderRadius: radius.sm,
        alignItems: "center",
        justifyContent: "center",
    },
    statusCopy: {
        flex: 1,
        gap: spacing.xs,
    },
    statusDot: {
        width: rpx(10),
        height: rpx(10),
        borderRadius: radius.pill,
    },
    fields: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
    },
    field: {
        marginBottom: spacing.lg,
    },
    fieldLabel: {
        marginBottom: spacing.xs,
    },
    fieldHint: {
        marginTop: spacing.xs,
    },
    clearKeyButton: {
        alignSelf: "flex-start",
        marginTop: spacing.xs,
        paddingVertical: spacing.xs,
    },
    apiKeyRow: {
        flexDirection: "row",
        alignItems: "stretch",
        gap: spacing.sm,
    },
    apiKeyInput: {
        flex: 1,
        minWidth: 0,
    },
    keyVisibilityButton: {
        minWidth: rpx(88),
        minHeight: rpx(68),
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacing.sm,
        borderRadius: radius.sm,
    },
    privacyActions: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    modelRow: {
        flexDirection: "row",
        alignItems: "stretch",
        gap: spacing.sm,
    },
    modelInput: {
        flex: 1,
        minWidth: 0,
    },
    fetchButton: {
        minWidth: rpx(142),
        minHeight: rpx(68),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.sm,
    },
    actions: {
        flexDirection: "row",
        gap: spacing.md,
        paddingHorizontal: spacing.md,
        marginTop: spacing.xl,
    },
    actionButton: {
        flex: 1,
        minHeight: rpx(72),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xs,
        borderRadius: radius.sm,
        paddingHorizontal: spacing.sm,
    },
    disabledAction: {
        opacity: 0.5,
    },
});
