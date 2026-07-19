import getOrCreateMMKV from "@/utils/getOrCreateMMKV";
import { safeParse, safeStringify } from "@/utils/jsonUtil";
import type {
    IAIRecommendedMusic,
    MusicRecommendationExplorationLevel,
} from "./musicRecommendationTypes";
import { createMusicRecommendationIdentity } from "./musicRecommendationIdentity";
import type { IRecommendationTrackIdentity } from "./musicRecommendationTypes";
import type {
    IAIRecommendationPlan,
    IMusicRecommendationDiagnostics,
} from "./musicRecommendationTypes";

const store = getOrCreateMMKV("ai.MusicRecommendation");
const CACHE_KEY = "latest";
const IGNORED_KEY = "ignored";
const IGNORED_TRACKS_KEY = "ignoredTracks";
const HISTORY_KEY = "history";
const LIKED_KEY = "liked";
const LIKED_TRACKS_KEY = "likedTracks";
const HISTORY_LIMIT = 12;

export interface IAIRecommendationCache {
    version?: 2;
    prompt: string;
    createdAt: number;
    recommendations: IAIRecommendedMusic[];
    exploration?: MusicRecommendationExplorationLevel;
    partial?: boolean;
    plan?: IAIRecommendationPlan;
    diagnostics?: IMusicRecommendationDiagnostics;
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
                typeof item.music.artist === "string" &&
                (item.identity === undefined ||
                    (typeof item.identity === "object" &&
                        typeof item.identity.fingerprint === "string" &&
                        typeof item.identity.title === "string" &&
                        typeof item.identity.artist === "string")),
        ) &&
        (cache.plan === undefined ||
            (typeof cache.plan === "object" &&
                Array.isArray(cache.plan.tracks) &&
                Array.isArray(cache.plan.fallbackQueries)))
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

function getTrackIdentitySet(key: string) {
    const value = safeParse(store.getString(key) ?? "[]");
    return new Map(
        Array.isArray(value)
            ? value
                .filter(
                    (item): item is IRecommendationTrackIdentity =>
                        !!item &&
                        typeof item === "object" &&
                        typeof item.fingerprint === "string" &&
                        typeof item.title === "string" &&
                        typeof item.artist === "string",
                )
                .map(item => [item.fingerprint, item] as const)
            : [],
    );
}

function saveTrackIdentitySet(
    key: string,
    identities: Iterable<IRecommendationTrackIdentity>,
) {
    store.set(
        key,
        safeStringify(Array.from(identities).slice(-200)),
    );
}

export function getIgnoredMusicRecommendationTracks() {
    return getTrackIdentitySet(IGNORED_TRACKS_KEY);
}

export function getLikedMusicRecommendationTracks() {
    return getTrackIdentitySet(LIKED_TRACKS_KEY);
}

export function getMusicRecommendationIdentity(music: IMusic.IMusicItem) {
    return createMusicRecommendationIdentity(music);
}

export function ignoreMusicRecommendation(id: string) {
    const ids = getIgnoredMusicRecommendationIds();
    ids.add(id);
    store.set(IGNORED_KEY, safeStringify(Array.from(ids).slice(-200)));
}

export function ignoreMusicRecommendationTrack(
    identity: IRecommendationTrackIdentity,
) {
    const tracks = getIgnoredMusicRecommendationTracks();
    tracks.set(identity.fingerprint, identity);
    saveTrackIdentitySet(IGNORED_TRACKS_KEY, tracks.values());
}

export function clearMusicRecommendationCache() {
    store.delete(CACHE_KEY);
}

export function clearIgnoredMusicRecommendationIds() {
    store.delete(IGNORED_KEY);
    store.delete(IGNORED_TRACKS_KEY);
}

export function clearLikedMusicRecommendationIds() {
    store.delete(LIKED_KEY);
    store.delete(LIKED_TRACKS_KEY);
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

export function likeMusicRecommendationTrack(
    identity: IRecommendationTrackIdentity,
) {
    const tracks = getLikedMusicRecommendationTracks();
    tracks.set(identity.fingerprint, identity);
    saveTrackIdentitySet(LIKED_TRACKS_KEY, tracks.values());
}

export function unlikeMusicRecommendation(id: string) {
    const ids = getLikedMusicRecommendationIds();
    ids.delete(id);
    store.set(LIKED_KEY, safeStringify(Array.from(ids)));
}

export function unlikeMusicRecommendationTrack(fingerprint: string) {
    const tracks = getLikedMusicRecommendationTracks();
    tracks.delete(fingerprint);
    saveTrackIdentitySet(LIKED_TRACKS_KEY, tracks.values());
}
