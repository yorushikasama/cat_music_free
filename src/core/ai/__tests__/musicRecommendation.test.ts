import { createChatCompletion } from "../client";
import {
    buildMusicTasteSummary,
    recommendMusicWithAI,
} from "../musicRecommendation";
import { describe, expect, it, jest } from "@jest/globals";

jest.mock("../client", () => ({
    createChatCompletion: require("@jest/globals").jest.fn(),
    AIError: class AIError extends Error {
        code: string;

        constructor(code: string, message: string) {
            super(message);
            this.code = code;
        }
    },
}));

jest.mock("../../../utils/mediaUtils", () => ({
    getMediaUniqueKey: (music: { platform: string; id: string }) =>
        `${music.platform}@${music.id}`,
}));

const mockedCreateChatCompletion = jest.mocked(createChatCompletion);

const candidates = [
    {
        id: "one",
        platform: "source-a",
        title: "Song One",
        artist: "Artist One",
        album: "Album One",
    },
    {
        id: "two",
        platform: "source-a",
        title: "Song Two",
        artist: "Artist Two",
        album: "Album Two",
    },
] as IMusic.IMusicItem[];

describe("AI music recommendation", () => {
    it("summarizes recent listening without sending raw app state", () => {
        expect(buildMusicTasteSummary(candidates)).toContain(
            "Song One - Artist One (Album One)",
        );
    });

    it("only returns songs from the supplied playable candidate pool", async () => {
        mockedCreateChatCompletion.mockResolvedValueOnce(
            JSON.stringify({
                recommendations: [
                    { id: "source-a@two", reason: "适合夜晚散步" },
                    { id: "invented", reason: "这首不存在" },
                    { id: "source-a@two", reason: "重复结果" },
                ],
            }),
        );

        const result = await recommendMusicWithAI({
            prompt: "夜晚散步",
            candidates,
            history: candidates,
        });

        expect(result).toEqual([
            { music: candidates[1], reason: "适合夜晚散步" },
        ]);
    });

    it("rejects an AI response that contains no valid candidate id", async () => {
        mockedCreateChatCompletion.mockResolvedValueOnce(
            JSON.stringify({
                recommendations: [{ id: "invented", reason: "不存在" }],
            }),
        );

        await expect(
            recommendMusicWithAI({
                prompt: "随便听听",
                candidates,
                history: [],
            }),
        ).rejects.toMatchObject({ code: "invalid-response" });
    });
});
