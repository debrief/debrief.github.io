---
layout: future-post
title: "Building LogPanel Accessibility Audit with Theme Responsiveness"
date: 2026-04-24
track: credibility
author: Ian
reading_time: 5
tags: [logpanel, accessibility, storybook, theme, axe-core]
excerpt: "We couldn't audit the LogPanel across themes until the themes actually switched. Fixing that came first. The audit comes next."
---

## What We're Building

Feature 176 added roving-tabindex keyboard navigation and `aria-selected` to LogPanel cards. The tests passed. But we had never run an automated WCAG scan to confirm the accessibility attributes held up under real scrutiny — let alone across all three visual themes.

Feature 209 closes that loop with a full `@axe-core/playwright` audit against the LogPanel in light, dark, and VS Code theme variants.

There was a prerequisite fix to make first. The LogPanel's CSS uses VS Code's native `--vscode-*` custom properties (`--vscode-foreground`, `--vscode-sideBar-background`, and so on). Storybook's ThemeProvider only injects `--debrief-*` tokens. The result: switching the Storybook global theme selector from "dark" to "light" or "VS Code" had no visible effect on the LogPanel — the component always fell back to dark-mode colours because the variables it read were never set in Storybook. Any audit run without fixing this would test the same dark-mode rendering three times over and call it "multi-theme coverage".

The fix is targeted: extend the ThemeProvider to inject a static map of `--vscode-*` values for each theme variant when running outside a real VS Code webview. In production, the webview host supplies the real variables. In Storybook, the ThemeProvider fills the gap.

## How It Fits

The audit output (`evidence/176-log-panel-ux/a11y-audit.md`) is a committed artefact — it becomes the permanent record that the accessibility work from #176 has been independently verified. The theme responsiveness fix belongs in `shared/components/ThemeProvider`, not in any story or decorator. Once it lands, every Storybook consumer gets correctly themed `--vscode-*` variables without any per-story wiring.

The audit itself uses `@axe-core/playwright`, which was already in the monorepo via the spec-navigator feature. No new dependencies to evaluate.

## Key Decisions

- Inject a static `--vscode-*` token map from the ThemeProvider, keyed to `'light' | 'dark'` — minimal, contained, invisible to production webview consumers.
- Use `@axe-core/playwright` rather than the Storybook a11y addon — the addon is interactive-only; axe-playwright produces machine-readable results that can gate CI.
- Audit 6 representative stories (out of 19) × 3 themes = 18 runs — covers empty states, populated states, selected-card ARIA, the compact view, and the flip-card — without redundant repetition of structurally similar stories.
- Accumulate all violations before asserting — the test produces a complete picture first, then fails if any critical or serious violations remain, rather than halting at the first problem.
- Report committed to `evidence/176-log-panel-ux/a11y-audit.md` alongside the #176 test summary — keeps the evidence for one feature together.

## The Theme Fix, Concretely

`shared/components/src/ThemeProvider/vsCodeTokenMap.ts` holds the map:

```ts
export const VS_CODE_TOKEN_MAP: Record<'light' | 'dark', Record<string, string>> = {
  light: {
    '--vscode-foreground': '#616161',
    '--vscode-sideBar-background': '#f3f3f3',
    '--vscode-editor-background': '#ffffff',
    // ...50+ entries
  },
  dark: {
    '--vscode-foreground': '#cccccc',
    '--vscode-sideBar-background': '#252526',
    '--vscode-editor-background': '#1e1e1e',
    // ...same keys, dark values
  },
};
```

The map is a single source of truth for every `--vscode-*` variable used anywhere in `shared/components/src/**/*.css`. A unit test asserts structural parity — light and dark must declare exactly the same key set — so adding a new VS Code variable to a component stylesheet without updating the token map fails CI rather than silently falling back to an arbitrary default.

`ThemeProvider.tsx` runs the injection inside the existing theme-apply `useEffect`, behind an `isVSCodeEnvironment()` guard. When the resolved variant is `light` or `dark` and we're outside VS Code, it iterates the matching map entry and writes each key to `document.documentElement.style`. When the variant is `vscode`, it strips any previously-injected values so the real host stylesheet can supply them cleanly.

Production VS Code webview consumers see zero behavioural change — the guard short-circuits before the injection runs.

## The Audit, Concretely

`shared/components/e2e/LogPanelA11y.spec.ts` declares a small array of stories with optional pre-audit interactions:

