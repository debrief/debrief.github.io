---
layout: future-post
title: "Planning: Properties Panel feature and sub-feature editing"
date: 2026-05-20
track: [momentum]
author: Ian
reading_time: 4
tags: [properties-panel, schemas, linkml, vscode-extension, activity-panel]
excerpt: Extending the Properties Panel to per-feature and per-vertex editing — four modes, one dispatcher, one staging buffer.
---

## What We're Building

The Properties Panel that shipped in April handles plot-level STAC metadata. Spec 192 extends the same surface to four editing modes through a single dispatcher: plot (existing), single feature, sub-feature (a vertex on any geometry), and multi-select summary. The form machinery, the writer, and the provenance shape all stay the same — they now operate per-feature and per-vertex as well as per-plot.

Seven user stories drive the work: four P1 (single-feature metadata editing, per-track-point annotation, selection-driven mode swapping, multi-feature selection from map and Layers panel) and three P2 (read-only plot detection plus UI, override revert affordance, cross-geometry vertex metadata). All seven share one dispatch component and one staging buffer.

## How It Fits

The work sits on top of #193's plot-level Properties Panel. The new modes hang off a `PropertiesPanelDispatch` component that resolves the active mode from the current `FeatureSelection` and renders the appropriate form. The existing `stacService.updateItemMetadata` writer — the single-writer gatekeeper that made #193 land cleanly — takes the per-feature commits unchanged: same atomic temp+rename, same provenance entry shape, same override array, now keyed by feature id and vertex path as well as plot-level field.

Vertex annotation reaches across geometry types. Polygon, LineString, MultiPoint, and Point all share one `VertexMetadata` LinkML class, inherited by 13 concrete feature classes via a single new `vertex_metadata` slot on `BaseFeatureProperties`. Path validation per geometry type happens in the schema, not at runtime — 53 pytest cases cover round-trip, inheritance across all 13 concrete subclasses, pattern validation, sparse omission, and duplicate-path rejection.

## Key Decisions

- **One LinkML class, 13 inheritors.** Rather than 13 parallel vertex metadata shapes, one `VertexMetadata` lives on `BaseFeatureProperties` and gets inherited. Adding a new feature type doesn't grow the metadata surface — it inherits the slot automatically.
- **React `useReducer`, not Zustand.** The staging buffer (`useStagedEdits`) is colocated with `ActivityPanel`. The `/speckit.review` 2A finding was firm: panel-local state should stay panel-local, not get promoted into `@debrief/session-state`. The reducer tracks plot, per-feature, and per-vertex partials plus `revertedFields`. It survives selection changes; it clears only on a successful save.
- **One dispatcher, four modes.** `PropertiesPanelDispatch` resolves `{ plot | feature | subfeature | multi | stale }` from selection state via a pure `resolveEditingMode` function (testable in isolation). The same panel surface adapts to what is selected — the analyst doesn't navigate between panels.
- **Closing the silent-save gap.** Spec 192 also closes Article I.3 from `/speckit.review`: an integrated save-path test asserts the writer is called exactly once, `appendProvenance` runs once per affected feature, the staging buffer survives `EACCES` / `EPERM` / `ReadOnlyFilesystemError`, and a read-only banner appears after a failed save. A new `plot` slice on `@debrief/session-state` exposes `isReadOnly` / `readOnlyReason`.
- **Multi-feature selection becomes a first-class signal.** `MapView.onSelect` changes payload shape to carry a feature array (one breaking change, same prop name, three consumers updated). Ctrl/Cmd-click on the map and on the Layers panel emit the same multi-select event, so the panel can render a summary mode with shared-field editing.

## What We'd Love Feedback On

- The read-only signal is derived from writer capability and save-time filesystem errors. Are there other read-only signals (workspace settings, file ownership, network FS quirks) worth folding in?
- Vertex paths are pattern-validated in the schema. For LineString and MultiPoint that is straightforward; for Polygon (`rings/<n>/vertices/<m>`) the path format is more rigid. Is the shape clear enough at the point of use?
- The override revert affordance lives next to each "override" chip. Is one-click revert the right granularity, or should a multi-field "revert all overrides" action sit alongside it?

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/192-properties-panel-feature-edit/spec.md)
