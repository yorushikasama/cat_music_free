import test from "node:test";
import assert from "node:assert/strict";
import {
    assertApkVersion,
    parseApkBadging,
    parseLoadAlignments,
} from "./apk.mjs";
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

test("parses ELF LOAD alignments", () => {
    const output = [
        "  LOAD 0x000000 0x0000000000000000 0x0000000000000000 0x0123 0x0123 R E 0x4000",
        "  LOAD 0x004000 0x0000000000004000 0x0000000000004000 0x0020 0x0030 RW  0x10000",
    ].join("\n");
    assert.deepEqual(parseLoadAlignments(output), [0x4000, 0x10000]);
});
