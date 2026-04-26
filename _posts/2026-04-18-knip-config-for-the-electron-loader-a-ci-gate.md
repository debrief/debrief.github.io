---
layout: future-post
title: Building Knip config for the Electron loader — a CI gate
date: '2026-04-18'
author: Ian
track: momentum
tags:
- ci
- dev-experience
- loader
- tooling
excerpt: 'We shipped both refusals: the orphan is gone, the dependency is pinned,
  and the scanner is now a CI gate.'
reading_time: 4
---
## What We're Building

Running the unused-code scanner (`knip`) across the monorepo today reports twelve findings under `apps/loader/src/main/**`. Eleven are false positives — knip can't infer where an Electron app starts, so every main-process module looks unreachable. The twelfth, `apps/loader/src/main/updater.ts`, is a genuine orphan: a commented-out `electron-updater` import, zero call sites, no tests referencing it.

This feature does three things, not one:

1. Adds a fifteen-line `knip.json` at the repo root declaring three entry points for `apps/loader` — main (`src/main/index.ts`), preload (`src/preload/index.ts`), renderer (`src/main.tsx`). The eleven false positives vanish.
2. Deletes `updater.ts`. Wiring up auto-update is a real feature (needs the dependency, code signing, an update server) and belongs in its own spec. Until then, the module is weight.
3. Adds a `task knip` target and a "Run knip" step to `.github/workflows/ci.yml` directly after the lint step. Knip becomes a gate, not a diagnostic.

Twelve findings become zero, and stay zero.

## How It Fits

This is hygiene and infrastructure, not a capability. Nothing changes for users of Debrief. The audience is contributors — present and future — who run the scanner and want to trust its output.

The config sits at the repo root next to `pnpm-workspace.yaml`. Knip moves from ad-hoc (`pnpm dlx knip`) to a pinned dev dependency invoked via `pnpm exec knip`. That flip matters: once CI depends on knip's output, the version has to be reproducible. Article I.4 (reproducible builds) and Article IX.2 (pinned versions) together rule out `dlx` for anything on the critical path.

## Key Decisions

Two shortcuts were on the table. We refused both.

- **Shortcut one: "just `dlx` it, don't pin it."** One line lighter in `package.json`. Refused — the moment CI consumes a tool's output, its version has to be locked. A silent knip upgrade shouldn't be able to turn a green build red, or a red build green.
- **Shortcut two: "just add `ignore: [updater.ts]`, don't delete it."** Zero source changes. Refused — an ignore list would have made the scanner output clean and the codebase quietly dishonest. The scanner is supposed to tell us the truth. Silencing a true finding to get a green report is worse than no scanner at all.

Both shortcuts would have left a *working* scanner. Neither would have left an *honest* one. "Engineered enough" for a scanner means it tells the truth under load.

Other decisions worth naming:

- **One top-level config, not per-workspace.** Discoverability beats locality for monorepo-wide tooling.
- **All three Electron entry categories in one pass.** Future contributors shouldn't hit a fresh cloud of false positives the moment they touch the loader.
- **Schema-enforced scope.** A JSON Schema under `specs/201-knip-loader-config/contracts/` rejects `ignore` keys and extra workspace stanzas on `knip.json`. If someone tries to quiet a future finding by expanding this file, validation fails before review does. Backlog item #199 wants to add `ignore: ["specs/**"]` to the same file — we've left a coordination note so whoever picks it up knows the schema needs updating alongside the config.
- **Evidence captured.** A before/after knip transcript plus the first CI run log go in `evidence/`, so the next maintainer can audit the premise in under five minutes.

Three weeks ago we planned to set up an unused-code scanner for the Electron loader with a promise: twelve findings would become zero, and stay zero. We shipped exactly that.

The baseline was straightforward. Running `knip` across `apps/loader/src/main/` reported twelve findings. Eleven were false positives — knip can't infer where an Electron app starts, so every module in the main process looked unreachable. The twelfth, `updater.ts`, was real: a commented-out `electron-updater` import with zero call sites.

We could have quieted the scanner two ways. Both were shortcuts; both were wrong.

**Shortcut one:** add `ignore: [updater.ts]` to the config. Zero source changes, clean output, a codebase quietly hiding a true finding. Refused — a scanner that silences real findings is worse than no scanner.

**Shortcut two:** run knip ad-hoc via `pnpm dlx` instead of pinning it. One line lighter in `package.json`. Refused — the moment CI depends on a tool's output, its version has to be locked. A silent upgrade shouldn't turn a green build red.

Instead we shipped:

1. A fifteen-line `knip.json` at the repo root declaring three entry points for the loader: main (`src/main/index.ts`), preload (`src/preload/index.ts`), renderer (`src/main.tsx`). The eleven false positives are now gone.
2. Deletion of `updater.ts`. Auto-update is a real feature that belongs in its own spec (it needs code signing, an update server, proper testing). Until then, the module is weight.
3. A `task knip` target in the `Taskfile.yml` and a "Run knip" step in `.github/workflows/ci.yml` directly after lint. Knip is now a gate, not a diagnostic.
4. Knip pinned as a dev dependency at `^5` (resolved to 5.88.1 in the lockfile). No more `pnpm dlx`.
5. A JSON Schema under `specs/201-knip-loader-config/contracts/` that rejects `ignore` keys and extra workspace stanzas on `knip.json`. If someone tries to quiet a future finding by expanding the file, validation fails before review does.

## By the Numbers

| Metric | Result |
|--------|--------|
| Findings under `apps/loader/src/main/` | 12 → 0 |
| CI gate added | Yes |
| Genuine orphans deleted | 1 |
| Config file size | 15 lines |
| Pinned knip version | 5.88.1 |
| Pre-existing findings elsewhere | Visible, non-blocking |

## How It Fits

This is infrastructure and hygiene, not a capability. Nothing changes for users of Debrief. The audience is contributors — present and future — who run the scanner and want to trust its output.

The config sits at the repo root next to `pnpm-workspace.yaml`, the natural place for monorepo-wide tooling. Knip moves from ad-hoc to reproducible. That matters because once CI depends on a tool, its version has to be locked (Article I.4 and Article IX.2 of the constitution call this out).

## Lessons Learned

**Workspace-scoped, not full-tree.** The task targets `apps/loader` specifically. Full-tree knip is blocked by a pre-existing jiti-loader issue in `apps/spec-navigator/playwright.config.ts` — we documented that boundary clearly. Coverage for other workspaces is a future feature, not a reason to do partial work.

**Schema enforcement works.** The contract that rejects `ignore` entries actually prevented a shortcut during implementation. That's the signal that schema-enforced scope is worth the effort — it stops honest mistakes before review does.

**Evidence is in the PR.** Before/after knip transcripts and the first CI run log are in the `evidence/` directory. The next maintainer can audit the premise in under five minutes.

## What's Next

Backlog item #199 (code-quality cleanup) will extend the same `knip.json` next, adding `ignore: ["specs/**"]` to the config. We left a coordination note in the PR description so whoever picks it up knows the schema in `contracts/` needs updating alongside the config change.

→ [See the PR](https://github.com/debrief/debrief/pull/202)
→ [See the contract](https://github.com/debrief/debrief/blob/main/specs/201-knip-loader-config/contracts/knip-schema.json)
