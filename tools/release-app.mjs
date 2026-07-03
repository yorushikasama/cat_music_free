import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const VERSION_JSON = "release/version.json";
const BUILD_GRADLE = "android/app/build.gradle";

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

async function notifyFeishuBot(text) {
    const receiveId = process.env.FEISHU_BOT_RECEIVE_ID?.trim();
    const receiveIdType = process.env.FEISHU_BOT_RECEIVE_ID_TYPE?.trim() || "chat_id";

    if (!receiveId) {
        return;
    }

    const appId = process.env.FEISHU_APP_ID?.trim();
    const appSecret = process.env.FEISHU_APP_SECRET?.trim();
    if (!appId || !appSecret) {
        console.warn("Warning: Feishu app bot notification skipped: missing FEISHU_APP_ID or FEISHU_APP_SECRET");
        return;
    }

    try {
        const tokenResponse = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
            },
            body: JSON.stringify({
                app_id: appId,
                app_secret: appSecret,
            }),
        });
        const tokenData = await tokenResponse.json().catch(() => ({}));
        const tenantAccessToken = tokenData.tenant_access_token;
        if (!tokenResponse.ok || tokenData.code !== 0 || !tenantAccessToken) {
            console.warn(`Warning: Feishu app bot token failed: ${tokenData.msg || tokenResponse.statusText}`);
            return;
        }

        const params = new URLSearchParams({
            receive_id_type: receiveIdType,
        });
        const messageResponse = await fetch(`https://open.feishu.cn/open-apis/im/v1/messages?${params.toString()}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${tenantAccessToken}`,
                "Content-Type": "application/json; charset=utf-8",
            },
            body: JSON.stringify({
                receive_id: receiveId,
                msg_type: "text",
                content: JSON.stringify({ text }),
            }),
        });
        const messageData = await messageResponse.json().catch(() => ({}));
        if (!messageResponse.ok || messageData.code !== 0) {
            console.warn(`Warning: Feishu app bot notification failed: ${messageData.msg || messageResponse.statusText}`);
        }
    } catch (error) {
        console.warn(`Warning: Feishu app bot notification failed: ${error?.message || error}`);
    }
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

async function updateVersionJson(version, changeLog) {
    const versionJsonPath = path.resolve(VERSION_JSON);
    const versionJson = await readJson(versionJsonPath);
    const nextDownload = Array.isArray(versionJson.download)
        ? versionJson.download.map(url => (
            typeof url === "string"
                ? url.replace(/\/v\d+\.\d+\.\d+\//g, `/v${version}/`)
                : url
        ))
        : [];
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
    await loadEnvFile(path.resolve(args.env || ".env.feishu.local"));
    const packageJson = await readJson(path.resolve("package.json"));
    const version = args.version || bumpPatch(packageJson.version);
    const versionCode = args.versionCode
        ? Number.parseInt(args.versionCode, 10)
        : await getCurrentVersionCode() + 1;
    const changeLog = normalizeChangeLog(args.changelog, []);
    const shouldUpload = args.upload !== "false";
    const shouldCommit = args.commit !== "false";
    const shouldBuild = args.build !== "false";
    const shouldCheck = args.check !== "false";

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
        await updateVersionJson(version, changeLog);

        if (shouldCheck) {
            await run("npx", ["tsc", "--noEmit"]);
            await run("git", ["diff", "--check"]);
        }

        if (shouldBuild) {
            await run(path.join(".", "android", "gradlew.bat"), ["-p", "android", "assembleRelease"]);
        }

        if (shouldUpload) {
            await run("npm", ["run", "release:feishu"]);
        }

        if (shouldCommit) {
            await run("git", ["add", "-A"]);
            await run("git", ["commit", "-m", `chore: release ${version}`]);
        }

        await notifyFeishuBot(`CatMusicFree ${version} 发布流程完成。`);
        console.log(`\nRelease ${version} workflow completed.`);
    } catch (error) {
        await notifyFeishuBot(`CatMusicFree ${version} 发布流程失败：${error?.message || error}`);
        throw error;
    }
}

main().catch(error => {
    console.error(error?.message || error);
    process.exit(1);
});
