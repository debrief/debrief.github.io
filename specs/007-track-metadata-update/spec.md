# Specification: Track Metadata Schema Update

## Overview
This specification updates how blog post `track` metadata is defined and used. The change enables clickable track filtering on the Future Debrief website by standardizing track values to a controlled vocabulary.

## Problem Statement
The current track format uses free-form strings like "Shipped · Stage 2" or "Planning · This Week". This approach:
- Requires keyword matching heuristics in the filter JavaScript
- Makes it difficult to reliably categorize posts
- Doesn't support posts belonging to multiple tracks

## Solution
Replace the free-form track string with a YAML array containing one or more standardized track values.

## Track Vocabulary

| Track | Purpose | When to Use |
|-------|---------|-------------|
| `momentum` | Progress is visible | Planning posts, progress updates, work in motion |
| `credibility` | Capability demonstrated | Shipped posts, milestones achieved, technical proof |
| `desire` | Future becomes tangible | Vision posts, roadmap items, upcoming capabilities |

## Implementation

### Post Front Matter Format

**Before:**
```yaml
track: "Shipped · Stage 2"
```

**After:**
```yaml
track: [credibility]
```

**Multiple tracks (when applicable):**
```yaml
track: [momentum, credibility]
```

### Mapping Rules

When creating new posts:

| Post Type | Track Value |
|-----------|-------------|
| Planning posts | `[momentum]` |
| Shipped posts | `[credibility]` |
| Technical deep-dives | `[credibility]` |
| Milestone announcements | `[credibility]` |
| Vision/roadmap posts | `[desire]` |
| Future capability previews | `[desire]` |
| Progress updates with delivery | `[momentum, credibility]` |

## Content Agent Changes

Update `.claude/agents/media/content.md` with the following modifications:

### Front Matter Requirements Section

Replace the track row in the front matter table:

**Before:**
```markdown
| `track` | "Type · Context" format |
```

**After:**
```markdown
| `track` | Array of track values: `momentum`, `credibility`, `desire` |
```

### Track Value Examples Section

Replace the existing Track Value Examples section:

**Before:**
```markdown
### Track Value Examples
- Planning: `"Planning · This Week"`
- Shipped: `"Shipped · [component-name]"`
- Technical: `"Technical · Deep Dive"`
- Milestone: `"Momentum · [milestone-name]"`
```

**After:**
```markdown
### Track Value Selection

Posts must include one or more track values from:

| Track | Use When |
|-------|----------|
| `momentum` | Announcing plans, sharing progress, work in motion |
| `credibility` | Delivering features, hitting milestones, proving capability |
| `desire` | Painting the future, roadmap items, vision pieces |

**Examples:**
- Planning post: `track: [momentum]`
- Shipped post: `track: [credibility]`
- Major milestone with roadmap implications: `track: [credibility, desire]`
- Progress update showing ongoing work: `track: [momentum]`
```

### Pre-Submission Checklist Update

Replace the track checklist item:

**Before:**
```markdown
✓ Track follows "Type · Context" format
```

**After:**
```markdown
✓ Track is array with valid values (momentum, credibility, desire)
```

## Website Display

The website displays track values as capitalized labels separated by `·`:
- `[credibility]` → "Credibility"
- `[momentum, credibility]` → "Momentum · Credibility"

## Acceptance Criteria

✓ All new posts use array-based track format
✓ Track values are limited to: momentum, credibility, desire
✓ Content agent documentation reflects new format
✓ Posts can have multiple tracks when appropriate
✓ Website filter correctly matches posts by track

## Migration

Existing posts in `debrief.github.io` have been migrated:
- "Shipped · *" posts → `[credibility]`
- "Planning · *" posts → `[momentum]`
- "Momentum · *" posts → `[momentum]`

No action required for already-published posts.

## Files to Modify in debrief-future

1. `.claude/agents/media/content.md` - Update front matter requirements and track examples
