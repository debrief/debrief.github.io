---
layout: future-post
title: "Shipped: Scene thumbnail assets get a named contract"
date: 2026-05-04
track: [credibility]
author: Ian
reading_time: 4
feature: 243-scene-asset-contract
tags: [stac, schemas, linkml, vscode-extension, tech-debt]
excerpt: "Promoted spec 241's tactical scene-thumbnail regex to a first-class LinkML shape with documented pairing and ULID rules — and a Python audit for the constraints JSON Schema can't express."
---

## What We Built

When spec 241 shipped storyboard thumbnail capture, scene-thumbnail asset keys (`scene-thumbnail-{ULID}` plus a `-sm` sibling) were registered with a permissive `patternProperties` regex on the Item schema. It worked, but it was undocumented: a contributor reading the schema couldn't answer the four obvious questions — *what is this key, why ULIDs, why pairs, when is it deleted?* — without diving into `apps/vscode/src/services/sceneThumbnailService.ts`. The pairing rule (large and small variants must coexist) lived in TypeScript code, not in the schema.

This work replaces the regex with a named `SceneThumbnailAssetEntry` LinkML class. The asset shape now self-documents through generated Pydantic, JSON Schema, and TypeScript outputs, the pairing and ULID-format constraints are enforced rather than implied, and every existing sample-catalogue Item still validates.

## How It Works

LinkML's JSON Schema generator can't emit `patternProperties` directly, so the implementation uses a hybrid: the value shape is LinkML-authored (single source of truth for the asset entry's fields), and a small hand-written overlay re-attaches it as a pattern-keyed wrapper on the Item schema. Generated Pydantic and TypeScript types come from the same LinkML class, so the value contract stays consistent across the three artefacts.

JSON Schema can't express "if key X exists, key Y must exist too", so cross-key invariants live in a ~135-line Python audit module. Each violation cites a stable rule ID — `scene-thumbnail-pair-rule-001` for unpaired variants, distinct rules for malformed ULID suffixes and orphaned pairs — that maps back to the schema documentation. The boundary between *what JSON Schema validates* and *what needs application logic* is now explicit, with named rules on both sides.

Because Debrief is still pre-release (Constitution Article XIV), there was no migration cycle to manage: the placeholder `scene-thumbnail` entry in `item_assets` and the `^scene-thumbnail(-.+)?$` regex were removed outright, and a repo-wide grep returns zero hits on either tactical artefact.

## By the Numbers

| Metric | Value |
|---|---|
| Files changed | 34 |
| Lines added / removed | 1,333 / 125 |
| New LinkML classes | 1 |
| Audit module size | ~135 lines |
| New tests across 5 files | 34 |
| Total test suite passing | 1,882 / 1,882 |
| Existing Items still validating | 73 / 73 |
| New runtime dependencies | 0 |

## Key Decisions

- **Hybrid LinkML + overlay over generator workarounds.** Trying to coerce LinkML into emitting `patternProperties` would have meant either upstream patches or a code-generation fork. A small, reviewed overlay keeps the value model in LinkML — where contributors expect to find it — and isolates the JSON-Schema-specific shape into one place.
- **Named rule IDs over inline error strings.** Audit failures cite stable identifiers rather than ad-hoc messages, so a violation in CI can be traced back to the schema doc that defined it. Future rules drop into the same module without changing the citation contract.
- **No on-disk migration.** Pre-release freedom under Article XIV means tactical artefacts can be deleted cleanly. Carrying a deprecation cycle for a key format with zero external consumers would have been pure ceremony.
- **Don't promote Scene to a first-class shape — yet.** The asset is anchored to the Scene's ULID and the ownership relationship is documented in the schema, but Scene itself stays out of LinkML for now. That's a separate piece of work tracked in the backlog.

## What's Next

This closes the documentation gap that spec 241 deliberately left open and gives the catalogue a referable schema entity for scene thumbnails — useful when external tools (or a future Scene shape) want to follow the contract by name. The audit-module pattern is also reusable: any future cross-key invariant the JSON Schema can't express now has a precedent for where to live and how to cite itself.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/243-scene-asset-contract/spec.md)
→ [View the evidence](https://github.com/debrief/debrief-future/tree/main/specs/243-scene-asset-contract/evidence)
