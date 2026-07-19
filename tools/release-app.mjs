import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { cleanBundleOutputs, verifyReleaseApk } from "./release/apk.mjs";
import {
    run,
    runCapture,
    runCaptureAllowFailure,
    runCurlJson,
} from "./release/process.mjs";

const VERSION_JSON = "release/version.json";
const BUILD_GRADLE = "android/app/build.gradle";
const RELEASE_STATE = ".release-state.json";
const DEFAULT_APK_PATH = "android/app/build/outputs/apk/release/app-arm64-v8a-release.apk";
const DEFAULT_ASSET_NAME = "app-arm64-v8a-release.apk";
const DEFAULT_PUSH_BRANCH = "main";
const DEFAULT_PUSH_URLS = [
    "https://github.com/yorushikasama/cat_music_free.git",
    "https://gitee.com/qianmeng_a/cat_music_free.git",
    "https://gitea.com/yorushikasama/cat_music_free.git",
];
const DEFAULT_GITHUB_OWNER = "yorushikasama";
const DEFAULT_GITHUB_REPO = "cat_music_free";
const DEFAULT_GITEE_OWNER = "qianmeng_a";
const DEFAULT_GITEE_REPO = "cat_music_free";
const DEFAULT_GITEA_BASE_URL = "https://gitea.com";
const DEFAULT_GITEA_OWNER = "yorushikasama";
const DEFAULT_GITEA_REPO = "cat_music_free";
const FULL_RELEASE_STEPS = ["check", "build", "commit", "push", "release"];
const ALLOWED_UNTRACKED_PATHS = [
    /^(?:src|tools|docs|release|generator)\//,
    /^android\/app\/src\//,
    /^android\/(?:app\/build\.gradle|build\.gradle|gradle\.properties)$/,
    /^(?:package\.json|package-lock\.json|\.gitignore)$/,
];

export function parseArgs(argv) {
    const args = {};
    for (let index = 0; index < argv.length; index += 1) {
        const item = argv[index];
        if (!item.startsWith("--")) {
            continue;
        }
        const [rawKey, rawValue] = item.slice(2).split("=");
        const key = rawKey
            .trim()
            .replace(/-([a-z])/g, (_, character) => character.toUpperCase());
        if (rawValue !== undefined) {
            args[key] = rawValue;
            continue;
        }
        const next = argv[index + 1];
        if (next && !next.startsWith("--")) {
            args[key] = next;
            index += 1;
        } else {
            args[key] = "true";
        }
    }
    return args;
}

