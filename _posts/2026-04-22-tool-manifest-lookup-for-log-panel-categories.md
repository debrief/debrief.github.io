---
layout: future-post
title: "Building Tool Manifest Lookup for Log Panel Categories"
date: 2026-04-22
track: credibility
author: Ian
reading_time: 5
tags: [tracer-bullet, log-panel, tool-manifest, schema, contrib]
excerpt: "Retiring the hand-maintained tool-category map — new tools now declare their Log Panel icon at the registration site."
---

## What We Built

The coloured icons in Debrief's Log Panel exist so an analyst can tell at a glance whether each step was an import, a styling change, a calculation, a filter, or a snapshot. Until this week those icons were driven by a hand-maintained lookup in `shared/components/src/LogPanel/toolCategories.ts` — sixteen entries that every new tool had to be added to, or the icon rendered neutral grey. The signal decayed silently whenever anyone forgot.

That file is gone. Every tool now declares its Log Panel category at the point where it is registered. A Python tool writes `category=ToolCategoryEnum.calc` in its `@tool` decorator; a TypeScript tool writes `'debrief:uiCategory': 'style'` in its annotations block. The value rides out on the MCP `tools/list` response, the VS Code extension caches it, the webview receives a `tools:manifest` message, and the Log Panel looks it up at render time. No new service, no new endpoint, and nothing under `shared/components/` that ever needs editing when a tool is added.

The vocabulary itself lives in LinkML as a new `ToolCategoryEnum` with five canonical values — `import`, `style`, `calc`, `filter`, `snapshot`. Pydantic, JSON Schema and TypeScript regenerate from it, so typos are caught at Pydantic validation time on the Python side and at `pnpm typecheck` time on the TypeScript side. A first-party coverage test walks the registry and fails if any shipped tool forgets to declare.

## By the Numbers

| | |
|---|---|
| New tests | 64 across 7 files |
| Total tests passing | 3434 |
| Tests failed | 0 |
| First-party tools migrated | 22 (13 Python, 9 TypeScript) |
| Canonical category values | 5 (drift-guarded) |
| Hand-maintained mappings remaining | 0 |

## Lessons Learned

**LinkML plus `use_enum_values=True` is a happy marriage.** One edit to the schema gives us three layers of defence: a Python `StrEnum` that rejects typos at `Tool.model_validate`, a JSON Schema that validates cross-language, and a TypeScript literal union that catches errors at compile time. Three layers from one source-of-truth edit is a ratio I'd take every time.

**The TypeScript `enum` versus string-literal-union gap is real.** The auto-generated `ToolCategoryEnum` is a TS string-enum, which under `strict: true` isn't mutually assignable with `'style'`. Asking every tool author to write `ToolCategoryEnum.style` felt wrong for a registration annotation that reads like data. We introduced a `ToolUICategory` string-literal union in `shared/utils/src/mcp-types.ts` with a compile-time cross-check that fails if it ever drifts from the generated enum. Ergonomics preserved, safety preserved, one tiny piece of glue.

**Two-commit migrations earn their keep.** Commit A landed the plumbing additively with the old shim still in place — a safety checkpoint where every existing tool still rendered correctly via the old path. Commit B retired the shim after migrating each tool. If a reviewer had spotted a regression after Commit A we could have shipped the plumbing alone and deferred the rest without disturbing anyone.

**Boundary coercion pays off even on a fully typed pipeline.** Pydantic and the TypeScript typecheck catch first-party mistakes, but a contrib package loaded at runtime can still feed a bad value. The `mcpAdapter.parseToolUICategory` helper turns that into a grey icon and a one-shot `console.warn` rather than a broken panel. It's not a hot path — it runs once per tool on cache refresh — but it's the difference between graceful degradation and a crash.

## What's Next

Two loose ends. First, `delete-features` currently maps to `style`, preserved from the interim shim to keep visible behaviour unchanged. That's semantically odd and a sixth `destructive` bucket feels like a reasonable follow-up — a separate conversation for a separate ticket. Second, the first-party coverage tests run inside the standard pytest and vitest suites today; I'd like to wire them into `task verify` as a named step once the CI config supports it, so misdeclarations fail with a dedicated message rather than as an implicit test failure.

## Decisions I'm Still Chewing On

Two that went a particular way but could have gone the other.

Whether `debrief:category` (the hierarchical path used by tool-match) and `debrief:uiCategory` (the visual bucket used by the Log Panel) should coexist or merge. I went additive — the two serve different consumers and conflating them felt like a future regret — but the annotation payload gets a bit heavier. If anyone sees a path to a single field that serves both well, I'm listening.

Whether the boundary coercion warning should be louder than a `console.warn`. A toast in the VS Code extension would make contrib misdeclarations harder to ignore, but first-party violations are caught much earlier in CI, so the warning only fires for third-party packages running in a developer's own session. Console felt proportionate; I could be persuaded otherwise.

The retired shim is at [commit 5ea7ad28](https://github.com/debrief/debrief-future/commits/207-tool-manifest-categories) and the migration is documented in `specs/207-tool-manifest-categories/`.
