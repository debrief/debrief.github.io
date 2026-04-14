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

## The Three Modes Side by Side

The screenshot below renders the same vessel track and the same four sensor contacts three times -- once per mode -- in the Debrief UI:

![Debrief UI showing three side-by-side map panels of the same vessel track with PLAIN, WORM and MEASURED array-centre modes: PLAIN shows bearing cuts fanning from the current heading, WORM shows bearings originating along the pre-turn leg of the track, MEASURED shows bearings anchored at the instrumented sensor positions](/assets/images/future-debrief/shipped-array-offset-calculations/array-offset-comparison-default.png)

Same inputs, three different answers. In PLAIN the bearing fan pivots with the vessel's current heading. In WORM it stays wrapped around the path the array physically took through the turn. In MEASURED it anchors to the sensor's instrumented location, with only one contact shown here because the measured-position window doesn't cover the others.

## The WORM Close-Up

Zooming into WORM makes the key behaviour easier to see:

![Close-up map of the WORM mode showing bearing lines for contacts C1 through C4 originating at different points along the vessel's recorded track: earlier contacts C1 and C2 originate from the southern pre-turn leg of the track, while later contacts C3 and C4 originate from the eastern post-turn leg](/assets/images/future-debrief/shipped-array-offset-calculations/array-offset-worm.png)

Contacts C1 and C2 were collected while the vessel was still on the southbound leg. Their bearing cuts originate there, on the pre-turn part of the track -- which is where the array actually was at that moment. C3 and C4 come later, once the vessel has turned east, so their origins have walked around the corner too. PLAIN can't do this: its origins always backtrack from the vessel's *current* heading, which is only correct between manoeuvres.

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
