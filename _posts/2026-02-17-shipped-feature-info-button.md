---
layout: future-post
title: "Shipped: Feature Info Button"
date: 2026-02-17
track: [credibility]
author: Ian
reading_time: 3
tags: [tracer-bullet, layers-panel, testing, playwright]
excerpt: "Every feature row now has an info button that shows geometry type and coordinates in a dialog"
---


## What We Built

Every feature row in the Layers panel now has an info button. Click it, and a dialog opens showing the feature's geometry type and its coordinates. Point features show a single lat/lon pair. LineStrings show an ordered list of positions. MultiPolygons show their constituent polygons with vertex counts.

The dialog exists to solve a testing problem. When Playwright tests need to verify that a drag operation moved a track, or that a calculation produced new geometry, they currently have no good way to inspect coordinate values. The map canvas is opaque -- you can screenshot it, but you can't assert that position 3 moved from 50.2N to 50.4N. Now tests can open the info dialog and read the coordinates directly from the DOM.

Child rows work too. Expand a track in the Layers panel, and each position row has its own info button showing that specific point's coordinates. Expand a MultiPolygon, and each polygon child shows its ring vertices.

The button follows the same hover-visibility pattern as the format button shipped last week. Hover over a feature row and the info icon appears. Click it, and the dialog opens with `role="dialog"` and `data-testid` attributes for both accessibility and automation.

## Screenshots

_Screenshots to be added: info button on hover, geometry dialog for a Point feature, geometry dialog for a LineString showing position list, dialog for a MultiPolygon child._

## Lessons Learned

**Cloning an existing pattern pays off fast.** The format button already solved hover visibility, nullable parent state for "which popup is open", and viewport collision detection for fixed-position popups. Reusing that pattern kept the info button to roughly 200 lines of new code. The mutual exclusion logic -- only one popup open at a time -- came almost free because the format button had already established the state shape.

**`data-testid` and ARIA roles serve different audiences with zero conflict.** `role="dialog"` gives screen readers semantic context. `data-testid="geometry-dialog"` gives Playwright a stable selector that won't break when we restyle the component. We added both from the start rather than retrofitting accessibility later.

**Fixed-position popups in virtualised lists are consistently tricky.** The Layers panel virtualises its rows for performance, which means the info dialog can't be positioned relative to its parent row -- the row might scroll out of the virtual window. The same `position: fixed` plus viewport collision pattern from CascadingMenu handles this, but it's the kind of thing you forget about until the dialog appears 400 pixels from where you expected.

## What's Next

With geometry data now readable outside the map canvas, Playwright tests can verify operations that change coordinates. Drag a track segment, open the info dialog, assert the new position values. Run a bearing calculation, check the result geometry. Undo the operation, confirm the coordinates reverted.

This unblocks a category of end-to-end tests that were previously impractical without image comparison.

→ [View the spec](https://github.com/debrief/debrief-future/blob/main/specs/098-feature-info-button/spec.md)
