# 发布工作流

常规发布只需要运行一条命令：

```bash
npm run release:app -- --version 0.6.11 --changelog "第一条更新|第二条更新|第三条更新"
```

这是唯一会创建公开版本的默认模式。脚本会自动执行：

1. 更新 `package.json` 和 `android/app/build.gradle` 的版本号与 `appVersionCode`。
2. 运行 TypeScript、零警告 ESLint、Jest、发布工具测试和 `git diff --check`。
3. 构建 arm64 release APK，并校验版本、v2/v3 签名、SHA-256、16 KB ELF 对齐、无 MP4 残留且小于 20 MiB。
4. 提交 `chore: release <version>`，再分别推送 `main` 和 tag 到 GitHub、Gitee、Gitea；每个平台独立重试，避免单个平台故障阻塞其余平台。
5. 创建或复用三端 Release，上传或复用 SHA-256 一致的 APK，并用 `HEAD` 和带 `Range` 的轻量 `GET` 双重确认公开下载链接。
6. 只有三端附件都可访问后，才更新并提交 `release/version.json` 中的版本、更新内容和下载链接，再分别推送这个最终元数据提交。

默认地址是：

- `https://github.com/yorushikasama/cat_music_free.git`
- `https://gitee.com/qianmeng_a/cat_music_free.git`
- `https://gitea.com/yorushikasama/cat_music_free.git`

可用 `RELEASE_GIT_PUSH_URLS` 覆盖地址列表，使用英文逗号分隔。脚本不再依赖多 push URL remote，因此 GitHub 的短暂网络故障不会阻止 Gitee 或 Gitea 的推送。

Gitea Release 上传需要本机配置 `.env.gitea.local`：

```bash
GITEA_BASE_URL=https://gitea.com
GITEA_OWNER=yorushikasama
GITEA_REPO=cat_music_free
GITEA_TOKEN=你的 Gitea access token
```

`.env.gitea.local` 不要提交。仓库只保留 `.env.gitea.example` 作为模板。

如果不传 `--version`，脚本会自动把补丁版本号加 1，并把 `versionCode` 加 1。新公开版本必须提供至少一条 `--changelog`，避免沿用旧版本的更新说明。

公开发布不允许使用 `--commit=false`、`--push=false`、`--release=false`、`--build=false` 或 `--check=false` 来跳过步骤。这些组合会被明确拒绝，避免写出指向不存在附件的更新链接。

网络中断、电脑重启或某个平台暂时故障后，使用下面的命令恢复同一个版本。它不会递增版本或重复构建，除非显式传入 `--build=true`：

```bash
npm run release:resume
```

恢复模式会验证当前 APK、独立补推分支与 tag、创建或复用 Release 附件，并重新验证所有公开链接。已上传且 SHA-256 一致的附件会被复用。

仅在本地准备版本和 APK、绝不提交或发布时，使用：

```bash
npm run release:app -- --mode=prepare --version 0.6.11 --changelog "第一条更新|第二条更新"
```

只查看完整发布计划而不修改任何文件时，使用：

```bash
npm run release:check -- --version 0.6.11 --changelog "第一条更新"
```
