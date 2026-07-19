export type MusicRecommendationExplorationLevel =
    | "familiar"
    | "balanced"
    | "explore";

export interface IRecommendationTrackIdentity {
    fingerprint: string;
    title: string;
    artist: string;
}

export interface IAIRecommendationTrack extends IRecommendationTrackIdentity {
    album?: string;
    reason: string;
    searchHints?: string[];
}

export interface IAIRecommendationPlan {
    intentSummary: string;
    tracks: IAIRecommendationTrack[];
    fallbackQueries: string[];
}

export interface IAIRecommendedMusic {
    music: IMusic.IMusicItem;
    reason: string;
    identity?: IRecommendationTrackIdentity;
}

export type MusicRecommendationStage =
    | "planning"
    | "resolving"
    | "backfilling"
    | "completed";

export interface IMusicRecommendationProgress {
    stage: MusicRecommendationStage;
    completed?: number;
    total?: number;
    matched?: number;
    target?: number;
}

export interface IMusicRecommendationDiagnostics {
    requestId: string;
    startedAt: number;
    completedAt: number;
    planningDurationMs: number;
    resolvingDurationMs: number;
    backfillDurationMs: number;
    plannedTrackCount: number;
    matchedTrackCount: number;
    usedFallback: boolean;
    partial: boolean;
    providerHost?: string;
    model?: string;
    compatibilityMode?: "json-object" | "prompt-only";
}

export interface IMusicRecommendationRunResult {
    plan: IAIRecommendationPlan;
    recommendations: IAIRecommendedMusic[];
    partial: boolean;
    diagnostics: IMusicRecommendationDiagnostics;
}
