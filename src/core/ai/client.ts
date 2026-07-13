import Config from "@/core/appConfig";
import axios from "axios";

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

export interface IAIClientConfig {
    baseUrl: string;
    apiKey: string;
    model: string;
}

function normalizeBaseUrl(baseUrl: string) {
    return baseUrl.trim().replace(/\/+$/, "");
}

export function getAIClientConfig(): IAIClientConfig {
    return {
        baseUrl: normalizeBaseUrl(
            Config.getConfig("ai.baseUrl") || "https://api.openai.com/v1",
        ),
        apiKey: Config.getConfig("ai.apiKey")?.trim() || "",
        model: Config.getConfig("ai.model")?.trim() || "gpt-4o-mini",
    };
}

export function isAIConfigured() {
    const config = getAIClientConfig();
    return !!(config.baseUrl && config.apiKey && config.model);
}

export async function createChatCompletion(
    messages: IAIChatMessage[],
    options?: {
        temperature?: number;
        maxTokens?: number;
    },
) {
    const config = getAIClientConfig();
    if (!config.apiKey) {
        throw new Error("请先配置 AI API Key");
    }
    if (!config.model) {
        throw new Error("请先配置 AI 模型");
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
            },
            {
                headers: {
                    Authorization: `Bearer ${config.apiKey}`,
                    "Content-Type": "application/json",
                },
                timeout: 60000,
            },
        );

        const content = response.data.choices?.[0]?.message?.content?.trim();
        if (!content) {
            throw new Error("AI 返回了空内容");
        }
        return content;
    } catch (error: any) {
        const message =
            error?.response?.data?.error?.message ??
            error?.response?.data?.message ??
            error?.message ??
            "AI 请求失败";
        throw new Error(String(message));
    }
}

export async function testAIConnection() {
    const content = await createChatCompletion(
        [
            {
                role: "user",
                content: "Reply with OK only.",
            },
        ],
        { temperature: 0, maxTokens: 8 },
    );
    return content.length > 0;
}
