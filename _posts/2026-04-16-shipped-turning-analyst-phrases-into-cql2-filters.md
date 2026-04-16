---
layout: future-post
title: "Shipped: Turning analyst phrases into CQL2 filters"
date: 2026-04-16
track: [credibility]
author: Ian
reading_time: 5
tags: [nl-cql2, filter-engine, llm, tracer-bullet, stac, developer-experience]
excerpt: "An analyst types 'UK submarines'; the generator returns a CQL2 filter the existing engine evaluates to 17 plots. No UI yet, no live LLM -- just the plumbing and a CI harness that replays 12 phrases offline."
---

## What We Built

A pure library module at `shared/components/src/nl-cql2/`. It takes three things -- an analyst phrase, the enum bundle shipped in #187, and an `LLMClient` -- and returns a `GenerationResult`: the CQL2-JSON filter, a set of lozenge seeds for the filter bar, a list of unrecognised terms the analyst used, and a typed error if anything misfired. No UI, no transport, no React components. Just the translator.

Why this matters: the existing filter bar can already express everything the generator produces, but getting there means clicking through a cascading menu of nationalities times domains times vessel classes times tags. For an analyst who knows they want "UK submarines", that's half a dozen clicks to reach what the phrase already says. The NL path collapses that into one input box -- and because the CQL2 is identical in either direction, the resulting lozenges are the same lozenges the filter bar already renders. No parallel type, no mapper, no "NL mode" vs "manual mode" divergence.

The module is offline-reproducible by design. CI runs a headless harness of 12 analyst phrases against a hand-authored fixture corpus -- no network call in the test path. Phrase-to-response bindings are recorded once by an author with LLM access and then replayed deterministically on every run. When the prompt text changes, the fixture's prompt hash stops matching and the harness refuses to replay rather than pretending the old response is still valid. That was the piece we were most careful about: silent drift is worse than loud failure.

## The Harness Report

The CI harness runs all 12 phrases and records the CQL2 each one produces. Here's an abridged slice from `specs/188-nl-cql2-prompt/evidence/harness-report.txt`:

```
NL -> CQL2 Harness Report
========================
Corpus size: 12
Catalog items: 73
Prompt size: 6018 bytes
Passed:      12
Failed:      0

[uk-submarines] "UK submarines"
  matchCount: 17
  cql2: {
    "op": "array_filter",
    "args": [
      { "property": "debrief:platforms" },
      { "op": "and", "args": [
        { "op": "=", "args": [{ "property": "nationality" }, "GB"] },
        { "op": "=", "args": [{ "property": "domain" }, "subsurface"] }
      ]}
    ]
  }

[british-warp-drive] "British warp drive platforms"
  matchCount: 54
  cql2: { "op": "a_containedBy", "args": [ ["GB"],
          { "property": "debrief:platforms[*].nationality" } ] }
```

The last one is the useful pattern: "British warp drive platforms" keeps the recognised "British" and surfaces "warp drive" as an unrecognised term rather than hallucinating a nationality code or silently returning zero hits. Nine of the twelve corpus phrases cover every FR-008 dimension -- nationality, domain, compound nationality+domain, vessel type, vessel role, exercise, tag, compound nationality+vessel type, compound exercise+platform -- and three (ZZ warships, British warp drive platforms, xyzzy foobar quuxes) probe the unrecognised-term path specifically.

## By the Numbers

| | |
|---|---|
| Corpus phrases | 12 / 12 passing |
| Vitest total | 194 passed / 3 skipped / 0 failed |
| Filter-engine reverse parser (new) | 25 tests |
| NL -> CQL2 module | 44 tests |
| Prompt size (current) | 6,018 bytes |
| Prompt-size ceiling | 20,480 bytes |
| Headroom | 14,462 bytes |
| Scaling breakpoint | ~38-40 vessel-class taxonomy leaves |
| Catalog items queried | 73 |
| Harness elapsed time | 13 ms |

## Lessons Learned

