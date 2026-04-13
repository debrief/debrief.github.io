---
layout: future-post
title: "Shipped: Platform registry with unified vessel class tree"
date: 2026-04-13
track: [credibility]
author: Ian
reading_time: 3
tags: [schemas, python, developer-experience, e10, stac]
excerpt: "A single JSON registry defines the vessel class hierarchy and all known platforms, with matching Python and TypeScript loaders."
---

## What We Built

Platform identity is no longer scattered across scripts. We shipped a single registry file (`shared/data/platform-registry.json`) that defines every known vessel class as a tree and every known platform as a leaf node within that tree. Both the Python service layer and the TypeScript frontend read the same file and produce identical results -- resolve a platform ID in either language and you get the same eight fields back.

Previously, platform metadata lived in a hardcoded dictionary inside `scripts/enrich-legacy-catalog.py`. Adding a platform meant editing Python code. Now it means adding a few lines to a JSON file -- no code changes required.

The registry ships seeded with the 10 platforms already in use: NELSON, COLLINGWOOD, FRIGATE, OWNSHIP, SENSOR, SUBJECT, TARGET, TMA\_TRACK, OWNSHIP\_A, and OWNSHIP\_B, placed in a taxonomy tree that distinguishes surface vessels from submarines, warships from auxiliaries, and individual hull types like Type 23 frigates and Type 45 destroyers.

## How It Works

The registry file uses a nested tree structure rooted at `vessel_classes`. Interior nodes represent categories (domain, role, type) and may carry a `_class` metadata entry with a human-readable label. Leaf entries are individual platforms with a `name`, `nationality`, and optional `short_name`.

When a loader resolves a platform ID, it walks the tree to find the matching leaf and derives positional metadata from the path: `domain` from the first segment, `vessel_role` from the grandparent, `vessel_type` from the parent, and `vessel_class` as the full slash-separated path. For example, resolving `NELSON` returns:

```python
registry = load_registry()
nelson = registry.resolve("NELSON")
# name:         "HMS Nelson"
# nationality:  "GB"
# vessel_class: "surface/warship/frigate/type23"
# vessel_type:  "type23"
# vessel_role:  "frigate"
# domain:       "surface"
```

Both loaders also support enumeration (`list_platforms`), tree traversal (`find_by_class`), and class validation (`is_valid_class`). The tree handles arbitrary depth, not just the four levels in the seed data.

## Validation

Load-time validation catches structural errors before they propagate. The loaders reject files with missing or invalid JSON, a missing `vessel_classes` root key, duplicate platform IDs across branches, and platforms missing required `name` or `nationality` fields. Each error message identifies the specific problem and location.

## By the Numbers

| | |
|---|---|
| New tests | 66 |
| Python (pytest) | 33 |
| TypeScript (vitest) | 33 |
| Tests failing | 0 |
| Cross-language parity | Confirmed via golden fixture |

Key scenarios verified: single-platform resolution with all eight derived fields, cross-language field-by-field parity for all 10 platforms, tree traversal at domain/role/type levels, load-time validation for every structural error class, and edge cases (empty strings, unknown IDs, case sensitivity).

## What's Next

This registry is the foundation for E10 Phase 0. Next up: schema integration (#181) will add `vessel_class`, `vessel_role`, and `domain` to the LinkML TrackProperties schema, and save-time resolution (#182) will wire the registry into the STAC save handler so platform metadata is enriched automatically at import time.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/180-platform-registry/spec.md)
→ [View the evidence](https://github.com/debrief/debrief-future/tree/main/specs/180-platform-registry/evidence)