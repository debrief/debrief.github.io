---
layout: future-post
title: "Shipped: SYSTEM Kind for Plot State Persistence"
date: 2026-01-23
track: "Shipped · schemas"
author: Ian
reading_time: 2
tags: [tracer-bullet, schemas, geojson]
excerpt: "Plots now preserve your viewport and selection state — temporal windows, map bounds, and selected features all survive save/load."
---

## What We Built

Debrief plots now persist your working context. When you save a plot, your time window, map viewport, and selected features are stored as SYSTEM features. When you reopen, you're exactly where you left off.

The implementation adds:
- `SYSTEM` value to the `kind` discriminator enum
- `SystemStateProperties` with variant discriminator (`state_type`)
- Three state variants: temporal, spatial, selection
- Reserved `state.*` ID pattern for O(1) lookup

## How It Works

SYSTEM features use Point geometry with empty coordinates:

```json
{
  "type": "Feature",
  "id": "state.temporal",
  "geometry": {
    "type": "Point",
    "coordinates": []
  },
  "properties": {
    "kind": "SYSTEM",
    "state_type": "temporal",
    "start_time": "2024-01-15T09:00:00Z",
    "end_time": "2024-01-15T17:30:00Z"
  }
}
```

The schema validates that SYSTEM features have Point geometry with empty coordinates and correctly-formatted IDs. Invalid structures are rejected at parse time, not runtime.

## Evidence

All tests pass (53 total):
- 3 valid SYSTEM fixtures (temporal, spatial, selection)
- 2 invalid SYSTEM fixtures (geometry validation, ID pattern)
- Full round-trip validation in Python and TypeScript

Generated artifacts:
- Pydantic models with `SystemState` class
- TypeScript interfaces with full type safety
- JSON Schema for frontend validation

## What's Next

This enables the viewport save/restore feature in the loader app. With the schema in place, the next step is wiring up the UI to read/write these state features when plots are opened and saved.

→ [View the PR](https://github.com/debrief/debrief-future/pull/82)
