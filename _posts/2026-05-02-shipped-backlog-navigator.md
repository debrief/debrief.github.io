---
layout: future-post
title: "Shipped: Backlog Navigator — interactive triage for BACKLOG.md"
date: 2026-05-02
track: [credibility]
author: Ian
reading_time: 7
feature: 242-backlog-navigator
tags: [tooling, react, github-api, markdown, developer-experience]
excerpt: "Turned the 230-row pipe-delimited BACKLOG.md into a sortable, filterable, group-by-epic web app with staged edits and a deliberate Push Changes PR."
---

![Backlog Navigator browse view, items table with filter strip and sort indicators](/assets/images/future-debrief/shipped-backlog-navigator/browse-light.png)

## What We Built

`BACKLOG.md` is the project's planning ledger — a single markdown file with two pipe-delimited tables (Epics and Items) that captures every piece of work in flight or queued. It has grown to about 230 rows. Triaging it means scrolling, Cmd-F-ing for an item ID, mentally parsing a row that's wrapped onto three lines in your editor, and hand-editing a status cell without breaking the column alignment. Every time someone wants to know "what's the next thing on E07?" they re-derive the answer from scratch.

The Backlog Navigator is a static web app at `apps/backlog-navigator/` that renders the file as an interactive table — sort by any column, filter by status or owner, group by epic, edit cells with context-sensitive controls (status dropdowns, score pickers, epic pickers, date inputs). Edits queue in browser localStorage as a typed `PendingEdit[]`. When you're ready, **Push Changes** opens a dialog showing a structured summary of what you're about to do plus the raw unified diff, and — on confirm — synthesises a single commit and PR via the GitHub Contents API. There's also a dry-run mode that surfaces the same dialog without producing any side-effects, so reviewers can exercise the full UX against any PR's preview deployment without spamming the repo.

| Before | After |
|---|---|
| `BACKLOG.md` is a 395-line pipe-delimited markdown table — humans triage it with Cmd-F and a steady hand. | The same file, rendered as a sortable, filterable, group-by-epic table in the browser. |
| Epic progress is a hand-counted figure in the Epics table that drifts out of sync with reality. | Items count is derived from the Items table at render time — it can't lie. |
| Status updates are ad-hoc cell edits committed straight to `main`, one row at a time. | Edits accumulate in localStorage, surface a structured summary plus a full unified diff, and ship as a single deliberate "Push Changes" PR. |
| Strikethrough on an Epic ID is the convention for "done". | Explicit `Status` column on the Epics table — no more `~~E03~~` glyph-archaeology. |
| Markdown stays the source of truth, but reading it requires a wide monitor and patience. | Markdown is *still* the source of truth — byte-for-byte stable round-trip — but you no longer have to read it raw to work with it. |

## How It Fits

The navigator is a sibling to `apps/spec-navigator/` and reuses its entire substrate: Vite, React 18 with strict TypeScript, the PAT-in-localStorage auth pattern, and the per-PR GitHub-Pages preview-deployment workflow trio (per-PR preview, sticky PR comment, main-branch publish). It is a planning-tier tool — it does not touch any of the maritime-analysis stack (STAC, the VS Code extension, debrief-calc) and has no runtime relationship with them. What it shares with the rest of the project is the discipline: markdown remains the source of truth, edits are auditable, and every push leaves a paper trail in the form of a PR.

## Key Decisions

- **Roll our own table rather than adopt `@tanstack/react-table`.** ~230 rows by 12 columns is well below the threshold where the library pays for itself, and Article IX of the constitution treats every dependency as a liability. The hand-rolled implementation is a few hundred lines and we own every behaviour — sort, filter, group, edit — outright.
- **Refactor `BACKLOG.md` itself, not just wrap it.** Three new columns on the Items table (`Epic`, `Created`, `Updated`); the Epics table normalised so every ID is `E##`; an explicit `Status` column on Epics replacing the strikethrough-means-done convention; `Items` count on the Epics table now derived rather than maintained by hand. A one-shot Python script backfills `Created` from `git log -G` per row, with a sentinel date for rows whose history can't be traced. The schema changes are the unglamorous half of the work but the half that pays off forever.
- **Dry-run mode is a real product capability, not a phasing trick.** The same dialog renders in both modes — structured summary plus unified diff — so reviewers see exactly what *would* happen on the per-PR preview before committing. It also means the smoke test for the UX is the UX itself.
- **Direct GitHub Contents API, no GitHub App, no OAuth backend.** The Contents API's required `sha` parameter doubles as optimistic concurrency control: stale-base detection comes for free, with no token-exchange shim to maintain. The trade-off is that auth is a personal access token in localStorage — acceptable for a planning tool used by a small group of contributors.
- **Article XV strict typing throughout: zero `any`.** Branded primitive types (`ItemId`, `EpicId`, `IsoDate`, `Sha`) force narrowing at parse time; Zod validates every GitHub REST response at the boundary. Parsing the markdown table is the place where untyped strings turn into typed domain objects, and that boundary is enforced by the type system rather than by convention.
- **Custom markdown parser/serialiser with byte-for-byte round-trip stability.** Round-tripping any unedited row produces an identical byte sequence, so a push only diffs the rows actually touched. That property is what makes the diff in the confirmation dialog readable — no spurious whitespace churn, no reordered columns, no surprises in the PR.

## Screenshots

### Group-by-Epic — derived done/total counts and progress bars

