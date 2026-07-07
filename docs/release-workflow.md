# 发布工作流

飞书云空间和应用权限配置见：[飞书发布配置指南](./feishu-release-setup.md)。

常规发布只需要运行一条命令：

```bash
npm run release:app -- --version 0.6.11 --changelog "第一条更新|第二条更新|第三条更新"
```

脚本会自动执行：

1. 更新 `package.json` 版本号。
2. 更新 `android/app/build.gradle` 的 `appVersion` 和 `appVersionCode`。
3. 更新 `release/version.json` 的版本号、更新内容和 GitHub Releases 链接版本。
4. 运行 `npx tsc --noEmit`。
5. 运行 `git diff --check`。
6. 构建 Android release 包。
7. 上传 APK 到飞书并刷新下载配置。
8. `git add -A`，提交 `chore: release <version>`，并推送到 `cat-music-free` 的 `main` 分支。

当前 `cat-music-free` remote 配了两个 push URL：

- `https://github.com/yorushikasama/cat_music_free.git`
- `https://gitee.com/qianmeng_a/cat_music_free.git`

所以默认发布会同时推送 GitHub 和 Gitee。

如果不传 `--version`，脚本会自动把补丁版本号加 1，并把 `versionCode` 加 1。

如果暂时不想上传飞书：

```bash
npm run release:app -- --version 0.6.11 --upload=false --changelog "第一条更新|第二条更新"
```

飞书权限恢复后可以单独补传：

```bash
npm run release:feishu
```

飞书上传规则：

- APK 不超过 20MB 时使用普通上传接口。
- APK 超过 20MB 时自动使用分片上传接口。
- 如果上传返回 `403 forbidden` 或 `1061004 forbidden`，通常不是文件大小问题，而是当前应用身份没有目标文件夹的编辑权限。需要在飞书云文档里把自建应用添加为文档应用/协作者，或把包含应用机器人的群添加为可编辑协作者。

如果只想改版本和构建，不提交：

```bash
npm run release:app -- --version 0.6.11 --commit=false
```

如果只想提交但暂时不推送：

```bash
npm run release:app -- --version 0.6.11 --push=false
```

本地飞书配置放在 `.env.feishu.local`，不要提交。

如果要把发布结果推送到飞书应用机器人，在 `.env.feishu.local` 里添加：

```bash
FEISHU_BOT_RECEIVE_ID_TYPE=chat_id
FEISHU_BOT_RECEIVE_ID=目标群聊或用户 ID
```
