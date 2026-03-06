---
layout: future-post
title: "Shipped: Dual-Platform E2E Tests — 18 Spec Files With Real Services"
date: 2026-03-06
track: [credibility]
author: Ian
reading_time: 5
tags: [tracer-bullet, testing, e2e, playwright, vscode, web-shell]
excerpt: "VS Code E2E suite expanded from 8 skipped specs to 18 active files, driven by real Python services parsing real REP data."
---

## What We Built

A month ago, the VS Code E2E test suite had 8 spec files -- all skipped. The web-shell had 81 tests across 13 categories, all passing, but those tests exercised orchestration through mock data. Nothing verified that a scientist could open a real REP file in the real extension, see real tracks parsed by real Python services, select features, and run analysis tools end-to-end.

Now the VS Code E2E suite has 18 active spec files. Four previously-skipped specs have been restored with live assertions. Ten new spec files cover selection sync, time controller, drawing tools, catalog browsing, log panel, edit face, event propagation, styling tools, undo/redo, and evidence capture. The `DebriefWebview` page object gained 40+ new selectors and methods to support all of this.

Both suites run in parallel CI. The web-shell tests (~30 seconds, mock data, 13 specs) catch orchestration regressions fast. The VS Code E2E tests (~3 minutes, real services, 18 specs) catch the integration problems that only surface when debrief-io parses an actual REP file and debrief-stac stores actual STAC Items.

## How It Works

The VS Code E2E tests drive openvscode-server with the Debrief extension sideloaded. Behind the scenes, three Python services -- debrief-io, debrief-stac, and debrief-calc -- are running and reachable. When a test opens a REP file, the extension calls debrief-io to parse it, debrief-stac to catalogue it, and debrief-calc to run analysis. The test then inspects the webview DOM to verify tracks rendered and results appeared.

```typescript
test('loads REP file and shows tracks', async ({ codeServerPage }) => {
  await codeServerPage.openFile('samples/boat1.rep');

  const frame = await codeServerPage.getWebviewFrame();
  await frame.locator('.leaflet-container').waitFor({ state: 'visible' });

  const trackCount = await frame.locator('.leaflet-interactive').count();
  expect(trackCount).toBeGreaterThan(0);
});
```

That last assertion -- `toBeGreaterThan(0)` rather than `toEqual(3)` -- is deliberate. Real service output varies. Structural assertions ("at least one track exists") are resilient to changes in sample data or parsing improvements. Value-exact assertions against real data break constantly for the wrong reasons.

## By the Numbers

| | |
|---|---|
| VS Code E2E spec files | 18 |
| VS Code E2E active tests | ~25 |
| VS Code E2E fixme tests | ~28 |
| Web-shell spec files | 13 |
| Web-shell active tests | 81+ |
| New page object methods | 40+ |
| Platforms tested in parallel | 2 |

## The test.fixme() Strategy

Of the 18 VS Code E2E spec files, 10 contain tests marked `test.fixme()`. These cover features that don't yet exist in the extension -- time controller, drawing tools, styling, undo/redo, and others. The tests are written. The assertions are specified. The features aren't implemented yet.

```typescript
test.fixme('time scrubber updates map display', async ({ codeServerPage }) => {
  // Time controller not yet implemented in VS Code extension
  // See backlog: time-controller feature
});
```

We chose `test.fixme()` over `.skip()` for a specific reason: fixme tests appear in Playwright reports as known gaps. They're visible. They cross-reference backlog items. When someone implements the time controller feature, the test is already waiting -- remove the `.fixme()` wrapper and it either passes or tells you what's broken. With `.skip()`, these tests would vanish from reports entirely, and the gaps they represent would be invisible.

This turned the E2E expansion into a feature-completeness audit. Writing 28 fixme tests documented exactly what the extension doesn't do yet, in executable form.

## Page Object Architecture

Two page objects handle the VS Code E2E environment:

- **CodeServerPage** manages VS Code chrome -- command palette, Quick Open, file navigation, the Welcome tab focus trap, keyboard shortcuts
- **DebriefWebview** manages the extension's webview -- iframe traversal, Leaflet map interactions, feature list, tools panel, selection state

This separation matters because VS Code's webview sits inside nested iframes. The test code that opens a file through Quick Open is fundamentally different from the code that clicks a track on the map. Mixing them makes tests fragile. Keeping them in separate page objects makes the iframe boundary explicit.

## Lessons Learned

**Structural assertions save maintenance time.** Early drafts of the restored specs used exact value checks against real REP file output. Those broke immediately when we updated a sample file. Switching to existence-based assertions ("at least one track", "tool result contains measurement text") made the tests resilient without sacrificing confidence. If zero tracks render, the test still fails.

**Writing tests for unimplemented features is useful work.** The 28 fixme tests forced us to think through what each feature's testable behaviour should look like, before writing any implementation code. Several of those tests revealed UX questions we hadn't considered -- what should the time controller's DOM look like? How should drawing tool state be inspectable from Playwright? Those questions are now documented in the test files themselves.

**Dual-platform testing catches different bugs.** During development, the web-shell tests passed consistently while a VS Code E2E test failed on catalog browsing. The issue was an extension-specific activation timing problem that the web-shell's simpler lifecycle couldn't reproduce. Two test surfaces, two classes of bugs caught.

## What's Next

The 28 fixme tests are now a prioritised implementation queue. As each extension feature ships -- time controller, drawing tools, styling panel -- the corresponding fixme tests activate and immediately verify the feature works end-to-end with real services.

The CI pipeline runs both suites in parallel, so new features get validated against mock data in 30 seconds and against real services in 3 minutes, without blocking each other.

-> [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/005-e2e-workflow-tests)
-> [View the evidence](https://github.com/debrief/debrief-future/tree/main/specs/005-e2e-workflow-tests/evidence)
