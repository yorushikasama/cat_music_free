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
        expect(mockedCreateChatCompletion).toHaveBeenLastCalledWith(
            expect.any(Array),
            expect.objectContaining({ responseFormat: "json_object" }),
        );
    });

    it("accepts common response wrappers and resolves a bare candidate music id", async () => {
        mockedCreateChatCompletion.mockResolvedValueOnce(
            JSON.stringify({
                tracks: [
                    { musicId: "two", reason: "雨天里温柔安静" },
                ],
            }),
        );

        await expect(
            recommendMusicWithAI({
                prompt: "下雨天想听安静的日语女声",
                candidates,
                history: [],
            }),
        ).resolves.toEqual([
            { music: candidates[1], reason: "雨天里温柔安静" },
        ]);
    });

    it("accepts a title and artist match when the model omits the candidate id", async () => {
        mockedCreateChatCompletion.mockResolvedValueOnce(
            JSON.stringify([
                { title: "Song One", artist: "Artist One" },
            ]),
        );

        await expect(
            recommendMusicWithAI({
                prompt: "下雨天想听安静的日语女声",
                candidates,
                history: [],
            }),
        ).resolves.toEqual([
            { music: candidates[0], reason: "与当前想听的氛围相配" },
        ]);
    });

    it("extracts a JSON response wrapped in explanatory text", async () => {
        mockedCreateChatCompletion.mockResolvedValueOnce(
            "推荐如下：{\"data\":{\"results\":[{\"songId\":\"one\",\"description\":\"适合雨声伴随的安静时刻\"}]}}",
        );

        await expect(
            recommendMusicWithAI({
                prompt: "下雨天想听安静的日语女声",
                candidates,
                history: [],
            }),
        ).resolves.toEqual([
            { music: candidates[0], reason: "适合雨声伴随的安静时刻" },
        ]);
    });

    it("falls back to a supplied song id when the provider id is not a candidate", async () => {
        mockedCreateChatCompletion.mockResolvedValueOnce(
            JSON.stringify({
                recommendations: [
                    {
                        id: "provider-record-123",
                        songId: "two",
                        reason: "和当前的聆听偏好相近",
                    },
                ],
            }),
        );

        await expect(
            recommendMusicWithAI({
                prompt: "想听相近风格的歌",
                candidates,
                history: [],
            }),
        ).resolves.toEqual([
            { music: candidates[1], reason: "和当前的聆听偏好相近" },
        ]);
    });

    it("resolves a nested song object from a provider-specific response", async () => {
        mockedCreateChatCompletion.mockResolvedValueOnce(
            JSON.stringify({
                recommendations: [
                    {
                        song: {
                            id: "two",
                            title: "Song Two",
                            artist: "Artist Two",
                        },
                        why: "女声柔和，适合雨天独处",
                    },
                ],
            }),
        );

        await expect(
            recommendMusicWithAI({
                prompt: "下雨天想听安静的日语女声",
                candidates,
                history: [],
            }),
        ).resolves.toEqual([
            { music: candidates[1], reason: "女声柔和，适合雨天独处" },
        ]);
    });

    it("accepts a single recommendation object in a provider data wrapper", async () => {
        mockedCreateChatCompletion.mockResolvedValueOnce(
            JSON.stringify({
                data: {
                    recommendation: {
                        id: "two",
                        reason: "节奏舒缓，适合作为工作背景",
                    },
                },
            }),
        );

        await expect(
            recommendMusicWithAI({
                prompt: "工作时想听节奏舒缓的音乐",
                candidates,
                history: [],
            }),
        ).resolves.toEqual([
            { music: candidates[1], reason: "节奏舒缓，适合作为工作背景" },
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

    it("maps non-container JSON responses to the standard invalid-response error", async () => {
        mockedCreateChatCompletion.mockResolvedValueOnce("null");

        await expect(
            recommendMusicWithAI({
                prompt: "随便听听",
                candidates,
                history: [],
            }),
        ).rejects.toMatchObject({ code: "invalid-response" });
    });

    it("rejects an AI response whose otherwise valid recommendations have empty reasons", async () => {
        mockedCreateChatCompletion.mockResolvedValueOnce(
            JSON.stringify({
                recommendations: [{ id: "source-a@one", reason: "   " }],
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

    it("reports a truncated recommendation response without leaking a JSON parser error", async () => {
        mockedCreateChatCompletion.mockResolvedValueOnce(
            "{\"recommendations\":[{\"id\":\"source-a@one\"",
        );

        await expect(
            recommendMusicWithAI({
                prompt: "随便听听",
                candidates,
                history: [],
            }),
        ).rejects.toMatchObject({
            code: "invalid-response",
            message:
                "AI recommendation response was incomplete; try again or select a faster model",
        });
    });

    it("sends the current mix and a refinement instruction to the AI", async () => {
        mockedCreateChatCompletion.mockResolvedValueOnce(
            JSON.stringify({
                recommendations: [
                    { id: "source-a@one", reason: "节奏更轻快" },
                ],
            }),
        );

        await recommendMusicWithAI({
            prompt: "通勤时想听轻松的歌",
            candidates,
            history: [],
            refinement: "节奏再快一点",
            exploration: "explore",
            likedMusicIds: ["source-a@one"],
            previousRecommendations: [
                { music: candidates[1], reason: "适合通勤" },
            ],
        });

        const request = JSON.parse(
            mockedCreateChatCompletion.mock.calls.at(-1)?.[0][1]
                .content as string,
        );
        expect(request.refinement).toBe("节奏再快一点");
        expect(request.exploration).toBe("explore");
        expect(request.likedCandidateIds).toEqual(["source-a@one"]);
        expect(request.currentRecommendations).toEqual([
            {
                id: "source-a@two",
                title: "Song Two",
                artist: "Artist Two",
                reason: "适合通勤",
            },
        ]);
    });
});
