import test from "node:test";
import assert from "node:assert/strict";
import {
    assertApkVersion,
    parseApkBadging,
    parseLoadAlignments,
} from "./apk.mjs";
import { escapeCurlConfigValue } from "./process.mjs";
import {
    createReleasePlan,
    getReleaseDownloadUrls,
    parseArgs,
    parsePushUrls,
    verifyDownloadUrl,
} from "../release-app.mjs";

test("parses and validates APK version metadata", () => {
    const metadata = parseApkBadging(
        "package: name='fun.upup.catmusicfree' versionCode='400029' versionName='0.7.8'",
    );
    assert.deepEqual(metadata, { version: "0.7.8", versionCode: "400029" });
    assert.doesNotThrow(() => assertApkVersion(metadata, "0.7.8", 400029));
    assert.throws(
        () => assertApkVersion(metadata, "0.7.9", 400030),
        /APK version mismatch/,
    );
});

test("escapes curl config headers and rejects newlines", () => {
    assert.equal(escapeCurlConfigValue('Header: a"b\\c'), 'Header: a\\"b\\\\c');
    assert.throws(() => escapeCurlConfigValue("Header: ok\nInjected: yes"));
});

test("parses ELF LOAD alignments", () => {
    const output = [
        "  LOAD 0x000000 0x0000000000000000 0x0000000000000000 0x0123 0x0123 R E 0x4000",
        "  LOAD 0x004000 0x0000000000004000 0x0000000000004000 0x0020 0x0030 RW  0x10000",
    ].join("\n");
    assert.deepEqual(parseLoadAlignments(output), [0x4000, 0x10000]);
});

test("default release plan is an all-or-nothing public release", () => {
    const plan = createReleasePlan(
        parseArgs(["--changelog", "Fix one|Fix two"]),
        "8.1.9",
        400047,
    );
    assert.equal(plan.mode, "full");
    assert.equal(plan.version, "8.1.10");
    assert.equal(plan.versionCode, 400048);
    assert.deepEqual(plan.changeLog, ["Fix one", "Fix two"]);
    assert.deepEqual(
        [plan.shouldCheck, plan.shouldBuild, plan.shouldCommit, plan.shouldPush, plan.shouldRelease],
        [true, true, true, true, true],
    );
});

test("public releases reject unsafe partial flags and missing changelogs", () => {
    assert.throws(
        () => createReleasePlan(parseArgs(["--release=false", "--changelog", "Fix"]), "8.1.9", 400047),
        /public release cannot disable release/,
    );
    assert.throws(
        () => createReleasePlan({}, "8.1.9", 400047),
        /requires --changelog/,
    );
});

test("dry-run uses kebab-case arguments and never requires a changelog", () => {
    const plan = createReleasePlan(
        parseArgs(["--dry-run", "--version", "8.1.10"]),
        "8.1.9",
        400047,
    );
    assert.equal(plan.mode, "dry-run");
    assert.equal(plan.version, "8.1.10");
    assert.equal(plan.requiresChangeLog, true);
});

test("resume reuses the existing version and never bumps it", () => {
    const plan = createReleasePlan(
        parseArgs(["--resume"]),
        "8.1.9",
        400047,
        { version: "8.1.9", versionCode: 400047, changeLog: ["Fix"] },
    );
    assert.equal(plan.mode, "resume");
    assert.equal(plan.version, "8.1.9");
    assert.equal(plan.versionCode, 400047);
    assert.equal(plan.shouldBuild, false);
    assert.equal(plan.shouldCommit, true);
});

test("release push URLs are independent and de-duplicated", () => {
    assert.deepEqual(
        parsePushUrls("https://github.com/a/b.git, https://gitee.com/a/b.git,https://github.com/a/b.git"),
        ["https://github.com/a/b.git", "https://gitee.com/a/b.git"],
    );
    assert.throws(() => parsePushUrls("ssh://example.com/a/b.git"), /Invalid release push URL/);
});

test("download URLs point to the separately published release assets", () => {
    const urls = getReleaseDownloadUrls("8.1.10", "app release.apk");
    assert.deepEqual(urls, [
        "https://gitee.com/qianmeng_a/cat_music_free/releases/download/v8.1.10/app%20release.apk",
        "https://github.com/yorushikasama/cat_music_free/releases/download/v8.1.10/app%20release.apk",
        "https://gitea.com/yorushikasama/cat_music_free/releases/download/v8.1.10/app%20release.apk",
    ]);
});

test("download verification falls back from HEAD to a ranged GET", async () => {
    const calls = [];
    const response = status => ({
        ok: status >= 200 && status < 300,
        status,
        statusText: status === 405 ? "Method Not Allowed" : "OK",
        body: { cancel: async () => {} },
    });
    await verifyDownloadUrl("https://example.com/app.apk", {
        retries: 0,
        fetchImpl: async (_url, options) => {
            calls.push(options);
            return options.method === "HEAD" ? response(405) : response(206);
        },
    });
    assert.deepEqual(calls.map(call => call.method), ["HEAD", "GET"]);
    assert.equal(calls[1].headers.Range, "bytes=0-0");
});
