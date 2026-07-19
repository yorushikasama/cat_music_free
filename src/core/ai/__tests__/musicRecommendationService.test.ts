import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("../client", () => ({
    getAIClientConfig: require("@jest/globals").jest.fn(),
    AIError: class AIError extends Error {
        code: string;

        constructor(code: string, message: string) {
            super(message);
            this.code = code;
        }
    },
}));

jest.mock("../musicRecommendationPlanner", () => ({
    planMusicRecommendations: require("@jest/globals").jest.fn(),
}));

jest.mock("../musicRecommendationResolver", () => ({
    resolveMusicRecommendationTracks: require("@jest/globals").jest.fn(),
    resolveMusicRecommendationFallbackQueries:
        require("@jest/globals").jest.fn(),
}));

import { getAIClientConfig } from "../client";
import { planMusicRecommendations } from "../musicRecommendationPlanner";
import {
    resolveMusicRecommendationFallbackQueries,
    resolveMusicRecommendationTracks,
} from "../musicRecommendationResolver";
import { generateMusicRecommendations } from "../musicRecommendationService";

const mockedConfig = jest.mocked(getAIClientConfig);
const mockedPlanner = jest.mocked(planMusicRecommendations);
const mockedResolver = jest.mocked(resolveMusicRecommendationTracks);
const mockedFallback = jest.mocked(resolveMusicRecommendationFallbackQueries);

const plannedTrack = {
    fingerprint: "song one::artist one",
    title: "Song One",
    artist: "Artist One",
    reason: "适合当前场景",
};

const playableRecommendation = {
    music: {
        id: "one",
        platform: "source",
        title: "Song One",
        artist: "Artist One",
        album: "",
        artwork: "",
        duration: 0,
    },
    reason: "适合当前场景",
    identity: plannedTrack,
};

describe("AI music recommendation service", () => {
    beforeEach(() => {
        mockedConfig.mockReset();
        mockedPlanner.mockReset();
        mockedResolver.mockReset();
        mockedFallback.mockReset();
        mockedConfig.mockResolvedValue({
            baseUrl: "https://example.com/v1",
            apiKey: "secret",
            model: "test-model",
        });
        mockedPlanner.mockResolvedValue({
            plan: {
                intentSummary: "夜晚散步",
                tracks: [plannedTrack],
                fallbackQueries: ["夜晚 散步"],
            },
            responseFormat: "json-object",
        });
    });

    it("returns partial playable results and records diagnostics", async () => {
        mockedResolver.mockResolvedValue([playableRecommendation]);
        mockedFallback.mockResolvedValue([playableRecommendation]);
        const progress: string[] = [];

        const result = await generateMusicRecommendations({
            prompt: "夜晚散步想听安静的歌",
            history: [],
            limit: 3,
            onProgress: event => progress.push(event.stage),
        });

        expect(result).toMatchObject({
            partial: true,
            recommendations: [playableRecommendation],
            diagnostics: {
                providerHost: "example.com",
                model: "test-model",
                plannedTrackCount: 1,
                matchedTrackCount: 1,
                usedFallback: true,
            },
        });
        expect(progress).toEqual(["planning", "completed"]);
        expect(mockedFallback).toHaveBeenCalledWith(
            ["夜晚 散步"],
            [playableRecommendation],
            expect.objectContaining({ target: 3 }),
        );
    });

    it("does not resolve explicitly ignored planned tracks", async () => {
        mockedResolver.mockResolvedValue([]);
        mockedFallback.mockResolvedValue([]);

        await expect(
            generateMusicRecommendations({
                prompt: "夜晚散步想听安静的歌",
                history: [],
                ignoredTracks: [plannedTrack],
            }),
        ).rejects.toMatchObject({ code: "no-candidates" });

        expect(mockedResolver).toHaveBeenCalledWith(
            [],
            expect.any(Object),
        );
    });
});
