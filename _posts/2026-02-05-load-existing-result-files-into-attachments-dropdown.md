---
layout: future-post
title: Building Load Existing Result Files into Attachments Dropdown
date: '2026-02-05'
author: Ian
track: momentum
tags:
- attachments
- result-persistence
- stac-integration
excerpt: Result files now persist across sessions by reading them from STAC item assets.
reading_time: 3
---
## What We're Building

When an analyst runs a range-bearing calculation or other analysis tool in VS Code, the results get saved to the plot's STAC item — in the assets folder alongside the plot data. But right now, those results only appear in the Attachments dropdown while the session is active. Close the file and reopen it, and they disappear.

This feature reconnects that gap. When a plot loads, we'll scan its STAC item for existing result files and automatically populate the Attachments dropdown. The analyst sees all their previous calculations without re-running anything.

It's a small change with real impact: results stop being ephemeral, and analysis sessions become truly persistent.

## How It Fits

We already have the pieces in place. When a plot opens, we fetch its STAC item — the canonical record of everything associated with that plot. Those result files are already stored there, labeled with metadata roles. The Attachments component can already render them. We're filling in the middle step: extraction.

The work connects three parts of the system:
- **stacService** — knows how to read STAC items and their assets
- **activityPanelView** — handles plot data flow to the UI
- **Attachments component** — already renders files correctly

No UI changes. No new patterns. Just scanning what's already there and feeding it upstream.

## Key Decisions

**Identification by STAC roles first.** When tools save results, they tag them with `roles: ["result"]` in the asset metadata. We'll use that as the primary signal. Clean. Explicit. Schema-backed.

**Filename pattern fallback.** For results that don't have metadata (perhaps from earlier versions or external tools), we'll look for file extensions like `.geojson`, `.csv`, `.json` in the assets. Belt and suspenders.

**Load on plot activation.** The results arrive as part of the plot data packet sent to the activity panel, same timing as everything else. No separate scan. No race conditions.

**Keep the interface consistent.** Results use the same `AssociatedFile` interface as session-created results. One code path. Same rendering logic.

One of the persistent frustrations with the old interface was that analysis results would vanish when you closed a plot. You'd run a calculation, examine the output, close the plot to work on something else, then reopen it later only to find all those results gone. The work was still sitting in the STAC catalog, but disconnected from the UI.

We've now fixed that by teaching the system to read result files from STAC item assets when a plot opens. Any results saved to a plot's STAC item come back automatically in the attachments dropdown, exactly where you left them.

The implementation sits entirely in stacService—seven new methods that extract, identify, and deduplicate result files:

- `parseViewerType()` extracts the viewer type from multi-suffix filenames (`file.2d.json` becomes viewerType: '2d')
- `parseFileFormat()` gets the actual file format from the extension
- `assetToAssociatedFile()` transforms STAC assets into AssociatedFile objects the UI understands
- `isResultAsset()` identifies which assets are results using `roles: ["result"]` as the primary signal, with fallbacks to `debrief:toolId` property or filename patterns for edge cases
- `getResultFilesFromItem()` extracts all results from a single STAC item
- `loadResultFiles()` loads the item and extracts results in one call
- `setResultFiles()` on activityPanelView handles integration with the UI

We wired this into `openPlot.ts` so results load automatically whenever you open a plot.

One complication: when you reload a plot, you might have both persisted results (from the STAC catalog) and runtime results (from tools you ran during this session). Deduplication logic prevents duplicates when merging them.

## Lessons Learned

STAC asset metadata turned out to be more reliable than we expected. The `roles` field was explicitly designed for this kind of classification—marking assets as `["result"]` gives a canonical signal that doesn't require guessing. For edge cases (manually-placed files, legacy formats predating this convention), fallback patterns using `debrief:toolId` and filename conventions catch them cleanly without false positives.

The multi-suffix naming convention for viewer types (`file.2d.json`) felt fragile in theory. In practice it works well because the filename already contains necessary context, and parsing it keeps STAC metadata lean. It's a pattern we can extend as new viewer types come online.

Twenty-four unit tests cover the full extraction pipeline—valid results, missing metadata, malformed filenames, edge cases in deduplication. They gave us confidence that the fallback logic handles messy cases without surprising behavior downstream.

## What's Next

This unblocks result archival. Once we wire up the UI for exporting or deleting results, everything downstream becomes straightforward. We're also thinking through presentation logic—which results should load by default when reopening a plot, how to filter by tool or configuration, what happens when results come from different plot states.

→ [See the spec](https://github.com/debrief/debrief-future/blob/main/specs/051-load-result-attachments/spec.md)
→ [View the implementation](https://github.com/debrief/debrief/pull/051)
