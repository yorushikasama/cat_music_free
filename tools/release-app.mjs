import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { cleanBundleOutputs, verifyApkVersion } from "./release/apk.mjs";
import {
    run,
    runCapture,
    runCaptureAllowFailure,
    runCurlJson,
} from "./release/process.mjs";

const VERSION_JSON = "release/version.json";
const BUILD_GRADLE = "android/app/build.gradle";
const DEFAULT_APK_PATH = "android/app/build/outputs/apk/release/app-arm64-v8a-release.apk";
const DEFAULT_ASSET_NAME = "app-arm64-v8a-release.apk";
const DEFAULT_PUSH_REMOTE = "cat-music-free";
const DEFAULT_PUSH_BRANCH = "main";
const DEFAULT_GITHUB_OWNER = "yorushikasama";
const DEFAULT_GITHUB_REPO = "cat_music_free";
const DEFAULT_GITEE_OWNER = "qianmeng_a";
const DEFAULT_GITEE_REPO = "cat_music_free";
const DEFAULT_GITEA_BASE_URL = "https://gitea.com";
const DEFAULT_GITEA_OWNER = "yorushikasama";
const DEFAULT_GITEA_REPO = "cat_music_free";

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

function bumpPatch(version) {
    const parts = version.split(".").map(item => Number.parseInt(item, 10));
    if (parts.length < 3 || parts.some(Number.isNaN)) {
        throw new Error(`Cannot auto-bump non-semver version: ${version}`);
    }
    parts[2] += 1;
    return parts.join(".");
}

function normalizeChangeLog(rawValue, fallback) {
    if (!rawValue) {
        return fallback;
    }
    return rawValue
        .split(/\n|\\n|\|/)
        .map(item => item.trim())
        .filter(Boolean);
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

function getReleaseBody(version, changeLog) {
    const lines = changeLog?.length ? changeLog : [];
    return [
        `CatMusicFree ${version} release.`,
        "",
        ...lines.map(item => `- ${item}`),
    ].join("\n").trim();
}

function getReleaseDownloadUrls(version, assetName) {
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
    if (!response.ok) {
        const message = json.message || json.msg || response.statusText;
        throw new Error(`${response.status} ${message}`);
    }
    return json;
}

async function verifyDownloadUrl(url) {
    let lastError;
    for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
            const response = await fetch(url, {
                method: "HEAD",
                redirect: "follow",
            });
            if (response.ok) {
                return;
            }
            lastError = new Error(`${response.status} ${response.statusText}`);
        } catch (error) {
            lastError = error;
        }
        await delay(1000 * (attempt + 1));
    }
    throw new Error(`Download URL is not available: ${url} (${lastError?.message || lastError})`);
}

