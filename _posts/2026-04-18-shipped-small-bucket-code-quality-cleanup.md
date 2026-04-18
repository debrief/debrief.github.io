---
layout: future-post
title: "Shipped: Small-bucket code-quality cleanup"
date: 2026-04-18
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, code-quality, tech-debt, developer-experience, testing]
excerpt: "Five small cleanups bundled into one PR: false-positive silencing, type consolidation, a regression test, and TODO promotion."
---

## What We Built

Five low-risk cleanups from the PR #465 code-quality review pass, shipped as a single bundled PR so reviewer overhead stayed low while the noise actually got cleared:

1. **Knip false-positive silencing** — added a root `knip.json` with `"ignore": ["specs/**"]`, silencing 57 specs-related entries that knip was reporting as "unused" (they are speckit contracts, not production code). We pinned `knip` to `5.88.1` as a root `devDependency` to close a reproducibility gap — `pnpm dlx knip@latest` was drifting between contributors depending on what shipped that morning.

2. **LogPanel prop consolidation** — merged `LogTimelineProps` and `LogByFeatureProps` into a single `LogPanelProps` interface in `shared/components/src/LogPanel/types.ts`. The two interfaces were effectively the same shape, slowly drifting. One canonical interface stops future reviewers second-guessing which one to update.

3. **ADR-019** — documented two `import type`-only cycles in the VS Code extension (`mapPanel → activityPanelView → calcService` and `activityPanelView → resultsPanelService`) in `docs/project_notes/decisions.md`. Both are erased at runtime. The cycles are deliberate for now; interface extraction is the eventual fix but a bigger job. The ADR ensures a future refactor does not waste a day "fixing" something already considered and accepted.

4. **Loader `plotName` fix** — replaced a `// TODO: Get actual name from plot list` placeholder in `apps/loader/src/renderer/hooks/useLoadWorkflow.ts` with a proper lookup that threads the plot's display name from the plot list instead of its ID. The one-line fix is backed by a new vitest in `apps/loader/tests/unit/useLoadWorkflow.test.ts` that fails if anyone reintroduces the placeholder. A revert-and-red sanity check proved the test was a real gate, not a tautology.

5. **TODO promotion** — filed two new GitHub issues (#472 "Manage Stores" tab, #473 "Create new store" button) and replaced bare `// TODO:` markers in the loader with `TODO(#472):` and `TODO(#473):` references. A pre-push grep guard (`grep -rn "TODO(#NNN)" apps/`) prevents shipping literal placeholders when someone forgets the final step.

Bonus: removed `shared/components/diff/`, an orphaned staging artefact with zero consumers.

## By the Numbers

| | |
|---|---|
| False positives silenced | 57 (under `specs/**`) |
| Full test suite | 3930 passing |
| LogPanel tests still green | 1564 |
| Type consolidation diff | 6 files, 45 insertions, 79 deletions |
| ADR count | 18 → 19 |
| GitHub issues filed for TODO promotion | 2 (#472, #473) |

## Key Lessons

**Knip drift trap → pinning plus baseline.** Running `pnpm dlx <tool>@latest` looks reproducible until two contributors get different tool versions and see conflicting reports. Pinning the version to root `devDependencies` and capturing a baseline diff is the antidote. Now `pnpm install` on a clean clone resolves to the same binary every time.

**Silent-failure pattern → pre-push grep guards.** When the workflow says "replace `TODO:` with `TODO(#NNN):`", a pre-push grep is what stops a literal placeholder shipping when someone forgets the final step. Guards beat process — a shell script at pre-push time catches what a checklist misses.

**Test-first for the one runtime change.** Even small bug fixes that touch user-visible behaviour earn a regression test. The revert-and-red sanity check — temporarily re-apply the placeholder, watch the test go red, then restore the fix and watch it go green — proved the test was a real gate we can trust.

## What's Next

Interface extraction for the two VS Code type-only cycles is named in ADR-019 as the eventual fix. Not in scope here — but the ADR ensures a future contributor does not burn a day re-deriving why the cycles are accepted, and the remediation path is documented so whoever picks it up does not have to start from scratch.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/199-code-quality-cleanup/spec.md)
→ [View the evidence](https://github.com/debrief/debrief-future/tree/main/specs/199-code-quality-cleanup/evidence)
