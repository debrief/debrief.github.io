---
layout: future-post
title: Building Local STAC Catalog Operations
date: '2026-01-11'
author: Ian
track: Shipped · Stage 1
tags:
- storage
excerpt: Local STAC catalog operations are complete. Debrief v4.x can now create catalogs,
  store plots, and preserve provenance — all offline.
reading_time: 4
---
## What We're Building

The debrief-stac service is Debrief v4.x's storage backbone. It provides a Python library for creating and managing STAC (SpatioTemporal Asset Catalog) catalogs on local filesystems, storing analysis plots as STAC Items with GeoJSON features and source file assets.

STAC is an open standard for geospatial data. By adopting it, we get a well-defined structure for organising maritime analysis data, interoperability with existing geospatial tools, and a foundation that could eventually connect to cloud STAC APIs if needed (while remaining fully functional offline).

Every plot in Debrief v4.x will be a STAC Item. Every track, sensor contact, and reference location will live in GeoJSON assets. And every original source file will be preserved with provenance metadata.

## How It Fits

This is Stage 1 of the tracer bullet, building directly on the Schema Foundation from Stage 0. The service:

- Depends on **debrief-schemas** for Pydantic validation of all features
- Is consumed by **debrief-io** (Stage 2) to store parsed features
- Exposes MCP tools for the **VS Code extension** (Stage 6) to browse and load plots

Constitution Article III requires provenance tracking, so every source file copied into a plot carries metadata about when it was loaded, what tool processed it, and the original file path.

## Key Decisions

- **Local STAC catalogs** — `catalog.json` at root, each plot in its own subdirectory with `item.json` and assets
- **GeoJSON as the feature container** — FeatureCollection per plot, validated against Stage 0 schemas
- **BBox auto-calculation** — adding features automatically updates the plot's bounding box
- **MCP tools as thin wrappers** — core library is pure Python, MCP layer adds no business logic
- **Provenance in asset metadata** — `debrief:provenance` extension field records source path, timestamp, tool version

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
