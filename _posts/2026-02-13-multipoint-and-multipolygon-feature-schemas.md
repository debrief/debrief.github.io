---
layout: future-post
title: Building MultiPoint and MultiPolygon Feature Schemas
date: '2026-02-13'
author: Ian
track: credibility
tags:
- geojson
excerpt: 'Multi-geometry schemas wired up: 6 new classes, 10 golden fixtures, 146
  tests passing'
reading_time: 3
---
## What We're Building

The styling schemas already describe multi-geometry support. PointProperties says "Styling schema for Point and MultiPoint geometries." PolygonProperties says "Styling schema for Polygon and MultiPolygon geometries." The documentation has been there from the start. The geometry classes haven't.

We're adding GeoJSONMultiPoint and GeoJSONMultiPolygon to the LinkML master schema, along with corresponding Feature types that pair them with those existing styling classes. Two new FeatureKindEnum values -- MULTI_POINT and MULTI_POLYGON -- complete the picture. Tools currently in development that return point clusters (intercept finders, rendezvous planners) or polygonal regions (coverage analysers, zone generators) will be able to emit validated, styled GeoJSON Features that flow through the same schema pipeline as everything else.

Zero new dependencies. Zero changes to existing styling classes. The pattern is identical to what we did for GeoJSONMultiLineString when compound tracks needed it -- add the geometry class, add the feature type, wire them together.

## How It Fits

This follows the schema-first pipeline: LinkML definition first, then generated Pydantic models, JSON Schema, and TypeScript types. The new classes are purely additive. Existing features remain valid. The generators produce the code, and golden fixtures validate the output.

The feature properties include `source_tool` and `source_features` fields for provenance tracking, connecting to the PROV schema foundation from feature 070. When a tool produces a MultiPoint result, the feature records which tool created it and which input features it was derived from. Provenance always, per the constitution.

## Key Decisions

- **Follow the existing pattern exactly.** GeoJSONMultiLineString was added for compound tracks. GeoJSONMultiPoint and GeoJSONMultiPolygon follow the same structural approach: `type` constrained by `equals_string`, `coordinates` as a multivalued float array with nesting validated through Pydantic and golden fixtures rather than LinkML (which cannot express nested array structures).

- **Reuse existing styling classes.** PointProperties and PolygonProperties already document multi-geometry support in their descriptions. No changes needed -- the styling schemas were designed for this from the beginning.

- **Properties follow the tool result pattern.** Each feature type gets a Properties class with `kind` discriminator, required `label` and `style`, and optional provenance fields (`source_tool`, `source_features`, `description`). Same shape as existing features like ReferenceLocation and CircleAnnotation.

- **Single style per feature, not per element.** A MultiPoint feature applies one PointProperties to all its points. Per-element styling (different colours for individual points within a multi-geometry) is not in scope. If the need arises, it's a separate feature.

- **Coordinate nesting handled outside LinkML.** LinkML models coordinates as flat `float[]` with `multivalued: true`. The actual GeoJSON nesting structure -- `[[lon, lat], ...]` for MultiPoint, `[[[[lon, lat], ...]], ...]` for MultiPolygon -- is validated by Pydantic models and golden fixture files. This is the same approach used for every other geometry class in the schema.

When we shipped the styling schemas back in January, PointProperties already said "for Point and MultiPoint geometries" and PolygonProperties said "for Polygon and MultiPolygon geometries." The styling classes were ready. The geometry classes weren't.

Now they are. The LinkML master schema includes GeoJSONMultiPoint and GeoJSONMultiPolygon geometry classes, along with four supporting schema classes (two Properties, two Features) and two new FeatureKindEnum values: MULTI_POINT and MULTI_POLYGON. All generated artifacts -- Pydantic models, JSON Schema, TypeScript interfaces -- regenerated cleanly. Zero new dependencies. Zero changes to existing classes.

A rendezvous planner that finds candidate meeting points between two tracks can now return a proper MultiPoint feature:

```json
{
  "type": "Feature",
  "id": "mp-rendezvous-002",
  "geometry": {
    "type": "MultiPoint",
    "coordinates": [[-3.5, 51.0], [-3.6, 51.1]]
  },
  "properties": {
    "kind": "MULTI_POINT",
    "label": "Rendezvous Candidates",
    "style": {
      "shape": "triangle",
      "radius": 8,
      "fill_color": "#00FF00",
      "fill_opacity": 0.6
    },
    "source_tool": "rendezvous-planner",
    "source_features": ["track-alpha", "track-bravo"]
  }
}
```

That feature validates against the schema, carries its own styling, records which tool created it and from what inputs, and flows through the full pipeline into a STAC catalog. A coverage analyser returning exclusion zones -- including polygons with interior holes for safe passage corridors -- works the same way with MultiPolygon and PolygonProperties.

## By the Numbers

10 golden fixtures created: 6 valid (including edge cases like a single-point MultiPoint and polygons with interior rings), 4 invalid (missing style, wrong kind discriminator). The test suite went from 135 to 146 passing tests, zero regressions. TypeScript compilation clean.

The FeatureKindEnum now has 11 values: TRACK, POINT, NARRATIVE, CIRCLE, RECTANGLE, LINE, TEXT, VECTOR, SYSTEM, MULTI_POINT, MULTI_POLYGON. Every entity type in the schema has at least one valid and one invalid golden fixture.

## Lessons Learned

The most satisfying part of this feature was how little design work it required. The styling schemas anticipated multi-geometry support from day one. The structural pattern was established when GeoJSONMultiLineString was added for compound tracks. Following that pattern -- add the geometry class, add the Properties and Feature classes, wire them to the existing styling -- made this a matter of execution rather than invention.

LinkML's nested array limitation continues to be a non-issue in practice. Coordinates are modelled as flat `float[]` in LinkML, with the actual GeoJSON nesting structure validated by Pydantic models and golden fixtures. The test framework's `is_known_geometry_limitation()` function handles the expected warnings cleanly. Four new warnings joined the existing thirteen, all accounted for.

## What's Next

Tools in debrief-calc can now return MultiPoint and MultiPolygon results that flow through the full schema pipeline: LinkML to Pydantic to JSON Schema to TypeScript. The intercept finder, coverage analyser, and zone generator -- tools currently in development -- have validated, styled output types waiting for them.

> [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/081-add-multi-feature-styling/spec.md)
> [Test summary](https://github.com/debrief/debrief-future/tree/main/specs/081-add-multi-feature-styling/evidence/test-summary.md)
