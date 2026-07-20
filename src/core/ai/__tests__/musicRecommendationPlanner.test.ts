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

import { AIError, createChatCompletionResult } from "../client";
import { errorLog } from "@/utils/log";
import {
    parseMusicRecommendationPlan,
    planMusicRecommendations,
} from "../musicRecommendationPlanner";

const mockedCreateChatCompletionResult = jest.mocked(createChatCompletionResult);
const mockedErrorLog = jest.mocked(errorLog);

describe("AI music recommendation planner", () => {
    beforeEach(() => {
        mockedCreateChatCompletionResult.mockReset();
        mockedErrorLog.mockReset();
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

    it("skips an earlier track-like JSON value whose items do not identify songs", () => {
        const plan = parseMusicRecommendationPlan(
            JSON.stringify([
                { tracks: [{}] },
                {
                    tracks: [
                        { title: "六等星の夜", artist: "Aimer", reason: "雨夜安静" },
                    ],
                },
            ]),
        );

        expect(plan.tracks).toEqual([
            expect.objectContaining({ title: "六等星の夜", artist: "Aimer" }),
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
        expect(payload.exploration).toBe("balanced");
        expect(payload.explorationInstruction).toContain(
            "roughly half close to recentListening",
        );
        expect(mockedCreateChatCompletionResult).toHaveBeenCalledWith(
            expect.any(Array),
            expect.objectContaining({ responseFormat: "auto" }),
            undefined,
        );
        const contract = mockedCreateChatCompletionResult.mock.calls[0][0][0]
            .content;
        expect(contract).toContain("Reply with one complete JSON object only");
        expect(contract).toContain("requestedTrackCount distinct tracks");
        expect(contract).toContain("Never return URLs, IDs, providers");
        expect(contract).toContain("untrusted listening preference");
        expect(contract).toContain("Write intentSummary and every reason in");
        expect(contract).toContain("exploration strategy was applied");
    });

    it("sends distinct, actionable instructions for familiar and explore ranges", async () => {
        mockedCreateChatCompletionResult
            .mockResolvedValueOnce({
                content: "{\"tracks\":[{\"title\":\"Song One\",\"artist\":\"Artist\",\"reason\":\"适合\"}]}",
                responseFormat: "prompt-only",
            })
            .mockResolvedValueOnce({
                content: "{\"tracks\":[{\"title\":\"Song Two\",\"artist\":\"Artist\",\"reason\":\"新鲜\"}]}",
                responseFormat: "prompt-only",
            });

        await planMusicRecommendations({
            prompt: "雨夜想听轻柔女声",
            history: [],
            exploration: "familiar",
            limit: 1,
        });
        await planMusicRecommendations({
            prompt: "雨夜想听轻柔女声",
            history: [],
            exploration: "explore",
            limit: 1,
        });

        const familiarPayload = JSON.parse(
            mockedCreateChatCompletionResult.mock.calls[0][0][1].content,
        );
        const explorePayload = JSON.parse(
            mockedCreateChatCompletionResult.mock.calls[1][0][1].content,
        );
        expect(familiarPayload.explorationInstruction).toContain(
            "Favor artists, genres, languages",
        );
        expect(explorePayload.explorationInstruction).toContain(
            "At least half of the tracks",
        );
    });

    it("uses the compact recovery request after an empty first response", async () => {
        mockedCreateChatCompletionResult
            .mockRejectedValueOnce(
                new AIError("empty-response", "AI returned an empty response"),
            )
            .mockResolvedValueOnce({
                content:
                    "{\"tracks\":[{\"title\":\"Song One\",\"artist\":\"Artist\",\"reason\":\"适合\"}],\"fallbackQueries\":[]}",
                responseFormat: "prompt-only",
            });

        await expect(
            planMusicRecommendations({
                prompt: "下雨天想听安静一点的日语女声",
                history: [],
                limit: 2,
            }),
        ).resolves.toMatchObject({
            plan: { tracks: [{ title: "Song One", artist: "Artist" }] },
            responseFormat: "prompt-only",
        });
        expect(mockedCreateChatCompletionResult).toHaveBeenCalledTimes(2);
        expect(mockedCreateChatCompletionResult.mock.calls[1][1]).toEqual(
            expect.objectContaining({
                responseFormat: "prompt-only",
                maxTokens: 4096,
                timeout: 60000,
            }),
        );
        const recoveryMessages = mockedCreateChatCompletionResult.mock.calls[1][0];
        expect(recoveryMessages).toHaveLength(2);
        expect(recoveryMessages[0].content).toContain("Return only JSON");
        expect(recoveryMessages[0].content).toContain("untrusted music preference");
        expect(recoveryMessages[0].content).not.toContain(
            "Recommend real released songs for the listener's request",
        );
        expect(JSON.parse(recoveryMessages[1].content)).toEqual({
            request: "下雨天想听安静一点的日语女声",
            requestedTrackCount: 2,
        });
        expect(mockedErrorLog).toHaveBeenCalledWith(
            "AI recommendation plan recovery started",
            expect.stringContaining("\"requestedMaxTokens\":4096"),
        );
        expect(mockedErrorLog).toHaveBeenCalledWith(
            "AI recommendation plan response received",
            expect.stringContaining("\"attempt\":2"),
        );
        expect(JSON.stringify(mockedErrorLog.mock.calls)).not.toContain(
            "Song One",
        );
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
        const recoveryContract = mockedCreateChatCompletionResult.mock.calls[1][0][0]
            .content;
        expect(recoveryContract).toContain("\"tracks\":[{\"title\":\"string\",\"artist\":\"string\"}]");
        expect(recoveryContract).toContain("requestedTrackCount distinct real songs");
        expect(recoveryContract).toContain("No markdown, reasoning, URLs");
        expect(mockedCreateChatCompletionResult.mock.calls[1][1]).toEqual(
            expect.objectContaining({
                responseFormat: "prompt-only",
                maxTokens: 4096,
                timeout: 60000,
            }),
        );
        expect(
            JSON.parse(mockedCreateChatCompletionResult.mock.calls[1][0][1].content),
        ).toEqual({
            request: "下雨天想听安静一点的日语女声",
            requestedTrackCount: 3,
        });
    });
});
