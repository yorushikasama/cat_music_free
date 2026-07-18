import { readLocalLyricFiles } from "../localLyricFiles";
import { describe, expect, it, jest } from "@jest/globals";

jest.mock("../../constants/pathConst", () => ({
    __esModule: true,
    default: { localLrcPath: "/local_lrc/" },
}));

jest.mock("crypto-js", () => ({
    __esModule: true,
    default: {
        MD5: (value: string) => ({
            toString: () => `hash-${value}`,
        }),
        enc: { Hex: "hex" },
    },
}));

describe("local AI lyric files", () => {
    it("loads a generated translation even when the original lyric remains online", async () => {
        const exists = jest.fn(async (path: string) => path.endsWith(".tran.lrc"));
        const readFile = jest.fn(async () => "[00:01.00]翻译后的歌词");

        await expect(
            readLocalLyricFiles(
                { platform: "source", id: "song" },
                { exists, readFile },
            ),
        ).resolves.toEqual({
            rawLrc: undefined,
            translation: "[00:01.00]翻译后的歌词",
        });
    });
});
