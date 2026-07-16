import Config from "@/core/appConfig";

/**
 * AI keys are intentionally stored with the rest of the application settings.
 * Keeping this small adapter preserves the asynchronous public API used by the
 * AI client and settings page without depending on a native SecureStore module.
 */
export async function getAIApiKey() {
    return Config.getConfig("ai.apiKey")?.trim() ?? "";
}

export async function setAIApiKey(apiKey: string) {
    const normalized = apiKey.trim();
    Config.setConfig("ai.apiKey", normalized || undefined);
}

export async function clearAIApiKey() {
    await setAIApiKey("");
}
