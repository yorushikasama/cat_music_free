import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const FEISHU_API = "https://open.feishu.cn/open-apis";
const MAX_SIMPLE_UPLOAD_SIZE = 20 * 1024 * 1024;
const DEFAULT_APK_PATH = "android/app/build/outputs/apk/release/app-arm64-v8a-release.apk";
const DEFAULT_VERSION_JSON = "release/version.json";

function parseArgs(argv) {
    const args = {};
    for (let index = 0; index < argv.length; index += 1) {
        const item = argv[index];
        if (!item.startsWith("--")) {
            continue;
        }
        const [rawKey, rawValue] = item.slice(2).split("=");
        const key = rawKey.trim();
        if (rawValue !== undefined) {
            args[key] = rawValue;
        } else {
            const next = argv[index + 1];
            if (next && !next.startsWith("--")) {
                args[key] = next;
                index += 1;
            } else {
                args[key] = "true";
            }
        }
    }
    return args;
}

async function loadEnvFile(filePath) {
    try {
        const content = await fs.readFile(filePath, "utf8");
        for (const line of content.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) {
                continue;
            }
            const eqIndex = trimmed.indexOf("=");
            if (eqIndex <= 0) {
                continue;
            }
            const key = trimmed.slice(0, eqIndex).trim();
            let value = trimmed.slice(eqIndex + 1).trim();
            if (
                (value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))
            ) {
                value = value.slice(1, -1);
            }
            if (!process.env[key]) {
                process.env[key] = value;
            }
        }
    } catch (error) {
        if (error?.code !== "ENOENT") {
            throw error;
        }
    }
}

function getEnv(name, fallback = "") {
    return process.env[name]?.trim() || fallback;
}

function requireEnv(name) {
    const value = getEnv(name);
    if (!value) {
        throw new Error(`Missing required env: ${name}`);
    }
    return value;
}