async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, data) {
    await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function bumpPatch(version) {
    const parts = version.split(".").map(item => Number.parseInt(item, 10));
    if (parts.length < 3 || parts.some(Number.isNaN)) {
        throw new Error(`Cannot auto-bump non-semver version: ${version}`);
    }
    parts[2] += 1;
    return parts.join(".");
}

export function normalizeChangeLog(rawValue, fallback = []) {
    if (!rawValue) {
        return fallback;
    }
    return rawValue
        .split(/\n|\\n|\|/)
        .map(item => item.trim())
        .filter(Boolean);
}

function parseVersionCode(rawValue, label) {
    if (!/^\d+$/.test(String(rawValue))) {
        throw new Error(`Invalid ${label}: ${rawValue}`);
    }
    const versionCode = Number.parseInt(rawValue, 10);
    if (!Number.isSafeInteger(versionCode)) {
        throw new Error(`Invalid ${label}: ${rawValue}`);
    }
    return versionCode;
}

function getRequestedMode(args) {
    if (args.resume === "true" && args.mode && args.mode !== "resume") {
        throw new Error("Use either --resume or --mode=resume, not both modes.");
    }
    if (args.dryRun === "true" && args.mode) {
        throw new Error("--dry-run cannot be combined with --mode.");
    }
    if (args.resume === "true") {
        return "resume";
    }
    if (args.dryRun === "true") {
        return "dry-run";
    }
    return args.mode || "full";
}

function assertFullReleaseFlags(args) {
    const disabled = FULL_RELEASE_STEPS.filter(step => args[step] === "false");
    if (disabled.length) {
        throw new Error(
            `A public release cannot disable ${disabled.join(", ")}. `
            + "Use --mode=prepare for local-only work, or --resume to recover a failed public release.",
        );
    }
}

export function createReleasePlan(args, currentVersion, currentVersionCode, releaseState = null) {
    const mode = getRequestedMode(args);
    const requestedChangeLog = normalizeChangeLog(args.changelog, []);

    if (!["full", "prepare", "resume", "dry-run"].includes(mode)) {
        throw new Error(`Unknown release mode: ${mode}`);
    }

    if (mode === "full") {
        assertFullReleaseFlags(args);
        if (!requestedChangeLog.length) {
            throw new Error("A new public release requires --changelog with at least one item.");
        }
        return {
            mode,
            version: args.version || bumpPatch(currentVersion),
            versionCode: args.versionCode
                ? parseVersionCode(args.versionCode, "versionCode")
                : currentVersionCode + 1,
            changeLog: requestedChangeLog,
            shouldCheck: true,
            shouldBuild: true,
            shouldCommit: true,
            shouldPush: true,
            shouldRelease: true,
        };
    }

    if (mode === "prepare") {
        const unexpected = ["commit", "push", "release"].filter(step => args[step] === "true");
        if (unexpected.length) {
            throw new Error(`--mode=prepare cannot enable ${unexpected.join(", ")}.`);
        }
        return {
            mode,
            version: args.version || bumpPatch(currentVersion),
            versionCode: args.versionCode
                ? parseVersionCode(args.versionCode, "versionCode")
                : currentVersionCode + 1,
            changeLog: requestedChangeLog,
            shouldCheck: args.check !== "false",
            shouldBuild: args.build !== "false",
            shouldCommit: false,
            shouldPush: false,
            shouldRelease: false,
        };
    }

    if (mode === "resume") {
        const version = args.version || releaseState?.version || currentVersion;
        const versionCode = args.versionCode
            ? parseVersionCode(args.versionCode, "versionCode")
            : releaseState?.versionCode || currentVersionCode;
        return {
            mode,
            version,
            versionCode,
            changeLog: requestedChangeLog,
            shouldCheck: args.check === "true",
            shouldBuild: args.build === "true",
            shouldCommit: true,
            shouldPush: true,
            shouldRelease: true,
        };
    }

    return {
        mode,
        version: args.version || bumpPatch(currentVersion),
        versionCode: args.versionCode
            ? parseVersionCode(args.versionCode, "versionCode")
            : currentVersionCode + 1,
        changeLog: requestedChangeLog,
        requiresChangeLog: !requestedChangeLog.length,
        shouldCheck: true,
        shouldBuild: true,
        shouldCommit: true,
        shouldPush: true,
        shouldRelease: true,
    };
}

export function parsePushUrls(rawValue, fallback = DEFAULT_PUSH_URLS) {
    const values = rawValue
        ? String(rawValue).split(",")
        : fallback;
    const urls = values
        .map(value => value.trim())
        .filter(Boolean);
    if (!urls.length) {
        throw new Error("At least one RELEASE_GIT_PUSH_URLS entry is required.");
    }
    const uniqueUrls = [...new Set(urls)];
    for (const url of uniqueUrls) {
        try {
            const parsed = new URL(url);
            if (!/^https?:$/.test(parsed.protocol)) {
                throw new Error("unsupported protocol");
            }
        } catch {
            throw new Error(`Invalid release push URL: ${url}`);
        }
    }
    return uniqueUrls;
}

function getPushUrls(args) {
    return parsePushUrls(args.pushUrls || getEnv("RELEASE_GIT_PUSH_URLS"));
}

function getPushTargetName(url) {
    try {
        const host = new URL(url).hostname.toLowerCase();
        if (host === "github.com") {
            return "GitHub";
        }
        if (host === "gitee.com") {
            return "Gitee";
        }
        if (host === "gitea.com") {
            return "Gitea";
        }
        return host;
    } catch {
        return url;
    }
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
                (value.startsWith('"') && value.endsWith('"'))
                || (value.startsWith("'") && value.endsWith("'"))
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

function getReleaseBody(version, changeLog) {
    return [
        `CatMusicFree ${version} release.`,
        "",
        ...changeLog.map(item => `- ${item}`),
    ].join("\n").trim();
}

export function getReleaseDownloadUrls(version, assetName) {
    const githubOwner = getEnv("GITHUB_OWNER", DEFAULT_GITHUB_OWNER);
    const githubRepo = getEnv("GITHUB_REPO", DEFAULT_GITHUB_REPO);
    const giteeOwner = getEnv("GITEE_OWNER", DEFAULT_GITEE_OWNER);
    const giteeRepo = getEnv("GITEE_REPO", DEFAULT_GITEE_REPO);
    const giteaBaseUrl = getEnv("GITEA_BASE_URL", DEFAULT_GITEA_BASE_URL).replace(/\/$/, "");
    const giteaOwner = getEnv("GITEA_OWNER", DEFAULT_GITEA_OWNER);
    const giteaRepo = getEnv("GITEA_REPO", DEFAULT_GITEA_REPO);
    const encodedAssetName = encodeURIComponent(assetName);
    return [
        `https://gitee.com/${giteeOwner}/${giteeRepo}/releases/download/v${version}/${encodedAssetName}`,
        `https://github.com/${githubOwner}/${githubRepo}/releases/download/v${version}/${encodedAssetName}`,
        `${giteaBaseUrl}/${giteaOwner}/${giteaRepo}/releases/download/v${version}/${encodedAssetName}`,
    ];
}

async function getGitCredentialToken(host) {
    const input = `protocol=https\nhost=${host}\n\n`;
    const output = await new Promise(resolve => {
        const child = spawn("git", ["credential", "fill"], {
            cwd: process.cwd(),
            shell: false,
            stdio: ["pipe", "pipe", "ignore"],
        });
        let stdout = "";
        child.stdout.on("data", chunk => {
            stdout += chunk.toString();
        });
        child.on("exit", code => {
            resolve(code === 0 ? stdout : "");
        });
        child.stdin.end(input);
    });
    const passwordLine = output
        .split(/\r?\n/)
        .find(line => line.startsWith("password="));
    return passwordLine?.slice("password=".length) || "";
}

async function getGithubToken() {
    return getEnv("GITHUB_TOKEN") || getEnv("GH_TOKEN") || await getGitCredentialToken("github.com");
}

async function getGiteeToken() {
    return getEnv("GITEE_TOKEN") || getEnv("GITEE_ACCESS_TOKEN") || await getGitCredentialToken("gitee.com");
}

async function getGiteaToken(baseUrl) {
    try {
        const host = new URL(baseUrl).host;
        return getEnv("GITEA_TOKEN") || await getGitCredentialToken(host);
    } catch {
        return getEnv("GITEA_TOKEN");
    }
}

async function validateReleaseCredentials() {
    const giteaBaseUrl = getEnv("GITEA_BASE_URL", DEFAULT_GITEA_BASE_URL).replace(/\/$/, "");
    const credentials = await Promise.all([
        getGiteeToken(),
        getGithubToken(),
        getGiteaToken(giteaBaseUrl),
    ]);
    const names = ["Gitee", "GitHub", "Gitea"];
    const missing = names.filter((_, index) => !credentials[index]);
    if (missing.length) {
        throw new Error(`Missing release credentials: ${missing.join(", ")}`);
    }
    console.log("Validated release credentials for Gitee, GitHub, and Gitea.");
}

async function requestJson(url, options = {}) {
    const method = String(options.method || "GET").toUpperCase();
    const canRetry = method === "GET" || method === "HEAD";
    const retries = canRetry ? options.retries ?? 2 : 0;
    const requestOptions = { ...options };
    delete requestOptions.retries;
    let response;
    let text = "";
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            response = await fetch(url, requestOptions);
            text = await response.text();
            const retryableStatus = response.status === 429 || response.status >= 500;
            if (response.ok || !retryableStatus || attempt === retries) {
                break;
            }
        } catch (error) {
            if (attempt === retries) {
                throw error;
            }
        }
        await delay(1000 * (attempt + 1));
    }
    let json;
    try {
        json = text ? JSON.parse(text) : {};
    } catch {
        json = { raw: text };
    }
    if (!response?.ok) {
        const message = json.message || json.msg || response?.statusText || "Request failed";
        throw new Error(`${response?.status || "network"} ${message}`);
    }
    return json;
}

