import i18n from "@/core/i18n";
import type { ILanguageData } from "@/types/core/i18n";
import { AIError, AIErrorCode } from "./client";

const ERROR_KEYS: Record<AIErrorCode, keyof ILanguageData> = {
    "invalid-url": "aiError.invalidUrl",
    "insecure-url": "aiError.insecureUrl",
    "missing-api-key": "aiError.missingApiKey",
    "missing-model": "aiError.missingModel",
    "empty-response": "aiError.emptyResponse",
    "request-failed": "aiError.requestFailed",
    "invalid-response": "aiError.invalidResponse",
    "no-candidates": "aiError.noCandidates",
    "no-plugins": "aiError.noPlugins",
    "no-translatable-lyrics": "aiError.noTranslatableLyrics",
    "incomplete-translation": "aiError.incompleteTranslation",
    aborted: "aiError.aborted",
};

export function getLocalizedAIErrorMessage(error: unknown) {
    if (error instanceof AIError) {
        if (error.code === "request-failed" && error.message) {
            return error.message;
        }
        return i18n.t(ERROR_KEYS[error.code]);
    }
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return i18n.t("aiError.requestFailed");
}
