---
layout: future-post
title: "Building the Storyboard edit suite — webview wiring + web-shell harness"
date: 2026-04-24
track: [credibility]
author: Ian
reading_time: 7
tags: [storyboarding, vscode-extension, playwright, testing, reducer]
excerpt: "A chevron next to each Scene, a right-click menu for the full action set, stale badges that clear on refresh — and a web-shell harness that drives the whole polish loop without VS Code."
---

## What We're Building

The Storyboard panel has always promised a polish loop: capture a scene, tweak its description, mark the stale ones, refresh the thumbnails, reorder, duplicate, delete. In #218 we shipped the machinery that makes all of that work — the services, the dispatcher, the components, the command handlers — but the last mile was still missing. Analysts could reach every action, just not from inside the panel. Edits lived in the command palette, the overflow menu was a stub, and the stale badge had nowhere to click through to. The panel looked half-wired because it was half-wired.

This feature closes the gap. A chevron next to each Scene's description opens an inline edit form; right-click on a row reveals the full action set — Edit, Update to current, Duplicate, Copy to other storyboard, Delete, Refresh thumbnail — without leaving the panel. Stale badges light up when a Scene's source features have moved since capture, and you can refresh individually or in bulk from the same surface. Two long-standing first-open papercuts also get fixed along the way: the spurious "viewport not reported" toast on a fresh plot, and the unexplained "Failed to load plot" surprise that has haunted demo sessions. When this ships, the Storyboard panel becomes a place an analyst can actually live in for an afternoon's work.

## How It Fits

Feature #218 shipped 94 of 104 planned tasks with 2,983 green tests, but it deferred the webview wiring, the Playwright coverage, and the Phase 6 evidence package. This is the completion patch. It is the difference between "the services work" and "the feature is usable", and it is the last thing standing between #218 and its shipped blog post.

It also sets up something the rest of the v4.x rebuild will keep benefitting from. Until now, Storyboard's end-to-end coverage lived inside a VS Code iframe under code-server, which has been a consistent source of flake. This work introduces a web-shell harness — a headless surface that speaks the same postMessage contract as the real extension — as the primary Playwright target. VS Code tests stay reserved for flows that genuinely need VS Code chrome (command palette, native quick-picks, real notifications). Everything else migrates to a surface we can trust. That decision pays forward: every future panel in the thick-services-thin-frontends architecture can lean on the same harness pattern, and the offline-by-default constraint is preserved because nothing new reaches the network.

## Key Decisions

The shared reducer is the spine of this feature. Rather than maintain two behavioural layers — one for the VS Code webview, one for the web-shell harness, one for Storybook — we extracted `useStoryboardEditReducer` as a pure, typed reducer that all three surfaces consume. The production panel, the Playwright target, and the interactive Storybook stories all run the same state transitions. If a reducer case is wrong, every surface fails together; if it is right, there is no drift between what reviewers click through in Storybook and what analysts experience in VS Code. The four edit-suite stories (`WithEditForm`, `WithUndoToast`, `WithStaleBadge`, `WithMissingDataRemediation`) upgrade from static props to the real reducer, so Storybook becomes a live behavioural reference instead of a shallow visual one.

For the two first-open errors, the instinct was to reach for a fix first and a diagnosis after. I am doing the opposite: before touching either bug, I am adding structured logging to every null-return branch of `stacService.loadPlot` so the root cause of "Failed to load plot" can be read off the output channel rather than guessed at. The viewport race is handled at mount time by emitting the initial viewport event twice — after React mount and after Leaflet's `whenReady` — leaning on the session store's idempotent per-field reducer to make the doubled emission harmless. Diagnostics first, fixes second, means we learn something about the system even if the fix turns out to be wrong.

And the whole thing ships with zero new runtime dependencies. The reducer is `useReducer`. The Scene overflow menu is a native `<menu role="menu">` with ARIA and keyboard navigation, audited by `@axe-core/playwright`. The harness is a query-string branch inside the existing web-shell app. The Playwright runner uses the `@sparticuz/chromium` toolchain already in place for CI. Constitution Article IX stays satisfied, and the dependency graph does not grow to pay for the polish.

## Screenshots

The web-shell harness is the primary E2E surface. Every flow below is reproducible in a browser by visiting `?storyboard-edit-harness=1` with the supported query-string knobs (`?stale=…`, `?pendingDelete=…`, `?missingData=…`).

**Panel at rest** — fixture Storyboard, three Scenes, chevron + overflow trigger visible on each row.

