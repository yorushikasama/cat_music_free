# 发布工作流

常规发布只需要运行一条命令：

```bash
npm run release:app -- --version 0.6.11 --changelog "第一条更新|第二条更新|第三条更新"
```

脚本会自动执行：

1. 更新 `package.json` 版本号。
2. 更新 `android/app/build.gradle` 的 `appVersion` 和 `appVersionCode`。
3. 更新 `release/version.json` 的版本号、更新内容和 Release 下载链接版本。
4. 运行 TypeScript、零警告 ESLint、Jest、发布工具测试和 `git diff --check`。
5. 清理 RN bundle 与 Android 构建缓存后构建 arm64 release APK。
6. 校验 APK 版本、v2/v3 签名、SHA-256、16 KB ELF 对齐、无 MP4 残留且小于 20 MiB。
7. 自动暂存已跟踪文件及 `src/`、`android/app/src/`、`tools/`、`docs/`、`release/` 等允许目录中的新增文件；未知根目录文件会阻止发布。
8. 提交 `chore: release <version>`，并推送到 `cat-music-free` 的 `main` 分支。
9. 创建或更新 GitHub、Gitee、Gitea 的 Release 附件，并逐一确认 APK 直链可访问。

当前 `cat-music-free` remote 配了三个 push URL：

- `https://github.com/yorushikasama/cat_music_free.git`
- `https://gitee.com/qianmeng_a/cat_music_free.git`
- `https://gitea.com/yorushikasama/cat_music_free.git`

所以默认发布会同时推送 GitHub、Gitee 和 Gitea。

Gitea Release 上传需要本机配置 `.env.gitea.local`：

```bash
GITEA_BASE_URL=https://gitea.com
GITEA_OWNER=yorushikasama
GITEA_REPO=cat_music_free
GITEA_TOKEN=你的 Gitea access token
```

`.env.gitea.local` 不要提交。仓库只保留 `.env.gitea.example` 作为模板。

如果不传 `--version`，脚本会自动把补丁版本号加 1，并把 `versionCode` 加 1。

如果只想改版本和构建，不提交：

```bash
npm run release:app -- --version 0.6.11 --commit=false
```

如果只想提交但暂时不推送：

```bash
npm run release:app -- --version 0.6.11 --push=false
```

如果只想构建和提交，暂时不上传 Release 附件：

```bash
npm run release:app -- --version 0.6.11 --release=false
```
