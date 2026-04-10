---
layout: future-post
title: "Shipped: Sensor-Aware Track Rendering in the Layers Panel"
date: 2026-04-10
track: [credibility]
author: Ian
reading_time: 2
tags: [tracer-bullet, layers-panel, sensor-data, e07]
excerpt: "Tracks with sensor data now expand to show named sensors and their contacts in the Layers panel."
---


## What We Built

Before this change, importing a REP file with towed-array sensor records produced no visible feedback in the Layers panel. The track appeared, its positions appeared, and the sensor data was silently present but invisible. Verifying that `TOWED_ARRAY` contacts actually loaded meant opening raw JSON.

Now, expanding a sensor-bearing track reveals two group rows: `Positions (3)` and `Sensors (2)`. Expanding `Sensors` shows each named sensor with its contact count as sublabel. Expanding a sensor shows individual contact rows with zero-padded bearings (`045°`, `225° / 045°` for ambiguous readings) and formatted timestamps. The thing you imported is now visible in the place analysts look first.

## How It Works

The core change is a four-case dispatcher in `flattenFeatures.ts` keyed on `(hasSensors, segmentCount)`:

- **Case A** — simple track, no sensors: unchanged, positions as direct children
- **Case B** — compound track, no sensors: adds `Track Segments (N)` wrapper
- **Case C** — simple track with sensors: `Positions (N)` + `Sensors (N)` groups
- **Case D** — compound track with sensors: both groups, independent expansion

Three new `DisplayItem` types — `group`, `sensor`, `contact` — extend the existing path scheme rather than replacing it. Sensor selection paths (`${trackId}/sensors/${sensorName}/contacts/${index}`) are prefix-compatible with the existing `hasChildSelected` matching, so downstream consumers get propagated selection state for free. Zero new runtime dependencies. No schema changes.

The `formatBearing` helper and FR-018 zero-padding apply consistently to both sensor contacts and position course values — `045°` throughout rather than `45°` in one place and `045°` in another.

## By the Numbers

| | |
|---|---|
| Tests passing | 1150 |
| New sensor-specific tests | 27 |
| Tests failed | 0 |
| 10,000-contact expand | <200ms |

All 74 pre-existing test files pass unchanged. Case A has a byte-for-byte regression guard that accepts only the deliberate course zero-padding change.

## What's Next

Sensor contacts are now visible in the panel tree. Making them visible on the map is #118 — the next item in Epic E07 — which will use the same path-scheme IDs to highlight selected contacts as overlaid symbols on the chart.

→ [Spec and contracts](https://github.com/debrief/debrief-future/tree/179-sensor-aware-layers-rendering/specs/179-sensor-aware-layers-rendering)
