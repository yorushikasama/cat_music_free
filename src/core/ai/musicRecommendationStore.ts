import getOrCreateMMKV from "@/utils/getOrCreateMMKV";
import { safeParse, safeStringify } from "@/utils/jsonUtil";
import type {
    IAIRecommendedMusic,
    MusicRecommendationExplorationLevel,
} from "./musicRecommendation";

const store = getOrCreateMMKV("ai.MusicRecommendation");
const CACHE_KEY = "latest";
const IGNORED_KEY = "ignored";
const HISTORY_KEY = "history";
const LIKED_KEY = "liked";
const HISTORY_LIMIT = 12;

export interface IAIRecommendationCache {
    prompt: string;
    createdAt: number;
    recommendations: IAIRecommendedMusic[];
    exploration?: MusicRecommendationExplorationLevel;
}

export interface IAIRecommendationHistoryEntry extends IAIRecommendationCache {
    id: string;
}

function isRecommendationCache(value: unknown): value is IAIRecommendationCache {
    if (!value || typeof value !== "object") {
        return false;
    }
    const cache = value as Partial<IAIRecommendationCache>;
    return (
        typeof cache.prompt === "string" &&
        typeof cache.createdAt === "number" &&
        (cache.exploration === undefined ||
            cache.exploration === "familiar" ||
            cache.exploration === "balanced" ||
            cache.exploration === "explore") &&
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

export function getMusicRecommendationHistory() {
    const value = safeParse(store.getString(HISTORY_KEY) ?? "[]");
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter(
        (item): item is IAIRecommendationHistoryEntry =>
            isRecommendationCache(item) &&
            typeof (item as IAIRecommendationHistoryEntry).id === "string",
    );
}

export function addMusicRecommendationHistory(cache: IAIRecommendationCache) {
    const entry: IAIRecommendationHistoryEntry = {
        ...cache,
        id: `${cache.createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    };
    const history = getMusicRecommendationHistory().filter(
        item => item.prompt !== cache.prompt,
    );
    store.set(HISTORY_KEY, safeStringify([entry, ...history].slice(0, HISTORY_LIMIT)));
}

export function clearMusicRecommendationHistory() {
    store.delete(HISTORY_KEY);
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

export function clearLikedMusicRecommendationIds() {
    store.delete(LIKED_KEY);
}

export function getLikedMusicRecommendationIds() {
    const value = safeParse(store.getString(LIKED_KEY) ?? "[]");
    return new Set(Array.isArray(value) ? value.filter(item => typeof item === "string") : []);
}

export function likeMusicRecommendation(id: string) {
    const ids = getLikedMusicRecommendationIds();
    ids.add(id);
    store.set(LIKED_KEY, safeStringify(Array.from(ids).slice(-200)));
}

export function unlikeMusicRecommendation(id: string) {
    const ids = getLikedMusicRecommendationIds();
    ids.delete(id);
    store.set(LIKED_KEY, safeStringify(Array.from(ids)));
}
