---
layout: future-post
title: "Shipped: Thumbnail Capture and Gallery Preview"
date: 2026-03-30
track: [credibility]
author: Ian
reading_time: 4
tags: [stac, catalog-browser, thumbnails, discovery]
excerpt: "Save a plot and get a persistent PNG thumbnail; browse your catalog gallery with arrow-key navigation."
---


## What We Built

When you save a plot now, the system captures the current map view as a PNG — basemap tiles, track overlays, labels — and writes two sizes into the STAC item directory: 800x600 for the preview pane and 200x150 for the list. The thumbnails land as standard STAC assets with `"thumbnail"` roles, so they're not a Debrief-specific convention. Any STAC client knows what to do with them.

The catalog browser has a new gallery preview pane. Click a plot in the list and the large thumbnail appears on the right. Press the arrow keys to move through filtered results. Single-click previews; double-click opens. For existing plots created before this feature landed, a Playwright-based backfill script automates the web-shell to open each plot, fit the view to visible features, wait for tiles, and capture.

The list view now shows raster thumbnails inline where they exist. The SVG spatial thumbnails remain as the fallback — they render without any prior save — so the list never goes blank.

## By the Numbers

| | |
|---|---|
| Unit tests passing | 37 |
| Tests failed | 0 |
| Python (pytest) suite | 1,282 passed |
| TypeScript (vitest) suite | 338 passed |
| E2E scenarios written | 5 |
| CI steps green | lint, typecheck, test |

## Technical Notes

Capture uses `modern-screenshot` rather than `leaflet-image`. `leaflet-image` is unmaintained and has known problems with tile layers rendered on canvas. `modern-screenshot` handles the full DOM — including canvases — and gives consistent results across the basemap tile providers we use.

For save-time capture, downscaling happens in the webview using an offscreen canvas: no server round-trip, no dependency. For the backfill script, which runs in Node.js outside the browser context, we use `sharp` for high-quality resizing. Two contexts, two appropriate tools.

The Python side follows the existing `store_artifact()` pattern. The new `store_thumbnail(item_dir, large_bytes, small_bytes)` function writes both files and updates `item.json` with the two asset entries. It's idempotent — re-running overwrites cleanly. The test that confirms this, `test_overwrite_existing_thumbnails`, was the one I was most pleased to see passing: it's easy to accidentally leave a stale reference in the JSON when updating in place.

One deliberate decision: thumbnail assets carry no provenance links. They're display artifacts, not analytical results. Adding `derived_from` links would pollute the provenance graph with noise. The `test_no_derived_from_links` test encodes this as a constraint so it doesn't quietly get added later.

Capture is non-blocking by design. The 5-second timeout means a slow tile load during save doesn't hold up the analyst. If capture fails, the save completes, a warning is logged, and the backfill script can fill the gap later.

## What's Next

The E2E tests are written and running locally but aren't yet wired into CI — that needs a Playwright setup step in the workflow. The backfill script hasn't been exercised against a full production-sized catalog yet; performance at scale is still an open question.

The thumbnail staleness question from the planning post remains open. Right now, saving overwrites. We're watching whether analysts actually notice or care about stale previews before adding any staleness indicator.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/174-thumbnail-capture/spec.md)
→ [Sample item.json with thumbnail assets](https://github.com/debrief/debrief-future/tree/main/specs/174-thumbnail-capture/evidence/sample-item.json)
