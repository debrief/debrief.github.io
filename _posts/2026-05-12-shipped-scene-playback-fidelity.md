---
layout: future-post
title: "Shipped: Storyboard scene playback fidelity"
date: 2026-05-12
track: [credibility]
author: Ian
reading_time: 5
tags: [storyboard, schemas, vscode-extension, leaflet, constitution]
excerpt: Four storyboard playback gaps closed together — display-mode capture, real viewport rectangles, active-scene halo, and Storyboard-grouped scenes.
---

## What We Built

A storyboard is only as good as the moments it captures. If an analyst frames a wide view of three vessels converging and then a tight close-up on the interception, the rectangles on the map should *look* like that — wide, then tight — and clicking each one should put the audience back exactly where the author left them, including whether they were watching full tracks or just trailing wakes. Four small gaps surfaced during field testing of PR #606 broke that promise in different ways, and this change closes all four together.

| Before | After |
|---|---|
| Every scene rectangle was the same ~100m square at the scene's centre, regardless of how the author had framed the view | Each rectangle traces the actual viewport bounds at capture time — wide context shots look wide, tight close-ups look tight |
| Clicking a scene captured in Trail mode silently played it back in Full mode | The display mode is captured with the viewport and restored on playback, so Trail-mode scenes stay in Trail |
| The currently-playing scene's rectangle was indistinguishable from the others on a busy map | The active scene picks up the same drop-shadow + pulse halo that selected tracks already use |
| Scenes rendered as peer leaves in the feature list, scattered between tracks and other features | Each Storyboard folds its child Scenes under a single collapsible parent row, mirroring how Tracks group their Positions |

![Storyboard panel with cv-1 selected and a glowing scene rectangle on the map; an outer, unselected rectangle has no halo](/assets/images/future-debrief/shipped-scene-playback-fidelity/scene-rect-halo-dark.png)
*The currently-playing scene's rectangle picks up the same drop-shadow halo that selected tracks already use. The non-current rectangle (outer) has no glow.*

Concretely: scenes now carry a `display_mode` (Full or Trail) and restore it on playback alongside the viewport; rectangles are computed from the real Leaflet bounds at capture time instead of a placeholder square; the active scene gets the canonical track-selection halo; and the feature list groups each storyboard's scenes under a collapsible parent row instead of mixing them in with tracks.

![FeatureList collapsed — Engagement Brief storyboard row with a (5) scene-count badge sitting alongside HMS Victory and USS Constitution tracks](/assets/images/future-debrief/shipped-scene-playback-fidelity/featurelist-grouping-light.png)
*The new Storyboard row in `FeatureList` — one collapsible parent with a `(5)` scene-count badge, sitting alongside tracks instead of cluttered between them.*

![FeatureList expanded — Engagement Brief row reveals Scene 1 through Scene 5; an Empty Storyboard row below shows (0) and a disabled chevron](/assets/images/future-debrief/shipped-scene-playback-fidelity/featurelist-grouping-expanded-light.png)
*Expanded, the parent reveals its five scene children indented one level. An empty storyboard (bottom) still renders with `(0)` and a disabled chevron — FR-013 — so authors never lose track of a storyboard whose contents they're about to capture.*

## How It Fits

This is a fast follow-up to PR #606 — which introduced scene-click navigation under the E13 storyboarding epic — tidying the seams that field use exposed. The schema edit lands in `storyboard.yaml` and regenerates Pydantic and TypeScript through the usual LinkML pipeline; the rendering and grouping changes ride on existing surfaces (`SceneRectangleLayer`, `FeatureList/flattenFeatures.ts`) rather than introducing new ones. Nothing here is architecturally new — it's the storyboarding feature growing into the conventions the rest of the map and feature list already follow.

## Key Decisions

- **Reference the existing `DisplayModeEnum`, don't duplicate it.** The new `display_mode` slot on `Scene` points at the enum already defined in `session-state.yaml`. Article II.1 of the constitution is explicit about single source of truth for schemas, and a parallel enum would have drifted within a release.
- **Reuse the track-selection halo, don't invent a new "active scene" treatment.** The BACKLOG entry originally suggested a `var(--vscode-focusBorder)` style, but the existing `debrief-map-feature--selected` CSS — drop-shadow plus pulse — is already the project's vocabulary for "this is the one you're looking at". Borrowing it makes scenes feel like first-class map features instead of a bolted-on overlay.
- **Use Leaflet's own `getBounds()` + `containerPointToLatLng()` for the viewport polygon.** The alternative was hand-rolled `L.CRS.EPSG3857.latLngToPoint` math. Same result, much less code to review, and Leaflet already handles the edge cases (wrapped longitudes, non-standard CRS) we'd otherwise have to rediscover.
- **Tolerate legacy scenes; don't migrate them.** `display_mode` is `required: false` in the schema, so scenes captured before this change still parse. On read, the time controller is left untouched when `display_mode` is absent, and the placeholder polygon is recomputed at render time. No batch migration script — Article III.2 source-preservation means we fix things opportunistically rather than rewriting on-disk catalogues.
- **Ship all four gaps together.** They look like four independent fixes but they aren't: display-mode capture is the precondition for the rectangle and halo work to render the author's intent; the active-scene halo is the same selection treatment the grouped rows need to surface; and all four touch the same `SceneRectangleLayer` and feature-list data flow. Splitting them would have meant landing a partially-fixed playback experience and revisiting the same files twice more.
- **Group scenes in `FeatureList`, not the "Layers panel".** The BACKLOG entry called the affected component the Layers panel, but the actual surface is `FeatureList` — and its existing parent/child machinery (already proven for `Track → Position`) was the obvious place to land STORYBOARD → STORYBOARD_SCENE rows.

