---
layout: future-post
title: "Shipped: GeoJSON Styling Properties Schemas"
date: 2026-01-20
track: [credibility]
author: Ian
reading_time: 4
tags: [tracer-bullet, schemas, linkml, geojson]
excerpt: "Standardized styling schemas enable consistent visual rendering of maritime tracks, waypoints, and annotations across all frontends"
---

## What We Built

Every GeoJSON feature in Debrief now carries explicit styling information that maps directly to Leaflet rendering options. We've shipped four new LinkML schemas — `PointProperties`, `LineProperties`, `PolygonProperties`, and `TrackStyle` — that define how features should look on the map.

All existing feature types (tracks, reference locations, and six annotation types) now have a required `style` property. No more ad-hoc frontend decisions about line thickness, marker shapes, or transparency. The data now describes its own visual representation.

This is a schema-first feature. We wrote LinkML definitions, generated Pydantic models and JSON Schema automatically, and validated everything with 119 passing tests across 24 valid and 21 invalid fixtures.

## Why It Matters

Before this change, a track had a single `color` property. Frontends had to guess everything else: Should the line be thick or thin? Dashed or solid? What shape should position markers use? Should annotations have fills or just outlines?

Now the data is self-describing. A track file looks like this:

```json
{
  "type": "Feature",
  "geometry": { "type": "LineString", "coordinates": [...] },
  "properties": {
    "kind": "TRACK",
    "name": "NELSON",
    "style": {
      "line": {
        "color": "#0066CC",
        "weight": 3,
        "opacity": 0.9,
        "dash_array": null
      },
      "point": {
        "shape": "circle",
        "radius": 6,
        "fill_color": "#0066CC",
        "fill_opacity": 0.8,
        "stroke": true,
        "color": "#FFFFFF",
        "weight": 2
      }
    }
  }
}
```

The frontend reads `style.line` and `style.point` and renders exactly what the data specifies. No translation layer. No lookup tables. Just direct mapping to Leaflet Path options.

## Technical Highlights

**Leaflet naming conventions**

We didn't invent new vocabulary. Every property name matches Leaflet exactly: `stroke`, `weight`, `opacity`, `fillColor`, `fillOpacity`, `dashArray`, `lineCap`, `lineJoin`. Frontend code can pass styling properties straight through to the renderer.

**Composite styling for tracks**

Tracks are unique — they're both lines and points. The `TrackStyle` schema contains both `line` (LineProperties) and `point` (PointProperties), allowing independent styling of the track path and position markers.

Here's a tactical example — red dashed line with white-outlined triangle markers:

```json
{
  "line": {
    "color": "#FF0000",
    "weight": 3,
    "opacity": 0.9,
    "dash_array": "10, 5"
  },
  "point": {
    "shape": "triangle",
    "radius": 6,
    "fill_color": "#FF0000",
    "fill_opacity": 1.0,
    "stroke": true,
    "color": "#FFFFFF",
    "weight": 1
  }
}
```

**Validation at every layer**

The LinkML schemas generate Pydantic models (Python) and JSON Schema (TypeScript). Invalid styling gets caught early:

- Negative line weights fail validation
- Opacity values outside 0-1 are rejected
- Invalid point shapes are flagged
- Missing required properties trigger clear errors

We have fixtures for every edge case: zero radius markers (valid), invalid shape enums (fails), out-of-range opacity (fails), empty dash arrays (valid).

**119 tests, all passing**

- 24 valid fixtures (styles that should pass)
- 21 invalid fixtures (styles that should fail)
- Round-trip serialization tests (Python → JSON → TypeScript → JSON → Python)
- Fixture consistency tests (all entities covered, valid JSON syntax)

## What's Next

This styling foundation unlocks frontend work. The VS Code extension map view (feature 006) can now render tracks, reference locations, and annotations with full visual fidelity. No more placeholder colors or hardcoded line weights.

We're also exploring how to handle MIL-STD-2525 military symbols. The current point shapes (`circle`, `square`, `triangle`) are deliberately minimal. Icons and symbology will be a separate extension to the styling system once we understand the rendering requirements better.

The immediate next step is to start using these schemas in `debrief-io` (feature 002) when parsing REP files. Every track and annotation will get default styling on import, with explicit color and line weight values instead of null placeholders.

→ [See the PR](https://github.com/debrief/debrief-future/pull/59)
→ [View the schemas](https://github.com/debrief/debrief-future/blob/main/shared/schemas/src/linkml/styling.yaml)
