import { AIError, createChatCompletion } from "./client";
import type {
    IAIRecommendedMusic,
    MusicRecommendationExplorationLevel,
} from "./musicRecommendationTypes";
import { getMediaUniqueKey } from "@/utils/mediaUtils";

export type {
    IAIRecommendedMusic,
    MusicRecommendationExplorationLevel,
} from "./musicRecommendationTypes";

interface IRecommendationResponseItem {
    id?: string | number;
    musicId?: string | number;
    candidateId?: string | number;
    songId?: string | number;
    trackId?: string | number;
    reason?: string;
    explanation?: string;
    description?: string;
    why?: string;
    title?: string;
    name?: string;
    artist?: string;
    singer?: string;
}

function normalizeJsonResponse(content: string) {
    const normalized = content
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
    if (!normalized) {
        throw new AIError("invalid-response", "AI returned an empty recommendation response");
    }

    const start = normalized.search(/[[{]/);
    if (start === -1) {
        return normalized;
    }

    const opening = normalized[start];
    const closing = opening === "{" ? "}" : "]";
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < normalized.length; index += 1) {
        const char = normalized[index];
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
        } else if (char === opening) {
            depth += 1;
        } else if (char === closing) {
            depth -= 1;
            if (depth === 0) {
                return normalized.slice(start, index + 1);
            }
        }
    }
    return normalized.slice(start);
}

function asRecord(value: unknown) {
    return value && typeof value === "object"
        ? (value as Record<string, unknown>)
        : undefined;
}

function firstStringOrNumber(...values: unknown[]) {
    return values.find(
        value =>
            typeof value === "string" ||
            (typeof value === "number" && Number.isFinite(value)),
    ) as string | number | undefined;
}

function firstString(...values: unknown[]) {
    return values.find(value => typeof value === "string") as
        | string
        | undefined;
}

function normalizeRecommendationResponseItem(
    value: unknown,
): IRecommendationResponseItem | null {
    if (
        typeof value === "string" ||
        (typeof value === "number" && Number.isFinite(value))
    ) {
        return { id: value };
    }

    const item = asRecord(value);
    if (!item) {
        return null;
    }
    const nested =
        asRecord(item.music) ?? asRecord(item.song) ?? asRecord(item.track);
    return {
        id: firstStringOrNumber(item.id, nested?.id),
        musicId: firstStringOrNumber(item.musicId, nested?.musicId),
        candidateId: firstStringOrNumber(item.candidateId, nested?.candidateId),
        songId: firstStringOrNumber(item.songId, nested?.songId),
        trackId: firstStringOrNumber(item.trackId, nested?.trackId),
        reason: firstString(item.reason, nested?.reason),
        explanation: firstString(item.explanation, nested?.explanation),
        description: firstString(item.description, nested?.description),
        why: firstString(item.why, nested?.why),
        title: firstString(item.title, nested?.title),
        name: firstString(item.name, nested?.name),
        artist: firstString(item.artist, nested?.artist),
        singer: firstString(item.singer, nested?.singer),
    };
}

function parseRecommendationResponse(content: string) {
    const normalized = normalizeJsonResponse(content);
    let parsed: unknown;
    try {
        parsed = JSON.parse(normalized);
    } catch (error) {
        const appearsTruncated =
            (normalized.startsWith("{") && !normalized.endsWith("}")) ||
            (normalized.startsWith("[") && !normalized.endsWith("]"));
        throw new AIError(
            "invalid-response",
            appearsTruncated
                ? "AI recommendation response was incomplete; try again or select a faster model"
                : "AI recommendation response was not valid JSON",
            { cause: error },
        );
    }
    const response = asRecord(parsed);
    if (!response && !Array.isArray(parsed)) {
        throw new AIError("invalid-response", "Invalid AI recommendation response");
    }
    const responseData = response?.data;
    const data = asRecord(responseData);
    const responseItems =
        response?.recommendations ??
        response?.recommendation ??
        response?.songs ??
        response?.tracks ??
        response?.items ??
        response?.results ??
        data?.recommendations ??
        data?.recommendation ??
        data?.songs ??
        data?.tracks ??
        data?.items ??
        data?.results ??
        (Array.isArray(responseData) ? responseData : undefined) ??
        (Array.isArray(parsed) ? parsed : undefined);
    const recommendations = Array.isArray(responseItems)
        ? responseItems
        : responseItems == null
            ? undefined
            : [responseItems];
    if (!Array.isArray(recommendations)) {
        throw new AIError("invalid-response", "Invalid AI recommendation response");
    }
    return recommendations
        .map(normalizeRecommendationResponseItem)
        .filter((item): item is IRecommendationResponseItem => !!item);
}

