---
layout: future-post
title: "Shipped: REP File Import in VS Code"
date: 2026-01-23
track: [credibility]
author: Ian
reading_time: 3
tags: [vscode-extension, data-import, tracer-bullet]
excerpt: "Drag a REP file onto the map. Watch your tracks appear. That simple."
---

## What We Built

REP file import now works inside the VS Code extension. Two ways to get data in:

1. **Drag-and-drop** — drop a `.rep` file directly onto the map panel
2. **Context menu** — right-click any REP file in the Explorer, pick your target plot

Either way, the file is parsed, stored as a STAC asset (for provenance), and the tracks appear on the map. The view automatically zooms to fit everything.

## The Flow

Drop a file. Watch the progress:

1. Checking for duplicates...
2. Parsing REP file...
3. Storing asset...
4. Storing features...

Then: tracks on screen, map zoomed to fit. For a typical REP file, under 5 seconds total.

If something goes wrong, you get a message that actually helps. Invalid format at line 42? The error says so. Already imported that file? Warning dialog asks what you want to do. Tried to drop three files at once? Polite rejection with explanation.

## Architecture Decision

IoService is storage-agnostic. It parses REP files and returns GeoJSON features. Full stop.

The VS Code extension acts as orchestrator:
- Call IoService to parse
- Call StacService to store the asset
- Call StacService to store the features
- Update the map

This separation matters. When we add different storage backends later (local files, S3, whatever), IoService stays unchanged. Parsing is parsing. Storage is storage. The orchestrator decides where data goes.

```
User drops file
    |
    v
MapPanel (orchestrator)
    |
    +-- IoService.parseRep() --> GeoJSON features
    |
    +-- StacService.addAsset() --> store original file
    |
    +-- StacService.addFeatures() --> merge into plot
    |
    v
Map updates, zooms to fit
```

## Error Handling

We wrote 24 tests just for error messages. Each error code has a template:

| Error | Message |
|-------|---------|
| INVALID_FORMAT | "Invalid REP format in {file} at line {line}" |
| DUPLICATE_IMPORT | "File has already been imported to this plot" |
| PARSE_FAILED | "Could not parse {file}: {cause}" |
| STORAGE_ERROR | "Failed to store data. Check disk space and try again." |

Line numbers matter. Field names matter. When an analyst sees an error, they should know what to fix.

## By The Numbers

- **114 tests** passing across 11 test files
- **24 new tests** for bounds calculation, error messages, IoService types
- **522ms** total test runtime
- **0 network calls** — works completely offline

## What's Next

This completes the tracer bullet for VS Code extension data import. The pipeline now runs from REP file to STAC storage to map visualization. Next milestone: analysis tools integration, so imported data becomes the input for calculations and queries.

> [View the spec](/specs/021-load-rep-files-stac/spec.md) | [See evidence](/specs/021-load-rep-files-stac/evidence/)
