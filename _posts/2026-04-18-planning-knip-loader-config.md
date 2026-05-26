---
layout: future-post
title: "Planning: Knip config for the Electron loader — plus a CI gate"
date: 2026-04-18
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, tooling, loader, developer-experience, ci]
excerpt: "Two shortcuts would have made knip quiet. Neither would have made it honest. Here's what we chose instead."
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

## What We'd Love Feedback On

- Is there a fourth Electron entry category we're missing? Test files and build scripts resolve through other tooling, but if your Electron app has a path these three don't cover, say so.
- Anyone running knip as a CI gate in a similar monorepo shape? Pitfalls we should walk into with eyes open — flaky runs, memory footprint, cache invalidation — would be useful to hear before we commit.
- The contract rejects `ignore`. Is that too strict? The argument for strictness is that every ignore entry is a finding we've chosen not to fix; the argument against is that genuine false positives will eventually show up elsewhere. Where's the line?

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/201-knip-loader-config/spec.md)