## Provenance, Not Heuristics

The polygon-fidelity gap had a tempting shortcut: detect the ~100m placeholder by its bounding-box width and recompute on the fly. The first round of planning headed that way. The review caught it: a real survey-scale capture (a single buoy from a few hundred metres up) would be misclassified by exactly the same heuristic. The fix added an explicit `_polygon_source` provenance slot to `SceneProperties` — values `bounds`, `placeholder`, or `manual` — that the renderer consults at draw time. A fresh capture writes `bounds`; absent or anything-else triggers a render-time recompute from `(viewport, map.getSize())` using `containerPointToLatLng`. The on-disk geometry is never rewritten; only what's drawn this frame changes. Article III.2 source preservation is honoured by construction, not by a separate batch job.

The same pattern carries through `crud.ts`. The legacy `viewportToPolygon(viewport)` helper, called from three places — `createScene`, `updateScene`, and `restoreScene` — became `bboxToPolygon(bounds, source)`, with TypeScript strict mode flagging every site that hadn't been updated. The "third caller" the original BACKLOG entry hadn't catalogued (in the restore path used by undo-delete) silently regressing to placeholder polygons on edit would have made this feature half-work and twice-fix.

## By the Numbers

| Metric | Result |
|---|---|
| New + extended tests | 27 (6 schema round-trip, 9 crud, 6 SceneRectangleLayer, 6 flattenFeatures) |
| Pre-existing tests still passing | 2,845 (TS + Python combined) |
| Total tests at HEAD | 2,872 passing, 0 failing |
| LinkML enums added | 1 (`PolygonSourceEnum`) + 1 mirrored (`DisplayModeEnum` from `session-state.yaml`) |
| New `SceneProperties` slots | 2 (`display_mode`, `_polygon_source`) |
| `crud.ts` call sites migrated | 3 (`createScene`, `updateScene`, `restoreScene`) |
| Hosts touched | 2 (VS Code extension, web-shell) |
| New runtime dependencies | 0 |

## Lessons Learned

- **Cross-file LinkML imports vs gen-json-schema.** Pointing `storyboard.yaml` at `session-state.yaml`'s `DisplayModeEnum` looks like the obvious right move — and it is for `gen-pydantic` and `gen-typescript`. But `gen-json-schema` runs over a deliberately reduced subset (`debrief-jsonschema.yaml`) that excludes `session-state.yaml` because of an upstream bug with `Coordinate as multivalued class range`. Importing transitively re-introduced the bug. The pragmatic answer was to mirror the enum's permissible values into `storyboard.yaml` with a comment pointing at the canonical source. Article II.1 holds: the canonical declaration stays in `session-state.yaml`; the mirror is treated as a generator-shim until the upstream bug is fixed.
- **The "third caller" tax.** When a helper's contract changes — `viewportToPolygon(viewport)` → `bboxToPolygon(bounds, source)` — TypeScript strict mode flagged every site that hadn't been updated, including one the original plan hadn't catalogued (in the restore path used by undo-delete). The cheap-to-do change is the helper signature; the actual work is the three call sites that need bounds threaded through. A grep + a deleted legacy signature is the right tool, not an `@deprecated` annotation that lets stale callers ride.
- **Provenance is the legacy-data answer.** Geometric heuristics for "is this a placeholder?" fail on legitimate small captures. An explicit provenance slot survives every future evolution of the schema unchanged; the renderer's decision becomes a one-line lookup instead of a magic threshold.
- **Keep the panel presentational; let the host apply.** Restoring `display_mode` on scene-click could have lived inside `StoryboardPanel` — it has the row click handler. But the panel is a shared component used by both VS Code and the web-shell; teaching it to reach into the session-state Zustand store would have coupled the presentational layer to runtime services. Each host already owns its session-state store; each host wires the same one-liner (`session.setDisplayMode(scene.properties.display_mode)`) at its boundary. Article IV.1 — the panel signals, the host applies.

## What's Next

- The new `_polygon_source` slot opens the door for `'manual'`-source scenes — author-drawn rectangles that don't track a captured viewport. That's the next storyboarding feature on the horizon.
- The orphan-scene `console.warn` (Article I.3, FR-014 edge case) is currently best-effort. A formal recovery flow — "your storyboard reference is broken, here's how to fix it" — is captured in the BACKLOG for the next storyboarding wave.
- Web-shell scene-click playback only restores display mode today; the viewport flyTo wiring on click is still on the to-do list. VS Code has both paths via `storyboardPlayback.executeTransition`. Closing the web-shell symmetry is straightforward once a dedicated playback service lands there.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/258-scene-playback-fidelity/spec.md)
→ [View the evidence](https://github.com/debrief/debrief-future/tree/main/specs/258-scene-playback-fidelity/evidence)