export async function verifyDownloadUrl(url, options = {}) {
    const fetchImpl = options.fetchImpl || fetch;
    const retries = options.retries ?? 4;
    const wait = options.delay || delay;
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        for (const method of ["HEAD", "GET"]) {
            try {
                const response = await fetchImpl(url, {
                    method,
                    redirect: "follow",
                    ...(method === "GET" ? { headers: { Range: "bytes=0-0" } } : {}),
                });
                if (response.ok) {
                    await response.body?.cancel?.();
                    return;
                }
                lastError = new Error(`${method} ${response.status} ${response.statusText}`);
                await response.body?.cancel?.();
            } catch (error) {
                lastError = error;
            }
        }
        if (attempt < retries) {
            await wait(1000 * (attempt + 1));
        }
    }
    throw new Error(`Download URL is not available: ${url} (${lastError?.message || lastError})`);
}

async function getFileSha256(filePath) {
    return crypto
        .createHash("sha256")
        .update(await fs.readFile(filePath))
        .digest("hex");
}

async function getRemoteFileSha256(url) {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            const response = await fetch(url, { redirect: "follow" });
            if (!response.ok) {
                throw new Error(`Cannot download release asset: ${response.status} ${response.statusText}`);
            }
            return crypto
                .createHash("sha256")
                .update(Buffer.from(await response.arrayBuffer()))
                .digest("hex");
        } catch (error) {
            lastError = error;
            if (attempt < 2) {
                await delay(1000 * (attempt + 1));
            }
        }
    }
    throw lastError;
}

async function isCurrentReleaseAsset(asset, expectedSha256) {
    if (!asset?.browser_download_url) {
        return false;
    }
    return (await getRemoteFileSha256(asset.browser_download_url)) === expectedSha256;
}

