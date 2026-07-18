import PluginManager from "@/core/pluginManager";
import { getMediaUniqueKey } from "@/utils/mediaUtils";
import { AIError } from "./client";
import type { MusicRecommendationExplorationLevel } from "./musicRecommendation";

const MAX_PLUGINS = 3;
const MAX_QUERIES_PER_PLUGIN = 3;
const MAX_PER_REQUEST = 10;
const MAX_CANDIDATES = 48;
const DISCOVERY_QUERIES = ["独立 新歌", "热门新歌"];

const SCENE_QUERIES: Array<[RegExp, string]> = [
    [/通勤|commut/i, "轻快 节奏"],
    [/夜晚|散步|walk/i, "夜晚 治愈"],
    [/专注|工作|学习|focus/i, "轻音乐 纯音乐"],
    [/下雨|雨天|rain/i, "雨天 安静"],
    [/运动|跑步|健身|workout|running/i, "运动 热血"],
    [/放松|睡前|安静|relax|sleep/i, "舒缓 治愈"],
    [/新歌|探索|不一样|explore|new song/i, "热门新歌"],
];

function normalizeQuery(value: string) {
    return value.replace(/[，。！？、,!?;；:：]+/g, " ").trim();
}

export function extractMusicSearchQueries(
    prompt: string,
    history: IMusic.IMusicItem[] = [],
    exploration: MusicRecommendationExplorationLevel = "balanced",
) {
    const normalized = normalizeQuery(prompt);
    const queries: string[] = [];
    const historyArtists = history
        .map(item => item.artist?.trim())
        .filter((artist): artist is string => !!artist)
        .slice(0, 2);
    const add = (value?: string) => {
        const query = value?.trim();
        if (query && !queries.includes(query)) {
            queries.push(query);
        }
    };

    if (normalized.length > 0) {
        add(normalized.slice(0, 80));
    }

    if (exploration === "familiar") {
        historyArtists.forEach(add);
    } else if (exploration === "balanced") {
        add(historyArtists[0]);
    }

    for (const [pattern, query] of SCENE_QUERIES) {
        if (pattern.test(normalized)) {
            add(query);
        }
    }

    const quoted = Array.from(
        normalized.matchAll(/[「『“"]([^」』”"]{1,30})[」』”"]/g),
        match => match[1],
    );
    quoted.forEach(add);

    if (exploration === "explore") {
        add(DISCOVERY_QUERIES[0]);
    }

    if (!queries.length) {
        add("热门新歌");
    }
    return queries.slice(0, 3);
}

export function normalizeMusicRecommendationCandidate(
    value: ICommon.SupportMediaItemBase["music"],
): IMusic.IMusicItem | null {
    if (
        !value ||
        typeof value.id !== "string" ||
        !value.id.trim() ||
        typeof value.platform !== "string" ||
        !value.platform.trim() ||
        typeof value.title !== "string" ||
        !value.title.trim() ||
        typeof value.artist !== "string" ||
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

export async function collectMusicRecommendationCandidates(
    prompt: string,
    history: IMusic.IMusicItem[] = [],
    exploration: MusicRecommendationExplorationLevel = "balanced",
): Promise<IMusic.IMusicItem[]> {
    const plugins = PluginManager.getSortedSearchablePlugins("music").slice(
        0,
        MAX_PLUGINS,
    );
    if (!plugins.length) {
        throw new AIError("no-plugins", "No enabled music search plugin");
    }

    const queries = extractMusicSearchQueries(prompt, history, exploration).slice(
        0,
        MAX_QUERIES_PER_PLUGIN,
    );
    const results = await Promise.allSettled(
        plugins.flatMap(plugin =>
            queries.map(async query => {
                const result = await plugin.methods.search(query, 1, "music");
                return result.data.slice(0, MAX_PER_REQUEST);
            }),
        ),
    );
    const seen = new Set<string>();
    return results
        .flatMap(result => (result.status === "fulfilled" ? result.value : []))
        .map(normalizeMusicRecommendationCandidate)
        .filter((music): music is IMusic.IMusicItem => {
            if (!music) {
                return false;
            }
            const key = getMediaUniqueKey(music);
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        })
        .slice(0, MAX_CANDIDATES);
}
