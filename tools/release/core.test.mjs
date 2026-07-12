import test from "node:test";
import assert from "node:assert/strict";
import { assertApkVersion, parseApkBadging } from "./apk.mjs";
import { escapeCurlConfigValue } from "./process.mjs";

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
