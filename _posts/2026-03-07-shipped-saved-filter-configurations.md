---
layout: future-post
title: "Shipped: Saved Filter Configurations"
date: 2026-03-07
track: [credibility]
author: Ian
reading_time: 3
tags: [tracer-bullet, stac-browser, e08]
excerpt: "Analysts can now save, restore, and delete named filter configurations in the STAC Browser filter bar — filter sets persist across sessions."
---


## What Shipped

Saved filter configurations are live. Analysts can save the current filter bar state as a named configuration, restore it later from the Historic Filters dropdown, and delete entries they no longer need. Everything persists across sessions.

Two new controls appear in the filter bar when a storage backend is provided:

- **Save** button — opens a name prompt popover. Leave it blank to auto-generate a descriptive name from the active filters.
- **Historic Filters** dropdown — lists saved configurations newest-first. Click to restore, use the delete button to remove.

## What We Built

The implementation adds four new modules to the shared component library, all within the existing `FilterBar/` directory:

- **`useSavedFilters` hook** — manages the CRUD lifecycle: save, load, delete, overwrite, and duplicate name detection. Enforces a 100-configuration maximum per workspace.
- **`savedFiltersStorage`** — platform-agnostic storage interface with two implementations: `InMemoryStorage` (Storybook/tests) and `LocalStorageSavedFilters` (web-shell). VS Code extensions implement the same interface using `workspaceState`.
- **`SaveFilterButton`** — save button with inline name prompt popover, overwrite confirmation for duplicates, and keyboard support (Enter to save, Escape to cancel).
- **`HistoricFiltersDropdown`** — dropdown listing saved configurations with restore and delete controls. Shows "No saved filters" when empty.

The existing FilterBar component gains an optional `savedFiltersStorage` prop. When provided, the save and historic filters controls appear. When omitted, the filter bar works exactly as before — zero breaking changes.

## Testing

120 unit tests pass across 11 test files. New test coverage includes:

- 16 tests for the `useSavedFilters` hook (CRUD, max capacity, persistence, name generation)
- 10 tests for SaveFilterButton (open/close, name entry, overwrite flow, keyboard shortcuts)
- 12 tests for HistoricFiltersDropdown (display, restore, delete, re-render after deletion)
- 9 tests for storage implementations (round-trip, corruption handling, OR container preservation)

Playwright E2E tests are ready for all three theme variants (light, dark, VS Code) with save/restore/delete interaction coverage.

## Key Design Decisions

- **FilterBarState is authoritative.** We store both FilterBarState and CQL2 JSON, but restoration uses FilterBarState for exact lozenge reconstruction. CQL2 JSON is stored for future portability.
- **Platform abstraction via interface.** The `SavedFiltersStorage` interface makes the components environment-agnostic. Swap the implementation, not the components.
- **SET_STATE action for restoration.** We added a `SET_STATE` action to the FilterBar reducer, enabling atomic replacement of the entire filter state in one dispatch — cleaner and more reliable than remove-then-add.

## What's Next

This completes the core STAC Browser Discovery UI (E08). With filtering (#126), the filter bar (#127), and now saved filters (#128), analysts have a complete workflow for building, refining, and reusing filter combinations against exercise catalogs.
