---
layout: future-post
title: "Shipped: Storyboarding — the headless foundation lands"
date: 2026-04-21
track: [credibility]
author: Ian
reading_time: 5
tags: [tracer-bullet, storyboarding, schemas, linkml, typescript]
excerpt: "Storyboard and Scene schemas, a headless TypeScript CRUD module, and the Article II adherence gates that every downstream slice will lean on."
---

## What We Built

The schema-first foundation for the Storyboarding epic (#024) is in. Two
LinkML entities — `Storyboard` and `Scene` — land as plain GeoJSON Features
inside the plot's existing FeatureCollection, with generated Pydantic, JSON
Schema, and TypeScript bindings flowing through the existing pipeline.
Alongside them ships a headless TypeScript CRUD module at
`shared/components/src/storyboard/` that enforces every invariant —
ordering, duplicate-timestamp rejection, `feature_set_hash` canonicalisation,
missing-data detection, append-only provenance — without importing a single
UI framework.

No capture shortcut, no panel, no playback in this slice. That's the whole
point: #216 (capture), #217 (panel + playback), and #218 (edit suite) now
have a data layer they can build against in parallel rather than
re-implementing the same invariants three times.

## Design Decisions That Landed

**Discriminator via `FeatureKindEnum`, not `debrief:type`.** The first draft
used a `properties["debrief:type"]` key; that's wrong for in-plot Features,
where the `debrief:` prefix is reserved for STAC `item.properties`. So
`FeatureKindEnum` in `common.yaml` gains `STORYBOARD` and
`STORYBOARD_SCENE`, and the generated TypeScript unions narrow the same way
every other Feature type already does.

**Single-surface provenance.** The earlier design proposed a dedicated
`history[]` array plus `created_by`, `last_modified_by`, and
`last_modified_at` fields on each Storyboard and Scene. That would have been
two parallel audit surfaces. Dropped the proposed `HistoryEntry` entirely,
added one optional `agent` slot to `LogEntry`, and every CRUD mutation now
appends exactly one entry to the inherited `BaseFeatureProperties.provenance[]`
slot. Derived fields (`created_at`, `last_modified_at`) come from
`provenance[0]` and `provenance[last]` at read time. The Analysis Log (#176)
picks it up for free.

**Async-first CRUD.** `feature_set_hash` is a SHA-256 over the canonicalised
`visible_feature_ids`, and the only cross-platform path to SHA-256 is Web
Crypto's `subtle.digest` — async by specification. Rather than a lopsided
API where some mutations are async and others are sync, every mutation op
returns a `Promise`. Pure queries (`listScenesOrdered`,
`detectMissingDataForScene`, `validatePlot`) stay synchronous, so consumers
inside tight render loops don't have to convert to async.

## Testing Story

All three Article II adherence gates landed in this slice rather than being
deferred — which was the whole argument for not carving the schema work and
the CRUD work into separate PRs.

- **Pydantic round-trip.** 212 fixture round-trips including four new
  storyboard cases.
- **Pydantic-vs-LinkML JSON Schema equality.** Seven new comparisons over
  Storyboard, Scene, and Viewport — field-for-field identical.
- **Py→JSON→TS→JSON→Py cross-language harness.** pytest spawns a Node
  subprocess that parses and re-serialises each valid single-Feature fixture
  through the generated TypeScript models and pipes JSON back; Pydantic
  re-validates. If the generators ever drift, this catches it at the schema
  layer rather than three specs downstream.

The SC-008 "no UI imports in core" test walks every `.ts` file under
`src/storyboard/` and asserts zero static or dynamic imports of `react`,
`react-dom`, `react-leaflet`, `leaflet`, or `vscode`. 13 module files
audited, zero violations.

## By the Numbers

| | |
|---|---|
| Storyboard module tests | 81 |
| Python tests (full monorepo) | 1771 |
| TypeScript tests (full monorepo) | 1681 |
| New schema adherence tests | 15 (4 round-trip + 7 schema-compare + 4 negative) |
| Golden fixtures | 9 (3 FeatureCollection valid + 2 single-Feature valid + 4 invalid) |
| `updateScene` p95 @ 100k positions | ~5.4 ms (target met) |
| `createScene` / `copySceneToOtherStoryboard` p95 @ 100k | ~15–20 ms (marginal) |

## Lessons Learned

The perf target was the one that taught me the most. Initial bench runs at
100k positions were landing in the 40–60 ms range, well over the 10 ms p95
target. The culprits were immer's `autoFreeze` and `strict-shallow-copy`
paths, both of which walk every Feature in the array on every mutation.
Turning both off with `setAutoFreeze(false)` and
`setUseStrictShallowCopy(false)` was worth roughly 4× on the 100k bench.
Bypassing immer entirely for the additive hot paths — `[...features, new]`
instead of a `produce` recipe — got us the rest of the way. immer still
runs the compound ops (cascading deletes, viewport-change geometry
recompute) where its abort-on-throw atomic semantics earn their overhead.

Honest disclosure on the perf target, though: `updateScene` meets p95 < 10 ms
at 100k positions comfortably (~5.4 ms). `createScene` and
`copySceneToOtherStoryboard` land marginally over at ~15–20 ms p95, with
mean latency right on the 10 ms boundary. The remaining cost is dominated
by O(n) `findIndex` over `plot.features`. A Storyboard-id → index Map would
flatten it, but that's stateful bookkeeping that invalidates on every
mutation — rejected for v1 in favour of simplicity. The bench stays in the
suite, and #217 playback can build an indexed view on top if it needs one.

## What's Next

Three sibling specs are now unblocked. #216 slots the capture shortcut into
the CRUD surface as a single `createScene` call with a `thumbnail_asset_ref`
sourced from #174. #217 consumes `listScenesOrdered` and
`detectMissingDataForScene` for the panel, playback transport, and
missing-data hard-block. #218 wires the edit suite — rename, describe,
delete-with-undo, duplicate, copy-to-other-storyboard — straight onto the
existing CRUD ops. None of the three needs to re-implement an invariant.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/215-storyboarding-schema/spec.md)
→ [View the evidence](https://github.com/debrief/debrief-future/tree/main/specs/215-storyboarding-schema/evidence)
