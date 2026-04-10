---
layout: future-post
title: "Shipped: Enlarge Shape Tool Spec"
date: 2026-02-13
track: [credibility]
author: Ian
reading_time: 3
tags: [tracer-bullet, tool-specs, shape-manipulation]
excerpt: "Second shape manipulation spec: scaling annotations via linear interpolation with 3 golden fixtures"
---


## What We Built

The second tool in the `shape/manipulation` family: a language-neutral specification for scaling annotation shapes by a multiplicative factor. An analyst selects a circle marking an exercise area, a rectangle around a patrol zone, a vector indicating a threat axis -- and scales it bigger or smaller relative to an origin point. The spec lives at `shared/tools/shape/manipulation/enlarge-shape.1.0.md`, following the same nine-section #049 template as its sibling move-shape.

Three golden I/O fixture pairs define the contract. Basic-polygon: a rectangle scaled 3x from its geometric centroid, every vertex verified at exactly 3x the original distance. Custom-origin: scaling 2x from an explicit vertex, where that vertex stays fixed and everything else doubles its distance. Noop: scale factor 1.0, coordinates unchanged, provenance still recorded.

No Python. No TypeScript. Just a precise description of what any implementation must do, with JSON fixtures to prove it.

## How It Works

The algorithm is simpler than move-shape's Vincenty math. Scaling multiplies the coordinate difference between each vertex and the origin:

```
new_lon = origin_lon + scale_factor * (old_lon - origin_lon)
new_lat = origin_lat + scale_factor * (old_lat - origin_lat)
```

This is linear interpolation in geographic coordinates. For annotation shapes spanning a few kilometres -- typical maritime exercise areas -- the distortion from treating lat/lon as flat is under 0.1% at mid-latitudes. Move-shape needed great-circle formulas because it translates by bearing and distance, inherently spherical parameters. Scaling is different: it is a ratio applied to coordinate differences, and the simpler approach is the correct one here.

The default origin is the shape's arithmetic mean centroid -- the average of all vertex coordinates. We considered the area centroid from the shoelace formula, but for the convex shapes typical in Debrief annotations (4-8 vertices), the difference is negligible. The arithmetic mean also works identically for polygons, lines, and points.

Each annotation kind has its own handling. Circles get their `center` property recomputed from the scaled vertices. Vectors have their `origin` repositioned, but `range` and `bearing` are preserved -- scaling changes where the vector sits, not what it means. Text labels scale as points. The `scale_factor` parameter declares preset choices [0.25, 0.5, 1.5, 2.0, 3.0, 5.0] so frontends can offer a context menu, while still accepting any non-negative numeric value.

The result type is `mutation/shape/scaled`, with provenance recording the origin point, scale factor, and source feature IDs.

## Lessons Learned

The planning post asked three open questions: whether arithmetic mean centroid was adequate, whether scale factor 0 should warn, and whether latitude clamping was preferable to erroring. The spec landed on: yes (adequate for convex shapes), no (silent degenerate geometry with provenance), and yes (clamp to [-90, 90] with longitude wrapping to [-180, 180]). These felt like the least surprising behaviours. Undo still works in every case, and provenance records exactly what happened.

Fifteen edge cases made it into the spec -- five more than the minimum. The interesting ones are the per-kind annotation rules. A circle's center must be recomputed, not just shifted. A vector's bearing must be left alone. A polygon's closing vertex (which duplicates the first) must track the scaled first vertex. These details are exactly what a spec-first approach is designed to capture before anyone writes a line of code.

Writing this alongside move-shape confirmed that the #049 template scales well across tool types. The structure is the same -- metadata, MCP descriptions, inputs, outputs, algorithm, edge cases, examples, changelog, references -- but the content is genuinely different. The template guides without constraining.

## What's Next

Two of three shape manipulation tools are now specified: translate and scale. Rotation is the natural third, completing the set of affine-like transformations. Implementation of both move-shape and enlarge-shape in Python and TypeScript can proceed in parallel -- the golden fixtures define the acceptance criteria.

> [See the spec](https://github.com/debrief/debrief-future/tree/main/shared/tools/shape/manipulation/enlarge-shape.1.0.md)
> [Test summary](https://github.com/debrief/debrief-future/tree/main/specs/057-enlarge-shape/evidence/test-summary.md)