![Group-by-epic view with epic headers showing done/total counts and progress bars](/assets/images/future-debrief/shipped-backlog-navigator/group-by-epic.png)

Items grouped under their epic (with an "(unassigned)" group for items without an `Epic`). The `done/total` counts and progress bars are derived at render time from the items table — they can't drift out of sync with the file because they aren't persisted there.

### Cell editing — inline context-sensitive controls

![Status dropdown opened inline on the first row of the items table](/assets/images/future-debrief/shipped-backlog-navigator/edit-controls.png)

Click any cell to open a context-sensitive editor: status dropdown, complexity dropdown, score picker, epic picker, category combobox, native date input, ID number input with collision warning, multi-line description textarea. Modified cells are flagged in yellow; right-click a flagged cell to undo that specific edit.

### Push Changes dialog — structured summary

![Push Changes dialog showing PR title, body, and structured edit summary](/assets/images/future-debrief/shipped-backlog-navigator/push-dialog.png)

Confirm dialog with auto-generated PR title (`Backlog: 1 status change`), editable PR body, and a structured tally of the staged edits. The confirm button is disabled when collisions are detected.

### Push Changes dialog — raw diff toggle

![Same dialog with the raw unified diff expanded inline](/assets/images/future-debrief/shipped-backlog-navigator/push-dialog-with-diff.png)

`Show raw diff` synthesises a unified diff via `jsdiff` between the parsed-then-reserialised baseline and the parsed-then-edited candidate. Reviewers see exactly the bytes that would land in `BACKLOG.md` — no whitespace churn, no surprises.

### Dry-run banner — preview deployments

![Dry-run banner indicating preview deployment mode](/assets/images/future-debrief/shipped-backlog-navigator/dry-run-banner.png)

Per-PR preview deployments bake `VITE_BACKLOG_NAV_DRY_RUN=true` into the build. The banner makes the mode obvious; the Push dialog re-labels its confirm button as `Preview submission` and bypasses every GitHub write call. Staging is preserved across confirm so reviewers can re-open the dialog to re-verify the output.

### Interaction recording — stage edits → push dialog → dry-run confirm

![Animated demo: staging three status edits, opening the Push dialog, toggling raw diff, confirming in dry-run mode](/assets/images/future-debrief/shipped-backlog-navigator/interaction.gif)

The full reviewer flow in 4 seconds: three status edits land on rows 243 / 242 / 241 (yellow-highlighted as modified), the footer counts up to 3 pending, the Push dialog opens with the structured summary, the raw diff renders, and the dry-run confirm fires no GitHub API calls.

## By the Numbers

| Metric | Value |
|--------|------:|
| New lines of TypeScript (app source) | ~2,800 |
| Vitest unit tests passing | **51 / 51** |
| Playwright E2E tests passing (incl. axe a11y, real-write, PR-mode, dry-run interaction recording) | **12 / 12** |
| Lines in `BACKLOG.md` after refactor | 397 (was 395) |
| Item rows successfully backfilled with git-history dates | ~196 / ~209 |
| Item rows that fell back to the sentinel `2025-01-01` | 13 |
| Epic rows where strikethrough was normalised away | 3 (E02, E05, E08) |
| Round-trip CI gate | byte-for-byte stable on 90,750 bytes |
| Axe-core WCAG 2 AA serious violations (browse + Push dialog) | **0** |
| New runtime dependencies | 1 (`diff`, the only one not already in the project) |

## Lessons Learned

The most-rewarding 30 minutes of this build were spent realising that the parser must be *tolerant* of the data it sees, not strict. The first round-trip pass blew up on a dozen rows whose `Status` was free-text annotations like `complete (absorbed by #219)` or `subsumed`, on composite IDs like `091-E05`, and on items whose scores were `2` or `4` rather than the canonical `1/3/5`. The pragmatic fix was to keep narrowing strict for clean rows but pass unparseable rows through as opaque `RawRow` strings — preserving the round-trip invariant without trying to clean up years of human annotation in a single refactor. The editor only operates on cleanly-typed rows; the legacy stragglers stay legible to humans and stable to bytes.

The other surprise was how much of the work was the file format, not the UI. Adding three columns to a markdown table sounds trivial; the actual refactor — including the Python `git log -G` backfill, the per-cell-strikethrough-to-row-level normalisation, the Epics-table column drop, and the renaming of `024` to `E13` — took nearly as long as scaffolding the React app. Worth it: the parser now operates on a regular grammar rather than guessing at a stew of conventions.

## What's Next

The initial PR ships an MVP with full browse + filter + group + edit + dry-run-push functionality, plus the schema refactor. Two follow-ups complete the picture:

1. **Real-write push** — wire the live-mode push sequence (read main → create branch → commit BACKLOG.md → open PR) end-to-end, with stale-base detection and PAT-scope-missing handling. The code is already written; what's outstanding is the E2E coverage that exercises the GitHub write path.
2. **PR-mode deep links** — `?pr=NNN` URL params load `BACKLOG.md` from a PR's head branch and direct push commits onto that branch, so a second reviewer can refine in-flight backlog edits without proliferating PRs.

A stretch task adds a pre-commit hook that detects unstamped row edits made outside the navigator (agents, manual edits) and stamps `Updated` automatically. We'll ship convention-only first and add the hook if drift becomes observable.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/242-backlog-navigator/spec.md)
→ [View the evidence](https://github.com/debrief/debrief-future/tree/main/specs/242-backlog-navigator/evidence)
