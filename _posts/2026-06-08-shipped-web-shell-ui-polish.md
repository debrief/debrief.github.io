---
layout: future-post
title: "Shipped: Web-shell UI polish — contrast, layout, and discoverability"
date: 2026-06-08
track: [credibility]
author: Ian
reading_time: 4
tags: [web-shell, accessibility, playwright, discovery-ui, testing]
excerpt: Closing out an April UI review — high-contrast header links now hit WCAG AAA, the analysis view scales to wide screens, and three catalog controls finally do what they say.
---

## What We Built

Back in April we ran a structured UI review of the web-shell — the catalog browser and analysis view an analyst meets first. It produced a ranked list of findings. The headline items were fixed at the time; this work closes out the stragglers: the last two Priority-1 issues and all four Priority-2 ones. None of them was a new feature. Each was a place where the interface looked unfinished, behaved unpredictably, or quietly hid something the analyst needed.

Six things changed. In the high-contrast **light** theme, the header navigation links were effectively unreadable — measured contrast of **1.22:1**, far under the line. They now sit at roughly **8.6:1** (WCAG AAA for normal text) and carry an underline and heavier weight, so they read as links without relying on colour. The analysis view's activity column used to be a fixed width that truncated tool names like "Apply Symbol Style" on a 1920-wide monitor while crowding the map on a 1366-wide laptop. On a short 1280×720 laptop the Properties panel sat below the fold with no hint it was there. And in the catalog, two controls were advertised but inert: the timeline + map preview row wasn't discoverably collapsible, and the S / M / L thumbnail toggle changed nothing visible. A half-wired control is worse than no control — so those are now wired through.

![High-contrast light theme web-shell header showing the "Component Storybook", "VS Code Preview" and "Edit Backlog" navigation links rendered as bold, underlined blue links against a dark bar](/assets/images/future-debrief/shipped-web-shell-ui-polish/header-hc-light.png)

## How It Works

The contrast fix lives at the **shared theme-token level**, not on each link. One token change moves every header link in the high-contrast light theme over the AAA line, and any link added later inherits the same treatment for free — with the underline and weight as non-colour affordances baked in. The other three themes (light, dark, high-contrast dark) were left untouched and verified for no regression.

The analysis-view layout now picks a **responsive default width** for the activity column based on viewport: ~280px at ≤1366px wide to protect the map, stepping up to ~380px at ≥1600px so the longest tool name shows in full. At short heights (~720px) the upper sections auto-collapse so the Properties panel becomes reachable without anyone needing to know the column scrolls; at ≥900px nothing changes. Crucially, these are *defaults* — a valid saved user layout always wins, so the responsive behaviour only applies on a fresh open or a reset.

![Analysis view at 1920×1080 with a wide activity column on the left showing Time Controller, Tools with full untruncated labels, and Layers, while the map keeps the majority of the screen](/assets/images/future-debrief/shipped-web-shell-ui-polish/analysis-1920.png)

![Analysis view on a 1280×720 laptop with the upper sections auto-collapsed so the Properties panel is reachable without scrolling the activity column](/assets/images/future-debrief/shipped-web-shell-ui-polish/properties-720.png)

The two catalog controls were the most satisfying to close. The collapse control on the timeline + map row is now a clearly labelled affordance rather than a bare glyph, and the S / M / L toggle drives both thumbnail imagery and row height with the active size clearly indicated. Both pieces of state — collapsed/restored, and the chosen thumbnail size — persist across reloads via **localStorage**, kept deliberately as UI-local preference rather than routed through the domain data layer, with a version marker so a future format change can't render a broken control.

![Catalog browser with the exercise list above a TIMELINE and MAP preview row, each carrying a labelled "Collapse" control, and an S / M / L thumbnail-size toggle in the top-right of the list](/assets/images/future-debrief/shipped-web-shell-ui-polish/thumbnail-sizes.png)

## Evidence

The most failure-prone item was actually a *test*, not a pixel: the `properties-screenshots` E2E suite was flaky, failing roughly 2 runs in 13 on first attempt. The fix gates the row-click on a reliably-present anchor element instead of racing the form's appearance — without inflating timeouts, which would only mask real breakage. It now passes **40/40 consecutive first-attempt runs with retries disabled**.

| Metric | Value |
|---|---|
| Component unit tests | 2,399 passed / 4 skipped / 0 failed |
| New E2E specs (Playwright) | 13 passing across 3 suites |
| Flake proof | 40/40 first-attempt passes, zero retries |
| Lint & typecheck | 0 errors across all workspaces |
| HC-light header contrast | 1.22:1 → ~8.6:1 (WCAG AAA) |
| Activity-column bands | 280px ≤1366 · 320px mid · 380px ≥1600 |
| New runtime dependencies | None |

![Analysis view at 1366×768 with the activity column held to a compact ~280px so the map keeps usable width](/assets/images/future-debrief/shipped-web-shell-ui-polish/analysis-1366.png)

![Catalog at 1280×720 with the timeline and map preview row collapsed, handing the reclaimed vertical space back to the exercise list](/assets/images/future-debrief/shipped-web-shell-ui-polish/catalog-collapse.png)

## What's Next

This clears the in-scope P1 and P2 findings from the April review; the remaining P3 items (map icon affordances, tool disable states, filter-type grouping) are deliberately parked. Because the contrast fix landed at the shared-token level and the layout logic sits in shared components, both the web-shell and the VS Code host inherit the polish automatically — which is exactly the "thin frontends over shared components" payoff we keep betting on.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/281-ui-review-p1-p2-fixes/spec.md)
→ [View the evidence](https://github.com/debrief/debrief-future/tree/main/specs/281-ui-review-p1-p2-fixes/evidence)
