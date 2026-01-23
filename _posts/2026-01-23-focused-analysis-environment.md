---
layout: future-post
title: "Shipped: Focused Analysis Environment"
date: 2026-01-23
track: [momentum]
author: Ian
reading_time: 2
tags: [vscode-extension, ux, tracer-bullet]
excerpt: "VS Code activity bar now shows only what matters for maritime analysis"
---

## What We Built

The Debrief VS Code extension now automatically hides non-essential activity bar items when it activates. Instead of seeing Explorer, Search, Source Control, Debug, Extensions, and Testing, analysts see just two activities: **Explorer** (for browsing STAC stores) and **Debrief** (for analysis tools).

Five distractions removed. Zero functionality lost. The hidden activities still work if you need them — right-click the activity bar to restore any of them.

## How It Works

On first activation, the extension modifies VS Code's `workbench.activity.pinnedViewlets2` setting to hide:
- Search
- Source Control
- Run and Debug
- Extensions
- Testing

The hiding is **reversible** and **respects user choice**:
- Right-click activity bar → Show hidden activities
- Command Palette → `Debrief: Restore Default Activities`
- Settings → `debrief.hideActivities.enabled: false`

If you re-enable an activity manually, it stays visible on subsequent launches. We track your choices and don't override them.

## Technical Details

The implementation adds an `ActivityBarService` that:
1. Checks if hiding is enabled (default: yes)
2. Checks if this is the first run
3. Modifies visibility for target activities only
4. Stores a snapshot to detect user overrides later

**76 tests pass**, including tests for:
- First-run hiding behavior
- Protected views (Explorer and Debrief never hidden)
- User override detection
- Restore command functionality

All operations are local. No network calls. Works completely offline.

## Configuration

```json
{
  "debrief.hideActivities.enabled": true,
  "debrief.hideActivities.viewIds": [
    "workbench.view.search",
    "workbench.view.scm",
    "workbench.view.debug",
    "workbench.view.extensions",
    "workbench.view.testing"
  ]
}
```

Advanced users can customize which activities get hidden.

## What's Next

This is the first of several UX improvements for the analysis environment. Next up: workspace configuration and panel layouts that make better use of screen real estate for map-centric workflows.

> [View the PR](https://github.com/debrief/debrief-future/pull/74) | [Read the spec](https://github.com/debrief/debrief-future/blob/main/specs/017-vscode-hide-activities/spec.md)