function delay(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

async function retryOperation(label, operation, retries = 2) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (attempt < retries) {
                console.warn(`${label} failed (attempt ${attempt + 1}/${retries + 1}): ${error?.message || error}`);
                await delay(1000 * (attempt + 1));
            }
        }
    }
    throw new Error(`${label} failed after ${retries + 1} attempts: ${lastError?.message || lastError}`);
}

async function ensureGithubRelease({ version, tagName, body }) {
    const token = await getGithubToken();
    if (!token) {
        throw new Error("Missing GitHub release credential.");
    }
    const owner = getEnv("GITHUB_OWNER", DEFAULT_GITHUB_OWNER);
    const repo = getEnv("GITHUB_REPO", DEFAULT_GITHUB_REPO);
    const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "CatMusicFree-release",
    };
    const api = `https://api.github.com/repos/${owner}/${repo}`;
    try {
        return await requestJson(`${api}/releases/tags/${tagName}`, { headers });
    } catch (error) {
        if (!String(error.message).startsWith("404 ")) {
            throw error;
        }
    }
    return requestJson(`${api}/releases`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
            tag_name: tagName,
            name: `CatMusicFree ${version}`,
            body,
            draft: false,
            prerelease: false,
        }),
    });
}

async function uploadGithubAsset(release, apkPath, assetName, expectedSha256) {
    const token = await getGithubToken();
    if (!token) {
        throw new Error("Missing GitHub release credential.");
    }
    if (!release) {
        throw new Error("GitHub release was not created.");
    }
    const owner = getEnv("GITHUB_OWNER", DEFAULT_GITHUB_OWNER);
    const repo = getEnv("GITHUB_REPO", DEFAULT_GITHUB_REPO);
    const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "CatMusicFree-release",
    };
    const api = `https://api.github.com/repos/${owner}/${repo}`;
    const assets = await requestJson(`${api}/releases/${release.id}/assets?per_page=100`, { headers });
    const existing = assets.find(asset => asset.name === assetName);
    if (existing) {
        if (await isCurrentReleaseAsset(existing, expectedSha256)) {
            console.log(`Reuse matching GitHub Release asset: ${existing.browser_download_url}`);
            return existing.browser_download_url;
        }
        await requestJson(`${api}/releases/assets/${existing.id}`, {
            method: "DELETE",
            headers,
        });
        console.log(`Deleted outdated GitHub Release asset: ${existing.name}`);
    }
    const uploadUrl = `https://uploads.github.com/repos/${owner}/${repo}/releases/${release.id}/assets?name=${encodeURIComponent(assetName)}`;
    const asset = await runCurlJson(
        ["-X", "POST", "--data-binary", `@${apkPath}`, uploadUrl],
        [
            `Authorization: Bearer ${token}`,
            "Accept: application/vnd.github+json",
            "X-GitHub-Api-Version: 2022-11-28",
            "User-Agent: CatMusicFree-release",
            "Content-Type: application/vnd.android.package-archive",
        ],
    );
    console.log(`Uploaded GitHub Release asset: ${asset.browser_download_url}`);
    return asset.browser_download_url;
}

async function ensureGiteeRelease({ version, tagName, body }) {
    const token = await getGiteeToken();
    if (!token) {
        throw new Error("Missing Gitee release credential.");
    }
    const owner = getEnv("GITEE_OWNER", DEFAULT_GITEE_OWNER);
    const repo = getEnv("GITEE_REPO", DEFAULT_GITEE_REPO);
    const api = `https://gitee.com/api/v5/repos/${owner}/${repo}`;
    const tokenParam = `access_token=${encodeURIComponent(token)}`;
    try {
        return await requestJson(`${api}/releases/tags/${tagName}?${tokenParam}`);
    } catch (error) {
        if (!String(error.message).startsWith("404 ")) {
            throw error;
        }
    }
    const params = new URLSearchParams({
        access_token: token,
        tag_name: tagName,
        name: `CatMusicFree ${version}`,
        body,
        target_commitish: "main",
        prerelease: "false",
    });
    return requestJson(`${api}/releases`, { method: "POST", body: params });
}

async function uploadGiteeAsset(release, apkPath, assetName, expectedSha256, downloadUrl, context) {
    const token = await getGiteeToken();
    if (!token) {
        throw new Error("Missing Gitee release credential.");
    }
    if (!release) {
        throw new Error("Gitee release was not created.");
    }
    const owner = getEnv("GITEE_OWNER", DEFAULT_GITEE_OWNER);
    const repo = getEnv("GITEE_REPO", DEFAULT_GITEE_REPO);
    const existing = release.assets?.find(asset => asset.name === assetName);
    if (existing?.browser_download_url) {
        if (await isCurrentReleaseAsset({ browser_download_url: downloadUrl }, expectedSha256)) {
            console.log(`Reuse matching Gitee Release asset: ${existing.browser_download_url}`);
            return existing.browser_download_url;
        }
        await requestJson(
            `https://gitee.com/api/v5/repos/${owner}/${repo}/releases/${release.id}?access_token=${encodeURIComponent(token)}`,
            { method: "DELETE" },
        );
        console.log(`Deleted Gitee Release so its outdated asset can be replaced: ${existing.name}`);
        release = await ensureGiteeRelease({
            version: context.version,
            tagName: context.tagName,
            body: context.body,
        });
    }
    const file = await fs.readFile(apkPath);
    const form = new FormData();
    form.append("file", new Blob([file]), assetName);
    const asset = await requestJson(
        `https://gitee.com/api/v5/repos/${owner}/${repo}/releases/${release.id}/attach_files?access_token=${encodeURIComponent(token)}`,
        { method: "POST", body: form },
    );
    console.log(`Uploaded Gitee Release asset: ${asset.browser_download_url}`);
    return asset.browser_download_url;
}

