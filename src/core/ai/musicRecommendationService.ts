import { AIError, getAIClientConfig } from "./client";
import { planMusicRecommendations } from "./musicRecommendationPlanner";
import {
    resolveMusicRecommendationFallbackQueries,
    resolveMusicRecommendationTracks,
} from "./musicRecommendationResolver";
import type {
    IAIRecommendedMusic,
    IMusicRecommendationProgress,
    IMusicRecommendationRunResult,
    IRecommendationTrackIdentity,
    MusicRecommendationExplorationLevel,
} from "./musicRecommendationTypes";

function createRequestId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function generateMusicRecommendations(params: {
    prompt: string;
    history: IMusic.IMusicItem[];
    exploration?: MusicRecommendationExplorationLevel;
    refinement?: string;
    previousRecommendations?: IAIRecommendedMusic[];
    likedTracks?: IRecommendationTrackIdentity[];
    ignoredTracks?: IRecommendationTrackIdentity[];
    limit?: number;
    signal?: AbortSignal;
    onProgress?: (progress: IMusicRecommendationProgress) => void;
    onRecommendations?: (recommendations: IAIRecommendedMusic[]) => void;
}): Promise<IMusicRecommendationRunResult> {
    const startedAt = Date.now();
    const requestId = createRequestId();
    const limit = Math.max(1, Math.min(12, params.limit ?? 10));
    const config = await getAIClientConfig();
    params.onProgress?.({ stage: "planning" });
    const planningStartedAt = Date.now();
    const planned = await planMusicRecommendations({
        ...params,
        limit,
    });
    const planningDurationMs = Date.now() - planningStartedAt;
    const ignoredFingerprints = new Set(
        (params.ignoredTracks ?? []).map(item => item.fingerprint),
    );
    const tracks = planned.plan.tracks.filter(
        track => !ignoredFingerprints.has(track.fingerprint),
    );
    const resolvingStartedAt = Date.now();
    let recommendations = await resolveMusicRecommendationTracks(tracks, {
        target: limit,
        signal: params.signal,
        onProgress: params.onProgress,
        onMatch: params.onRecommendations,
    });
    const resolvingDurationMs = Date.now() - resolvingStartedAt;
    let backfillDurationMs = 0;
    let usedFallback = false;
    if (recommendations.length < limit && planned.plan.fallbackQueries.length) {
        usedFallback = true;
        const backfillStartedAt = Date.now();
        recommendations = await resolveMusicRecommendationFallbackQueries(
            planned.plan.fallbackQueries,
            recommendations,
            {
                target: limit,
                signal: params.signal,
                onProgress: params.onProgress,
                onMatch: params.onRecommendations,
                excludedFingerprints: ignoredFingerprints,
            },
        );
        backfillDurationMs = Date.now() - backfillStartedAt;
    }
    if (!recommendations.length) {
        throw new AIError(
            "no-candidates",
            "No playable songs could be resolved from this recommendation",
        );
    }
    const completedAt = Date.now();
    const partial = recommendations.length < limit;
    const diagnostics = {
        requestId,
        startedAt,
        completedAt,
        planningDurationMs,
        resolvingDurationMs,
        backfillDurationMs,
        plannedTrackCount: planned.plan.tracks.length,
        matchedTrackCount: recommendations.length,
        usedFallback,
        partial,
        providerHost: new URL(config.baseUrl).host,
        model: config.model,
        compatibilityMode: planned.responseFormat,
    } as const;
    params.onProgress?.({
        stage: "completed",
        matched: recommendations.length,
        target: limit,
    });
    return {
        plan: planned.plan,
        recommendations,
        partial,
        diagnostics,
    };
}
