---
layout: future-post
title: "Shipped: List View with Spatial Thumbnails"
date: 2026-03-07
track: [credibility]
author: Ian
reading_time: 2
tags: [list, view, thumbnails, shipped]
excerpt: "The ExerciseListView component is now complete — a scrollable, virtualised exercise list with spatial thumbnails, flexible sorting, and recent-work resumption..."
---


# Shipped: List View with Spatial Thumbnails

The ExerciseListView component is now complete — a scrollable, virtualised exercise list with spatial thumbnails, flexible sorting, and recent-work resumption for the STAC Stack Browser.

## What We Built

The list view is the primary discovery interface for the Stack Browser. Analysts can browse exercises, scan metadata summaries, and identify exercises of interest through visual spatial thumbnails showing track patterns.

### Key Capabilities

- **Scrollable virtualised list** — handles 100+ exercises with smooth performance using @tanstack/react-virtual
- **Spatial thumbnails** — SVG renderings of track patterns from GeoJSON data, with Douglas-Peucker line simplification for clarity
- **Metadata summary** — vessel classes, tags, author, and duration displayed with smart truncation (+N more)
- **Flexible sorting** — three dimensions (recency, title, duration) with ascending/descending toggle
- **Recently Opened section** — prominent section at top for one-click session resumption with relative timestamps
- **Lazy GeoJSON loading** — track data loaded on demand as items scroll into view
- **Theme-aware styling** — VS Code CSS custom properties for light/dark/vscode themes
- **Keyboard accessibility** — Enter/Space support on all interactive elements

### Architecture

The component follows the established shared component library pattern:

- `ExerciseListItem` extends `CatalogOverviewItem` with STAC extension metadata
- Inline sort control and recently opened section (review decision 4B — fewer files)
- Props-driven `SpatialThumbnail` (review decision 6A — no internal data fetching)
- Locale-aware formatting via `Intl.DateTimeFormat` and `Intl.RelativeTimeFormat`

### Test Coverage

55 unit tests across 3 test files covering all user stories:
- US1: Browse exercises in scrollable list (5 tests)
- US2: Continue recent work (4 tests)
- US3: Sort exercises (5 tests)
- US4: Select exercise to open (2 tests)
- SpatialThumbnail rendering (5 tests)
- Utility functions (33 tests)

Plus 6 message type discrimination tests for the VS Code webview protocol.

## What's Next

- E2E visual regression tests via Playwright + Storybook
- VS Code webview integration when Stack Browser panel (#132) is assembled
- Three-view synchronisation with map and timeline (#132)
