---
layout: future-post
title: "Shipped: STAC File Tree Component"
date: 2026-02-10
track: [credibility]
author: Ian
reading_time: 4
tags: [component, stac, provenance, ui]
excerpt: "A shared tree view that makes STAC catalog structure visible — with change highlighting after snapshots."
---


## What We Built

STAC catalogs in Future Debrief store plots as Items with GeoJSON payloads, arranged in Collections and sub-Catalogs. Until now, there wasn't a way to see that structure. This week we shipped StacFileTree — a React component that renders the catalog filesystem as a collapsible tree.

Double-click an Item to open the plot. Expand a Collection to see what's inside. When you restore a snapshot, new or changed files get highlighted, and their ancestor folders show "contains changes" markers. The component knows about STAC node types (catalog, collection, item, asset) and plain filesystem folders.

It's a shared component in `shared/components/`, built to work in VS Code webviews, the Electron loader, and eventually the web shell. The bundle is 7.9 kB. We wrote 40 unit tests and 10 Storybook stories covering all the states.

## How It Works

The tree loads lazily. When you expand a node for the first time, it reads the children from disk. After that, the children are cached. This keeps the initial render fast even with large catalogs.

We didn't want to couple the component to Node.js `fs` or VS Code's workspace API, so it takes a `FilesystemAdapter` prop. The adapter implements three methods: `readdir`, `stat`, and `readFile`. In production, you pass an adapter that wraps the real filesystem. In tests and Storybook, we use `memfs` — an in-memory filesystem that implements the same interface.

That decision meant we could write tests that create STAC structures in memory, mount the tree, and verify behavior without touching disk. It also means the component can work with any filesystem abstraction, including future remote backends if that ever becomes relevant.

## Key Decisions

**No third-party tree library.** We looked at react-arborist and react-complex-tree. Both were capable, but they brought their own styling systems and state management patterns. We've already established conventions with our map and timeline components — BEM naming, CSS custom properties matching `--debrief-*` tokens, simple prop-driven state. A custom tree component keeps everything consistent.

**memfs as devDependency only.** The in-memory filesystem is useful for tests and stories, but we didn't want it bundled in production. It's marked as a devDependency in `shared/components/package.json`. The adapter pattern means there's zero runtime overhead — production code never imports memfs.

**Highlight propagation as a separate concern.** When you restore a snapshot, the component receives a `highlightedPaths` prop with the set of new or changed file paths. The tree walks up from each path to mark ancestors as "contains changes". This happens in the component's render logic, not in the filesystem adapter. It felt cleaner to separate "what's on disk" from "what should be visually emphasized".

We wrestled with how to detect STAC node types. Option one: read the JSON file and check for `type` fields. Option two: infer from directory structure and naming conventions. We went with option one for STAC Items (they have assets and specific metadata), but used path patterns for catalogs and collections (cheaper, and the STAC spec is consistent here).

## What's Next

This component ships in the shared library, but it's not wired up anywhere yet. Next step is integrating it into the VS Code extension — probably as a panel in the sidebar, where analysts can browse the catalog and jump to plots.

We'll also need to handle renames and deletes. Right now the tree is read-only. When we add "rename this Item" or "delete this Collection" actions, we'll need to update the cache and re-render the affected subtree.

The highlight propagation works, but it's simplistic. If you restore a snapshot that changed 100 files, you get 100 highlighted paths. We might want to add "collapse all highlights" or "show only changes in this Collection" filters, but that can wait until someone actually uses it with a large catalog.

For now, the tree does what it needs to: makes STAC structure visible, loads quickly, and shows what changed after a snapshot restore.

→ [View the spec](https://github.com/debrief/debrief-future/blob/main/specs/077-stac-file-tree/spec.md)
→ [See the Storybook stories](https://github.com/debrief/debrief-future/tree/main/shared/components/src/components/StacFileTree)
