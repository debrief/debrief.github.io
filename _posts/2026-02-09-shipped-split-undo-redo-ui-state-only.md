---
layout: future-post
title: "Shipped: Split Undo/Redo — UI State Only"
date: 2026-02-09
track: [credibility]
author: Ian
reading_time: 4
tags: [undo-redo, state-management, prov-logging]
excerpt: "Narrowed undo/redo to UI display state. Data changes now tracked by Log Recording Service instead."
---


## What We Built

Ctrl+Z now does one thing: reverses what you're looking at on screen. It no longer reverses *data* — plot loads, tool runs, file saves all stay.

This sounds simple, but it required disentangling three categories of state that had been lumped together:

1. **Ephemeral** — never tracked anywhere (selection, zoom level, visibility toggles)
2. **Persistent-but-not-undoable** — saved to disk and tracked in the Log, but Ctrl+Z skips them (featureCollectionUri, savePath, metadata)
3. **UI-state** — tracked in undo/redo only (UI-specific fields like current display time, tool panel state)

The StateSnapshot went from 12 fields to 10. We removed `featureCollectionUri` (a data reference that shouldn't bounce around on undo) and `savePath` (metadata that shouldn't reset when you undo a view change). We added an explicit `UNDO_TRACKED_FIELDS` set to gate exactly which fields create history entries.

The practical effect: you load a plot, run a tool, then realize you want to see how the map looked five steps ago. Ctrl+Z gets you there. But the plot data and tool results stay — they're on the Log, not the undo stack. When you redo forward, the plot reappears exactly as it was.

All 313 tests pass (310 existing + 3 new), zero regressions in existing undo behaviour. Four files touched, about 30 lines changed.

## Lessons Learned

The existing `isEphemeralField()` check looked like it should handle this. It didn't — because `featureCollectionUri` is persistent (saved to file) but shouldn't be undo-tracked. We needed an explicit list.

There was also an edge case in the duplicate snapshot suppression logic. When history is empty, we always push the first snapshot regardless of content. This meant the first time `featureCollectionUri` changed, it would still create an entry, even though all subsequent changes were correctly suppressed. Once we added the field to UNDO_TRACKED_FIELDS exclusion, that edge case naturally resolved.

The deeper lesson: state categorization matters. Splitting "persistent from the filesystem" from "tracked in undo" from "ephemeral entirely" forced us to be explicit about what each mechanism does.

## What's Next

This is Phase 3 of the PROV Logging Implementation epic. Phase 1 (#071, Log Recording Service) provides the `markDirty()` callback that replaces field-level dirty tracking for data changes. Phase 2 followed. Now that undo is narrowed to UI state, the next work is finishing integration of the Log throughout the system — so every data mutation gets recorded with provenance, and the undo system stays focused on what it does well: letting you navigate the display.

→ [See the code](https://github.com/debrief/debrief-future/pull/073)
