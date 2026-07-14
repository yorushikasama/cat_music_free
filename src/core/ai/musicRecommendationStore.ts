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

export function getMusicRecommendationCache() {
    return safeParse(
        store.getString(CACHE_KEY) ?? "null",
    ) as IAIRecommendationCache | null;
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
