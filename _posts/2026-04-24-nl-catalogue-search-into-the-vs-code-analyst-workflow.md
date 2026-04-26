---
layout: future-post
title: "Building NL catalogue search into the VS Code analyst workflow"
date: 2026-04-24
author: Ian
track: credibility
tags: [shipped, vscode, nl-search]
excerpt: "Natural-language catalog filtering in VS Code — type a sentence, watch chips and plot list narrow."
---

## What We're Building

An analyst opens the Catalog Overview in VS Code, types "UK submarines" or "French frigates on ASW operations" into the filter bar, and watches filter chips appear and the plot list narrow — without leaving the editor. It's the same natural-language pipeline that's been running in the `nl-demo` browser page for a few weeks, now reachable where people actually work.

The translation from phrase to filter chips is unchanged from the demo. What's new is the wiring: getting a Claude call to happen from inside a VS Code webview, without the webview ever seeing the credential.

## How It Fits

Feature #188 gave us the NL→CQL2 prompt and parser. #189 built the stakeholder demo UI around it. #190 verified the live transport end-to-end against real Anthropic Haiku 4.5 — the browser demo now answers real phrases with real chips. This feature is the fourth step: take the pieces that already work and surface them inside the editor.

The FilterBar component picks up an optional `llmClient` prop. When it's present, Enter routes the phrase through the NL pipeline; when it's absent, the existing literal-substring QuickSearch runs exactly as it does today. The browser demo and VS Code end up as two consumers of the same component — no fork, no parallel implementation.

## Key Decisions

- **Transport is `postMessage`, not a loopback HTTP proxy.** The webview's CSP blocks direct calls to `127.0.0.1:8081`, and the extension host already owns the trust boundary — SecretStorage, network, webview lifecycle. Re-using #190's `callAnthropic` logic as an in-process module avoids a child-process and a second binary for security review to consider.
- **The API key lives in VS Code SecretStorage.** Not `settings.json`, not an environment variable, not a workspace file. SecretStorage uses the host OS keyring and isn't synced by Settings Sync — so a shared workspace can't accidentally ship a credential.
- **Opt-in default off.** First-time users see zero behaviour change and zero network calls. A single `debrief.nlSearch.enabled` toggle is the master switch; when it's off, the extension doesn't even read SecretStorage. The literal-substring fallback remains the default search path.
- **Per-session call ceiling enforced in the host.** Default 50, matching #190. A rogue or second webview panel can't bypass it. Reload-the-window is the reset affordance.
- **Seven failure classes, distinct banners.** Auth, rate-limit, provider-error, timeout, malformed, not-configured, and ceiling-reached. Prior chips and filtered results stay on screen through any failure. No JavaScript errors in DevTools for an analyst to decipher.

---

## What Shipped

The shared `LLMClient` contract migrated from throwing on failure to returning a canonical `LiveOutcome` union. That single shape now flows through both consumers: the browser demo's loopback `fetch`, and the VS Code extension host's direct-from-Node HTTPS call. Two sibling files — `providerCall.ts` for TypeScript consumers and `providerCall.mjs` for the plain-Node demo proxy — keep the classification logic in one place.

The `apps/nl-demo` Playwright suite stayed green through the migration; #190's failure matrix maps cleanly onto the new outcome kinds (`usage-cap-reached` became `ceiling-reached`, and `oversize-response` folded into `malformed-response` with a nested `reason`). Nothing in the browser demo's UX changed.

On the VS Code side, the new `LlmProxy` service is a lazy-init singleton that:

- hydrates the API key from `context.secrets` on the first `nlGenerate` message (not at activation — activation cost stays near zero for the 95 % of users who never opt in),
- caches the key in memory and invalidates on `onDidChange`,
- short-circuits `not-configured`, `not-configured/no-key`, and `ceiling-reached` before any network call,
- emits one `[nl-search/live]` structured log line per outcome — timestamp, provider, model, duration, outcome kind, response bytes, call index. Never the prompt, the response, or the key.

A fresh `createPostMessageLLMClient` factory in `@debrief/components` bridges `LLMClient.generate()` across the webview↔host boundary. One `nlGenerate` message per call, one `nlOutcome` response, cancellations handled through `nlAbort` + an in-webview `AbortController` on the map-of-pending-calls. Unknown response IDs are silently ignored — a single harmless property that buys crash-resistance across extension reloads.

The FilterBar's NL mode is a single new prop, gated by the presence of `llmClient` + `nlEnums`. Supersession (submit B while A is pending) always calls `client.abort()` before issuing the new request. Existing chips survive every failure banner. The `[#191 regression]` test in `useFilterBar.test.ts` pins tomorrow's refactoring against the literal-QuickSearch baseline — if a future change accidentally makes the default path LLM-dependent, CI catches it.

## What's Next

This PR lands the end-to-end user experience. A few deferred follow-ups have been captured as separate backlog items and are safe to pick up independently:

- **#195** — non-Anthropic providers. The `LLMClient` abstraction already supports new factories; the per-provider work is prompt tuning + error-class mapping.
- **#196** — per-prompt audit trail (opt-in). Separate setting, separate log channel, SIEM-structured — off by default.
- **#197** — a distinct `keyring-unavailable` banner on Linux, for the subset of failures where `context.secrets.get()` throws because the OS keyring is locked rather than missing.
- **#198** — NL search inside the Layers and Tools panels. The FilterBar `llmClient` prop already carries through; the wiring is presentational.

Cross-cutting: the per-item PROV log rotation introduced here (`provenance_log_archive.jsonl` at 500 entries) will want a shared policy with the per-feature LogService — tracked as #194.

## Thanks

- Anthropic's Claude Haiku 4.5 is the default provider for #190 and #191 — its response structure and latency characteristics are what made the end-to-end UX viable.
- `@sparticuz/chromium` is still the reason Playwright works in our cloud CI without a browser-install dance.