async function ensureGiteaRelease({ version, tagName, body }) {
    const baseUrl = getEnv("GITEA_BASE_URL", DEFAULT_GITEA_BASE_URL).replace(/\/$/, "");
    const token = await getGiteaToken(baseUrl);
    if (!token) {
        throw new Error("Missing Gitea release credential.");
    }
    const owner = getEnv("GITEA_OWNER", DEFAULT_GITEA_OWNER);
    const repo = getEnv("GITEA_REPO", DEFAULT_GITEA_REPO);
    const headers = { Authorization: `token ${token}`, Accept: "application/json" };
    const api = `${baseUrl}/api/v1/repos/${owner}/${repo}`;
    try {
        return await requestJson(`${api}/releases/tags/${tagName}`, { headers });
    } catch (error) {
        if (!String(error.message).startsWith("404 ")) {
            throw error;
        }
    }
    return requestJson(`${api}/releases`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
            tag_name: tagName,
            target_commitish: "main",
            name: `CatMusicFree ${version}`,
            body,
            draft: false,
            prerelease: false,
        }),
    });
}

async function uploadGiteaAsset(release, apkPath, assetName, expectedSha256) {
    const baseUrl = getEnv("GITEA_BASE_URL", DEFAULT_GITEA_BASE_URL).replace(/\/$/, "");
    const token = await getGiteaToken(baseUrl);
    if (!token) {
        throw new Error("Missing Gitea release credential.");
    }
    if (!release) {
        throw new Error("Gitea release was not created.");
    }
    const owner = getEnv("GITEA_OWNER", DEFAULT_GITEA_OWNER);
    const repo = getEnv("GITEA_REPO", DEFAULT_GITEA_REPO);
    const headers = { Authorization: `token ${token}`, Accept: "application/json" };
    const api = `${baseUrl}/api/v1/repos/${owner}/${repo}`;
    const assets = await requestJson(`${api}/releases/${release.id}/assets`, { headers });
    const existing = assets.find(asset => asset.name === assetName);
    if (existing) {
        if (await isCurrentReleaseAsset(existing, expectedSha256)) {
            console.log(`Reuse matching Gitea Release asset: ${existing.browser_download_url}`);
            return existing.browser_download_url;
        }
        await requestJson(`${api}/releases/${release.id}/assets/${existing.id}`, {
            method: "DELETE",
            headers,
        });
        console.log(`Deleted outdated Gitea Release asset: ${existing.name}`);
    }
    const uploadUrl = `${api}/releases/${release.id}/assets?name=${encodeURIComponent(assetName)}`;
    const asset = await runCurlJson(
        ["-X", "POST", "-F", `attachment=@${apkPath};filename=${assetName}`, uploadUrl],
        [`Authorization: token ${token}`, "Accept: application/json"],
    );
    console.log(`Uploaded Gitea Release asset: ${asset.browser_download_url}`);
    return asset.browser_download_url;
}

async function ensureGitTag(tagName, version) {
    const tagCommit = await resolveGitRevision(`${tagName}^{commit}`);
    if (!tagCommit) {
        await run("git", ["tag", "-a", tagName, "-m", `CatMusicFree ${version}`], { shell: false });
        return;
    }
    const isAncestor = await runCaptureAllowFailure("git", [
        "merge-base",
        "--is-ancestor",
        `${tagName}^{commit}`,
        "HEAD",
    ]);
    if (isAncestor.code !== 0) {
        throw new Error(`Tag ${tagName} does not point to the current release history.`);
    }
}

async function resolveGitRevision(revision) {
    try {
        return (await runCapture("git", ["rev-parse", "--verify", revision])).trim();
    } catch {
        return "";
    }
}

