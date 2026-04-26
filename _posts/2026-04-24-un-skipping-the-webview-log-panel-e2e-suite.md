---
layout: future-post
title: "Building Un-Skipping the Webview Log-Panel E2E Suite"
date: 2026-04-24
track: credibility
author: Ian
reading_time: 5
tags: [e2e, playwright, vscode, log-panel, test-infrastructure]
feature_id: 210
excerpt: "Reactivated 3 dormant Playwright scenarios for the LogPanel webview, added 2 parity scenarios, and wired a lint-level skip-guard so CI can't go quiet again."
---

## What We're Building

We're un-skipping a small Playwright suite — `tests/e2e/test-log-panel.spec.ts` — that has been sitting dormant under `test.describe.fixme(...)` since we shipped the LogPanel UX work in #176. Reactivating it closes a specific testing gap: Storybook exercises the LogPanel component in isolation, and the web-shell Playwright suite exercises the same behaviours in a standalone browser, but neither of them crosses the boundary that matters for the VS Code extension — the openvscode-server process, the sidebar webview iframe, and the extension-host message bus that stitches them together. If the LogPanel renders perfectly in Storybook but messages never make it across the iframe boundary, users see nothing. A code-server-based test is the only place we catch that.

The suite keeps its three existing scenarios (empty state, entry created when a tool runs, entries ordered most-recent-first) and gains two more to match what the web-shell suite already asserts — click-to-select and click-to-deselect on a log entry. That parity matters: we run the LogPanel on two host surfaces, and if behaviour drifts between them we want a test to tell us, not a bug report.

## How It Fits

This is the follow-through on two earlier pieces of work. #143 stabilised the webview iframe probing helpers in `code-server-page.ts` so that suites like this one can actually resolve the frame they want to assert against. #176 shipped the LogPanel component with the `data-testid` hooks and focus command the suite was written to expect. The suite was promoted from `skip` to `fixme` under #176 as a deliberate staging step — a signal that it was the designated front-runner for reactivation once the webview-iframe work landed. Reactivating it now puts the real integration path under CI, and serves as the canary for four sibling suites that remain `.skip` with the same blocker comment.

## Key Decisions

- **Scope stayed narrow to one file.** We considered reactivating all five `blocked: webview iframe (#143)` suites at once, but each carries its own independent risk — `test-analysis-tool` still needs debrief-calc in the E2E environment, `test-log-edit-face` has its own stability history, `test-event-log-propagation` has cross-scenario state coupling concerns. The log-panel suite was already promoted to `fixme` as the front-runner, so we honour that staging decision and let it prove the webview-iframe path before the others follow.

- **Class-based selection assertion, not `aria-selected`.** The two new parity scenarios assert against `log-panel__entry--selected` to match the web-shell suite's `toHaveClass(/selected/)` pattern. The LogPanel also sets `aria-selected`, but accessibility-attribute coverage has its own backlog item (#209) and keeping the concerns separate avoids gating a11y work behind E2E work.

- **No bespoke test helpers.** Everything uses the shared `code-server-page.ts` page model and the existing `fixtures/base.ts`. A convenience like `getFirstLogEntry()` would shave a line per scenario but set a precedent that erodes the shared page model — every suite adding its own helpers is how that abstraction stops being shared.

- **No config overrides.** The suite inherits `timeout: 60_000`, `retries: 0 in CI / 1 local`, and `trace: 'on-first-retry'` from `playwright.config.ts`. The deliberate consequence: locally, a spike regression triggers the retry and captures a trace; in CI, a first-fail surfaces via assertion messages and the HTML report, without a trace. That's fine for the contrived-regression verification ritual described in SC-003 — it's a local activity by design.

- **Known risk called out, not papered over.** Four sibling suites still sit at `.skip` with the same `#143` blocker comment even though #143 is marked complete. If reactivating this suite reveals latent webview-iframe flakiness in CI, the mitigation is honest: revert to `fixme`, open a new bug capturing the specific failure mode, and reopen #210 against the new blocker. We'd rather ship with monitoring than with blind confidence.

