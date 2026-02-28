---
layout: future-post
title: "Shipped: Epic Support for Large Feature Breakdown"
date: 2026-01-23
track: [credibility]
author: Ian
reading_time: 3
tags: [ai, workflow, agile]
excerpt: "AI-assisted breakdown of large features into deliverable backlog items with full traceability."
---

We've shipped the `/epic` command—AI-assisted breakdown of large features into deliverable backlog items with full traceability.

## What We Built

Large features like Storyboarding don't fit single backlog items. The `/epic` command uses Opus as both Business Analyst and Technical Architect to decompose them into 3-10 independently valuable items.

### The Workflow

```
/epic docs/feature-spec.md
    ↓
Parse input (text, local path, or GitHub URL)
    ↓
Opus analysis (BA + Architect roles)
    ↓
Generate 3-10 items with:
  - [Ex] prefix for traceability
  - Category, complexity, dependencies
    ↓
Update BACKLOG.md (Epics table + Items table)
    ↓
Create GitHub issues (with offline fallback)
```

### Key Features

**Three input modes**: Feed it a text description, local markdown file, or GitHub URL. The command fetches and parses whatever you provide.

**Opus-powered analysis**: The breakdown follows clear principles—vertical slices over horizontal layers, infrastructure first if it unblocks, research spikes early to reduce uncertainty.

**Full traceability**: Items get an `[E01]` prefix linking back to their parent epic. The Epics table tracks status and child items.

**Offline support**: Core breakdown works without network. GitHub issues are created when `gh` is available, with fallback to local files.

## Example Output

```markdown
## Epic Created: E01 - Storyboarding Briefings

### Breakdown (7 items)

| ID | Category | Title | Complexity |
|----|----------|-------|------------|
| 024 | Infrastructure | [E01] Add storyboard schema | Low |
| 025 | Feature | [E01] Create storyboard panel | Medium |
| 026 | Feature | [E01] Implement scene capture | Medium |
...

### Next Steps
1. Score items with backlog-prioritizer
2. Approve with the-ideas-guy
3. Start with /speckit.start {ID}
```

## Technical Details

The command is implemented as a Claude Code skill at `.claude/commands/epic.md`. It's a prompt-based workflow that orchestrates:

- Input parsing and document fetching
- Opus model analysis with structured guidelines
- BACKLOG.md table manipulation
- GitHub issue creation via `gh` CLI

No new code dependencies—just workflow orchestration using existing tools.

## What's Next

The first epic to use this workflow will be Storyboarding Briefings—a feature complex enough to validate the decomposition approach. Stay tuned for that breakdown.

---

*Epic workflow support is live. Try `/epic` with your next large feature.*