function normalizeCandidateText(value?: string) {
    return value?.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function normalizeCandidateId(value: string | number | undefined) {
    if (typeof value === "string") {
        return value.trim();
    }
    return typeof value === "number" && Number.isFinite(value)
        ? String(value)
        : undefined;
}

function getRecommendationReason(item: IRecommendationResponseItem) {
    return item.reason ?? item.explanation ?? item.description ?? item.why;
}

function resolveCandidateId(
    item: IRecommendationResponseItem,
    candidateMap: Map<string, IMusic.IMusicItem>,
) {
    const suppliedIds = [
        item.id,
        item.musicId,
        item.candidateId,
        item.songId,
        item.trackId,
    ];
    for (const suppliedId of suppliedIds) {
        const normalizedId = normalizeCandidateId(suppliedId);
        if (!normalizedId) {
            continue;
        }
        if (candidateMap.has(normalizedId)) {
            return normalizedId;
        }

        const matches = Array.from(candidateMap.entries()).filter(
            ([candidateId, music]) =>
                music.id === normalizedId || candidateId === normalizedId,
        );
        if (matches.length === 1) {
            return matches[0][0];
        }
    }

    const title = normalizeCandidateText(item.title ?? item.name);
    const artist = normalizeCandidateText(item.artist ?? item.singer);
    if (!title || !artist) {
        return undefined;
    }
    const matches = Array.from(candidateMap.entries()).filter(
        ([, music]) =>
            normalizeCandidateText(music.title) === title &&
            normalizeCandidateText(music.artist) === artist,
    );
    return matches.length === 1 ? matches[0][0] : undefined;
}

export function buildMusicTasteSummary(history: IMusic.IMusicItem[]) {
    if (!history.length) {
        return "用户还没有足够的播放记录，请根据场景优先探索不同风格。";
    }
    return history
        .slice(0, 20)
        .map((music, index) =>
            `${index + 1}. ${music.title} - ${music.artist}${music.album ? ` (${music.album})` : ""}`,
        )
        .join("\n");
}

export async function recommendMusicWithAI(params: {
    prompt: string;
    candidates: IMusic.IMusicItem[];
    history: IMusic.IMusicItem[];
    previousRecommendations?: IAIRecommendedMusic[];
    refinement?: string;
    likedMusicIds?: string[];
    exploration?: MusicRecommendationExplorationLevel;
    limit?: number;
    signal?: AbortSignal;
}): Promise<IAIRecommendedMusic[]> {
    const {
        prompt,
        candidates,
        history,
        previousRecommendations = [],
        refinement,
        likedMusicIds = [],
        exploration = "balanced",
        limit = 12,
        signal,
    } = params;
    if (!candidates.length) {
        throw new AIError("no-candidates", "No matching candidate songs were found");
    }

    const candidateMap = new Map(
        candidates.map(music => [getMediaUniqueKey(music), music] as const),
    );
    const response = await createChatCompletion(
        [
            {
                role: "system",
                content:
                    "You are a music curator. You may ONLY recommend IDs supplied in the candidate list. " +
                    "Choose varied, playable tracks that match the listener profile and request. " +
                    "For familiar mode, favor the listener's established artists and traits. " +
                    "For balanced mode, blend established taste with discoveries. " +
                    "For explore mode, prioritize unfamiliar artists and broader styles unless the request says otherwise. " +
                    "Return strict JSON only: {\"recommendations\":[{\"id\":\"candidate-id\",\"reason\":\"short reason in the user's language\"}]}. " +
                    "Return at most the requested limit, never invent songs, IDs, artists, links, or extra keys.",
            },
            {
                role: "user",
                content: JSON.stringify({
                    request: prompt.trim() || "根据我的口味推荐一组可以探索的新歌",
                    refinement: refinement?.trim() || undefined,
                    exploration,
                    limit,
                    tasteProfile: buildMusicTasteSummary(history),
                    currentRecommendations: previousRecommendations.map(
                        ({ music, reason }) => ({
                            id: getMediaUniqueKey(music),
                            title: music.title,
                            artist: music.artist,
                            reason,
                        }),
                    ),
                    likedCandidateIds: likedMusicIds.filter(id => candidateMap.has(id)),
                    candidates: candidates.map(music => ({
                        id: getMediaUniqueKey(music),
                        musicId: music.id,
                        title: music.title,
                        artist: music.artist,
                        album: music.album,
                        platform: music.platform,
                    })),
                }),
            },
        ],
        {
            temperature: 0.55,
            maxTokens: 1400,
            responseFormat: "auto",
            signal,
        },
    );
    const selected = parseRecommendationResponse(response);
    const uniqueIds = new Set<string>();
    const recommendations = selected
        .filter(item => {
            const candidateId = resolveCandidateId(item, candidateMap);
            if (
                !candidateId ||
                uniqueIds.has(candidateId) ||
                (typeof getRecommendationReason(item) === "string" &&
                    !getRecommendationReason(item)?.trim())
            ) {
                return false;
            }
            item.id = candidateId;
            uniqueIds.add(candidateId);
            return true;
        })
        .slice(0, limit)
        .map(item => {
            return {
                music: candidateMap.get(String(item.id))!,
                reason:
                    getRecommendationReason(item)?.trim().slice(0, 72) ||
                    "与当前想听的氛围相配",
            };
        });

    if (!recommendations.length) {
        throw new AIError(
            "invalid-response",
            "AI did not return a valid candidate recommendation",
        );
    }
    return recommendations;
}
