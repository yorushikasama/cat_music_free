import AppBar from "@/components/base/appBar";
import Empty from "@/components/base/empty";
import Icon, { IIconName } from "@/components/base/icon";
import Input from "@/components/base/input";
import PageShell, { pageShellInsets } from "@/components/base/pageShell";
import ThemeText from "@/components/base/themeText";
import MusicItem from "@/components/mediaItem/musicItem";
import { showPanel } from "@/components/panels/usePanel";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import {
    AIError,
    addMusicRecommendationHistory,
    clearIgnoredMusicRecommendationIds,
    clearLikedMusicRecommendationIds,
    clearMusicRecommendationCache,
    clearMusicRecommendationHistory,
    ensureAIDataSharingConsent,
    generateMusicRecommendations,
    getIgnoredMusicRecommendationIds,
    getIgnoredMusicRecommendationTracks,
    getMusicRecommendationIdentity,
    getLikedMusicRecommendationIds,
    getLikedMusicRecommendationTracks,
    getLocalizedAIErrorMessage,
    getMusicRecommendationCache,
    getMusicRecommendationHistory,
    ignoreMusicRecommendation,
    ignoreMusicRecommendationTrack,
    isAIConfigured,
    likeMusicRecommendation,
    likeMusicRecommendationTrack,
    MusicRecommendationExplorationLevel,
    setMusicRecommendationCache,
    unlikeMusicRecommendation,
    unlikeMusicRecommendationTrack,
    type IMusicRecommendationProgress,
    type IAIRecommendationPlan,
    type AIErrorCode,
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

type RecommendationProcessStep = {
    id: "planning" | "planned" | "resolving" | "backfilling";
    icon: IIconName;
    label: string;
    detail?: string;
    status: "pending" | "active" | "completed";
};

export function AIRecommendTab() {
    return <AIRecommendPage embedded />;
}

export default function AIRecommend() {
    return <AIRecommendPage />;
}

function AIRecommendPage({ embedded = false }: IAIRecommendPageProps) {
    const colors = useColors();
    const { t, getLanguage } = useI18N();
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
    const [allRecommendations, setAllRecommendations] = useState(
        () => initialCacheRef.current?.recommendations ?? [],
    );
    const [ignoredMusicIds, setIgnoredMusicIds] = useState(() =>
        getIgnoredMusicRecommendationIds(),
    );
    const [ignoredTrackFingerprints, setIgnoredTrackFingerprints] = useState(
        () => new Set(getIgnoredMusicRecommendationTracks().keys()),
    );
    const recommendations = useMemo(
        () =>
            allRecommendations.filter(
                item =>
                    !ignoredMusicIds.has(getMediaUniqueKey(item.music)) &&
                    !ignoredTrackFingerprints.has(
                        item.identity?.fingerprint ??
                            getMusicRecommendationIdentity(item.music)
                                .fingerprint,
                    ),
            ),
        [allRecommendations, ignoredMusicIds, ignoredTrackFingerprints],
    );
    const [generatedPrompt, setGeneratedPrompt] = useState(
        initialCacheRef.current?.prompt ?? "",
    );
    const [cachedAt, setCachedAt] = useState(
        initialCacheRef.current?.createdAt,
    );
    const [partialResult, setPartialResult] = useState(
        initialCacheRef.current?.partial === true,
    );
    const [recommendationPlan, setRecommendationPlan] =
        useState<IAIRecommendationPlan | undefined>(
            initialCacheRef.current?.plan,
        );
    const recommendationPlanRef = useRef<IAIRecommendationPlan | undefined>(
        initialCacheRef.current?.plan,
    );
    const [exploration, setExploration] =
        useState<MusicRecommendationExplorationLevel>(
            initialCacheRef.current?.exploration ?? "balanced",
        );
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState<IMusicRecommendationProgress | null>(
        null,
    );
    const [error, setError] = useState("");
    const [planResolutionError, setPlanResolutionError] =
        useState<AIErrorCode>();
    const [historyEntries, setHistoryEntries] = useState(() =>
        getMusicRecommendationHistory(),
    );
    const [likedMusicIds, setLikedMusicIds] = useState(() =>
        getLikedMusicRecommendationIds(),
    );
    const [likedTrackFingerprints, setLikedTrackFingerprints] = useState(
        () => new Set(getLikedMusicRecommendationTracks().keys()),
    );
    const explorationOptions = useMemo<
        Array<{
            value: MusicRecommendationExplorationLevel;
            label: string;
            description: string;
        }>
    >(
        () => [
            {
                value: "familiar",
                label: t("aiRecommend.explorationFamiliar"),
                description: t("aiRecommend.explorationFamiliarDescription"),
            },
            {
                value: "balanced",
                label: t("aiRecommend.explorationBalanced"),
                description: t("aiRecommend.explorationBalancedDescription"),
            },
            {
                value: "explore",
                label: t("aiRecommend.explorationExplore"),
                description: t("aiRecommend.explorationExploreDescription"),
            },
        ],
        [t],
    );
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
    const playRecommendations = useCallback(() => {
        if (!recommendations.length) {
            return;
        }
        TrackPlayer.playWithReplacePlayList(
            recommendations[0].music,
            recommendations.map(item => item.music),
        );
    }, [recommendations]);
    const saveRecommendationsToPlaylist = useCallback(() => {
        if (!recommendations.length) {
            return;
        }
        showPanel("AddToMusicSheet", {
            musicItem: recommendations.map(item => item.music),
            newSheetDefaultName:
                generatedPrompt || prompt.trim() || t("aiRecommend.title"),
        });
    }, [generatedPrompt, prompt, recommendations, t]);

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

    const generate = useCallback(
        async () => {
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
            setProgress({ stage: "planning" });
            setError("");
            setRecommendationPlan(undefined);
            recommendationPlanRef.current = undefined;
            setPlanResolutionError(undefined);
            try {
                const result = await generateMusicRecommendations({
                    prompt: prompt.trim(),
                    history,
                    likedTracks: Array.from(
                        getLikedMusicRecommendationTracks().values(),
                    ),
                    ignoredTracks: Array.from(
                        getIgnoredMusicRecommendationTracks().values(),
                    ),
                    exploration,
                    limit: 6,
                    outputLanguage: getLanguage().name,
                    signal: request.controller.signal,
                    onProgress: nextProgress => {
                        if (activeRequestRef.current?.id === request.id) {
                            setProgress(nextProgress);
                        }
                    },
                    onPlan: plan => {
                        if (activeRequestRef.current?.id === request.id) {
                            recommendationPlanRef.current = plan;
                            setRecommendationPlan(plan);
                        }
                    },
                    onRecommendations: next => {
                        if (activeRequestRef.current?.id === request.id) {
                            if (!recommendations.length) {
                                setAllRecommendations(next);
                            }
                        }
                    },
                });
                if (activeRequestRef.current?.id !== request.id) {
                    return;
                }
                setAllRecommendations(result.recommendations);
                setPartialResult(result.partial);
                recommendationPlanRef.current = result.plan;
                setRecommendationPlan(result.plan);
                setGeneratedPrompt(prompt.trim());
                const createdAt = Date.now();
                setCachedAt(createdAt);
                const cache = {
                    prompt: prompt.trim(),
                    createdAt,
                    recommendations: result.recommendations,
                    exploration,
                    version: 2 as const,
                    partial: result.partial,
                    plan: result.plan,
                    diagnostics: result.diagnostics,
                };
                setMusicRecommendationCache(cache);
                addMusicRecommendationHistory(cache);
                setHistoryEntries(getMusicRecommendationHistory());
            } catch (reason: any) {
                if (reason instanceof AIError && reason.code === "aborted") {
                    Toast.success(t("aiRecommend.cancelled"));
                    return;
                }
                if (reason instanceof AIError) {
                    setPlanResolutionError(reason.code);
                    if (
                        recommendationPlanRef.current &&
                        ["no-plugins", "no-candidates"].includes(reason.code)
                    ) {
                        return;
                    }
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
        },
        [
            exploration,
            history,
            getLanguage,
            openSettings,
            prompt,
            recommendations,
            t,
        ],
    );

    const progressLabel = useMemo(() => {
        if (!progress) {
            return "";
        }
        if (progress.stage === "planning") {
            return t("aiRecommend.planning");
        }
        if (progress.stage === "planned") {
            return t("aiRecommend.processPlanned", {
                count: progress.plannedTrackCount ?? 0,
            });
        }
        if (progress.stage === "resolving") {
            return t("aiRecommend.resolving", {
                completed: progress.completed ?? 0,
                total: progress.total ?? 0,
            });
        }
        if (progress.stage === "backfilling") {
            return t("aiRecommend.backfilling", {
                matched: progress.matched ?? 0,
            });
        }
        return t("aiRecommend.generating");
    }, [progress, t]);

    const processSteps = useMemo<RecommendationProcessStep[]>(() => {
        const stageOrder = {
            planning: 0,
            planned: 1,
            resolving: 2,
            backfilling: 3,
            completed: 4,
        } as const;
        const currentStage =
            progress?.stage ??
            (recommendationPlan
                ? recommendations.length
                    ? "completed"
                    : "planned"
                : undefined);
        const currentIndex = currentStage ? stageOrder[currentStage] : -1;
        const createStep = (
            id: RecommendationProcessStep["id"],
            icon: IIconName,
            label: string,
            detail: string | undefined,
            index: number,
        ): RecommendationProcessStep => ({
            id,
            icon,
            label,
            detail,
            status:
                currentIndex > index
                    ? "completed"
                    : currentIndex === index && loading
                        ? "active"
                        : currentIndex >= index
                            ? "completed"
                            : "pending",
        });
        return [
            createStep(
                "planning",
                "strategy",
                t("aiRecommend.processPlanning"),
                loading && progress?.stage === "planning"
                    ? t("aiRecommend.planning")
                    : undefined,
                0,
            ),
            createStep(
                "planned",
                "check-circle",
                t("aiRecommend.processPlanned", {
                    count: recommendationPlan?.tracks.length ??
                        progress?.plannedTrackCount ??
                        0,
                }),
                recommendationPlan?.intentSummary || undefined,
                1,
            ),
            createStep(
                "resolving",
                "magnifying-glass",
                t("aiRecommend.processResolving"),
                loading && progress?.stage === "resolving"
                    ? t("aiRecommend.resolving", {
                        completed: progress.completed ?? 0,
                        total: progress.total ?? 0,
                    })
                    : undefined,
                2,
            ),
            createStep(
                "backfilling",
                "arrow-path",
                t("aiRecommend.processBackfilling"),
                loading && progress?.stage === "backfilling"
                    ? t("aiRecommend.backfilling", {
                        matched: progress.matched ?? 0,
                    })
                    : undefined,
                3,
            ),
        ];
    }, [loading, progress, recommendationPlan, recommendations.length, t]);

    const conclusion = useMemo(() => {
        if (!recommendationPlan || loading) {
            return null;
        }
        if (!recommendations.length) {
            return {
                title: t("aiRecommend.conclusionPlanReady"),
                description:
                    planResolutionError === "no-plugins"
                        ? t("aiRecommend.conclusionNoPlugins", {
                            count: recommendationPlan.tracks.length,
                        })
                        : t("aiRecommend.conclusionNoPlayable", {
                            count: recommendationPlan.tracks.length,
                        }),
                icon: "information-circle" as const,
            };
        }
        return {
            title: t("aiRecommend.conclusionReady"),
            description: t("aiRecommend.conclusionPlayable", {
                planned: recommendationPlan.tracks.length,
                playable: recommendations.length,
            }),
            icon: "check-circle" as const,
        };
    }, [
        loading,
        planResolutionError,
        recommendationPlan,
        recommendations.length,
        t,
    ]);

    return (
        <PageShell
            appBar={
                embedded ? null : (
                    <AppBar
                        actions={[
                            { icon: "cog-8-tooth", onPress: openSettings },
                            {
                                icon: "arrow-path",
                                onPress: loading ? undefined : () => generate(),
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
                        onClear={() => setPrompt("")}
                        clearAccessibilityLabel={t("common.clear")}
                        multiline
                        placeholder={t("aiRecommend.placeholder")}
                        variant="outlined"
                        style={styles.promptInput}
                    />
                    <View style={styles.explorationSection}>
                        <ThemeText fontSize="description" fontWeight="semibold">
                            {t("aiRecommend.explorationTitle")}
                        </ThemeText>
                        <View
                            style={[
                                styles.explorationControl,
                                { backgroundColor: colors.surfaceSecondary },
                            ]}>
                            {explorationOptions.map(option => {
                                const active = exploration === option.value;
                                return (
                                    <TouchableOpacity
                                        key={option.value}
                                        accessibilityRole="button"
                                        accessibilityLabel={option.label}
                                        accessibilityHint={option.description}
                                        accessibilityState={{
                                            selected: active,
                                        }}
                                        activeOpacity={0.72}
                                        onPress={() =>
                                            setExploration(option.value)
                                        }
                                        style={[
                                            styles.explorationOption,
                                            active && {
                                                backgroundColor: Color(
                                                    colors.primary,
                                                )
                                                    .alpha(0.12)
                                                    .string(),
                                            },
                                        ]}>
                                        <ThemeText
                                            fontSize="tag"
                                            fontWeight={
                                                active ? "semibold" : "regular"
                                            }
                                            color={
                                                active
                                                    ? colors.primary
                                                    : colors.textSecondary
                                            }
                                            numberOfLines={1}>
                                            {option.label}
                                        </ThemeText>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <ThemeText fontSize="tag" fontColor="textSecondary">
                            {
                                explorationOptions.find(
                                    option => option.value === exploration,
                                )?.description
                            }
                        </ThemeText>
                    </View>
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
                        accessibilityLabel={
                            loading
                                ? t("aiRecommend.generating")
                                : t("aiRecommend.generate")
                        }
                        accessibilityState={{
                            busy: loading,
                            disabled: loading,
                        }}
                        activeOpacity={0.78}
                        disabled={loading}
                        onPress={() => generate()}
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
                                ? progressLabel || t("aiRecommend.generating")
                                : t("aiRecommend.generate")}
                        </ThemeText>
                    </TouchableOpacity>
                    {loading ? (
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={t("aiRecommend.cancel")}
                            activeOpacity={0.72}
                            onPress={() => activeRequestRef.current?.controller.abort()}
                            style={[
                                styles.cancelButton,
                                {
                                    backgroundColor: colors.surfaceSecondary,
                                    borderColor:
                                        colors.controlBorder ?? colors.divider,
                                },
                            ]}>
                            <Icon
                                name="x-mark"
                                size={rpx(18)}
                                color={colors.textSecondary}
                            />
                            <ThemeText
                                fontSize="description"
                                fontWeight="semibold"
                                fontColor="textSecondary">
                                {t("aiRecommend.cancel")}
                            </ThemeText>
                        </TouchableOpacity>
                    ) : null}
                </View>

                {(loading || recommendationPlan) ? (
                    <View
                        accessibilityLiveRegion="polite"
                        style={[
                            styles.processPanel,
                            {
                                backgroundColor: colors.surfaceSecondary,
                                borderColor:
                                    colors.controlBorder ?? colors.divider,
                            },
                        ]}>
                        <View style={styles.processHeader}>
                            <View style={styles.processHeaderCopy}>
                                <ThemeText fontSize="description" fontWeight="semibold">
                                    {t("aiRecommend.processTitle")}
                                </ThemeText>
                                <ThemeText fontSize="tag" fontColor="textSecondary">
                                    {loading
                                        ? progressLabel || t("aiRecommend.generating")
                                        : planResolutionError
                                            ? t("aiRecommend.processPlanReady")
                                            : t("aiRecommend.processComplete")}
                                </ThemeText>
                            </View>
                            {loading ? (
                                <ActivityIndicator
                                    size="small"
                                    color={colors.primary}
                                />
                            ) : (
                                <Icon
                                    name="check-circle"
                                    size={rpx(22)}
                                    color={colors.success ?? colors.primary}
                                />
                            )}
                        </View>
                        <View style={styles.processSteps}>
                            {processSteps.map((step, index) => {
                                const active = step.status === "active";
                                const completed = step.status === "completed";
                                const indicatorColor = completed
                                    ? colors.success ?? colors.primary
                                    : active
                                        ? colors.primary
                                        : colors.textSecondary;
                                return (
                                    <View key={step.id} style={styles.processStep}>
                                        <View style={styles.processIndicatorColumn}>
                                            <View
                                                style={[
                                                    styles.processIndicator,
                                                    {
                                                        backgroundColor: completed
                                                            ? Color(indicatorColor)
                                                                .alpha(0.15)
                                                                .string()
                                                            : active
                                                                ? primaryTint
                                                                : colors.surfacePrimary,
                                                        borderColor: completed || active
                                                            ? indicatorColor
                                                            : colors.divider,
                                                    },
                                                ]}>
                                                {active ? (
                                                    <ActivityIndicator
                                                        size="small"
                                                        color={indicatorColor}
                                                    />
                                                ) : (
                                                    <Icon
                                                        name={
                                                            completed
                                                                ? "check"
                                                                : step.icon
                                                        }
                                                        size={rpx(17)}
                                                        color={indicatorColor}
                                                    />
                                                )}
                                            </View>
                                            {index < processSteps.length - 1 ? (
                                                <View
                                                    style={[
                                                        styles.processConnector,
                                                        {
                                                            backgroundColor:
                                                                completed
                                                                    ? indicatorColor
                                                                    : colors.divider,
                                                        },
                                                    ]}
                                                />
                                            ) : null}
                                        </View>
                                        <View style={styles.processStepCopy}>
                                            <ThemeText
                                                fontSize="description"
                                                fontWeight={
                                                    active || completed
                                                        ? "semibold"
                                                        : "regular"
                                                }
                                                color={
                                                    active || completed
                                                        ? colors.text
                                                        : colors.textSecondary
                                                }>
                                                {step.label}
                                            </ThemeText>
                                            {step.detail ? (
                                                <ThemeText
                                                    fontSize="tag"
                                                    fontColor="textSecondary"
                                                    numberOfLines={2}>
                                                    {step.detail}
                                                </ThemeText>
                                            ) : null}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                ) : null}

                {historyEntries.length ? (
                    <View style={styles.historySection}>
                        <View style={styles.historyHeader}>
                            <ThemeText
                                fontSize="description"
                                fontWeight="semibold">
                                {t("aiRecommend.historyTitle")}
                            </ThemeText>
                            <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityLabel={t(
                                    "aiRecommend.clearHistory",
                                )}
                                activeOpacity={0.7}
                                onPress={() => {
                                    clearMusicRecommendationHistory();
                                    setHistoryEntries([]);
                                }}>
                                <ThemeText
                                    fontSize="tag"
                                    fontColor="textSecondary">
                                    {t("aiRecommend.clearHistory")}
                                </ThemeText>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.historyOptions}>
                            {historyEntries.slice(0, 3).map(entry => (
                                <TouchableOpacity
                                    key={entry.id}
                                    accessibilityRole="button"
                                    accessibilityLabel={entry.prompt}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        setPrompt(entry.prompt.split(" · ")[0]);
                                        setGeneratedPrompt(entry.prompt);
                                        setAllRecommendations(
                                            entry.recommendations,
                                        );
                                        setCachedAt(entry.createdAt);
                                        setPartialResult(entry.partial === true);
                                        recommendationPlanRef.current = entry.plan;
                                        setRecommendationPlan(entry.plan);
                                        setProgress({ stage: "completed" });
                                        setExploration(
                                            entry.exploration ?? "balanced",
                                        );
                                    }}
                                    style={[
                                        styles.historyOption,
                                        {
                                            backgroundColor:
                                                colors.surfaceSecondary,
                                            borderColor:
                                                colors.controlBorder ??
                                                colors.divider,
                                        },
                                    ]}>
                                    <Icon
                                        name="arrow-path"
                                        size={rpx(16)}
                                        color={colors.textSecondary}
                                    />
                                    <ThemeText
                                        fontSize="tag"
                                        fontColor="textSecondary"
                                        numberOfLines={1}
                                        style={styles.historyOptionText}>
                                        {entry.prompt}
                                    </ThemeText>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ) : null}

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
                        {partialResult ? (
                            <ThemeText
                                fontSize="tag"
                                fontColor="textSecondary"
                                numberOfLines={1}>
                                {t("aiRecommend.partial", {
                                    count: recommendations.length,
                                })}
                            </ThemeText>
                        ) : null}
                    </View>
                    <View style={styles.listHeaderActions}>
                        {recommendations.length ? (
                            <>
                                <TouchableOpacity
                                    accessibilityRole="button"
                                    accessibilityLabel={t(
                                        "aiRecommend.playAll",
                                    )}
                                    accessibilityState={{
                                        busy: loading,
                                        disabled: loading,
                                    }}
                                    activeOpacity={0.7}
                                    disabled={loading}
                                    style={[
                                        styles.headerIconAction,
                                        {
                                            backgroundColor:
                                                colors.surfaceSecondary,
                                            borderColor:
                                                colors.controlBorder ??
                                                colors.divider,
                                        },
                                        loading && styles.loadingButton,
                                    ]}
                                    onPress={playRecommendations}>
                                    <Icon
                                        name="motion-play"
                                        size={rpx(20)}
                                        color={colors.primary}
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    accessibilityRole="button"
                                    accessibilityLabel={t(
                                        "aiRecommend.saveToPlaylist",
                                    )}
                                    accessibilityState={{
                                        busy: loading,
                                        disabled: loading,
                                    }}
                                    activeOpacity={0.7}
                                    disabled={loading}
                                    style={[
                                        styles.headerIconAction,
                                        {
                                            backgroundColor:
                                                colors.surfaceSecondary,
                                            borderColor:
                                                colors.controlBorder ??
                                                colors.divider,
                                        },
                                        loading && styles.loadingButton,
                                    ]}
                                    onPress={saveRecommendationsToPlaylist}>
                                    <Icon
                                        name="folder-plus"
                                        size={rpx(20)}
                                        color={colors.primary}
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    accessibilityRole="button"
                                    accessibilityLabel={t(
                                        "aiRecommend.refresh",
                                    )}
                                    activeOpacity={0.7}
                                    disabled={loading}
                                    style={styles.headerAction}
                                    onPress={generate}>
                                    <ThemeText
                                        fontSize="tag"
                                        color={colors.primary}>
                                        {t("aiRecommend.refresh")}
                                    </ThemeText>
                                </TouchableOpacity>
                            </>
                        ) : null}
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={t("aiRecommend.resetIgnored")}
                            activeOpacity={0.7}
                            style={styles.headerAction}
                            onPress={() => {
                                clearIgnoredMusicRecommendationIds();
                                setIgnoredMusicIds(new Set());
                                setIgnoredTrackFingerprints(new Set());
                                Toast.success(t("aiRecommend.ignoredReset"));
                            }}>
                            <ThemeText fontSize="tag" color={colors.primary}>
                                {t("aiRecommend.resetIgnored")}
                            </ThemeText>
                        </TouchableOpacity>
                        {likedMusicIds.size ||
                        likedTrackFingerprints.size ||
                        recommendations.length ? (
                                <TouchableOpacity
                                    accessibilityRole="button"
                                    accessibilityLabel={t(
                                        "aiRecommend.clearPreferences",
                                    )}
                                    activeOpacity={0.7}
                                    style={styles.headerAction}
                                    onPress={() => {
                                        clearIgnoredMusicRecommendationIds();
                                        clearLikedMusicRecommendationIds();
                                        setIgnoredMusicIds(new Set());
                                        setLikedMusicIds(new Set());
                                        setIgnoredTrackFingerprints(new Set());
                                        setLikedTrackFingerprints(new Set());
                                        Toast.success(
                                            t("aiRecommend.preferencesCleared"),
                                        );
                                    }}>
                                    <ThemeText
                                        fontSize="tag"
                                        fontColor="textSecondary">
                                        {t("aiRecommend.clearPreferences")}
                                    </ThemeText>
                                </TouchableOpacity>
                            ) : null}
                        {cachedAt ? (
                            <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityLabel={t("aiRecommend.clearCache")}
                                activeOpacity={0.7}
                                style={styles.headerAction}
                                onPress={() => {
                                    clearMusicRecommendationCache();
                                    setAllRecommendations([]);
                                    setGeneratedPrompt("");
                                    setCachedAt(undefined);
                                    setPartialResult(false);
                                    recommendationPlanRef.current = undefined;
                                    setRecommendationPlan(undefined);
                                    setProgress(null);
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

                {conclusion ? (
                    <View
                        style={[
                            styles.conclusion,
                            {
                                backgroundColor: Color(colors.primary)
                                    .alpha(colors.hasBackgroundImage ? 0.13 : 0.08)
                                    .string(),
                                borderColor:
                                    colors.controlBorder ?? colors.divider,
                            },
                        ]}>
                        <Icon
                            name={conclusion.icon}
                            size={rpx(24)}
                            color={colors.primary}
                        />
                        <View style={styles.conclusionCopy}>
                            <ThemeText fontSize="description" fontWeight="semibold">
                                {conclusion.title}
                            </ThemeText>
                            <ThemeText fontSize="tag" fontColor="textSecondary">
                                {conclusion.description}
                            </ThemeText>
                        </View>
                    </View>
                ) : null}

                {error ? (
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={t("common.clickToRetry")}
                        accessibilityState={{ disabled: loading }}
                        activeOpacity={0.75}
                        disabled={loading}
                        onPress={() => generate()}
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

                {!recommendations.length && !loading && !recommendationPlan ? (
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

                {recommendations.map((item, index) => {
                    const { music, reason } = item;
                    const musicId = getMediaUniqueKey(music);
                    const identity =
                        item.identity ?? getMusicRecommendationIdentity(music);
                    const liked =
                        likedMusicIds.has(musicId) ||
                        likedTrackFingerprints.has(identity.fingerprint);
                    return (
                        <View
                            key={musicId}
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
                                        recommendations.map(
                                            recommendation => recommendation.music,
                                        ),
                                    )
                                }
                            />
                            <View style={styles.reasonRow}>
                                {reason ? (
                                    <ThemeText
                                        fontSize="tag"
                                        fontColor="textSecondary"
                                        numberOfLines={2}
                                        style={styles.reason}>
                                        {reason}
                                    </ThemeText>
                                ) : (
                                    <View style={styles.reason} />
                                )}
                                <TouchableOpacity
                                    accessibilityRole="button"
                                    accessibilityLabel={t(
                                        "aiRecommend.notInterested",
                                    )}
                                    activeOpacity={0.68}
                                    style={styles.ignoreButton}
                                    onPress={() => {
                                        ignoreMusicRecommendation(musicId);
                                        ignoreMusicRecommendationTrack(identity);
                                        setIgnoredMusicIds(current => {
                                            const next = new Set(current);
                                            next.add(musicId);
                                            return next;
                                        });
                                        setIgnoredTrackFingerprints(current => {
                                            const next = new Set(current);
                                            next.add(identity.fingerprint);
                                            return next;
                                        });
                                        setMusicRecommendationCache({
                                            prompt: generatedPrompt,
                                            createdAt: cachedAt ?? Date.now(),
                                            recommendations: allRecommendations,
                                            exploration,
                                            version: 2,
                                        });
                                    }}>
                                    <ThemeText
                                        fontSize="tag"
                                        color={colors.primary}>
                                        {t("aiRecommend.notInterested")}
                                    </ThemeText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    accessibilityRole="button"
                                    accessibilityLabel={t(
                                        "aiRecommend.moreLikeThis",
                                    )}
                                    accessibilityState={{ selected: liked }}
                                    activeOpacity={0.68}
                                    style={styles.ignoreButton}
                                    onPress={() => {
                                        if (liked) {
                                            unlikeMusicRecommendation(musicId);
                                            unlikeMusicRecommendationTrack(
                                                identity.fingerprint,
                                            );
                                        } else {
                                            likeMusicRecommendation(musicId);
                                            likeMusicRecommendationTrack(identity);
                                        }
                                        setLikedMusicIds(
                                            getLikedMusicRecommendationIds(),
                                        );
                                        setLikedTrackFingerprints(
                                            new Set(
                                                getLikedMusicRecommendationTracks().keys(),
                                            ),
                                        );
                                    }}>
                                    <ThemeText
                                        fontSize="tag"
                                        color={
                                            liked
                                                ? colors.primary
                                                : colors.textSecondary
                                        }>
                                        {liked
                                            ? t("aiRecommend.liked")
                                            : t("aiRecommend.moreLikeThis")}
                                    </ThemeText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                })}
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
    explorationSection: {
        gap: spacing.xs,
    },
    explorationControl: {
        minHeight: rpx(50),
        flexDirection: "row",
        borderRadius: radius.sm,
        padding: rpx(3),
    },
    explorationOption: {
        flex: 1,
        minWidth: 0,
        minHeight: rpx(44),
        borderRadius: radius.xs,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacing.xs,
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
    cancelButton: {
        minHeight: rpx(48),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xs,
        borderRadius: radius.sm,
        borderWidth: StyleSheet.hairlineWidth,
    },
    processPanel: {
        borderRadius: radius.sm,
        borderWidth: StyleSheet.hairlineWidth,
        padding: spacing.sm,
        gap: spacing.sm,
        marginTop: spacing.lg,
    },
    processHeader: {
        minHeight: rpx(40),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.sm,
    },
    processHeaderCopy: {
        flex: 1,
        gap: rpx(2),
    },
    processSteps: {
        gap: 0,
    },
    processStep: {
        minHeight: rpx(50),
        flexDirection: "row",
        gap: spacing.sm,
    },
    processIndicatorColumn: {
        width: rpx(30),
        alignItems: "center",
    },
    processIndicator: {
        width: rpx(28),
        height: rpx(28),
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: "center",
        justifyContent: "center",
    },
    processConnector: {
        flex: 1,
        width: StyleSheet.hairlineWidth,
        marginVertical: rpx(3),
    },
    processStepCopy: {
        flex: 1,
        minWidth: 0,
        gap: rpx(2),
        paddingBottom: spacing.xs,
    },
    loadingButton: {
        opacity: 0.65,
    },
    listHeader: {
        alignItems: "stretch",
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
        flexWrap: "wrap",
        gap: spacing.sm,
    },
    headerAction: {
        minHeight: rpx(44),
        justifyContent: "center",
    },
    headerIconAction: {
        width: rpx(44),
        height: rpx(44),
        borderRadius: radius.sm,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: "center",
        justifyContent: "center",
    },
    historySection: {
        marginTop: spacing.lg,
        gap: spacing.sm,
    },
    historyHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.sm,
    },
    historyOptions: {
        gap: spacing.xs,
    },
    historyOption: {
        minHeight: rpx(44),
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        borderRadius: radius.sm,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.sm,
    },
    historyOptionText: {
        flex: 1,
    },
    conclusion: {
        minHeight: rpx(68),
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        borderRadius: radius.sm,
        borderWidth: StyleSheet.hairlineWidth,
        padding: spacing.sm,
        marginBottom: spacing.sm,
    },
    conclusionCopy: {
        flex: 1,
        minWidth: 0,
        gap: rpx(2),
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
