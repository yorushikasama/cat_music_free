import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

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

async function requestJson(url, options = {}) {
    const response = await fetch(url, options);
    const text = await response.text();
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

async function ensureGithubRelease({ version, tagName, body }) {
    const token = await getGithubToken();
    if (!token) {
        console.warn("Skip GitHub Release upload: no GITHUB_TOKEN/GH_TOKEN or git credential token.");
        return undefined;
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
    if (!token || !release) {
        return "";
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
        await requestJson(`${api}/releases/assets/${existing.id}`, {
            method: "DELETE",
            headers,
        });
    }
    const bytes = await fs.readFile(apkPath);
    const asset = await requestJson(
        `https://uploads.github.com/repos/${owner}/${repo}/releases/${release.id}/assets?name=${encodeURIComponent(assetName)}`,
        {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "application/vnd.android.package-archive",
            },
            body: new Blob([bytes]),
        },
    );
    console.log(`Uploaded GitHub Release asset: ${asset.browser_download_url}`);
    return asset.browser_download_url;
}

async function ensureGiteeRelease({ version, tagName, body }) {
    const token = await getGiteeToken();
    if (!token) {
        console.warn("Skip Gitee Release upload: no GITEE_TOKEN/GITEE_ACCESS_TOKEN or git credential token.");
        return undefined;
    }
    const owner = getEnv("GITEE_OWNER", DEFAULT_GITEE_OWNER);
    const repo = getEnv("GITEE_REPO", DEFAULT_GITEE_REPO);
    const api = `https://gitee.com/api/v5/repos/${owner}/${repo}`;
    const tokenParam = `access_token=${encodeURIComponent(token)}`;
    const existing = await requestJson(`${api}/releases/tags/${tagName}?${tokenParam}`);
    if (existing) {
        return existing;
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
    if (!token || !release) {
        return "";
    }
    const owner = getEnv("GITEE_OWNER", DEFAULT_GITEE_OWNER);
    const repo = getEnv("GITEE_REPO", DEFAULT_GITEE_REPO);
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
        console.warn("Skip Gitea Release upload: no GITEA_TOKEN or git credential token.");
        return undefined;
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
    if (!token || !release) {
        return "";
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
        await requestJson(`${api}/releases/${release.id}/assets/${existing.id}`, {
            method: "DELETE",
            headers,
        });
    }
    const file = await fs.readFile(apkPath);
    const form = new FormData();
    form.append("attachment", new Blob([file]), assetName);
    const asset = await requestJson(`${api}/releases/${release.id}/assets?name=${encodeURIComponent(assetName)}`, {
        method: "POST",
        headers,
        body: form,
    });
    console.log(`Uploaded Gitea Release asset: ${asset.browser_download_url}`);
    return asset.browser_download_url;
}

async function ensureGitTag(tagName, version) {
    const exists = await new Promise(resolve => {
        const child = spawn("git", ["rev-parse", "--verify", "--quiet", `refs/tags/${tagName}`], {
            cwd: process.cwd(),
            shell: false,
            stdio: "ignore",
        });
        child.on("exit", code => {
            resolve(code === 0);
        });
        child.on("error", () => {
            resolve(false);
        });
    });
    if (!exists) {
        await run("git", ["tag", "-a", tagName, "-m", `CatMusicFree ${version}`], { shell: false });
    }
}

async function publishReleaseAssets(version, changeLog, apkPath, assetName) {
    const tagName = `v${version}`;
    const body = getReleaseBody(version, changeLog);
    await ensureGitTag(tagName, version);

    const giteeRelease = await ensureGiteeRelease({ version, tagName, body });
    await uploadGiteeAsset(giteeRelease, apkPath, assetName);

    const githubRelease = await ensureGithubRelease({ version, tagName, body });
    await uploadGithubAsset(githubRelease, apkPath, assetName);

    const giteaRelease = await ensureGiteaRelease({ version, tagName, body });
    await uploadGiteaAsset(giteaRelease, apkPath, assetName);
}

async function run(command, args, options = {}) {
    const display = [command, ...args].join(" ");
    console.log(`\n> ${display}`);
    await new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd: process.cwd(),
            env: process.env,
            shell: process.platform === "win32",
            stdio: "inherit",
            ...options,
        });
        child.on("error", reject);
        child.on("exit", code => {
            if (code === 0) {
                resolve();
            } else if (options.allowFailure) {
                console.warn(`Command failed (${code}) but continuing: ${display}`);
                resolve();
            } else {
                reject(new Error(`Command failed (${code}): ${display}`));
            }
        });
    });
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

        await updatePackageVersion(version);
        await updateAndroidVersion(version, versionCode);
        await updateVersionJson(version, changeLog, getReleaseDownloadUrls(version, assetName));

        if (shouldCheck) {
            await run("npx", ["tsc", "--noEmit"]);
            await run("git", ["diff", "--check"]);
        }

        if (shouldBuild) {
            await run(path.join(".", "android", "gradlew.bat"), ["-p", "android", "assembleRelease"]);
        }

        if (shouldCommit) {
            await run("git", ["add", "-A"]);
            await run("git", ["commit", "-m", `chore: release ${version}`], { shell: false });
        }

        if (shouldPush) {
            if (!shouldCommit) {
                console.log("Skip git push because --commit=false was set.");
            } else {
                await run("git", ["push", pushRemote, `HEAD:${pushBranch}`], { shell: false });
            }
        }

        if (shouldRelease) {
            await publishReleaseAssets(version, changeLog, apkPath, assetName);
            if (shouldPush) {
                await run("git", ["push", pushRemote, `v${version}`], { shell: false });
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
