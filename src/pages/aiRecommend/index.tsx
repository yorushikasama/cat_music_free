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
    collectMusicRecommendationCandidates,
    ensureAIDataSharingConsent,
    getIgnoredMusicRecommendationIds,
    getLikedMusicRecommendationIds,
    getLocalizedAIErrorMessage,
    getMusicRecommendationCache,
    getMusicRecommendationHistory,
    ignoreMusicRecommendation,
    isAIConfigured,
    likeMusicRecommendation,
    MusicRecommendationExplorationLevel,
    recommendMusicWithAI,
    setMusicRecommendationCache,
    unlikeMusicRecommendation,
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
    const [allRecommendations, setAllRecommendations] = useState(
        () => initialCacheRef.current?.recommendations ?? [],
    );
    const [ignoredMusicIds, setIgnoredMusicIds] = useState(() =>
        getIgnoredMusicRecommendationIds(),
    );
    const recommendations = useMemo(
        () =>
            allRecommendations.filter(
                ({ music }) => !ignoredMusicIds.has(getMediaUniqueKey(music)),
            ),
        [allRecommendations, ignoredMusicIds],
    );
    const [generatedPrompt, setGeneratedPrompt] = useState(
        initialCacheRef.current?.prompt ?? "",
    );
    const [cachedAt, setCachedAt] = useState(
        initialCacheRef.current?.createdAt,
    );
    const [exploration, setExploration] =
        useState<MusicRecommendationExplorationLevel>(
            initialCacheRef.current?.exploration ?? "balanced",
        );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [refinement, setRefinement] = useState("");
    const [historyEntries, setHistoryEntries] = useState(() =>
        getMusicRecommendationHistory(),
    );
    const [likedMusicIds, setLikedMusicIds] = useState(() =>
        getLikedMusicRecommendationIds(),
    );
    const refinementOptions = useMemo(
        () => [
            t("aiRecommend.refineFaster"),
            t("aiRecommend.refineFewerVocals"),
            t("aiRecommend.refineCantonese"),
            t("aiRecommend.refineDifferentArtists"),
        ],
        [t],
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
        async (requestedRefinement?: string, replaceCurrent = false) => {
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
                const refinementInstruction = requestedRefinement?.trim();
                const fetchedCandidates =
                    await collectMusicRecommendationCandidates(
                        prompt.trim(),
                        history,
                        exploration,
                    );
                if (activeRequestRef.current?.id !== request.id) {
                    return;
                }
                const excludedIds = new Set(
                    replaceCurrent
                        ? recommendations.map(item =>
                            getMediaUniqueKey(item.music),
                        )
                        : [],
                );
                const candidates = Array.from(
                    new Map(
                        [
                            ...fetchedCandidates,
                            ...recommendations.map(item => item.music),
                        ]
                            .filter(music => {
                                const id = getMediaUniqueKey(music);
                                return !ignored.has(id) && !excludedIds.has(id);
                            })
                            .map(
                                music =>
                                    [getMediaUniqueKey(music), music] as const,
                            ),
                    ).values(),
                );
                const next = await recommendMusicWithAI({
                    prompt: prompt.trim(),
                    candidates,
                    history,
                    previousRecommendations: refinementInstruction
                        ? recommendations
                        : undefined,
                    refinement: refinementInstruction,
                    likedMusicIds: Array.from(likedMusicIds),
                    exploration,
                    signal: request.controller.signal,
                });
                if (activeRequestRef.current?.id !== request.id) {
                    return;
                }
                setAllRecommendations(next);
                setGeneratedPrompt(
                    refinementInstruction
                        ? `${prompt.trim()} · ${refinementInstruction}`
                        : prompt.trim(),
                );
                const createdAt = Date.now();
                setCachedAt(createdAt);
                const cache = {
                    prompt: refinementInstruction
                        ? `${prompt.trim()} · ${refinementInstruction}`
                        : prompt.trim(),
                    createdAt,
                    recommendations: next,
                    exploration,
                };
                setMusicRecommendationCache(cache);
                addMusicRecommendationHistory(cache);
                setHistoryEntries(getMusicRecommendationHistory());
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
        },
        [
            exploration,
            history,
            likedMusicIds,
            openSettings,
            prompt,
            recommendations,
            t,
        ],
    );

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
                                ? t("aiRecommend.generating")
                                : t("aiRecommend.generate")}
                        </ThemeText>
                    </TouchableOpacity>
                </View>

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
                                    onPress={() => generate(undefined, true)}>
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
                                Toast.success(t("aiRecommend.ignoredReset"));
                            }}>
                            <ThemeText fontSize="tag" color={colors.primary}>
                                {t("aiRecommend.resetIgnored")}
                            </ThemeText>
                        </TouchableOpacity>
                        {likedMusicIds.size || recommendations.length ? (
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

                {recommendations.length ? (
                    <View
                        style={[
                            styles.refinement,
                            {
                                backgroundColor: colors.surfaceSecondary,
                                borderColor:
                                    colors.controlBorder ?? colors.divider,
                            },
                        ]}>
                        <ThemeText fontSize="description" fontWeight="semibold">
                            {t("aiRecommend.refineTitle")}
                        </ThemeText>
                        <View style={styles.refinementOptions}>
                            {refinementOptions.map(option => (
                                <TouchableOpacity
                                    key={option}
                                    accessibilityRole="button"
                                    accessibilityLabel={option}
                                    disabled={loading}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        setRefinement(option);
                                        generate(option);
                                    }}
                                    style={[
                                        styles.refinementOption,
                                        { borderColor: colors.divider },
                                    ]}>
                                    <ThemeText
                                        fontSize="tag"
                                        color={colors.primary}
                                        numberOfLines={1}>
                                        {option}
                                    </ThemeText>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Input
                            value={refinement}
                            onChangeText={setRefinement}
                            accessibilityLabel={t(
                                "aiRecommend.refinePlaceholder",
                            )}
                            placeholder={t("aiRecommend.refinePlaceholder")}
                            variant="outlined"
                        />
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={
                                loading
                                    ? t("aiRecommend.generating")
                                    : t("aiRecommend.refineGenerate")
                            }
                            accessibilityState={{
                                disabled: loading || !refinement.trim(),
                                busy: loading,
                            }}
                            disabled={loading || !refinement.trim()}
                            activeOpacity={0.72}
                            onPress={() => generate(refinement)}
                            style={[
                                styles.refineButton,
                                { backgroundColor: primaryTint },
                                (loading || !refinement.trim()) &&
                                    styles.loadingButton,
                            ]}>
                            {loading ? (
                                <ActivityIndicator
                                    size="small"
                                    color={colors.primary}
                                />
                            ) : (
                                <Icon
                                    name="arrow-path"
                                    size={rpx(20)}
                                    color={colors.primary}
                                />
                            )}
                            <ThemeText
                                fontSize="description"
                                fontWeight="semibold"
                                color={colors.primary}>
                                {loading
                                    ? t("aiRecommend.generating")
                                    : t("aiRecommend.refineGenerate")}
                            </ThemeText>
                        </TouchableOpacity>
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

                {recommendations.map(({ music, reason }, index) => {
                    const musicId = getMediaUniqueKey(music);
                    const liked = likedMusicIds.has(musicId);
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
                                        ignoreMusicRecommendation(musicId);
                                        setIgnoredMusicIds(current => {
                                            const next = new Set(current);
                                            next.add(musicId);
                                            return next;
                                        });
                                        setMusicRecommendationCache({
                                            prompt: generatedPrompt,
                                            createdAt: cachedAt ?? Date.now(),
                                            recommendations: allRecommendations,
                                            exploration,
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
                                        } else {
                                            likeMusicRecommendation(musicId);
                                        }
                                        setLikedMusicIds(
                                            getLikedMusicRecommendationIds(),
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
    refinement: {
        borderRadius: radius.sm,
        borderWidth: StyleSheet.hairlineWidth,
        padding: spacing.sm,
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    refinementOptions: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.xs,
    },
    refinementOption: {
        minHeight: rpx(44),
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        justifyContent: "center",
        paddingHorizontal: spacing.sm,
    },
    refineButton: {
        minHeight: rpx(48),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xs,
        borderRadius: radius.sm,
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
