---
layout: future-post
title: "Shipped: SpecKit UI Workflow Enhancement"
date: 2026-01-11
track: "Shipped · This Week"
author: Ian
reading_time: 3
tags: [speckit, tooling, developer-experience, shipped]
excerpt: "SpecKit now detects UI features and generates interaction design sections automatically."
---

## What We Built

SpecKit now distinguishes between UI features and backend services. When you run `/speckit.specify` with a description mentioning "dialog", "wizard", or "dashboard", the generated specification includes a dedicated section for capturing interaction design details: what decisions users face, how screens progress, and what different states look like.

We discovered this gap when specifying the Loader Mini-App. The functional requirements were solid: load a file, select a store, create a plot. But nothing captured *how* users would experience it. Single screen or wizard? What decisions would they face? What would error states look like? These details surfaced during clarification, forcing backtracking that could have been avoided.

## How It Works

The enhancement adds keyword-based feature detection to the `/speckit.specify` command. Three lists drive the logic:

**UI Triggers** (include UI section):
`dialog`, `screen`, `form`, `wizard`, `app`, `window`, `dashboard`, `modal`, `picker`

**Service Indicators** (no UI section):
`API`, `service`, `backend`, `parser`, `processor`, `handler`

**CLI Indicators** (no UI section):
`command`, `terminal`, `CLI`, `shell`

The precedence rule is simple: if *any* UI keyword appears, include the UI section. A description like "API with admin dashboard" generates the UI section because "dashboard" is a UI indicator.

When the UI section is included, it contains:
- **Decision Analysis**: What is the user trying to accomplish? What choices must they make?
- **Screen Progression**: A table showing state transitions through the happy path
- **UI States**: What the interface shows in empty, loading, error, and success conditions

Validation adapts accordingly. UI specs get additional checks for decision analysis and screen progression. Non-UI specs skip these items entirely.

## Lessons Learned

**Simple detection works.** Keyword matching is predictable and maintainable. Users can learn which words trigger UI sections. No ML, no NLP, no external dependencies.

**Backward compatibility removes barriers.** The UI section is optional. Existing specs (000-003) pass validation without modification. Teams can adopt the enhancement without rework.

**The gap was real.** Every UI feature we specified before this enhancement was missing interaction design details. Capturing them at specification time reduces clarification cycles and gives reviewers a clearer picture of the proposed experience.

## What's Next

Potential follow-on work:
- A dedicated `/speckit.ux` command for deeper interaction design exploration
- Integration with `/speckit.clarify` to prioritize UI-related questions
- ASCII wireframe support in the template

→ [View the PR](https://github.com/debrief/debrief-future/pulls)
→ [Try it yourself](https://github.com/debrief/debrief-future/blob/main/.claude/commands/speckit.specify.md)
