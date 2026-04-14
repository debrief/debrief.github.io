---
layout: future-post
title: "Shipped: Array offset calculations for towed-array sensors"
date: 2026-04-14
track: [credibility]
author: Ian
reading_time: 3
tags: [tracer-bullet, sensor-data, python, typescript, testing, e07]
excerpt: "Bearing lines from towed-array sensors now originate at the array's real geographic position, with three calculation modes and cross-language parity."
---

## What We Built

A towed sonar array sits hundreds of metres behind the vessel that tows it. Until now, bearing lines from those sensors originated at the host vessel's position -- close enough for a glance, but wrong by whatever the offset happens to be. When a vessel turns, the error grows: the array trails around the corner and the bearing fan pivots with it, not with the ship.

We shipped `computeArrayCentre` -- a single calculation that places each bearing line at the array's actual geographic position. It supports three modes, selected per sensor:

- **PLAIN** backtracks along the vessel's course at the contact time by the offset distance.
- **WORM** walks backwards along the vessel's actual track geometry, segment by segment, so the origin follows the path the array physically took.
- **MEASURED** interpolates from instrumented position data when the sensor reports its own location, falling back to PLAIN if no measurement covers the contact's timestamp.

Zero-offset sensors return the vessel position unchanged. Unknown or missing modes fail safe the same way.

## How It Works

The algorithm lives in two places and behaves identically:

- TypeScript: `shared/components/src/MapView/array-offset.ts`
- Python: `services/calc/debrief_calc/tools/sensor/array_offset.py`

Both use a single Earth radius (6 371 000 m), the same spherical haversine formula, and linear interpolation between bracketing timestamps. A shared JSON fixture (`shared/schemas/src/fixtures/valid/track-feature-array-offset-01.json`) drives the test suites on both sides -- same inputs, same expected outputs, full IEEE-754 precision.

The TypeScript integration point is `prepareSensorContacts` in `sensor-utils.ts`. `<SensorBearingLayer>` now gets corrected origins automatically whenever a sensor defines both `offset` and `array_centre_mode`; no changes were needed to the rendering code itself.

## PLAIN vs WORM Through a Turn

The difference between the two calculated modes only matters once the vessel manoeuvres. The diagram below shows a right-angle turn with a 2 km sensor offset:

![Diagram comparing PLAIN and WORM array centre positions after a 90-degree vessel turn, with PLAIN placing the origin 2km directly west of the vessel and WORM tracing back along the actual track path to a point south of the turn](/assets/images/future-debrief/shipped-array-offset-calculations/worm-through-turn.svg)

PLAIN anchors the bearing fan 2 km west of where the vessel currently is. WORM walks 1.43 km back along the east-west leg and another 0.57 km down the southbound leg, anchoring the fan where the array physically was at the contact time. For contacts collected before the turn had settled, WORM's origin is the right one.

## By the Numbers

| | |
|---|---|
| New tests | 87 |
| TypeScript unit (vitest) | 39 |
| Python unit (pytest) | 32 |
| Cross-language parity | 8 |
| Integration scenarios | 5 |
| Tests failing | 0 |
| Golden fixture delta (TS vs Python) | 0.000000 m |
| 1000-contact WORM recompute (TypeScript) | 83 ms |
| 1000-contact WORM recompute (Python) | 208 ms |

Both languages sit comfortably inside the 1-second budget for 1000 contacts (SC-004), leaving headroom for larger datasets. A performance test in the TypeScript suite fails CI if that budget is ever breached.

No schema changes. No new runtime dependencies. No modifications to the rendering pipeline -- the origin correction slots in upstream of it.

## What's Next

With array centres now placed correctly, the next item (#120) uses these origins as the foundation for time-based bearing-line animations: as the playback cursor moves, the array walks along the track and the fan follows it.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/119-array-offset-calc/spec.md)
→ [View the evidence](https://github.com/debrief/debrief-future/tree/main/specs/119-array-offset-calc/evidence)
