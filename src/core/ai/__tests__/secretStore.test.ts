import * as SecureStore from "expo-secure-store";
import Config from "../../appConfig";
import { getAIApiKey } from "../secretStore";
import { describe, expect, it, jest } from "@jest/globals";

jest.mock("expo-secure-store", () => ({
    getItemAsync: require("@jest/globals").jest.fn(async () => ""),
    setItemAsync: require("@jest/globals").jest.fn(async () => undefined),
    deleteItemAsync: require("@jest/globals").jest.fn(async () => undefined),
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
}));

jest.mock("../../appConfig", () => ({
    __esModule: true,
    default: {
        getConfig: require("@jest/globals").jest.fn(() => "legacy-secret"),
        setConfig: require("@jest/globals").jest.fn(),
    },
}));

describe("AI secret storage", () => {
    it("migrates a legacy MMKV key and removes the plaintext value", async () => {
        await expect(getAIApiKey()).resolves.toBe("legacy-secret");
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
            "catmusicfree.ai.apiKey",
            "legacy-secret",
            expect.any(Object),
        );
        expect(Config.setConfig).toHaveBeenCalledWith("ai.apiKey", undefined);
    });
});
