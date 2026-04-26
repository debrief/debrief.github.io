---
layout: future-post
title: Building One shape, one home — spatial types consolidated
date: '2026-04-21'
author: Ian
track: momentum
tags:
- refactor
excerpt: Three declarations of the same spatial type collapsed into one. The LinkML
  schema is now the only place `Coordinate` is defined.
reading_time: 4
---
## What We're Building

A `Coordinate` is a longitude and a latitude. Simple idea. In the current codebase it is declared three times — once in the LinkML schema as an object with named fields, once in `shared/components` as a tuple, and once inside `services/session-state` as another tuple. `ViewportPolygon` and `TimeFilter` have the same problem. Three shapes for the same concept is a silent drift hazard: nothing fails loudly when they disagree, but every feature that touches the map or the time slider pays a small tax in conversion code and careful-reviewer attention.

Feature 203 eliminates the duplication at the root. The LinkML schema becomes the single source of truth for `Coordinate`, `ViewportPolygon`, and `TimeFilter`. The duplicate TypeScript declarations are deleted. A pair of converter helpers — `toGeoJSONCoord` and `fromGeoJSONCoord` — lands in `@debrief/utils` to confine tuple-form handling to a narrow interop boundary with GeoJSON and Leaflet. Object form (`{ longitude, latitude }`) becomes canonical everywhere else.

## How It Fits

The schema-first principle is one of the oldest commitments in this rebuild: LinkML generates Pydantic, JSON Schema, and TypeScript so that Python services, the VS Code extension, and the shared component library all speak the same vocabulary. That promise only holds if nobody shadows the generated types with hand-written duplicates. This refactor is the cleanup that restores the invariant for the three spatial/temporal types that drifted furthest.

The work also sets up siblings in the pipeline — features #204 and #205 circle similar "three shapes of the same concept" situations elsewhere in the codebase. Getting the pattern right here (schema as source, converters at the edge, object form in the middle) establishes the template we can reuse.

## Key Decisions

- **Canonical form is the object form** `{ longitude: number, latitude: number }`. It matches LinkML, makes named-field semantics the default, and relegates tuple form to a named interop boundary. Tuples still exist — GeoJSON and Leaflet expect them — but only on the way in and on the way out.
- **`zoom` is added as an optional attribute on `ViewportPolygon`.** A sibling `ViewState` wrapper class was considered and rejected as too cascading for the benefit.
- **`TimeFilter` is reshaped to `{ start?: integer | null, end?: integer | null }`** — nullable epoch milliseconds, rather than the original `{ start: TimeInstant, end: TimeInstant }`. This honours an earlier decision to keep the hot-path time-slider working on plain numeric values. Introducing two types (a serialisation form and a runtime form) was rejected as over-engineering.
- **Validators move too.** `validateCoordinate`, `validateViewportPolygon`, and `calculateViewportCenter` relocate to `@debrief/utils` so they are reachable from both the component library and session-state without a cross-workspace build dependency.
- **Persisted state migrates silently on rehydration.** A one-shot fix-up converts legacy tuple-shaped `viewport.coordinates` to object form, and the persistence schema version is bumped so mid-migration state is detectable. The migration code is explicitly branded as removable after production sessions have cycled through.
- **Zero new runtime dependencies.** One LinkML patch, regenerate the derived artefacts, delete the duplicates, move the validators, add two pure converter functions with unit tests, update every call site. Schema adherence tests (golden fixtures, round-trip, structural comparison) remain the gate.

`Coordinate`, `ViewportPolygon`, and `TimeFilter` are now defined in exactly one place: the LinkML schema at `shared/schemas/src/linkml/session-state.yaml`. The two hand-authored TypeScript duplicates — one in `shared/components`, one in `services/session-state` — are gone. Every consumer imports from `@debrief/schemas` and gets the generated object form.

`@debrief/utils` gains two small converter helpers for the GeoJSON / Leaflet boundary:

```typescript
import { toGeoJSONCoord, fromGeoJSONCoord } from '@debrief/utils';

toGeoJSONCoord({ longitude: -0.1276, latitude: 51.5074 });
// => [-0.1276, 51.5074]   (RFC 7946, longitude first)

fromGeoJSONCoord([-0.1276, 51.5074]);
// => { longitude: -0.1276, latitude: 51.5074 }
```

