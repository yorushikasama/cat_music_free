import {
    extractMusicSearchQueries,
    normalizeMusicRecommendationCandidate,
} from "../musicCandidates";
import { describe, expect, it, jest } from "@jest/globals";

jest.mock("../../pluginManager", () => ({
    __esModule: true,
    default: { getSortedSearchablePlugins: () => [] },
}));

jest.mock("../client", () => ({
    AIError: class AIError extends Error {},
}));

jest.mock("../../../utils/mediaUtils", () => ({
    getMediaUniqueKey: (music: { platform: string; id: string }) =>
        `${music.platform}@${music.id}`,
}));

describe("AI music candidate helpers", () => {
    it("extracts at most three short local queries", () => {
        const queries = extractMusicSearchQueries(
            "下雨天通勤想听安静一点的新歌",
            [{ artist: "Recent Artist" } as IMusic.IMusicItem],
        );
        expect(queries.length).toBeLessThanOrEqual(3);
        expect(queries).toContain("轻快 节奏");
        expect(queries).toContain("雨天 安静");
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
});
