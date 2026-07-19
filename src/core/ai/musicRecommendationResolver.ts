import PluginManager from "@/core/pluginManager";
import { getMediaUniqueKey } from "@/utils/mediaUtils";
import { AIError } from "./client";
import { createMusicRecommendationIdentity } from "./musicRecommendationIdentity";
import type {
    IAIRecommendationTrack,
    IAIRecommendedMusic,
    IMusicRecommendationProgress,
} from "./musicRecommendationTypes";

const MAX_PLUGINS = 2;
const MAX_RESULTS_PER_SEARCH = 8;
const PER_SEARCH_TIMEOUT_MS = 8000;
const DEFAULT_CONCURRENCY = 3;

function normalize(value: string | undefined) {
    return (value ?? "")
        .normalize("NFKC")
        .toLocaleLowerCase()
        .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
        .replace(/(?:feat\.?|ft\.?)\s+[^,;/]+/gi, " ")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();
}

function overlap(left: string, right: string) {
    if (!left || !right) {
        return 0;
    }
    if (left === right) {
        return 1;
    }
    if (left.includes(right) || right.includes(left)) {
        return 0.86;
    }
    const leftTokens = new Set(left.split(" ").filter(Boolean));
    const rightTokens = new Set(right.split(" ").filter(Boolean));
    const intersection = Array.from(leftTokens).filter(token =>
        rightTokens.has(token),
    ).length;
    return intersection / Math.max(leftTokens.size, rightTokens.size, 1);
}

export function scoreMusicRecommendationMatch(
    track: Pick<IAIRecommendationTrack, "title" | "artist" | "album">,
    candidate: IMusic.IMusicItem,
) {
    const titleScore = overlap(normalize(track.title), normalize(candidate.title));
    const artistScore = overlap(
        normalize(track.artist),
        normalize(candidate.artist),
    );
    const albumScore = track.album
        ? overlap(normalize(track.album), normalize(candidate.album))
        : 0;
    return titleScore * 0.6 + artistScore * 0.36 + albumScore * 0.04;
}

function normalizeCandidate(
    value: ICommon.SupportMediaItemBase["music"],
): IMusic.IMusicItem | null {
    if (
        !value ||
        typeof value.id !== "string" ||
        typeof value.platform !== "string" ||
        typeof value.title !== "string" ||
        typeof value.artist !== "string" ||
        !value.id.trim() ||
        !value.platform.trim() ||
        !value.title.trim() ||
        !value.artist.trim()
    ) {
        return null;
    }
    return {
        ...value,
        id: value.id.trim(),
        platform: value.platform.trim(),
        title: value.title.trim(),
        artist: value.artist.trim(),
        album: typeof value.album === "string" ? value.album : "",
        artwork: typeof value.artwork === "string" ? value.artwork : "",
        duration:
            typeof value.duration === "number" && Number.isFinite(value.duration)
                ? value.duration
                : 0,
    };
}

function timeout<T>(
    promise: Promise<T>,
    milliseconds: number,
    signal?: AbortSignal,
) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let removeAbortListener: (() => void) | undefined;
    const timeoutPromise = new Promise<T>((_, reject) => {
        timer = setTimeout(
            () => reject(new Error("Music source search timed out")),
            milliseconds,
        );
    });
    const abortPromise = new Promise<T>((_, reject) => {
        const abort = () =>
            reject(new AIError("aborted", "Music recommendation was cancelled"));
        if (signal?.aborted) {
            abort();
            return;
        }
        signal?.addEventListener("abort", abort, { once: true });
        removeAbortListener = () => signal?.removeEventListener("abort", abort);
    });
    return Promise.race<T>([promise, timeoutPromise, abortPromise]).finally(() => {
        if (timer) {
            clearTimeout(timer);
        }
        removeAbortListener?.();
    });
}

function throwIfAborted(signal?: AbortSignal) {
    if (signal?.aborted) {
        throw new AIError("aborted", "Music recommendation was cancelled");
    }
}

async function mapConcurrent<T, R>(
    values: T[],
    concurrency: number,
    mapper: (value: T, index: number) => Promise<R>,
) {
    const results = new Array<R>(values.length);
    let nextIndex = 0;
    const workers = Array.from(
        { length: Math.min(Math.max(1, concurrency), values.length) },
        async () => {
            while (nextIndex < values.length) {
                const index = nextIndex;
                nextIndex += 1;
                results[index] = await mapper(values[index], index);
            }
        },
    );
    await Promise.all(workers);
    return results;
}

