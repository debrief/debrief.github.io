---
layout: future-post
title: "Shipped: Screenshot-complete blog archive"
date: 2026-04-24
track: [credibility]
author: Ian
reading_time: 4
tags: [tracer-bullet, archive, media, testing]
excerpt: "34 dropped screenshots, recovered. Every path Jekyll-absolute. A follow-up fix to the one-shot archive regenerator."
---

## What We Built

When we shipped the regenerated blog archive in #228, we thought the hard part was classifying 95 specs into unified posts, epic rollups, and composite posts. It wasn't. A post-ship audit the next day showed that 34 of 57 screenshots in the source shipped-posts had quietly vanished on the way into the archive. The rollup and composite stitchers were reading each member spec's opening paragraph and throwing the rest away — images included. A fourth image in `176-log-panel-ux` had been eaten by a heading-splice edge case. And every screenshot that did survive carried a source-relative path like `./evidence/screenshots/foo.png` — which would 404 on the Jekyll site the moment the archive was published.

This spec revives the one-shot generator from git history, teaches it about screenshots, re-runs it, and deletes it again in the same PR. The output is an archive where every member spec's images travel with its narrative, every path resolves under `/assets/images/future-debrief/{slug}/{basename}`, and `ARCHIVE-REBUILD.md` carries an inventory of 19 orphan screenshots (across specs 085, 118, and 142) that the maintainer can choose to embed by hand. The archive now matches the work we actually did.

## How It Works

`scripts/regenerate-blog-archive.py` came back from commit `19406178` onto a fresh branch, took three surgical patches, ran against the full 157-spec archive, and was deleted again in the final commit of the same PR. The patches are:

- A new `harvest_image_refs` helper walks each merged body with a tolerant `![alt](path "title")` regex, plus a sibling `_HTML_IMG_RE` for `<img src="...">` tags. Query strings and fragments are stripped before the basename is taken and reattached to the rewritten path.
- A new `rewrite_image_path(path, source_spec_slug)` helper turns every surviving reference into `/assets/images/future-debrief/{source-spec-slug}/{basename}`, stripping any leading `./`, `../`, or `evidence/` segments repeatedly so that `../../evidence/foo.png` and `evidence/screenshots/foo.png` resolve to the same URL. Scheme URIs and already-absolute paths pass through untouched.
- `stitch_epic_rollup` and `stitch_composite_post` gained a per-member `#### Screenshots` sub-section that emits every harvested reference with the rewritten path. `stitch_unified_post`'s twin-heading splice was rewritten to concatenate both bodies instead of choosing one, which recovered the missing `176-log-panel-ux` image.

`ARCHIVE-REBUILD.md` gained three new always-present sections: **Orphan Screenshots** (files on disk that no source post cites), **Broken Image References** (references pointing at missing files — surfaced, not fatal), and **Malformed Image References** (where `![` counts disagree with regex match counts). The generator never fails on bad input; it annotates and moves on.

## By the Numbers

| | |
|---|---|
| Source references preserved | 64 / 64 (was 25 / 64) |
| Source-relative paths in generated posts | 0 (was 22) |
| Orphan screenshots surfaced | 19 across specs 085, 118, 142 |
| `185-cql2-array-filter` composite image refs | 16 (was 0) |
| `176-log-panel-ux` image refs | 4 (was 3) |
| Tests passing | 109 / 109 (55 new) |
| Full-archive regeneration runtime | ~1 s for 157 specs |

## Lessons Learned

The single biggest surprise was how much work the test suite *didn't* stress. The #228 generator had 54 tests and green CI, and it still lost three fifths of the archive's screenshots on a live run. The rollup and composite stitchers had zero direct coverage — they were exercised only through the end-to-end test, which asserted shape (sections present, members listed) without ever checking that member images made it through. The fix was partly adding 16 new unit tests across the two stitchers, but the real lesson is that integration-only coverage hides whole classes of silent-drop defects. A helper that throws away half its input can pass every "does it produce output" assertion.

The `185-cql2-array-filter` composite is the clearest illustration. Pre-patch, that composite post contained zero image references despite absorbing three heavily-illustrated members — `186-filter-chips` (7 images), `189-stakeholder-demo-ui` (5), and `190-live-llm-transport` (4). Post-patch, the same file carries 16 references under three `#### Screenshots` sub-blocks, each one a Jekyll-absolute path.

Two edge cases only showed up when the patched generator met the real archive. First: `216-storyboarding-capture` uses Liquid-templated paths like `{{ site.baseurl }}/assets/...` that the initial regex classified as malformed. Five "malformed" warnings on a freshly patched script is the kind of signal where you either widen the regex or convince yourself the archive is wrong — widening won. Second: `176-log-panel-ux` had existed as a unified post in the #228 output, but the re-run classified it as a composite member (clustered with `208-timeline-entry-kind`), so the stale `unified-post.md` was no longer being regenerated. Nothing deleted it either, which meant the SC-002 grep kept finding source-relative paths in a file the generator had forgotten about. A one-liner `find specs -name unified-post.md -delete` before the re-run produced a clean grep — a reminder that when classification shifts, the filesystem doesn't catch up on its own.

The orphan scan was the quiet win. Three specs had screenshots on disk that no shipped-post had ever cited — 9 from chart-renderer, 9 from sensor-rendering, 1 from the VS Code E2E work. They'd been captured as evidence and then never referenced. The archive index now surfaces them next to the generated post each would most naturally belong to, which turns a repo-wide crawl into a single scroll. Discovery, not auto-embedding — the editorial call stays with the maintainer.

## What's Next

`ARCHIVE-REBUILD.md` still has one small non-determinism: the `Started` and `Completed` timestamps in the run-metadata block change across runs. That's pre-existing behaviour from #228, not a regression here, and the 75 regenerated posts themselves are byte-identical across successive runs. If we ever ship a second regeneration, making those timestamps configurable would be the obvious follow-up.

Orphan handling is deliberately a discovery surface, not an auto-fix. The generator surfaces the 19 orphans; the maintainer still decides which to embed, where, and with what alt text. That trade-off felt right for an archive that values editorial judgement over mechanical completeness — but it does mean the orphans section stays live until someone works through it by hand.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/231-blog-archive-screenshot-fix/spec.md)
→ [View the evidence](https://github.com/debrief/debrief-future/tree/main/specs/231-blog-archive-screenshot-fix/evidence)