async function pushRefToAllTargets(refspec, pushUrls) {
    const results = [];
    for (const url of pushUrls) {
        const name = getPushTargetName(url);
        try {
            await retryOperation(`${name} git push`, () => run("git", ["push", url, refspec], { shell: false }));
            results.push({ name, ok: true });
        } catch (error) {
            results.push({ name, ok: false, error: error?.message || String(error) });
        }
    }
    console.log(`\nGit push summary for ${refspec}:`);
    results.forEach(result => {
        console.log(`- ${result.name}: ${result.ok ? "ok" : `failed (${result.error})`}`);
    });
    const failed = results.filter(result => !result.ok);
    if (failed.length) {
        throw new Error(`Git push failed: ${failed.map(result => result.name).join(", ")}. Run --resume after connectivity is restored.`);
    }
}

async function commitRelease(version) {
    const untracked = await getUntrackedFiles();
    const unknown = untracked.filter(file => !ALLOWED_UNTRACKED_PATHS.some(pattern => pattern.test(file)));
    if (unknown.length) {
        throw new Error(`Unknown untracked files block the release:\n${unknown.map(file => `- ${file}`).join("\n")}`);
    }
    await run("git", ["add", "-u"]);
    if (untracked.length) {
        await run("git", ["add", "--", ...untracked], { shell: false });
    }
    const staged = await runCaptureAllowFailure("git", ["diff", "--cached", "--quiet"]);
    if (staged.code === 0) {
        const currentVersion = (await readJson(path.resolve("package.json"))).version;
        if (currentVersion !== version) {
            throw new Error(`Nothing to commit and current version is ${currentVersion}, expected ${version}.`);
        }
        console.log(`No release changes to commit for ${version}; reusing HEAD.`);
        return;
    }
    if (staged.code !== 1) {
        throw new Error(staged.stderr || "Cannot inspect staged release changes.");
    }
    await run("git", ["commit", "-m", `chore: release ${version}`], { shell: false });
}

async function commitReleaseMetadata(version) {
    await run("git", ["add", "--", VERSION_JSON], { shell: false });
    const stagedNames = (await runCapture("git", ["diff", "--cached", "--name-only"]))
        .split(/\r?\n/)
        .filter(Boolean);
    if (!stagedNames.length) {
        console.log("Release metadata already matches the published assets.");
        return;
    }
    if (stagedNames.some(file => file !== VERSION_JSON)) {
        throw new Error(`Only ${VERSION_JSON} may be staged while publishing metadata.`);
    }
    await run("git", ["commit", "-m", `chore: publish release metadata ${version}`], { shell: false });
}

async function getUntrackedFiles() {
    const output = await runCapture("git", ["ls-files", "--others", "--exclude-standard"]);
    return output.split(/\r?\n/).map(file => file.trim()).filter(Boolean);
}

async function publishReleaseAssets(version, changeLog, apkPath, assetName) {
    const tagName = `v${version}`;
    const body = getReleaseBody(version, changeLog);
    const downloadUrls = getReleaseDownloadUrls(version, assetName);
    const expectedSha256 = await getFileSha256(apkPath);
    const targets = [
        { name: "Gitee", ensure: ensureGiteeRelease, upload: uploadGiteeAsset, downloadUrl: downloadUrls[0] },
        { name: "GitHub", ensure: ensureGithubRelease, upload: uploadGithubAsset, downloadUrl: downloadUrls[1] },
        { name: "Gitea", ensure: ensureGiteaRelease, upload: uploadGiteaAsset, downloadUrl: downloadUrls[2] },
    ];
    const results = [];
    for (const target of targets) {
        results.push(await publishReleaseTarget(target, {
            version,
            tagName,
            body,
            apkPath,
            assetName,
            expectedSha256,
            downloadUrl: target.downloadUrl,
        }));
    }
    console.log("\nRelease asset summary:");
    results.forEach(result => {
        console.log(`- ${result.name}: ${result.ok ? `ok ${result.url}` : `failed (${result.error})`}`);
    });
    const failed = results.filter(result => !result.ok);
    if (failed.length) {
        throw new Error(`Release asset upload failed: ${failed.map(result => result.name).join(", ")}. Run --resume after connectivity is restored.`);
    }
}

async function publishReleaseTarget(target, context) {
    try {
        const url = await retryOperation(`${target.name} release publication`, async () => {
            const release = await target.ensure({
                version: context.version,
                tagName: context.tagName,
                body: context.body,
            });
            const assetUrl = await target.upload(
                release,
                context.apkPath,
                context.assetName,
                context.expectedSha256,
                context.downloadUrl,
                context,
            );
            if (!assetUrl) {
                throw new Error(`${target.name} asset upload returned no download URL.`);
            }
            await verifyDownloadUrl(context.downloadUrl);
            return context.downloadUrl;
        });
        return { name: target.name, ok: true, url };
    } catch (error) {
        return { name: target.name, ok: false, error: error?.message || String(error) };
    }
}

async function updatePackageVersion(version) {
    const packageJsonPath = path.resolve("package.json");
    const packageJson = await readJson(packageJsonPath);
    packageJson.version = version;
    await writeJson(packageJsonPath, packageJson);
}

