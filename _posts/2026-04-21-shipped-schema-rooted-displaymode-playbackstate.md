---
layout: future-post
title: "Shipped: One vocabulary, 8 translators retired, 2 `as never` casts deleted"
date: 2026-04-21
track: [momentum]
author: Ian
reading_time: 5
tags: [tracer-bullet, schemas, linkml, type-safety, tech-debt, reliability, shipped]
excerpt: "Two enum-style types were defined twice in TS with drifted values: `'full'|'trail'` vs `'normal'|'snailTrail'` and `'playing'|'paused'` vs `'stopped'|'playing'|'paused'`. Both are gone. One schema-rooted vocabulary end to end. 622 session-state tests green. One new ADR, one new dated cross-reference convention, two new lint-time guards."
---

## What Shipped

`DisplayMode` and `PlaybackState` are now single-source-of-truth enums, generated from LinkML into Pydantic, TypeScript, and JSON Schema in a single pass. The four hand-typed copies are gone. The eight translator ternaries that bridged the drifted vocabularies at the host↔webview and session-state↔component boundaries are gone. The `toComponentMode` / `toStoreMode` helpers in the web shell — plus the "diverged historically" comment above them — are gone.

One silent-narrowing translator, at `apps/vscode/src/views/timeRangeView.ts:241`, was quietly collapsing any inbound `'stopped'` into `'paused'` in the session-state store. It's gone. The session-state store now receives exactly the canonical value the sender sent, and the load boundary (`services/session-state/src/persistence/load.ts`) rejects anything that isn't a member of the generated enum.

The two `as never` bypass casts at `load.ts:117` and `:123` are gone. They were hidden runtime escape hatches — the first silently swallowing an untyped `TimeStep` payload, the second silently accepting any `displayMode` string including legacy `'normal'` / `'snailTrail'`. Both are now typed setter calls, with enum-membership validation in front of them.

## The Grep That Matters

**Before:**

```
$ rg -nE "^(export\s+)?type\s+(DisplayMode|PlaybackState)\b" apps/ shared/ services/ --include='*.ts'
shared/components/src/utils/types.ts:80:export type DisplayMode = 'full' | 'trail';
shared/components/src/TimeController/types.ts:17:export type PlaybackState = 'playing' | 'paused';
services/session-state/src/types/temporal.ts:105:export type PlaybackState = 'stopped' | 'playing' | 'paused';
services/session-state/src/types/temporal.ts:110:export type DisplayMode = 'normal' | 'snailTrail';

$ rg -nE "=== 'snailTrail'|=== 'trail' \? 'snailTrail'" apps/ shared/ --include='*.ts' --include='*.tsx' | wc -l
10

$ rg -nE 'as never' services/session-state/src/persistence/load.ts
117:    store.getState().setStepSize(temporal.stepSize as never);
123:    store.getState().setDisplayMode(temporal.displayMode as never);
```

**After:**

```
$ rg -nE "^(export\s+)?type\s+(DisplayMode|PlaybackState)\b" apps/ shared/ services/ --include='*.ts' | rg -v shared/schemas/src/generated
(empty)

$ rg -nE "=== 'snailTrail'|=== 'trail' \? 'snailTrail'" apps/ shared/ --include='*.ts' --include='*.tsx'
(empty)

$ rg -nE 'as never' services/session-state/src/persistence/load.ts
180:    // the previous `as never` was an inherited bypass. The Zustand setter
(only a comment — no remaining cast)
```

Four hand-typed types, eight translators, two `as never` casts — all deleted. And it stays deleted: two new bash guards (`scripts/check-no-hand-typed-temporal-enums.sh`, `scripts/check-adr-refs.sh`) are wired into `task lint`, and will fail CI the next time someone reaches for a hand-typed shortcut or writes a dangling `See ADR-NN` reference.

## The Rendering Rule: `stopped ≡ paused`

`PlaybackStateEnum` carries three values — `stopped`, `playing`, `paused` — but the component layer had historically only known two. Widening the component-side type to the full three-state vocabulary would break every existing `if (playbackState === 'playing')` branch that was written assuming binary.

Rather than spray conditionals, we documented a rule: **`stopped` renders identically to `paused`** in every component consumer. Same play glyph (VS Code `debug-start` icon), same `aria-label="Play"`, same enabled button, same "no animation tick" treatment in `useTimePlayback`. A new 3-case unit test — `PlaybackControls.test.tsx` — pins this with `it.each` over `stopped` and `paused` sharing their assertion set; `playing` gets its own case with the pause glyph.

A new Storybook story (`TimeController.stories.tsx` → `PlaybackStateStoppedEquivPaused`) renders the three states side-by-side. If stopped ever visually diverges from paused, it'll be the first thing a reviewer notices.

## The ADR That Documents Both

`docs/project_notes/decisions.md` gained a new entry: **ADR-022**. It names the four deleted hand-typed declarations, records the canonical vocabularies with rationale (why `full|trail` over `normal|snailTrail`: the UI buttons already say "Full" and "Trail"), documents the stopped ≡ paused rule with specific UI-element detail (glyph, aria-label, button-enabled, animation-tick), and enumerates the four strengthened constitutional articles.

As a bonus, ADR-022 adopts a new cross-reference convention: LinkML descriptions that cite an ADR use the form `See ADR-022 in docs/project_notes/decisions.md`. A new lint-time guard (`check-adr-refs.sh`) extracts every `ADR-NNN` reference from the schema YAMLs and fails if any doesn't resolve to a matching `### ADR-NNN:` heading in `decisions.md`. Schema ↔ ADR links are no longer discoverable-only; they are a linted contract.

## By The Numbers

- **4** hand-typed type declarations deleted.
- **8** translator ternaries and helper functions deleted.
- **5** IPC message shapes retyped to schema-rooted `DisplayMode` / `PlaybackState`.
- **4** callback / method-signature declarations widened.
- **1** silent value-changing translator deleted.
- **2** `as never` casts replaced with typed setter calls.
- **1** LinkML enum rename (`normal|snailTrail` → `full|trail`).
- **1** generator post-processor rule added (template-literal narrowing for `TemporalSlice.playbackState` / `.displayMode`).
- **3** new tests (load-boundary validation ×4, stopped≡paused ×3, regen-idempotency ×1).
- **2** new lint-time guard scripts wired into `task lint`.
- **1** new ADR (ADR-022) with a new schema↔ADR cross-reference convention.
- **622** session-state tests passing. **1685** component tests passing. **749** schema-adherence tests passing. **Zero** feature-attributable failures.
- **1** atomic PR.

## The Third In The Run

Backlog items #203 (spatial types), #204 (`RawGeoJSONFeature`), and #205 (`DisplayMode` + `PlaybackState`) are a coordinated audit programme for schema-rooted types that had drifted into TypeScript. Each was a single atomic PR with the same deletion-is-net-positive shape: retire hand-typed copies, delete translators, add a drift-prevention guard. Each finishes with the codebase strictly smaller and strictly more honest about where truth lives. With #205 shipped, the programme closes the two bigger drift-vector classes (geometry types and temporal-enum types); backlog #206 (`[E11] Audit non-LinkML type declarations`) picks up the broader inventory from here.

One vocabulary per concept. One source of truth. One direction across the IPC boundary.
