---
layout: future-post
title: "Shipped: Schema Foundation"
date: 2026-01-11
track: "Shipped · Stage 0"
author: Ian
reading_time: 4
tags: [tracer-bullet, schemas, linkml, pydantic, shipped]
excerpt: "The schema foundation is complete. LinkML now generates Pydantic models, JSON Schema, and TypeScript interfaces from a single source of truth."
---

## What We Built

The Schema Foundation is live. We now have a single LinkML schema that generates validated Pydantic models for Python, JSON Schema for frontend validation, and TypeScript interfaces for type-safe UI development.

This means when a Python service validates a TrackFeature and the TypeScript frontend renders it, they're both working from the same schema definition. No drift. No surprises. No manual synchronisation.

## Key Accomplishments

- **LinkML schemas** for TrackFeature and ReferenceLocation (the tracer bullet scope)
- **Pydantic models** with full type annotations and validation
- **JSON Schema** for frontend and API contract validation
- **TypeScript interfaces** for type-safe frontend development
- **Golden fixtures** with valid and invalid examples for each entity type
- **Three adherence test strategies**: golden fixtures, round-trip testing, and schema comparison
- **Single `make generate` command** that propagates any LinkML change to all targets

## What We Learned

**LinkML is the right choice.** The generator ecosystem is mature, and the ability to target multiple outputs from a single source eliminated the schema drift problem we've seen in other projects.

**Round-trip testing catches subtle bugs.** We found edge cases in timestamp serialisation and coordinate precision that only surfaced when data went Python → JSON → TypeScript → JSON → Python. Those tests are now part of CI.

**Golden fixtures force clarity.** Writing explicit valid/invalid examples for each schema made us think carefully about edge cases upfront rather than discovering them in production.

## What's Next

The Schema Foundation unblocks everything else:

- **debrief-stac** (Stage 1) can now validate STAC Items and GeoJSON features
- **debrief-io** (Stage 2) can validate parsed REP files against real schemas
- **Future schemas** (SensorContact, PlotMetadata, ToolMetadata) will follow the same pattern

The tracer bullet continues.

> [View the code on GitHub](https://github.com/debrief/debrief-future)
