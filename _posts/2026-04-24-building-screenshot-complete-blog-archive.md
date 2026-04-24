---
layout: future-post
title: "Building Screenshot-Complete Blog Archive"
date: 2026-04-24
track: credibility
author: Ian
reading_time: 4
tags:
  - tracer-bullet
  - archive
  - media
excerpt: "Revived the one-shot generator, recovered 34 silently-dropped images, and added three new maintainer-facing sections to the archive index."
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

## Screenshots

No UI changes this pass — the feature is a data-processing fix. The clearest way to see the impact is to grep the generated output before and after.

### Sample A — 185-cql2-array-filter composite: 0 → 16 images

Cluster: 186-filter-chips (7 images), 189-stakeholder-demo-ui (5), 190-live-llm-transport (4). Combined source references: 16.

Before (PR #518 ship state, `6fc7cb17`):

```sh
$ grep -c '!\[' specs/185-cql2-array-filter/media/composite-post.md
0
```

The composite post rendered the members as plain text bullets under `## What Shipped`, with no screenshots whatsoever.

After (this PR, `71360579`):

```sh
$ grep -c '!\[' specs/185-cql2-array-filter/media/composite-post.md
16
```

Every image path has been rewritten from source-relative `./evidence/screenshots/...` to the Jekyll absolute `/assets/images/future-debrief/{slug}/...` form.

### Sample B — 176-log-panel-ux composite: 3 → 4 images, paths rewritten

Source opens with the tense-inverted twin heading `## What We Built` followed by four images spread across four `##` sub-sections. The fourth (`component-light.png`) was silently dropped when the stitcher spliced the first paragraph into `## Key Decisions` and discarded the rest.

Before (`6fc7cb17`):

```sh
$ grep -c '!\[' specs/176-log-panel-ux/media/unified-post.md
3
```

```markdown
![All six tool-category icons in a single view](../evidence/screenshots/all-categories.png)
![Snapshot entry, empty params, deleted track, multi-track wrap](../evidence/screenshots/edge-cases.png)
![Disabled card at reduced opacity with the Disabled badge](../evidence/screenshots/disabled-state.png)
```

After (`71360579` — reclassified to composite):

```sh
$ grep -c '!\[' specs/176-log-panel-ux/media/composite-post.md
4
```

```markdown
![Rich card timeline view](/assets/images/future-debrief/176-log-panel-ux/component-light.png)
![All six tool-category icons in a single view](/assets/images/future-debrief/176-log-panel-ux/all-categories.png)
![Snapshot entry, empty params, deleted track, multi-track wrap](/assets/images/future-debrief/176-log-panel-ux/edge-cases.png)
![Disabled card at reduced opacity with the Disabled badge](/assets/images/future-debrief/176-log-panel-ux/disabled-state.png)
```

The recovered `component-light.png` is the one the twin-heading splice used to eat.

## By the Numbers

| | |
|---|---|
| Tests passing | 111 (54 baseline + 57 new) |
| Coverage on revived script | 79% |
| Archive regeneration wall-time | 0.9s across 157 specs |
| Recovered screenshots | 34 (Defect A 33 + Defect B 1) |
| Source-relative path leaks | 0 across 56 unified + 3 rollup + 15 composite posts |
| Malformed references surfaced | 5 (Jekyll Liquid templates in 216-storyboarding-capture) |

## Lessons Learned

The "one-shot generator" pattern from #228 survived its first revive cycle intact. Resurrecting the script from `19406178`, patching three stitcher paths, and deleting it again in the final commit cost less friction than keeping it in-tree would have. The reviewable artefact is the prose diff across `specs/*/media/*.md`; the Python is scaffolding that nets to zero after merge. Knowing we can do this again lowers the bar for the next archive fixup.

Ship-level audit beats unit-test coverage alone. The original #228 suite was 54 tests at 77% coverage — all green at merge. The defect only surfaced when I diff'd the real archive output against the real source shipped-posts the next day. The 57 new tests in this pass codify that audit, but the lesson is that the audit itself — not the coverage number — is what caught it.

A pre-existing macOS test-isolation bug surfaced during polish. `platformdirs` ignores `XDG_CONFIG_HOME` on macOS, so `services/config` tests were writing into the real user config on every `uv run pytest`. Two lines in `conftest.py` to monkeypatch `user_config_path` unblocked local `task verify` and reset the real config. Worth flagging because it was invisible in CI (Ubuntu respects XDG) and had been silently polluting local runs for an unknown number of sessions.

The malformed-references surface (FR-013) turned out to be load-bearing. The five Jekyll Liquid paths in `216-storyboarding-capture/shipped-post.md` (`{{ site.baseurl }}/...`) don't parse as CommonMark image syntax, so a silent-drop implementation would lose them without a trace. Surfaced in `ARCHIVE-REBUILD.md` they're explicitly "maintainer, fix these upstream" — which is the right disposition for author-side templating the generator shouldn't second-guess.

## What's Next

- The website maintainer's Jekyll publish step must copy `specs/*/evidence/` screenshots into `/assets/images/future-debrief/<slug>/` paths. The runbook has been updated, but the first publish will reveal any gaps.
- Orphan screenshots surfaced in `ARCHIVE-REBUILD.md` give the maintainer room to hand-embed visually-rich specs (085, 118, 142) into their generated posts at editorial discretion.
- If the archive is ever re-run against a drifted repo, the E2E test's reproducibility sub-assertion catches any non-deterministic sort or FS-order leak at 3-spec scale in under 10 seconds.
