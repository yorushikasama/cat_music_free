# 发布工作流

常规发布只需要运行一条命令：

```bash
npm run release:app -- --version 0.6.11 --changelog "第一条更新|第二条更新|第三条更新"
```

脚本会自动执行：

1. 更新 `package.json` 版本号。
2. 更新 `android/app/build.gradle` 的 `appVersion` 和 `appVersionCode`。
3. 更新 `release/version.json` 的版本号、更新内容和 Release 下载链接版本。
4. 运行 `npx tsc --noEmit`。
5. 运行 `git diff --check`。
6. 构建 Android release 包。
7. `git add -A`，提交 `chore: release <version>`，并推送到 `cat-music-free` 的 `main` 分支。

当前 `cat-music-free` remote 配了两个 push URL：

- `https://github.com/yorushikasama/cat_music_free.git`
- `https://gitee.com/qianmeng_a/cat_music_free.git`

所以默认发布会同时推送 GitHub 和 Gitee。

如果不传 `--version`，脚本会自动把补丁版本号加 1，并把 `versionCode` 加 1。

如果只想改版本和构建，不提交：

```bash
npm run release:app -- --version 0.6.11 --commit=false
```

如果只想提交但暂时不推送：

```bash
npm run release:app -- --version 0.6.11 --push=false
```
