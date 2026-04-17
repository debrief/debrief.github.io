---
layout: future-post
title: "Shipped: Properties Panel for STAC plot and catalog metadata"
date: 2026-04-17
track: [credibility]
author: Ian
reading_time: 5
tags: [stac, activity-panel, stac-browser, schema-driven, provenance]
excerpt: "Editing STAC metadata now happens in-app -- no more closing the editor and hand-patching item.json when a filter surfaces the wrong plots."
---

## What We Built

A schema-driven Properties Panel that edits STAC item metadata from two surfaces. When a plot is open, a 4th section appears in the ActivityPanel alongside TimeController, Tools, and Layers. When no plot is open and the analyst is triaging the catalog, a Properties area stacks under `ThumbnailPreview` in `StacBrowser`. Same form, same field set, same service path.

The form is generated from the LinkML-derived JSON Schema for the STAC item type. `PropertiesForm` in `shared/components/src/PropertiesPanel/` walks the schema and maps each property to either a `ParameterEditor` widget (scalars, enums) or one of four new sibling widgets: `ArrayWidget` for chip lists, `DateTimeWidget` for ISO-8601, `BboxWidget` for the four-quad, `PlatformArrayWidget` for platform records. Add a field in LinkML, run `make generate`, and a new input appears on the next build -- confirmed by the round-trip test in `test_properties_panel_roundtrip.py`.

## How It Works

Writes go through a single gatekeeper: `stacService.updateItemMetadata`. Read, record mtime, merge patch into `item.properties`, append a provenance entry, re-stat to detect concurrent edits, atomic temp+rename onto `item.json`. No session-state staging, no parallel write path, no last-write-wins. The same method serves the ActivityPanel and the StacBrowser -- the "which surface is editing?" question never becomes a "which writer wins?" question because there is only one writer.

Auto-derivation is now override-aware. `stacService.updateTemporalMetadata` reads `item.properties["debrief:overrides"]` and skips any field listed there. Edit `start_datetime` once, and subsequent derivation passes leave it alone. The Properties form renders those fields with an "override" chip so the analyst can see why derivation isn't running for them.

The provenance log is bounded. The active array on `item.properties["debrief:provenance_log"]` caps at 500 entries; the 501st commit rotates the oldest entry into a sibling `provenance_log_archive.jsonl` in the same item directory. Append-only JSONL, atomic rotation. Reads stay O(cap); the full audit trail is preserved on disk (Article III.3).

## Key Decisions

**Dropping the session-state staging layer made the write path much simpler.** The planning post described edits "staging into session-state and flushing when the plot is saved, piggy-backing on the existing unsaved-changes machinery." The review rejected that. Session-state is UI-only in this codebase; data changes go through services. Adding a `PropertiesSlice` to flush-on-save would have introduced a parallel write path alongside `stacService`, and the two surfaces would have had different persistence models for the same form. Direct-write through `updateItemMetadata` on every commit collapsed all of that to a single method.

**mtime-based stale-edit detection is enough.** No cross-platform file locks, no lease protocol, no lock files. Read, fingerprint the mtime, do the merge in memory, re-stat before rename. If the mtime changed, throw `StaleItemJsonError` and let the UI reload from disk. Last-write-wins is avoided without any of the portability cost that real locking would bring.

**Bounded log + JSONL archive is a pattern, not a one-off.** The rotation machinery for `debrief:provenance_log` is small, well-tested, and exactly what feature-level provenance will need when #192 lands. We'll re-use the same shape rather than inventing a second convention.

## By the Numbers

| | |
|---|---|
| Tests passing | 78 |
| Schema round-trip + structural | 13 |
| stacService (write path, rotation, overrides) | 12 |
| Widgets + form + schema resolver | 48 |
| StacBrowser selection context | 3 |
| Provenance log cap | 500 entries |
| Overflow destination | `provenance_log_archive.jsonl` |

## What's Deferred

This is a correctness-first landing. Storybook stories, Playwright webview E2E, a host-side hydration hook that feeds live `item.json` values into `PropertiesForm`, and the StacBrowser GoldenLayout wrapper are all deferred to follow-ups. The pieces are exported and tested in isolation; wiring the extension host and capturing demo assets comes next.

## What's Next

- **#192 -- feature-level metadata.** The same form machinery extends to per-feature `debrief:feature_tags`. The `debrief:overrides` array grows a second dimension keyed by feature ID.
- **Platform autocomplete.** `PlatformArrayWidget` wires the platform registry in so analysts pick from known platforms instead of retyping ids.
- **Unified provenance rotation.** The per-item rotation policy generalises to per-feature provenance logs; one cap, one archive shape across item and feature surfaces.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/193-properties-panel/spec.md)
→ [View the evidence](https://github.com/debrief/debrief-future/tree/main/specs/193-properties-panel/evidence)
