---
layout: future-post
title: "Shipped: Nested Child Selection"
date: 2026-02-07
track: [credibility]
author: Ian
reading_time: 4
tags: [tracer-bullet, session-state, selection-model, schema]
excerpt: "Analysts can now select individual positions within tracks, not just whole features"
---


## What We Built

Until now, clicking a track in Debrief selected the whole track. The properties panel showed a track summary, tools operated on the entire feature, and if you wanted to ask about that specific position at 14:32 where the vessel changed course, you had to eyeball it.

The selection model now supports path strings that identify child elements at arbitrary depth. A single position within a track is `track-hms-defender/positions/4`. A position within a named segment within a track is `track-hms-defender/segments/leg-alpha/positions/3`. Analysts can hold mixed-depth selections -- a whole track alongside a specific position on a different track -- in one operation.

The backward compatibility story turned out to be the best part. Paths are plain strings stored in the existing `featureIds` array. A single-segment path like `track-hms-defender` is identical to a flat feature ID. No schema change. No version bump. No changes to store action signatures. The existing 22 tests in `features.test.ts` passed without modification.

## How It Works

A selection path follows a simple structure: `{featureId}/{levelName}/{address}`, repeatable to any depth. Level names come from a shared registry (`LevelDefinition`) that declares whether each level uses ID-based addressing (segments use string IDs like `leg-alpha`) or index-based addressing (positions use numeric indices like `4`).

```typescript
// Parse a path into its components
parsePath("track-001/segments/leg-alpha/positions/3")
// -> { root: "track-001",
//      levels: [{levelName: "segments", address: "leg-alpha"},
//               {levelName: "positions", address: "3"}],
//      depth: 2 }

// Quick accessors without a full parse
getRoot("track-001/positions/4")   // -> "track-001"
getDepth("track-001/positions/4")  // -> 1
getParent("track-001/positions/4") // -> "track-001"
```

The store actions -- `setSelection`, `addToSelection`, `removeFromSelection` -- accept paths exactly as they accepted flat IDs before. The store normalises on the way in (strips whitespace and trailing slashes, rejects empty segments) and deduplicates on add. Removing uses exact match; removing `track-001` does not remove `track-001/positions/4`.

Leaf-only semantics are enforced: selecting a child does not implicitly add the parent to the selection. If a tool needs to know which root features are involved, the `ToolMatchAdapter` extracts root feature IDs from paths using `getRoot`. Tools that require whole-track selection won't falsely match when only child positions are selected.

Special characters in IDs use RFC 6901 escaping: `~0` for literal tilde, `~1` for literal forward slash. A feature with ID `track/alpha` is encoded as `track~1alpha` and round-trips cleanly through parse and build.

The entire implementation is about 170 lines of pure TypeScript with no new dependencies.

## What We Learned

**Designing for strings paid off.** The decision to represent paths as plain strings in the existing `featureIds` array meant zero interface changes. Every consumer that treats feature IDs as opaque strings -- which is most of them -- kept working. The only consumers that needed updates were the ones that already inspect selection contents: the properties panel and tool matching.

**Two-tier validation was the right call.** The store validates structure (non-empty, no double slashes, valid escape sequences) on every path that enters the selection. Semantic validation (does position 42 actually exist in this track?) is the consumer's responsibility. This keeps the store fast and data-agnostic. A path referencing a position that no longer exists stays in the selection and the UI marks it as unresolvable -- the store doesn't subscribe to data changes, and silently pruning the analyst's selection felt wrong.

## What's Next

With the selection model in place, the next step is wiring it to the map interaction layer -- detecting clicks on individual position points within a LineString and generating the right path. After that, the properties panel can show position-level details instead of track summaries when a position is selected.

-> [See the specification](https://github.com/debrief/debrief-future/tree/main/specs/053-nested-child-selection)
