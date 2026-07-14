import PluginManager from "@/core/pluginManager";
import { getMediaUniqueKey } from "@/utils/mediaUtils";

const MAX_PLUGINS = 3;
const MAX_PER_PLUGIN = 18;
const MAX_CANDIDATES = 48;

export async function collectMusicRecommendationCandidates(
    query: string,
): Promise<IMusic.IMusicItem[]> {
    const plugins = PluginManager.getSortedSearchablePlugins("music").slice(
        0,
        MAX_PLUGINS,
    );
    if (!plugins.length) {
        throw new Error("请先启用至少一个支持音乐搜索的插件");
    }

    const keyword = query.trim() || "热门新歌";
    const results = await Promise.allSettled(
        plugins.map(async plugin => {
            const result = await plugin.methods.search(keyword, 1, "music");
            return result.data.slice(0, MAX_PER_PLUGIN);
        }),
    );
    const seen = new Set<string>();
    return results
        .flatMap(result => (result.status === "fulfilled" ? result.value : []))
        .filter(music => {
            const key = getMediaUniqueKey(music);
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        })
        .slice(0, MAX_CANDIDATES) as IMusic.IMusicItem[];
}
