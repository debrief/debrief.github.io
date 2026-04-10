---
layout: future-post
title: "Shipped: REP sensor import"
date: 2026-04-10
track: [credibility]
author: Ian
reading_time: 3
tags: [tracer-bullet, sensor-data, debrief-io, parsing, rep-format, python]
excerpt: "REP files with SENSOR, SENSOR2, SENSOR3, and SENSORARC lines now import as embedded sensor data on tracks."
---

## What We Built

Legacy REP files carry sensor observation data across four line formats: `;SENSOR:`, `;SENSOR2:`, `;SENSOR3:`, and `;SENSORARC`. Until now, debrief-io either ignored these lines or produced standalone annotation features that didn't connect to the tracks they belonged to. Analysts couldn't see their towed-array bearings, frequency-only contacts, or coverage arcs after import.

Now all four formats parse correctly and embed directly into the parent TrackFeature's `properties.sensors[]` array, conforming to the schema established in #116. A REP file with track positions and fifty TOWED_ARRAY contacts produces a single TrackFeature with the contacts nested inside it -- no orphaned features, no data loss, no post-processing step.

Frequency-only contacts (NULL or NAN bearings) come through as well. They get `has_bearing=false` instead of being silently dropped, preserving the observations that downstream Doppler analysis needs.

## How It Works

The parser processes all lines in a single pass, accumulating sensor data in memory, then attaches sensors to tracks after every line has been read. This means sensor lines can appear before, after, or interleaved with the track positions they reference -- order doesn't matter.

Key transformations during parsing:

- **Format merging** -- `;SENSOR:`, `;SENSOR2:`, and `;SENSOR3:` contacts with the same sensor name on the same track merge into one `SensorData` entry, regardless of which format version produced them
- **Unit conversion** -- range values convert from yards to metres (1 yard = 0.9144 m) before storage
- **Color mapping** -- symbology codes (`@A`=Blue, `@C`=Red, etc.) map to CSS hex values via the existing `symbology.py` module
- **Coordinate handling** -- explicit DMS coordinates populate the contact's `origin` field; NULL locations leave it empty for render-time derivation from the host track
- **Coverage arcs** -- `;SENSORARC` lines produce `DynamicTrackCoverage` annotations with angular and range bounds, stored separately from point contacts

The refactored pipeline in `debrief-io` replaces the old `build_sensor` and `build_sensor2` standalone annotation builders entirely. Zero standalone sensor features appear in the output.

## Key Decisions

- **Embed, don't annotate.** Sensors live inside `TrackFeature.properties.sensors[]`, not as sibling features. This matches how analysts think about the data -- a towed array belongs to its platform.
- **Parse accuracy, discard it.** SENSOR3 bearing and frequency accuracy fields are parsed (so the lines don't cause errors) but not stored. The #116 schema defers accuracy support to a later phase.
- **Warn on orphans.** Sensor lines referencing a track name with no position data in the file produce a warning, not an error. The file still imports successfully.

## What's Next

Sensor data is now correctly parsed, embedded, and visible in the Layers panel (via #179). The next step is rendering sensor contacts on the map (#118) -- drawing bearing lines, ambiguous-bearing fans, and coverage arcs on the chart using the same path-scheme IDs that the Layers panel already understands.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/117-rep-sensor-import/spec.md)
