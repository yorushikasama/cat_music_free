import i18n from "@/core/i18n";
import PersistStatus from "@/utils/persistStatus";
import { Alert } from "react-native";

export type AIDataUse = "recommendation" | "translation";

export function ensureAIDataSharingConsent(use: AIDataUse) {
    if (PersistStatus.get("ai.dataSharingAccepted")) {
        return Promise.resolve(true);
    }

    return new Promise<boolean>(resolve => {
        let settled = false;
        const finish = (value: boolean) => {
            if (!settled) {
                settled = true;
                resolve(value);
            }
        };
        Alert.alert(
            i18n.t("aiConsent.title"),
            i18n.t(
                use === "translation"
                    ? "aiConsent.translationDescription"
                    : "aiConsent.recommendationDescription",
            ),
            [
                {
                    text: i18n.t("common.cancel"),
                    style: "cancel",
                    onPress: () => finish(false),
                },
                {
                    text: i18n.t("aiConsent.accept"),
                    onPress: () => {
                        PersistStatus.set("ai.dataSharingAccepted", true);
                        finish(true);
                    },
                },
            ],
            {
                cancelable: true,
                onDismiss: () => finish(false),
            },
        );
    });
}

export function revokeAIDataSharingConsent() {
    PersistStatus.set("ai.dataSharingAccepted", false);
}
