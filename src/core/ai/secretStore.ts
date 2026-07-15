import Config from "@/core/appConfig";
import * as SecureStore from "expo-secure-store";

const API_KEY_NAME = "catmusicfree.ai.apiKey";

let migrationPromise: Promise<string> | null = null;

async function migrateLegacyApiKey() {
    const stored = (await SecureStore.getItemAsync(API_KEY_NAME))?.trim() ?? "";
    const legacy = Config.getConfig("ai.apiKey")?.trim() ?? "";

    if (!stored && legacy) {
        await SecureStore.setItemAsync(API_KEY_NAME, legacy, {
            keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
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
        await SecureStore.deleteItemAsync(API_KEY_NAME);
        migrationPromise = Promise.resolve("");
        return;
    }
    await SecureStore.setItemAsync(API_KEY_NAME, normalized, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    Config.setConfig("ai.apiKey", undefined);
    migrationPromise = Promise.resolve(normalized);
}

export async function clearAIApiKey() {
    await setAIApiKey("");
}
