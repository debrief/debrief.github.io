---
layout: future-post
title: "Shipped: Polygon and Polyline Drawing"
date: 2026-02-14
track: [credibility]
author: Ian
reading_time: 3
tags: [tracer-bullet, shape-drawing, e05]
excerpt: "Analysts can now draw operational zones and patrol paths directly on the map with validated multi-vertex polygons and polylines."
---


## What We Built

Analysts can now draw arbitrary polygons and polylines directly on the map. Polygons for operational zones, exclusion areas, search regions. Polylines for routes, patrol paths, sector boundaries.

The implementation extends the pure factory function pattern we established for points and rectangles. `createDrawnFeature()` now handles polygon and polyline cases, each with distinct validation rules and default styling. Polygons require at least 3 unique vertices (excluding the closure point). Polylines require at least 2. Orange (#FF9800) for polygons, teal (#00BCD4) for polylines.

One decision worth noting: polylines reuse the existing LINE FeatureKind rather than adding POLYLINE to the schema. The schema already supports multi-vertex LineString geometries, so we didn't need a new enum value. This keeps the schema minimal while supporting the functionality.

66 tests pass in 6.19s — 23 validation tests, 43 creation and schema compliance tests. Modified 6 existing files, added ~100 lines, zero new dependencies.

## How It Works

The VS Code webview calls `createDrawnFeature()` with the Geoman-generated GeoJSON and the selected mode. The function validates the geometry, applies default styling, generates schema-compliant metadata, and returns a fully-formed GeoJSON Feature.

Polygons get a `vertex_count` metadata field that excludes the closure point — the number of distinct vertices an analyst actually placed. Useful later for understanding the complexity of drawn zones.

Mode-specific name prompts guide the analyst: "Name this polygon:" or "Name this path:" — small touch, but it makes the drawing flow more natural.

## Lessons Learned

The pure function approach continues to pay off. Adding two new shape types meant extending one function and its tests. No webview changes beyond the mode-specific prompts. No new state management. The separation between drawing (Geoman), transformation (createDrawnFeature), and eventual persistence (future #096) keeps each piece focused.

Validation turned out simpler than expected. Geoman already ensures polygons are closed and coordinates are valid arrays. We just needed to check vertex counts and catch degenerate cases.

## What's Next

Feature #096 closes out Epic E05 by adding STAC persistence and drawing mode guidance text. Drawn features will become first-class analysis objects — selectable, editable, usable in tools like Buffer Zone Generator and Move Shape.

After that, we shift to Epic E06: multi-shape selection and bulk operations. The foundation is solid.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/095-polygon-polyline-drawing/spec.md)
→ [View test results](https://github.com/debrief/debrief-future/tree/main/specs/095-polygon-polyline-drawing/media/test-output.txt)
