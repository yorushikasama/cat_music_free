# Agent Workflow

## Code Discovery

This project uses `codebase-memory-mcp` for its code knowledge graph.

1. Use `search_graph` to find definitions and relevant modules.
2. Use `trace_path` to inspect callers, callees, and change impact.
3. Use `get_code_snippet` to read the selected implementation.
4. Use text search only for string literals, configuration, scripts, or when the graph is insufficient.

## Release Trigger

Use these explicit user-facing release commands:

- `一键发版`: complete public release. Derive a concise, factual Chinese changelog from the completed user-visible changes, then run:

```powershell
npm run package:app -- --changelog "<derived changelog items separated by |>"
```

`package:app` is the only release entry point. It owns version and Android version-code updates, quality checks, arm64-v8a release APK generation and verification, release commit and tag creation, pushes to GitHub/Gitee/Gitea, Release asset upload, download verification, and `release/version.json` publication.

- `继续发版`: resume an interrupted public release. If the workflow stopped after creating `.release-state.json`, run:

```powershell
npm run package:resume
```

- `仅打包`: local APK preparation only. Do not commit, push, create a Release, or upload assets. Run:

```powershell
npm run package:prepare -- --changelog "<derived changelog>"
```

- `发版检查`: inspect the release plan without changing files. Run:

```powershell
npm run package:check
```

Do not trigger release work from ordinary mentions of `打包`, `发布`, `提交`, `推送`, or `Release`; ask the user to use one of the explicit commands when the intent is unclear. Do not replace this workflow with individual Gradle, Git, push, or upload commands.
