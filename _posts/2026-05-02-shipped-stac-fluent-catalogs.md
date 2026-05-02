---
layout: future-post
title: "Shipped: STAC 1.1.0 upgrade — Debrief catalogs become STAC-fluent"
date: 2026-05-02
track: [credibility]
author: Ian
reading_time: 5
feature: 241-stac-best-practices-upgrade
tags: [stac, schemas, interop, sample-catalog, vscode-extension]
excerpt: "Lifted the bundled catalog to STAC 1.1.0, swapped bespoke debrief lineage fields for the standard processing and file extensions, and proved it renders in radiantearth/stac-browser."
---

![The Debrief sample catalog rendered in radiantearth/stac-browser v3.3.4 — Collection landing page showing item_assets, providers, and the overview/thumbnail role split](/assets/images/future-debrief/shipped-stac-fluent-catalogs/stac-browser-collection.png)

## What We Built

We upgraded Debrief's STAC catalog from 1.0.0 to 1.1.0 and, along the way, swapped a stack of bespoke `debrief:` fields for the standard `processing` and `file` extensions that the rest of the STAC ecosystem already understands. Lineage now co-publishes through `processing:software` and `processing:datetime` alongside the existing `debrief:provenance` (we kept the bespoke fields — the standard ones sit beside them); asset integrity ships as `file:checksum` (multihash-encoded) and `file:size`; every Item now carries the recommended `created`, `updated`, `license`, and `providers` metadata; the 800×600 PNG is reclassified as an `overview` asset so the 200×150 takes its proper place as the `thumbnail`; and the Collection promotes `item_assets` to the top level so the catalog self-documents without a reader having to crack open a sample item.

The proof point is that the regenerated 73-item sample catalog now renders correctly in `radiantearth/stac-browser` v3.3.4 — the same browser the wider STAC community uses to evaluate any new catalog. Before this work, Debrief catalogs would technically validate but render with a lot of unknown-field shrugging. Now they look like they belong.

## How It Fits

STAC is the bridge between Debrief and the rest of the geospatial analysis world. If an analyst already has STAC tooling in their workflow — a browser, a Python client, a search index — Debrief catalogs should drop into it without a shim. This upgrade moves Debrief from "STAC-shaped" to "STAC-fluent": the catalog speaks the dialect downstream tools were built for, and the bespoke `debrief:` namespace becomes a value-add rather than the only way in.

## Key Decisions

- **Pin `processing` v1.2.0 and `file` v2.1.0.** Both are the current registry-stable versions. Pinning means a future extension bump won't silently change what the catalog claims to support.
- **Adopt `multiformats` for `file:checksum`.** The spec mandates multihash encoding, not raw SHA-256 hex. Pulling in the `multiformats` PyPI package keeps the encoding honest and matches the rest of the STAC Python ecosystem.
- **Recover `created` from git history.** Item-level `created` is supposed to mean "when this item first existed", which for a sample catalog is genuinely the first commit that introduced the `item.json`. `git log --diff-filter=A` gives us that for free; `updated` is the regen timestamp.
- **`license: "other"` plus a `rel: "license"` link.** The sample catalog isn't under any SPDX-listed licence, and lying about that to satisfy a validator would be worse than admitting it. STAC explicitly allows `"other"` provided a licence link is present.
- **Test against the real `radiantearth/stac-browser`.** The whole point of this work is "we render correctly in industry-standard tooling", and a stripped-down equivalent would prove nothing. The Playwright test serves the regenerated catalog on port 4080 and the real browser on 8080, then drives a navigation flow and captures three screenshots as ship-time evidence.
- **Keep the `debrief:` namespace, don't remove it.** Standard fields are co-published alongside the bespoke ones, not as a replacement. Readers that already understand `debrief:` keep working; readers that only speak standard STAC now have a path in.

## Screenshots

The Item detail view is the most satisfying part of the result. STAC Browser doesn't know anything about Debrief, but it knows how to render `processing:datetime`, `file:size`, `created`, `updated`, the asset role enum, and the provider table — which means an upgraded Item shows up the way a third-party reviewer expects, without any custom tooling on the receiving end.

