---
layout: future-post
title: "Shipped: Logical Result ID Registry"
date: 2026-02-13
track: [credibility]
author: Ian
reading_time: 4
tags: [tracer-bullet, results-visualization, provenance]
excerpt: "Maps stable result IDs to current files, emits change events when tools re-run, sets foundation for auto-refresh"
---

## What We Built

The Logical Result ID Registry provides the indirection layer that lets result views stay synchronized with tool outputs. When a tool produces `bt_plot_001_v1.png`, the registry maps the stable ID `bt_plot_001` to that file. When the analyst tunes a parameter and the tool produces v2, the registry updates the mapping and emits a change event. Views that subscribed to that result ID get notified. No polling, no scanning, no coupling between tool execution and result display.

37 new tests, 521 total tests passing, zero regressions.

## How It Works

The registry lives in `@debrief/session-state` as a pure in-memory Map with callback subscriptions. It populates from two sources: STAC asset metadata when a plot loads, and Log Service entries when tools run.

On plot load, `hydrateFromAssets()` scans STAC assets for `debrief:resultId` and `debrief:version` metadata. For each logical ID, it selects the highest version. A plot with `bt_plot_001_v1` and `bt_plot_001_v2` assets hydrates with v2 as the current mapping. Hydration is bulk initialization -- no change events fire, keeping the initial load quiet.

When a tool executes, the Log Service records a `RecordResult` entry with `generatedResultId` and `generated` fields. The registry observes these entries through `registerFromRecordResult()`, extracts the result ID and file path, and updates its mapping. This time a change event fires, notifying any subscribers that the result has updated.

Subscriptions come in two flavors. `subscribe(resultId, callback)` delivers notifications only for a specific result ID. `subscribeAll(callback)` delivers notifications for any change. Both return an unsubscribe function. When a result view closes, it unsubscribes, and the registry cleans up the callback. When the plot closes, `clear()` wipes all mappings and subscriptions.

The VS Code extension creates the registry in `extension.ts`, hydrates it in `openPlot.ts`, updates it in `executeTool.ts` after tool runs, and again in `logPanelView.ts` after replay operations like tune and revert.

## Integration Points

The registry provides three registration methods, each tailored to a different data source:

`registerFromLogEntry()` handles raw Log entries from the Log Service. Used internally but exposed for completeness.

`registerFromRecordResult()` consumes the structured result from `logService.recordToolResult()`. This is what `executeTool.ts` calls after a tool finishes -- one line of code, registry updates automatically.

`registerFromReplayResult()` processes artifacts created during replay operations. When the analyst tunes a parameter, the tuned tool execution creates new artifacts. `logPanelView.ts` passes `replayResult.artifactsCreated` to this method, and the registry updates with the new versions.

All three methods produce identical change events. A subscriber doesn't know or care whether an update came from a tool run, a tune, or a revert. It just knows the result changed.

## Lessons Learned

Synchronous operations simplified everything. The registry uses simple Maps and callbacks -- no promises, no async, no queues. The JavaScript event loop guarantees ordering, so rapid successive updates for the same result ID produce correctly sequenced change events. We tested this explicitly: register v1, immediately register v2, verify two change events fire in order.

Observing Log entries rather than hooking tool execution preserved separation of concerns. The registry knows nothing about MCP, tool definitions, or parameter schemas. It consumes structured data from the Log Service. The Log Service knows nothing about result ID mappings or subscriptions. It emits structured data. Neither depends on the other's internals.

Bulk hydration without events was non-negotiable. Early prototypes fired change events during `hydrateFromAssets()`. Every asset produced a notification. For a plot with 20 result artifacts, that meant 20 callbacks before the plot even opened. The current design treats hydration as initialization, not as live updates. Only runtime changes emit events.

Storing MIME type and version during hydration turned out useful. The registry started as a pure ID-to-path map. Testing revealed that views often need the MIME type to choose a renderer and the version number to display staleness indicators. We extended the mapping to include these fields when available from STAC metadata, keeping them null when registering from Log entries.

## What's Next

Feature #089 (Auto-Refresh) consumes the registry's change events. When a result view is open and its underlying result updates, the view subscribes to that result ID. The change event arrives, the view checks the `debrief.autoRefreshArtifacts` setting, and if enabled, reloads the content while preserving viewport state.

The registry provides the notification mechanism. Auto-refresh provides the response behavior. Together they complete the workflow where an analyst tunes a parameter, watches the chart update automatically, and never thinks about versioned file paths.

> [See the code](https://github.com/debrief/debrief-future/tree/main/specs/087-logical-result-id-registry)
> [Test summary](https://github.com/debrief/debrief-future/blob/main/specs/087-logical-result-id-registry/evidence/test-summary.md)
