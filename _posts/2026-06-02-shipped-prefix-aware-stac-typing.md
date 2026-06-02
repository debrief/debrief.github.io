---
layout: future-post
title: "Shipped: Prefix-aware STAC typing"
date: 2026-06-02
track: [credibility]
author: Ian
reading_time: 6
tags: [tracer-bullet, schemas, stac, linkml, typescript, boundary-types]
excerpt: "Schema-driven typing closes the gap between LinkML definitions and the debrief: keys our writers actually use, so a typo now fails at build time."
---

| Before | After |
|---|---|
| `const log = (props['debrief:provenance_log'] as PropertiesProvenanceEntry[]) ?? [];` | `const log = props['debrief:provenance_log'] ?? []; // typed` |
| `const props = item.properties as Record<string, unknown>;` at the write path | `const props: StacItemProperties = item.properties;` — modelled-key writes are checked |
| `asset as StacAsset & { 'debrief:toolId'?: string }` hand-cast | `asset['debrief:toolId']` typed as `string \| undefined` via `StacAsset` |
| Modelled `debrief:*` fields fell through a `[key: string]: unknown` bag — typos failed silently at runtime | A typo'd or renamed key fails the typecheck at build time, on read **and** write |
| Adding a new schema field surfaced only in generated declarations | A new `debrief:*` slot flows to the writers' typed surface automatically — no hand-edit |

## What We Built

Read a `debrief:provenance_log` off a STAC Item in either of our writer hosts and you now get the type the schema promises — not `unknown`, and not a value you've had to cast into shape and hope you spelled the key right. That was the gap; it's closed. The modelled `debrief:*` keys now arrive at the writers' real call sites as named, typed slots flowing straight from the LinkML schema, and the `as` casts that papered over the gap are gone — across three surfaces: the five item-property fields (`platforms`, `tags`, `feature_tags`, `overrides`, `provenance_log`), the three collection-summary fields on `StacSummaries`, and the two asset-level keys (`debrief:toolId`, `debrief:snapshotTimestamp`) we newly modelled onto `StacAsset`. Crucially the typing now reaches the **write** path too: both hosts used to widen the properties bag to `Record<string, unknown>` at the mutation site, so a mis-typed *write* slipped through — that widening is gone.

The payoff is the next field, not the current ten. Add a new `debrief:*` slot to the schema, regenerate, and it appears as a typed slot wherever the writers touch it — without anyone editing a writer-owned type declaration. A misspelled or renamed key stops being a silent runtime `undefined` and becomes a build failure. The kind of quiet data loss that happens when a properties bag grows but the access sites don't keep up simply can't compile any more.

## How It Fits

This finishes a promise we deliberately deferred. Spec #240 made `PropertiesProvenanceEntry` LinkML-derived and added a schema drift gate, but it stopped short of claiming new fields flow to the *writer's typed surface* — because that needed the prefix problem solved first. Spec #236 had already made the writer a single source of truth across both the VS Code and web-shell hosts. This feature lands on top of both: it routes the schema's authority all the way through to where the writers actually read and write, closing the Article II.1 (LinkML as single source of truth) audit deferral recorded against #240, and reusing #240's existing `src/generated` drift gate rather than inventing a new one.

## Key Decisions

- **Why the naive fix does nothing.** LinkML's `gen-typescript` strips the `debrief:` prefix and emits bare slot names (`provenance_log`), but the data on disk — and every one of the ~27 real call sites — uses the prefixed key (`debrief:provenance_log`). A `StacItem.properties: StacExtensionProperties` intersection, the obvious move, keys on the bare names and matches *none* of the prefixed access sites. Zero benefit. That's exactly why #240 punted it here.

- **Generator post-processor over writer refactor.** We extended the existing `shared/schemas/scripts/generate.py` post-processor with one step that rewrites generated slot keys to their on-disk prefixed form. TypeScript resolves string-literal index access to the matching named slot, so the existing literal-key call sites gain types with no rewrite. The alternative — rewriting all ~27 sites to unprefixed keys behind a serialisation adapter — has a larger blast radius and introduces a new boundary where a forgotten field can silently drop, the precise ADR-033 / Article IV.5 failure class we guard against.