async function updateAndroidVersion(version, versionCode) {
    const gradlePath = path.resolve(BUILD_GRADLE);
    let content = await fs.readFile(gradlePath, "utf8");
    content = content
        .replace(/def appVersion = ".*?"/, `def appVersion = "${version}"`)
        .replace(/def appVersionCode = \d+/, `def appVersionCode = ${versionCode}`);
    await fs.writeFile(gradlePath, content, "utf8");
}

async function updateVersionJson(version, changeLog, downloadUrls) {
    const versionJsonPath = path.resolve(VERSION_JSON);
    const versionJson = await readJson(versionJsonPath);
    await writeJson(versionJsonPath, {
        ...versionJson,
        version,
        changeLog,
        download: downloadUrls,
    });
}

async function getCurrentVersionCode() {
    const content = await fs.readFile(path.resolve(BUILD_GRADLE), "utf8");
    const match = content.match(/def appVersionCode = (\d+)/);
    if (!match) {
        throw new Error(`Cannot find appVersionCode in ${BUILD_GRADLE}`);
    }
    return Number.parseInt(match[1], 10);
}

async function assertVersionManifestClean() {
    const checks = await Promise.all([
        runCaptureAllowFailure("git", ["diff", "--quiet", "--", VERSION_JSON]),
        runCaptureAllowFailure("git", ["diff", "--cached", "--quiet", "--", VERSION_JSON]),
    ]);
    if (checks.some(result => result.code === 1)) {
        throw new Error(`${VERSION_JSON} has local changes. Commit or stash them before starting a release.`);
    }
    if (checks.some(result => result.code > 1)) {
        throw new Error(`Cannot inspect ${VERSION_JSON} git status.`);
    }
}

async function readReleaseState() {
    try {
        return await readJson(path.resolve(RELEASE_STATE));
    } catch (error) {
        if (error?.code === "ENOENT") {
            return null;
        }
        throw new Error(`Cannot read ${RELEASE_STATE}: ${error?.message || error}`);
    }
}

async function writeReleaseState(context, phase) {
    await writeJson(path.resolve(RELEASE_STATE), {
        version: context.version,
        versionCode: context.versionCode,
        changeLog: context.changeLog,
        assetName: context.assetName,
        apkPath: path.relative(process.cwd(), context.apkPath),
        phase,
        updatedAt: new Date().toISOString(),
    });
}

async function clearReleaseState() {
    try {
        await fs.unlink(path.resolve(RELEASE_STATE));
    } catch (error) {
        if (error?.code !== "ENOENT") {
            throw error;
        }
    }
}

async function runReleaseChecks() {
    await run(process.execPath, [path.resolve("node_modules/typescript/bin/tsc"), "--noEmit"], { shell: false });
    await run(process.execPath, [
        path.resolve("node_modules/eslint/bin/eslint.js"),
        ".",
        "--ext", ".js,.jsx,.ts,.tsx",
        "src",
        "--max-warnings=0",
    ], { shell: false });
    await run(process.platform === "win32" ? "npm.cmd" : "npm", ["test"]);
    await run("git", ["diff", "--check"]);
}

async function buildReleaseApk(shouldClean) {
    await cleanBundleOutputs();
    if (shouldClean) {
        await run(path.join(".", "android", "gradlew.bat"), ["-p", "android", "clean"], {
            env: { ...process.env, NODE_ENV: "production" },
        });
    }
    await run(path.join(".", "android", "gradlew.bat"), [
        "-p", "android",
        "assembleRelease",
        "-PreactNativeArchitectures=arm64-v8a",
        "-PreleaseArchitectures=arm64-v8a",
        "-PuniversalApk=false",
    ], { env: { ...process.env, NODE_ENV: "production" } });
}

function printPlan(plan) {
    console.log(`Release plan: ${plan.mode}`);
    console.log(`- version: ${plan.version} (${plan.versionCode})`);
    console.log(`- checks/build/commit/push/release: ${[
        plan.shouldCheck,
        plan.shouldBuild,
        plan.shouldCommit,
        plan.shouldPush,
        plan.shouldRelease,
    ].map(Boolean).join("/")}`);
    if (plan.requiresChangeLog) {
        console.log("- changelog: required for a real public release");
    }
}

function resolveAssetContext(args, plan, state) {
    const stateApkPath = state?.apkPath ? path.resolve(state.apkPath) : "";
    return {
        ...plan,
        changeLog: plan.changeLog,
        apkPath: path.resolve(args.apk || stateApkPath || getEnv("APK_PATH", DEFAULT_APK_PATH)),
        assetName: args.assetName || state?.assetName || getEnv("APK_ASSET_NAME", DEFAULT_ASSET_NAME),
        pushBranch: args.pushBranch || getEnv("RELEASE_PUSH_BRANCH", DEFAULT_PUSH_BRANCH),
        pushUrls: getPushUrls(args),
    };
}