**Reverse-parsing CQL2 forced a scope expansion, and it was worth it.** The original scope was a thin `filterByCql2Json` shortcut -- enough to evaluate the generator's output. During the speckit review, the gap between "CQL2 the evaluator produces" and "CQL2 the evaluator can consume" became obvious: we could write a filter from a CQL2 tree, but we couldn't parse one back. So the filter-engine grew a full `cql2JsonToFilterExpression` reverse parser (decision 1A). Round-trip is now bijective -- 25 new tests cover every `FilterType`, negated leaves, OR groups, compound `array_filter` shapes, and the typed `Cql2ReverseParseError` for unsupported input. It's more code than we set out to write, but it's the right shape: the evaluator owns the CQL2 semantics, and everything else defers to it.

**Reusing the filter bar's chip shape was the single biggest simplification.** The early sketches had a `ChipSummary` type for the generator's output and a separate `LozengeItem` for the filter bar, with a mapper layer in between. Decision 5A killed that. The generator now returns `LozengeSeed = Pick<LozengeItem, 'filterType' | 'value' | 'negated'>` -- the canonical filter-bar chip shape, minus the id and `kind` fields that the filter-bar reducer assigns. When #189 wires the UI, it dispatches the seeds straight into the existing reducer. No mapper, no translation table, no divergence risk.

**Drift resistance is cheaper when you derive, not duplicate.** The prompt's "legal fields" block is generated from `PROPERTY_MAP` -- the same constant the filter engine's evaluator reads (decision 3A). A compile-time exhaustiveness check on `FilterType` trips the build if anyone adds a new filter type without extending the operator table. The trade is that prompt changes touching the schema block now require a TypeScript change, but that's a feature: the prompt and the evaluator can't drift apart without someone noticing.

**Five error reasons is enough, and silent success was the real risk.** We considered collapsing the error taxonomy to "LLM failed" vs "generation succeeded". Decision 8A landed on five typed reasons -- `malformed-json`, `schema-violation`, `hallucinated-field`, `unrecognised-term-leaked`, `cql2-evaluation-failed` -- because each one points at a different remediation. The one we almost missed was `unrecognised-term-leaked`: an unrecognised term appearing as a predicate *value* in the CQL2 tree, even though it's also listed in `unrecognised_terms`. The leak visitor walks nested `array_filter`, `or`, and `a_containedBy` shapes looking for exactly that. Without it, a prompt that returns `{ unrecognised_terms: ["klingon"], cql2: { nationality: "klingon" } }` would evaluate to zero hits with no error -- the worst failure mode because it looks like a correct empty result.

**Prompt size scales linearly with the vessel-class taxonomy, and we have runway.** The current prompt is 6 KB against a 20 KB budget -- roughly 30% of the ceiling. The `prompt-size.test.ts` helper clones the taxonomy to arbitrary leaf counts and measures the resulting prompt; the breakpoint is around 38-40 leaves (full table in `prompt-size-measurements.md`). At today's 10 leaves we have room to roughly triple the taxonomy before needing to compact it. When we cross ~30 platforms, the mitigation is known and ordered: drop `full_name` labels first, collapse to `vessel_role` leaves next, add `...and N others` sentinels last. Documented, not urgent.

## What's Next

Two follow-on items in Epic E10 build on this:

- **#189 -- Stakeholder Demo UI.** The input box, the result list, the lozenge rendering. The generator is ready -- it already returns `LozengeSeed[]` in the exact shape the filter bar's reducer consumes, and it already returns typed errors the UI can surface.
- **#190 -- Live LLM Transport.** The `LLMClient` interface is the integration point. `PassthroughLLMClient` forwards the prompt to any caller-supplied function -- `fetch`, an Anthropic SDK call, a mocked transport for a stakeholder demo, whatever. Auth and rate-limiting live there, not here.

When the real transport arrives, the generator should not change. That's the acceptance test for whether we drew the boundary in the right place.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/188-nl-cql2-prompt/spec.md)
→ [View the evidence](https://github.com/debrief/debrief-future/tree/main/specs/188-nl-cql2-prompt/evidence)
