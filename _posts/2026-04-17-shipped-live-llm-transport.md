---
layout: future-post
title: "Shipped: Live LLM transport"
date: 2026-04-17
track: [credibility]
author: Ian
reading_time: 5
tags: [tracer-bullet, nl-demo, cql2, live-transport, security]
excerpt: "The nl-demo can now call a real language model -- credential isolation baked into the architecture, not bolted on."
---

## What We Built

The stakeholder demo from #189 has always relied on a hand-authored corpus of phrases. That works for a prepared walkthrough, but breaks the moment someone types something unexpected. Feature #190 adds a second transport behind #188's `LLMClient` interface: a live path to Anthropic Claude that handles open-ended analyst queries -- "Russian submarines after 2010", "Exercise Trident Juncture ships" -- without touching the fixture path or requiring any code change between queries.

The implementation is a Node stdlib proxy (`live-proxy.mjs`) that holds the API key in its environment and forwards requests. The browser never sees a credential. Drop in a `live-config.json` at the app root and restart the proxy -- the demo activates live mode on reload. Remove the file, reload again, and it reverts cleanly to fixture-only behaviour with no stale state carried across.

The default remains fixture-only. A freshly-served bundle with no operator configuration makes zero outbound calls under any sequence of interactions. That was a hard requirement, and it is verified by a Playwright network spy across 11 driven phrases.

## The Security Design

The credential isolation story is worth laying out explicitly, because it shaped several decisions.

**Two-file config split.** The API key lives in `.env` (proxy-side, gitignored). The browser fetches `live-config.json` (also gitignored), which holds the proxy URL, model name, timeout, and call cap -- but no credentials. A CDN or public cache can mirror `live-config.json` without exposing anything sensitive.

**Loopback-only proxy by default.** The proxy binds to `127.0.0.1:8081`. Enabling a non-loopback bind requires two deliberate opt-ins: `PROXY_ALLOW_REMOTE=true` in the environment *and* an `X-Proxy-Token` header matching a token printed to stderr at startup. Accidentally binding to `0.0.0.0` cannot turn the proxy into an open relay.

**gitleaks CI gate.** A `gitleaks.toml` config runs on every PR, scanning `dist/`, `apps/nl-demo/dist/`, and the committed worktree against `sk-ant-*` and `ANTHROPIC_API_KEY=` patterns. The allowlist covers `.env.example` placeholders only. This PR returned 0 leaks across 2,913 files.

**Per-session usage cap.** The client enforces a configurable call ceiling (default 50). Call 51 short-circuits before any `fetch` is issued, surfaces a "reload to reset" banner, and emits a `TransportCallRecord` with `outcome: "usage-cap-reached"` -- verifiable in the stub test suite without a live key.

## Screenshots

![Transport-mode indicator showing "Live - Anthropic - claude-haiku-4-5-20251001" in the demo header](/assets/images/future-debrief/shipped-live-llm-transport/indicator-live.png)

_The indicator appears only when `live-config.json` validates **and** the boot-time health check succeeds. If the proxy is down, the demo falls back to fixture mode and the indicator is absent._

![Demo header in fixture mode with no live-mode indicator; subtitle reads "Demo: hand-authored corpus, no live LLM"](/assets/images/future-debrief/shipped-live-llm-transport/indicator-fixture.png)

_Fixture mode. No indicator, distinct subtitle -- the operator cannot mistake one mode for the other._

![Banner reading "Live-mode call failed -- Provider rejected the request -- check credentials, then restart the proxy."](/assets/images/future-debrief/shipped-live-llm-transport/banner-auth-failure.png)

![Banner reading "Live-mode call failed -- Provider rate limit hit -- try again in a moment or use a different phrase."](/assets/images/future-debrief/shipped-live-llm-transport/banner-rate-limit.png)

Each of the 7 `LiveTransportErrorReason` classes plus the malformed-response path from #188 maps to a distinct banner. The query input stays enabled on every failure branch -- a live failure does not kill the demo session.

## By the Numbers

| | |
|---|---|
| Feature-specific vitest tests | 38 |
| Feature-specific Playwright E2E | 8 |
| Total suite passing | 3,255 |
| `LiveTransportErrorReason` classes | 7 |
| gitleaks findings | 0 / 2,913 files |
| New runtime dependencies | 0 |

## Lessons Learned

**Zero new runtime dependencies was achievable and worth it.** The proxy is Node stdlib (`node:http`, `node:https`). The client is browser-native `fetch` + `AbortController`. No provider SDK. This keeps the implementation portable across providers and removes an entire dependency-audit surface.

**The `cancelPending()` supersession case is subtle.** When a second phrase is submitted while a first live call is still in flight, the older call needs to resolve as `reason: "transport-error" / message: "superseded"` rather than land out of order. Writing the test first -- slow call 1, fast call 2, assert only call 2 reaches the consumer -- made the right implementation obvious.

**Stub mode deserves its own fixture file.** Scripting all 7 failure classes via `live-proxy.mjs --stub live-stub.json` in Playwright's `webServer` array lets the full E2E suite run in CI without any network or credential dependency. The stub file is a committed artefact; CI behaviour is deterministic across branches.

**`live-config.json` placement matters.** Putting it at the app root rather than inside `data/` keeps it outside `sync-data.mjs`'s regeneration cycle. An early draft had it inside `data/`, and a `pnpm sync-data` run would have silently wiped it.

## What's Next

The live transport is a transport -- it does not yet record successful live-generated responses back into the fixture corpus. A "record live to fixture" workflow would let the corpus grow organically from real usage. That is tracked separately and out of scope here.

The #189 demo also still shows the off-corpus banner when the proxy is absent and the phrase is unknown. With live mode available, the UX question becomes: should fixture-mode users see a softer message pointing them toward live mode, or is the current banner still the right call? That is worth revisiting once we have some real usage data.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/190-live-llm-transport/spec.md)
→ [View the evidence](https://github.com/debrief/debrief-future/tree/main/specs/190-live-llm-transport/evidence)
