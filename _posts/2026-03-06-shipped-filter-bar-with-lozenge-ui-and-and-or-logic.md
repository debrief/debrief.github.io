---
layout: future-post
title: "Shipped: Filter Bar with Lozenge UI and AND/OR Logic"
date: 2026-03-06
track: [credibility]
author: Ian
reading_time: 4
tags: [tracer-bullet, discovery-ui, filtering]
excerpt: "Persistent filter bar with pill-shaped lozenges, all 10 SRD filter types, OR groups with drag-to-group, and CQL2 serialisation"
---


## What We Built

The CQL2 filter engine from #126 now has a face. Analysts can compose metadata queries by clicking, typing, and dragging -- adding pill-shaped lozenges to a persistent bar above the results views, watching the exercise list narrow in real time.

Ten filter types, each with a type-appropriate input method. Vessel class gets a hierarchical dropdown (CascadingMenu) that walks the full taxonomy tree -- select "warship" and you get every frigate, destroyer, and carrier beneath it. Tags, nationality, author, track name, and collection get flat dropdowns populated from the data set. Duration gets five fixed buckets. Title and plot contents get free-text search. Every filter type the SRD specifies, all wired up and filtering against the 100-item mock data set from #125.

The more interesting part is how filters compose. Top-level lozenges are AND'd together -- "French nationality" plus "duration under 24 hours" means both must hold. But you can also create OR container groups: drag two vessel class lozenges into an OR group and the results show exercises matching either type. The OR group itself is AND'd with everything else. One level of nesting. CQL2 JSON comes out the other side, ready for #128 (saved filter configurations) to persist.

## How It Works

The component is built around `useFilterBar`, a reducer-based hook that manages the filter bar state -- an ordered list of lozenges and OR containers. Every state change produces a `FilterExpression` (the type from #126), which feeds directly into the CQL2 filter engine. The engine returns filtered items; those flow down to the results views via props.

```tsx
<FilterBar
  items={items}
  taxonomy={taxonomy}
  onFilteredItems={setFilteredItems}
  onExpressionChange={(expr) => console.log('CQL2:', expr)}
/>
```

Four input strategies behind one Lozenge component. The `ValueEditor` checks the filter type and renders the right control -- `CascadingMenu` for vessel class, a flat dropdown for tags/nationality/author, a bucket selector for duration, or a text input for title/plot contents. Click a lozenge body to reopen its editor and change the value. Click the remove button (stopPropagation handled, so it does not trigger edit) to delete it.

Drag-to-group uses `@dnd-kit/core` and `@dnd-kit/sortable`. An OR container is both a droppable target and a sortable container for its children. Moving a lozenge from the top level into an OR group -- or back out again -- is a state transition in the reducer, not a DOM operation. The UI re-renders from the new state. `@dnd-kit` handles the accessibility side: keyboard-driven drag via KeyboardSensor, proper ARIA attributes on all draggable and droppable elements.

The `useDistinctValues` hook populates dropdown options by scanning the full item array for each property -- deduplicating, sorting alphabetically, handling nulls. These values come from the unfiltered data set, so dropdown options do not disappear as filters narrow the results. The `taxonomyAdapter` maps our `VesselTaxonomyNode` tree into `CascadingMenuItem` format for the hierarchical dropdown.

## By the Numbers

| | |
|---|---|
| Tests passing | 64 |
| Test suites | 7 |
| Filter types | 10 |
| Input methods | 4 (hierarchical, flat-dropdown, bucket, free-text) |
| Storybook stories | 7 |

## Decisions That Stuck

The planning post outlined six decisions. All survived implementation.

**Single Lozenge component, polymorphic editors** turned out to be exactly right. The Lozenge component is 5 tests and handles rendering, click-to-edit, remove, and drag attributes. All the complexity lives in ValueEditor (9 tests), which switches on filter type. Adding an eleventh filter type would mean adding one case to ValueEditor and one matcher in the engine. Nothing else changes.

**@dnd-kit for drag-to-group** worked well. The OrContainer component (6 tests) accepts dragged lozenges as a droppable target, and the move operations in the reducer handle the state transitions cleanly. Moving a lozenge into an OR container removes it from the top level and adds it to the container's children in a single dispatch.

**Component-local state via useReducer** kept things contained. The 18 tests on useFilterBar verify every state transition -- add, remove, edit, move to container, move to top level, add OR group, remove OR group. The `toFilterExpression` converter (tested as part of the same suite) translates that state into the `FilterExpression` type from #126, skipping empty containers along the way.

**Dropdowns from the full data set** avoided a subtle UX trap. If dropdown values came from the filtered subset, adding a nationality filter would make other nationalities disappear from the dropdown -- confusing if you want to add a second nationality to an OR group.

## What Surprised Us

The `toFilterExpression` boundary deserved more thought than I initially gave it. Empty OR containers need to be skipped (no point generating an OR group with zero predicates), and the mixed AND+OR case requires careful structuring. Getting this right was the difference between "filters work in Storybook" and "filter state serialises to valid CQL2." The integration tests -- 12 of them covering the full add-filter-check-results loop -- caught several edge cases early.

The distinct values extraction was more involved than expected. Different STAC extension properties use different shapes -- some are flat arrays, some are nested, some are nullable. The `useDistinctValues` hook (10 tests) handles all of these, but it required working through each property type individually rather than writing one generic extractor.

Seven Storybook stories cover the interaction space: empty bar, single filter, multiple AND, OR group, interactive demo, all 10 filter types, and zero results. The "all filter types" story is the most useful for verification -- it renders every input method on one page.

## What's Next

The filter bar is a client-side component running against mock data. Feature #128 will add saved filter configurations -- persisting CQL2 expressions so analysts can recall their favourite queries. The `onExpressionChange` callback is already in place, emitting the CQL2 expression on every change. The storage layer is the missing piece.

> [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/127-filter-bar-lozenge-ui)
