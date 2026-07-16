import Config from "../../appConfig";
import { clearAIApiKey, getAIApiKey, setAIApiKey } from "../secretStore";
import { describe, expect, it, jest } from "@jest/globals";

jest.mock("../../appConfig", () => ({
    __esModule: true,
    default: {
        getConfig: require("@jest/globals").jest.fn(() => "saved-secret"),
        setConfig: require("@jest/globals").jest.fn(),
    },
}));

describe("AI key storage", () => {
    it("reads the key from application config", async () => {
        await expect(getAIApiKey()).resolves.toBe("saved-secret");
        expect(Config.getConfig).toHaveBeenCalledWith("ai.apiKey");
    });

    it("writes a trimmed key to application config", async () => {
        await expect(setAIApiKey("  configured-key  ")).resolves.toBeUndefined();
        expect(Config.setConfig).toHaveBeenCalledWith(
            "ai.apiKey",
            "configured-key",
        );
    });

    it("clears the key from application config", async () => {
        await expect(clearAIApiKey()).resolves.toBeUndefined();
        expect(Config.setConfig).toHaveBeenCalledWith("ai.apiKey", undefined);
    });
});
