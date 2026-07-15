import { downloadFile, stopDownload } from "react-native-fs";
import { getDownloadDestination } from "../downloadDestination";
import {
    DownloadFailReason,
    Downloader,
    DownloaderEvent,
    resetDownloaderStateForTests,
} from "../downloader";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("react-native-fs", () => ({
    downloadFile: require("@jest/globals").jest.fn(),
    stopDownload: require("@jest/globals").jest.fn(),
    unlink: require("@jest/globals").jest.fn(async () => undefined),
}));
jest.mock("../../constants/commonConst", () => ({
    internalSerializeKey: "__internal",
    supportLocalMediaType: [".mp3", ".flac", ".m4a", ".wav"],
}));
jest.mock("../../constants/pathConst", () => ({
    __esModule: true,
    default: { downloadCachePath: "/cache" },
}));
jest.mock("../../utils/fileUtils", () => ({
    addFileScheme: (value: string) => value,
    escapeCharacter: (value: string) => value,
}));
jest.mock("../../utils/log", () => ({
    errorLog: require("@jest/globals").jest.fn(),
}));
jest.mock("../../utils/mediaExtra", () => ({
    patchMediaExtra: require("@jest/globals").jest.fn(),
}));
jest.mock("../../utils/mediaUtils", () => ({
    getMediaUniqueKey: (music: { platform: string; id: string }) =>
        `${music.platform}@${music.id}`,
    isSameMediaItem: (
        left: { platform: string; id: string },
        right: { platform: string; id: string },
    ) => left.platform === right.platform && left.id === right.id,
}));
jest.mock("../../utils/network", () => ({
    __esModule: true,
    default: { isOffline: false, isCellular: false },
}));
jest.mock("../../utils/qualities", () => ({
    getQualityOrder: () => ["standard"],
}));
jest.mock("../localMusicSheet", () => ({
    __esModule: true,
    default: {
        addMusic: require("@jest/globals").jest.fn(async () => undefined),
        isLocalMusic: require("@jest/globals").jest.fn(() => false),
    },
}));
jest.mock("../downloadDestination", () => ({
    getDownloadDestination: require("@jest/globals").jest.fn(),
}));
jest.mock("../../native/storageAccess", () => ({
    __esModule: true,
    default: {
        deleteDocument: require("@jest/globals").jest.fn(async () => true),
    },
}));
jest.mock("nanoid/non-secure", () => ({ nanoid: () => "cache-id" }));

const mockedDownloadFile = jest.mocked(downloadFile);
const mockedStopDownload = jest.mocked(stopDownload);
const mockedGetDestination = jest.mocked(getDownloadDestination);

const config = {
    getConfig: jest.fn((key: string) => {
        if (key === "basic.maxDownload") return 1;
        if (key === "basic.useCelluarNetworkDownload") return true;
        return undefined;
    }),
} as any;
const pluginManager = { getByName: () => null } as any;

const music = (id: string) => ({
    id,
    platform: "test",
    title: `Song ${id}`,
    artist: "Artist",
    url: `https://example.com/${id}.mp3`,
}) as IMusic.IMusicItem;

afterEach(() => {
    resetDownloaderStateForTests();
    jest.clearAllMocks();
});

describe("download queue pump", () => {
    it("releases the slot after a destination failure and continues", async () => {
        let jobId = 0;
        mockedDownloadFile.mockImplementation((options: any) => {
            jobId += 1;
            options.begin?.({ jobId, contentLength: 10 });
            return { jobId, promise: Promise.resolve({ statusCode: 200 }) } as any;
        });
        const publish = jest
            .fn<() => Promise<string>>()
            .mockRejectedValueOnce(Object.assign(new Error("denied"), {
                code: "PUBLISH_AUDIO_FAILED",
            }))
            .mockResolvedValueOnce("content://media/song-2");
        mockedGetDestination.mockReturnValue({ publish } as any);

        const downloader = new Downloader();
        downloader.injectDependencies(config, pluginManager);
        const errors: DownloadFailReason[] = [];
        downloader.on(DownloaderEvent.DownloadTaskError, reason => {
            errors.push(reason);
        });
        const completed = new Promise<void>(resolve => {
            downloader.once(DownloaderEvent.DownloadQueueCompleted, resolve);
        });

        downloader.download([music("one"), music("two")]);
        await completed;

        expect(publish).toHaveBeenCalledTimes(2);
        expect(errors).toEqual([DownloadFailReason.NoWritePermission]);
    });

    it("cancels an active task without emitting a task error", async () => {
        let rejectDownload: (reason: Error) => void = () => undefined;
        mockedDownloadFile.mockImplementation((options: any) => {
            options.begin?.({ jobId: 7, contentLength: 10 });
            return {
                jobId: 7,
                promise: new Promise((_, reject) => {
                    rejectDownload = reject;
                }),
            } as any;
        });
        mockedStopDownload.mockImplementation(() => {
            rejectDownload(new Error("cancelled"));
        });
        mockedGetDestination.mockReturnValue({
            publish: jest.fn(async () => "content://unused"),
        });

        const downloader = new Downloader();
        downloader.injectDependencies(config, pluginManager);
        const taskError = jest.fn();
        downloader.on(DownloaderEvent.DownloadTaskError, taskError);
        const completed = new Promise<void>(resolve => {
            downloader.once(DownloaderEvent.DownloadQueueCompleted, resolve);
        });
        const item = music("cancel");

        downloader.download(item);
        expect(downloader.remove(item)).toBe(true);
        await completed;

        expect(mockedStopDownload).toHaveBeenCalledWith(7);
        expect(taskError).not.toHaveBeenCalled();
    });
});
