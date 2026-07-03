import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

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

function requireEnv(name) {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`Missing required env: ${name}`);
    }
    return value;
}

async function getTenantAccessToken(appId, appSecret) {
    const response = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
        method: "POST",
        headers: {
            "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
            app_id: appId,
            app_secret: appSecret,
        }),
    });
    const data = await response.json();
    if (!response.ok || data.code !== 0 || !data.tenant_access_token) {
        throw new Error(`Failed to get tenant token: ${data.msg || response.statusText}`);
    }
    return data.tenant_access_token;
}

async function listChats(token) {
    const chats = [];
    let pageToken = "";
    do {
        const params = new URLSearchParams({
            page_size: "50",
        });
        if (pageToken) {
            params.set("page_token", pageToken);
        }
        const response = await fetch(`https://open.feishu.cn/open-apis/im/v1/chats?${params.toString()}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const data = await response.json();
        if (!response.ok || data.code !== 0) {
            throw new Error(`Failed to list chats: ${data.msg || response.statusText}`);
        }
        const page = data.data || {};
        chats.push(...(page.items || []));
        pageToken = page.page_token || "";
    } while (pageToken);
    return chats;
}

async function main() {
    await loadEnvFile(path.resolve(".env.feishu.local"));
    const token = await getTenantAccessToken(
        requireEnv("FEISHU_APP_ID"),
        requireEnv("FEISHU_APP_SECRET"),
    );
    const chats = await listChats(token);
    if (!chats.length) {
        console.log("No chats found. Add the app bot to a group first, or check app permissions.");
        return;
    }
    for (const chat of chats) {
        console.log(`${chat.chat_id}\t${chat.name || chat.description || "(unnamed chat)"}`);
    }
}

main().catch(error => {
    console.error(error?.message || error);
    process.exit(1);
});
