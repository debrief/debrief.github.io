---
layout: future-post
title: "Shipped: Vessel Taxonomy and Hierarchical Filtering"
date: 2026-03-07
track: [credibility]
author: Ian
reading_time: 4
tags: [tracer-bullet, discovery-ui, filtering, vessel-taxonomy]
excerpt: "Vessel class filter now has readable labels, in-menu search, live match counts, and zero new dependencies"
---


## What We Built

The vessel class filter from #127 worked, but it made you think in paths. Select "Type 23 Frigate" and the lozenge showed `surface/warship/frigate/type23`. Want a specific ship class? Navigate four levels of menus. Want to know if there are any destroyers in the filtered set before selecting it? Hope for the best.

Three changes fix this.

**Human-readable labels.** A `buildTaxonomyLabelMap()` function pre-computes a `Map<string, string>` from the taxonomy JSON -- full path keys to display labels. The Lozenge component does an O(1) lookup. "Type 23 Frigate" instead of `surface/warship/frigate/type23`. Unknown paths fall back to the raw value, so nothing breaks if an exercise references a vessel type not in the current taxonomy. Re-open the dropdown and your previous selection is marked with a check.

**Type-ahead search.** A `SearchableCascadingMenu` wraps the existing `CascadingMenu` with a search input at the top. Type "ast" and the tree collapses to show Astute-class SSN with its ancestor chain (Subsurface > Nuclear > SSN > Astute). The recursive filter function (`filterCascadingItems`) is a pure function -- easy to test, no mutation. It preserves ancestor chains so you always see where a match sits in the hierarchy. `String.includes()` for matching, not regex, because an analyst typing "type 45" should not need to worry about special characters.

**Per-node match counts.** A `useTaxonomyMatchCounts` hook computes how many exercises match each subtree using the existing `buildDescendantMap()` from the filter engine. Counts appear as badge strings on each menu item. "Warship (26)" means twenty-six exercises involve some warship type. "SSBN (0)" is dimmed and not selectable -- no dead-end filter selections. The counts reflect the currently filtered data set, not the full catalogue. Add a nationality filter first, and the vessel counts update to show only what matches within that subset.

## How It Fits

This closes the loop on vessel class filtering in Epic E08. Feature #125 defined the vessel taxonomy JSON. Feature #127 built the filter bar, CascadingMenu, and the adapter that wires taxonomy nodes to menu items. This feature made all of that usable.

The `CascadingMenuItem` interface gained an additive `badge` prop for count strings, plus `beforeItems` and `afterItems` slots that `SearchableCascadingMenu` uses to inject the search input. No breaking changes to the base component -- everything is opt-in.

Full-path keys in the label map handle an ambiguity we discovered during implementation: "tanker" appears under both `auxiliary` and `merchant` in the taxonomy. Node IDs alone are not unique. Using the full slash-separated path (`auxiliary/tanker` vs `merchant/tanker`) as map keys resolved this cleanly.

## By the Numbers

| | |
|---|---|
| New tests | 72 |
| Tests passing | 944 |
| Tests failed | 0 |
| New source files | 3 |
| Modified files | 10+ |
| New dependencies | 0 |

## Decisions That Stuck

The planning post proposed six decisions. All survived.

**Wrapper, not modification.** `SearchableCascadingMenu` wraps `CascadingMenu` rather than adding search state to the base component. The base already manages highlight tracking, hover timeouts, keyboard navigation, and submenu positioning. Search is a separate concern. The wrapper renders the search input via the new `beforeItems` slot and passes filtered items down. The base component does not know search exists.

**Separate `useTaxonomyMatchCounts` hook.** Counts are fundamentally different from the `useDistinctValues` hook that populates flat dropdowns. Counts are hierarchical, need the descendant map, and return `Map<string, number>` rather than `string[]`. Keeping them apart avoided complicating either hook.

**Counts from the filtered set.** This was flagged as a "1A decision" in the research doc -- the option that makes counts most useful for iterative filtering. If you have already filtered by nationality, the vessel counts should tell you what is available within that subset, not across all exercises.

**`buildTaxonomyLabelMap()` merged into taxonomy.ts.** The planning post considered a separate file, but the function needs the same `VesselTaxonomyNode` type and traversal logic already in `taxonomy.ts`. Keeping it there avoids a circular import and follows DRY.

## What Surprised Us

The ambiguous node ID problem was not in the spec. The taxonomy has "tanker" under both auxiliary vessels and merchant vessels. When we first built the label map keyed by node ID, both tanker nodes mapped to the same key. Full-path keys were the fix, but it rippled through the adapter -- `taxonomyToCascadingItems` now generates full-path item IDs, and the count computation uses full paths too. The change was not large, but catching it required a test that loaded the complete taxonomy rather than a simplified subset.

Branch node selection interacts with counts in a way that took a moment to get right. Selecting "Warship" means matching all exercises with *any* warship descendant. The count for the Warship node is the number of distinct exercises, not the sum of child counts -- an exercise with both a Type 23 and a Type 45 counts once, not twice. Seven tests on `useTaxonomyMatchCounts` verify this distinction.

The DragOverlay label resolution was a late addition. When you drag a vessel class lozenge between containers, the overlay needs to show "Type 23 Frigate" too, not the raw path. The label map had to be threaded through to the `OrContainer` and then to child `Lozenge` components. Three tests were added to verify this forwarding.

## What's Next

The taxonomy is currently bundled as a static JSON file. Feature #128 (saved filter configurations) will persist CQL2 expressions including vessel class selections. The label map will also be useful when we build the exercise detail view -- anywhere a vessel class path appears, analysts should see a readable name.

> [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/133-vessel-taxonomy)
