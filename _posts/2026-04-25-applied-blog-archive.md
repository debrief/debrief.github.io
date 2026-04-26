---
layout: future-post
title: "Building Applied Blog Archive"
date: 2026-04-25
track: credibility
author: Ian
reading_time: 6
tags: [tracer-bullet, archive, migration, media]
excerpt: "Closing the three-PR archive story — 73 site posts retired, 74 archive posts in their place, every screenshot resolves."
---

## What We're Building

This is step 4 of the `ARCHIVE-REBUILD.md` runbook — the one that has been sitting unexecuted since #228 merged. The regenerated blog archive has lived in `debrief-future` main for weeks; the live site at `debrief.github.io` has been quietly out of step, still serving 73 individually-published `_posts/*.md` files from the pre-archive one-at-a-time `/publish` era. This PR closes that gap. 73 site posts are retired and 74 unified / rollup / composite archive posts from `specs/*/media/*.md` take their place, each one carrying its images across to `assets/images/future-debrief/<slug>/` — roughly 400 binary copies, all resolvable.

Along the way I fixed two defects in the runbook itself. Step 1 told the maintainer to `rm _posts/future/*.md`, but the site has no `future/` subdirectory — posts live flat at `_posts/*.md`. And the runbook never mentioned image assets, so a literal execution would have shipped an archive whose every screenshot 404s on first page load. Both are patched in `ARCHIVE-REBUILD.md` as part of this feature, so the next maintainer who runs the runbook starts from ground truth rather than the same broken recipe.

## How It Fits

This is the last beat of the three-PR archive story. #228 wrote the runbook and generated the archive. #231 recovered 34 silently-dropped images and hardened the generator. #232 executes the runbook on the live site. When readers land on the Future Debrief blog after this ships, they see the feature-level narrative the archive was built to tell — epic rollups, composite posts clustering related specs, unified posts with their screenshots intact — rather than a chronological feed of individual shipped-post fragments. The archive stops being internal-only infrastructure and starts being the published record it was always meant to be.

## Key Decisions

- **Surface editorial drift, don't silently merge it.** Every about-to-be-replaced site post is diffed against its archive replacement across four sets: site-only fields, archive-only fields, value mismatches, and body divergence beyond whitespace. The reviewer sees each divergence in the PR description and decides — the migration never silently overwrites a hand-edit. `reading_time` is the common case and carries forward automatically; `permalink` is preserved verbatim where present.
- **Flat `_posts/*.md`, fix the runbook.** The runbook's original `_posts/future/*.md` target was speculative and never matched reality. Moving posts into a subdirectory now would fight GitHub Pages' post-discovery semantics for no benefit — filenames are already prefix-dated. The site stays flat; the runbook bends to match.
- **Config-and-content stay in separate PRs.** Per NFR-002, the `jekyll-redirect-from` activation and the new Jekyll build CI gate land in a pre-migration companion PR. The migration PR itself is pure content: 73 deletions, 74 additions, ~400 image copies, one runbook patch. Reviewable file-by-file without a single line of Jekyll config drift mixed in.
- **Ephemeral tooling, same pattern as #228 and #231.** The migration helper and its pytest suite live at `scripts/232-apply-archive-rebuild.py` and `tests/apply_archive_rebuild/` for exactly one PR, then vanish in the same commit as the content they produced. The reviewable artefact is the cross-repo content diff; the Python is scaffolding that nets to zero.
- **Idempotent asset copy.** `shutil.copy2` with symlinks resolved, byte-identical output, no timestamp-derived filenames. Re-running the copy step produces the same tree — so the migration is safe to re-run if anything gets interrupted mid-flight.

## Before/After

The cleanest case is `2026-01-23-task-build-system.md`. The site post and the archive's unified-post target filename happen to match (the archive's title is `Building Task Build System`, slugify-stripped to `task-build-system`, which lines up byte-for-byte with the existing dated filename), so the helper modifies in place rather than delete + create. Front-matter delta:

```diff
-title: "Shipped: Task Build System"
-date: 2026-01-23
-track: [credibility]
+title: Building Task Build System
+date: '2026-01-23'
+track: credibility
+tags:
+- build-system
+excerpt: Single commands for test/build/dev, checksum-based caching, zero overhead
+  dependency checks
 author: Ian
 reading_time: 2
-tags: [tracer-bullet, developer-experience, build-system]
-excerpt: "Single commands for test/build/dev, checksum-based caching, zero overhead dependency checks"
```

