---
layout: page
title: "STAC Server (Static)"
date: 2025-05-21
tags: [Mermaid]
mermaid: true
---

This document defines the `STAC Server (Static / File-Based)` sub-system, part of the Debrief Rewrite under the **Core Sub-Systems** category.

## Purpose

The static STAC Server provides local access to spatial/temporal datasets (primarily GeoJSON FeatureCollections), along with metadata describing background layers and serial metadata. It enables basic file-based deployments of Debrief with no REST services or server processes.

## Implementation Strategy

* Follows [STAC Specification](https://stacspec.org/en) using static catalog layout
* Implements a `Year > Exercise > Serial` folder hierarchy
* Each serial is represented as a single GeoJSON file + STAC `item.json`
* `catalog.json` and `collections/*.json` form the root metadata index
* Background tile metadata is included if needed per serial

### Folder Structure

```
stac-root/
├── catalog.json
├── collections/
│   └── tracks.json
├── 2026/
│   └── cold-depths/
│       └── serial-01/
│           ├── item.json
│           └── serial-01.geojson
```

### STAC Metadata Files

* `catalog.json`: top-level entry point
* `collections/tracks.json`: describes the FeatureCollection type
* `item.json`: metadata for a single serial, references one GeoJSON file as an `asset`


Sample `catalog.json`:
```json
{
  "stac_version": "1.0.0",
  "type": "Catalog",
  "id": "debrief-root",
  "title": "Debrief Plot Archive",
  "description": "Top-level catalog for locally stored wargame plots and serials.",
  "links": [
    {
      "rel": "child",
      "href": "collections/tracks.json",
      "type": "application/json",
      "title": "Track Data Collection"
    },
    {
      "rel": "child",
      "href": "2026/cold-depths/serial-01/item.json",
      "type": "application/json",
      "title": "Serial 01: Cold Depths"
    }
  ]
}
```

Example `collections/tracks.json`:
```json
{
  "stac_version": "1.0.0",
  "type": "Collection",
  "id": "tracks",
  "title": "Debrief Track Data",
  "description": "A collection of track plots and annotations for exercise analysis.",
  "license": "proprietary",
  "extent": {
    "spatial": {
      "bbox": [[-180.0, -90.0, 180.0, 90.0]]
    },
    "temporal": {
      "interval": [["2025-01-01T00:00:00Z", null]]
    }
  },
  "links": []
}
```

Example `item.json`:

```json
{
  "id": "serial-01",
  "type": "Feature",
  "stac_version": "1.0.0",
  "collection": "tracks",
  "properties": {
    "start_datetime": "2026-02-05T09:00:00Z",
    "end_datetime": "2026-02-05T12:00:00Z",
    "exercise": "cold-depths",
    "serial": "S01"
  },
  "assets": {
    "plot": {
      "href": "serial-01.geojson",
      "type": "application/geo+json",
      "title": "GeoJSON plot for serial-01"
    },
    "thumbnail": {
      "href": "serial-01.png",
      "type": "image/png",
      "title": "Thumbnail for serial-01"
    },
    "export": {
      "href": "serial-01.zip",
      "type": "application/zip",
      "title": "Exported serial-01 (dynamic HTML)"
    }
  }
}
```

## Maintenance and Control Flow

STAC metadata and folder hierarchy are maintained automatically by the Import Service or a lightweight STAC Indexer.

### Events and Updates

* **New Wargame**:

  * Create `Year/Exercise/` folder
  * Update `catalog.json` with new exercise link

* **New Serial**:

  * Create `Serial/` subfolder under `Exercise/`
  * Generate `serial-XX.geojson` and `item.json`
  * Update `catalog.json` and relevant `collection.json`

* **Save Serial**:

  * Overwrite or update `serial-XX.geojson`
  * Update `item.json` (timestamp, bounding box, duration)

* **Delete Serial**:

  * Delete GeoJSON and `item.json`
  * Update `catalog.json` to remove reference

* **Delete Wargame**:

  * Delete entire `Exercise/` folder
  * Update `catalog.json` to remove wargame link

* **Browse Years, Wargames, Serials**:

  * UI reads `catalog.json` and walks directory tree
  * Uses STAC links to populate tree/table views in client UI

## Spatial/Temporal Discovery

* Each `item.json` includes bounding box and time range
* Client can query this metadata to visualise data availability on a map or timeline

## Notes

* No server process is required
* All metadata is file-based and portable
* Designed for MOD deployments with static file access
* Can be adapted later to integrate with server-based STAC services

# STAC Metadata Events – Sequence Diagrams

## 📁 New Wargame

<div class="mermaid">
sequenceDiagram
    participant User
    participant ClientUI
    participant FileSystem
    participant CatalogJSON

    User->>ClientUI: Create new wargame (year + name)
    ClientUI->>FileSystem: Create Year/Exercise folder
    ClientUI->>CatalogJSON: Add exercise link to catalog.json
</div>

---

## 📂 New Serial

<div class="mermaid">
sequenceDiagram
    participant User
    participant ClientUI
    participant FileSystem
    participant CatalogJSON
    participant CollectionJSON

    User->>ClientUI: Save new serial (with data)
    ClientUI->>FileSystem: Create Exercise/Serial folder
    ClientUI->>FileSystem: Write serial.geojson
    ClientUI->>FileSystem: Generate item.json
    ClientUI->>CatalogJSON: Add serial link to catalog.json
    ClientUI->>CollectionJSON: Update collection/tracks.json
</div>

---

## 💾 Save Serial (Update)

<div class="mermaid">
sequenceDiagram
    participant User
    participant ClientUI
    participant FileSystem

    User->>ClientUI: Save changes to serial
    ClientUI->>FileSystem: Overwrite serial.geojson
    ClientUI->>FileSystem: Update item.json
</div>

---

## 🗑️ Delete Serial

<div class="mermaid">
sequenceDiagram
    participant User
    participant ClientUI
    participant FileSystem
    participant CatalogJSON

    User->>ClientUI: Delete serial
    ClientUI->>FileSystem: Delete serial.geojson and item.json
    ClientUI->>CatalogJSON: Remove serial link from catalog.json
</div>

---

## 🧹 Delete Wargame

<div class="mermaid">
sequenceDiagram
    participant User
    participant ClientUI
    participant FileSystem
    participant CatalogJSON

    User->>ClientUI: Delete wargame
    ClientUI->>FileSystem: Delete Exercise folder
    ClientUI->>CatalogJSON: Remove wargame link from catalog.json
</div>

---

## 🔍 Browse Years / Exercises / Serials

<div class="mermaid">
sequenceDiagram
    participant ClientUI
    participant FileSystem
    participant CatalogJSON

    ClientUI->>CatalogJSON: Read catalog.json
    CatalogJSON-->>ClientUI: Return year/exercise/serial links
    ClientUI->>FileSystem: Read item.json (optional preview)
</div>
