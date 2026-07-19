import { describe, expect, it, jest } from "@jest/globals";

jest.mock("../../pluginManager", () => ({
    __esModule: true,
    default: {
        getSortedSearchablePlugins: jest.fn(),
    },
}));

jest.mock("../../../utils/mediaUtils", () => ({
    getMediaUniqueKey: (music: { platform: string; id: string }) =>
        `${music.platform}@${music.id}`,
}));

jest.mock("../client", () => ({
    AIError: class AIError extends Error {
        code: string;

        constructor(code: string, message: string) {
            super(message);
            this.code = code;
        }
    },
}));

import PluginManager from "../../pluginManager";
import {
    resolveMusicRecommendationFallbackQueries,
    resolveMusicRecommendationTracks,
    scoreMusicRecommendationMatch,
} from "../musicRecommendationResolver";

const mockedPlugins = jest.mocked(PluginManager.getSortedSearchablePlugins);

const target = {
    fingerprint: "song one::artist one",
    title: "Song One",
    artist: "Artist One",
    reason: "适合此刻",
};

describe("AI music recommendation resolver", () => {
    it("scores exact title and artist matches above same-title false positives", () => {
        expect(
            scoreMusicRecommendationMatch(target, {
                id: "exact",
                platform: "source",
                title: "Song One",
                artist: "Artist One",
                album: "",
                artwork: "",
                duration: 0,
            }),
        ).toBeGreaterThan(
            scoreMusicRecommendationMatch(target, {
                id: "wrong-artist",
                platform: "source",
                title: "Song One",
                artist: "Different Artist",
                album: "",
                artwork: "",
                duration: 0,
            }),
        );
    });

    it("keeps a resolvable recommendation when another plugin fails", async () => {
        const search = jest.fn(async () => ({
            data: [
                {
                    id: "exact",
                    platform: "source",
                    title: "Song One",
                    artist: "Artist One",
                    album: "",
                },
            ],
        }));
        mockedPlugins.mockReturnValue([
            { methods: { search } } as never,
            {
                methods: {
                    search: jest.fn(async () => {
                        throw new Error("source unavailable");
                    }),
                },
            } as never,
        ]);

        await expect(
            resolveMusicRecommendationTracks([target]),
        ).resolves.toMatchObject([
            {
                music: { id: "exact", platform: "source" },
                identity: {
                    fingerprint: target.fingerprint,
                    title: target.title,
                    artist: target.artist,
                },
            },
        ]);
    });

    it("honors a cancelled request before searching plugins", async () => {
        const controller = new AbortController();
        controller.abort();
        mockedPlugins.mockReturnValue([]);

        await expect(
            resolveMusicRecommendationTracks([target], {
                signal: controller.signal,
            }),
        ).rejects.toMatchObject({ code: "aborted" });
    });

    it("honors a cancelled request before fallback searching plugins", async () => {
        const controller = new AbortController();
        controller.abort();
        mockedPlugins.mockReturnValue([]);

        await expect(
            resolveMusicRecommendationFallbackQueries(["song query"], [], {
                signal: controller.signal,
            }),
        ).rejects.toMatchObject({ code: "aborted" });
    });
});