- **Schema-driven from `slot_uri`, not per-class text rules.** The step reads each slot's LinkML `slot_uri` and uses it verbatim. We deliberately did *not* hard-code a "prepend `debrief:`" rule: it can't generalise across the three target classes — `StacSummaries` keys are underscore-named (`debrief_platforms` → `debrief:platforms`, a substitution), and `StacAsset` mixes Debrief slots with non-Debrief ones (`href`, `roles`) that must stay untouched. Reading `slot_uri` is the only thing that handles all three and keeps the add-a-field promise — a new slot flows through with no edit to the generator.

- **We typed the write path, not just reads.** The naive generated-type fix only reaches the read sites; both writer hosts widened the properties bag to `Record<string, unknown>` at the mutation path, leaving write-side typos silent — exactly the failure this feature exists to kill. Removing those widenings (and re-homing `debrief:toolId` / `debrief:snapshotTimestamp` onto `StacAsset`) is what makes the guarantee real end-to-end. We also found `debrief:label` is a *feature* property, not a STAC one, and left it alone rather than mistyping it.

- **Reuse the drift gate; change no bytes on disk.** The committed artefacts are already covered by #240's `src/generated` CI drift gate, so freshness is enforced without a new gate. The two new `StacAsset` slots are additive and their keys already exist on disk — the on-disk JSON is byte-for-byte unchanged, verified by a round-trip golden check.

## By the Numbers

Typing-only and behaviour-preserving — every figure below comes from the committed test run and the round-trip golden check.

| | |
|---|---|
| Total tests passing | 2204 |
| Generator transform tests | 7 |
| Type-level TypeScript tests | 5 |
| Writer unit tests (unchanged, regression guard) | 165 |
| Tests failed | 0 |
| Classes transformed | 3 (`StacExtensionProperties`, `StacSummaries`, `StacAsset`) |
| Slots now typed under prefixed keys | 10 (5 item + 3 summary + 2 asset) |
| Hand-casts removed | 3 |
| On-disk JSON bytes changed | 0 |

## Lessons Learned

The scope grew during implementation, and it grew in the right direction. The original plan targeted `StacExtensionProperties` alone — that looked like five slot renames and done. Working through the generator step revealed that `StacSummaries` had the same problem (underscore-mangled names, no match on disk) and `StacAsset` had no typed home for `debrief:toolId` and `debrief:snapshotTimestamp` at all. Folding both in was the right call: a "prepend `debrief:`" text rule would have sufficed for `StacExtensionProperties` but would have silently mishandled `StacSummaries` and trashed `StacAsset`'s non-Debrief slots. Reading `slot_uri` from the schema handled all three cleanly and made scope expansion cheap rather than risky.

The more interesting moment was what typing `debrief:provenance_log` properly uncovered. Spec #240 had generated a wide `PropertiesProvenanceEntry` (all fields from LinkML) but the consuming component had narrowed it to a local hybrid — an `as` cast was bridging the mismatch invisibly. Once the `props` bag gained a proper type, the cast was gone and pyright surfaced the divergence. The fix — an explicit typed narrowing bridge from the persistence shape to the domain shape — is the kind of thing that should have been written at #240. The types found a real latent bug, which is the point of this entire class of work.

The half-naivety trap bears repeating: if you only fix the read path, you get a false sense of safety. Both writer hosts had widened `item.properties` to `Record<string, unknown>` at the mutation site. That's where a field gets added to a schema, a developer writes `props['debrief:newField'] = value` with a typo, and nothing complains until the data shows up missing downstream. Re-typing the write path from `Record<string, unknown>` to `StacItemProperties` is the move that actually closes the loop.

## What's Next

The same schema-driven technique — read `slot_uri`, emit the on-disk key verbatim — is now the established pattern for any future `debrief:*` slot. The generator step is a pure function; a new slot in the schema flows through to every writer host's typed surface automatically. No hand-edits, no drift.

One thing we deliberately left out: `debrief:label`. It's a GeoJSON feature property and an MCP annotation, not a STAC item property, and modelling it onto `StacExtensionProperties` would recreate the very mismatch this feature removes. Giving it a typed home on `BaseFeatureProperties` is the natural next step when that surface gets attention.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/256-prefix-aware-stac-typing/spec.md)
→ [View the evidence](https://github.com/debrief/debrief-future/tree/main/specs/256-prefix-aware-stac-typing/evidence)
