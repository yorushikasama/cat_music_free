import { AIError, createChatCompletion } from "./client";
import { getMediaUniqueKey } from "@/utils/mediaUtils";

export interface IAIRecommendedMusic {
    music: IMusic.IMusicItem;
    reason: string;
}

interface IRecommendationResponseItem {
    id: string;
    reason: string;
}

function parseRecommendationResponse(content: string) {
    const normalized = content
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
    const parsed = JSON.parse(normalized);
    const recommendations = parsed?.recommendations;
    if (!Array.isArray(recommendations)) {
        throw new AIError("invalid-response", "Invalid AI recommendation response");
    }
    return recommendations.filter(
        (item): item is IRecommendationResponseItem =>
            typeof item?.id === "string" && typeof item?.reason === "string",
    );
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
    limit?: number;
    signal?: AbortSignal;
}): Promise<IAIRecommendedMusic[]> {
    const { prompt, candidates, history, limit = 12, signal } = params;
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
                    "Return strict JSON only: {\"recommendations\":[{\"id\":\"candidate-id\",\"reason\":\"short reason in the user's language\"}]}. " +
                    "Return at most the requested limit, never invent songs, IDs, artists, links, or extra keys.",
            },
            {
                role: "user",
                content: JSON.stringify({
                    request: prompt.trim() || "根据我的口味推荐一组可以探索的新歌",
                    limit,
                    tasteProfile: buildMusicTasteSummary(history),
                    candidates: candidates.map(music => ({
                        id: getMediaUniqueKey(music),
                        title: music.title,
                        artist: music.artist,
                        album: music.album,
                        platform: music.platform,
                    })),
                }),
            },
        ],
        { temperature: 0.55, maxTokens: 1400, signal },
    );
    const selected = parseRecommendationResponse(response);
    const uniqueIds = new Set<string>();
    const recommendations = selected
        .filter(item => {
            if (!candidateMap.has(item.id) || uniqueIds.has(item.id)) {
                return false;
            }
            uniqueIds.add(item.id);
            return true;
        })
        .slice(0, limit)
        .map(item => {
            return {
                music: candidateMap.get(item.id)!,
                reason: item.reason.trim().slice(0, 72),
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
