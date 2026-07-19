import {
    AIError,
    createChatCompletionResult,
    type IAIClientConfig,
    type IAIChatMessage,
} from "./client";
import { createMusicRecommendationIdentity } from "./musicRecommendationIdentity";
import { errorLog } from "@/utils/log";
import type {
    IAIRecommendationPlan,
    IAIRecommendationTrack,
    IAIRecommendedMusic,
    IRecommendationTrackIdentity,
    MusicRecommendationExplorationLevel,
} from "./musicRecommendationTypes";

const MAX_PLAN_TRACKS = 12;
const MAX_HISTORY_ITEMS = 12;
const MAX_PREFERENCE_ITEMS = 16;
const PLAN_WRAPPER_KEYS = ["data", "result", "plan", "response"];
const TRACK_COLLECTION_KEYS = [
    "tracks",
    "recommendations",
    "songs",
    "songList",
    "trackList",
    "items",
];

function createPlanOutputContract() {
    return [
        "You are the planning step in a music recommendation pipeline.",
        "You can understand listening intent and choose likely real songs, but you cannot search music providers, verify catalogs, inspect copyright, or resolve playback media.",
        "The app will separately search its enabled music-source plugins using title and artist, then those plugins—not you—resolve platform IDs, availability, and playable audio URLs.",
        "Your response is parsed by JSON.parse(), not read as a chat reply.",
        "Return exactly one valid JSON object and nothing else.",
        "The first character must be { and the last character must be }.",
        "Do not output Markdown, code fences, prose, headings, comments, XML, <think> content, analysis, or text before or after the JSON object.",
        "Do not wrap the object in data, result, response, plan, message, or a JSON string.",
        "Use double-quoted JSON keys and all string values. Do not use trailing commas, null, or non-JSON syntax.",
        "Use exactly these three top-level keys, all of which are required: intentSummary, tracks, fallbackQueries.",
        "The exact top-level shape is:",
        "{\"intentSummary\":\"string\",\"tracks\":[{\"title\":\"string\",\"artist\":\"string\",\"reason\":\"string\",\"album\":\"optional string\",\"searchHints\":[\"optional query\"]}],\"fallbackQueries\":[\"optional query\"]}",
        "intentSummary must be a concise non-empty string in the listener's language.",
        "tracks must be an array with exactly requestedTrackCount distinct items.",
        "Each track may contain only title, artist, reason, album, and searchHints. title, artist, and reason are required non-empty strings.",
        "album and searchHints are optional. Omit them when uncertain; never use null, an empty object, or a guessed album.",
        "title must be the canonical released song title and artist must be the canonical primary artist name, both as strings, never arrays or objects.",
        "reason must be concise, in the listener's language, and no longer than 60 characters.",
        "searchHints and fallbackQueries are text-only search phrases, not search results. When present, each must be an array of at most 3 short strings.",
        "Do not return or claim any provider-specific or playback data. Prohibited keys and values include URL, uri, link, playUrl, audioUrl, streamUrl, downloadUrl, sourceUrl, id, songId, albumId, platform, provider, source, media, artwork, cover, duration, lyric, bitrate, quality, availability, copyright, or license.",
        "Do not claim that a song is searchable, available, licensed, playable, downloadable, or resolvable. The app verifies those facts after your plan is returned.",
        "Recommend only real, officially released songs. Do not invent songs, artists, or albums. If an album or query is uncertain, omit it rather than guessing.",
        "Before sending, validate that the full reply is a single complete JSON object matching this contract.",
    ].join("\n");
}

function createCompactRecoveryOutputContract() {
    return [
        "The previous response could not be parsed. Use the recovery protocol.",
        "You only choose song title and artist. You cannot search providers, verify availability, or resolve playback URLs; the app does that after this response.",
        "Reply with exactly one complete JSON object and nothing else. The first character must be { and the last character must be }.",
        "Do not output Markdown, code fences, prose, comments, analysis, <think> content, wrapper keys, or a JSON string.",
        "Use exactly this schema with no extra keys:",
        "{\"tracks\":[{\"title\":\"string\",\"artist\":\"string\"}]}",
        "tracks must contain exactly requestedTrackCount distinct real released songs.",
        "Every item must contain non-empty title and artist strings. Do not use null, arrays, objects, aliases, translations, or invented works.",
        "Never return URLs, links, platform IDs, provider names, source names, media metadata, availability, or any statement that a track can be played.",
        "Validate the JSON syntax and required fields before sending.",
    ].join("\n");
}

function asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
}

