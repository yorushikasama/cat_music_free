import { showDialog } from "@/components/dialogs/useDialog";
import PersistStatus from "@/utils/persistStatus";
import checkUpdate from "@/utils/checkUpdate";
import Toast from "@/utils/toast";
import { compare } from "compare-versions";
import { useCallback, useEffect, useMemo, useState } from "react";
import i18n from "@/core/i18n";

export const checkUpdateAndShowResult = (
    showToast = false,
    checkSkip = false,
) => {
    return checkUpdate().then(updateInfo => {
        if (updateInfo?.needUpdate) {
            const { data } = updateInfo;
            const skipVersion = PersistStatus.get("app.skipVersion");
            if (
                checkSkip &&
                skipVersion &&
                compare(skipVersion, data.version, ">=")
            ) {
                return;
            }
            showDialog("DownloadDialog", {
                version: data.version,
                content: data.changeLog,
                fromUrl: data.download[0],
                backUrl: data.download[1],
            });
        } else {
            if (showToast) {
                Toast.success(i18n.t("checkUpdate.error.latestVersion"));
            }
        }
    });
};

export function useUpdateAvailable(respectSkip = true) {
    const [checking, setChecking] = useState(false);
    const [updateVersion, setUpdateVersion] = useState<string | null>(null);
    const skipVersion = PersistStatus.useValue("app.skipVersion");

    const refresh = useCallback(async () => {
        setChecking(true);
        try {
            const updateInfo = await checkUpdate();
            setUpdateVersion(
                updateInfo?.needUpdate ? updateInfo.data.version : null,
            );
        } finally {
            setChecking(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const hasUpdate = useMemo(() => {
        if (!updateVersion) {
            return false;
        }
        if (!respectSkip || !skipVersion) {
            return true;
        }
        return compare(skipVersion, updateVersion, "<");
    }, [respectSkip, skipVersion, updateVersion]);

    return {
        checking,
        hasUpdate,
        refresh,
        updateVersion,
    };
}

export default function (callOnMount = true) {
    useEffect(() => {
        if (callOnMount) {
            checkUpdateAndShowResult(false, true);
        }
    }, []);

    return checkUpdateAndShowResult;
}
