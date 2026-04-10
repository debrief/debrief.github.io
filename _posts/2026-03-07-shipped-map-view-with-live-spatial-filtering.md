---
layout: future-post
title: "Shipped: Map View with Live Spatial Filtering"
date: 2026-03-07
track: [credibility]
author: Ian
reading_time: 2
tags: [map, spatial-filtering, discovery-ui, stac]
excerpt: "The Discovery UI's map view now doubles as an interactive spatial filter. Pan and zoom the map to narrow exercises by geography — the timeline updates in real..."
---


# Map View with Live Spatial Filtering

The Discovery UI's map view now doubles as an interactive spatial filter. Pan and zoom the map to narrow exercises by geography — the timeline updates in real time to show only exercises whose footprints overlap your current viewport.

## What's New

**Live spatial filtering** — The map is no longer just a display. As analysts navigate by panning and zooming, the timeline dynamically filters to show only exercises whose bounding boxes overlap the visible map area. Items without spatial data remain visible in the timeline regardless of viewport position.

**Per-exercise colour coding** — Exercise footprints accept a pluggable `colorMap` prop, enabling consistent colour assignment across map, timeline, and future list views. The default accent colour is used when no colour scheme is active.

**Three-state empty overlay** — Clear feedback when there's nothing to show: "No items in this catalog", "No spatial data available", or "No exercises in this area" — each contextually appropriate.

**Debounced viewport callbacks** — Rapid pan/zoom gestures are debounced (150ms) to prevent excessive recalculation while keeping the interface responsive.

**VS Code integration** — Viewport changes propagate from the webview to the extension host via `postMessage`, ready for cross-view synchronisation in feature #132.

## Technical Highlights

- **AABB overlap with antimeridian handling** — The `bboxOverlapsViewport` utility handles the full matrix of antimeridian crossings (item crosses, viewport crosses, both cross) critical for maritime analysis across the Pacific.
- **Zero new dependencies** — All spatial filtering logic is pure TypeScript using existing `Bounds` types and React/Leaflet hooks.
- **Memoized rendering** — Rectangle list is memoized on `items` + `colorMap` to prevent unnecessary React reconciliation at scale (tested with 50+ items).
- **35 unit tests** covering spatial intersection, timeline filtering, empty states, debounce cleanup, colour mapping, and selection behaviour.

## What's Next

- **#132 Three-view synchronisation** — Wire viewport bounds into the shared session-state store so list and timeline views filter in concert with the map.
- **#134 Colour scheme engine** — Replace the pluggable `colorMap` with a full colour scheme engine supporting age, vessel class, and tag dimensions.
