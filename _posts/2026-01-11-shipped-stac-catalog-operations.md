---
layout: future-post
title: "Shipped: Local STAC Catalog Operations"
date: 2026-01-11
track: "Shipped · Stage 1"
author: Ian
reading_time: 4
tags: [tracer-bullet, stac, storage, python, shipped]
excerpt: "Local STAC catalog operations are complete. Debrief v4.x can now create catalogs, store plots, and preserve provenance — all offline."
---

## What We Built

The debrief-stac service is operational. Debrief v4.x can now create local STAC catalogs, store analysis plots as STAC Items, append GeoJSON features, and preserve source files with full provenance tracking.

Every plot is a STAC Item. Every track and reference location lives in validated GeoJSON assets. Every original source file is preserved with metadata recording when it was loaded, what tool processed it, and the original file path.

## Key Accomplishments

- **Create local STAC catalogs** at user-specified paths with valid `catalog.json`
- **Create plots** (STAC Items) with title, description, temporal extent, and geometry bounds
- **Add GeoJSON features** to plots with automatic bbox recalculation
- **Preserve source files** as assets with provenance metadata
- **List and browse** catalog contents with summary information
- **MCP tool exposure** for all operations (VS Code extension ready)
- **Full validation** against Stage 0 Pydantic models for all features

## What We Learned

**STAC is well-suited to this use case.** The STAC specification maps cleanly to Debrief's plot concept. Items hold metadata, assets hold data files, and the catalog structure handles organisation.

**Provenance tracking pays off early.** Even in testing, knowing exactly which source file produced which features helped debug parsing issues. Constitution Article III was right to mandate this.

**Bbox auto-calculation is essential.** Manually tracking geometry bounds would have been error-prone. Calculating bbox on feature addition keeps the STAC Item always consistent with its contents.

## What's Next

With storage in place, the pipeline can flow:

- **debrief-io** (Stage 2) can now store parsed features directly into plots
- **debrief-config** (Stage 3) can register catalogs for the loader to find
- **The VS Code extension** (Stage 6) can browse catalogs via MCP tools

The storage backbone is ready. Time to fill it with data.

> [View the code on GitHub](https://github.com/debrief/debrief-future)
