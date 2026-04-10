---
layout: future-post
title: "Shipped: Restore Previously-Open Plots on Startup"
date: 2026-02-06
track: [credibility]
author: Ian
reading_time: 4
tags: [vscode-extension, session-state, tracer-bullet]
excerpt: "Plots opened in one session automatically restore when VS Code restarts, no manual re-opening required."
---


## What We Built

The small friction of losing your workspace when VS Code closes — whether by intention or crash — is gone. A maritime analyst now reopens VS Code and their plots are already there: the same ones, in the same order, with the same exercise context. If a plot file was deleted or moved, it silently doesn't reappear. No error dialogs, no hunting through the STAC catalog.

The mechanics are simple from the user side, but they required threading the persistence layer carefully through the extension. We created a new `OpenPlotsService` that sits alongside `RecentPlotsService` (which tracks history) and manages current state instead. Every time a plot opens or closes, the service writes an updated list of `stac://` URIs to VS Code's `workspaceState` — that's the workspace-scoped persistence layer that survives crashes. On startup, the extension reads that list and sequentially reopens each plot using the existing `openPlot` command, with no special code path or duplication.

Sequential restoration matters here. `MapPanel` uses a singleton pattern, and spawning all opens in parallel would create race conditions both in the panel lifecycle and in session state tracking. The sequential approach takes longer with many plots, but it's correct, and the user doesn't see it — restoration happens as a background task while they work.

## Architecture

The implementation follows the pattern established by `RecentPlotsService`. Three files carry the weight:

**Type definitions** (`apps/vscode/src/types/openPlots.ts`) — just the shape of what we're storing and returning.

**The service itself** (`apps/vscode/src/services/openPlotsService.ts`) — five responsibilities:
- `addPlot(uri)` — called when a plot opens, adds URI if not already there
- `removePlot(uri)` — called when a plot closes, removes URI from state
- `clearAll()` — wipes the persisted list entirely
- `getOpenPlots()` — returns current state as array of URIs
- `restoreOnStartup()` — walks the persisted list and calls `openPlot` for each, wrapping failures in try/catch so a missing plot doesn't break restoration of the rest

The service uses VS Code's `memento` API for `workspaceState`, which is what we pass it during extension activation. That memento is the single source of truth — if it's not there, it's not open.

**Integration** — the open command calls `service.addPlot()` after a plot loads, the close command calls `service.removePlot()` and `service.clearAll()` goes into the `deactivate()` hook to wipe state when the user explicitly closes the extension (not on shutdown, that's when crashes matter, but this covers the case where someone uninstalls or disables it). Extension activation calls `restoreOnStartup()` early, before other subsystems initialize, so the plots are reloaded and ready before the UI becomes interactive.

## Testing & Confidence

We covered all four user stories with 28 unit tests — 7 tests per story. The matrix:
- Single plot restoration works end-to-end
- Multiple plots restore in the order they were opened
- Missing plots are silently skipped and cleaned from state
- Explicit closure via `clearAll()` leaves no traces in state

Each test is isolated, uses fixtures for URIs and `memento` mocks, and verifies both the service state and the side effects (which commands were called, what happened to the persisted list).

## What Surprised Us

Real-time persistence (writing on every open/close, not just shutdown) turned out to be simpler and more correct than we expected. VS Code's `memento` API is straightforward — it's just key-value with no serialization hassle. The temptation was to batch writes, but that adds state tracking code that we don't need. Write every time, it's fast and it's safe.

The sequential restoration could have been a bottleneck, but the openPlot command pipeline is already optimized, so even 20 plots in sequence feels snappy.

## What's Next

This is the last piece of session restoration in this cycle. The next layer — restoring view state (zoom, pan, time position) — would require threading state through `MapPanel` and the timelineController, and we're deferring that until we have clearer requirements. One thing at a time.

The open plots list is now a reliable feature of the session state. Next work builds on top of it: we're eyeing session export/import (save my current set of open plots as a named workspace), and eventually analytics on plot usage patterns (which plots do analysts have open together? what exercises are revisited most?).

→ [See the code](https://github.com/debrief/debrief-future/tree/main/apps/vscode/src/services/openPlotsService.ts)
→ [See the tests](https://github.com/debrief/debrief-future/tree/main/apps/vscode/tests/unit/openPlotsService.test.ts)