function getFolderToken(input) {
    const value = input.trim();
    const match = value.match(/\/drive\/folder\/([^/?#]+)/);
    return match?.[1] || value;
}

async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, data) {
    await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function feishuRequest(pathname, options = {}) {
    const response = await fetch(`${FEISHU_API}${pathname}`, options);
    const text = await response.text();
    let json;
    try {
        json = text ? JSON.parse(text) : {};
    } catch {
        json = { raw: text };
    }

    if (!response.ok || (typeof json.code === "number" && json.code !== 0)) {
        const msg = json.msg || json.message || response.statusText;
        throw new Error(`Feishu API failed: ${pathname} (${response.status}) ${msg}`);
    }
    return json;
}

async function getTenantAccessToken(appId, appSecret) {
    const json = await feishuRequest("/auth/v3/tenant_access_token/internal", {
        method: "POST",
        headers: {
            "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
            app_id: appId,
            app_secret: appSecret,
        }),
    });
    if (!json.tenant_access_token) {
        throw new Error("Feishu API did not return tenant_access_token");
    }
    return json.tenant_access_token;
}

async function listFolderFiles(token, folderToken) {
    const files = [];
    let pageToken = "";
    do {
        const params = new URLSearchParams({
            folder_token: folderToken,
            page_size: "50",
        });
        if (pageToken) {
            params.set("page_token", pageToken);
        }

        const json = await feishuRequest(`/drive/v1/files?${params.toString()}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const data = json.data || {};
        files.push(...(data.files || data.items || []));
        pageToken = data.page_token || data.next_page_token || "";
    } while (pageToken);
    return files;
}

async function deleteFile(token, fileToken) {
    await feishuRequest(`/drive/v1/files/${encodeURIComponent(fileToken)}?type=file`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}

async function deleteOldApks(token, folderToken, keepFileName) {
    const files = await listFolderFiles(token, folderToken);
    const apkFiles = files.filter(file => {
        const name = file.name || file.file_name || "";
        const tokenValue = file.token || file.file_token;
        return tokenValue && name.endsWith(".apk") && name !== keepFileName;
    });

    for (const file of apkFiles) {
        const name = file.name || file.file_name;
        const tokenValue = file.token || file.file_token;
        console.log(`Deleting old APK: ${name}`);
        await deleteFile(token, tokenValue);
    }
    return apkFiles.length;
}

async function uploadApk(token, folderToken, apkPath, fileName) {
    const stat = await fs.stat(apkPath);
    if (stat.size > MAX_SIMPLE_UPLOAD_SIZE) {
        throw new Error(
            `APK is ${(stat.size / 1024 / 1024).toFixed(2)}MB; Feishu simple upload only supports files <= 20MB. Use multipart upload or upload the universal APK manually.`,
        );
    }

    const buffer = await fs.readFile(apkPath);
    const form = new FormData();
    form.append("file_name", fileName);
    form.append("parent_type", "explorer");
    form.append("parent_node", folderToken);
    form.append("size", String(stat.size));
    form.append("file", new Blob([buffer]), fileName);

    const json = await feishuRequest("/drive/v1/files/upload_all", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: form,
    });
    return json.data || {};
}

function normalizeChangeLog(rawValue, existing = []) {
    if (!rawValue) {
        return existing;
    }
    return rawValue
        .split(/\n|\\n|\|/)
        .map(item => item.trim())
        .filter(Boolean);
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    await loadEnvFile(path.resolve(args.env || ".env.feishu.local"));

    const appId = requireEnv("FEISHU_APP_ID");
    const appSecret = requireEnv("FEISHU_APP_SECRET");
    const folderToken = getFolderToken(requireEnv("FEISHU_FOLDER"));
    const folderShareUrl = requireEnv("FEISHU_FOLDER_SHARE_URL");
    const apkPath = path.resolve(args.apk || getEnv("APK_PATH", DEFAULT_APK_PATH));
    const versionJsonPath = path.resolve(args.versionJson || getEnv("VERSION_JSON", DEFAULT_VERSION_JSON));
    const packageJson = await readJson(path.resolve("package.json"));
    const version = args.version || getEnv("RELEASE_VERSION", packageJson.version);
    const fileName = args.fileName || getEnv("APK_FILE_NAME", `CatMusicFree-${version}-arm64-v8a-release.apk`);
    const deleteOld = (args.deleteOld || getEnv("FEISHU_DELETE_OLD", "true")).toLowerCase() !== "false";
    const dryRun = args["dry-run"] === "true" || args.dryRun === "true";

    console.log(`Preparing Feishu release: v${version}`);
    console.log(`APK: ${apkPath}`);
    console.log(`Target file name: ${fileName}`);
    if (dryRun) {
        console.log("Dry run enabled: no files will be deleted, uploaded, or written.");
    }

    const token = await getTenantAccessToken(appId, appSecret);

    if (dryRun) {
        const files = await listFolderFiles(token, folderToken);
        const apkFiles = files
            .map(file => file.name || file.file_name || "")
            .filter(name => name.endsWith(".apk"));
        console.log(`Current APK files in Feishu folder: ${apkFiles.length}`);
        for (const name of apkFiles) {
            console.log(`- ${name}`);
        }
        return;
    }

    if (deleteOld) {
        const deleted = await deleteOldApks(token, folderToken, fileName);
        console.log(`Deleted old APK files: ${deleted}`);
    }

    const uploadResult = await uploadApk(token, folderToken, apkPath, fileName);
    console.log(`Uploaded APK token: ${uploadResult.file_token || uploadResult.token || "unknown"}`);

    const versionJson = await readJson(versionJsonPath);
    const fallbackUrls = Array.isArray(versionJson.download)
        ? versionJson.download.filter(url => url && url !== folderShareUrl)
        : [];
    const nextVersionJson = {
        ...versionJson,
        version,
        changeLog: normalizeChangeLog(args.changelog || getEnv("RELEASE_CHANGELOG"), versionJson.changeLog || []),
        download: [
            folderShareUrl,
            ...fallbackUrls,
        ],
    };
    await writeJson(versionJsonPath, nextVersionJson);
    console.log(`Updated ${path.relative(process.cwd(), versionJsonPath)} with Feishu primary download URL.`);
}

main().catch(error => {
    console.error(error?.message || error);
    process.exit(1);
});
