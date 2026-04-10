---
layout: future-post
title: "Shipped: Timeline/Gantt View: Temporal Discovery for STAC Exercises"
date: 2026-03-07
track: [credibility]
author: Ian
reading_time: 2
tags: [ui, timeline, filtering, stac]
excerpt: "The STAC Stack Browser now includes an interactive Timeline/Gantt view that lets analysts discover exercises by their temporal characteristics and narrow..."
---


# Timeline/Gantt View: Temporal Discovery for STAC Exercises

The STAC Stack Browser now includes an interactive Timeline/Gantt view that lets analysts discover exercises by their temporal characteristics and narrow results to a specific time period of interest.

## What We Built

The Timeline/Gantt view renders horizontal bars representing each exercise's temporal extent on a proportionally scaled time axis. The component supports four key user stories:

**1. Temporal Extent Visualization** — Each exercise appears as a horizontal bar spanning from its start to end datetime. Exercises with only a single datetime display as point markers. The time axis auto-scales from hours to decades based on the data range, using locale-aware formatting via `Intl.DateTimeFormat`.

**2. Live Temporal Filtering** — Draggable brush handles overlay the timeline, allowing analysts to narrow the visible time window. As the brush moves, the `onTemporalFilterChange` callback emits the selected range, enabling connected list and map views to update dynamically. The brush prevents handle inversion (FR-013) and supports body drag for panning.

**3. Exercise Selection** — Double-clicking any bar or point marker triggers `onItemSelect`, opening the exercise in a new editor tab while preserving the browser's filter state.

**4. Colour Scheme Integration** — An optional `colourFn` prop applies the active colour scheme to timeline bars, matching colours used in the map view. The implementation wraps the colour function in try/catch per Constitution Art. V.1, falling back to the default theme colour on errors.

## Technical Highlights

- **Zero new runtime dependencies** — Pure SVG rendering with React 18, no charting libraries
- **Extracted shared utilities** — Timeline helpers (`computeTimeRange`, `computeBarX`, `formatTimeByRange`, `itemOverlapsFilter`) extracted from CatalogOverview into `utils/timeline-helpers.ts` for reuse
- **Scrollable with fixed axis** — Vertical scrolling for 100+ items while the time axis stays pinned
- **728 tests passing** — 19 new tests covering all user stories, brush interactions, and colour scheme fallbacks
- **Backward compatible** — CatalogOverview refactored to import from shared utils with no behaviour changes

## Architecture

The component follows the established `shared/components` pattern:

```
shared/components/src/
├── utils/
│   ├── temporal-types.ts    # TimeSpan type
│   └── timeline-helpers.ts  # Extracted shared utilities
└── TimelineView/
    ├── TimelineView.tsx     # Main component
    ├── TimeBrush.tsx        # Brush overlay for filtering
    ├── TimelineView.css     # Theme-aware styles
    ├── types.ts             # TemporalFilter, ColourFn, props
    └── TimelineView.stories.tsx  # 7 Storybook stories
```

## What's Next

- **#132** — Three-view synchronisation will wire the timeline's `onTemporalFilterChange` to the shared filter state store
- **#134** — Colour scheme engine will provide the `colourFn` prop for classification-based colouring
