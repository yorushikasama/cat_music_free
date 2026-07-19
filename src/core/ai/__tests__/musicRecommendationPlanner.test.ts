import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("../client", () => ({
    createChatCompletionResult: require("@jest/globals").jest.fn(),
    AIError: class AIError extends Error {
        code: string;

        constructor(code: string, message: string) {
            super(message);
            this.code = code;
        }
    },
}));

jest.mock("@/utils/log", () => ({
    errorLog: require("@jest/globals").jest.fn(),
}));

import { createChatCompletionResult } from "../client";
import {
    parseMusicRecommendationPlan,
    planMusicRecommendations,
} from "../musicRecommendationPlanner";

const mockedCreateChatCompletionResult = jest.mocked(createChatCompletionResult);

describe("AI music recommendation planner", () => {
    beforeEach(() => {
        mockedCreateChatCompletionResult.mockReset();
    });

    it("parses fenced JSON, removes duplicate tracks, and preserves search hints", () => {
        const plan = parseMusicRecommendationPlan(`\`\`\`json
            {"intentSummary":"雨天散步","tracks":[
              {"title":"Song One","artist":"Artist One","reason":"氛围安静","searchHints":["Song One Artist One"]},
              {"title":"Song One","artist":"Artist One","reason":"重复"},
              {"title":"Song Two","artist":"Artist Two","reason":"节奏轻快"}
            ],"fallbackQueries":["雨天 日语 女声","雨天 日语 女声"]}
        \`\`\``);

        expect(plan).toMatchObject({
            intentSummary: "雨天散步",
            fallbackQueries: ["雨天 日语 女声"],
        });
        expect(plan.tracks).toHaveLength(2);
        expect(plan.tracks[0]).toMatchObject({
            fingerprint: "song one::artist one",
            searchHints: ["Song One Artist One"],
        });
    });

    it("accepts common response wrappers and field aliases without a reason", () => {
        const plan = parseMusicRecommendationPlan(
            JSON.stringify({
                data: {
                    tracks: [
                        {
                            songName: "Ref:rain",
                            artists: [{ name: "Aimer" }],
                            albumName: "Penny Rain",
                            search_hints: ["Ref:rain Aimer"],
                        },
                        {
                            trackName: "Rain",
                            artistName: "秦基博",
                            why: "适合雨天",
                        },
                    ],
                },
            }),
        );

        expect(plan.tracks).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    title: "Ref:rain",
                    artist: "Aimer",
                    album: "Penny Rain",
                    reason: "",
                    searchHints: ["Ref:rain Aimer"],
                }),
                expect.objectContaining({
                    title: "Rain",
                    artist: "秦基博",
                    reason: "适合雨天",
                }),
            ]),
        );
    });

    it("finds a JSON plan after prose and decodes nested JSON strings", () => {
        const plan = parseMusicRecommendationPlan(`分析完成，以下是结果：
            {"result":"{\\"songList\\":[{\\"song\\":{\\"song_title\\":\\"Ref:rain\\",\\"artist_name\\":\\"Aimer\\"},\\"recommendation_reason\\":\\"雨天适合\\"}]}"}
            祝你听歌愉快。`);

        expect(plan.tracks).toEqual([
            expect.objectContaining({
                title: "Ref:rain",
                artist: "Aimer",
                reason: "雨天适合",
            }),
        ]);
    });

    it("uses a later JSON object when an earlier embedded object is not a plan", () => {
        const plan = parseMusicRecommendationPlan(
            "说明 {\"language\":\"ja\"} {\"recommendations\":[{\"name\":\"春の夜\",\"singer\":\"手嶌葵\"}]}",
        );

        expect(plan.tracks).toEqual([
            expect.objectContaining({ title: "春の夜", artist: "手嶌葵" }),
        ]);
    });

    it("sends compact listening context without a candidate pool", async () => {
        mockedCreateChatCompletionResult.mockResolvedValueOnce({
            content:
                "{\"tracks\":[{\"title\":\"Song One\",\"artist\":\"Artist\",\"reason\":\"适合\"}],\"fallbackQueries\":[]}",
            responseFormat: "json-object",
        });

        await planMusicRecommendations({
            prompt: "下雨天想听安静的歌",
            history: [
                {
                    id: "one",
                    platform: "source",
                    title: "History Song",
                    artist: "History Artist",
                    album: "History Album",
                },
            ] as IMusic.IMusicItem[],
            likedTracks: [
                {
                    fingerprint: "liked::artist",
                    title: "Liked",
                    artist: "Artist",
                },
            ],
        });

        const payload = JSON.parse(
            mockedCreateChatCompletionResult.mock.calls[0][0][1].content,
        );
        expect(payload.recentListening).toEqual([
            {
                title: "History Song",
                artist: "History Artist",
                album: "History Album",
            },
        ]);
        expect(payload).not.toHaveProperty("candidates");
        expect(mockedCreateChatCompletionResult).toHaveBeenCalledWith(
            expect.any(Array),
            expect.objectContaining({ responseFormat: "auto" }),
            undefined,
        );
        const contract = mockedCreateChatCompletionResult.mock.calls[0][0][0]
            .content;
        expect(contract).toContain("Return exactly one valid JSON object");
        expect(contract).toContain("first character must be {");
        expect(contract).toContain("last character must be }");
        expect(contract).toContain("Do not wrap the object in data");
        expect(contract).toContain("exactly requestedTrackCount distinct items");
        expect(contract).toContain("exactly these three top-level keys");
        expect(contract).toContain("plugins—not you—resolve platform IDs");
        expect(contract).toContain("Prohibited keys and values include URL");
        expect(contract).toContain("Do not claim that a song is searchable");
    });

    it("retries once with a stricter JSON request after an invalid plan", async () => {
        mockedCreateChatCompletionResult
            .mockResolvedValueOnce({
                content: "这里是一些推荐：晴天 - 周杰伦",
                responseFormat: "json-object",
            })
            .mockResolvedValueOnce({
                content:
                    "{\"tracks\":[{\"title\":\"Ref:rain\",\"artist\":\"Aimer\"}]}",
                responseFormat: "json-object",
            });

        await expect(
            planMusicRecommendations({
                prompt: "下雨天想听安静一点的日语女声",
                history: [],
            }),
        ).resolves.toMatchObject({
            plan: {
                tracks: [
                    expect.objectContaining({
                        title: "Ref:rain",
                        artist: "Aimer",
                    }),
                ],
            },
        });
        expect(mockedCreateChatCompletionResult).toHaveBeenCalledTimes(2);
        expect(
            mockedCreateChatCompletionResult.mock.calls[1][0],
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    content: expect.stringContaining("recovery protocol"),
                }),
            ]),
        );
        const recoveryContract = mockedCreateChatCompletionResult.mock.calls[1][0][1]
            .content;
        expect(recoveryContract).toContain("\"tracks\":[{\"title\":\"string\",\"artist\":\"string\"}]");
        expect(recoveryContract).toContain("no extra keys");
        expect(recoveryContract).toContain("exactly requestedTrackCount distinct real released songs");
        expect(recoveryContract).toContain("cannot search providers");
        expect(recoveryContract).toContain("Never return URLs, links, platform IDs");
        expect(mockedCreateChatCompletionResult.mock.calls[1][1]).toEqual(
            expect.objectContaining({
                responseFormat: "prompt-only",
                maxTokens: 900,
            }),
        );
        expect(
            JSON.parse(mockedCreateChatCompletionResult.mock.calls[1][0].at(-1)!.content),
        ).not.toHaveProperty("recentListening");
    });
});
