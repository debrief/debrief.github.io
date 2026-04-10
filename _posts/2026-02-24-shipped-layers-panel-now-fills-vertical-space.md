---
layout: future-post
title: "Shipped: Layers Panel Now Fills Vertical Space"
date: 2026-02-24
track: [credibility]
author: Ian
reading_time: 4
tags: [tracer-bullet, activity-panel, css, bug-fix]
excerpt: "A two-rule CSS fix makes the Layers section expand when sibling sections collapse."
---


## What We Built

When you collapse the Time Controller and Tools sections in the Activity Panel, the Layers section should expand to fill the space. It didn't. Instead, a large gap appeared below your layers list — sometimes half the panel height, sitting empty while your layer entries were squeezed into a fixed 300px box.

The root cause was a mismatch between two levels of the layout. The Activity Panel's outer flex column correctly allocated space to sections when siblings collapsed. But inside the Layers section, the FeatureList component was locked at a fixed 300px height, and its container wasn't a flex item. So the list sat at 300px, and everything below it was wasted whitespace.

The fix is two CSS rule changes, both in the Activity Panel stylesheet:

1. Make `.section-content` a flex column container inside collapsible sections
2. Add `flex: 1 1 0%` to `.debrief-feature-list` so it expands to fill remaining space

The flex shorthand's `flex-basis: 0%` overrides the inline 300px height via standard CSS specificity — no component changes, no `!important` hacks. Scrolling responsibility moves one level down in the DOM (to FeatureList's existing scroll container), but that's invisible to users.

## How It Works

Three collapsible sections in a flex column: Time Controller (fixed height), Tools (flexible), Layers (flexible). When you collapse Tools, the outer flex layout frees up that section's space. Before the fix, the Layers container would grow, but its child FeatureList wouldn't — it stayed locked at 300px. After the fix, the FeatureList participates in flex layout and expands to fill the container.

We tested all 8 collapse-state combinations. The two visibly broken ones — Tools collapsed, or Tools and Time Controller both collapsed — are fixed. The other six remain correct, with no regressions.

## Lessons Learned

This was a small fix solving a visible polish problem. The decision to make it CSS-only rather than refactoring FeatureList proved correct: we wanted the layers section to use all available space without changing the component's behaviour everywhere else in the codebase. FeatureList has a `height` prop that defaults to 300px, and other contexts outside flex containers may rely on that. A targeted CSS override was the right trade-off.

The comprehensive E2E test suite — 7 Playwright tests covering all collapse states plus dark and VS Code theme variants — caught the layout correctly in each state. That test coverage is why we shipped with confidence: 597 existing component tests still pass, and the 1,660 tests across the full project remain green.

## What's Next

The Activity Panel is the central orchestration point for the VS Code extension. With this fix complete, all remaining tracer-bullet work converges on the integration story: loading data, storing it in STAC, querying across a catalog, and running analysis tools. The Activity Panel's section collapse states aren't a blocker anymore.

→ [See the code](https://github.com/debrief/debrief-future/pull/101)
