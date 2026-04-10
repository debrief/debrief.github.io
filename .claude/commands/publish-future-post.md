# Publish a Future Debrief blog post

Create a blog post in `_posts/` for a feature shipped (or planned) in the
[debrief-future](https://github.com/debrief/debrief-future) sister repo.

## Input

The user will typically provide a **spec folder URL** from debrief-future.
This will usually be on a **development branch** (not `main`), because the
command is triggered right after `/speckit.implement` completes:

```
https://github.com/debrief/debrief-future/tree/<branch>/specs/<NNN>-<slug>
```

For example:
```
https://github.com/debrief/debrief-future/tree/179-sensor-aware-layers-rendering/specs/179-sensor-aware-layers-rendering
```

The branch name is often the spec number and slug (e.g.
`179-sensor-aware-layers-rendering`) or a Claude-generated name (e.g.
`claude/speckit-specify-005-zJrC6`). Either works — extract the branch
and path from the URL.

This folder contains the richest source material:
- `spec.md` — the full specification (requirements, design, contracts)
- `media/` — screenshots, diagrams, screen recordings
- `evidence/` — test summaries, CI output, sample data

Other accepted inputs: a PR URL/number, a feature description, or a commit
range. Use whatever is available to understand what was built and why.

### Parsing the URL

Extract two values from the input URL:
- **`branch`** — the ref between `/tree/` and the path (e.g.
  `179-sensor-aware-layers-rendering`, `claude/speckit-specify-005-zJrC6`,
  or `main`)
- **`spec_path`** — the path after the branch (e.g.
  `specs/179-sensor-aware-layers-rendering`)

Use `branch` as the `ref` parameter when calling GitHub MCP tools, so
content is fetched from the development branch, not `main`.

### Fetching source material

Use the GitHub MCP tools to read the spec contents before drafting:

1. **Spec folder URL** — use `mcp__github__get_file_contents` with
   `path: "<spec_path>/spec.md"` and `ref: "<branch>"`.
2. **Media sub-folder** — use `mcp__github__get_file_contents` with
   `path: "<spec_path>/media"` and `ref: "<branch>"` to list available
   images. Copy them into this repo (see "Handling images" below).
3. **Evidence sub-folder** — check `<spec_path>/evidence` on the same
   branch for test summaries or sample output.
4. **PR URL** — use `mcp__github__pull_request_read` to get the description,
   diff stats, and review comments.

## Handling images

Screenshots and diagrams live in the spec's `media/` sub-folder in
debrief-future. They must be **copied into this repo** so the Jekyll site
can serve them — GitHub-hosted URLs from the sister repo won't render on
the published site.

### Step-by-step

1. **List the media folder** — use `mcp__github__get_file_contents` with
   `path: "<spec_path>/media"` and `ref: "<branch>"` to discover available
   images.

2. **Download each image** — use `mcp__github__get_file_contents` with
   `ref: "<branch>"` for each file. For binary files (PNG, JPG) the content
   will be base64-encoded.

3. **Write to this repo** — save images to:
   ```
   assets/images/future-debrief/<post-slug>/<filename>
   ```
   The `<post-slug>` matches the post filename without the date prefix
   (e.g. `shipped-sensor-aware-track-rendering`).

4. **Reference in markdown** — use site-relative paths:
   ```markdown
   ![Alt text describing what the screenshot shows](/assets/images/future-debrief/<post-slug>/<filename>)
   ```

5. **Write descriptive alt text** — describe what the screenshot shows for
   accessibility. Don't use the filename as alt text.

### Existing examples

| Post slug | Image path |
|-----------|-----------|
| `shipped-loader-mini-app` | `/assets/images/future-debrief/shipped-loader-mini-app/03-store-selector-multiple.png` |
| `shipped-point-rectangle-drawing` | `/assets/images/future-debrief/shipped-point-rectangle-drawing/storybook-screenshot-point.png` |
| `shipped-e2e-tests-sandboxed` | `/assets/images/future-debrief/shipped-e2e-tests-sandboxed/01-workbench-loaded.png` |

If the spec has **no `media/` folder** or it is empty, skip this section
entirely — not every post needs screenshots.

## Output

A markdown file committed to `_posts/` (plus any images in
`assets/images/future-debrief/`) following the conventions below.

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
- **Links**: End with arrow-prefixed links to the spec and evidence on
  GitHub. Use the **development branch** from the input URL (the content
  may not be on `main` yet):
  ```
  → [See the spec](https://github.com/debrief/debrief-future/tree/<branch>/specs/<NNN>-<slug>/spec.md)
  → [View the evidence](https://github.com/debrief/debrief-future/tree/<branch>/specs/<NNN>-<slug>/evidence)
  ```
  These links will continue to work after the branch merges to `main`
  because GitHub redirects merged branch URLs.
- **No emojis** in front matter or body text.

## Checklist before committing

1. File name matches `_posts/YYYY-MM-DD-(shipped|planning)-<slug>.md`.
2. Front matter validates: `layout: future-post`, `track` is an array,
   `tags` is an array, `excerpt` is plain text.
3. Title starts with `Shipped:` or `Planning:`.
4. Body uses `##` headings (not `#`).
5. No trailing whitespace or blank lines at end of file.
6. Slug doesn't duplicate an existing post filename.
7. All images are saved to `assets/images/future-debrief/<post-slug>/`
   (not left as GitHub URLs pointing at debrief-future).
8. Image markdown uses site-relative paths (`/assets/images/...`), not
   absolute GitHub URLs.
