import {
    collectTimedLyricLines,
    rebuildTranslationLrc,
    resolveLyricTargetLanguage,
    translateLyric,
} from "../lyricTranslator";
import { createChatCompletion } from "../client";
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

jest.mock("@/utils/log", () => ({
    errorLog: require("@jest/globals").jest.fn(),
}));

const mockedCreateChatCompletion = jest.mocked(createChatCompletion);

describe("AI lyric translation helpers", () => {
    it("collects timed lines and deduplicates repeated lyrics", () => {
        const parsed = collectTimedLyricLines(
            "[ar:Artist]\n[00:01.00]Hello\n[00:05.50]Hello\n[00:10.00][00:11.00]World",
        );

        expect(parsed.uniqueTexts).toEqual([
            { id: 0, text: "Hello" },
            { id: 1, text: "World" },
        ]);
        expect(parsed.sourceLines).toHaveLength(3);
    });

    it("rebuilds translation LRC with original timestamps", () => {
        const parsed = collectTimedLyricLines(
            "[00:01.00]Hello\n[00:05.50]Hello\n[00:10.00][00:11.00]World",
        );

        expect(
            rebuildTranslationLrc(parsed.sourceLines, [
                { id: 0, text: "你好" },
                { id: 1, text: "世界" },
            ]),
        ).toBe(
            "[00:01.00]你好\n[00:05.50]你好\n[00:10.00][00:11.00]世界",
        );
    });

    it("uses the app language when the target is automatic", () => {
        expect(resolveLyricTargetLanguage("auto", "zh-CN")).toBe("简体中文");
        expect(resolveLyricTargetLanguage("", "zh-TW")).toBe("繁体中文");
        expect(resolveLyricTargetLanguage(undefined, "en-US")).toBe("English");
        expect(resolveLyricTargetLanguage("日本語", "zh-CN")).toBe("日本語");
    });

    it("skips creating a duplicate translation for target-language lyrics", async () => {
        mockedCreateChatCompletion.mockResolvedValueOnce(
            JSON.stringify({
                translations: [
                    {
                        id: 0,
                        text: "萤火虫点亮夜空",
                        translated: false,
                        sourceLanguage: "简体中文",
                    },
                ],
            }),
        );

        const result = await translateLyric(
            "[00:01.00]萤火虫点亮夜空",
            "简体中文",
        );

        expect(result.translatedLineCount).toBe(0);
        expect(result.lrc).toBe("[00:01.00]萤火虫点亮夜空");
        expect(result.sourceLanguages).toEqual(["简体中文"]);
    });

    it("preserves target-language lines while translating mixed lyrics", async () => {
        mockedCreateChatCompletion.mockResolvedValueOnce(
            JSON.stringify({
                translations: [
                    {
                        id: 0,
                        text: "今晚 moonlight 很美",
                        translated: true,
                        sourceLanguage: "English and Chinese",
                    },
                    {
                        id: 1,
                        text: "不要忘记我",
                        translated: false,
                        sourceLanguage: "简体中文",
                    },
                ],
            }),
        );

        const result = await translateLyric(
            "[00:01.00][00:02.00]Tonight moonlight 很美\n[00:03.00]不要忘记我",
            "简体中文",
        );

        expect(result.translatedLineCount).toBe(1);
        expect(result.lrc).toBe(
            "[00:01.00][00:02.00]今晚 moonlight 很美\n[00:03.00]不要忘记我",
        );
    });

    it("rejects incomplete or duplicate translation ids", async () => {
        mockedCreateChatCompletion.mockResolvedValueOnce(
            JSON.stringify({
                translations: [
                    { id: 0, text: "你好", translated: true },
                    { id: 0, text: "你好", translated: true },
                ],
            }),
        );

        await expect(
            translateLyric("[00:01.00]Hello\n[00:02.00]World", "简体中文"),
        ).rejects.toMatchObject({ code: "incomplete-translation" });
    });

    it("gives a translation request a full minute before timing out", async () => {
        mockedCreateChatCompletion.mockResolvedValueOnce(
            JSON.stringify({
                translations: [
                    {
                        id: 0,
                        text: "雨夜",
                        translated: true,
                        sourceLanguage: "Japanese",
                    },
                ],
            }),
        );

        await translateLyric("[00:01.00]雨の夜", "简体中文");

        expect(mockedCreateChatCompletion).toHaveBeenCalledWith(
            expect.any(Array),
            expect.objectContaining({
                timeout: 60000,
                maxTokens: 1200,
            }),
        );
    });
});
