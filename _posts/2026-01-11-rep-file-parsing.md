---
layout: future-post
title: Building REP File Parsing
date: '2026-01-11'
author: Ian
track: Shipped · Stage 2
tags:
- parsing
- rep-format
excerpt: REP file parsing is complete. Legacy Debrief files now transform into validated
  GeoJSON with line-level error reporting.
reading_time: 4
---
## What We're Building

The debrief-io service transforms legacy file formats into validated GeoJSON features. We're starting with REP files, the primary data format for Debrief v3.x, because parsing them is the critical path for demonstrating the entire architecture.

This isn't just a REP parser. It's an extensible handler registry that will support multiple formats. Register a handler for `.rep`, and the parser automatically routes files to it. Add a new handler for `.gpx` later, and it slots right in.

Every feature that comes out of the parser is validated against our Stage 0 Pydantic models. If a coordinate is out of range or a required field is missing, you'll know exactly which line of the source file caused it.

## How It Fits

Stage 2 of the tracer bullet sits between raw files and storage:

- Uses **debrief-schemas** (Stage 0) to validate all output features
- Feeds validated features into **debrief-stac** (Stage 1) for storage
- Exposes MCP tools for the **Electron loader** (Stage 4) to invoke parsing

The Constitution requires pure transformations with no side effects. debrief-io reads files and returns data. It never writes to disk. That's debrief-stac's job.

## Key Decisions

- **REP format first** — it's the primary legacy format and validates our entire pipeline
- **Handler registry pattern** — `register_handler(".rep", REPHandler)` makes the system extensible
- **Line numbers in all errors** — Constitution Article I.3 says no silent failures; we go further with precise error locations
- **Encoding detection** — try UTF-8 first, fall back to Latin-1 for legacy files
- **Continue after recoverable errors** — collect warnings, return what we can parse, let the caller decide
- **MCP thin wrappers** — core parsing is pure Python, MCP layer adds no business logic

The debrief-io service is operational. REP files — Debrief's primary legacy format — now transform into validated GeoJSON features. Every output feature is checked against our Stage 0 Pydantic models. Every error includes the exact line number that caused it.

This isn't just a parser. It's an extensible handler registry. Add a new format handler, and the system routes files automatically. REP today. GPX tomorrow. The architecture stays the same.

## Key Accomplishments

- **REP format parsing** for tracks and reference locations
- **Handler registry pattern** for extensible format support
- **Line-level error reporting** with field names and context
- **Encoding detection** (UTF-8 first, Latin-1 fallback for legacy files)
- **Recoverable error handling** (collect warnings, return what we can parse)
- **MCP tool exposure** for loader app integration
- **Full validation** against Stage 0 schemas for all output features

## What We Learned

**Line numbers in errors are worth the effort.** When a coordinate is out of range or a timestamp is malformed, knowing it's on line 247 of a 3000-line file saves significant debugging time.

**Encoding detection is essential.** Real-world REP files from older systems use Latin-1, not UTF-8. Silent mojibake would have corrupted data. Detecting and reporting encoding avoids this.

**Pure transformations simplify testing.** Because debrief-io only reads files and returns data (no side effects), tests are deterministic and fast. The same input always produces the same output.

## What's Next

The parsing layer connects raw files to validated storage:

- **Integration with debrief-stac**: parsed features flow directly into STAC plots
- **Additional format handlers**: GPX, KML, and proprietary formats as needed
- **Sensor contact parsing**: extending REP support for bearing/range data

The tracer bullet has pierced through schemas, storage, and parsing. The data pipeline is operational.

> [View the code on GitHub](https://github.com/debrief/debrief-future)
