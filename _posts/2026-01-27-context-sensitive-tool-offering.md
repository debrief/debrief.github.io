---
layout: future-post
title: "Shipped: Context-Sensitive Tool Offering in VS Code"
date: 2026-01-27
track: "Shipped · VS Code Extension"
author: Ian
reading_time: 4
tags: [tracer-bullet, vscode-extension, tool-matching, analysis-tools]
excerpt: "Analysis tools now appear based on selection in VS Code, with three access points and provenance on every result."
---

## What We Built

The VS Code extension now shows you which analysis tools work with your current selection. Select two tracks on the map, get tools that operate on two tracks. Select one track and a reference point, different tools appear. Right-click for quick access, use Command Palette for keyboard workflows, or browse the sidebar panel.

ToolMatchAdapter bridges session-state's selection to the matching service we built in #027. The adapter converts feature IDs to kind counts — session-state tracks which features are selected, the adapter looks up what kinds they are (TRACK, POINT, CIRCLE, etc), and ToolMatchService evaluates tool requirements against those counts.

Tools panel shows active tools by default. Enable "show inactive tools" and you see explanations: "Range & Bearing (inactive): Need 2 TRACK, have 1". Click an active tool, it executes via debrief-calc, results appear on the map with full provenance metadata.

## How It Connects

Three pieces came together:

**ToolMatchService** (#027) — the matching logic that evaluates tools against selections. We built and tested this in Storybook weeks ago. Now it's integrated.

**SessionManager** (#029) — centralised selection state. When you select features in the map panel, session-state broadcasts that change. The tool adapter subscribes and updates immediately.

**CalcService** — the bridge to debrief-calc's MCP server. Caches tool metadata with a 60-second TTL. Executes tools, creates result layers with provenance, persists to STAC.

The ToolMatchAdapter converts between these contexts. Session-state deals in feature IDs. ToolMatchService deals in kind counts. The adapter has a callback to look up feature kinds from the active collection and does the conversion in-memory.

## Three Access Points

**Sidebar Tools Panel**: Browse all available tools, see descriptions, enable the inactive toggle to understand requirements. Click a tool to execute.

**Context Menu**: Right-click selected features, see applicable tools in a "Tools" submenu. Fastest path for repetitive workflows.

**Command Palette**: Type "Debrief:" and see tool commands. VS Code's `when` clauses hide inapplicable tools automatically. Keyboard-driven workflows work.

All three surfaces share the same underlying state. Selection changes propagate through session-state, adapter recomputes matches, UI surfaces update.

## Provenance on Every Result

Tool execution produces result layers with inline provenance metadata:

```json
{
  "type": "Feature",
  "properties": {
    "provenance": {
      "toolName": "Range & Bearing",
      "toolVersion": "1.0.0",
      "executionTime": "2026-01-27T23:15:42.123Z",
      "sourceFeatureIds": ["track-hms-defender", "track-uss-freedom"],
      "duration": 523
    }
  }
}
```

Every computed result traces back to its inputs. No separate provenance documents to maintain. Query the feature, get its lineage.

## Testing Approach

237 tests pass across 15 test files. The new adapter tests (14 tests) verify selection conversion, kind lookups, and fallback handling when features aren't found. CalcService tests (8 tests) verify tool execution lifecycle and result layer creation.

Extended test data in `apps/vscode/test-data/local-store/` to include all supported feature kinds: tracks, circles, rectangles, lines, vectors, and point types. The adapter needs variety to verify kind grouping works correctly.

## Lessons Learned

The adapter pattern worked well. Session-state stays generic (just feature IDs), the adapter adds Debrief-specific knowledge (feature kinds). Testing the adapter in isolation was straightforward because it's pure conversion logic with a callback for kind lookup.

VS Code's Command Palette doesn't support disabled commands with explanations. You can only show or hide commands via `when` clauses. That's why inactive tools live in the sidebar panel only — the panel can show grayed items with text. Command Palette just hides inapplicable tools.

Inline provenance was simpler than linking to separate documents. The Constitution requires provenance; we chose the simplest implementation that satisfies it. Future work might add queryable provenance relationships, but for now, results carry their own metadata.

CalcService caching (60-second TTL) prevents re-fetching tool metadata on every selection change. Tool inventories don't change frequently. If debrief-calc restarts or tools are added, waiting 60 seconds for refresh is acceptable.

## What's Next

This completes the tool offering integration. The matching service (Phase 0-2 in #027) is now wired into VS Code (Phase 3). Analysts can discover tools, execute them, and trace results.

Future enhancements might include tool search/filtering, tool categories, or parameter UI for tools that accept user inputs. This iteration covers parameterless tools operating on selection only.

→ [See the feature PR](https://github.com/debrief/debrief-future/pull/125)
