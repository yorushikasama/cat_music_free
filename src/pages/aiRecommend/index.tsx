import AppBar from "@/components/base/appBar";
import Empty from "@/components/base/empty";
import Icon, { IIconName } from "@/components/base/icon";
import Input from "@/components/base/input";
import PageShell, { pageShellInsets } from "@/components/base/pageShell";
import ThemeText from "@/components/base/themeText";
import MusicItem from "@/components/mediaItem/musicItem";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import {
    AIError,
    clearIgnoredMusicRecommendationIds,
    clearMusicRecommendationCache,
    collectMusicRecommendationCandidates,
    ensureAIDataSharingConsent,
    getIgnoredMusicRecommendationIds,
    getLocalizedAIErrorMessage,
    getMusicRecommendationCache,
    ignoreMusicRecommendation,
    isAIConfigured,
    recommendMusicWithAI,
    setMusicRecommendationCache,
} from "@/core/ai";
import { useAppConfig } from "@/core/appConfig";
import { useI18N } from "@/core/i18n";
import { useMusicHistory } from "@/core/musicHistory";
import { ROUTE_PATH, useNavigate } from "@/core/router";
import TrackPlayer from "@/core/trackPlayer";
import useColors from "@/hooks/useColors";
import { getMediaUniqueKey } from "@/utils/mediaUtils";
import rpx from "@/utils/rpx";
import Toast from "@/utils/toast";
import Color from "color";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";

interface IAIRecommendPageProps {
    embedded?: boolean;
}

export function AIRecommendTab() {
    return <AIRecommendPage embedded />;
}

export default function AIRecommend() {
    return <AIRecommendPage />;
}