![Storyboard panel at rest](/assets/images/future-debrief/storyboard-edit-suite-webview-wiring/storyboard-panel-default.png)

**Inline edit form open** — chevron clicked, `<SceneEditForm>` rendered in place, `aria-expanded=true`.

![Inline edit form open](/assets/images/future-debrief/storyboard-edit-suite-webview-wiring/storyboard-edit-form-open.png)

**Overflow menu open** — six items rendered via `role=menu`/`role=menuitem`, positioned from the row's bounding rect.

![Overflow menu open](/assets/images/future-debrief/storyboard-edit-suite-webview-wiring/storyboard-overflow-menu-open.png)

**Undo toast after Delete** — row soft-removed, session-scoped undo pinned to the bottom.

![Undo toast after delete](/assets/images/future-debrief/storyboard-edit-suite-webview-wiring/storyboard-undo-toast.png)

**Stale badge with tooltip** — Scenes flagged stale by the `?stale` knob, unresolved feature IDs rendered.

![Stale badge with tooltip](/assets/images/future-debrief/storyboard-edit-suite-webview-wiring/storyboard-stale-badge.png)

**Missing-data remediation** — hard-block affordance inside the edit form.

![Missing data remediation](/assets/images/future-debrief/storyboard-edit-suite-webview-wiring/storyboard-missing-data-remediation.png)

## By the Numbers

- 88 new tests: 26 reducer unit + 22 component + 7 Playwright E2E + 2 STAC-diagnostic + 7 query-string parser + 4 StoryboardPanel-level + 20 regression-validated view-provider tests.
- 0 new runtime dependencies.
- 0 regressions in the #218 baseline: 1,854 components + 545 vscode + 332 MapView tests still pass.
- 2 pre-existing errors triaged: first-open viewport race (fixed) + STAC load failure attribution (diagnostic-first).
- 3 surfaces share one reducer: the VS Code webview, the web-shell harness, and the interactive Storybook stories.
- 1 spec bounded invariant preserved: `refresh()` stays O(active-storyboard Scenes) per FR-008 / review 13A.
- 6 evidence screenshots captured for #218's Phase 6 package.

## Lessons Learned

Diagnostic-first discipline paid off on the STAC-load issue. The previous pattern was "guess at a fix, see if it clears the toast, move on if it does" — which is how we ended up with a silent `Failed to load plot` in the first place. This time, the fix was to add four distinct diagnostic strings at each null-return branch before attempting anything else. The next reproduction will attribute the failure to a specific branch, and the actual bug fix becomes cheap and safe. This is the pattern I want the rest of the v4.x rebuild to follow for incumbent-quirk bugs.

The shared-reducer decision earned its keep immediately. While wiring the overflow menu, I discovered that the close-behaviour I had implemented in the VS Code webview was subtly different from what the harness expected. Because both surfaces were running the same reducer, the test I wrote against the harness flagged the bug before the extension host ever saw it. That "you cannot ship a broken story with a working harness" claim is already paying off in developer time.

The Playwright bundle size warning is an old friend by now. Web-shell's dev bundle is >500KB, and the CI build flags it every time. This feature did not address it, but the harness's entry point is a single page that could in principle be route-split. That is a cleanup item for a later cycle; for now the warning is accepted and documented.

## What's Next

- **Full thumbnail deep-copy on copy-to-other** (#216/#174). Today the copy action uses a shallow copy that shares the thumbnail asset reference; the real fix lives in #216's thumbnail service work and in #174's thumbnail-capture pipeline.
- **LogPanel collapser wiring** (#176). `collapseStoryboardEdits` landed in #218 as a pure function but is not yet plumbed into `LogTimeline`. That is scoped to #176.
- **LinkML round-trip for the edit view-models** (#215). `SceneEditViewModel` and `StoryboardEditViewModel` live in TypeScript today; the schema-first commitment says they should be derived from LinkML. That migration rides #215's broader schema consolidation.
- **Additional Playwright scenarios**. The smoke suite here covers the backbone flows; the full #218 evidence-requirements table also calls for rename prompts, duplicate-timestamp conflicts, copy-to-other destination picker, deep-copy failure path, and an interaction GIF of the rename → describe → delete+undo → refresh-stale sequence. The harness + page object support those with no additional scaffolding; the work is straightforward once someone picks them up.
- **Thin VS Code code-server E2E**. The `test-storyboard-edit.spec.ts` spec in `apps/vscode/tests/e2e/` is planned but not yet written — it belongs to a follow-up and should cover only the flows that genuinely need VS Code chrome (palette invocation, `showInputBox`, `showQuickPick`, native toasts).
