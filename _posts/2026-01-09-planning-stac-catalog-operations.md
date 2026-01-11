---
layout: future-post
title: "Planning: Local STAC Catalog Operations"
date: 2026-01-09
track: "Planning · This Week"
author: Ian
reading_time: 3
tags: [tracer-bullet, stac, storage, python]
excerpt: "Building local STAC catalog operations for offline-first analysis storage in Debrief v4.x."
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

## What We'd Love Feedback On

- What metadata about plots is essential for browsing? Title and date seem obvious, but what else?
- Are there STAC extensions (beyond what we're defining) that would be useful?
- How should we handle large plots with thousands of features? Separate FeatureCollections per track?

> [Join the discussion on GitHub](https://github.com/debrief/debrief-future/discussions)