async function getResumeContext(args, plan, state) {
    const packageJson = await readJson(path.resolve("package.json"));
    const currentVersionCode = await getCurrentVersionCode();
    if (packageJson.version !== plan.version || currentVersionCode !== plan.versionCode) {
        throw new Error(
            `Cannot resume ${plan.version} (${plan.versionCode}): current app version is ${packageJson.version} (${currentVersionCode}).`,
        );
    }
    const versionJson = await readJson(path.resolve(VERSION_JSON));
    const changeLog = plan.changeLog.length
        ? plan.changeLog
        : state?.changeLog?.length
            ? state.changeLog
            : versionJson.version === plan.version
                ? normalizeChangeLog(null, versionJson.changeLog || [])
                : [];
    if (!changeLog.length) {
        throw new Error("Resume needs --changelog because no saved release state or matching version manifest was found.");
    }
    return resolveAssetContext(args, { ...plan, changeLog }, state);
}

async function publishAndFinalize(context) {
    const tagName = `v${context.version}`;
    await ensureGitTag(tagName, context.version);
    await pushRefToAllTargets(`HEAD:${context.pushBranch}`, context.pushUrls);
    await writeReleaseState(context, "branch-pushed");
    await pushRefToAllTargets(`refs/tags/${tagName}`, context.pushUrls);
    await writeReleaseState(context, "tag-pushed");
    await publishReleaseAssets(context.version, context.changeLog, context.apkPath, context.assetName);
    await writeReleaseState(context, "assets-published");
    await updateVersionJson(
        context.version,
        context.changeLog,
        getReleaseDownloadUrls(context.version, context.assetName),
    );
    await commitReleaseMetadata(context.version);
    await writeReleaseState(context, "metadata-committed");
    await pushRefToAllTargets(`HEAD:${context.pushBranch}`, context.pushUrls);
    await clearReleaseState();
}

async function runFullRelease(args, plan, state) {
    if (state) {
        throw new Error(`Found unfinished ${RELEASE_STATE} for ${state.version}. Run npm run release:resume to continue it.`);
    }
    await assertVersionManifestClean();
    const context = resolveAssetContext(args, plan, null);
    await validateReleaseCredentials();
    await updatePackageVersion(context.version);
    await updateAndroidVersion(context.version, context.versionCode);
    await writeReleaseState(context, "prepared");
    await runReleaseChecks();
    await writeReleaseState(context, "checked");
    await buildReleaseApk(args.clean === "true");
    await verifyReleaseApk(context.apkPath, context.version, context.versionCode);
    await writeReleaseState(context, "built");
    await commitRelease(context.version);
    await writeReleaseState(context, "committed");
    await publishAndFinalize(context);
}

async function runPrepare(args, plan) {
    const context = resolveAssetContext(args, plan, null);
    await updatePackageVersion(context.version);
    await updateAndroidVersion(context.version, context.versionCode);
    if (context.shouldCheck) {
        await runReleaseChecks();
    }
    if (context.shouldBuild) {
        await buildReleaseApk(args.clean === "true");
        await verifyReleaseApk(context.apkPath, context.version, context.versionCode);
    }
    console.log("Local release preparation completed. No commit, push, Release, or download manifest was created.");
}

async function runResume(args, plan, state) {
    const context = await getResumeContext(args, plan, state);
    await validateReleaseCredentials();
    const phase = state?.phase || "resuming";
    const shouldCheck = context.shouldCheck || phase === "prepared";
    const shouldBuild = context.shouldBuild || ["prepared", "checked"].includes(phase);
    if (shouldCheck) {
        await runReleaseChecks();
        await writeReleaseState(context, "checked");
    }
    if (shouldBuild) {
        await buildReleaseApk(args.clean === "true");
        await writeReleaseState(context, "built");
    }
    await verifyReleaseApk(context.apkPath, context.version, context.versionCode);
    await writeReleaseState(context, shouldBuild ? "built" : phase);
    await commitRelease(context.version);
    await writeReleaseState(context, "committed");
    await publishAndFinalize(context);
}

export async function main() {
    const args = parseArgs(process.argv.slice(2));
    await loadEnvFile(path.resolve(args.giteaEnv || ".env.gitea.local"));
    const packageJson = await readJson(path.resolve("package.json"));
    const currentVersionCode = await getCurrentVersionCode();
    const state = await readReleaseState();
    const plan = createReleasePlan(args, packageJson.version, currentVersionCode, state);
    printPlan(plan);

    if (plan.mode === "dry-run") {
        return;
    }
    if (plan.mode === "prepare") {
        await runPrepare(args, plan);
        return;
    }
    if (plan.mode === "resume") {
        await runResume(args, plan, state);
        return;
    }
    await runFullRelease(args, plan, state);
    console.log(`\nRelease ${plan.version} workflow completed.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch(error => {
        console.error(error?.message || error);
        process.exit(1);
    });
}