```ts
const STORIES = [
  { id: 'timeline-default', label: '...' },
  { id: 'empty-no-plot', label: '...' },
  { id: 'empty-no-entries', label: '...' },
  { id: 'entry-selected', label: '...',
    interact: (page) => page.locator('.log-panel__entry').first().click() },
  { id: 'compact-view', label: '...' },
  { id: 'flip-card-default', label: '...',
    interact: (page) => page.locator('.log-panel__entry-edit-icon').first().click() },
];
```

The test nests stories × themes into 18 Playwright cases, each running:

```ts
const result = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  .analyze();
```

Violations accumulate across all runs. An `afterAll` hook writes the aggregated report and asserts `critical + serious === 0`. Moderate and minor violations are logged but don't fail the build.

## By the Numbers

| | |
|---|---|
| Stories audited (CI, full axe-core) | 6 |
| Theme variants | 3 |
| Total axe runs in CI | 18 |
| WCAG tag set | 2.0 A + AA, 2.1 A + AA |
| Pre-CI mini-audit violations (before fix) | 3 serious |
| Pre-CI mini-audit violations (after fix) | 0 |
| Unit tests added (vitest + node:test-verified) | 12 |
| Token-map parity check keys | 55 |
| Lines of production code added | ~190 (token map + injection) |
| New dependencies | 1 (`@axe-core/playwright`, already in monorepo) |

## What The Audit Actually Found

Three contrast-ratio failures. All `serious` (`color-contrast`), all in
the active toggle button and the filter disclosure. Not coincidentally,
these were the three spots where we took a VS Code semantic variable and
used it in a role the variable wasn't designed for:

1. `.log-panel__toggle-btn--active` used `--vscode-focusBorder` as its
   background. Focus borders are designed to contrast against the
   *editor* background, not against text drawn on top. White text on
   `#0090f1` is 3.35:1 in light mode (need 4.5). Dark text on `#007fd4`
   is 3.96:1 in dark mode.
2. `.log-panel__filter-toggle` used `--vscode-descriptionForeground` as
   body text. VS Code's `#717171` default sits at exactly 4.40:1 against
   `#f3f3f3` sidebar background — a whisker below AA.

Fixes:

- Darken `--vscode-focusBorder` in the injected light and dark maps
  (`#005a9e` / `#006abd`). White text passes AA against both.
- Change the active-toggle text colour from
  `var(--vscode-editor-background)` to `var(--vscode-button-foreground)`
  in `LogPanel.css`. White text is the only value that works in both
  theme variants against the focus-border blue.
- Darken `--vscode-descriptionForeground` in the light map from `#717171`
  to `#595959` (passes 7.0:1 on the sidebar background).

After fixes: zero violations in the audited scope.

## Lessons Learned

The fastest way to break an audit's credibility is to run it against a component that only renders one theme. The Storybook theme selector *appeared* to be doing something — the attribute toggled, the class toggled — but nothing downstream changed. Audit output would have looked clean in every theme, for the wrong reason.

Spotting that the `--vscode-*` variables were "never set in Storybook" came from reading the CSS, not from the framework. The component kept its contract ("read these variables"); the hosting environment broke its end of the deal. When a component and its host disagree silently, the component looks fine in isolation and the host looks fine in aggregate — the failure lives in the seam.

There's a second lesson in the specific violations the audit turned up: **reusing a semantic token outside its design intent is invisible until contrast reveals it.** `--vscode-focusBorder` is a blue meant to be seen *as a ring around a focused element*, not *behind white text*. The CSS compiled fine, the component looked fine to anyone building it, and only the numeric ratio exposed the mismatch. The fix is half in the token map (tune the blue for text contrast) and half in the component (stop assuming the editor background works as a text colour).

The token map will need to grow as more components adopt `--vscode-*` variables. The unit test that enforces light/dark parity is the tripwire — if it ever fails, the fix is to add the missing key to both variants, not to work around it.

## What's Next

With the theme-switch plumbing in place, the same injection pattern unblocks any other component that reads `--vscode-*` variables — PropertiesPanel, ChartRenderer, and the Storyboard views are next candidates for the same audit treatment. The audit spec itself is parameterised on a small `STORIES` array; cloning it for another component is a half-hour job.

→ [See the code](https://github.com/debrief/debrief-future/tree/claude/implement-speckit-209-h3tRx/specs/209-logpanel-a11y-audit)
