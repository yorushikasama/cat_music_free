import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const VERSION_JSON = "release/version.json";
const BUILD_GRADLE = "android/app/build.gradle";
const DEFAULT_PUSH_REMOTE = "cat-music-free";
const DEFAULT_PUSH_BRANCH = "main";

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
    const packageJson = await readJson(path.resolve("package.json"));
    const version = args.version || bumpPatch(packageJson.version);
    const versionCode = args.versionCode
        ? Number.parseInt(args.versionCode, 10)
        : await getCurrentVersionCode() + 1;
    const changeLog = normalizeChangeLog(args.changelog, []);
    const shouldCommit = args.commit !== "false";
    const shouldPush = args.push !== "false";
    const shouldBuild = args.build !== "false";
    const shouldCheck = args.check !== "false";
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
        await updateVersionJson(version, changeLog);

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

        console.log(`\nRelease ${version} workflow completed.`);
    } catch (error) {
        throw error;
    }
}

main().catch(error => {
    console.error(error?.message || error);
    process.exit(1);
});
