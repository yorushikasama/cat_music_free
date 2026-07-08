import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const FEISHU_API = "https://open.feishu.cn/open-apis";
const MAX_SIMPLE_UPLOAD_SIZE = 20 * 1024 * 1024;
const DEFAULT_APK_PATH = "android/app/build/outputs/apk/release/app-arm64-v8a-release.apk";
const DEFAULT_VERSION_JSON = "release/version.json";
const ADLER_MOD = 65521;
const FEISHU_MAX_RETRIES = 3;
const FEISHU_RETRY_BASE_DELAY_MS = 1000;
const FEISHU_RETRYABLE_CODES = new Set([1061045]);
const FEISHU_SIZE_LIMIT_HELP =
    "Feishu accepted multipart upload only up to the current tenant/version file size limit. " +
    "To upload files above 20MiB, upgrade or verify the Feishu tenant to a version whose " +
    "original-file upload limit is above the APK size, use a user_access_token from a user " +
    "with access to such a tenant/folder, or reduce/host the APK elsewhere.";

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

function formatMB(size) {
    return (size / 1024 / 1024).toFixed(2);
}

function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

function getRetryDelayMs(response, attempt) {
    const retryAfter = response.headers.get("retry-after");
    if (retryAfter) {
        const seconds = Number(retryAfter);
        if (Number.isFinite(seconds) && seconds >= 0) {
            return seconds * 1000;
        }

        const retryAt = Date.parse(retryAfter);
        if (!Number.isNaN(retryAt)) {
            return Math.max(0, retryAt - Date.now());
        }
    }

    return FEISHU_RETRY_BASE_DELAY_MS * (2 ** attempt);
}

function createFeishuError(pathname, response, json) {
    const msg = json.msg || json.message || response.statusText;
    const code = typeof json.code === "number" ? ` code ${json.code}` : "";
    const error = new Error(`Feishu API failed: ${pathname} (${response.status}${code}) ${msg}`);
    error.status = response.status;
    error.feishuCode = json.code;
    error.feishuMessage = msg;
    return error;
}

function shouldRetryFeishuRequest(response, json) {
    if (response.status === 429 || response.status >= 500) {
        return true;
    }
    return FEISHU_RETRYABLE_CODES.has(json.code);
}

async function feishuRequest(pathname, options = {}) {
    const { retries = FEISHU_MAX_RETRIES, ...fetchOptions } = options;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        const response = await fetch(`${FEISHU_API}${pathname}`, fetchOptions);
        const text = await response.text();
        let json;
        try {
            json = text ? JSON.parse(text) : {};
        } catch {
            json = { raw: text };
        }

        if (response.ok && (typeof json.code !== "number" || json.code === 0)) {
            return json;
        }

        if (attempt < retries && shouldRetryFeishuRequest(response, json)) {
            const delayMs = getRetryDelayMs(response, attempt);
            console.warn(`Feishu API can retry: ${pathname}; retrying in ${Math.round(delayMs)}ms.`);
            await sleep(delayMs);
            continue;
        }

        throw createFeishuError(pathname, response, json);
    }

    throw new Error(`Feishu API failed: ${pathname}`);
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

async function getAccessToken(appId, appSecret) {
    const userAccessToken = getEnv("FEISHU_USER_ACCESS_TOKEN");
    if (userAccessToken) {
        console.log("Using FEISHU_USER_ACCESS_TOKEN for Drive upload.");
        return userAccessToken;
    }

    console.log("Using tenant_access_token for Drive upload.");
    return getTenantAccessToken(appId, appSecret);
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

    let deletedCount = 0;
    for (const file of apkFiles) {
        const name = file.name || file.file_name;
        const tokenValue = file.token || file.file_token;
        console.log(`Deleting old APK: ${name}`);
        try {
            await deleteFile(token, tokenValue);
            deletedCount += 1;
        } catch (error) {
            console.warn(`Warning: failed to delete old APK "${name}": ${error?.message || error}`);
        }
    }
    return deletedCount;
}

function getAdler32(buffer) {
    let a = 1;
    let b = 0;
    for (const byte of buffer) {
        a = (a + byte) % ADLER_MOD;
        b = (b + a) % ADLER_MOD;
    }
    return String((((b << 16) | a) >>> 0));
}

