---
layout: future-post
title: "Shipped: VS Code theme responsiveness across every panel"
date: 2026-04-25
track: [credibility]
author: Ian
reading_time: 3
tags: [vscode-extension, theming, accessibility, storybook, testing]
excerpt: Every Debrief panel now reflects the active VS Code theme on load and re-themes within 1s on switch, including high-contrast variants.
---

## What We Built

Every Debrief webview panel now reflects the active VS Code colour
theme on initial load, and updates within a second when you switch
themes — including the two high-contrast variants. Until this change,
only the Storyboard panel respected your theme; the other six panels
(Log, Activity, Map, Results, Time Controller, Catalog Overview)
mounted without a theme context, so they rendered against a hardcoded
dark fallback regardless of what you'd chosen in VS Code.

The same fix extends to Storybook. Components that read
`var(--vscode-foreground, ...)` previously had no `--vscode-*`
variables defined when shown in isolation, so every story silently
fell through to its fallback colour. The Storybook theme decorator
now injects a real palette for each of the four explicit variants —
Light, Dark, High Contrast Light, High Contrast Dark — sourced from
VS Code's own default themes. What you see in Storybook now matches
what you see in the extension.

## How It Works

This is pure UI wiring. No Python service is touched, no new runtime
dependencies, no schema changes. The fix sits across three surfaces
in the existing architecture: the shared `ThemeProvider` in
`shared/components/`, the seven webview entries in the VS Code
extension, and the Storybook decorator. A small extension-host file
relays VS Code's `onDidChangeActiveColorTheme` events into the webview
message channel, completing a loop the webview was already listening
on. Most of the pieces existed already — they just weren't connected.

A shared `_bootstrap.tsx` does the `<ThemeProvider>` wrapping once for
all seven webview entries. Adding the eighth panel — or fixing a
future bug in the wrapping pattern — becomes a one-line change instead
of seven. The Storybook side gets a single `vscode-token-map.ts` with
roughly 50 `--vscode-*` keys per variant, drawn from the four default
themes that ship with VS Code. The decorator writes them onto
`documentElement` on every render.

## Key Decisions

- **Two redundant signals for runtime theme changes.** A
  `MutationObserver` watches the webview's `document.body` class for
  `vscode-light` / `vscode-dark` / `vscode-high-contrast` /
  `vscode-high-contrast-light`, and the extension host also posts a
  `vscode-theme-changed` message on `onDidChangeActiveColorTheme`.
  Whichever fires first wins. Belt-and-braces — losing a theme update
  is a worse outcome than handling it twice.

- **High-contrast as a first-class variant.** The variant union is
  now `light | dark | high-contrast-light | high-contrast-dark |
  system`, matching VS Code's body-class taxonomy 1:1. Components
  also get a derived `isHighContrast` flag for cases where
  accessibility-sensitive styling needs to diverge from the regular
  light/dark split. DSTL analysts on Windows often run high-contrast
  themes — collapsing them into "dark" was wrong.

- **Retired the muddled `'vscode'` variant.** The old union had
  `light | dark | vscode | system`, where `'vscode'` meant "whatever
  VS Code is currently using". That's now expressible directly with
  the explicit variants plus `system`, so the ambiguous value goes
  away. No deprecation shim — we're pre-1.0 and Article XIV gives us
  the freedom to delete rather than carry baggage.

- **Incremental gate for hardcoded colours.** A `no-hardcoded-colours`
  static check snapshots the existing 33 files that still use literal
  colour values and only fails on regressions. Locking the current
  state and letting the migration happen file-by-file as components
  are touched anyway is a much smaller, much safer change than a
  big-bang rewrite.

## What Held Us Up

The bug that started this feature wasn't a single defect — it was a
chain of three orphaned pieces that each looked plausible in
isolation. `setupVSCodeThemeSync()` was correctly implemented but had
zero callers. Six of seven webview entries mounted React without a
`ThemeProvider`. The Storybook decorator passed
`theme={{ variant: 'vscode' }}` but no `--vscode-*` values were ever
injected, so every component fell through to its hardcoded dark
fallback. Each fix on its own would have looked like progress;
together they form a working pipeline. When a system spans three
boundaries (host → webview → React tree), the absence of failure at
any single boundary doesn't mean the pipeline works.

## What's Next

The 33 files in the snapshot allowlist are now candidates for
incremental cleanup as components get touched. With the four explicit
variants rendering correctly in Storybook, the deferred LogPanel
axe-core audit can finally run trustworthily across all of them — the
gap that motivated the original spec.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/220-fix-theme-responsiveness/spec.md)
→ [View the evidence](https://github.com/debrief/debrief-future/tree/main/specs/220-fix-theme-responsiveness/evidence)
