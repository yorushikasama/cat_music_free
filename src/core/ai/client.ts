import Config from "@/core/appConfig";
import axios from "axios";
import { getAIApiKey } from "./secretStore";

export interface IAIChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

interface IChatCompletionResponse {
    choices?: Array<{
        message?: {
            content?: string;
        };
    }>;
}

interface IModelsResponse {
    data?: Array<{
        id?: string;
    }>;
}

export interface IAIClientConfig {
    baseUrl: string;
    apiKey: string;
    model: string;
}

export type AIErrorCode =
    | "invalid-url"
    | "insecure-url"
    | "missing-api-key"
    | "missing-model"
    | "empty-response"
    | "request-failed"
    | "invalid-response"
    | "no-candidates"
    | "no-plugins"
    | "no-translatable-lyrics"
    | "incomplete-translation"
    | "aborted";

export class AIError extends Error {
    public readonly cause?: unknown;

    constructor(
        public readonly code: AIErrorCode,
        message: string,
        options?: { cause?: unknown },
    ) {
        super(message);
        this.name = "AIError";
        this.cause = options?.cause;
    }
}

function normalizeBaseUrl(baseUrl: string) {
    return baseUrl.trim().replace(/\/+$/, "");
}

export function validateAIBaseUrl(baseUrl: string) {
    const normalized = normalizeBaseUrl(baseUrl);
    let parsed: URL;
    try {
        parsed = new URL(normalized);
    } catch (error) {
        throw new AIError("invalid-url", "Invalid AI API URL", {
            cause: error,
        });
    }

    const isLocalDevelopment =
        typeof __DEV__ !== "undefined" &&
        __DEV__ &&
        parsed.protocol === "http:" &&
        ["localhost", "127.0.0.1", "10.0.2.2"].includes(parsed.hostname);
    if (parsed.protocol !== "https:" && !isLocalDevelopment) {
        throw new AIError("insecure-url", "AI API URL must use HTTPS");
    }
    return normalized;
}

async function resolveAIClientConfig(
    overrides?: Partial<IAIClientConfig>,
): Promise<IAIClientConfig> {
    const saved = await getAIClientConfig();
    return {
        baseUrl: validateAIBaseUrl(overrides?.baseUrl ?? saved.baseUrl),
        apiKey: (overrides?.apiKey ?? saved.apiKey).trim(),
        model: (overrides?.model ?? saved.model).trim(),
    };
}

function getAIRequestError(error: any, fallback: string) {
    if (error instanceof AIError) {
        return error;
    }
    if (axios.isCancel(error) || error?.code === "ERR_CANCELED") {
        return new AIError("aborted", "AI request was cancelled", {
            cause: error,
        });
    }
    const message = String(
        error?.response?.data?.error?.message ??
            error?.response?.data?.message ??
            error?.message ??
            fallback,
    );
    return new AIError("request-failed", message, { cause: error });
}

export async function getAIClientConfig(): Promise<IAIClientConfig> {
    return {
        baseUrl: normalizeBaseUrl(
            Config.getConfig("ai.baseUrl") || "https://api.openai.com/v1",
        ),
        apiKey: await getAIApiKey(),
        model: Config.getConfig("ai.model")?.trim() || "gpt-4o-mini",
    };
}

export async function isAIConfigured() {
    try {
        const config = await getAIClientConfig();
        validateAIBaseUrl(config.baseUrl);
        return !!(config.baseUrl && config.apiKey && config.model);
    } catch {
        return false;
    }
}

export async function createChatCompletion(
    messages: IAIChatMessage[],
    options?: {
        temperature?: number;
        maxTokens?: number;
        signal?: AbortSignal;
        responseFormat?: "json_object";
    },
    configOverrides?: Partial<IAIClientConfig>,
) {
    const config = await resolveAIClientConfig(configOverrides);
    if (!config.apiKey) {
        throw new AIError("missing-api-key", "AI API Key is required");
    }
    if (!config.model) {
        throw new AIError("missing-model", "AI model is required");
    }

    try {
        const response = await axios.post<IChatCompletionResponse>(
            `${config.baseUrl}/chat/completions`,
            {
                model: config.model,
                messages,
                temperature: options?.temperature ?? 0.2,
                ...(options?.maxTokens
                    ? { max_tokens: options.maxTokens }
                    : {}),
                ...(options?.responseFormat
                    ? { response_format: { type: options.responseFormat } }
                    : {}),
            },
            {
                headers: {
                    Authorization: `Bearer ${config.apiKey}`,
                    "Content-Type": "application/json",
                },
                timeout: 60000,
                signal: options?.signal,
            },
        );

        const content = response.data.choices?.[0]?.message?.content?.trim();
        if (!content) {
            throw new AIError(
                "empty-response",
                "AI returned an empty response",
            );
        }
        return content;
    } catch (error: any) {
        throw getAIRequestError(error, "AI request failed");
    }
}

export async function fetchAIModels(
    configOverrides?: Partial<IAIClientConfig>,
) {
    const config = await resolveAIClientConfig(configOverrides);
    try {
        const response = await axios.get<IModelsResponse>(
            `${config.baseUrl}/models`,
            {
                headers: config.apiKey
                    ? { Authorization: `Bearer ${config.apiKey}` }
                    : undefined,
                timeout: 30000,
            },
        );
        return Array.from(
            new Set(
                (response.data.data ?? [])
                    .map(item => item.id?.trim())
                    .filter((id): id is string => !!id),
            ),
        ).sort((a, b) => a.localeCompare(b));
    } catch (error: any) {
        throw getAIRequestError(error, "Failed to load AI models");
    }
}

export async function testAIConnection(
    configOverrides?: Partial<IAIClientConfig>,
) {
    const content = await createChatCompletion(
        [
            {
                role: "user",
                content: "Reply with OK only.",
            },
        ],
        { temperature: 0, maxTokens: 64 },
        configOverrides,
    );
    return content.length > 0;
}
