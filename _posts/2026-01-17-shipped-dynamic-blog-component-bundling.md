---
layout: future-post
title: "Shipped: Dynamic Blog Component Bundling"
date: 2026-01-17
track: [shipped]
author: Ian
reading_time: 5
tags: [tracer-bullet, speckit, blog-components, storybook, shipped]
excerpt: "Interactive component demos now flow automatically from Storybook to blog posts — the speckit workflow handles bundling and deployment."
---

## What We Shipped

Blog posts can now include live, interactive component demos. When a feature includes visual components with Storybook stories, the speckit workflow automatically identifies them during planning, bundles them during implementation, and deploys them alongside the blog post during publishing.

No screenshots. No embedded videos. Readers can interact with actual React components rendered inline in the post.

## The Workflow Changes

We modified five markdown files that define the speckit command workflow:

### Plan Template

The plan template (`plan-template.md`) now includes a "Media Components" section after Project Structure. This table captures which Storybook stories should be bundled:

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| TimelineScrubber | `src/components/Timeline/Timeline.stories.tsx` | `timeline-scrubber.js` | Interactive playback demo |

The section includes checklists for **inclusion criteria** (new visual component, significant change, narrative value) and **bundleability verification** (story exists, renders standalone, reasonable size).

### Planning Command

`/speckit.plan` gained a new **Phase 1.5: Media Components Assessment**. After design artifacts are created, the planning agent:

1. Scans for Storybook stories related to the feature
2. Applies inclusion criteria to filter candidates
3. Verifies bundleability (standalone rendering, size limits)
4. Populates the Media Components section
5. Gets author confirmation before proceeding

This happens automatically — features without visual components skip the section entirely.

### Implementation Command

`/speckit.implement` now includes a **media component bundling step** in Phase 4 (Polish). For each component in the Media Components table:

- Create an esbuild entry point that imports the story
- Build a self-contained IIFE bundle (React included, CSS inlined, minified)
- Store at `FEATURE_DIR/media/components/`
- Verify the bundle is self-contained and under 500KB

### PR Command

`/speckit.pr` checks for component bundles before invoking the publish skill. If `media/components/` exists, it passes the path via `--components` argument:

```bash
if [ -d "$FEATURE_DIR/media/components/" ]; then
    COMPONENTS_ARG="--components $FEATURE_DIR/media/components/"
fi
```

### Publish Command

`/publish` handles the `--components` argument by:

1. Creating `assets/components/{post-slug}/` in the website repo
2. Copying all bundles to that directory
3. Rewriting paths in the blog post (`./components/foo.js` becomes `/assets/components/{slug}/foo.js`)
4. Adding component verification items to the PR checklist

## How It Works in Practice

When writing a shipped post for a feature with a new timeline component:

```html
Try the timeline scrubbing below:

<div id="timeline-demo" style="height: 300px;"></div>
<script src="/assets/components/timeline-feature/timeline-demo.js"></script>

[Explore the full component with controls](https://debrief.github.io/debrief-future/storybook/?path=/story/timeline--default)
```

The bundle loads, finds the container by ID, and renders the component. Readers interact with real code — not a simulation.

## Design Decisions

**esbuild over alternatives**: We considered Vite, Rollup, and Storybook's own export. esbuild won on simplicity and speed. IIFE format ensures bundles run immediately without module loaders.

**Bundle everything**: Each bundle includes React and all dependencies. This adds size but eliminates version conflicts. A post can have multiple component demos without worrying about shared state.

**500KB soft limit**: Large enough for real components, small enough to keep posts fast. Anything larger gets flagged during implementation for author review.

**Author-controlled height**: Bundles render at 100% width but respect the container's height. Authors set height via inline CSS or custom properties.

**Required Storybook links**: Embedded demos are teasers. Full documentation lives in Storybook. Every post with embedded components must link to the permanent Storybook URL.

## Validation

Since this feature modifies workflow templates (not code), validation is manual:

- Confirmed all sections exist in modified files
- Documented before/after changes for each file
- Created example plan.md showing the Media Components section
- Traced the data flow from plan through publish

See `specs/016-dynamic-blog-components/evidence/` for validation artifacts.

## What's Next

This feature enables interactive demos but doesn't include any components to bundle — it's pure workflow tooling. The first real test comes with the next UI feature: when we ship something with Storybook stories, the workflow will automatically offer to bundle them.

Future enhancements we're considering:

- **Cache busting**: Content-hashed filenames for better caching
- **CSS isolation**: Shadow DOM or CSS modules if style conflicts emerge
- **Lazy loading**: Defer bundle loading for posts with many demos

For now, the workflow is ready. Interactive demos are one `plan.md` section away.
