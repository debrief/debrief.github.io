# Publish a Future Debrief blog post

Create a blog post in `_posts/` for a feature shipped (or planned) in the
[debrief-future](https://github.com/debrief/debrief-future) sister repo.

## Input

The user will typically provide a **spec folder URL** from debrief-future:

```
https://github.com/debrief/debrief-future/tree/main/specs/<NNN>-<slug>
```

This folder contains the richest source material:
- `spec.md` — the full specification (requirements, design, contracts)
- `media/` — screenshots, diagrams, screen recordings
- `evidence/` — test summaries, CI output, sample data

Other accepted inputs: a PR URL/number, a feature description, or a commit
range. Use whatever is available to understand what was built and why.

### Fetching source material

Use the GitHub MCP tools to read the spec contents before drafting:

1. **Spec folder URL** — use `mcp__github__get_file_contents` to read
   `spec.md` from the path (e.g. `specs/179-sensor-aware-layers-rendering/spec.md`).
2. **Media sub-folder** — check for `media/` in the same spec folder. If
   screenshots exist, copy them to
   `assets/images/future-debrief/<post-slug>/` and reference them in the post.
3. **Evidence sub-folder** — check `evidence/` for test summaries or sample
   output to quote in the "Evidence" or "Test Coverage" section.
4. **PR URL** — use `mcp__github__pull_request_read` to get the description,
   diff stats, and review comments.

## Output

A single markdown file committed to `_posts/` following the conventions below.

---

## File naming

```
_posts/YYYY-MM-DD-<prefix>-<slug>.md
```

- **Date**: use today's date unless the user specifies otherwise.
- **Prefix**: `shipped-` for completed work, `planning-` for upcoming work.
- **Slug**: lowercase, hyphen-separated, concise (3-6 words). Drop filler
  words like "the", "a", "for". Match existing slugs in `_posts/` for
  consistency.

## Front matter

```yaml
---
layout: future-post
title: "<Prefix>: <Human-Readable Title>"
date: YYYY-MM-DD
track: [<track>]
author: Ian
reading_time: <estimated minutes>
tags: [<tag1>, <tag2>, ...]
excerpt: "<One sentence, under 160 characters.>"
---
```

### Field rules

| Field          | Rule |
|----------------|------|
| `layout`       | Always `future-post`. |
| `title`        | Start with `Shipped:` or `Planning:`. Use sentence case after the prefix. Keep under 80 chars. |
| `date`         | `YYYY-MM-DD` (no time/offset unless the user requests one). |
| `track`        | Array. Pick from: `momentum` (progress/planning), `credibility` (shipped features proving the architecture works), `ambition` (new capabilities beyond legacy Debrief). Most shipped posts are `[credibility]`. |
| `author`       | Default `Ian` unless told otherwise. |
| `reading_time` | Estimate from word count: ~250 words/min, round up. |
| `tags`         | 3-6 lowercase tags. Reuse existing tags where possible (common ones: `tracer-bullet`, `stac`, `schemas`, `vscode-extension`, `discovery-ui`, `developer-experience`, `testing`, `geojson`, `python`). |
| `excerpt`      | One plain-text sentence. No markdown, no quotes. Under 160 chars. |

## Body structure

Follow the pattern established in existing posts. Adapt headings to what
fits — not every section applies to every post.

### For "Shipped" posts

```markdown
## What We Built

<What changed, in analyst-facing terms. What could they not do before?
What can they do now? 1-3 paragraphs.>

## How It Works

<Architecture, key abstractions, data flow. Code snippets or diagrams
if they clarify. Name actual files/modules so readers can find the code.>

## <Optional: Screenshots, Evidence, Key Decisions, What Held Up>

<Include if relevant. Screenshots go in
/assets/images/future-debrief/<post-slug>/. Evidence = test counts,
coverage, CI status.>

## What's Next

<1-2 sentences on what this unblocks or what comes next.>
```

### For "Planning" posts

```markdown
## What We're Building

<The problem and proposed solution. Why now?>

## How It Fits

<Where this sits in the architecture. What it depends on, what depends
on it.>

## Key Decisions

<Bulleted list of design choices already made.>

## What We'd Love Feedback On

<Open questions for the community.>
```

## Style guide

- **Voice**: First-person plural ("We built", "We learned"). Direct, factual,
  no hype.
- **Technical depth**: Write for developers who haven't seen the code. Name
  files and modules. Show small code/config snippets when they clarify.
- **Length**: 300-800 words for the body. Enough to be useful, short enough
  to read in the stated `reading_time`.
- **Links**: End with arrow-prefixed links to the spec and evidence on GitHub:
  ```
  → [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/<NNN>-<slug>/spec.md)
  → [View the evidence](https://github.com/debrief/debrief-future/tree/main/specs/<NNN>-<slug>/evidence)
  ```
- **No emojis** in front matter or body text.

## Checklist before committing

1. File name matches `_posts/YYYY-MM-DD-(shipped|planning)-<slug>.md`.
2. Front matter validates: `layout: future-post`, `track` is an array,
   `tags` is an array, `excerpt` is plain text.
3. Title starts with `Shipped:` or `Planning:`.
4. Body uses `##` headings (not `#`).
5. No trailing whitespace or blank lines at end of file.
6. Slug doesn't duplicate an existing post filename.
