import AppBar from "@/components/base/appBar";
import Input from "@/components/base/input";
import PageShell, { pageShellInsets } from "@/components/base/pageShell";
import ThemeText from "@/components/base/themeText";
import MusicItem from "@/components/mediaItem/musicItem";
import { isAIConfigured } from "@/core/ai";
import {
    collectMusicRecommendationCandidates,
    getIgnoredMusicRecommendationIds,
    getMusicRecommendationCache,
    ignoreMusicRecommendation,
    recommendMusicWithAI,
    setMusicRecommendationCache,
} from "@/core/ai";
import { useI18N } from "@/core/i18n";
import { useMusicHistory } from "@/core/musicHistory";
import { ROUTE_PATH, useNavigate } from "@/core/router";
import TrackPlayer from "@/core/trackPlayer";
import useColors from "@/hooks/useColors";
import { radius } from "@/constants/borderRadius";
import { spacing } from "@/constants/spacing";
import { getMediaUniqueKey } from "@/utils/mediaUtils";
import Toast from "@/utils/toast";
import Color from "color";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import rpx from "@/utils/rpx";

export default function AIRecommend() {
    const colors = useColors();
    const { t } = useI18N();
    const navigate = useNavigate();
    const history = useMusicHistory();
    const quickPrompts = useMemo(
        () => [
            t("aiRecommend.promptCommute"),
            t("aiRecommend.promptWalk"),
            t("aiRecommend.promptFocus"),
            t("aiRecommend.promptExplore"),
        ],
        [t],
    );
    const [prompt, setPrompt] = useState(() => quickPrompts[0]);
    const [recommendations, setRecommendations] = useState(
        getMusicRecommendationCache()?.recommendations ?? [],
    );
    const [generatedPrompt, setGeneratedPrompt] = useState(
        getMusicRecommendationCache()?.prompt ?? "",
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const cachedAt = getMusicRecommendationCache()?.createdAt;
    const primaryText = useMemo(() => {
        try {
            return Color(colors.primary).isDark() ? "#ffffff" : "#111111";
        } catch {
            return "#ffffff";
        }
    }, [colors.primary]);

    const generate = useCallback(async () => {
        if (!isAIConfigured()) {
            Toast.warn(t("aiRecommend.configureFirst"));
            navigate(ROUTE_PATH.SETTING, { type: "ai" });
            return;
        }
        setLoading(true);
        setError("");
        try {
            const ignored = getIgnoredMusicRecommendationIds();
            const fetchedCandidates = await collectMusicRecommendationCandidates(prompt);
            const candidates = fetchedCandidates.filter(
                music => !ignored.has(getMediaUniqueKey(music)),
            );
            const next = await recommendMusicWithAI({
                prompt,
                candidates,
                history,
            });
            setRecommendations(next);
            setGeneratedPrompt(prompt);
            setMusicRecommendationCache({
                prompt,
                createdAt: Date.now(),
                recommendations: next,
            });
        } catch (reason: any) {
            const message = reason?.message ?? String(reason);
            setError(message);
            Toast.warn(t("aiRecommend.failed", { reason: message }));
        } finally {
            setLoading(false);
        }
    }, [history, navigate, prompt, t]);

    useEffect(() => {
        if (!recommendations.length && isAIConfigured()) {
            generate();
        }
    }, [generate, recommendations.length]);

    return (
        <PageShell
            appBar={
                <AppBar
                    actions={[{ icon: "arrow-path", onPress: generate }]}>
                    {t("aiRecommend.title")}
                </AppBar>
            }
            musicBar
            avoidMusicBar>
            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                <View
                    style={[
                        styles.intro,
                        {
                            backgroundColor: colors.surfacePrimary,
                            borderColor: colors.divider,
                        },
                    ]}>
                    <View style={styles.introHeader}>
                        <View
                            style={[
                                styles.introIcon,
                                { backgroundColor: Color(colors.primary).alpha(0.14).toString() },
                            ]}>
                            <ThemeText fontSize="title" style={{ color: colors.primary }}>
                                AI
                            </ThemeText>
                        </View>
                        <View style={styles.introCopy}>
                            <ThemeText fontSize="title" fontWeight="bold">
                                {t("aiRecommend.headline")}
                            </ThemeText>
                        </View>
                    </View>
                    <Input
                        value={prompt}
                        onChangeText={setPrompt}
                        multiline
                        placeholder={t("aiRecommend.placeholder")}
                        variant="outlined"
                        style={styles.promptInput}
                    />
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.promptChips}>
                        {quickPrompts.map(item => {
                            const active = prompt === item;
                            return (
                                <TouchableOpacity
                                    key={item}
                                    activeOpacity={0.75}
                                    onPress={() => setPrompt(item)}
                                    style={[
                                        styles.promptChip,
                                        {
                                            backgroundColor: active
                                                ? Color(colors.primary).alpha(0.14).toString()
                                                : colors.surfaceTertiary,
                                            borderColor: active ? colors.primary : colors.divider,
                                        },
                                    ]}>
                                    <ThemeText
                                        fontSize="tag"
                                        numberOfLines={1}
                                        style={{ color: active ? colors.primary : colors.text }}>
                                        {item}
                                    </ThemeText>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                    <TouchableOpacity
                        activeOpacity={0.78}
                        disabled={loading}
                        onPress={generate}
                        style={[
                            styles.generateButton,
                            loading ? styles.loadingButton : null,
                            { backgroundColor: colors.primary },
                        ]}>
                        <ThemeText fontWeight="semibold" style={{ color: primaryText }}>
                            {loading ? t("aiRecommend.generating") : t("aiRecommend.generate")}
                        </ThemeText>
                    </TouchableOpacity>
                </View>

                <View style={styles.listHeader}>
                    <View>
                        <ThemeText fontSize="title" fontWeight="bold">
                            {t("aiRecommend.forYou")}
                        </ThemeText>
                        {generatedPrompt ? (
                            <ThemeText fontSize="description" fontColor="textSecondary" numberOfLines={1}>
                                {generatedPrompt}
                            </ThemeText>
                        ) : null}
                    </View>
                    {cachedAt ? (
                        <ThemeText fontSize="tag" fontColor="textSecondary">
                            {t("aiRecommend.cached")}
                        </ThemeText>
                    ) : null}
                </View>

                {error ? (
                    <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={generate}
                        style={[styles.errorRow, { backgroundColor: colors.surfaceSecondary }]}>
                        <ThemeText fontSize="description" style={{ color: colors.danger ?? colors.text }}>
                            {error}
                        </ThemeText>
                    </TouchableOpacity>
                ) : null}

                {recommendations.map(({ music, reason }, index) => (
                    <View
                        key={getMediaUniqueKey(music)}
                        style={[styles.recommendation, { borderColor: colors.divider }]}>
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
                            <ThemeText fontSize="tag" fontColor="textSecondary" style={styles.reason}>
                                {reason}
                            </ThemeText>
                            <TouchableOpacity
                                accessibilityLabel={t("aiRecommend.notInterested")}
                                onPress={() => {
                                    ignoreMusicRecommendation(getMediaUniqueKey(music));
                                    setRecommendations(current => {
                                        const next = current.filter(item =>
                                            getMediaUniqueKey(item.music) !== getMediaUniqueKey(music),
                                        );
                                        setMusicRecommendationCache({
                                            prompt: generatedPrompt,
                                            createdAt: cachedAt ?? Date.now(),
                                            recommendations: next,
                                        });
                                        return next;
                                    });
                                }}>
                                <ThemeText fontSize="tag" style={{ color: colors.primary }}>
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
        paddingTop: spacing.md,
        paddingBottom: pageShellInsets.musicBar + spacing.xl,
    },
    intro: {
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        padding: spacing.md,
    },
    introHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.md,
    },
    introIcon: {
        width: rpx(64),
        height: rpx(64),
        borderRadius: radius.md,
        alignItems: "center",
        justifyContent: "center",
        marginRight: spacing.sm,
    },
    introCopy: {
        flex: 1,
        gap: spacing.xs,
    },
    promptInput: {
        minHeight: rpx(88),
        textAlignVertical: "top",
    },
    promptChips: {
        gap: spacing.sm,
        paddingVertical: spacing.md,
    },
    promptChip: {
        maxWidth: rpx(300),
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: spacing.sm,
        paddingVertical: rpx(10),
    },
    generateButton: {
        minHeight: rpx(72),
        borderRadius: radius.sm,
        alignItems: "center",
        justifyContent: "center",
    },
    loadingButton: {
        opacity: 0.6,
    },
    listHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: spacing.xl,
        marginBottom: spacing.sm,
        gap: spacing.sm,
    },
    recommendation: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        paddingVertical: spacing.xs,
    },
    reasonRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.md,
        paddingLeft: rpx(88),
        paddingRight: spacing.sm,
        paddingBottom: spacing.sm,
    },
    reason: {
        flex: 1,
    },
    errorRow: {
        borderRadius: radius.sm,
        padding: spacing.sm,
        marginBottom: spacing.sm,
    },
});
