---
layout: future-post
title: "Shipped: Tool Results Architecture"
date: 2026-01-30
track: [credibility]
author: Ian
reading_time: 5
tags: [tracer-bullet, tool-results, mcp, stac]
excerpt: "Typed result system connecting calculation tools to storage, with 88 tests passing across Python and TypeScript."
---

## What We Built

When a calculation tool smooths a track or computes a closest point of approach, something needs to classify that result, persist it to the STAC catalog, and update the display. We've now built the machinery that connects these pieces.

The system introduces four top-level result types: mutation (modified features), addition (new features), deletion (removed features), and artifact (reports, images, datasets). Every tool response is an MCP-compliant content array containing one or more items, each classified into one of these types and carrying three required annotations: the result type path, source feature IDs, and a human-readable label.

On the storage side, debrief-stac exposes four atomic operations: update features, add features, delete features, and store artifact. The service has no knowledge of result types. The orchestrator (frontend or LLM) interprets each content item's type and calls the appropriate operation. After each operation, a diff utility compares the old and new FeatureCollections and the display updates incrementally.

## How It Works

Here's a Python tool returning a smoothed track:

```python
from debrief_calc.result_builder import build_mutation, build_response

smoothed = {"type": "Feature", "id": "track_a", "geometry": {...}, "properties": {...}}
mutation_items = build_mutation(
    features=[smoothed],
    result_subtype="track/smoothed",
    source_feature_ids=["track_a"],
    label="Smoothed Track A",
)
response = build_response(mutation_items)
```

The orchestrator receives the response, sees the `mutation` type, and calls:

```python
from debrief_stac.features import update_features
from debrief_stac.provenance import write_provenance

write_provenance(smoothed, "track-smoother", "1.0.0", ["track_a"])
count = update_features("/data/catalog", "plot_001", [smoothed])
```

For multi-result responses, the content array is processed sequentially. A tool that trims outliers might return two items: a deletion for the removed contacts and an artifact with the analysis report. The orchestrator calls delete_features, then store_artifact, diffing and updating the display after each.

## Result Type Hierarchy

Result types use slash-delimited paths like `artifact/report/ssa_assessment`. The four top-level types are fixed and schema-validated. Below that, organisations can introduce sub-types without registration.

A contrib-aware viewer might recognise the full path and open a specialised report viewer. The generic Debrief UI matches `artifact/report` and shows a standard report preview. An LLM matches just `artifact` and reports "The tool produced a report artifact." Each consumer degrades to the deepest match it understands.

TypeScript provides utilities for this:

```typescript
import { matchesResultType, getTopLevelType } from "@debrief/diff";

matchesResultType("artifact/report/ssa_assessment", "artifact");         // true
matchesResultType("artifact/report/ssa_assessment", "artifact/report");   // true
getTopLevelType("artifact/report/ssa_assessment");                        // "artifact"
```

## Lessons Learned

The separation of concerns took a few iterations to settle. Initially, I considered embedding result type interpretation inside debrief-stac. That would have made the persistence service brittle and coupled it to frontend concerns. Moving all type awareness into the orchestrator keeps debrief-stac simple: it receives features, writes them, returns updated FeatureCollections.

Multi-result responses turned out to be more common than I expected. A single tool invocation might remove outliers, update the remaining track, and produce a diagnostic plot. Returning these as separate content items, processed sequentially, is cleaner than trying to bundle them into a single compound result.

The diff utility in TypeScript was straightforward but essential. After each atomic STAC operation, the frontend needs to know what changed without re-rendering the entire plot. The utility compares feature IDs and geometries, returning three sets: added, removed, modified. 24 tests confirm it handles edge cases like identical collections, disjoint collections, and partial overlaps.

## Test Coverage

88 tests passing across Python and TypeScript:

- 41 tests in debrief-calc (result types, builders, MCP responses)
- 23 tests in debrief-stac (provenance, artifacts, feature updates/deletions)
- 24 tests in @debrief/diff (FeatureCollection diffing, type matching)

The test suite covers all four result types, multi-result responses, hierarchical type matching, atomic STAC operations with provenance, and diff utility correctness.

## What's Next

This architecture supports the workflow where a calculation tool produces results, the orchestrator persists them, and the display updates. The next step is wiring a real calculation tool (track smoothing or CPA analysis) end-to-end through this flow in the VS Code extension.

The hierarchical type system is designed for contrib extensions, but we haven't tested it with a real organisation-specific sub-type yet. That will be valuable validation once we have contrib partners.

→ [See the spec](https://github.com/debrief/debrief-future/blob/main/specs/041-document-tool-results/spec.md)
→ [View the PR](https://github.com/debrief/debrief-future/pull/136)