## Screenshots

This is a test-infrastructure feature — there is no UI to screenshot. The diagram below shows what each of the five scenarios actually traverses at runtime. The red-bordered section is the VS Code ↔ webview `postMessage` boundary that Storybook and the web-shell suite never reach, and it's what justifies the suite's existence.

```mermaid
sequenceDiagram
    autonumber
    participant Test as Playwright Runner<br/>(test-log-panel.spec.ts)
    participant Fixture as Fixture<br/>(tests/e2e/fixtures/base.ts)
    participant Page as CodeServerPage<br/>(tests/e2e/models/code-server-page.ts)
    participant Browser as Chromium<br/>(@sparticuz/chromium)
    participant CS as openvscode-server
    participant Ext as VS Code extension host<br/>(debrief-vscode)
    participant WV as LogPanel webview iframe<br/>(vscode-webview://<guid>/)
    participant DOM as LogPanel DOM<br/>(@debrief/components)

    Test->>Fixture: request codeServerPage fixture
    Fixture->>Browser: launch
    Fixture->>CS: navigate to CODE_SERVER_URL
    CS->>Ext: activate debrief-vscode on view focus
    Fixture-->>Test: resolved CodeServerPage

    Test->>Page: openPlotViaStacTree('Exercise Alpha')
    Page->>CS: DOM-click STAC tree node
    CS->>Ext: command: openPlot
    Ext->>CS: spawn LogPanel webview
    CS->>WV: load vscode-webview://<guid>/index.html

    Test->>Page: getLogPanelFrame()
    Page->>WV: findWebviewFrameByContent('[data-testid="log-panel"]', 15s)
    WV-->>Page: FrameLocator
    Page-->>Test: FrameLocator

    alt Scenario A — empty state
        Test->>WV: locator('[data-testid="log-panel-empty-no-entries"]').toBeVisible()
        WV->>DOM: render LogPanel with entries=[]
        DOM-->>Test: assertion passes
    else Scenario B / C — entry creation & ordering
        Test->>Page: executeCommand('Debrief: Range Bearing')
        Page->>Ext: command palette → tool
        rect rgb(255, 230, 230)
          Ext-->>WV: postMessage({ entries: [...] })
          Note right of Ext: VS Code ↔ webview boundary<br/>(the gap web-shell/Storybook cannot cover)
        end
        WV->>DOM: re-render LogPanel with entries
        Test->>WV: locator('.log-panel__entry').first().waitFor()
        DOM-->>Test: assertion passes
    else Scenario D / E — select & deselect
        Test->>WV: firstEntry.click()
        WV->>DOM: LogEntry onClick
        DOM->>DOM: selection state toggled
        DOM->>DOM: className includes 'log-panel__entry--selected'
        Test->>WV: expect(firstEntry).toHaveClass(/selected/)
        DOM-->>Test: assertion passes
        Test->>WV: firstEntry.click() (second time)
        DOM-->>DOM: selection cleared
        Test->>WV: expect(firstEntry).not.toHaveClass(/selected/)
        DOM-->>Test: assertion passes
    end
```

## By the Numbers

| | |
|---|---|
| Scenarios reactivated | 3 (empty state, entry creation, ordering) |
| New parity scenarios | 2 (select, deselect) |
| Total active scenarios | 5 |
| Expected wall-clock budget | ≤ 90 s median (SC-005) |
| Skip-guard script LOC | 22 (bash grep-based) |
| Taskfile integration | 1 line appended to `lint` target |
| Sibling suites still on `.skip` (out of scope) | 4 |

The 22-line skip-guard (`scripts/check-log-panel-skip-guard.sh`) is wired into `task lint`. It exits non-zero the moment `test.skip`, `test.fixme`, `test.describe.skip`, or `test.describe.fixme` appears in `test-log-panel.spec.ts`, so a contributor who re-silences the suite gets a CI failure rather than a quietly degraded test run.