Tuples still exist — GeoJSON and Leaflet expect them — but only at the wire edge. The object form `{ longitude, latitude }` is canonical everywhere else. The validators (`validateCoordinate`, `validateViewportPolygon`, `calculateViewportCenter`) moved to `@debrief/utils` alongside the converters so both the component library and session-state can reach them without a cross-workspace build dependency.

Persisted session state migrates silently. A new `coerceViewport` helper in `applySessionState` detects legacy tuple-shaped viewports on rehydration and converts them to object form before they reach `setViewport`. The persistence `SCHEMA_VERSION` bumps from `'1.0.0'` to `'1.1.0'` so operators can tell which files have been through the migration.

## By the Numbers

| | |
|---|---|
| Tests passing | 2660 |
| Schema adherence tests | 230 |
| New converter unit tests | 13 |
| New validator unit tests | 13 |
| Lines of duplication deleted | ~96 |
| Files redirected to `@debrief/schemas` | 13 |
| Net source change | ~+92 lines |

Round-trip identity holds end-to-end: Python Pydantic → JSON → parsed dict (TypeScript-equivalent) → JSON → Python Pydantic produces a structurally identical object for all three types, across the canonical fixture set plus antimeridian, poles, and sub-metre precision edge cases.

## Lessons Learned

**The blind cast told us where the fault line was.** `load.ts:125` had `setViewport(spatial.viewport as never)` — a cast that silenced a genuine type mismatch between persisted tuple-shaped coordinates and the store's object-shaped input. The cast worked; it did not lie to TypeScript it merely shut TypeScript up. Replacing it with `coerceViewport(...)` — whose return type matches `ViewportPolygon | null` and which narrows on the legacy-tuple branch — meant the refactor could delete the blind cast outright. Constitution Article I.3 is against `as never` for exactly this reason: it's a flag that the types disagree and somebody decided not to settle it. We settled it here.

**One-line functions hide the most.** `viewportToBounds` in `shared/components/src/utils/bounds.ts` looked harmless: grab `c[0]` for longitude, `c[1]` for latitude, spread into `Math.min` / `Math.max`, done. Under the new object shape, tuple indexing would silently return `undefined` and the bounds would all become `NaN` — no throw, no warning, just a map that refuses to fit. Rewriting it to `c.longitude` / `c.latitude` was the obvious half; the less obvious half was adding an inline comment flagging that `Math.min(...lons)` only works because viewports are always 4 corners. Run it on an arbitrarily large array of coordinates and you'd hit V8's argument-spread limit. A targeted unit test now asserts Sydney-area bounds from object-form coordinates so the rewrite doesn't rot.

**`TimeFilter` converged toward the runtime, not the other way round.** The LinkML schema previously defined `TimeFilter` with `TimeInstant` values. The runtime had long since settled on nullable epoch integers for hot-path reasons — the time slider updates on every mouse move, and wrapping each tick in a `TimeInstant` object to immediately read its `.millis` field was measurable in the state-update budget (Review Decision 5C). Rather than force the runtime to adopt the schema shape, we reversed the schema to match the runtime: `{ start?: integer | null, end?: integer | null }`. Schema-first doesn't mean schema-unilateral; when runtime constraints are real and documented, the source of truth can follow the evidence. `TimeInstant` itself remains canonical for `TimeRange`, which is not on a hot path.

## What's Next

Four follow-up items captured in the spec, not in the backlog:

- **Python converter helpers** — a `to_geojson_coord` / `from_geojson_coord` pair for the Python side, paused until a concrete call site emerges. Pydantic named attributes cover most of the need; Python consumers only see GeoJSON tuples inside `debrief-io`, which handles its own boundary.
- **ESLint rule forbidding hand-rolled `[coord.longitude, coord.latitude]` tuple construction** — lift FR-017 from social enforcement (PR review) to an AST rule. No action until we see hand-rolled patterns reappear.
- **Delete the `coerceViewport` legacy-tuple branch** — once all production session files have been saved under `SCHEMA_VERSION = '1.1.0'`, the tuple-detection branch can go. The branch is already annotated `REMOVABLE:` so the follow-up is mechanical.
- **Remove `TimeFilter` from `services/session-state-py`'s public re-exports** — currently exported from `__init__.py` and `types.py` but unused by any consumer. Opportunistic cleanup on the next `session-state-py` touch.

Siblings #204 and #205 circle similar "three shapes of the same concept" situations elsewhere in the codebase. The pattern we landed here — schema as source, converters at the edge, object form in the middle, silent migration on load — is the template they will reuse.

→ [Read the spec](https://debrief.github.io/debrief-future/#/spec/203)
