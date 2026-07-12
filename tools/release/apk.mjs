import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { runCapture } from "./process.mjs";

const BUNDLE_CACHE_PATHS = [
    "android/app/src/main/assets/index.android.bundle",
    "android/app/build/generated/assets/createBundleReleaseJsAndAssets",
    "android/app/build/generated/res/createBundleReleaseJsAndAssets",
    "android/app/build/intermediates/assets/release",
    "android/app/build/intermediates/res/merged/release",
];

export async function cleanBundleOutputs() {
    for (const relativePath of BUNDLE_CACHE_PATHS) {
        await fs.rm(path.resolve(relativePath), {
            force: true,
            recursive: true,
        });
    }
    console.log("Cleaned React Native bundle outputs.");
}

export async function verifyApkVersion(apkPath, version, versionCode) {
    const stats = await fs.stat(apkPath);
    if (!stats.isFile() || stats.size === 0) {
        throw new Error(`Release APK is missing or empty: ${apkPath}`);
    }
    const aaptPath = await findAaptExecutable();
    const output = await runCapture(aaptPath, ["dump", "badging", apkPath]);
    const actual = parseApkBadging(output);
    assertApkVersion(actual, version, versionCode);
    console.log(`Verified APK version ${actual.version} (${actual.versionCode}).`);
}

export function parseApkBadging(output) {
    const packageLine = output
        .split(/\r?\n/)
        .find(line => line.startsWith("package:"));
    const version = packageLine?.match(/versionName='([^']+)'/)?.[1];
    const versionCode = packageLine?.match(/versionCode='([^']+)'/)?.[1];
    if (!version || !versionCode) {
        throw new Error("Cannot read APK version metadata.");
    }
    return { version, versionCode };
}

export function assertApkVersion(actual, version, versionCode) {
    if (actual.version !== version || actual.versionCode !== String(versionCode)) {
        throw new Error(
            `APK version mismatch: expected ${version} (${versionCode}), got ${actual.version} (${actual.versionCode})`,
        );
    }
}

async function findAaptExecutable() {
    const sdkDir = await getAndroidSdkDir();
    const buildToolsDir = path.join(sdkDir, "build-tools");
    const entries = await fs.readdir(buildToolsDir, { withFileTypes: true });
    const executableName = process.platform === "win32" ? "aapt.exe" : "aapt";
    const versions = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
    for (const buildToolsVersion of versions) {
        const candidate = path.join(buildToolsDir, buildToolsVersion, executableName);
        try {
            await fs.access(candidate);
            return candidate;
        } catch {
            continue;
        }
    }
    throw new Error(`Cannot find ${executableName} under ${buildToolsDir}`);
}

async function getAndroidSdkDir() {
    const configured = process.env.ANDROID_SDK_ROOT?.trim() ||
        process.env.ANDROID_HOME?.trim();
    if (configured) {
        return configured;
    }
    const properties = await fs.readFile(path.resolve("android/local.properties"), "utf8");
    const sdkLine = properties
        .split(/\r?\n/)
        .find(line => line.trim().startsWith("sdk.dir="));
    if (!sdkLine) {
        throw new Error("Android SDK path is not configured.");
    }
    return sdkLine
        .slice(sdkLine.indexOf("=") + 1)
        .trim()
        .replace(/\\\\/g, "\\")
        .replace(/\\:/g, ":");
}
