# 飞书发布配置指南

这份文档用于配置 CatMusicFree 的飞书云空间发布能力。配置完成后，发布脚本可以自动把 APK 上传到固定飞书文件夹，App 的检查更新弹窗会打开这个稳定的飞书下载入口。

不要提交 `.env.feishu.local`、App Secret、二维码、临时 token 或任何授权链接。

## 最快配置

在项目根目录运行：

```bash
npm run feishu:setup
```

然后按提示复制粘贴信息即可。向导会自动完成：

1. 写入本地 `.env.feishu.local`。
2. 初始化 `lark-cli`。
3. 引导你打开飞书授权链接。
4. 用你的用户身份把应用添加为飞书文件夹协作者。
5. 用 `npm run release:feishu -- --dry-run` 验证文件夹读取权限。

如果想配置完成后顺便真实上传一次当前 APK，运行：

```bash
npm run feishu:setup -- -TestUpload
```

真实上传测试不会删除旧 APK。

## 需要准备什么

向导会问这些内容：

```text
飞书 App ID
飞书 App Secret
飞书文件夹 token 或链接
飞书文件夹分享链接
是否删除旧 APK
飞书机器人通知会话 ID
```

当前项目正在使用的非敏感默认值：

```text
App ID: cli_aacc386c09799cb3
Feishu folder token: OPBTfWOgylTFrndwg4dcVSg6nTc
Feishu folder share URL: https://fcn294wj6t7e.feishu.cn/drive/folder/OPBTfWOgylTFrndwg4dcVSg6nTc?from=from_copylink
Bot chat ID: oc_af7dec24fd96d971e858dc4f094dee2e
```

App Secret 不要写进文档，也不要提交到仓库。向导会把它写入本机 `.env.feishu.local` 和 `lark-cli` 本地配置。

## 飞书开放平台权限

飞书应用至少需要这些权限：

```text
drive:file:upload
drive:drive.metadata:readonly
im:message:send_as_bot
```

说明：

- `drive:file:upload`：上传 APK。
- `drive:drive.metadata:readonly`：列出飞书文件夹内容、dry-run 验证。
- `im:message:send_as_bot`：发布成功或失败后给飞书群发通知。

如果启用 `FEISHU_DELETE_OLD=true` 并遇到删除旧包 403，需要在飞书开放平台补充云空间删除/管理相关权限，或者先用 `--deleteOld=false` 验证上传链路。

开通权限后要在飞书开放平台发布/生效应用权限，否则 API 仍可能返回缺 scope。

## 为什么必须授权文件夹

飞书上传有两层权限：

1. 应用 API scope：应用是否能调用上传、列文件、发消息等接口。
2. 文件夹资源权限：应用身份是否是目标文件夹协作者，并且拥有编辑权限。

只把应用机器人拉进群，不一定等于应用身份拥有文件夹写权限。向导内部会执行这条 CLI 命令，把应用 `appid` 加成文件夹协作者：

```bash
npx @larksuite/cli@latest drive +member-add --as user --token OPBTfWOgylTFrndwg4dcVSg6nTc --type folder --member-type appid --member-id cli_aacc386c09799cb3 --perm edit --yes
```

这里必须用 `--as user`，因为文件夹属于用户云空间，bot 通常不能给自己授权。

## 手动 CLI 流程

一般不需要手动执行。只有向导失败时，才按下面步骤排查。

初始化 `lark-cli`：

```powershell
$secret = "你的 App Secret"
$secret | npx @larksuite/cli@latest config init --force-init --app-id cli_aacc386c09799cb3 --app-secret-stdin --brand feishu --lang zh
```

检查登录状态：

```bash
npx @larksuite/cli@latest auth status
```

如果 user 身份缺失，发起授权：

```bash
npx @larksuite/cli@latest auth login --domain drive --no-wait --json
```

命令会返回 `verification_url` 和 `device_code`。打开链接完成授权，或者生成二维码：

```bash
npx @larksuite/cli@latest auth qrcode "<verification_url>" --output feishu-auth-qr.png --size 320
```

授权完成后继续：

```bash
npx @larksuite/cli@latest auth login --device-code "<device_code>"
```

先 dry-run 看请求是否正确：

```bash
npx @larksuite/cli@latest drive +member-add --dry-run --as user --token OPBTfWOgylTFrndwg4dcVSg6nTc --type folder --member-type appid --member-id cli_aacc386c09799cb3 --perm edit
```

正式授权：

```bash
npx @larksuite/cli@latest drive +member-add --as user --token OPBTfWOgylTFrndwg4dcVSg6nTc --type folder --member-type appid --member-id cli_aacc386c09799cb3 --perm edit --yes
```

验证：

```bash
npm run release:feishu -- --dry-run
npm run release:feishu -- --deleteOld=false
```

## 本地配置文件

向导会生成 `.env.feishu.local`：

```env
FEISHU_APP_ID=cli_xxxxxxxxxxxxxxxx
FEISHU_APP_SECRET=replace_with_your_secret
FEISHU_FOLDER=https://example.feishu.cn/drive/folder/xxxxxxxxxxxxxxxxxxxxxxxxxxx
FEISHU_FOLDER_SHARE_URL=https://example.feishu.cn/drive/folder/xxxxxxxxxxxxxxxxxxxxxxxxxxx?from=from_copylink
FEISHU_DELETE_OLD=true

FEISHU_BOT_RECEIVE_ID_TYPE=chat_id
FEISHU_BOT_RECEIVE_ID=replace_with_target_chat_or_user_id
```

`FEISHU_FOLDER` 可以填完整文件夹链接，也可以直接填 folder token。`FEISHU_FOLDER_SHARE_URL` 是写入 `release/version.json` 的浏览器下载入口。

## 大文件上传

`tools/release-feishu.mjs` 会自动判断 APK 大小：

- 不超过 20MB：走 `/drive/v1/files/upload_all` 普通上传。
- 超过 20MB：走 `/drive/v1/files/upload_prepare`、`/drive/v1/files/upload_part`、`/drive/v1/files/upload_finish` 分片上传。

APK 变大后不需要手动改命令。

## 常见错误

`403 forbidden` 或 `1061004 forbidden`：

```text
应用 API 权限有了，但应用身份没有目标文件夹编辑权限。
```

解决：重新运行 `npm run feishu:setup`，确认用户授权，并把应用添加为文件夹协作者。

`1063002 user lacks permission for the requested resource`：

```text
bot 正在尝试给自己授权，但它没有目标文件夹权限。
```

解决：用 `lark-cli` 的 user 身份授权，也就是运行 `npm run feishu:setup`。

`app has not applied for the required scope`：

```text
飞书开放平台没有开通对应 API 权限，或权限开了但还没发布生效。
```

解决：去飞书开放平台给应用开通权限并发布。

## 发布命令

常规发布：

```bash
npm run release:app -- --version 0.6.11 --changelog "第一条更新|第二条更新"
```

只补传飞书：

```bash
npm run release:feishu
```

临时跳过飞书上传：

```bash
npm run release:app -- --version 0.6.11 --upload=false --changelog "第一条更新|第二条更新"
```
