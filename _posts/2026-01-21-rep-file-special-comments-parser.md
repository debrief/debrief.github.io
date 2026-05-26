---
layout: future-post
title: Building REP File Special Comments Parser
date: '2026-01-21'
author: Ian
track: credibility
tags:
- annotations
- debrief-io
- parser
excerpt: REP files now yield their full story — tracks, narratives, search areas,
  and operator notes all parsed to GeoJSON.
reading_time: 3
---
## What We're Building

REP files are more than track data. Operators annotate their exercise recordings with narrative entries, search area circles, operational boundaries, and sensor contacts. Until now, our parser ignored these — treating them as comments. That changes this week.

We're extending the `debrief-io` REP handler to parse all special comment types: NARRATIVE entries that capture operator decisions, CIRCLE and RECT shapes that define search areas, LINE and VECTOR annotations for reference bearings, and even time-varying DYNAMIC shapes that move during replay. The parser will produce GeoJSON features conforming to our existing annotation schemas, ready for display alongside tracks.

## How It Fits

This completes a key gap in our tracer bullet. We can already parse REP track positions and store them in STAC catalogs. With annotation support, analysts get the full picture — the shapes and notes that make exercise replay meaningful, not just dots on a map.

The annotation schemas were completed in our recent styling work (PR #58). This parser will produce features that validate against those schemas, with proper styling properties so frontends can render them immediately.

## Key Decisions

- **Fail-fast on invalid data** — Unknown symbol codes or malformed syntax raise errors with filename, line number, and description. Analysts fix source data rather than wonder why shapes are missing.

- **Symbol codes mapped to CSS colors** — The Debrief symbology table (A-Q → colors like Blue, Red, Yellow) is applied during parsing. Features arrive with concrete `fill_color` and `color` values.

- **Legacy symbol names preserved** — We're adding a `legacyStyle` field to store symbol names like 'Aircraft' or 'torpedo'. We won't render these icons yet, but we won't lose the information either.

- **Local test fixtures** — The REP format is stable/legacy. We're snapshotting the canonical `shapes.rep` file locally rather than fetching from upstream.

REP files have been Debrief's core data format for 25 years. Until this week, our parser saw only half the picture — track positions but not the rich annotation layer operators embed during exercise recording.

That changes now. The `debrief-io` REP handler extracts narratives, shapes, and text labels from special comment lines (those starting with `;NARRATIVE:`, `;CIRCLE:`, `;RECT:`, etc.). Annotations arrive as GeoJSON features alongside tracks, styled and ready for display. Analysts get the full operational context — not just dots on a map, but the search areas, reference bearings, and timestamped decision logs that make exercise replay meaningful.

This was an extension, not a replacement. Track parsing remains completely unchanged — all 47 legacy tests still pass. We added 117 annotation-specific tests covering coordinate parsing, symbol codes, timestamps, and six annotation types. Total test count: 189 passing in under one second.

## What's Included

**P1 Annotation Types** (Implemented):
- **NARRATIVE / NARRATIVE2**: Event logs with timestamp, track association, and text ("POSSUB TRACK 14", "FINEX CALLED")
- **CIRCLE**: Circular areas with center point, radius in meters, approximated as 32-point polygons for GeoJSON compatibility
- **RECT**: Rectangular boundaries from corner coordinates
- **LINE**: Two-point line segments for reference bearings or boundaries
- **VECTOR**: Bearing/range from origin point, endpoint computed geometrically
- **TEXT**: Positioned text labels with symbol styling

**Infrastructure Built**:
- **Symbology module**: REP color codes (A-Q) mapped to CSS hex values
- **Coordinate parsing**: DMS format with hemisphere indicators, fractional degrees supported
- **Timestamp handling**: YYMMDD HHMMSS with Y2K-aware century inference (50-99→1900s, 00-49→2000s)
- **Symbol parsing**: All REP formats supported (`@X`, `@BA10`, `@X[LAYER=y]`, SVG-style `aX`, digit-prefix `0X`)
- **Fail-fast validation**: Invalid coordinates or unknown symbol codes raise immediately with line numbers

**Deferred to P2/P3**:
- Multi-vertex shapes (POLY, POLYLINE)
- Temporal annotations (ELLIPSE, TIMETEXT, PERIODTEXT)
- Dynamic shapes (DYNAMIC_RECT, DYNAMIC_CIRCLE, DYNAMIC_POLY)
- Sensor data (SENSOR, TMA_POS)

## Test Results

All 189 tests pass in 0.89 seconds:
- 117 annotation-specific tests
- 47 legacy debrief-io tests (unchanged)
- 15 track regression tests (backward compatibility verified)
- 10 integration tests (tracks + annotations together)

## Lessons Learned

**Fail-fast was the right call**. When parsing 25-year-old data files, you want immediate feedback on format violations — not silent failures where shapes disappear. Line numbers in error messages make corrections straightforward.

**Symbol code diversity surprised us**. REP supports at least five symbol formats (`@X`, extended `@BA10`, attributes `@X[LAYER=y]`, SVG-style, digit-prefix). The parser handles all of them, mapping to concrete CSS colors during parsing so frontends don't need symbology tables.

**Y2K handling still matters**. REP timestamps use 2-digit years. Files from 1995 exercises are still in use. The century inference logic (50-99→1900s, 00-49→2000s) was essential.

**Test-first paid off**. We wrote 117 tests before wiring the parser into the REP handler. When integration happened, everything worked immediately — no debugging loop.

## What's Next

This completes the P1 scope — the annotation types that matter for most analysis workflows. P2 and P3 types (polygons, temporal shapes, sensor contacts) are stubbed but not yet implemented. We'll prioritize those based on user feedback.

The demo environment needs updating to showcase annotations visually. That's the natural next step — seeing circles, boundaries, and narratives render alongside tracks in a browser.

Immediate focus shifts to Feature 008 (STAC catalog operations) to enable persistence and retrieval of this newly-parsed data.

→ [See the PR](https://github.com/debrief/debrief-future/pull/61)
→ [Read the spec](https://github.com/debrief/debrief-future/blob/main/specs/007-rep-special-comments/spec.md)
→ [Try the demo](https://debrief-demo.fly.dev) (annotations coming soon)