function extractBalancedJson(content: string, start: number) {
    const opening = content[start];
    if (opening !== "{" && opening !== "[") {
        return undefined;
    }
    const stack = [opening];
    let inString = false;
    let escaped = false;
    for (let index = start + 1; index < content.length; index += 1) {
        const char = content[index];
        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (char === "\\") {
                escaped = true;
            } else if (char === "\"") {
                inString = false;
            }
            continue;
        }
        if (char === "\"") {
            inString = true;
        } else if (char === "{" || char === "[") {
            stack.push(char);
        } else if (char === "}" || char === "]") {
            const lastOpening = stack.at(-1);
            if (
                (char === "}" && lastOpening !== "{") ||
                (char === "]" && lastOpening !== "[")
            ) {
                return undefined;
            }
            stack.pop();
            if (!stack.length) {
                return content.slice(start, index + 1);
            }
        }
    }
    return undefined;
}

function getJsonCandidates(content: string) {
    const normalized = content.trim().replace(/^\uFEFF/, "");
    const candidates = new Set<string>();
    const addCandidate = (value: string | undefined) => {
        const candidate = value?.trim();
        if (candidate) {
            candidates.add(candidate);
        }
    };
    addCandidate(normalized);
    for (const match of normalized.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) {
        addCandidate(match[1]);
    }
    for (let index = 0; index < normalized.length; index += 1) {
        if (normalized[index] === "{" || normalized[index] === "[") {
            addCandidate(extractBalancedJson(normalized, index));
        }
    }
    return [...candidates];
}

function parseJsonValues(content: string) {
    let firstCause: unknown;
    const values: unknown[] = [];
    for (const candidate of getJsonCandidates(content)) {
        try {
            let parsed: unknown = JSON.parse(candidate);
            for (let depth = 0; depth < 2 && typeof parsed === "string"; depth += 1) {
                parsed = JSON.parse(parsed.trim());
            }
            values.push(parsed);
        } catch (cause) {
            firstCause ??= cause;
        }
    }
    if (!values.length) {
        throw firstCause ?? new SyntaxError("No JSON value found");
    }
    return values;
}

function parseJsonContent(content: string) {
    return parseJsonValues(content)[0];
}

function parseString(value: unknown, maxLength: number) {
    return typeof value === "string" && value.trim()
        ? value.trim().slice(0, maxLength)
        : undefined;
}

function parseStringList(value: unknown, maxLength: number, maxItems: number) {
    const values = Array.isArray(value) ? value : [value];
    return values
        .flatMap(item => {
            const direct = parseString(item, maxLength);
            if (direct) {
                return [direct];
            }
            const record = asRecord(item);
            const name = record
                ? parseString(
                    record.name ??
                        record.title ??
                        record.artist ??
                        record.artistName ??
                        record.singer,
                    maxLength,
                )
                : undefined;
            return name ? [name] : [];
        })
        .filter((item, index, items) => items.indexOf(item) === index)
        .slice(0, maxItems);
}

function parseArtist(value: Record<string, unknown>) {
    return (
        parseString(
            value.artist ??
                value.singer ??
                value.artistName ??
                value.artist_name ??
                value.singerName ??
                value.singer_name ??
                value.performer ??
                value.performerName,
            120,
        ) ??
        (parseStringList(
            value.artists ?? value.artistNames ?? value.singers,
            120,
            4,
        ).join(" /") || undefined)
    );
}

function parseTrack(value: unknown): IAIRecommendationTrack | null {
    const record = asRecord(value);
    if (!record) {
        return null;
    }
    const identityRecord =
        asRecord(record.song ?? record.track ?? record.music) ?? record;
    const title = parseString(
        identityRecord.title ??
            identityRecord.name ??
            identityRecord.song ??
            identityRecord.songName ??
            identityRecord.songTitle ??
            identityRecord.song_title ??
            identityRecord.trackName ??
            identityRecord.trackTitle ??
            identityRecord.track_title ??
            identityRecord.musicName ??
            identityRecord.musicTitle,
        120,
    );
    const artist = parseArtist(identityRecord);
    const reason = parseString(
        record.reason ??
            record.explanation ??
            record.description ??
            record.why ??
            record.recommendationReason ??
            record.recommendation_reason ??
            identityRecord.reason,
        160,
    ) ?? "";
    if (!title || !artist) {
        return null;
    }
    const hints = parseStringList(
        record.searchHints ??
            record.search_hints ??
            record.queries ??
            identityRecord.searchHints,
        100,
        3,
    );
    return {
        ...createMusicRecommendationIdentity({ title, artist }),
        reason,
        album: parseString(
            identityRecord.album ??
                identityRecord.albumName ??
                identityRecord.albumTitle ??
                identityRecord.album_name,
            120,
        ),
        searchHints: hints,
    };
}