function delay(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
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

async function uploadGithubAsset(release, apkPath, assetName) {
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
        console.log(`Reuse existing GitHub Release asset: ${existing.browser_download_url}`);
        return existing.browser_download_url;
    }
    const uploadUrl = `https://uploads.github.com/repos/${owner}/${repo}/releases/${release.id}/assets?name=${encodeURIComponent(assetName)}`;
    const asset = await runCurlJson(
        [
            "-X", "POST",
            "--data-binary", `@${apkPath}`,
            uploadUrl,
        ],
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
        const existing = await requestJson(`${api}/releases/tags/${tagName}?${tokenParam}`);
        if (existing) {
            return existing;
        }
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
    return requestJson(`${api}/releases`, {
        method: "POST",
        body: params,
    });
}

async function uploadGiteeAsset(release, apkPath, assetName) {
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
        console.log(`Reuse existing Gitee Release asset: ${existing.browser_download_url}`);
        return existing.browser_download_url;
    }
    const file = await fs.readFile(apkPath);
    const form = new FormData();
    form.append("file", new Blob([file]), assetName);
    const asset = await requestJson(
        `https://gitee.com/api/v5/repos/${owner}/${repo}/releases/${release.id}/attach_files?access_token=${encodeURIComponent(token)}`,
        {
            method: "POST",
            body: form,
        },
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
    const headers = {
        Authorization: `token ${token}`,
        Accept: "application/json",
    };
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
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
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

async function uploadGiteaAsset(release, apkPath, assetName) {
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
    const headers = {
        Authorization: `token ${token}`,
        Accept: "application/json",
    };
    const api = `${baseUrl}/api/v1/repos/${owner}/${repo}`;
    const assets = await requestJson(`${api}/releases/${release.id}/assets`, { headers });
    const existing = assets.find(asset => asset.name === assetName);
    if (existing) {
        console.log(`Reuse existing Gitea Release asset: ${existing.browser_download_url}`);
        return existing.browser_download_url;
    }
    const uploadUrl = `${api}/releases/${release.id}/assets?name=${encodeURIComponent(assetName)}`;
    const asset = await runCurlJson(
        [
            "-X", "POST",
            "-F", `attachment=@${apkPath};filename=${assetName}`,
            uploadUrl,
        ],
        [
            `Authorization: token ${token}`,
            "Accept: application/json",
        ],
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
    const headCommit = await resolveGitRevision("HEAD");
    if (tagCommit !== headCommit) {
        throw new Error(`Tag ${tagName} points to ${tagCommit}, but HEAD is ${headCommit}.`);
    }
}

async function resolveGitRevision(revision) {
    try {
        return (await runCapture("git", ["rev-parse", "--verify", revision])).trim();
    } catch {
        return "";
    }
}

async function commitRelease(version) {
    const untracked = await getUntrackedFiles();
    if (untracked.length) {
        throw new Error(
            `Untracked files must be staged or removed before release:\n${untracked.map(file => `- ${file}`).join("\n")}`,
        );
    }
    await run("git", ["add", "-u"]);
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

async function getUntrackedFiles() {
    const output = await runCapture("git", [
        "ls-files",
        "--others",
        "--exclude-standard",
    ]);
    return output
        .split(/\r?\n/)
        .map(file => file.trim())
        .filter(Boolean);
}

async function publishReleaseAssets(version, changeLog, apkPath, assetName) {
    const tagName = `v${version}`;
    const body = getReleaseBody(version, changeLog);
    const downloadUrls = getReleaseDownloadUrls(version, assetName);
    await ensureGitTag(tagName, version);

    const results = [];
    const targets = [
        {
            name: "Gitee",
            ensure: ensureGiteeRelease,
            upload: uploadGiteeAsset,
            downloadUrl: downloadUrls[0],
        },
        {
            name: "GitHub",
            ensure: ensureGithubRelease,
            upload: uploadGithubAsset,
            downloadUrl: downloadUrls[1],
        },
        {
            name: "Gitea",
            ensure: ensureGiteaRelease,
            upload: uploadGiteaAsset,
            downloadUrl: downloadUrls[2],
        },
    ];

    for (const target of targets) {
        results.push(await publishReleaseTarget(target, {
            version,
            tagName,
            body,
            apkPath,
            assetName,
        }));
    }

    console.log("\nRelease asset summary:");
    for (const result of results) {
        const status = result.ok ? "ok" : "failed";
        console.log(`- ${result.name}: ${status}${result.url ? ` ${result.url}` : ""}${result.error ? ` (${result.error})` : ""}`);
    }

    const failed = results.filter(result => !result.ok);
    if (failed.length) {
        throw new Error(`Release asset upload failed: ${failed.map(result => result.name).join(", ")}`);
    }
}

async function publishReleaseTarget(target, context) {
    try {
        const release = await target.ensure({
            version: context.version,
            tagName: context.tagName,
            body: context.body,
        });
        const url = await target.upload(release, context.apkPath, context.assetName);
        if (!url) {
            throw new Error(`${target.name} asset upload returned no download URL.`);
        }
        await verifyDownloadUrl(target.downloadUrl);
        return {
            name: target.name,
            ok: true,
            url: target.downloadUrl,
        };
    } catch (error) {
        return {
            name: target.name,
            ok: false,
            error: error?.message || String(error),
        };
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
    const nextDownload = downloadUrls || (Array.isArray(versionJson.download)
        ? versionJson.download.map(url => (
            typeof url === "string"
                ? url.replace(/\/v\d+\.\d+\.\d+\//g, `/v${version}/`)
                : url
        ))
        : []);
    await writeJson(versionJsonPath, {
        ...versionJson,
        version,
        changeLog: changeLog?.length ? changeLog : versionJson.changeLog,
        download: nextDownload,
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

async function main() {
    const args = parseArgs(process.argv.slice(2));
    await loadEnvFile(path.resolve(args.giteaEnv || ".env.gitea.local"));
    const packageJson = await readJson(path.resolve("package.json"));
    const version = args.version || bumpPatch(packageJson.version);
    const versionCode = args.versionCode
        ? Number.parseInt(args.versionCode, 10)
        : await getCurrentVersionCode() + 1;
    const changeLog = normalizeChangeLog(args.changelog, []);
    const shouldCommit = args.commit !== "false";
    const shouldPush = args.push !== "false";
    const shouldRelease = args.release !== "false";
    const shouldBuild = args.build !== "false";
    const shouldClean = args.clean !== "false";
    const shouldCheck = args.check !== "false";
    const apkPath = path.resolve(args.apk || getEnv("APK_PATH", DEFAULT_APK_PATH));
    const assetName = args.assetName || getEnv("APK_ASSET_NAME", DEFAULT_ASSET_NAME);
    const pushRemote = args.pushRemote || process.env.RELEASE_PUSH_REMOTE || DEFAULT_PUSH_REMOTE;
    const pushBranch = args.pushBranch || process.env.RELEASE_PUSH_BRANCH || DEFAULT_PUSH_BRANCH;

    if (!Number.isInteger(versionCode)) {
        throw new Error(`Invalid versionCode: ${args.versionCode}`);
    }

    try {
        console.log(`Preparing CatMusicFree release ${version} (${versionCode})`);
        if (changeLog.length) {
            console.log("ChangeLog:");
            changeLog.forEach(item => console.log(`- ${item}`));
        } else {
            console.log(`ChangeLog: keep existing ${VERSION_JSON} content`);
        }

        if (shouldRelease) {
            await validateReleaseCredentials();
        }
        if (shouldRelease && !shouldBuild) {
            await verifyApkVersion(apkPath, version, versionCode);
        }

        await updatePackageVersion(version);
        await updateAndroidVersion(version, versionCode);
        await updateVersionJson(version, changeLog, getReleaseDownloadUrls(version, assetName));

        if (shouldCheck) {
            await run(process.execPath, [
                path.resolve("node_modules/typescript/bin/tsc"),
                "--noEmit",
            ], { shell: false });
            await run("git", ["diff", "--check"]);
        }

        if (shouldBuild) {
            await cleanBundleOutputs();
            if (shouldClean) {
                await run(path.join(".", "android", "gradlew.bat"), ["-p", "android", "clean"]);
            }
            await run(path.join(".", "android", "gradlew.bat"), [
                "-p", "android",
                "assembleRelease",
                "-PreactNativeArchitectures=arm64-v8a",
                "-PreleaseArchitectures=arm64-v8a",
                "-PuniversalApk=false",
            ]);
        }

        if (shouldBuild) {
            await verifyApkVersion(apkPath, version, versionCode);
        }

        if (shouldCommit) {
            await commitRelease(version);
        }

        if (shouldRelease) {
            const tagName = `v${version}`;
            await ensureGitTag(tagName, version);
            if (shouldPush) {
                await run("git", ["push", pushRemote, tagName], { shell: false });
            }
            await publishReleaseAssets(version, changeLog, apkPath, assetName);
        }

        if (shouldPush) {
            if (!shouldCommit) {
                console.log("Skip git branch push because --commit=false was set.");
            } else {
                await run("git", ["push", pushRemote, `HEAD:${pushBranch}`], { shell: false });
            }
        }

        console.log(`\nRelease ${version} workflow completed.`);
    } catch (error) {
        throw error;
    }
}

main().catch(error => {
    console.error(error?.message || error);
    process.exit(1);
});
