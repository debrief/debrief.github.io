---
layout: future-post
title: "Shipped: Shared React Component Library for Maritime Analysis"
date: 2026-01-17
track: "Shipped · shared-react-components"
author: Ian
reading_time: 4
tags: [debrief, react, components, maritime, shipped]
excerpt: "We've completed the foundational component library for Future Debrief, delivering reusable React components for maritime tactical analysis visualization."
---

We've completed the foundational component library for Future Debrief, delivering reusable React components for maritime tactical analysis visualization.

## What We Built

The `@debrief/components` package provides three core visualization components that work together seamlessly:

### MapView
A Leaflet-based map component that renders maritime track data with automatic bounds fitting, selection support, and theme-aware styling. Display a map with track features in just 5 lines of code:

```tsx
import { MapView } from '@debrief/components';
import trackData from './tracks.json';

function App() {
  return <MapView features={trackData} />;
}
```

### Timeline
A Canvas-rendered timeline showing when tracks and events occurred. Supports time range adjustment, feature highlighting, and synchronized selection with other components.

### FeatureList
A virtualized list component for displaying feature metadata. Built with `@tanstack/react-virtual` for smooth scrolling with thousands of features.

## Key Features

**Synchronized Selection**: Click a feature in any component and it highlights everywhere. The `useSelection` hook makes state management trivial:

```tsx
const selection = useSelection();
<MapView selectedIds={selection.selectedIds} onSelect={(id) => selection.toggle(id)} />
<FeatureList selectedIds={selection.selectedIds} onSelect={(id) => selection.toggle(id)} />
```

**Cross-Context Theming**: Components automatically adapt to their host environment with CSS Custom Properties. VS Code extensions get VS Code theming. Electron apps get native OS theming. Light, dark, and system-preference modes work out of the box.

**Type Safety**: Full TypeScript coverage with types derived from `@debrief/schemas`. No runtime type errors, excellent IDE support.

**Performance**:
- Bundle size under 100KB gzipped
- 60fps interactions verified
- Virtualized lists handle 10,000+ features smoothly

## By The Numbers

- **173 tests** passing across 9 test files
- **9 Storybook stories** documenting component states
- **6 user stories** completed
- **80 tasks** implemented

## Technical Stack

- React 18+ with TypeScript 5.x strict mode
- react-leaflet v5 for map rendering
- HTML5 Canvas for Timeline rendering
- @tanstack/react-virtual for list virtualization
- CSS Custom Properties for theming
- Vitest + Testing Library for testing
- Storybook 10.x for documentation

## What's Next

This component library becomes the foundation for:
- The VS Code extension's map and timeline views
- The Electron loader application
- Any future web-based interfaces

The components are designed to be extended - custom renderers, additional feature types, and organization-specific styling can all be added without modifying the core library.

## Try It

Browse the components in Storybook or install directly:

```bash
pnpm add @debrief/components
```

Import what you need:

```tsx
import { MapView, Timeline, FeatureList, ThemeProvider } from '@debrief/components';
import '@debrief/components/style.css';
```

The maritime analysis UI building blocks are ready.
