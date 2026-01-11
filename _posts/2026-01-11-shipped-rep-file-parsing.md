---
layout: future-post
title: "Shipped: REP File Parsing"
date: 2026-01-11
track: "Shipped · Stage 2"
author: Ian
reading_time: 4
tags: [tracer-bullet, parsing, rep-format, python, shipped]
excerpt: "REP file parsing is complete. Legacy Debrief files now transform into validated GeoJSON with line-level error reporting."
---

## What We Built

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
