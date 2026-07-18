import { describe, expect, it, jest } from "@jest/globals";

jest.mock("../../utils/mediaUtils", () => ({
    getMediaUniqueKey: (music: { platform: string; id: string }) =>
        `${music.platform}@${music.id}`,
}));

import {
    collectLocalMediaPaths,
    mergeUniqueLocalMusic,
} from "../localMusicUtils";

describe("local music helpers", () => {
    it("merges incoming music once while preserving the existing order", () => {
        const existing = [
            { id: "one", platform: "local", title: "One", artist: "A" },
        ] as IMusic.IMusicItem[];
        const incoming = [
            { id: "one", platform: "local", title: "One", artist: "A" },
            { id: "two", platform: "local", title: "Two", artist: "B" },
            { id: "two", platform: "local", title: "Two", artist: "B" },
        ] as IMusic.IMusicItem[];

        expect(mergeUniqueLocalMusic(existing, incoming)).toEqual([
            existing[0],
            incoming[1],
        ]);
    });

    it("walks each directory once and keeps discovered music order", async () => {
        const directories = {
            root: [
                { path: "root/first.mp3", isDirectory: () => false },
                { path: "root/first.mp3", isDirectory: () => false },
                { path: "root/child", isDirectory: () => true },
                { path: "root/child", isDirectory: () => true },
            ],
            "root/child": [
                { path: "root/child/second.flac", isDirectory: () => false },
                { path: "root", isDirectory: () => true },
            ],
        };
        const readDirectory = jest.fn(async (path: string) => directories[path] ?? []);

        await expect(
            collectLocalMediaPaths(
                ["root", "root"],
                readDirectory,
                path => /\.(mp3|flac)$/.test(path),
                () => true,
            ),
        ).resolves.toEqual(["root/first.mp3", "root/child/second.flac"]);
        expect(readDirectory).toHaveBeenCalledTimes(2);
        expect(readDirectory).toHaveBeenNthCalledWith(1, "root");
        expect(readDirectory).toHaveBeenNthCalledWith(2, "root/child");
    });

    it("stops before reading another folder after import cancellation", async () => {
        const readDirectory = jest.fn(async () => []);

        await expect(
            collectLocalMediaPaths(["root"], readDirectory, () => true, () => false),
        ).rejects.toThrow("Import Broken");
        expect(readDirectory).not.toHaveBeenCalled();
    });
});
