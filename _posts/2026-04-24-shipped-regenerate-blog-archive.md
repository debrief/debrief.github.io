---
title: "Building Blog-Archive Regeneration"
date: 2026-04-24
layout: future-post
author: Ian
track: [momentum]
reading_time: 6
excerpt: "Regenerate the `future` blog archive from specs in one shot — 73 posts + a handoff runbook, then delete the script."
tags:
  - content
  - tooling
  - archive
  - tracer-bullet
  - shipped
---

## What We're Building

I'm regenerating the `future` blog archive on debrief.github.io from the specs directory in one shot. The script walks every shipped spec under `specs/`, emits a `Building [Feature]` post per standalone spec, a single rollup post per complete epic (replacing per-spec posts for its members), and composite posts where two or three standalone specs shipped close together on a shared theme. The output is a set of generated post files plus one `ARCHIVE-REBUILD.md` at the repo root — an index, an unresolved-groupings section, and a runbook the debrief.github.io maintainer uses to wipe and republish the archive without a follow-up question.

The reason this exists is that the current archive is a layered mix of planning posts, shipped posts, and LinkedIn drafts written under drifting conventions. It predates the `Building [Feature]` title pattern and the cached-opener contract that PR #511 introduced. Rather than hand-editing a hundred-plus files, I'd rather regenerate from the source of truth — the specs themselves — and accept that a handful of edge cases will surface in the index for human adjudication.

## How It Fits

This is infrastructure, not a platform feature. It lives at `scripts/regenerate-blog-archive.py` for exactly one PR and is deleted in the same PR that commits its output — FR-009 is explicit about that. It sits one layer above the media workflow already documented in `.claude/agents/media/content.md`: same voice, same three-section opener structure, same evidence directory conventions. The script reads `specs/*/`, `BACKLOG.md`, and `docs/ideas/E*.md`; writes only new files; refuses to overwrite anything; and stages every write in a tempdir so a mid-run failure rolls back cleanly.

## Key Decisions

- **BACKLOG.md is the primary epic charter source, not `NNN-epic-*/spec.md`.** The spec assumes charter directories exist; the repo doesn't actually have them. Rather than invent synthetic charters or silently paper over the gap, the planner shifted to BACKLOG.md's Epics table, with `docs/ideas/E*.md` as enrichment and `[Ex]` title prefixes as fallback. The spec's *intent* — surface mismatches to the author rather than reconcile them silently — survives; the *mechanism* changed.
- **Verbatim copy when a cached opener exists; deterministic synthesis when it doesn't.** Synthesised openers get a visible HTML comment and an index flag so the maintainer knows which posts were written from spec slices rather than planning-time framing. No paraphrasing of existing cached openers, ever.
- **Composite clustering is narrow on purpose.** ≤ 5 day proximity plus ≥ 1 shared tag (after filtering `tracer-bullet`, `shipped`, `debrief`). 6–10 day near-misses land in the index for manual promotion rather than auto-grouping, because a wrong composite is harder to unpick than a missing one.
- **Offline-safe, `gh` optional.** When the CLI isn't available, the script falls back to the committed `shipped-post.md` as the PR-description proxy and records the provenance source per spec in the index.
- **One-shot, not productised.** Tests, golden fixtures, the dry-run smoke — all go when the script goes. The cost of maintaining a blog regenerator forever is higher than the cost of rerunning this exercise if we ever need to.

## Screenshots

Not applicable — this is infrastructure; the handoff artefact is the output. The real screenshot is the committed diff: 73 new markdown files under `specs/*/media/` + one `ARCHIVE-REBUILD.md` at repo root. The index table is the visual; see `specs/228-regenerate-blog-archive/evidence/dry-run-index.md` for a snapshot.

## By the Numbers

| | |
|---|---|
| Spec directories scanned | 155 |
| Shipped (eligible) | 129 |
| Unified posts generated | 56 |
| Epic rollups generated | 3 |
| Composite posts generated | 14 |
| Epic members (absorbed into rollups) | 29 |
| In-flight specs skipped | 26 |
| Unresolved groupings surfaced | 43 |
| Total generated files | 73 posts + 1 index |
| Existing files modified by the generator | 0 |
| Run duration | 0.3 s |
| Tests passing | 54 / 54 |
| Coverage | 77 % |
| Contract tests (C1–C11) | 11 / 11 green |
| New runtime dependencies | 0 |
| Lines of generator code | ~1100 (deleted same PR) |

## Lessons Learned

The sharp edge was **NNN collisions**. The speckit numbering scheme was not strictly unique — `001-debrief-stac`, `001-shared-react-components`, and four others all share the leading number. The first pass keyed everything by `number: int`, and the coverage invariant tripped on the first real run: "spec 001 classified twice." The fix was to key every lookup by the full slug (`{number:03d}-{slug}`) rather than the numeric prefix. It touched dataclasses, the classifier, the union-find clusterer, and the index row lookup — but the invariant surfaced it at the first execution, not the tenth.

The other lesson was **tag noise**. The initial NOISE_TAGS list (`tracer-bullet`, `shipped`, `debrief`) wasn't enough; the first dry run produced a 13-member composite cluster because specs broadly share tags like `stac`, `vscode-extension`, and `typescript`. I widened NOISE_TAGS once in situ — the Open Question the spec left open was real, and the remediation path the plan documented worked exactly as written. Two clusters still exceed the 5-member preferred cap; they warn loudly and the human author can split them before publication if desired.

Third: the **tense-inverted twin heading** pattern. Many shipped posts start with `## What We Built` or `## What Shipped`, which reads fine on its own but sits awkwardly next to the cached opener's `## What We're Building`. The data-model review patch added a stitch rule that detects the twin, strips the duplicate heading, and splices its opening paragraph onto the tail of `## Key Decisions`. Small detail, big readability win.

## What's Next

The generator gets deleted in this same PR (FR-009). The `debrief.github.io` maintainer wipes the existing `_posts/future/` directory, copies the 73 generated files across, applies the four-step runbook from `ARCHIVE-REBUILD.md`, and rebuilds the Jekyll site. The source is preserved in git history for the single-digit probability we need to regenerate again.

Two near-term follow-ups I'd expect to see surface after the archive is live:

1. **Composite quality review.** The 7-member `comp-052…098` cluster and the 6-member `comp-185…190` cluster are technically valid by the FR-003 rules but thin as narrative. The author may want to break them into smaller pairs or promote the larger one into a retroactive epic rollup. The index flags them clearly; the editorial call is outside the script.
2. **Legacy charter handling for E07 and E10.** Both epics exist in BACKLOG with shipped members but no `docs/ideas/Exx-*.md` companion. They're flagged as `legacy-charter` in Unresolved Groupings. The rollup still generates from the BACKLOG description; whether to author the idea docs retroactively is a judgement call.

If either of those turns into ongoing editorial work, the option to rerun this script lives one `git show` away from the commit that deleted it.
