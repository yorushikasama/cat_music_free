import Config from "@/core/appConfig";
import * as SecureStore from "expo-secure-store";

const API_KEY_NAME = "catmusicfree.ai.apiKey";

let migrationPromise: Promise<string> | null = null;

async function migrateLegacyApiKey() {
    const legacy = Config.getConfig("ai.apiKey")?.trim() ?? "";
    let stored = "";

    try {
        stored = (await SecureStore.getItemAsync(API_KEY_NAME))?.trim() ?? "";
    } catch {
        // Some bare React Native builds can ship without a compatible
        // ExpoSecureStore native module. Keep the configuration usable in
        // that case instead of making every AI action fail before its request.
        return legacy;
    }

    if (!stored && legacy) {
        try {
            await SecureStore.setItemAsync(API_KEY_NAME, legacy);
        } catch {
            return legacy;
        }
    }
    if (Config.getConfig("ai.apiKey") !== undefined) {
        Config.setConfig("ai.apiKey", undefined);
    }
    return stored || legacy;
}

export function getAIApiKey() {
    if (!migrationPromise) {
        migrationPromise = migrateLegacyApiKey().catch(error => {
            migrationPromise = null;
            throw error;
        });
    }
    return migrationPromise;
}

export async function setAIApiKey(apiKey: string) {
    const normalized = apiKey.trim();
    if (!normalized) {
        try {
            await SecureStore.deleteItemAsync(API_KEY_NAME);
        } catch {
            // The fallback below is still enough to make the key unavailable
            // to the app when SecureStore cannot be reached.
        } finally {
            Config.setConfig("ai.apiKey", undefined);
        }
        migrationPromise = Promise.resolve("");
        return;
    }

    try {
        await SecureStore.setItemAsync(API_KEY_NAME, normalized);
        Config.setConfig("ai.apiKey", undefined);
    } catch {
        // MMKV is the existing app configuration store. It is a compatibility
        // fallback only; supported devices continue to use SecureStore.
        Config.setConfig("ai.apiKey", normalized);
    }
    migrationPromise = Promise.resolve(normalized);
}

export async function clearAIApiKey() {
    await setAIApiKey("");
}
