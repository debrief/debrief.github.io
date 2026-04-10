---
layout: future-post
title: "Shipped: Load REP Files into New Plot"
date: 2026-01-30
track: [credibility]
author: Ian
reading_time: 3
tags: [tracer-bullet, rep-import, stac-plot]
excerpt: "Users can now create new plots directly from REP files with a single right-click action."
---


## What We Built

One of the most common workflows in Debrief is loading tactical data. Feature 043 extends that workflow with a new capability: users can now create a new STAC plot directly from REP files without leaving the file browser.

Right-click on a `.rep` file (or multiple files), select "Add to new plot in [store-name]", enter a plot name, and Debrief handles the rest: parsing the files, extracting temporal and spatial metadata, creating a new STAC item, and populating it with the exercise data. All in one action.

The implementation supports single or multiple REP files, validates all of them before committing anything to disk (fail-fast parsing), preserves the original files as STAC assets for provenance, and opens the resulting plot in the map panel so you can start analyzing immediately.

## Screenshots

**Right-click context menu** — The new "Add to new plot in [Store Name]" option appears alongside existing load commands.

**Plot name input dialog** — Users enter a name for the new plot. This becomes both the STAC item's display title and part of its unique identifier.

**Map panel with loaded plot** — The newly created plot opens automatically with exercise data visualized, contact tracks visible, and ready for analysis.

## Implementation Details

Two files modified, about 300 lines of new code:

- **importRep.ts** — Extended the "Load into Debrief..." command handler to present new picker options and manage the "add to new plot" flow
- **stacService.ts** — Added createItem() method to atomically create a new STAC plot from parsed exercise data

The implementation leverages a key decision from earlier specs: fail-fast parsing. Instead of streaming data or handling partial successes, we parse all files completely before creating anything on disk. If any file fails to parse, nothing is committed. The only cleanup needed on error is folder deletion.

A nice validation of the service layer design: the existing addFeatures() and addAsset() methods worked without modification. They just absorbed the new data flow.

## Lessons Learned

Fail-fast validation is simpler than streaming validation. By parsing all files upfront, we avoid the complexity of partial state and make atomicity trivial — either all files succeeded or nothing hit disk.

The existing STAC service methods proved flexible enough for this workflow without refactoring. This suggests the abstraction is holding up well as we add new ways to create plots.

Tests expanded from 64 to 70 (6 new), all passing. One test caught an edge case we'd initially missed: what happens when parsing succeeds but STAC item creation fails? Adding that test forced us to improve error messages, which made the product better.

## What's Next

Drag-and-drop file loading is next on the roadmap — users will be able to drag a `.rep` file onto the editor to create a new plot. Same underlying implementation, different interaction model.

After that, we're moving to other backlog items. The tracer bullet continues to validate the core architecture.

→ [See the code](https://github.com/debrief/debrief-future/pull/043)
→ [Read the specification](https://github.com/debrief/debrief-future/blob/main/.specify/043-load-rep-new-plot/spec.md)