![A single regenerated Item rendered in stac-browser — Saxon Warrior: Ambig Tracks2 with metadata table, provider, and assets list with role tags](/assets/images/future-debrief/shipped-stac-fluent-catalogs/stac-browser-item.png)

Notice the four asset rows in the bottom-left panel: **GeoJSON Features [DATA]**, **Ambig_tracks2.dpf [SOURCE]**, **Plot thumbnail (200×150) [THUMBNAIL]**, **Plot overview (800×600) [OVERVIEW]**. Those role badges are stac-browser pretty-printing the `roles` array — exactly what we hoped for when we set the `["overview"]` role on the large variant rather than leaving it as an unloved "thumbnail" sibling.

The Assets section also surfaces `debrief:*` fields without choking on them. Where stac-browser doesn't have a renderer for an extension, it falls back to a clean key/value table — the polite "we don't know what your extension is, but here's the data anyway" behaviour we want from a third-party reader.

![Assets section in stac-browser showing role-tagged entries plus debrief:platforms and tags rendered as a metadata table](/assets/images/future-debrief/shipped-stac-fluent-catalogs/stac-browser-assets.png)

## By the Numbers

| Metric | Value |
|---|---|
| Items regenerated | 73 / 73 |
| Items validating against vendored STAC 1.1 schemas | 73 / 73 |
| Items still using deprecated `license: "proprietary"` | 0 |
| Playwright runs without retries (3 consecutive) | 3 / 3 |
| Playwright spec runtime | ~5.9 s (60 s budget) |
| Regen script second-run diff | 0 files |
| Schema fixtures vendored offline (STAC + GeoJSON) | 13 |
| stac-browser v3.3.4 dist files vendored | 342 (~17 MB) |

## Lessons Learned

**Idempotency is a property of the output, not the work.** The regen script computes file checksums every run, then compares the *output* against what's already on disk and skips the write if nothing material changed. The `properties.updated` timestamp would naturally change every run and break idempotency, so the script preserves the existing timestamp when no other field changed. A second invocation produces zero git diff without the script doing clever differential work to get there.

**Vendoring the schemas turned out to be the right move.** The previous validation harness probed the network at import time and silently skipped if `https://schemas.stacspec.org` was unreachable — Article I.3 violation, and a reliability hazard in CI. Vendoring 11 STAC schemas plus 2 GeoJSON schemas under `services/stac/tests/fixtures/stac-schemas/` (with a `refresh-stac-schemas.sh` script for future bumps) makes schema validation a permanent, network-free CI gate at a disk cost of ~150 KB.

**Vendoring the renderer turned out to be the right move too.** The Playwright test could have done `pnpm dlx @radiantearth/stac-browser` at runtime, but every CI run would have paid the install cost and been at the mercy of npm registry availability. Cloning the v3.3.4 tag once, building it, and committing the 17 MB `dist/` tree under `apps/web-shell/test-fixtures/stac-browser-v3.3.4/` is bigger as a one-off cost but cheaper every CI run, and screenshots stay reproducible because the renderer doesn't drift between releases.

**The asset-key rename touched more than expected.** Changing `assets.thumbnail` from "the 800×600" to "the 200×150" rippled through every TypeScript reader of the catalog — `apps/vscode/src/types/stac.ts`, `services/stacService.ts`, `panels/catalogOverviewPanel.ts`, `shared/components/src/StacBrowser/ThumbnailPreview.tsx`, and several more. Strict tsc made every consumer surface itself in one round; finding them by hand would have been an evening's work and a definite missed call site.

## What's Next

A follow-up promotes the in-process thumbnail-write shim to a fully service-mediated path so the same-process write also routes through `services/stac/`, and a separate piece formalises the storyboard scene-thumbnail asset keys as a first-class LinkML schema. When STAC 1.2 lands stable, the vendored-schema approach makes that a one-line bump in `scripts/refresh-stac-schemas.sh` plus a re-run.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/241-stac-best-practices-upgrade/spec.md)
→ [View the evidence](https://github.com/debrief/debrief-future/tree/main/specs/241-stac-best-practices-upgrade/evidence)
