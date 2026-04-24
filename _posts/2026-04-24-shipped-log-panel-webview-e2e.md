---
layout: future-post
title: "Shipped: Un-skipping the webview log-panel E2E suite"
date: 2026-04-24
track: [credibility]
author: Ian
reading_time: 4
tags: [e2e, playwright, vscode, log-panel, testing]
excerpt: "Five Playwright scenarios now cover the real openvscode-server to webview-iframe path, with a lint-level guard so the suite can't go quiet again."
---

## What We Built

We reactivated `tests/e2e/test-log-panel.spec.ts`, a Playwright suite
that had been sitting dormant under `test.describe.fixme(...)` since the
LogPanel UX work shipped. It had two upstream blockers —
webview-iframe stability (#143) and the LogPanel DOM contract (#176) —
and both have since landed, so the suite could finally come back online.

Three existing scenarios (empty state, entry creation on tool run, and
most-recent-first ordering) are now active, joined by two new parity
scenarios (click-to-select and click-to-deselect) that mirror what the
web-shell Playwright suite already asserts. Five scenarios in total,
all running in CI against a real openvscode-server.

## Why This Path Needed Its Own Suite

Storybook exercises the LogPanel component in isolation. The web-shell
Playwright suite exercises the same user-observable behaviours in a
standalone browser. Neither of them crosses the boundary that matters
most for the VS Code extension: the `postMessage` bus between the
extension host and the webview iframe inside the sidebar.

If the LogPanel renders perfectly in Storybook but messages never make
it across the iframe boundary, users see nothing. The code-server-based
suite is the only place we catch that failure mode.

## How It Works

Everything uses the shared page model at
`tests/e2e/models/code-server-page.ts` and the fixtures in
`tests/e2e/fixtures/base.ts` — no bespoke helpers. The suite resolves
the LogPanel frame via `getLogPanelFrame()`, which was made reliable
under #143, and asserts against the `[data-testid="log-panel"]` and
`.log-panel__entry` selectors that #176 shipped.

The two new parity scenarios assert selection state by CSS class using
`toHaveClass(/selected/)`, matching the web-shell pattern exactly. We
deliberately kept `aria-selected` out of scope — accessibility coverage
sits on its own backlog item (#209) and gating a11y work behind E2E
reactivation would have muddled both threads.

## A Lint-Level Guard Against Going Quiet

The suite's failure mode historically wasn't a broken test — it was a
silent skip. `test.describe.fixme` shows up as "pending" in Playwright
reports, which is easy to stop noticing. To stop that from recurring,
a 22-line bash script at `scripts/check-log-panel-skip-guard.sh` greps
for `test.skip`, `test.fixme`, and their `.describe` variants in this
one suite file. It runs in `task lint` and exits non-zero if any of
them reappear. Re-silencing the suite now fails CI, not a code review.

## Scope Stayed Narrow on Purpose

Four sibling suites (`test-analysis-tool`, `test-log-edit-face`,
`test-event-log-propagation`, and `test-capture-log-evidence`) still
sit at `.skip` with the same `#143` blocker comment. Each has its own
independent risk — one needs `debrief-calc` in the E2E environment,
another has its own stability history, another has cross-scenario state
coupling. Reactivating all five at once would have bundled unrelated
failure modes. The log-panel suite was already promoted to `fixme` as
the designated front-runner, so we honour that staging decision and
let it prove the webview-iframe path before the others follow.

## Runtime Budget and the Reactive Fallback

The modelled wall-clock across five scenarios is 76–109 seconds,
straddling the 90-second median target in SC-005. Rather than consolidate
the two selection scenarios up front to buy headroom, we kept them
separate for per-scenario debuggability — a failing selection assertion
in its own `test()` block is straightforward to triage. The fallback is
explicit: if the 10-run post-merge median breaches 85s, a tracking
issue opens; if it breaches 90s, scenarios D and E consolidate. The
trigger rules live in the spec, so there's no judgement call to make.

## What's Next

The four sibling `.skip` suites are the natural follow-on, but each
needs its own spec and research pass. The `#209` axe-core audit covers
the accessibility-attribute coverage we deferred. Post-merge, the
evidence report fills in with actual 10-run medians, and the scenario
list stands as the parity baseline for any future LogPanel behaviour
that needs the real integration path in CI.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/210-unskip-log-panel-e2e/spec.md)
→ [View the evidence](https://github.com/debrief/debrief-future/tree/main/specs/210-unskip-log-panel-e2e/evidence)