async function uploadSmallApk(token, folderToken, apkPath, fileName, stat) {
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

async function prepareMultipartUpload(token, folderToken, fileName, fileSize) {
    let json;
    try {
        json = await feishuRequest("/drive/v1/files/upload_prepare", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json; charset=utf-8",
            },
            body: JSON.stringify({
                file_name: fileName,
                parent_type: "explorer",
                parent_node: folderToken,
                size: fileSize,
            }),
        });
    } catch (error) {
        if (error?.feishuCode === 1061043) {
            throw new Error(
                `Feishu rejected multipart upload_prepare for ${formatMB(fileSize)}MB. ` +
                "The script selected multipart upload because the file is above 20MB, " +
                "but Feishu still applies tenant/version-specific file size limits. " +
                `${FEISHU_SIZE_LIMIT_HELP} ` +
                `Original error: ${error.message}`,
            );
        }
        throw error;
    }

    const data = json.data || {};
    const blockSize = Number(data.block_size);
    const blockNum = Number(data.block_num);
    if (
        !data.upload_id ||
        !Number.isSafeInteger(blockSize) ||
        !Number.isSafeInteger(blockNum) ||
        blockSize <= 0 ||
        blockNum <= 0
    ) {
        throw new Error("Feishu multipart upload_prepare did not return upload_id, block_size, or block_num");
    }
    return {
        uploadId: data.upload_id,
        blockSize,
        blockNum,
    };
}

async function uploadMultipartPart(token, uploadId, seq, chunk) {
    const form = new FormData();
    form.append("upload_id", uploadId);
    form.append("seq", String(seq));
    form.append("size", String(chunk.length));
    form.append("checksum", getAdler32(chunk));
    form.append("file", new Blob([chunk]), `part-${seq}`);

    await feishuRequest("/drive/v1/files/upload_part", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: form,
    });
}

async function finishMultipartUpload(token, uploadId, blockNum) {
    const json = await feishuRequest("/drive/v1/files/upload_finish", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
            upload_id: uploadId,
            block_num: blockNum,
        }),
    });
    return json.data || {};
}

async function uploadMultipartApk(token, folderToken, apkPath, fileName, stat) {
    const { uploadId, blockSize, blockNum } = await prepareMultipartUpload(
        token,
        folderToken,
        fileName,
        stat.size,
    );
    console.log(`Multipart upload prepared: ${blockNum} blocks, ${formatMB(blockSize)}MB each`);

    const fileHandle = await fs.open(apkPath, "r");
    try {
        for (let seq = 0; seq < blockNum; seq += 1) {
            const offset = seq * blockSize;
            const size = Math.min(blockSize, stat.size - offset);
            if (size <= 0) {
                throw new Error(`Feishu multipart upload returned too many blocks: block ${seq + 1}/${blockNum}`);
            }
            const buffer = Buffer.allocUnsafe(size);
            const { bytesRead } = await fileHandle.read(buffer, 0, size, offset);
            if (bytesRead !== size) {
                throw new Error(
                    `Failed to read full multipart block ${seq + 1}/${blockNum}: ` +
                    `expected ${size}, got ${bytesRead}`,
                );
            }
            await uploadMultipartPart(token, uploadId, seq, buffer);
            console.log(`Uploaded multipart block ${seq + 1}/${blockNum}`);
        }
    } finally {
        await fileHandle.close();
    }

    return finishMultipartUpload(token, uploadId, blockNum);
}

async function uploadApk(token, folderToken, apkPath, fileName) {
    const stat = await fs.stat(apkPath);
    if (stat.size <= 0) {
        throw new Error("APK is empty; Feishu does not support uploading empty files.");
    }

    if (stat.size <= MAX_SIMPLE_UPLOAD_SIZE) {
        console.log(`Using Feishu simple upload for ${formatMB(stat.size)}MB APK.`);
        return uploadSmallApk(token, folderToken, apkPath, fileName, stat);
    }

    console.log(`Using Feishu multipart upload for ${formatMB(stat.size)}MB APK.`);
    return uploadMultipartApk(token, folderToken, apkPath, fileName, stat);
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

    const token = await getAccessToken(appId, appSecret);

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

    const uploadResult = await uploadApk(token, folderToken, apkPath, fileName);
    console.log(`Uploaded APK token: ${uploadResult.file_token || uploadResult.token || "unknown"}`);

    if (deleteOld) {
        const deleted = await deleteOldApks(token, folderToken, fileName);
        console.log(`Deleted old APK files: ${deleted}`);
    }

    const versionJson = await readJson(versionJsonPath);
    const fallbackUrls = Array.isArray(versionJson.download)
        ? versionJson.download.filter(url => url && url !== folderShareUrl)
        : [];
    const downloadUrls = fallbackUrls.length > 0
        ? [
            fallbackUrls[0],
            folderShareUrl,
            ...fallbackUrls.slice(1),
        ]
        : [folderShareUrl];
    const nextVersionJson = {
        ...versionJson,
        version,
        changeLog: normalizeChangeLog(args.changelog || getEnv("RELEASE_CHANGELOG"), versionJson.changeLog || []),
        download: downloadUrls,
    };
    await writeJson(versionJsonPath, nextVersionJson);
    console.log(`Updated ${path.relative(process.cwd(), versionJsonPath)} with Feishu browser download URL.`);
}

main().catch(error => {
    console.error(error?.message || error);
    process.exit(1);
});
