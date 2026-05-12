---
layout: future-post
title: "Shipped: Drawing mode survives webview rebuilds"
date: 2026-05-12
track: [credibility]
author: Ian
reading_time: 5
tags: [vscode-extension, session-state, drawing, tech-debt, e06]
excerpt: Drawing mode and palette index now persist across VS Code webview reloads via session-state wiring.
---

## Hook

| Before | After |
|---|---|
| Arm the polygon tool in the VS Code map. Hide and re-show the panel, or run "Developer: Reload Webviews". The toolbar silently snaps back to "no tool selected" and you have to re-click. | Arm the polygon tool. Trigger the same rebuild. The toolbar comes back armed on the same tool, with the same palette colour, and you can keep drawing without breaking stride. |

## What We Built

When you armed a drawing tool in the VS Code map panel, the armed state lived in a React `useState` hook inside the webview. The moment that webview rebuilt — hide/show the panel, "Developer: Reload Webviews", or any layout change that forced a remount — the local state was thrown away and the tool silently disarmed. You were left looking at a toolbar that had helpfully reset itself to "no tool" without telling you.

This change moves the drawing mode and palette index out of component-local state and onto the existing `session-state` spatial slice, so they survive a webview rebuild. The architectural rule is simple: anything that is part of the user's session — the armed tool, the colour they picked, the time slider, the display mode — belongs in the store, not in a transient React hook. Drawing mode was the last hold-out, and it is the one users actually notice when it breaks.

## How It Fits

This closes findings F-3.1 and F-3.2 from the architectural-consistency review (Epic E06). Most of the wiring already existed from an earlier PR: the web-shell reads drawing values from the store, the VS Code host subscribes to the spatial slice and forwards changes across the message bridge, and the webview round-trips toolbar clicks back as `drawingModeChanged`. The one remaining gap was the bootstrap path — when a new webview came up and sent `webviewReady`, the host seeded it with current time and display mode but not with current drawing mode or palette index. So the store kept the right value across a rebuild; the webview just never asked for it on the way back in. Two `postMessage` calls in the existing `webviewReady` handler close the loop.

## Screenshots

**Before reload** — polygon tool armed, palette set to entry 1.

![VS Code map toolbar with the polygon tool highlighted, ready to draw.](/assets/images/future-debrief/shipped-drawing-mode-session-state/vscode-toolbar-armed-before-reload.png)

**After reload** — same session, same toolbar state.

![VS Code map toolbar still showing the polygon tool highlighted after a webview rebuild.](/assets/images/future-debrief/shipped-drawing-mode-session-state/vscode-toolbar-armed-after-reload.png)

The wiring also exposes drawing state to any reader, not just the map component. The web-shell console can now observe and mutate the drawing mode directly from the store.

![Web shell with the developer console reading window.__sessionStore.getState().drawingMode and getting 'polygon' back.](/assets/images/future-debrief/shipped-drawing-mode-session-state/webshell-drawing-mode-store-handle.png)

## By the Numbers

| Metric | Count |
|--------|-------|
| Feature tests | 13/13 passing |
| Vitest (VS Code message bridge) | 5 tests |
| Vitest (session-state observability) | 4 tests |
| Playwright (web-shell store wiring) | 4 tests |
| Production changes | ~30 lines in `mapPanel.ts` |
| Pre-existing regression coverage | 7 drawing toolbar tests, all pass |
| Full CI gate | Ruff, pyright, ESLint, tsc, pytest, vitest — all green |
| TypeScript unit tests (monorepo-wide) | 3,664 passed |
| Python tests (monorepo-wide) | 1,887 passed |

## Lessons Learned

- **Gap-fill beats rewrite.** The architectural review uncovered this gap after the main session-state plumbing had already landed. Rather than re-architecting the message bridge, we added two missing seed messages to an existing handler — about 30–60 lines of production change. The rule is useful: if 90% of the wiring exists and works, do not rewrite it.

- **Webview iframes cannot import the host store; a host-driven mirror is the legitimate pattern.** The webview is isolated and cannot directly import the store. Some local React state is not just acceptable but necessary. What matters is that it is host-driven — the host is the authority, the webview is a read-cache. The fix documents this explicitly in code so future maintainers do not treat the `useState` as a bug.

- **Pin contracts at the message boundary with Vitest, not Playwright on real VS Code.** Playwright against the Extension Development Host has been unreliable in CI. For anything that lives in the host-webview protocol, a deterministic unit test on `handleWebviewMessage('webviewReady', …)` is more honest and faster than trying to automate VS Code chrome under xvfb. The web-shell regression suite stays on Playwright, where the browser environment is well-supported.

- **Expose test-mode store handles unconditionally; do not gate behind `import.meta.env`.** The spec originally proposed `if (import.meta.env.DEV) window.__sessionStore = …`, but that creates two handles in development and zero in a production test. Instead, the handle is always set (only in webview context where it is safe). It is either used or harmlessly ignored.

## What's Next

The same `webviewReady` flush pattern can absorb any future host→webview seeding without re-architecting. Remaining epic items (F-3.3 result-layer lifecycle, F-3.5 tool-undo gap) have their own scopes and do not need architectural changes here.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/108-drawing-mode-session-state/spec.md)
→ [View the evidence](https://github.com/debrief/debrief-future/tree/main/specs/108-drawing-mode-session-state/evidence)
