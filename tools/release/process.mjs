import process from "node:process";
import { spawn } from "node:child_process";

export async function run(command, args, options = {}) {
    const display = [command, ...args].join(" ");
    console.log(`\n> ${display}`);
    await new Promise((resolve, reject) => {
        const requiresShell = process.platform === "win32" && /\.(bat|cmd)$/i.test(command);
        const child = spawn(command, args, {
            cwd: process.cwd(),
            env: process.env,
            shell: requiresShell,
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

export async function runCapture(command, args, options = {}) {
    const result = await runCaptureAllowFailure(command, args, options);
    if (result.code !== 0) {
        throw new Error(result.stderr || `${command} failed with code ${result.code}`);
    }
    return result.stdout;
}

export async function runCaptureAllowFailure(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd: process.cwd(),
            shell: process.platform === "win32" && /\.(bat|cmd)$/i.test(command),
            stdio: ["ignore", "pipe", "pipe"],
            ...options,
        });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", chunk => {
            stdout += chunk.toString();
        });
        child.stderr.on("data", chunk => {
            stderr += chunk.toString();
        });
        child.on("error", reject);
        child.on("exit", code => {
            resolve({ code, stdout, stderr });
        });
    });
}

export async function runCurlJson(args, headers) {
    const curlConfig = headers
        .map(header => `header = "${escapeCurlConfigValue(header)}"`)
        .join("\n");
    const curlCommand = process.platform === "win32" ? "curl.exe" : "curl";
    const output = await new Promise((resolve, reject) => {
        const child = spawn(
            curlCommand,
            ["--config", "-", "--fail-with-body", "--silent", "--show-error", ...args],
            {
                cwd: process.cwd(),
                shell: false,
                stdio: ["pipe", "pipe", "pipe"],
            },
        );
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", chunk => {
            stdout += chunk.toString();
        });
        child.stderr.on("data", chunk => {
            stderr += chunk.toString();
        });
        child.on("error", reject);
        child.on("exit", code => {
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(stderr || stdout || `curl failed with code ${code}`));
            }
        });
        child.stdin.end(`${curlConfig}\n`);
    });
    return JSON.parse(output || "{}");
}

export function escapeCurlConfigValue(value) {
    if (/[\r\n]/.test(value)) {
        throw new Error("Invalid newline in curl header.");
    }
    return value
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"');
}
