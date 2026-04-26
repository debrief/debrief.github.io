---
layout: future-post
title: Building Screenshot-Complete Blog Archive
date: '2026-04-24'
author: Ian
track: credibility
tags:
- tracer-bullet
- archive
- media
excerpt: 34 dropped screenshots, recovered. Every path Jekyll-absolute.
reading_time: 4
---
## What We're Building

When I shipped the regenerated blog archive in #228, I thought the hard part was classifying 95 specs into unified posts, epic rollups, and composite posts. It wasn't. A post-ship audit the next day showed that 34 of 57 screenshots in the source shipped-posts had quietly vanished on the way into the archive. The rollup and composite stitchers were reading each member spec's opening paragraph and throwing the rest away — images included. A fourth image in `176-log-panel-ux` had been eaten by a heading-splice edge case. And every screenshot that did survive carried a source-relative path like `./evidence/screenshots/foo.png` — which would 404 on the Jekyll site the moment the archive was published.

This spec revives the one-shot generator from git history, teaches it about screenshots, re-runs it, and deletes it again in the same PR. The output is an archive where every member spec's images travel with its narrative, every path resolves under `/assets/images/future-debrief/{slug}/{basename}`, and `ARCHIVE-REBUILD.md` carries an inventory of 19 orphan screenshots (across specs 085, 118, and 142) that the maintainer can choose to embed by hand. The archive now matches the work we actually did.

## How It Fits

The blog archive is institutional memory. Future contributors — and future me — will read it to understand what each feature did and why. A narrative without screenshots for a feature that was entirely visual (thumbnail capture, filter chips, the stakeholder demo UI) is a worse record than the per-spec post it was built from. This spec closes the gap between the archive and the source posts so that when the website maintainer runs the #228 runbook to publish to `debrief.github.io`, they ship a complete record — not a text-only approximation that quietly lost three fifths of its evidence.

## Key Decisions

- **Regex over parser.** A single tolerant `![alt](path "title")` regex walks each merged body line-by-line. The 57 source references are all plain CommonMark — a markdown AST walker would pull a non-stdlib dependency into a script that exists for six commits.
- **Absolute Jekyll paths, computed once.** Every surviving reference is rewritten to `/assets/images/future-debrief/{source-spec-slug}/{basename}`, with `?query` and `#fragment` suffixes preserved. Basename-only output eliminates the `./` vs `../` vs literal-`evidence/` ambiguity at one point rather than threading source-relative context through downstream logic.
- **Concatenate both bodies at the twin-heading splice.** The `176-log-panel-ux` defect sat inside the opener-splice branch that chose one body and discarded the other. Concatenating keeps a single source of truth; the fallback (a post-merge "Additional Screenshots" reconciliation) would have leaked splicing internals into the reader-facing narrative.
- **Ephemeral generator, same PR.** The script is revived from commit `19406178`, patched, re-run, and deleted again in the final commit — same pattern as #228 FR-009. The reviewer reads the prose diff across `specs/*/media/*.md` as the real artefact; the Python is a transient build step that nets to zero after merge.
- **Annotate broken references, never fail.** If a source post points at a screenshot that no longer exists on disk, the generator records it in a new `## Broken Image References` section of `ARCHIVE-REBUILD.md` and rewrites the path anyway. Honours Article I.3 (no silent failures) without turning missing assets into a run-blocking error.
- **Surface the orphans the audit found.** Scanning `evidence/screenshots/**` for files that no source post references turned up 19 screenshots — 9 in `085-chart-renderer`, 9 in `118-sensor-rendering`, 1 in `142-vscode-e2e-webview-reliability` — that would otherwise stay invisible. They land in a new `## Orphan Screenshots` section of the index, next to the generated post each would most naturally belong to, and the maintainer decides what to do with them.

## By the Numbers

| | |
|---|---|
| Source references preserved | 64 / 64 (was 25 / 64) |
| Source-relative paths in generated posts | 0 (was 22) |
| Orphan screenshots surfaced | 19 (across specs 085, 118, 142) |
| `185-cql2-array-filter` composite image refs | 16 (was 0) |
| `176-log-panel-ux` image refs | 4 (was 3) |
| Tests passing | 109 (55 new for this spec) |
| Full-archive regeneration runtime | ~1 s for 157 specs |

## Lessons Learned

The single biggest surprise was how much work the test suite *didn't* stress. The #228 generator had 54 tests and green CI, and it still lost three fifths of the archive's screenshots on a live run. The reason is that the rollup and composite stitchers had zero direct coverage — they were exercised only through the end-to-end test, which asserted shape (sections present, members listed) without ever checking that member images made it through. The fix was partly adding 16 new unit tests across the two stitchers, but the real lesson is that integration-only coverage hides whole classes of silent-drop defects. A helper that throws away half its input can pass every "does it produce output" assertion.

The 185 composite is the clearest illustration. Pre-patch, `specs/185-cql2-array-filter/media/composite-post.md` contained zero image references despite absorbing three heavily-illustrated members — 186-filter-chips (7 images), 189-stakeholder-demo-ui (5 images), and 190-live-llm-transport (4 images). Post-patch, the same file carries 16 references under three `#### Screenshots` sub-blocks, each one a Jekyll-absolute path. The 176-log-panel-ux diff was subtler: 3 of 4 source images had come through, but the fourth was sitting inside a twin-heading splice where the merger was choosing one body and discarding the other. Concatenating both bodies recovered it cleanly, and it now ships as a composite-member alongside 208-timeline-entry-kind with all 4 images intact.

Two edge cases only showed up when the patched generator met the real archive. The first: 216-storyboarding-capture uses Liquid-templated paths like `{{ site.baseurl }}/assets/...` in a handful of references, which the initial regex classified as malformed. Five "malformed" warnings on a freshly patched script is the kind of signal where you either widen the regex or convince yourself the archive is wrong — widening won. The second: 176 had pre-existed as a unified-post in the #228 output, but the re-run classified it as a composite-member (clustered with 208), so the stale `unified-post.md` was no longer being regenerated. Nothing deleted it either, which meant my SC-002 grep kept finding source-relative paths in a file the generator had forgotten about. A one-liner `find specs -name unified-post.md -delete` before the re-run produced a clean grep — a reminder that when classification shifts, the filesystem doesn't catch up on its own.

The orphan scan was the quiet win. Three specs had screenshots on disk that no shipped-post had ever referenced — 9 from chart-renderer, 9 from sensor-rendering, 1 from the VS Code E2E work. They'd been captured as evidence and then never cited. The archive index now surfaces them next to the generated post each would most naturally belong to, which turns a repo-wide crawl into a single scroll. Discovery, not auto-embedding — the editorial call stays with the maintainer.

## What's Next

`ARCHIVE-REBUILD.md` still has one small non-determinism: the `Started` and `Completed` timestamps in the run-metadata block change across runs. That's pre-existing behaviour from #228, not a regression here, and the 75 regenerated posts themselves are byte-identical across successive runs. If we ever ship a second regeneration, making those timestamps configurable (or stripping them entirely from the diffable output) would be the obvious follow-up.

Orphan handling is deliberately a discovery surface, not an auto-fix. The generator surfaces the 19 orphans; the maintainer still decides which to embed, where, and with what alt text. That trade-off felt right for an archive that values editorial judgement over mechanical completeness — but it does mean the orphans section stays live until someone works through it by hand.
