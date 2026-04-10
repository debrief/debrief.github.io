---
layout: future-post
title: "Shipped: Generate Reference Points Tool"
date: 2026-02-13
track: [credibility]
author: Ian
reading_time: 5
tags: [tool-api, e03-demo, buffer-zone-analysis, reference-points]
excerpt: "Delivered the first E03 tool: grid and scatter reference point generation in Python and TypeScript"
---


## What We Built

The generate-reference-points tool is now live in both debrief-calc (Python) and the VS Code extension (TypeScript). Feed it a bounding box and a pattern type (grid or scatter), get back a FeatureCollection of reference points ready for zone classification.

Grid mode divides a bounding box into evenly-spaced columns and rows. A 3×4 grid produces 12 points. Scatter mode generates pseudo-random points using a seeded linear congruential generator (LCG)—the same seed produces identical point clouds in Python and TypeScript, which proved surprisingly important for end-to-end testing.

The output is a single GeoJSON MultiPoint feature with a parallel `pointMetadata` array. Each point gets styling metadata: shape (square for reference points), color, size. This design lets downstream tools (zone classifiers, histograms) attach per-point results without reconstructing geometry.

Every point carries `FeatureKind.POINT` and `LocationTypeEnum.REFERENCE`, no new schema types required. The tool uses `ContextType.NONE`—it doesn't depend on existing plot features. Just bounds and parameters.

## How We Got Here

The planning spec (#078) landed two weeks ago with the LCG algorithm spelled out, test fixtures defined, and three design questions. We implemented against that spec rather than debating details first. The tool was the first in the E03 five-step reactive demo chain, so getting it shipped unblocked the work on zone classifiers (#081) and histograms (#082).

Cross-language determinism was the sticking point. Python's `random` module and TypeScript's `Math.random()` use different algorithms, so we couldn't delegate to them. The spec pinned down the LCG parameters (`a=1103515245, c=12345, m=2^31`), and both implementations follow that formula exactly. Test fixtures showed Python and TypeScript producing identical scatter point sequences from the same seed—that validation became a mandatory check before both implementations were considered complete.

## What Shipped

**Python implementation** (`debrief-calc` service):
- `generate_reference_points()` tool wrapped with `@tool` decorator
- Grid mode with proper boundary handling (points at edges, not inset)
- Scatter mode with seeded LCG PRNG
- Antimeridian handling for bounding boxes crossing 180/-180
- 28 pytest tests covering edge cases: 1×1 grids, large scatter counts, date line wrapping, invalid bounds
- Full coverage of the spec contract

**TypeScript implementation** (VS Code extension):
- Tool registration in the calcService MCP client
- Identical scatter algorithm—deterministic within machine precision limits
- Grid and scatter preview in the extension
- 25 vitest tests validating schema compliance and output structure
- Integration tests confirming Python and TypeScript produce identical outputs for shared test cases

**Schema updates**:
- `ReferenceLocation` now accepts `MultiPoint` geometry (was `Point` only)
- New `PointMetadataEntry` class for per-point styling
- No breaking changes to existing feature types

## Lessons Learned

**Deterministic PRNG was worth the effort.** Specifying the LCG algorithm upfront meant no divergence, no surprises in cross-language testing. We could confidently say "same seed, same points" and validate it automatically. If we'd left PRNG choice to each implementation, we'd have discovered mismatches in integration testing and spent cycles debugging.

**Fixtures drive clarity.** The planning spec included golden I/O JSON examples (bounds, grid dimensions, scatter count, expected outputs). When we implemented, those fixtures became test cases. Python and TypeScript both had to pass the same assertions. No ambiguity about what "correct" meant.

**No schema changes needed.** We expected to add `FeatureKind.REFERENCE_POINT` or a dedicated type. Instead, `FeatureKind.POINT` + `LocationTypeEnum.REFERENCE` said everything necessary. The design question from planning—"Should we add new enum values?"—resolved to "No, use what exists." Simpler schema, same expressiveness.

**Antimeridian edge case caught late.** A test case with bounds `[170, 49, -170, 52]` (date line crossing) initially produced points wrapped at 180, not normalised to [-180, 180]. The fix was one line in each implementation, but the spec should have been explicit about this. We documented it in the code and updated the test fixtures to catch regressions.

## What's Next

Reference points are now available as a tool in any plot. The next step is point-in-zone classification (#081)—feed these points to a boundary feature, get back a tagged set of points indicating which zone each one falls in. That tool is already in planning; the E03 demo chain becomes viable once it ships.

→ [Read the spec](https://github.com/debrief/debrief-future/blob/main/specs/078-generate-reference-points/spec.md)
→ [Python implementation](https://github.com/debrief/debrief-future/blob/main/services/calc/src/debrief_calc/tools/generate_reference_points.py)
→ [TypeScript implementation](https://github.com/debrief/debrief-future/blob/main/apps/vscode/src/services/calcService.ts)
