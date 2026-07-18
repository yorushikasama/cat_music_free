import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("../../pluginManager", () => ({
    __esModule: true,
    default: {
        getSortedSearchablePlugins: jest.fn(),
    },
}));

jest.mock("../client", () => ({
    AIError: class AIError extends Error {},
}));

jest.mock("../../../utils/mediaUtils", () => ({
    getMediaUniqueKey: (music: { platform: string; id: string }) =>
        `${music.platform}@${music.id}`,
}));

import PluginManager from "../../pluginManager";
import {
    collectMusicRecommendationCandidates,
    extractMusicSearchQueries,
    normalizeMusicRecommendationCandidate,
} from "../musicCandidates";

const mockGetSortedSearchablePlugins = jest.mocked(
    PluginManager.getSortedSearchablePlugins,
);

describe("AI music candidate helpers", () => {
    beforeEach(() => {
        mockGetSortedSearchablePlugins.mockReset();
    });

    it("keeps the listener request within the three-query budget", () => {
        const queries = extractMusicSearchQueries(
            "下雨天通勤想听安静一点的新歌",
            [{ artist: "Recent Artist" } as IMusic.IMusicItem],
        );
        expect(queries.length).toBeLessThanOrEqual(3);
        expect(queries).toContain("下雨天通勤想听安静一点的新歌");
        expect(queries).toContain("轻快 节奏");
    });

    it("adjusts candidate query priority for familiar and exploratory mixes", () => {
        const history = [
            { artist: "Recent Artist One" },
            { artist: "Recent Artist Two" },
        ] as IMusic.IMusicItem[];

        expect(
            extractMusicSearchQueries("通勤音乐", history, "familiar").slice(
                0,
                2,
            ),
        ).toEqual(["通勤音乐", "Recent Artist One"]);
        expect(
            extractMusicSearchQueries("通勤音乐", history, "explore").slice(
                0,
                3,
            ),
        ).toEqual(["通勤音乐", "轻快 节奏", "独立 新歌"]);
        expect(
            extractMusicSearchQueries("通勤音乐", history, "balanced").slice(
                0,
                2,
            ),
        ).toEqual(["通勤音乐", "Recent Artist One"]);
    });

    it("filters incomplete candidate records", () => {
        expect(
            normalizeMusicRecommendationCandidate({
                id: "song",
                platform: "source",
                title: "Title",
                artist: "Artist",
            } as IMusic.IMusicItem),
        ).toMatchObject({ id: "song", platform: "source" });
        expect(
            normalizeMusicRecommendationCandidate({
                id: "song",
                platform: "source",
                title: "",
                artist: "Artist",
            } as IMusic.IMusicItem),
        ).toBeNull();
    });

    it("searches the listener request in addition to scene and discovery queries", async () => {
        const search = jest.fn(async (query: string) => ({
            data: [
                {
                    id: query,
                    platform: "source",
                    title: query,
                    artist: "Artist",
                },
            ],
        }));
        mockGetSortedSearchablePlugins.mockReturnValue([
            { methods: { search } } as never,
        ]);

        await collectMusicRecommendationCandidates(
            "通勤音乐",
            [],
            "explore",
        );

        expect(search).toHaveBeenCalledWith("轻快 节奏", 1, "music");
        expect(search).toHaveBeenCalledWith("独立 新歌", 1, "music");
        expect(search).toHaveBeenCalledWith("通勤音乐", 1, "music");
    });
});
