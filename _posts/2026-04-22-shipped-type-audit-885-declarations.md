---
layout: future-post
title: "Shipped: The type audit — 885 declarations, 25 drift clusters, 6 new backlog items"
date: 2026-04-22
track: [momentum]
author: Ian
reading_time: 5
tags: [tracer-bullet, schemas, type-safety, epic-e11]
excerpt: "The E11 type audit is done. 885 TypeScript declarations across 317 files, classified into five buckets — and a few surprises."
---

## What We Built

The [planning post](https://debrief.github.io/future/2026/04/21/planning-auditing-every-hand-typed-declaration/)
described the problem: we did not know how many hand-written types had quietly
become boundary types. The audit is now done and committed at
[`docs/type-audit-2026.md`](https://github.com/debrief/debrief-future/blob/main/docs/type-audit-2026.md).

The deliverable is a single Markdown report enumerating 885 named TypeScript
declarations across 317 files, each assigned one of five classifications. The
scanner that produced the raw data is committed at
`scripts/audits/type-audit/scan.ts` — deterministic, uses the TypeScript
compiler API (not regex), runs in around four seconds, and is covered by 18
vitest tests.

## By the Numbers

| | |
|---|---|
| Declarations scanned | 885 |
| Files traversed | 317 |
| Schema-rooted | 260 |
| Boundary / parse-time loose | 5 |
| Single-domain convenience | 486 |
| Cross-domain hand-typed | 28 |
| Drift candidates | 106 |
| Drift clusters | 25 |
| Scanner tests passing | 18/18 |
| Scan time | ~4s |

## What Surprised Us

Three things came out of the scan that the planning post did not anticipate.

**The Storybook false positive.** 106 declarations were tagged as drift
candidates by the scanner. That is the right mechanical result — they are
same-name, different-shape declarations across multiple files. But 52 of those
106 are `Story` (38 sites) and `Props` (14 sites), which every Storybook file
and every React component file re-declares as a per-file local convention.
There is no semantic drift there; it is a naming pattern, not a concept being
accidentally duplicated. Rather than suppressing them silently in the scanner —
which would make the methodology harder to trust — we folded them into a single
rollup backlog item (#227) that documents the convention and tells future audits
to ignore them. The remaining 54 drift-candidate entries cover real divergence.

**Python shapes that collide with TypeScript shapes by name.** The spec
anticipated that Python cross-domain types would appear, and they do — 24
hand-authored Pydantic `BaseModel` classes in `services/` whose instances
cross the Python ↔ TypeScript boundary over MCP or IPC. What the spec
underestimated was how direct the collisions are. `ParseResult` appears in
`services/io/src/debrief_io/models.py`, in `apps/loader/src/renderer/types/results.ts`,
and in `apps/vscode/src/types/import.ts` — three declarations of nominally the
same wire shape, maintained by hand in two languages. Same story for
`ModifiedFeature`, `ToolResult`, `ToolParameter`. These are not subtle naming
coincidences; they are the same concept being held together by convention
rather than by a schema. The Python appendix in the report lists all 24 and
routes each to the E11 backlog item that will promote it to LinkML.

**The boundary count is low — and that is not fully reassuring.** Only 5
declarations bottom out in `unknown` or `Record<string, unknown>` at the top
level. That sounds like good news, but the scanner classifies by the type alias
RHS, not by the full call graph. A type that receives an `unknown` payload and
immediately narrows it via a runtime check gets classified as single-domain,
not boundary. The 5 confirmed boundary types are the obvious ones; the 28
cross-domain hand-typed entries are the more interesting risk, because they
have known shapes that are just not schema-rooted yet.

## What E11 Does With It

Before the audit, Epic E11 had five known boundaries and a vague sense of
scope. The audit turns that into 14 mapped phases across four themes:

- **#222** — MCP transport envelopes (request, response, content item, tool
  definition, param schema)
- **#223** — STAC catalog hand-types (StacItem, StacCatalog, StacCollection)
- **#224** — Session-state wire shapes (StateSnapshot, FeatureProvenance,
  ModifiedFeature, InputFeatureState, BranchPointLocation, CreateSnapshotOptions)
- **#225** — Loader ↔ main IPC envelopes (CreatePlotResponse, AddFeaturesResponse,
  ListPlotsResponse, OpenPlotArgs, ParseResult)
- **#226** — Real drift clusters — the 54 drift-candidate entries that are not
  Storybook/Props conventions
- **#227** — Storybook / React Props convention rollup — no action required,
  documented so future audits can filter correctly

One existing item was reused: **#204** (RawGeoJSONFeature) already covers the
`GeoJsonFeature` and `GeoJsonFeatureCollection` declarations in session-state.

The methodology is documented in the report and reproducible. Re-running it
six months from now means running two commands and diffing the output — any
new drift that has crept in will show up as new cluster entries. That was the
point of committing the scanner rather than keeping it as a throwaway script.

See the full report at
[`docs/type-audit-2026.md`](https://github.com/debrief/debrief-future/blob/main/docs/type-audit-2026.md)
and the companion LinkedIn summary for a shorter version of the key findings.
