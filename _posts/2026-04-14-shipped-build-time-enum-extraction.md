---
layout: future-post
title: "Shipped: Build-time enum extraction for NL search"
date: 2026-04-14
track: [credibility]
author: Ian
reading_time: 3
tags: [schemas, python, e10, stac, developer-experience]
excerpt: "A deterministic 2.7 KB vocabulary bundle gives the NL-to-CQL2 prompt the exact words analysts are allowed to use, without embedding the catalog."
---

## What We Built

The natural-language search feature (Epic E10) needs the LLM to emit CQL2 filters using real vocabulary -- real nationality codes, real vessel classes, real tag names -- not hallucinated ones. Before this change, those vocabularies were scattered across the platform registry and every item's metadata, so the prompt-builder had no reliable way to enumerate them short of showing the LLM the whole catalog.

We shipped `scripts/extract-enum-bundle.py`, a single-command build-time script that reads the registry and the local-store sample catalog and produces `shared/data/enum-bundle.json` -- a committed 2.7 KB file containing every legitimate value the LLM is allowed to use. The LLM no longer needs to see the catalog to filter it. It only needs to see the words.

## How It Works

The script emits five sections under a `_meta` provenance header:

- `vessel_class_tree` — interior nodes of the registry's class tree. Platform-instance leaves like `NELSON` are stripped, so the LLM reasons about classes ("frigates", "SSN"), not individual hulls.
- `nationalities` — deduplicated union of registry and catalog ISO codes (`DE`, `FR`, `GB`, `US`).
- `exercise_names` — prefixes harvested from item titles using a documented rule: `"Saxon Warrior: Boat1"` contributes `"Saxon Warrior"`; `"AIS:dropoff"` contributes nothing because the literal `": "` separator is absent.
- `tags` — deduplicated `debrief:tags` across catalog items (`AAW`, `ASW`, `training`, ...).
- `feature_tags` — deduplicated `debrief:feature_tags` (`sonar-contact`, `towed-array`, ...).

Canonicalisation is conservative: trim plus case-fold for deduplication, first-seen casing preserved for readability. The rule lives in the `_meta` header so downstream consumers don't have to guess.

The implementation separates ~270 lines of pure functions (`_canonical_key`, `_dedup_preserving_first`, `extract_class_tree`, `scan_catalog`, `build_bundle`) from a ~110-line CLI wrapper. Every pure function is independently unit-testable; the CLI is a thin shell that wires defaults, reads files, and shapes exit codes.

## Determinism Was The Hard Requirement

Running the script twice on identical inputs must produce byte-identical output. That turns the bundle into a reviewable artefact: a diff in `enum-bundle.json` on a PR means the input vocabulary really changed, not that a dict happened to iterate in a different order. Sort keys are case-insensitive, JSON is serialised with stable key ordering, and `TestDeterminism::test_two_runs_byte_identical` guards the property.

The same property powers drift detection -- adding a new tag, nationality, exercise prefix, or vessel class to the inputs produces exactly the expected line-level addition to the bundle. Four tests lock that behaviour in.

## By the Numbers

| | |
|---|---|
| New tests | 44 |
| Passing | 44 |
| Full suite | 1687 passed, 1 skipped, 1 xfailed |
| Bundle size (real catalog) | 2.7 KB |
| Size budget | < 64 KiB |
| Runtime on sample catalog | < 5 s |
| Lint + typecheck | Clean (`ruff`, `pyright`) |

Schema conformance is enforced at test time: the serialised bundle validates against `contracts/enum-bundle.schema.json` using `jsonschema` draft 2020-12. CLI exit codes are explicit too -- missing registry exits 1, malformed JSON exits 2, both naming the offending path on stderr.

## What's Next

The bundle is the input to #188, where the prompt template gets built. The LLM will be shown only the vocabulary sections; the catalog stays client-side, so CQL2 filters execute locally and item metadata never crosses the wire. We'll also need a lightweight drift-monitoring routine -- the bundle is committed today, so a PR diff is enough for humans, but we may add a CI check once #188 lands.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/187-build-time-enums/spec.md)
→ [View the evidence](https://github.com/debrief/debrief-future/tree/main/specs/187-build-time-enums/evidence)
