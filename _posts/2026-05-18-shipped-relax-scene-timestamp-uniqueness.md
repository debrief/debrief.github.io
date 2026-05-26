---
layout: future-post
title: "Shipped: Relax scene timestamp uniqueness"
date: 2026-05-18
track: [credibility]
author: Ian
reading_time: 4
tags: [storyboard, schemas, linkml, vscode-extension, constitution]
excerpt: Storyboards now accept several scenes at the same instant, ordered by capture sequence — analysts no longer have to nudge the clock to capture multi-viewport moments.
---

## What We Built

A storyboard wants to tell a story, and stories often hover on a single instant. An analyst framing the moment of intercept wants a wide context shot, a zoom on the contact, and a zoom on ownship — three scenes at the same timestamp. Until this change, the Storyboard refused the second and third captures as "duplicate timestamp". Analysts worked around it by nudging the clock forward a second per scene, which is dishonest to the underlying analysis: those viewports really did belong to the same moment.

| Before | After |
|---|---|
| Capture scene at `10:30:00Z` — accepted | Capture scene at `10:30:00Z` — accepted |
| Capture second scene at `10:30:00Z` — rejected, "duplicate timestamp" | Capture second scene at `10:30:00Z` — accepted, appended to the tied group |
| Multi-viewport snapshots forced to fake the clock by a second | Multi-viewport snapshots share one honest timestamp |
| Tied scenes impossible | Tied scenes ordered by capture sequence, reorderable within the group |

![Three tied-timestamp scenes in the Storyboard panel, captured at the same instant with different viewports](/assets/images/future-debrief/shipped-relax-scene-timestamp-uniqueness/tied-timestamps.png)
*Three scenes captured at the same `timestamp` but at different map viewports. The panel lists them in capture order; the new `creation_order` secondary sort does the work the old uniqueness constraint used to do.*

## How It Fits

The change lives in the schema layer of the Storyboarding feature line. `SceneProperties` in `storyboard.yaml` gains a `creation_order` integer slot, regenerated Pydantic and TypeScript types flow outward through `@debrief/schemas`, and the structural consumer is `shared/components/src/storyboard/`. Two existing inline sort sites in the VS Code extension's panel view and playback engine fold onto a single canonical `listScenesOrdered()` helper, which now sorts by `(timestamp, creation_order)`. No service changes, no new runtime dependencies, persistence path unchanged.

## Key Decisions

- **An explicit `creation_order` field, not insertion order.** Insertion order is fragile across JSON round-trips and merges. An integer per scene, scoped per-Storyboard, gives a stable secondary sort that survives serialisation and any future reordering UI.
- **One sort site, not three.** Pre-change, `listScenesOrdered()` had two inline copies in the VS Code extension. Folding them onto the canonical helper is the structural cleanup that comes for free with the behavioural change — and pays back the next time the ordering rule evolves.
- **No backward-compatibility shim for legacy plots.** A pre-#259 Storyboard has scenes without `creation_order`. Rather than infer values at load time, the loader rejects such plots with a named `UnsupportedSchemaVersionError` and bumps `schema_version` from 1 to 2. Article XIV (pre-release freedom) authorises the hard break: no shipped user data exists, and silent inference would mask cases where two analysts disagree about what the right order was. An honest error beats a quiet guess.

![UnsupportedSchemaVersionError banner blocking a pre-#259 plot from loading](/assets/images/future-debrief/shipped-relax-scene-timestamp-uniqueness/missing-creation-order-error.png)
*Pre-#259 plots fail loud rather than getting coerced into a guessed order.*

- **Replace one error with several more specific ones.** Five `DuplicateTimestampError` throw-sites came out of the CRUD layer. `DuplicateCreationOrderError` covers the genuine integrity violation — two scenes claiming the same slot within a tied group — and `CreationOrderOutOfRangeError` covers reorder attempts outside the group. The error surface gets narrower and more truthful, not broader.
- **Ship the CRUD, defer the gesture.** `reorderSceneInTiedGroup()` is wired and tested; the drag-handle or keyboard affordance to invoke it from the panel is a separate feature. Splitting this way keeps the schema change reviewable on its own.

## The Aggressive-Deletion Tax

The original plan claimed deleting `DuplicateTimestampError` would only ripple inside `shared/components/src/storyboard/`. In practice three consumer flows — the VS Code capture command, the VS Code edit-suite (duplicate + copy-to-other), and the web-shell capture command — had built entire Replace/Offset/Cancel banner machinery around catching that one error. Removing the constraint at the data layer made roughly 250 lines of UI orchestration unreachable. We took the aggressive-deletion path rather than leave dead code on a code-search.

## What's Next

- **The reorder gesture.** `reorderSceneInTiedGroup()` is in but has no UI affordance yet. A drag-handle on the scene row plus a keyboard alternative (Alt+↑ / Alt+↓ within a tied group) is the natural follow-up.
- **A visual cue for tied groups.** Three scenes at `10:30:00Z` render with three identical DTG labels (`301030Z MAY 26`). Users can disambiguate via the title edit field, but a light hint ("…+2") on the timeline strip would make the tied state legible at a glance.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/259-relax-scene-time/spec.md)
→ [View the evidence](https://github.com/debrief/debrief-future/tree/main/specs/259-relax-scene-time/evidence)
