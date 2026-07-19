import axios from "axios";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
    createChatCompletion,
    createChatCompletionResult,
    fetchAIModels,
    validateAIBaseUrl,
} from "../client";

jest.mock("@/utils/log", () => ({
    errorLog: require("@jest/globals").jest.fn(),
}));

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
    beforeEach(() => {
        mockedGet.mockReset();
        mockedPost.mockReset();
    });

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

    it("requests JSON-object mode when the caller requires structured output", async () => {
        mockedPost.mockResolvedValueOnce({
            data: { choices: [{ message: { content: "{}" } }] },
        });

        await createChatCompletion(
            [{ role: "user", content: "hello" }],
            { responseFormat: "json_object" },
            {
                baseUrl: "https://example.com/v1",
                apiKey: "secret",
                model: "model",
            },
        );

        expect(mockedPost).toHaveBeenCalledWith(
            "https://example.com/v1/chat/completions",
            expect.objectContaining({
                response_format: { type: "json_object" },
            }),
            expect.any(Object),
        );
    });

    it("retries without JSON mode when a compatible provider rejects response_format", async () => {
        mockedPost
            .mockRejectedValueOnce({
                response: {
                    status: 400,
                    data: {
                        error: {
                            message: "response_format json_object is unsupported",
                        },
                    },
                },
            })
            .mockResolvedValueOnce({
                data: { choices: [{ message: { content: "{}" } }] },
            });

        await expect(
            createChatCompletionResult(
                [{ role: "user", content: "hello" }],
                { responseFormat: "auto" },
                {
                    baseUrl: "https://example.com/v1",
                    apiKey: "secret",
                    model: "model",
                },
            ),
        ).resolves.toEqual({ content: "{}", responseFormat: "prompt-only" });
        expect(mockedPost).toHaveBeenCalledTimes(2);
        expect(mockedPost.mock.calls[0][1]).toEqual(
            expect.objectContaining({
                response_format: { type: "json_object" },
            }),
        );
        expect(mockedPost.mock.calls[1][1]).not.toHaveProperty(
            "response_format",
        );
    });

    it("labels an unsupported JSON mode when no fallback is requested", async () => {
        mockedPost.mockRejectedValueOnce({
            response: {
                status: 422,
                data: {
                    error: {
                        message: "response_format json_object is unsupported",
                    },
                },
            },
        });

        await expect(
            createChatCompletion(
                [{ role: "user", content: "hello" }],
                { responseFormat: "json-object" },
                {
                    baseUrl: "https://example.com/v1",
                    apiKey: "secret",
                    model: "model",
                },
            ),
        ).rejects.toMatchObject({ code: "json-mode-unsupported" });
    });

    it("classifies an AI request timeout", async () => {
        mockedPost.mockRejectedValueOnce({
            code: "ECONNABORTED",
            message: "timeout of 30000ms exceeded",
        });

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
        ).rejects.toMatchObject({ code: "timeout" });
    });
});
