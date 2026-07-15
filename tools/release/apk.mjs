import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import os from "node:os";
import crypto from "node:crypto";
import { run, runCapture } from "./process.mjs";

const MAX_APK_BYTES = 20 * 1024 * 1024;
const MIN_ARM64_LOAD_ALIGNMENT = 0x4000;

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
    const resolvedApkPath = path.resolve(apkPath);
    const stats = await fs.stat(resolvedApkPath);
    if (!stats.isFile() || stats.size === 0) {
        throw new Error(`Release APK is missing or empty: ${apkPath}`);
    }
    const aaptPath = await findAaptExecutable();
    const output = await runCapture(aaptPath, ["dump", "badging", resolvedApkPath]);
    const actual = parseApkBadging(output);
    assertApkVersion(actual, version, versionCode);
    console.log(`Verified APK version ${actual.version} (${actual.versionCode}).`);
}

export async function verifyReleaseApk(apkPath, version, versionCode) {
    const resolvedApkPath = path.resolve(apkPath);
    await verifyApkVersion(resolvedApkPath, version, versionCode);
    const stats = await fs.stat(resolvedApkPath);
    if (stats.size >= MAX_APK_BYTES) {
        throw new Error(
            `Release APK must be smaller than 20 MiB, got ${(stats.size / 1024 / 1024).toFixed(2)} MiB.`,
        );
    }

    const entries = (await runCapture("jar", ["tf", resolvedApkPath]))
        .split(/\r?\n/)
        .map(item => item.trim())
        .filter(Boolean);
    const mp4Entries = entries.filter(item => item.toLowerCase().endsWith(".mp4"));
    if (mp4Entries.length) {
        throw new Error(`Release APK contains MP4 assets: ${mp4Entries.join(", ")}`);
    }

    await verifyApkSignature(resolvedApkPath);
    await verifyArm64ElfAlignment(resolvedApkPath, entries);

    const digest = crypto
        .createHash("sha256")
        .update(await fs.readFile(resolvedApkPath))
        .digest("hex");
    console.log(
        `Verified release APK: ${(stats.size / 1024 / 1024).toFixed(2)} MiB, SHA-256 ${digest}.`,
    );
    return { size: stats.size, sha256: digest };
}

async function verifyApkSignature(apkPath) {
    const apksignerPath = await findBuildToolsExecutable("apksigner");
    const output = await runCapture(apksignerPath, [
        "verify",
        "--verbose",
        "--print-certs",
        apkPath,
    ]);
    if (!/Verified using v2 scheme \(APK Signature Scheme v2\): true/i.test(output)) {
        throw new Error("Release APK is missing a valid v2 signature.");
    }
    if (!/Verified using v3 scheme \(APK Signature Scheme v3\): true/i.test(output)) {
        throw new Error("Release APK is missing a valid v3 signature.");
    }
}

async function verifyArm64ElfAlignment(apkPath, entries) {
    const libraries = entries.filter(
        item => item.startsWith("lib/arm64-v8a/") && item.endsWith(".so"),
    );
    if (!libraries.length) {
        throw new Error("Release APK contains no arm64 native libraries.");
    }
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "catmusicfree-apk-"));
    try {
        await run("jar", ["xf", apkPath, ...libraries], {
            cwd: tempDirectory,
            shell: false,
        });
        const readelfPath = await findLlvmReadelfExecutable();
        for (const library of libraries) {
            const output = await runCapture(
                readelfPath,
                ["-lW", path.join(tempDirectory, ...library.split("/"))],
            );
            const alignments = parseLoadAlignments(output);
            if (
                !alignments.length ||
                alignments.some(alignment => alignment < MIN_ARM64_LOAD_ALIGNMENT)
            ) {
                const minimum = alignments.length
                    ? Math.min(...alignments)
                    : 0;
                throw new Error(
                    `${library} has LOAD alignment 0x${minimum.toString(16)}, expected at least 0x4000.`,
                );
            }
        }
    } finally {
        await fs.rm(tempDirectory, { recursive: true, force: true });
    }
}

export function parseLoadAlignments(output) {
    return output
        .split(/\r?\n/)
        .filter(line => /^\s*LOAD\s/.test(line))
        .map(line => line.trim().split(/\s+/).at(-1))
        .filter(value => /^0x[0-9a-f]+$/i.test(value ?? ""))
        .map(value => Number.parseInt(value, 16));
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
    return findBuildToolsExecutable("aapt");
}

async function findBuildToolsExecutable(baseName) {
    const sdkDir = await getAndroidSdkDir();
    const buildToolsDir = path.join(sdkDir, "build-tools");
    const entries = await fs.readdir(buildToolsDir, { withFileTypes: true });
    const executableName = process.platform === "win32"
        ? `${baseName}${baseName === "apksigner" ? ".bat" : ".exe"}`
        : baseName;
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

async function findLlvmReadelfExecutable() {
    const sdkDir = await getAndroidSdkDir();
    const ndkRoot = path.join(sdkDir, "ndk");
    const ndkVersions = (await fs.readdir(ndkRoot, { withFileTypes: true }))
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
    const executableName = process.platform === "win32" ? "llvm-readelf.exe" : "llvm-readelf";
    for (const version of ndkVersions) {
        const prebuiltRoot = path.join(ndkRoot, version, "toolchains", "llvm", "prebuilt");
        let prebuilts = [];
        try {
            prebuilts = await fs.readdir(prebuiltRoot, { withFileTypes: true });
        } catch {
            continue;
        }
        for (const prebuilt of prebuilts.filter(entry => entry.isDirectory())) {
            const candidate = path.join(prebuiltRoot, prebuilt.name, "bin", executableName);
            try {
                await fs.access(candidate);
                return candidate;
            } catch {
                continue;
            }
        }
    }
    throw new Error(`Cannot find ${executableName} under ${ndkRoot}`);
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
