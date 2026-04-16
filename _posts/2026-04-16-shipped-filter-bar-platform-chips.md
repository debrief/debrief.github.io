---
layout: future-post
title: "Shipped: Filter Bar Platform Chips"
date: 2026-04-16
track: [credibility]
author: Ian
reading_time: 4
tags: [tracer-bullet, filter-bar, cql2, discovery-ui, e10]
excerpt: "One chip, one platform, multiple constraints. 'British submarines' now means exactly that — and the CQL2 round-trip is lossless."
---

## What We Built

The Filter Bar now has a **Platform** chip. Click the (+) button, pick "Platform", choose any subset of `nationality`, `domain`, `vessel_role`, `vessel_type`, and `vessel_class`, and confirm — one chip lands in the bar. Under the hood, the chip serialises to a single `array_filter(debrief:platforms, …)` CQL2 node whose inner predicate AND-combines the selected attributes. The filter engine evaluates the predicate *per-platform*, so a plot with a British frigate and a German submarine no longer false-positives a "British submarine" query.

The chip behaves like every other chip. Click to edit and the popover re-opens pre-filled. Toggle negate and the CQL2 output wraps in `not` and the result set inverts. Drag it into an OR container and you can build "British submarines OR German frigates" without any new mental model. Remove and the bar returns to baseline.

## The Flow

The whole user story is four screenshots.

### 1 — Empty bar

![Filter bar in its empty state, waiting for a chip to be added](/assets/images/future-debrief/shipped-filter-bar-platform-chips/interaction-1-empty.png)

### 2 — Filter-type menu with the new "Platform" entry

![Add-filter dropdown open, showing Platform as a selectable filter type alongside existing options](/assets/images/future-debrief/shipped-filter-bar-platform-chips/interaction-2-menu.png)

### 3 — Compound editor with attributes selected

![Platform value editor popover with nationality set to DE and domain set to Subsurface, Confirm button enabled](/assets/images/future-debrief/shipped-filter-bar-platform-chips/interaction-3-editor.png)

### 4 — Confirmed chip

![Confirmed platform chip in the filter bar labelled Platform: DE, Subsurface, with anchor icon and tinted background](/assets/images/future-debrief/shipped-filter-bar-platform-chips/interaction-4-chip.png)

## How It Works

The reducer stays generic. We extended `LozengeItem` into a discriminated union over `shape` — `simple` for every existing chip type, `platform` for the new one — rather than splitting into two top-level types. Move-to-container, move-to-top-level, negate, and remove all operate on the union transparently; only the render path and the `toFilterExpression` mapping needed per-shape branches.

A single platform chip emits an `array_filter` node over `debrief:platforms`. One attribute produces a bare comparison inside the lambda; two or more wrap in an AND. Two platform chips inside the same OR container collapse to a single `array_filter` with an OR-of-comparisons predicate — the engine evaluates each correctly per-platform without special-casing.

Deserialising cuts the other direction. `arrayFilterToPlatformAttributes` recognises the shape we emit and rebuilds the chip; anything richer (unknown fields, OR inside the AND) returns `null` and surfaces through the existing `FILTER_ERROR_MESSAGE` banner. No silent flattening — Article I.3 of the constitution (no silent failures) matters more once #188's NL→CQL2 generator starts producing shapes the UI can't always draw.

## Theme Parity

Tinted-blue background, anchor glyph, compound label — all additive styling, so existing chip themes are unchanged.

![Platform chip rendered in the light theme with a pale blue tint](/assets/images/future-debrief/shipped-filter-bar-platform-chips/component-light.png)

![Platform chip rendered in the dark theme with a muted blue tint](/assets/images/future-debrief/shipped-filter-bar-platform-chips/component-dark.png)

![Platform chip rendered in the VS Code theme, blending with the editor palette](/assets/images/future-debrief/shipped-filter-bar-platform-chips/component-vscode.png)

## Evidence

| | |
|---|---|
| New tests | 55 |
| Tests passing | 1468 |
| Tests failing | 0 |
| Playwright E2E | 10/10 |
| Regressions | 0 |

The NL→CQL2 corpus tests from #188 rely on a prompt-hash identity — adding `platform` to the flat schema description would have invalidated every recorded fixture. Keeping the platform chip out of the flat table and documenting `array_filter` in the paragraph below preserved every existing fixture.

## Backwards Loading

Saved filters written before #186 have no `shape` field on their lozenges. Rather than bumping `SavedFiltersCollection.version`, we added a single coercion step on restore (`kind: 'lozenge' && !shape → shape: 'simple'`). Pre-feature saved filters load unchanged; new ones always carry `shape`. No migration cost.

## What's Next

The adjacent E10 pieces become real now. #188's NL→CQL2 generator can produce `array_filter` expressions that the filter bar round-trips end-to-end. #190's live LLM transport stops being a solo feature — it's the last piece of a three-part chain ("British submarines" → CQL2 → chip → filtered results) the analyst experiences as one continuous action.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/186-filter-chips/spec.md)
→ [View the evidence](https://github.com/debrief/debrief-future/tree/main/specs/186-filter-chips/evidence)
