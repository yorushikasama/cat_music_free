import getOrCreateMMKV from "@/utils/getOrCreateMMKV";
import { safeParse, safeStringify } from "@/utils/jsonUtil";
import type { IAIRecommendedMusic } from "./musicRecommendation";

const store = getOrCreateMMKV("ai.MusicRecommendation");
const CACHE_KEY = "latest";
const IGNORED_KEY = "ignored";

export interface IAIRecommendationCache {
    prompt: string;
    createdAt: number;
    recommendations: IAIRecommendedMusic[];
}

function isRecommendationCache(value: unknown): value is IAIRecommendationCache {
    if (!value || typeof value !== "object") {
        return false;
    }
    const cache = value as Partial<IAIRecommendationCache>;
    return (
        typeof cache.prompt === "string" &&
        typeof cache.createdAt === "number" &&
        Array.isArray(cache.recommendations) &&
        cache.recommendations.every(
            item =>
                !!item &&
                typeof item === "object" &&
                typeof item.reason === "string" &&
                !!item.music &&
                typeof item.music.id === "string" &&
                typeof item.music.platform === "string" &&
                typeof item.music.title === "string" &&
                typeof item.music.artist === "string",
        )
    );
}

export function getMusicRecommendationCache() {
    const value = safeParse(store.getString(CACHE_KEY) ?? "null");
    return isRecommendationCache(value) ? value : null;
}

export function setMusicRecommendationCache(cache: IAIRecommendationCache) {
    store.set(CACHE_KEY, safeStringify(cache));
}

export function getIgnoredMusicRecommendationIds() {
    const value = safeParse(store.getString(IGNORED_KEY) ?? "[]");
    return new Set(Array.isArray(value) ? value.filter(item => typeof item === "string") : []);
}

export function ignoreMusicRecommendation(id: string) {
    const ids = getIgnoredMusicRecommendationIds();
    ids.add(id);
    store.set(IGNORED_KEY, safeStringify(Array.from(ids).slice(-200)));
}

export function clearMusicRecommendationCache() {
    store.delete(CACHE_KEY);
}

export function clearIgnoredMusicRecommendationIds() {
    store.delete(IGNORED_KEY);
}
