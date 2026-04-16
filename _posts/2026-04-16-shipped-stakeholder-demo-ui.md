---
layout: future-post
title: "Shipped: Stakeholder demo UI for natural-language catalog search"
date: 2026-04-16
track: [credibility]
author: Ian
reading_time: 4
tags: [nl-cql2, stac, react, filter-engine, developer-experience, tracer-bullet]
excerpt: "A single-page playground that turns 'UK submarines' into colour-coded chips and a filtered card grid. No build step, no live LLM, no network calls beyond initial load."
---

## What We Built

`apps/nl-demo/` is a static directory -- HTML, JS, CSS, JSON -- that a stakeholder can open in any browser and use to judge whether natural-language catalog search is credible. Type a phrase, press Enter, watch chips appear, watch the card grid shrink. Remove a chip, watch the grid widen. Type something off-corpus, get a friendly banner with five phrases that do work. Zero plots? A tidy empty state, not a blank area.

The demo is the visible face of the last three items in Epic E10. It pulls the enum bundle from #187, feeds phrases into the `generateCql2` library from #188, and filters the catalog via `filterByCql2Json` from the shared filter engine. Nothing new happens under the hood; the engine is exactly the one the main product uses. What's new is that an analyst -- or a stakeholder pretending to be one -- can drive it with words instead of cascading menus.

![Initial state: all 73 plots visible, empty chip bar, query box focused](/assets/images/future-debrief/shipped-stakeholder-demo-ui/state-unfiltered.png)

## How It Works

The page is a single HTML file with React and Babel-standalone transforming JSX at runtime. There is no build step. On first load, `pnpm sync-data` copies three things into `./data/`: the sample catalog (#184), the fixture corpus (#188), and the vendored React + Babel runtime. After that, `pnpm serve` from any static host is enough.

The query pipeline is short. The input box passes its raw string to `generateCql2(phrase, { llmClient, enumBundle })`. The LLM client is the recorded transport from #188 -- a hash lookup against a fixture file. It returns a `GenerationResult` with a CQL2 tree and a set of `LozengeSeed`s. The demo dispatches the seeds straight into the filter-bar reducer (same reducer the main product uses, no mapper) and passes the CQL2 tree to `filterByCql2Json`. The visible card grid is whatever that call returns.

![Filtered state: 'uk submarines' produces blue + green chips, count drops to 2 of 73](/assets/images/future-debrief/shipped-stakeholder-demo-ui/state-filtered.png)

Chip colours follow the prototype palette from the spec: nationality blue, vessel green, exercise purple, tag amber, year coral, domain teal. Cards surface a title, year, truncated description, nationality and vessel-type badges, and up to three tags. Badges matching an active chip are visually emphasised so the link between "what I asked for" and "what I got" reads at a glance.

## Off-corpus and Zero-match

Two empty states, two different causes. Off-corpus means the phrase has no fixture; the banner says so, lists five example phrases, and leaves the grid untouched. Zero-match means the phrase produced a valid CQL2 that the catalog just doesn't satisfy; the grid is replaced with a rephrasing suggestion and a Clear-all button. Both were easy to conflate in review, so we kept them visually and semantically distinct.

![Off-corpus banner: 'purple elephants' shown above five clickable example phrases](/assets/images/future-debrief/shipped-stakeholder-demo-ui/state-off-corpus.png)

## Two Decisions Worth Calling Out

**Vendor, don't CDN.** The spec originally allowed CDN-loaded React and Babel. We vendored them locally during implementation instead. A stakeholder demo on a hotel Wi-Fi is already a precarious moment; making it a CDN reliability bet as well was a risk we didn't need to take. The bundle weighs ~3 MB more because of it. Worth it.

**Canonicalise before hashing.** The fixture transport keys on `sha256(prompt + phrase)`. Stakeholders type `UK Submarines!`, `uk submarines`, `UK submarines`; only one of those hashes to anything. A small `corpus.json` sits alongside the fixture file and maps surface forms to canonical phrases before the hash is computed. It's a five-line lookup and it's the difference between "the demo works" and "the demo works if you hit the exact casing".

![Zero-match empty state: chips still visible, grid replaced with rephrasing suggestion](/assets/images/future-debrief/shipped-stakeholder-demo-ui/state-zero-match.png)

## By the Numbers

| | |
|---|---|
| Vitest unit tests | 25 passed |
| Playwright smoke tests | 3 passed |
| Corpus phrases verified end-to-end | 9 |
| Bundle size (excl. vendored runtime) | < 5 MB |
| Vendored Babel transformer | ~3 MB |
| External network calls after load | 0 |

## What's Next

Issue #190 swaps the recorded transport for a live LLM client. The `LLMClient` interface is the only seam that changes -- the UI, the filter engine, the chip reducer all stay as they are. If we drew the boundary right, open-ended queries will work with a one-line transport swap in `apps/nl-demo/src/bootstrap.ts`. If we drew it wrong, #190 is where we'll find out.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/189-stakeholder-demo-ui/spec.md)
→ [View the evidence](https://github.com/debrief/debrief-future/tree/main/specs/189-stakeholder-demo-ui/evidence)
