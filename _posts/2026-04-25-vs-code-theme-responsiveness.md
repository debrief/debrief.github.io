---
layout: future-post
title: "Building VS Code Theme Responsiveness"
date: 2026-04-25
tags: [vscode, theming, accessibility, storybook, playwright]
spec: 220-fix-theme-responsiveness
track: credibility
author: Ian
reading_time: 6
excerpt: "Every Debrief panel now reflects the active VS Code theme on load and re-themes within 1s on switch — including high-contrast variants."
---

## What We're Building

Every Debrief webview panel now reflects the active VS Code colour theme on initial load, and updates within a second when you switch themes — including the two high-contrast variants. Until this change, only the Storyboard panel respected your theme; the other six panels (Log, Activity, Map, Results, Time Controller, Catalog Overview) mounted without a theme context, so they rendered against a hardcoded dark fallback regardless of what you'd chosen in VS Code.

The same fix extends to Storybook. Components that read `var(--vscode-foreground, ...)` previously had no `--vscode-*` variables defined when shown in isolation, so every story silently fell through to its fallback colour. The Storybook theme decorator now injects a real palette for each of the four explicit variants — Light, Dark, High Contrast, High Contrast Light — sourced from VS Code's own default themes. What you see in Storybook now matches what you see in the extension.

## How It Fits

This is pure UI wiring. No Python service is touched, no new runtime dependencies, no schema changes. The fix sits across three surfaces in the existing architecture: the shared `ThemeProvider` in `shared/components/`, the seven webview entries in the VS Code extension, and the Storybook decorator. A small (~30 line) extension-host file relays VS Code's `onDidChangeActiveColorTheme` events into the webview message channel, completing a loop the webview was already listening on. Most of the pieces existed already — they just weren't connected.

## Key Decisions

- **Two redundant signals for runtime theme changes.** A `MutationObserver` watches the webview's `document.body` class for `vscode-light` / `vscode-dark` / `vscode-high-contrast` / `vscode-high-contrast-light`, and the extension host also posts a `vscode-theme-changed` message on `onDidChangeActiveColorTheme`. Whichever fires first wins. Belt-and-braces, because losing a theme update is a worse outcome than handling it twice.

- **High-contrast as a first-class variant, not an afterthought.** The variant union is now `light | dark | high-contrast-light | high-contrast-dark | system`, matching VS Code's body-class taxonomy 1:1. Components also get a derived `isHighContrast` flag for cases where accessibility-sensitive styling needs to diverge from the regular light/dark split. DSTL analysts on Windows often run high-contrast themes — collapsing them into "dark" was wrong.

- **Retired the muddled `'vscode'` variant.** The old union had `light | dark | vscode | system`, where `'vscode'` meant "whatever VS Code is currently using". That's now expressible directly with the explicit variants plus `system`, so the ambiguous value goes away. No deprecation shim — we're pre-1.0 and Article XIV gives us the freedom to delete rather than carry baggage.

- **One bootstrap file for all seven webview entries.** Rather than copy-paste a `<ThemeProvider>` wrapper into each entry point, a shared `_bootstrap.tsx` does the wrapping once. Adding the eighth panel — or fixing a future bug in the wrapping pattern — becomes a one-line change instead of seven.

- **Storybook gets a real `--vscode-*` token map.** A single `vscode-token-map.ts` provides palette values for each variant, drawn from VS Code's "Default Light+", "Default Dark+", "Default High Contrast", and "Default High Contrast Light" themes. The decorator writes them onto `documentElement` on every render. This is the only genuinely new concept in the change; everything else is wiring existing parts together.

## Screenshots

Storybook's theme toolbar now exposes all four explicit variants plus `System`. Each renders the LogPanel against the correct palette — no more dark fallback bleed-through.

| Variant | Screenshot |
|---|---|
| Light | `evidence/screenshots/logpanel-light.png` |
| Dark | `evidence/screenshots/logpanel-dark.png` |
| High Contrast Light | `evidence/screenshots/logpanel-high-contrast-light.png` |
| High Contrast Dark | `evidence/screenshots/logpanel-high-contrast-dark.png` |

Every panel together (LogPanel + ActivityPanel + MapView + ResultsPanel + TimeController + CatalogOverview + StoryboardPanel) in the same variant shows visual harmony — the consistency check from US2:

| Composite | Screenshot |
|---|---|
| All panels — Dark | `evidence/screenshots/all-panels-dark.png` |
| All panels — High Contrast Dark | `evidence/screenshots/all-panels-high-contrast-dark.png` |

The runtime-switch demo cycles through every variant in a single VS Code session:

`evidence/screenshots/interaction.gif`

## By the Numbers

| Metric | Value |
|---|---|
| Webview entries wired through `<Bootstrap>` | 7 |
| Variants in the new flat union | 4 explicit + 1 system |
| Legacy `'vscode'` variant references after audit | 0 (T070 grep) |
| `--vscode-*` keys per variant in the token map | 50 (structural parity enforced) |
| New runtime dependencies | 0 |
| Files in `no-hardcoded-colours` snapshot allowlist | 33 (incremental migration) |
| New Vitest test files | 6 |
| New Playwright spec files | 3 |

## Lessons Learned

The bug that started this feature wasn't a single defect — it was a **chain of three orphaned pieces** that each looked plausible in isolation. `setupVSCodeThemeSync()` was correctly implemented but had zero callers. Six of seven webview entries mounted React without a `ThemeProvider`. The Storybook decorator passed `theme={{ variant: 'vscode' }}` but no `--vscode-*` values were ever injected, so every component fell through to its hardcoded dark fallback. Each fix on its own would have looked like progress; together they form a working pipeline. The lesson: when a system spans three boundaries (host → webview → React tree), the absence of failure at any single boundary doesn't mean the pipeline works — the visible symptom only appears when one specific piece is missing.

The second lesson is about **retiring legacy values**. The `'vscode'` variant was a synonym for "use VS Code tokens", but with no concrete value it carried zero structural information that the four explicit variants don't. It also forced a runtime `isVSCodeEnvironment()` check whose `getComputedStyle` fallback produced a false-positive when Storybook injected synthetic `--vscode-*` values — a bug that bit twice during the #209 audit. Pre-1.0 freedom (Article XIV) lets us simply delete it; the absence of a deprecation shim makes the codebase one less ambiguous concept harder to reason about. We'll do this again whenever we find a value that's just an alias.

The third lesson is **incremental gates**. The `no-hardcoded-colours` static check in `__tests__/` snapshots the existing 33 files that have literals and only fails on regressions. Migrating all of them at once would have ballooned the PR. Locking the current state and letting the migration happen file-by-file as components are touched anyway is a much smaller, much safer change. The gate is the contract; the cleanup is incremental.

## What's Next

- **Migrate snapshot-allowlist files to `var(--…)` tokens.** Each file in `FILE_SNAPSHOT_ALLOWLIST` is a candidate for incremental cleanup. Removing an entry requires no other change — the gate just enforces the new state.
- **Re-run the #209 LogPanel a11y audit.** Now that the four explicit variants render correctly in Storybook, the `@axe-core/playwright` audit can run trustworthily across all four — closing the gap that motivated the original spec.
- **Document the `useTheme()` API for community contributors.** With `isHighContrast` now in context and the `ThemeSource` abstraction in place, third-party panel authors can wire themselves up without per-component theme detection. A short example in `docs/storybook-vscode-theming.md` is the next iteration.
