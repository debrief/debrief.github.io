---
layout: future-post
title: "Schema validation now works across Python and TypeScript"
date: 2026-01-12
track: "Momentum · Track 1"
author: Ian
reading_time: 4
tags: [tracer-bullet, schemas]
excerpt: "The tracer bullet hit its first real milestone: cross-language schema validation."
---

The tracer bullet hit its first real milestone this week: a GeoJSON feature validated in Python, serialised to JSON, deserialised in TypeScript, and validated again — with both ends agreeing on the schema.

This sounds mundane, but it's the foundation everything else builds on. When debrief-io transforms a REP file into GeoJSON, and debrief-stac stores it, and a VS Code extension displays it — they all need to agree on what a "track" looks like.

## The approach

LinkML gives us a single source of truth. The schema is defined once:

```yaml
classes:
  Track:
    description: A vessel track with positions over time
    attributes:
      id:
        range: string
        required: true
      name:
        range: string
      positions:
        range: Position
        multivalued: true
```

From this, we generate:
- Pydantic models for Python
- JSON Schema for validation
- TypeScript interfaces for the frontend

## What's next

The schema is minimal right now — just enough to prove the pipeline works. Next steps:

- Add sensor data types
- Define the STAC Item structure for plots
- Get the REP file parser producing valid output

→ [See the code](https://github.com/debrief/debrief-future)
