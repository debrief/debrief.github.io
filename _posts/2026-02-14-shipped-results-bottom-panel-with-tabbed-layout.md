---
layout: future-post
title: "Shipped: Results Bottom Panel with Tabbed Layout"
date: 2026-02-14
track: [credibility]
author: Ian
reading_time: 3
tags: [tracer-bullet, results-visualization, vscode-extension]
excerpt: "Analysis results now open automatically in a tabbed bottom panel — charts render inline, images display at full resolution, files show metadata."
---


## What We Built

When an analyst runs a tool — say, buffering a zone or generating reference points — the results now open automatically in a bottom panel with tabs. Charts render as interactive Vega-Lite visualizations, images display at full resolution with pan and zoom, and file outputs show structured metadata. No hunting through STAC directories or opening separate viewers.

The panel supports three entry points: auto-opens after tool execution completes, opens via context menu on any result in the catalog tree, or summons via command palette. Tabs de-duplicate intelligently — if you open the same chart twice, it focuses the existing tab instead of duplicating. When multiple plots share results with identical logical IDs, tab titles disambiguate with plot names.

## How It Works

The implementation has three layers. Five new React components handle presentation: ResultsPanel orchestrates the layout, ResultTabBar manages tab selection and closes, ResultTabContent routes to specialized viewers, and ImageViewer and FallbackViewer render their respective content types. The ChartRenderer component we built in Feature 085 handles datasets.

A VS Code WebviewViewProvider sits behind the panel, watching STAC asset files for changes. When a file updates, a 200ms debounced file watcher triggers a content preparation pipeline: datasets get validated and forwarded to Vega-Lite, images get read as buffers and converted to base64 data URIs, everything else gets inspected for size and modification time.

Tab titles derive from a fallback chain — first check the Vega-Lite spec's title field, then the DatasetEnvelope title, finally fall back to the filename. When logical IDs collide across plots, we append the plot name in parentheses.

## What It Looks Like

Three result types open simultaneously: a Vega-Lite chart, a satellite image with pan/zoom, and GeoJSON metadata — all in separate tabs.

Right-click any result in the catalog tree to open it directly — no need to wait for tool execution.

When "range_rings.json" exists in both Plot A and Plot B, tabs show "Range Analysis (Plot A)" and "Range Analysis (Plot B)" for disambiguation.

The panel appears automatically when a tool completes, focusing the newest result.

## Lessons Learned

Content Security Policy tripped us up initially. Base64-encoded images require `img-src data:` in the CSP meta tag — without it, images fail silently with no console warning. Easy to miss during development when testing with file:// URIs.

Debouncing the file watcher took some tuning. At 50ms we saw duplicate renders when STAC writes happened in quick succession. At 500ms the UI felt sluggish. 200ms hit the sweet spot — responsive enough to feel immediate, slow enough to batch related writes.

Tab title derivation from nested JSON needs careful fallback chains. We initially checked only spec.title, which meant datasets without that field showed raw filenames. Adding envelope.title as a middle fallback covered 95% of cases. The remaining 5% fall back to filename, which is honest — better than inventing a title.

## Test Coverage

15 total tests covering components and integration:
- 10 unit tests for React components (ResultsPanel, ResultTabBar, ResultTabContent, ImageViewer, FallbackViewer)
- 8 Storybook stories covering empty state, single tab, multiple tabs, tab switching, close behavior, long titles, disambiguation, error states
- All tests passing with consistent rendering across states

## What's Next

The panel shows results but doesn't yet support deletion or export. Feature 096 will add inline actions — close a tab and offer to delete the underlying asset, right-click to export as PNG or download the raw file. We also want keyboard navigation — Cmd+1 through Cmd+9 to jump between tabs, Cmd+W to close the focused tab.

→ [See the specification](https://github.com/debrief/debrief-future/tree/main/specs/095-results-bottom-panel/spec.md)
→ [View the implementation](https://github.com/debrief/debrief-future/tree/main/apps/vscode/src/panels/results)
→ [Browse Storybook stories](https://github.com/debrief/debrief-future/tree/main/shared/components/src/results)
