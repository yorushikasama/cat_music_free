import axios from "axios";
import { compare } from "compare-versions";
import DeviceInfo from "react-native-device-info";

const updateList = [
    "https://gitee.com/qianmeng_a/cat_music_free/raw/main/release/version.json",
    "https://raw.githubusercontent.com/yorushikasama/cat_music_free/main/release/version.json",
    "https://cdn.jsdelivr.net/gh/yorushikasama/cat_music_free@main/release/version.json",
];

export interface IUpdateData {
    version: string;
    changeLog: string[];
    download: string[];
}

export interface IUpdateInfo {
    needUpdate: boolean;
    data?: IUpdateData;
}

export default async function checkUpdate(): Promise<IUpdateInfo> {
    const currentVersion = DeviceInfo.getVersion();

    const results = await Promise.allSettled(
        updateList.map(url =>
            axios.get<IUpdateData>(url, {
                timeout: 8000,
                headers: {
                    "Cache-Control": "no-cache",
                    Pragma: "no-cache",
                },
            }),
        ),
    );

    let hasValidSource = false;
    for (const result of results) {
        if (result.status !== "fulfilled") {
            continue;
        }
        const rawInfo = result.value.data;
        if (!rawInfo?.version) {
            continue;
        }
        hasValidSource = true;
        if (compare(rawInfo.version, currentVersion, ">")) {
            return {
                needUpdate: true,
                data: rawInfo,
            };
        }
    }

    if (hasValidSource) {
        return {
            needUpdate: false,
        };
    }

    throw new Error("检查更新失败，请稍后再试");
}
