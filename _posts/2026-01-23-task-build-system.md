---
layout: future-post
title: "Shipped: Task Build System"
date: 2026-01-23
track: [credibility]
author: Ian
reading_time: 2
tags: [tracer-bullet, developer-experience, build-system]
excerpt: "Single commands for test/build/dev, checksum-based caching, zero overhead dependency checks"
---

## What We Built

The debrief-future monorepo now uses [Task](https://taskfile.dev) for all build operations. One `Taskfile.yml` replaced the 72-line Makefile and unified our Python (uv) and TypeScript (pnpm) tooling behind consistent commands.

**The commands:**
- `task install` — installs Python and Node dependencies
- `task test` — runs pytest and vitest across all packages
- `task build` — compiles Python wheels and TypeScript bundles
- `task dev` — starts Storybook watch mode
- `task lint` / `task lint:fix` — checks/fixes code style

All major commands automatically ensure dependencies are installed first via task dependencies. But here's the key: Task uses checksum-based caching. When lockfiles haven't changed, `task install` completes instantly. The dependency check adds zero overhead to repeated `task test` runs.

## Screenshots

```bash
$ task test
task: [install] uv sync
task: [install] pnpm install
task: [test] uv run pytest
========================== 8 passed in 1.2s ==========================
task: [test] pnpm test
✓ 12 tests passed (4 suites)

$ task test
task: Task "install" is up to date
task: [test] uv run pytest
========================== 8 passed in 0.8s ==========================
task: [test] pnpm test
✓ 12 tests passed (4 suites)
```

Second run skipped installation (cache hit), saving 15+ seconds.

## Lessons Learned

**The `deps` feature is powerful.** Every command that needs dependencies (test, build, dev, lint) declares `deps: [install]`. Task automatically runs prerequisites only when needed. This pattern eliminated duplicate "check if installed" logic from individual scripts.

**Precondition checks matter.** The `_check-prereqs` task validates that `uv` and `pnpm` are available before attempting installation. Clear error messages with installation instructions are better than cryptic command-not-found failures.

**Cross-platform worked first try.** Task is a Go binary, and our commands (uv, pnpm, pytest) already worked cross-platform. The `Taskfile.yml` syntax has no platform-specific assumptions.

## What's Next

CI integration. GitHub Actions will install Task and use the same commands developers run locally. No CI-specific scripts, no "it worked in CI" mysteries.

We'll also consider a `task check` command to validate environment setup (correct Python/Node versions, required tools present) for new contributors.

→ [See the Taskfile.yml](https://github.com/debrief/debrief-future/blob/017-task-build/Taskfile.yml)
→ [Read the specification](https://github.com/debrief/debrief-future/blob/017-task-build/specs/017-task-build/spec.md)