The modelled wall-clock range across five scenarios is 76–109 s — straddling the 90 s median target. Research R2 chose not to consolidate scenarios pre-emptively; that option is the reactive fallback if the 10-run post-merge median trips the breach threshold.

## Lessons Learned

**`fixme` as a deliberate staging signal is useful, but only if the backlog tracks the reactivation debt.** Promoting from `test.describe.skip` to `test.describe.fixme` under #176 was the right move — it preserved some CI visibility and marked the suite as the intended front-runner. The problem: `fixme` entries still count as "skipped" in CI summaries, so the signal is invisible unless someone is actively watching the pending queue. Without #210 explicitly naming the reactivation obligation, the suite could have stayed `fixme` indefinitely while CI reported green. The lesson isn't to avoid `fixme` — it's to treat every `fixme` as an open ticket, not a deferred decision.

**Lint-level machine-checkable guards beat human vigilance for "don't let this slip back."** The skip-guard is 22 lines of bash doing one thing: `grep -nE` for skip/fixme annotations in a single file. The failure message prints the offending line number. The alternative — an ESLint `no-restricted-syntax` override scoped to `tests/e2e/` — would require wiring `@typescript-eslint/parser` into a part of the tree that isn't currently linted by ESLint at all, plus an `overrides` block scoped to a single file. That's a heavier and less-discoverable solution for a one-regex check. Four sibling guard scripts in the repo already use the same bash pattern; this fits without introducing a new abstraction.

**Parity isn't uniformity.** The web-shell suite has two scenarios with no VS Code equivalent — one asserting GoldenLayout tab chrome (`.lm_active`) and one testing GoldenLayout tab-switching. Those behaviours don't exist on the VS Code surface: the LogPanel is a standalone webview in a native sidebar container, not a GoldenLayout tab. Forcing equivalence there would have meant asserting against host chrome the extension neither owns nor controls. The parity baseline is correctly defined at the user-observable data-flow layer (empty state, entry creation, ordering, selection, deselection) — not the host-chrome layer. Documented asymmetries are the right outcome, not a parity failure.

**Reactive monitoring is a better guardrail than pre-emptive scope cuts.** Research R2 estimated the 5-scenario suite at 76–109 s wall-clock — a range that straddles the SC-005 target. The pre-emptive option was to consolidate the two selection scenarios into a single `test()` body from the start, saving roughly 12–15 s and avoiding the straddled range entirely. We rejected that: per-scenario debuggability is worth more than the headroom recovered. A failing selection assertion in its own scenario is straightforward to triage; a failure midway through a compound body is not. The 85 s warning and 90 s breach thresholds are concrete and machine-readable post-merge. Consolidation fires if it's actually needed, not before.

## What's Next

Four sibling suites — `test-analysis-tool`, `test-log-edit-face`, `test-event-log-propagation`, and `test-capture-log-evidence` — still sit at `.skip` with the same `#143` blocker comment. Each has its own independent risk: `test-analysis-tool` also requires `debrief-calc` available in the E2E environment; `test-log-edit-face` has its own stability history; `test-event-log-propagation` has cross-scenario state coupling concerns. Reactivating them is the natural next step, but each warrants its own spec and research pass rather than a batch reactivation.

`aria-selected` accessibility-attribute coverage for log entries is scoped to #209 and is deliberately absent here. Keeping the concerns separate means #209 can land the full axe-core audit without being gated on E2E reactivation timelines.

Post-merge, if the 10-run main-branch median breaches 85 s, a tracking issue opens per the SC-005 monitoring rules. If it breaches 90 s, scenarios D and E consolidate into a single `test(...)` body. The trigger rules are in the spec — no manual judgement call required.

→ [See the spec](../spec.md)
→ [See the research](../research.md)
→ [See the parity diff](../evidence/parity-diff.md)
