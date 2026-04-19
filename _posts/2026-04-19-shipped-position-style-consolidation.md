---
layout: future-post
title: "Shipped: drift closed from schema to VS Code tool parameter"
date: 2026-04-19
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, tech-debt, schemas, typescript]
excerpt: "A two-interface type fix grew into a seven-site refactor once we looked. The result: one schema-linked PointShape, one resolver, one exhaustive switch, and a silent-failure path closed."
---

## What We Built

The brief was small: two interfaces called `ResolvedPositionStyle` had
drifted. One listed three marker shapes, the other five. One called the
label field `label`, the other `labelText`. Make them one. A half-day job.

The `/speckit.review` pass made it a week. If the interface had drifted,
what about the enum it points at? The resolver that produces it? The
renderer switch that consumes it? The VS Code tool that takes a shape as a
parameter? We went and looked. The answer was drift in every direction.

So the work expanded along a single axis — marker shapes — from the LinkML
schema all the way to the MCP tool input schema. Every link in that chain
now points at one source of truth: `PointShapeEnum` in
`shared/schemas/src/linkml/common.yaml`. Change a value there, rerun
`pnpm --filter @debrief/schemas build`, and the type widens or narrows
everywhere that uses it, automatically.

The moving parts that landed together:

- **One interface.** `ResolvedPositionStyle` lives in `@debrief/utils`.
  `symbol: PointShape` (template-literal derivation of the schema enum),
  `labelText: string | null`. The components-side duplicate is gone; its
  file now re-exports.
- **One resolver.** `resolvePositionStyle` and `computeAllPositionStyles`
  are single-implementation in `@debrief/utils`. The components-side copy
  — which had subtly different null-override semantics — is gone. The
  winner: `null` means "no override, use the cascaded default", matching
  the LinkML attribute description.
- **One exhaustive switch.** Every renderer switch on `symbol` now has an
  `assertNever(shape)` default branch. Adding a 6th shape in LinkML
  breaks the build in every renderer file that needs updating, until it
  does.
- **A real runtime guard.** Before: a JSON payload with
  `symbol: "star"` silently drew a circle. After: it throws
  `InvalidPointShapeError` with the offending value and the valid set;
  the renderer catches, logs, and skips the symbol — without crashing
  the rest of the track.
- **Narrowed generator output.** A post-process step in
  `scripts/generate.py` rewrites `symbol: string,` to `symbol: PointShape,`
  on the two enum-ranged attributes after `gen-typescript` runs. No more
  "`string` in the type, enum in the comment" gap.
- **Pinned enum parity.** A new schema-adherence test keeps
  `PointShapeEnum` and `MarkerSymbolEnum` from silently drifting again —
  the ADR from feature #091 is honoured, the drift surface is closed.

## Numbers

| | Before | After |
|---|-------:|------:|
| `interface ResolvedPositionStyle` declarations | 2 | 1 |
| `resolvePositionStyle` / `computeAllPositionStyles` implementations | 2 each | 1 each |
| Hand-typed shape unions across the codebase | 3 | 0 |
| Renderer switches silently falling through on unknown shapes | 2 | 0 |
| Enum-parity adherence tests | 0 | 1 |
| Compile-time shape-drift warnings after a LinkML enum edit | 0 | depends on which renderer doesn't handle the new case |

## Lessons Learned

**The `/speckit.review` pass is where the scope expansion happens.** A
spec that only said "consolidate two interfaces" would have shipped the
half-day fix and left the underlying drift alive. The review asked
`why have the interfaces drifted at all?` and the answer forced six
sibling sites into the same refactor.

**R-011 was the one real risk.** `gen-typescript` emits `string` for
enum-ranged LinkML attributes, which is why the hand-typed unions exist
in the first place. We time-boxed a prototype for the
post-process mechanism — the existing `generate.py` already runs seven
post-process steps on the `gen-typescript` output for GeoJSON
coordinates, so the eighth was additive. Tractable.

**Never silently default on schema mismatch.** The old resolver's
`symbol as 'circle' | 'square' | 'triangle'` cast let unknown values
fall through to a default circle. That's an Article I.3 silent-failure
violation that pre-dated this feature; catching it here, via a typed
error and a try/catch in the renderer, was the shortest path to closing
it. Users with broken data now learn their data is broken.

## What's Next

Backlog #206 tracks the broader audit for other hand-typed unions along
other axes (named colours, line caps, line joins, label locations, etc).
The mechanism proven here — schema-derived template-literal type +
generator post-process + assertNever defaults + enum-parity test — can
carry over, one axis at a time.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/201-position-style-consolidation/spec.md)
→ [View the evidence](https://github.com/debrief/debrief-future/tree/main/specs/201-position-style-consolidation/evidence)