`reading_time: 2` is preserved verbatim — that's the merge rule (site wins on reading_time and permalink, archive wins on title, body, tags, excerpt). The body underneath is fully replaced, opening with `## What We're Building` rather than the old `## What We Built`. Every divergence like this gets surfaced in the PR description's collapsible Editorial-divergences block, with the actual diff inline, so the reviewer can spot any case where a hand-edit deserves rescuing back into the source spec.

The other shape is delete + create — for example `2026-01-09-shipped-schema-foundation.md` becomes `2026-01-09-building-schema-foundation.md`. Same content swap, but git records a `D` and a `??` rather than an `M`. Either way, the divergence ends up in the PR body for the reviewer.

## By the Numbers

| | |
|---|---|
| Site posts classified | 77 |
| Replace bucket | 21 |
| Merge bucket | 27 |
| Legacy preserved | 29 |
| Image assets copied | 51 |
| Posts deleted | 48 |
| Posts written | 21 |
| Tests passing | 41 |
| Pre-flight blockers fixed upstream | 5 |
| Source-relative leaks remaining | 0 |

Test suite breakdown: 13 classifier tests, 5 front-matter tests, 4 asset-resolver tests, 3 filename-collision tests, 6 divergence tests, 5 merge tests, 5 end-to-end including idempotency.

## Lessons Learned

The pre-flight contract earned its keep on the very first dry-run, in a way the spec didn't predict. The plan's risk register flagged "image asset references won't resolve" as the headline failure mode, so FR-009 makes the migration refuse to execute when any referenced asset is missing. Fine in theory. In practice, the first dry-run on the live state surfaced **5 missing assets**, and FR-009 dutifully blocked: 4 references to `095-results-bottom-panel/evidence/screenshots/*.png` (a pre-archive-era spec that never had screenshots captured in the first place, but the epic-rollup author plausibly referenced them anyway), and 1 reference to `216-storyboarding-capture/interaction.gif` (the file lives in `217-storyboarding-playback`, not `216-`).

The instinct was to patch the migration helper — add a fallback resolver, soft-fail on missing assets, log a warning. Wrong move. The right fix lived upstream, in the source archive posts. We dropped the four orphan image lines from `091-poly-featurekind/media/epic-rollup.md` and corrected the path in `215-storyboarding-schema/media/composite-post.md`. Re-ran the dry-run. 0 of 51 missing. Plan unblocked.

That's the FR-009 contract working exactly as designed: the pre-flight isn't there to be friendly, it's there to refuse to publish a half-broken archive. Fixing missing assets in the source-of-truth means the next time someone runs this migration — or any future one against these posts — the broken refs are already gone. Hand-patching the helper would have buried the problem in tooling rather than the content. Worth holding the line on, even when it feels like the script is being needlessly stubborn.

The other small surprise was filename matching. Initial design assumed slugs derived from spec keys would line up cleanly between site and archive. They don't — site posts use descriptive slugs like `shipped-schema-foundation` while archive target filenames use `building-schema-foundation`. Title-derived matching, not slug-derived, turned out to be the right key. Two pre-existing site posts (`task-build-system` and `tool-results-architecture`) happened to fall through as filename-identical with their archive targets, which is why git records 17 untracked + 2 modified rather than 21 untracked. Coincidence, not design — but a useful one, since modify-in-place preserves the GitHub permalink history for those two.

## What's Next

Once the migration PR merges on `debrief.github.io:master`, the post-deploy verifications are quick: SC-002 confirms every `/assets/images/future-debrief/...` URL on the live site returns 200, and SC-005 confirms the Jekyll build succeeds with the new `jekyll-redirect-from` plugin active and every `redirect_from:` entry resolves. Both are checklist items in `MIGRATION-REPORT.md`.

After that, the runbook at `ARCHIVE-REBUILD.md` is genuinely ready for re-runs. The two original defects are patched, the helper script demonstrates the pattern (and is already deleted per FR-014), and the next regeneration — whenever the next batch of specs warrants it — starts from a runbook that matches reality. The archive stops being a one-shot migration and becomes a repeatable operation.

→ [See the migration helper](https://github.com/debrief/debrief-future/pull/520)
→ [Read the runbook](https://github.com/debrief/debrief-future/blob/main/ARCHIVE-REBUILD.md)
