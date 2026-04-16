---
layout: future-post
title: "Shipped: Stakeholder demo UI for natural-language catalog search"
date: 2026-04-16
track: [credibility, ambition]
author: Ian
reading_time: 5
tags: [tracer-bullet, nl-demo, cql2, stakeholder-demo, recorded-transport, stac]
excerpt: "A no-build-step React playground that lets stakeholders drive an NL catalog search offline -- no API keys, no CDN dependency, no backend."
---

## What We Built

A stakeholder walks up to a laptop, opens a browser, types "UK submarines", and sees a grid of matching plots with colour-coded filter chips above them. No credentials to hand over. No live API call burning tokens. No network dependency at all beyond the page itself loading. That is the promise of #189, and it shipped this week.

The demo lives under `apps/nl-demo/` and is a single HTML page. React and Babel run in the browser -- Babel standalone transforms the JSX inline so there is no build step for demo authors. All three runtime dependencies (React, ReactDOM, Babel) are vendored locally via `pnpm sync-data`, which copies them alongside the fixture JSON and the sample catalog. Once those are in place the page works entirely from the filesystem: `python -m http.server` and you are running.

The NL-to-CQL2 translation comes from #188's `generateCql2`, wired through that feature's hand-authored recorded-fixture transport. Every query resolves against a precomputed fixture rather than calling an LLM, so demos are deterministic -- the same phrase always produces the same chips and the same filtered result set.

![All 73 plots visible on load, empty chip bar, count reads "73 plots"](/assets/images/future-debrief/shipped-stakeholder-demo-ui/state-unfiltered.png)

_Initial state: all plots visible, query bar focused, chip bar empty._

![Animated walk-through: typing "uk submarines" produces nationality and vessel-class chips, the card grid filters, and clicking the x on the nationality chip broadens the result set](/assets/images/future-debrief/shipped-stakeholder-demo-ui/interaction.gif)

_Chip removal in flight: the x on a chip drops it, `cql2FromChips` recomputes the filter from what remains, and the engine re-evaluates against the catalog -- no LLM round-trip, because the chip itself is the source of truth for the filter once the initial generation has happened._

## Offline First -- and Why That Pivot Mattered

The spec originally called for React and Babel to load from CDN at runtime. During implementation we discovered that the cloud sandbox used for development blocks third-party CDN requests entirely. Rather than open a firewall exception, we vendored the libraries locally and adjusted the `pnpm sync-data` script to pull them into `data/vendor/` alongside the fixture files.

The happy side-effect: the demo is now genuinely self-contained. A stakeholder presentation is no longer a CDN reliability bet. Babel's minified bundle is around 3 MB -- unavoidable for in-browser JSX transformation, and acceptable given that it is served from the same origin and cached after the first load.

## The Case-Sensitivity Wrinkle in Recorded Transports

This is the implementation detail worth understanding if you work with recorded-fixture patterns elsewhere.

#188's recorded client validates a SHA-256 hash of the prompt string before returning a fixture. That hash was computed against the prompt as recorded -- "UK submarines", capital U, capital K. A stakeholder typing "uk submarines" (entirely reasonable) would hit the right corpus entry during phrase lookup, but would then fail the hash check when the raw string was passed to `generateCql2`.

The fix: we ship `corpus.json` alongside `responses.json`. At submit time the demo canonicalises the user's input, looks it up in `corpus.json` to find the original-case phrase, and passes that original phrase to `generateCql2`. The recorded client sees exactly the string it was recorded against. The user is none the wiser.

This pattern -- canonical lookup table kept adjacent to the fixture file -- is something to carry forward whenever recorded transports need to be robust to user input variation. The hash is the right mechanism for fixture integrity; the corpus is the right mechanism for input normalisation.

![Chips visible after "uk submarines", count reads "2 of 73 plots", card grid shows matching plots](/assets/images/future-debrief/shipped-stakeholder-demo-ui/state-filtered.png)

_Filtered state: chips emerge from the `LozengeSeed[]` returned by `generateCql2`, coloured by dimension -- blue for nationality, teal for domain. The running count and card grid update in the same render._

## Off-Corpus Recovery

When a phrase is not in the corpus -- or fails the hash check, which we treat identically -- the demo catches the miss and surfaces a banner explaining that the demo operates against a fixed phrase set. Below the explanation are five clickable example phrases drawn live from `corpus.json`, so they always match what is actually in the fixture file. Clicking one populates the query bar and runs the normal flow.

![Off-corpus banner with five clickable example phrases](/assets/images/future-debrief/shipped-stakeholder-demo-ui/state-off-corpus.png)

_Off-corpus state: the card grid does not change -- no destructive update -- and the user has a clear recovery path._

The distinction between the off-corpus banner and the zero-match empty state matters. A phrase outside the corpus is a "we don't have a fixture for that" situation; a phrase that parses but matches nothing in the catalog is a different situation -- the filter worked, it just produced an empty set. Both states get distinct messages and distinct recovery prompts.

![Zero-match empty state: chips remain visible, the card grid is replaced with a helpful "No plots match -- try rephrasing" card and a Clear all button](/assets/images/future-debrief/shipped-stakeholder-demo-ui/state-zero-match.png)

_Zero-match state: the corpus deliberately includes `klingon warbirds` as a test phrase that parses successfully but matches nothing in the sample catalog. The chips stay visible so the user can tell exactly what their filter said, alongside a clear recovery path._

## By the Numbers

| | |
|---|---|
| Tests passing | 28 |
| Tests failed | 0 |
| Vitest unit tests | 25 |
| Playwright smoke tests | 3 |
| Corpus phrases verified end-to-end | 9 |
| Demo bundle size (excluding vendor) | < 5 MB |

The Playwright smoke test drives a real browser through the full US1 flow: load the page, type "uk submarines", assert that the chip bar has at least two chips and the count has changed, remove a chip and assert the count rises. It uses the same `@sparticuz/chromium` pattern as `apps/web-shell` so it runs in the same CI environment without a separate browser install.

The vitest suite covers the three pure-function layers: chip palette mapping (`colour.test.mjs`), STAC item projection to card data (`projection.test.mjs`), and the chip-to-CQL2 round-trip (`recompute.test.mjs`). The round-trip test asserts that `cql2FromChips` produces a filter that selects the same items as the original LLM-generated CQL2 for nationality and domain combinations.

## Architecture Seam Worth Noting

The demo is a deliberate thin frontend. All of the logic -- phrase normalisation, LLM transport, CQL2 generation, filter evaluation, chip colour resolution -- lives in `@debrief/components`. The demo coordinates; it does not compute. This seam was the right call: when #190 adds a live LLM transport, the swap will be a single `createLiveLLMClient()` call replacing `createRecordedLLMClient()` in `demo.jsx`. The rest of the UI is unchanged.

## What's Next

#190 will swap the recorded transport for a live LLM client, turning this from a corpus-bound demo into a genuinely open-ended query interface. The UI code does not need to change for that -- the transport injection point is already there.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/189-stakeholder-demo-ui/spec.md)
→ [Usage walkthrough](https://github.com/debrief/debrief-future/tree/main/specs/189-stakeholder-demo-ui/evidence/usage-example.md)
