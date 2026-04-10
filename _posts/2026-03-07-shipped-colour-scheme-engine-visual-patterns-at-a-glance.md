---
layout: future-post
title: "Shipped: Colour Scheme Engine: Visual patterns at a glance"
date: 2026-03-07
track: [credibility]
author: Ian
reading_time: 2
tags: [discovery-ui, colour, legend, stac-browser]
excerpt: "Exercises on the map and timeline can now be colour-coded by Age, Vessel Class, or Tag — with a shared legend that explains the encoding."
---


# Colour Scheme Engine: Visual patterns at a glance

Exercises on the map and timeline can now be colour-coded by **Age**, **Vessel Class**, or **Tag** — with a shared legend that explains the encoding.

## What shipped

The colour scheme engine (#134) adds three capabilities to the Discovery UI:

1. **Colour dimension selector** — a dropdown that lets analysts switch between Age (gradient), Vessel Class (categorical), and Tag (categorical) colour encodings
2. **Shared legend** — renders a gradient bar for continuous dimensions and discrete swatches for categorical ones, visible alongside both map and timeline views
3. **Extensible architecture** — new colour dimensions can be registered without modifying existing code

## How it works

The engine is a headless module that computes colour assignments for a set of STAC items:

- **For the map view** (#130): a pre-computed `ReadonlyMap<string, string>` mapping item IDs to CSS colours
- **For the timeline view** (#131): a `ColourFn` that maps items to colours on demand
- Both outputs are derived from the same computation, guaranteeing colour consistency across views

## Key design decisions

- **Zero external dependencies** — palette colours are hand-curated (12 perceptually distinct colours based on Okabe-Ito), and gradient interpolation is hand-rolled. This keeps the module offline-capable and lightweight.
- **Follows the filter-engine pattern** — the colour-engine lives alongside `filter-engine/` in `shared/components/`, using the same module structure with types, engine logic, and co-located React components.
- **Unclassified handling** — items missing metadata for the active dimension receive a neutral colour, and the legend always includes an "Unclassified" entry when relevant.

## Evidence

- 48 unit tests covering engine, palette, dimensions, and both React components — all passing
- TypeScript strict mode, ESLint clean (0 errors)
- Storybook stories for visual verification of gradient and categorical legend modes