function AIRecommendPage({ embedded = false }: IAIRecommendPageProps) {
    const colors = useColors();
    const { t } = useI18N();
    const navigate = useNavigate();
    const history = useMusicHistory();
    const savedBaseUrl = useAppConfig("ai.baseUrl");
    const savedModel = useAppConfig("ai.model");
    const [configured, setConfigured] = useState(false);
    const quickPrompts = useMemo<
        Array<{ text: string; label: string; icon: IIconName }>
    >(
        () => [
            {
                text: t("aiRecommend.promptCommute"),
                label: t("aiRecommend.sceneCommute"),
                icon: "clock-outline",
            },
            {
                text: t("aiRecommend.promptWalk"),
                label: t("aiRecommend.sceneWalk"),
                icon: "motion-play",
            },
            {
                text: t("aiRecommend.promptFocus"),
                label: t("aiRecommend.sceneFocus"),
                icon: "crosshair",
            },
            {
                text: t("aiRecommend.promptExplore"),
                label: t("aiRecommend.sceneExplore"),
                icon: "shuffle",
            },
        ],
        [t],
    );
    const [prompt, setPrompt] = useState(() => quickPrompts[0].text);
    const initialCacheRef = useRef(getMusicRecommendationCache());
    const [recommendations, setRecommendations] = useState(
        initialCacheRef.current?.recommendations ?? [],
    );
    const [generatedPrompt, setGeneratedPrompt] = useState(
        initialCacheRef.current?.prompt ?? "",
    );
    const [cachedAt, setCachedAt] = useState(
        initialCacheRef.current?.createdAt,
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const activeRequestRef = useRef<{
        id: number;
        controller: AbortController;
    } | null>(null);
    const nextRequestIdRef = useRef(0);

    const primaryTint = useMemo(
        () =>
            Color(colors.primary)
                .alpha(colors.hasBackgroundImage ? 0.18 : 0.12)
                .string(),
        [colors.hasBackgroundImage, colors.primary],
    );
    const openSettings = useCallback(
        () => navigate(ROUTE_PATH.SETTING, { type: "ai" }),
        [navigate],
    );

    useEffect(() => {
        let active = true;
        isAIConfigured().then(value => {
            if (active) {
                setConfigured(value);
            }
        });
        return () => {
            active = false;
        };
    }, [savedBaseUrl, savedModel]);

    useEffect(() => {
        return () => {
            activeRequestRef.current?.controller.abort();
        };
    }, []);

    const generate = useCallback(async () => {
        if (activeRequestRef.current) {
            return;
        }
        if (!(await isAIConfigured())) {
            setConfigured(false);
            Toast.warn(t("aiRecommend.configureFirst"));
            openSettings();
            return;
        }
        if (!prompt.trim()) {
            Toast.warn(t("aiRecommend.promptRequired"));
            return;
        }
        if (!(await ensureAIDataSharingConsent("recommendation"))) {
            return;
        }

        const request = {
            id: ++nextRequestIdRef.current,
            controller: new AbortController(),
        };
        activeRequestRef.current = request;
        setLoading(true);
        setError("");
        try {
            const ignored = getIgnoredMusicRecommendationIds();
            const fetchedCandidates =
                await collectMusicRecommendationCandidates(
                    prompt.trim(),
                    history,
                );
            if (activeRequestRef.current?.id !== request.id) {
                return;
            }
            const candidates = fetchedCandidates.filter(
                music => !ignored.has(getMediaUniqueKey(music)),
            );
            const next = await recommendMusicWithAI({
                prompt: prompt.trim(),
                candidates,
                history,
                signal: request.controller.signal,
            });
            if (activeRequestRef.current?.id !== request.id) {
                return;
            }
            setRecommendations(next);
            setGeneratedPrompt(prompt.trim());
            const createdAt = Date.now();
            setCachedAt(createdAt);
            setMusicRecommendationCache({
                prompt: prompt.trim(),
                createdAt,
                recommendations: next,
            });
        } catch (reason: any) {
            if (reason instanceof AIError && reason.code === "aborted") {
                return;
            }
            const message = getLocalizedAIErrorMessage(reason);
            setError(message);
            Toast.warn(t("aiRecommend.failed", { reason: message }));
        } finally {
            if (activeRequestRef.current?.id === request.id) {
                activeRequestRef.current = null;
                setLoading(false);
            }
        }
    }, [history, openSettings, prompt, t]);

    return (
        <PageShell
            appBar={
                embedded ? null : (
                    <AppBar
                        actions={[
                            { icon: "cog-8-tooth", onPress: openSettings },
                            {
                                icon: "arrow-path",
                                onPress: loading ? undefined : generate,
                            },
                        ]}>
                        {t("aiRecommend.title")}
                    </AppBar>
                )
            }
            withStatusBar={!embedded}
            safeAreaEdges={embedded ? [] : ["top", "bottom"]}
            musicBar={!embedded}
            avoidMusicBar={!embedded}>
            <ScrollView
                contentContainerStyle={[
                    styles.content,
                    {
                        paddingBottom: embedded
                            ? spacing.xl
                            : pageShellInsets.musicBar + spacing.xl,
                    },
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View style={styles.headerCopy}>
                        {embedded ? (
                            <ThemeText fontSize="appbar" fontWeight="bold">
                                {t("aiRecommend.title")}
                            </ThemeText>
                        ) : null}
                        <View style={styles.statusLine}>
                            <View
                                style={[
                                    styles.statusDot,
                                    {
                                        backgroundColor: configured
                                            ? colors.success
                                            : colors.textSecondary,
                                    },
                                ]}
                            />
                            <ThemeText
                                fontSize="description"
                                fontColor="textSecondary"
                                numberOfLines={1}>
                                {configured
                                    ? savedModel
                                    : t("aiRecommend.notConfigured")}
                            </ThemeText>
                        </View>
                    </View>
                    {embedded ? (
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={t("sidebar.aiSettings")}
                            activeOpacity={0.7}
                            onPress={openSettings}
                            style={[
                                styles.settingsButton,
                                {
                                    backgroundColor: colors.surfaceSecondary,
                                    borderColor:
                                        colors.controlBorder ?? colors.divider,
                                },
                            ]}>
                            <Icon
                                name="cog-8-tooth"
                                size={rpx(26)}
                                color={colors.text}
                            />
                        </TouchableOpacity>
                    ) : null}
                </View>

                <View
                    style={[
                        styles.composer,
                        {
                            backgroundColor: colors.surfacePrimary,
                            borderColor: colors.controlBorder ?? colors.divider,
                        },
                    ]}>
                    <ThemeText fontSize="title" fontWeight="bold">
                        {t("aiRecommend.headline")}
                    </ThemeText>
                    <Input
                        value={prompt}
                        onChangeText={setPrompt}
                        multiline
                        placeholder={t("aiRecommend.placeholder")}
                        variant="outlined"
                        style={styles.promptInput}
                    />
                    <View style={styles.promptGrid}>
                        {quickPrompts.map(item => {
                            const active = prompt === item.text;
                            return (
                                <TouchableOpacity
                                    key={item.text}
                                    accessibilityRole="button"
                                    accessibilityLabel={item.text}
                                    accessibilityState={{ selected: active }}
                                    activeOpacity={0.72}
                                    onPress={() => setPrompt(item.text)}
                                    style={[
                                        styles.promptOption,
                                        {
                                            backgroundColor: active
                                                ? Color(colors.primary)
                                                    .alpha(0.12)
                                                    .string()
                                                : colors.surfaceSecondary,
                                            borderColor: active
                                                ? colors.primary
                                                : colors.controlBorder ??
                                                  colors.divider,
                                        },
                                    ]}>
                                    <Icon
                                        name={item.icon}
                                        size={rpx(22)}
                                        color={
                                            active
                                                ? colors.primary
                                                : colors.textSecondary
                                        }
                                    />
                                    <ThemeText
                                        fontSize="description"
                                        fontWeight={
                                            active ? "semibold" : "medium"
                                        }
                                        color={
                                            active
                                                ? colors.primary
                                                : colors.text
                                        }
                                        numberOfLines={1}
                                        style={styles.promptOptionText}>
                                        {item.label}
                                    </ThemeText>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={t("aiRecommend.generate")}
                        activeOpacity={0.78}
                        disabled={loading}
                        onPress={generate}
                        style={[
                            styles.generateButton,
                            { backgroundColor: primaryTint },
                            loading && styles.loadingButton,
                        ]}>
                        {loading ? (
                            <ActivityIndicator
                                size="small"
                                color={colors.primary}
                            />
                        ) : (
                            <Icon
                                name="strategy"
                                size={rpx(24)}
                                color={colors.primary}
                            />
                        )}
                        <ThemeText fontWeight="semibold" color={colors.primary}>
                            {loading
                                ? t("aiRecommend.generating")
                                : t("aiRecommend.generate")}
                        </ThemeText>
                    </TouchableOpacity>
                </View>

                <View style={styles.listHeader}>
                    <View style={styles.listHeaderCopy}>
                        <ThemeText fontSize="title" fontWeight="bold">
                            {t("aiRecommend.forYou")}
                        </ThemeText>
                        {generatedPrompt ? (
                            <ThemeText
                                fontSize="description"
                                fontColor="textSecondary"
                                numberOfLines={1}>
                                {generatedPrompt}
                            </ThemeText>
                        ) : null}
                    </View>
                    <View style={styles.listHeaderActions}>
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={t("aiRecommend.resetIgnored")}
                            activeOpacity={0.7}
                            onPress={() => {
                                clearIgnoredMusicRecommendationIds();
                                Toast.success(t("aiRecommend.ignoredReset"));
                            }}>
                            <ThemeText fontSize="tag" color={colors.primary}>
                                {t("aiRecommend.resetIgnored")}
                            </ThemeText>
                        </TouchableOpacity>
                        {cachedAt ? (
                            <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityLabel={t("aiRecommend.clearCache")}
                                activeOpacity={0.7}
                                onPress={() => {
                                    clearMusicRecommendationCache();
                                    setRecommendations([]);
                                    setGeneratedPrompt("");
                                    setCachedAt(undefined);
                                }}>
                                <ThemeText
                                    fontSize="tag"
                                    fontColor="textSecondary">
                                    {t("aiRecommend.clearCache")}
                                </ThemeText>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>

                {error ? (
                    <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={generate}
                        style={[
                            styles.errorRow,
                            {
                                backgroundColor: colors.surfaceSecondary,
                                borderColor:
                                    colors.controlBorder ?? colors.divider,
                            },
                        ]}>
                        <Icon
                            name="exclamation-circle"
                            size={rpx(22)}
                            color={colors.danger ?? colors.text}
                        />
                        <ThemeText
                            fontSize="description"
                            color={colors.danger ?? colors.text}
                            style={styles.errorText}>
                            {error}
                        </ThemeText>
                    </TouchableOpacity>
                ) : null}

                {!recommendations.length && !loading ? (
                    <Empty
                        icon="strategy"
                        minHeight={rpx(320)}
                        title={
                            configured
                                ? t("aiRecommend.emptyTitle")
                                : t("aiRecommend.setupTitle")
                        }
                        description={
                            configured
                                ? t("aiRecommend.emptyDescription")
                                : t("aiRecommend.setupDescription")
                        }
                        actionText={
                            configured
                                ? t("aiRecommend.generate")
                                : t("sidebar.aiSettings")
                        }
                        onAction={configured ? generate : openSettings}
                    />
                ) : null}

                {recommendations.map(({ music, reason }, index) => (
                    <View
                        key={getMediaUniqueKey(music)}
                        style={[
                            styles.recommendation,
                            { borderColor: colors.divider },
                        ]}>
                        <MusicItem
                            index={index + 1}
                            musicItem={music}
                            showMoreIcon
                            onItemPress={() =>
                                TrackPlayer.playWithReplacePlayList(
                                    music,
                                    recommendations.map(item => item.music),
                                )
                            }
                        />
                        <View style={styles.reasonRow}>
                            <ThemeText
                                fontSize="tag"
                                fontColor="textSecondary"
                                numberOfLines={2}
                                style={styles.reason}>
                                {reason}
                            </ThemeText>
                            <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityLabel={t(
                                    "aiRecommend.notInterested",
                                )}
                                activeOpacity={0.68}
                                style={styles.ignoreButton}
                                onPress={() => {
                                    ignoreMusicRecommendation(
                                        getMediaUniqueKey(music),
                                    );
                                    setRecommendations(current => {
                                        const next = current.filter(
                                            item =>
                                                getMediaUniqueKey(
                                                    item.music,
                                                ) !== getMediaUniqueKey(music),
                                        );
                                        setMusicRecommendationCache({
                                            prompt: generatedPrompt,
                                            createdAt: cachedAt ?? Date.now(),
                                            recommendations: next,
                                        });
                                        return next;
                                    });
                                }}>
                                <ThemeText
                                    fontSize="tag"
                                    color={colors.primary}>
                                    {t("aiRecommend.notInterested")}
                                </ThemeText>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </PageShell>
    );
}

const styles = StyleSheet.create({
    content: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
    },
    header: {
        minHeight: rpx(58),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.md,
        marginBottom: spacing.sm,
    },
    headerCopy: {
        flex: 1,
        gap: spacing.xs,
    },
    statusLine: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },
    statusDot: {
        width: rpx(9),
        height: rpx(9),
        borderRadius: radius.pill,
    },
    settingsButton: {
        width: rpx(54),
        height: rpx(54),
        borderRadius: radius.sm,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: "center",
        justifyContent: "center",
    },
    composer: {
        borderRadius: radius.sm,
        borderWidth: StyleSheet.hairlineWidth,
        padding: spacing.md,
        gap: spacing.sm,
    },
    promptInput: {
        minHeight: rpx(72),
        maxHeight: rpx(112),
        textAlignVertical: "top",
    },
    promptGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.sm,
    },
    promptOption: {
        flexGrow: 1,
        flexBasis: "46%",
        minHeight: rpx(58),
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        borderRadius: radius.sm,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },
    promptOptionText: {
        flex: 1,
    },
    generateButton: {
        minHeight: rpx(64),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.sm,
        borderRadius: radius.sm,
    },
    loadingButton: {
        opacity: 0.65,
    },
    listHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
        gap: spacing.sm,
    },
    listHeaderCopy: {
        flex: 1,
        gap: spacing.xs,
    },
    listHeaderActions: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: spacing.md,
        flexShrink: 0,
    },
    recommendation: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        paddingVertical: spacing.xs,
    },
    reasonRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.sm,
        paddingLeft: rpx(88),
        paddingRight: spacing.sm,
        paddingBottom: spacing.sm,
    },
    reason: {
        flex: 1,
    },
    ignoreButton: {
        minHeight: rpx(44),
        justifyContent: "center",
        flexShrink: 0,
    },
    errorRow: {
        minHeight: rpx(64),
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        borderRadius: radius.sm,
        borderWidth: StyleSheet.hairlineWidth,
        padding: spacing.sm,
        marginBottom: spacing.sm,
    },
    errorText: {
        flex: 1,
    },
});
