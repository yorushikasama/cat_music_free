import Config from "@/core/appConfig";
import { errorLog } from "@/utils/log";
import axios from "axios";
import { getAIApiKey } from "./secretStore";

export interface IAIChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

interface IChatCompletionContentPart {
    type?: string;
    text?: string;
    content?: string;
}

interface IChatCompletionMessage {
    content?: string | Array<IChatCompletionContentPart | string> | null;
    reasoning_content?: string | null;
    reasoning?: string | null;
    refusal?: string | null;
    tool_calls?: unknown[];
}

interface IChatCompletionResponse {
    choices?: Array<{
        finish_reason?: string | null;
        message?: IChatCompletionMessage;
    }>;
}

export interface IAIResponseDiagnostic {
    choiceCount: number;
    choices: Array<{
        finishReason?: string;
        contentKind: string;
        contentLength: number;
        reasoningLength: number;
        refusalLength: number;
        toolCallCount: number;
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
    | "timeout"
    | "unauthorized"
    | "rate-limited"
    | "model-not-found"
    | "json-mode-unsupported"
    | "aborted";

export class AIError extends Error {
    public readonly cause?: unknown;
    public readonly status?: number;

    constructor(
        public readonly code: AIErrorCode,
        message: string,
        options?: { cause?: unknown; status?: number },
    ) {
        super(message);
        this.name = "AIError";
        this.cause = options?.cause;
        this.status = options?.status;
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
    const status = Number(error?.response?.status);
    const message = String(
        error?.response?.data?.error?.message ??
            error?.response?.data?.message ??
            error?.message ??
            fallback,
    );
    if (error?.code === "ECONNABORTED" || /timeout/i.test(message)) {
        return new AIError("timeout", message, { cause: error, status });
    }
    if (status === 401 || status === 403) {
        return new AIError("unauthorized", message, { cause: error, status });
    }
    if (status === 429) {
        return new AIError("rate-limited", message, { cause: error, status });
    }
    if (
        (status === 400 || status === 422) &&
        /response_format|json[_ -]?object|json mode|unsupported.*json/i.test(
            message,
        )
    ) {
        return new AIError("json-mode-unsupported", message, {
            cause: error,
            status,
        });
    }
    if (status === 404 || /model.+(?:not found|does not exist)/i.test(message)) {
        return new AIError("model-not-found", message, { cause: error, status });
    }
    return new AIError("request-failed", message, { cause: error, status });
}

export type AIResponseFormatMode =
    | "auto"
    | "json-object"
    | "json_object"
    | "prompt-only";

export interface IAIChatCompletionResult {
    content: string;
    responseFormat: "json-object" | "prompt-only";
}

type AIRequestMode =
    | "structured"
    | "prompt"
    | "reasoning-compatible"
    | "reasoning-recovery";

const REASONING_SENSITIVE_MODEL_PATTERN =
    /(?:deepseek[-_.](?:v?[3-9]|r1|reasoner|reasoning|thinking|think)|(?:^|[-_./])(?:o[1-4]|r1|reasoner|reasoning|thinking|think)(?:$|[-_./])|gpt-[5-9]|(?:qwen|glm|kimi).*(?:thinking|reasoner))/i;

/**
 * Some OpenAI-compatible relays count hidden reasoning against max_tokens.
 * A small cap can therefore produce a successful HTTP response with no final
 * content. Keep their structured-output path prompt-driven and unbounded.
 */
export function isReasoningSensitiveModel(model: string) {
    return REASONING_SENSITIVE_MODEL_PATTERN.test(model.trim());
}

function canRetryWithoutJsonMode(error: AIError) {
    if (
        error.code === "json-mode-unsupported" ||
        error.code === "empty-response"
    ) {
        return true;
    }
    if (error.status !== 400 && error.status !== 422) {
        return false;
    }
    return /response_format|json[_ -]?object|json mode|unsupported.*json/i.test(
        error.message,
    );
}

function responseExhaustedByReasoning(error: AIError) {
    if (error.code !== "empty-response") {
        return false;
    }
    const diagnostic = error.cause as IAIResponseDiagnostic | undefined;
    return !!diagnostic?.choices.some(
        choice =>
            choice.finishReason === "length" &&
            choice.contentLength === 0 &&
            choice.reasoningLength > 0,
    );
}

function normalizeChatCompletionContent(
    value:
        | string
        | Array<IChatCompletionContentPart | string>
        | null
        | undefined,
) {
    if (typeof value === "string") {
        return value.trim();
    }
    if (!Array.isArray(value)) {
        return "";
    }
    return value
        .map(part => {
            if (typeof part === "string") {
                return part;
            }
            if (!part || typeof part !== "object") {
                return "";
            }
            return typeof part.text === "string"
                ? part.text
                : typeof part.content === "string"
                    ? part.content
                    : "";
        })
        .join("")
        .trim();
}

function getMessageReasoningLength(message: IChatCompletionMessage | undefined) {
    return [message?.reasoning_content, message?.reasoning]
        .filter((value): value is string => typeof value === "string")
        .join("")
        .trim().length;
}

export function getChatCompletionContent(response: IChatCompletionResponse) {
    return (
        response.choices
            ?.map(choice => normalizeChatCompletionContent(choice.message?.content))
            .find(Boolean) ?? ""
    );
}

export function getChatCompletionDiagnostic(
    response: IChatCompletionResponse,
): IAIResponseDiagnostic {
    return {
        choiceCount: response.choices?.length ?? 0,
        choices: (response.choices ?? []).slice(0, 3).map(choice => ({
            finishReason: choice.finish_reason ?? undefined,
            contentKind: Array.isArray(choice.message?.content)
                ? "parts"
                : typeof choice.message?.content,
            contentLength: normalizeChatCompletionContent(
                choice.message?.content,
            ).length,
            reasoningLength: getMessageReasoningLength(choice.message),
            refusalLength: choice.message?.refusal?.trim().length ?? 0,
            toolCallCount: choice.message?.tool_calls?.length ?? 0,
        })),
    };
}

function getHost(baseUrl: string) {
    try {
        return new URL(baseUrl).host;
    } catch {
        return "unknown";
    }
}

function logAIRequestFailure(
    operation: string,
    config: IAIClientConfig,
    error: AIError,
    durationMs: number,
    responseFormat: "json-object" | "prompt-only",
    requestMode: AIRequestMode,
    maxTokens?: number,
) {
    errorLog(
        "AI request failed",
        JSON.stringify({
            operation,
            host: getHost(config.baseUrl),
            model: config.model,
            code: error.code,
            status: error.status,
            durationMs,
            responseFormat,
            requestMode,
            maxTokens: maxTokens ?? null,
        }),
    );
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

export async function createChatCompletionResult(
    messages: IAIChatMessage[],
    options?: {
        temperature?: number;
        maxTokens?: number;
        signal?: AbortSignal;
        responseFormat?: AIResponseFormatMode;
        timeout?: number;
    },
    configOverrides?: Partial<IAIClientConfig>,
): Promise<IAIChatCompletionResult> {
    const config = await resolveAIClientConfig(configOverrides);
    if (!config.apiKey) {
        throw new AIError("missing-api-key", "AI API Key is required");
    }
    if (!config.model) {
        throw new AIError("missing-model", "AI model is required");
    }

    const request = async (
        responseFormat: "json-object" | "prompt-only",
        maxTokens: number | undefined,
        requestMode: AIRequestMode,
        attempt: number,
    ) => {
        const startedAt = Date.now();
        try {
            const response = await axios.post<IChatCompletionResponse>(
                `${config.baseUrl}/chat/completions`,
                {
                    model: config.model,
                    messages,
                    temperature: options?.temperature ?? 0.2,
                    ...(maxTokens
                        ? { max_tokens: maxTokens }
                        : {}),
                    ...(responseFormat === "json-object"
                        ? { response_format: { type: "json_object" } }
                        : {}),
                },
                {
                    headers: {
                        Authorization: `Bearer ${config.apiKey}`,
                        "Content-Type": "application/json",
                    },
                    timeout: options?.timeout ?? 30000,
                    signal: options?.signal,
                },
            );

            const content = getChatCompletionContent(response.data);
            const diagnostic = getChatCompletionDiagnostic(response.data);
            errorLog(
                "AI chat response received",
                JSON.stringify({
                    host: getHost(config.baseUrl),
                    model: config.model,
                    responseFormat,
                    requestMode,
                    attempt,
                    maxTokens: maxTokens ?? null,
                    durationMs: Date.now() - startedAt,
                    ...diagnostic,
                }),
            );
            if (!content) {
                errorLog(
                    "AI returned no usable chat content",
                    JSON.stringify({
                        host: getHost(config.baseUrl),
                        model: config.model,
                        responseFormat,
                        requestMode,
                        attempt,
                        maxTokens: maxTokens ?? null,
                        ...diagnostic,
                    }),
                );
                throw new AIError(
                    "empty-response",
                    "AI returned an empty response",
                    { cause: diagnostic },
                );
            }
            return { content, responseFormat };
        } catch (error: any) {
            const aiError = getAIRequestError(error, "AI request failed");
            logAIRequestFailure(
                "chat-completion",
                config,
                aiError,
                Date.now() - startedAt,
                responseFormat,
                requestMode,
                maxTokens,
            );
            throw aiError;
        }
    };

    const requestedFormat =
        options?.responseFormat === "json_object"
            ? "json-object"
            : options?.responseFormat ?? "prompt-only";
    const reasoningSensitive = isReasoningSensitiveModel(config.model);
    const useReasoningCompatiblePrompt =
        requestedFormat === "auto" && reasoningSensitive;
    const initialResponseFormat =
        requestedFormat === "prompt-only" || useReasoningCompatiblePrompt
            ? "prompt-only"
            : "json-object";
    const initialRequestMode: AIRequestMode = useReasoningCompatiblePrompt
        ? "reasoning-compatible"
        : initialResponseFormat === "json-object"
            ? "structured"
            : "prompt";
    const initialMaxTokens = reasoningSensitive
        ? undefined
        : options?.maxTokens;

    try {
        return await request(
            initialResponseFormat,
            initialMaxTokens,
            initialRequestMode,
            1,
        );
    } catch (error: any) {
        if (!(error instanceof AIError)) {
            throw error;
        }
        const retryWithoutJsonMode =
            requestedFormat === "auto" &&
            initialResponseFormat === "json-object" &&
            canRetryWithoutJsonMode(error);
        const retryForReasoning =
            error.code === "empty-response" &&
            (reasoningSensitive || responseExhaustedByReasoning(error));
        if (!retryWithoutJsonMode && !retryForReasoning) {
            throw error;
        }

        const requestMode: AIRequestMode = retryForReasoning
            ? "reasoning-recovery"
            : "prompt";
        const maxTokens = retryForReasoning
            ? undefined
            : options?.maxTokens;
        errorLog(
            retryForReasoning
                ? "AI response used only its reasoning budget; retrying without max_tokens"
                : "AI JSON mode failed; retrying without response_format",
            JSON.stringify({
                host: getHost(config.baseUrl),
                model: config.model,
                code: error.code,
                status: error.status,
                responseFormat: initialResponseFormat,
                initialMaxTokens: initialMaxTokens ?? null,
                retryMaxTokens: maxTokens ?? null,
            }),
        );
        return request("prompt-only", maxTokens, requestMode, 2);
    }
}

export async function createChatCompletion(
    messages: IAIChatMessage[],
    options?: {
        temperature?: number;
        maxTokens?: number;
        signal?: AbortSignal;
        responseFormat?: AIResponseFormatMode;
        timeout?: number;
    },
    configOverrides?: Partial<IAIClientConfig>,
) {
    return (
        await createChatCompletionResult(messages, options, configOverrides)
    ).content;
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
    const result = await createChatCompletion(
        [
            {
                role: "user",
                content: "Reply with OK only.",
            },
        ],
        { temperature: 0, maxTokens: 512, timeout: 30000 },
        configOverrides,
    );
    return result.length > 0;
}
