---
layout: future-post
title: "Shipped: Storyboard edit suite — closure pass"
date: 2026-04-27
track: [credibility]
author: Ian
reading_time: 4
tags: [storyboarding, vscode-extension, playwright, accessibility, performance, storybook]
excerpt: "Five quality items deferred from the wiring patch — interactive stories, code-server E2E, axe audit, perf budget, full scenario set — closed in one PR."
---

## What We Built

The Storyboard edit suite shipped its wiring patch in #230 with five quality items pushed onto a follow-up. This is that follow-up. One PR closes all of them: the four edit-suite Storybook stories now drive the real reducer instead of frozen `args`; a thin code-server E2E spec exercises the eleven commands that need VS Code chrome; an axe-core audit covers seven surfaces across three themes; a performance test pins `composeSceneEditViewModels` to a ≤50 ms median budget; and the Playwright suite expands from a smoke pass to the full polish loop, capped with a five-second interaction GIF.

The headline change for reviewers is that the four edit-suite stories — `WithEditForm`, `WithUndoToast`, `WithStaleBadge`, `WithMissingDataRemediation` — are now interactive. Open one in Storybook, click the chevron, type into the form, hit save, see the row update. The same reducer that runs in the VS Code webview runs the story, so what reviewers see is what analysts get.

![Storyboard edit panel inside VS Code, with three Scenes, an open inline edit form, and the Debrief sidebar visible](/assets/images/future-debrief/shipped-storyboard-edit-polish/vscode-storyboard-panel.png)

![Animated walkthrough of the polish loop: rename, describe, delete with undo, then refresh the stale Scene](/assets/images/future-debrief/shipped-storyboard-edit-polish/interaction.gif)

## How It Works

The architecture pivot is documented as ADR-027. The original plan wrapped the panel in a `PortContext` provider with a discriminated `OutboundMessage` union and a production webview rewrite. The revised plan is a single callback-adapter helper. `storyOnlyMockHandlers` (under `shared/components/src/panels/StoryboardPanel/__testing__/`) translates panel callbacks into reducer dispatches and exposes them as `Pick<StoryboardPanelProps, …>`. Stories and the web-shell harness spread the result onto `<StoryboardPanel>` directly. The production entry at `apps/vscode/src/webview/web/storyboardPanel.tsx` is untouched. The panel stays purely presentational, and Article XV's strict-type guarantee comes from the existing typed callback-prop surface — when a new callback is added, the helper's contract widens automatically and missing implementations break the build.

The code-server suite is deliberately thin. `tests/e2e/test-storyboard-edit.spec.ts` covers the eleven commands that genuinely need VS Code chrome — palette invocation, `showInputBox`, `showQuickPick`, and native notification toasts — and nothing else. Click flows belong to the web-shell harness, which is already faster and less flaky.

![Code-server chrome: command palette open with Storyboard commands listed, native quick-pick visible](/assets/images/future-debrief/shipped-storyboard-edit-polish/vscode-native-chrome.png)

The accessibility audit lives at `apps/web-shell/playwright/tests/storyboard-edit-a11y.spec.ts`. It runs `@axe-core/playwright` against three harness states and four story iframes across three themes, then categorises results through a small `a11yCategoriser.ts` helper (serious / critical / moderate / minor). Three real violations surfaced and were fixed, not suppressed: the `SceneList` role hierarchy was restructured, an unsupported `aria-expanded` placement was removed, and the `StaleBadge` contrast went from 2.33:1 to 5.4:1. Final report: zero serious, critical, or moderate violations across all seven surfaces.

The interaction GIF flow is the only piece that touches a system binary. Playwright's `recordVideo` produces a `.webm` that `videoToGif.ts` converts via ffmpeg with a palette pipeline. ffmpeg is surfaced explicitly through a new `task verify:ffmpeg` Taskfile target so the assumption is auditable rather than implicit; missing binaries fail fast with remediation guidance. Output is capped at 5 s with a 2 MB hard ceiling.

![Stale badge on a Scene row, with tooltip explaining which source features have moved since capture](/assets/images/future-debrief/shipped-storyboard-edit-polish/storyboard-stale-badge.png)

## By the Numbers

- 91 new tests across 8 phases: 79 pass, 14 skipped, 0 fail.
- 150 existing `StoryboardPanel` tests stay green after the a11y fixes.
- 19 Playwright tests across three new specs (smoke, a11y audit, interaction recording).
- 12 live tests pass against openvscode-server with all 10 edit commands verified reachable.
- Perf median: 0.017 ms against a 50 ms budget — ~3000× headroom on the 5 × 50-Scene fixture.
- A11y: zero serious, critical, or moderate violations across 7 surfaces × 3 themes.
- 0 new npm runtime dependencies. ffmpeg surfaced as a system binary via `task verify:ffmpeg`.

## Key Decisions

A new ESLint `no-restricted-imports` rule under `apps/vscode/` forbids production code from importing `**/__testing__/**`. The callback-adapter helper, the fixture seed, and the in-memory mock state are now physically unreachable from the extension entry — the boundary is enforced at lint time, not by convention.

The performance test is a regression guard for the active-only invariant from #230, not a benchmark. `composeSceneEditViewModels` runs 100 iterations against 5 storyboards × 50 scenes (50 active), and CI tolerates a 60 ms median (20% over the local 50 ms target). Re-baselining requires a documented justification tied to schema, fixture, or composition changes — never a silent relaxation.

## What's Next

The Storyboard work moves on to #229 — animated time-range Scenes and export. The interactive stories that landed here become the executable walkthroughs that future feature posts can link to instead of recording fresh videos every time.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/234-storyboard-edit-polish-followup/spec.md)
→ [View the evidence](https://github.com/debrief/debrief-future/tree/main/specs/234-storyboard-edit-polish-followup/evidence)
