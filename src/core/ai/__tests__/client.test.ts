import axios from "axios";
import { describe, expect, it, jest } from "@jest/globals";
import {
    createChatCompletion,
    fetchAIModels,
    validateAIBaseUrl,
} from "../client";

jest.mock("axios", () => ({
    __esModule: true,
    default: {
        get: require("@jest/globals").jest.fn(),
        post: require("@jest/globals").jest.fn(),
        isCancel: require("@jest/globals").jest.fn(() => false),
    },
}));

jest.mock("../../appConfig", () => ({
    __esModule: true,
    default: {
        getConfig: require("@jest/globals").jest.fn(() => undefined),
    },
}));

const mockedGet = jest.mocked(axios.get);
const mockedPost = jest.mocked(axios.post);

describe("AI client model discovery", () => {
    it("loads, deduplicates and sorts OpenAI-compatible models", async () => {
        mockedGet.mockResolvedValueOnce({
            data: {
                data: [
                    { id: "gpt-4o-mini" },
                    { id: "deepseek-chat" },
                    { id: "gpt-4o-mini" },
                    { id: "" },
                ],
            },
        });

        await expect(
            fetchAIModels({
                baseUrl: "https://example.com/v1/",
                apiKey: "secret",
            }),
        ).resolves.toEqual(["deepseek-chat", "gpt-4o-mini"]);
        expect(mockedGet).toHaveBeenCalledWith(
            "https://example.com/v1/models",
            expect.objectContaining({
                headers: { Authorization: "Bearer secret" },
            }),
        );
    });

    it("keeps provider error messages useful", async () => {
        mockedGet.mockRejectedValueOnce({
            response: {
                data: {
                    error: { message: "Invalid API key" },
                },
            },
        });

        await expect(
            fetchAIModels({
                baseUrl: "https://example.com/v1",
                apiKey: "bad-key",
            }),
        ).rejects.toThrow("Invalid API key");
    });

    it("rejects non-HTTPS provider URLs", () => {
        expect(() => validateAIBaseUrl("http://example.com/v1")).toThrow(
            expect.objectContaining({ code: "insecure-url" }),
        );
    });

    it("maps cancelled requests to a stable error code", async () => {
        mockedPost.mockRejectedValueOnce({ code: "ERR_CANCELED" });

        await expect(
            createChatCompletion(
                [{ role: "user", content: "hello" }],
                undefined,
                {
                    baseUrl: "https://example.com/v1",
                    apiKey: "secret",
                    model: "model",
                },
            ),
        ).rejects.toMatchObject({ code: "aborted" });
    });
});