function decodeJsonString(value: unknown) {
    if (typeof value !== "string") {
        return value;
    }
    try {
        return parseJsonContent(value);
    } catch {
        return value;
    }
}

function findPlanContent(value: unknown, depth = 0): {
    record: Record<string, unknown>;
    rawTracks: unknown[];
} | null {
    const decodedValue = decodeJsonString(value);
    if (Array.isArray(decodedValue)) {
        return { record: {}, rawTracks: decodedValue };
    }
    const record = asRecord(decodedValue);
    if (!record || depth > 3) {
        return null;
    }
    for (const key of TRACK_COLLECTION_KEYS) {
        const tracks = decodeJsonString(record[key]);
        if (Array.isArray(tracks)) {
            return { record, rawTracks: tracks };
        }
    }
    for (const key of PLAN_WRAPPER_KEYS) {
        const nested = findPlanContent(record[key], depth + 1);
        if (nested) {
            return nested;
        }
    }
    return null;
}

function contentFingerprint(content: string) {
    let hash = 5381;
    for (let index = 0; index < content.length; index += 1) {
        hash = (hash * 33 + content.charCodeAt(index)) % 4294967296;
    }
    return Math.floor(hash).toString(16).padStart(8, "0");
}

function getPlanStructure(content: string) {
    try {
        const candidates = getJsonCandidates(content);
        const values = parseJsonValues(content);
        const parsed = values.find(value => !!findPlanContent(value)) ?? values[0];
        const record = asRecord(parsed);
        const planContent = findPlanContent(parsed);
        return {
            isJson: true,
            candidateCount: candidates.length,
            topLevel: Array.isArray(parsed) ? "array" : typeof parsed,
            topLevelKeys: record ? Object.keys(record).slice(0, 12) : [],
            rawTrackCount: planContent?.rawTracks.length ?? 0,
            sampleTrackKeys: planContent?.rawTracks
                .slice(0, 3)
                .flatMap(track => Object.keys(asRecord(track) ?? {}))
                .filter((key, index, keys) => keys.indexOf(key) === index)
                .slice(0, 16) ?? [],
        };
    } catch {
        return {
            isJson: false,
            candidateCount: getJsonCandidates(content).length,
            hasCodeFence: /```/.test(content),
            hasThinkingTag: /<think[\s>]/i.test(content),
            hasTrackKeyword: /tracks?|songs?|recommendations?/i.test(content),
            firstCharacterCode: content.trim().charCodeAt(0) || undefined,
            lastCharacterCode: content.trim().at(-1)?.charCodeAt(0),
        };
    }
}

function logPlanParseFailure(content: string, error: unknown, attempt: number) {
    errorLog(
        "AI recommendation plan parsing failed",
        JSON.stringify({
            attempt,
            code: error instanceof AIError ? error.code : "unknown",
            contentLength: content.length,
            contentFingerprint: contentFingerprint(content),
            structure: getPlanStructure(content),
        }),
    );
}

export function parseMusicRecommendationPlan(content: string): IAIRecommendationPlan {
    let planContent: {
        record: Record<string, unknown>;
        rawTracks: unknown[];
    } | null;
    try {
        planContent = parseJsonValues(content)
            .map(value => findPlanContent(value))
            .find((value): value is NonNullable<typeof value> => !!value) ?? null;
    } catch (cause) {
        throw new AIError(
            "invalid-response",
            "AI recommendation plan was not valid JSON",
            { cause },
        );
    }
    if (!planContent) {
        throw new AIError("invalid-response", "AI recommendation plan has no tracks");
    }
    const { record, rawTracks } = planContent;
    const seen = new Set<string>();
    const tracks = rawTracks
        .map(parseTrack)
        .filter((track): track is IAIRecommendationTrack => !!track)
        .filter(track => {
            if (seen.has(track.fingerprint)) {
                return false;
            }
            seen.add(track.fingerprint);
            return true;
        })
        .slice(0, MAX_PLAN_TRACKS);
    if (!tracks.length) {
        throw new AIError("invalid-response", "AI recommendation plan has no valid tracks");
    }
    const fallbackQueries = parseStringList(
        record.fallbackQueries ?? record.fallback_queries,
        100,
        3,
    );
    return {
        intentSummary:
            parseString(record.intentSummary ?? record.summary, 180) ?? "",
        tracks,
        fallbackQueries,
    };
}

function serializeHistory(history: IMusic.IMusicItem[]) {
    return history.slice(0, MAX_HISTORY_ITEMS).map(music => ({
        title: music.title,
        artist: music.artist,
        album: music.album || undefined,
    }));
}

function serializePreferences(
    identities: IRecommendationTrackIdentity[],
) {
    return identities.slice(0, MAX_PREFERENCE_ITEMS).map(identity => ({
        title: identity.title,
        artist: identity.artist,
    }));
}

function createRecommendationMessages(params: {
    prompt: string;
    history: IMusic.IMusicItem[];
    exploration: MusicRecommendationExplorationLevel;
    refinement?: string;
    previousRecommendations: IAIRecommendedMusic[];
    likedTracks: IRecommendationTrackIdentity[];
    ignoredTracks: IRecommendationTrackIdentity[];
    targetCount: number;
    strictJson?: boolean;
    compact?: boolean;
}) {
    const messages: IAIChatMessage[] = [
        {
            role: "system",
            content: createPlanOutputContract(),
        },
    ];
    if (params.strictJson) {
        messages.push({
            role: "system",
            content: createCompactRecoveryOutputContract(),
        });
    }
    messages.push({
        role: "user",
        content: JSON.stringify({
            request: params.prompt.trim(),
            ...(params.compact
                ? {}
                : { refinement: params.refinement?.trim() || undefined }),
            exploration: params.exploration,
            requestedTrackCount: params.targetCount,
            ...(params.compact
                ? {}
                : {
                    recentListening: serializeHistory(params.history),
                    likedTracks: serializePreferences(params.likedTracks),
                }),
            ignoredTracks: serializePreferences(params.ignoredTracks),
            ...(params.compact
                ? {}
                : {
                    currentRecommendations: params.previousRecommendations.slice(0, 10).map(
                        recommendation => ({
                            title:
                                recommendation.identity?.title ??
                                recommendation.music.title,
                            artist:
                                recommendation.identity?.artist ??
                                recommendation.music.artist,
                            reason: recommendation.reason,
                        }),
                    ),
                }),
        }),
    });
    return messages;
}

function throwIfAborted(signal?: AbortSignal) {
    if (signal?.aborted) {
        throw new AIError("aborted", "Music recommendation was cancelled");
    }
}

export async function planMusicRecommendations(params: {
    prompt: string;
    history: IMusic.IMusicItem[];
    exploration?: MusicRecommendationExplorationLevel;
    refinement?: string;
    previousRecommendations?: IAIRecommendedMusic[];
    likedTracks?: IRecommendationTrackIdentity[];
    ignoredTracks?: IRecommendationTrackIdentity[];
    limit?: number;
    signal?: AbortSignal;
    configOverrides?: Partial<IAIClientConfig>;
}) {
    const {
        prompt,
        history,
        exploration = "balanced",
        refinement,
        previousRecommendations = [],
        likedTracks = [],
        ignoredTracks = [],
        limit = 10,
        signal,
        configOverrides,
    } = params;
    const targetCount = Math.max(1, Math.min(MAX_PLAN_TRACKS, limit + 2));
    const requestPlan = (strictJson = false) =>
        createChatCompletionResult(
            createRecommendationMessages({
                prompt,
                history,
                exploration,
                refinement,
                previousRecommendations,
                likedTracks,
                ignoredTracks,
                targetCount: strictJson ? Math.min(targetCount, 6) : targetCount,
                strictJson,
                compact: strictJson,
            }),
            {
                temperature: strictJson ? 0 : 0.2,
                maxTokens: strictJson ? 900 : 1600,
                // Some OpenAI-compatible relays accept json_object but still
                // return a truncated payload. The recovery call uses the
                // explicit prompt contract instead of repeating that mode.
                responseFormat: strictJson ? "prompt-only" : "auto",
                timeout: 30000,
                signal,
            },
            configOverrides,
        );
    const response = await requestPlan();
    try {
        return {
            plan: parseMusicRecommendationPlan(response.content),
            responseFormat: response.responseFormat,
        };
    } catch (error) {
        if (!(error instanceof AIError) || error.code !== "invalid-response") {
            throw error;
        }
        logPlanParseFailure(response.content, error, 1);
        throwIfAborted(signal);
    }

    const repairResponse = await requestPlan(true);
    try {
        return {
            plan: parseMusicRecommendationPlan(repairResponse.content),
            responseFormat: repairResponse.responseFormat,
        };
    } catch (error) {
        if (error instanceof AIError && error.code === "invalid-response") {
            logPlanParseFailure(repairResponse.content, error, 2);
        }
        throw error;
    }
}

export async function testMusicRecommendationCompatibility(
    configOverrides?: Partial<IAIClientConfig>,
) {
    const result = await planMusicRecommendations({
        prompt: "晴天午后想听轻快的流行歌曲",
        history: [],
        limit: 2,
        configOverrides,
    });
    return result.plan.tracks.length > 0;
}