async function searchTrack(
    track: IAIRecommendationTrack,
    signal?: AbortSignal,
): Promise<IMusic.IMusicItem | null> {
    throwIfAborted(signal);
    const plugins = PluginManager.getSortedSearchablePlugins("music").slice(
        0,
        MAX_PLUGINS,
    );
    if (!plugins.length) {
        throw new AIError("no-plugins", "No enabled music search plugin");
    }
    const query = `${track.title} ${track.artist}`.trim();
    const results = await Promise.allSettled(
        plugins.map(plugin =>
            timeout(
                plugin.methods.search(query, 1, "music"),
                PER_SEARCH_TIMEOUT_MS,
                signal,
            ),
        ),
    );
    throwIfAborted(signal);
    const candidates = results
        .flatMap(result =>
            result.status === "fulfilled"
                ? result.value.data.slice(0, MAX_RESULTS_PER_SEARCH)
                : [],
        )
        .map(normalizeCandidate)
        .filter((candidate): candidate is IMusic.IMusicItem => !!candidate)
        .map(candidate => ({ candidate, score: scoreMusicRecommendationMatch(track, candidate) }))
        .sort((left, right) => right.score - left.score);
    return candidates[0]?.score >= 0.82 ? candidates[0].candidate : null;
}

export async function resolveMusicRecommendationTracks(
    tracks: IAIRecommendationTrack[],
    options?: {
        signal?: AbortSignal;
        onProgress?: (progress: IMusicRecommendationProgress) => void;
        onMatch?: (recommendations: IAIRecommendedMusic[]) => void;
        target?: number;
    },
) {
    const target = options?.target ?? tracks.length;
    const recommendations: IAIRecommendedMusic[] = [];
    const seenMusic = new Set<string>();
    const seenTracks = new Set<string>();
    let completed = 0;
    await mapConcurrent(tracks, DEFAULT_CONCURRENCY, async track => {
        throwIfAborted(options?.signal);
        const music = await searchTrack(track, options?.signal).catch(error => {
            if (error instanceof AIError && error.code === "aborted") {
                throw error;
            }
            return null;
        });
        completed += 1;
        if (
            music &&
            recommendations.length < target &&
            !seenMusic.has(getMediaUniqueKey(music)) &&
            !seenTracks.has(track.fingerprint)
        ) {
            seenMusic.add(getMediaUniqueKey(music));
            seenTracks.add(track.fingerprint);
            recommendations.push({
                music,
                reason: track.reason,
                identity: createMusicRecommendationIdentity(track),
            });
            options?.onMatch?.([...recommendations]);
        }
        options?.onProgress?.({
            stage: "resolving",
            completed,
            total: tracks.length,
            matched: recommendations.length,
            target,
        });
    });
    return recommendations;
}

export async function resolveMusicRecommendationFallbackQueries(
    queries: string[],
    existing: IAIRecommendedMusic[],
    options?: {
        signal?: AbortSignal;
        onProgress?: (progress: IMusicRecommendationProgress) => void;
        onMatch?: (recommendations: IAIRecommendedMusic[]) => void;
        target?: number;
        excludedFingerprints?: Set<string>;
    },
) {
    throwIfAborted(options?.signal);
    const target = options?.target ?? existing.length;
    const plugins = PluginManager.getSortedSearchablePlugins("music").slice(
        0,
        MAX_PLUGINS,
    );
    if (!plugins.length) {
        throw new AIError("no-plugins", "No enabled music search plugin");
    }
    const recommendations = [...existing];
    const seenMusic = new Set(existing.map(item => getMediaUniqueKey(item.music)));
    const seenTracks = new Set(
        existing.map(item =>
            item.identity?.fingerprint ??
            createMusicRecommendationIdentity(item.music).fingerprint,
        ),
    );
    const excludedFingerprints = options?.excludedFingerprints ?? new Set<string>();
    let completed = 0;
    await mapConcurrent(queries, 1, async query => {
        throwIfAborted(options?.signal);
        const results = await Promise.allSettled(
            plugins.map(plugin =>
                timeout(
                    plugin.methods.search(query, 1, "music"),
                    PER_SEARCH_TIMEOUT_MS,
                    options?.signal,
                ),
            ),
        );
        throwIfAborted(options?.signal);
        for (const result of results) {
            if (result.status !== "fulfilled" || recommendations.length >= target) {
                continue;
            }
            for (const value of result.value.data.slice(0, MAX_RESULTS_PER_SEARCH)) {
                const music = normalizeCandidate(value);
                if (!music || seenMusic.has(getMediaUniqueKey(music))) {
                    continue;
                }
                const identity = createMusicRecommendationIdentity(music);
                if (
                    seenTracks.has(identity.fingerprint) ||
                    excludedFingerprints.has(identity.fingerprint)
                ) {
                    continue;
                }
                seenMusic.add(getMediaUniqueKey(music));
                seenTracks.add(identity.fingerprint);
                recommendations.push({
                    music,
                    identity,
                    reason: query,
                });
                options?.onMatch?.([...recommendations]);
                if (recommendations.length >= target) {
                    break;
                }
            }
        }
        completed += 1;
        options?.onProgress?.({
            stage: "backfilling",
            completed,
            total: queries.length,
            matched: recommendations.length,
            target,
        });
    });
    return recommendations;
}
