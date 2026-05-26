---
layout: future-post
title: "Shipped: Properties Panel — feature & sub-feature editing"
date: 2026-05-20
track: [credibility]
author: Ian
reading_time: 8
tags: [properties-panel, vscode-extension, linkml, schemas, selection, read-only]
excerpt: The Properties Panel now edits features, single vertices, and multi-select summaries — with read-only detection and one-click revert.
---

| | Before #192 | After #192 |
|---|---|---|
| Editable surface | Catalog metadata and plot-level fields only | Catalog, plot-level, per-feature, and per-vertex across every geometry in the plot |
| Selection emitters | Single-select only on the map; the Layers panel and modifier keys did nothing | Single-select plus Ctrl/Cmd multi-select on both the map and the Layers panel |
| Read-only plots | Edits accepted in the form, then the save silently failed | A pre-flight banner across every panel mode, plus a post-write notice if the filesystem rejects the write anyway |
| Override revert | Re-type the auto-derived value by hand and hope it matched | One-click revert next to any overridden field, with the auto-derived value shown alongside |
| Annotation vertices | No metadata anywhere — polygon, line, and point vertices were geometry-only | `label`, `tags`, and `note` on any vertex via the same editor used for track points |

## What We Built

Until now, the only way to annotate a single point on a track — or correct the nationality on one contact, or label a single vertex of an exclusion zone — was to open the underlying JSON. The Properties Panel handled the plot as a whole, and stopped there. With #192 the same panel becomes the editing surface for whatever the analyst has selected: a feature, a single vertex on that feature, several features compared side by side, or the whole plot. Clicking a track point lets you mark it as the moment of intercept and attach a note; clicking a polygon vertex lets you tag it the same way; Ctrl-clicking two contacts on the map shows a read-only summary of where they agree and where they differ.

The change is deliberately larger than it looked at first. After a Spec Navigator review I pulled four things out of the "out of scope" pile that the original plan had quietly assumed away. Multi-select emission, because the multi-select summary mode was unreachable without it — a documented capability that nothing in the running app could actually trigger. Read-only plot detection, because a save against a locked catalog item was failing silently and writing a provenance entry for a save that never happened, which is the exact failure mode the constitution forbids. Per-field revert, because shipping per-platform overrides without a way to undo them was half a feature. And sub-feature editing for non-track annotations, because designing a vertex-metadata schema slot now and then designing another one for polygons later would have been an obvious mistake.

## How It Fits

This sits on top of #447's Properties Panel shell and consumes the per-platform override fields from #181, the structured vertex-path convention from #053, the annotation geometries from #093, and the auto-derived values from #135. Nothing new joins the dependency graph — no new packages, no new runtime libraries, no new Zustand stores. The staging buffer lives in React state inside the panel's host controller, the read-only signal lives on the existing session-state plot slice as `isReadOnly` plus a `readOnlyReason`, and the selection model stays the existing `features` slice — the map and Layers panel click handlers grow modifier flags but the shape of `selection` is unchanged. The headline schema change is one LinkML class (`VertexMetadata`) and one slot (`vertex_metadata`) added to `BaseFeatureProperties`, which means every feature class that inherits from it — `TrackProperties` plus the seven annotation classes — picks up the slot for free. The address inside each entry is a structured string `path` following #053's selection-path convention: `positions/N` for tracks, `rings/R/vertices/V` for polygons, `vertices/N` for lines and multipoints, `vertex/0` for points.

## Key Decisions

- **Staging buffer is panel-local React state, not a new Zustand slice.** The first plan had me adding a cross-package store; the Spec Navigator review pointed out that nothing outside the panel reads it, and that introducing shared state for a panel-private concern would be the wrong call. It now lives where the panel can see it and nowhere else.
- **The staging buffer, the save→flush wiring, and the per-save provenance call site are net-new in #192, not extensions of #447.** The original plan claimed they were inherited from the plot-editor; an Article I.3 audit showed they weren't. Misclassifying them risked shipping the silent-save bug into the per-feature path too, so I added an integrated save-path Vitest specifically to close that hole.
- **Read-only detection combines a writer capability report with post-write escalation.** The writer's `CapabilityReport.persistent` flag drives the pre-flight banner. If a save still fails with `ReadOnlyFilesystemError`, `EACCES`, or `EPERM`, the panel escalates to read-only after the fact and surfaces a notice. Where the catalog lock and the filesystem permission disagree, the most restrictive wins.
- **One shared `VertexMetadata` class, addressed by a structured string `path`.** The alternative was a per-geometry class hierarchy, which would have meant generating four near-identical types and four mode-resolver branches. A single class with a path slot kept the schema sparse (vertices with no metadata add nothing to the saved file), kept the editor branch-free (the same `label`/`tags`/`note` form regardless of geometry kind), and meant the mode resolver only needs to recognise a vertex path — not decode it.
- **`PropertiesForm` gets a `mode` prop and three new sibling components — `FeatureEditorMode`, `SubFeatureEditorMode`, `MultiSelectSummaryMode` — rather than a single super-component that branches internally.** Each mode is independently storyable, independently testable, and independently rerenderable when the selection changes.
- **Multi-select emission is upstream of the panel.** The map's `onSelect` and the Layers panel's row click handler grow modifier flags; the panel itself learns nothing new about how the selection was built. This keeps the panel's mode-resolution logic pure: it reads the selection and renders, and it never asks where the selection came from.
- **Vertex re-mapping under geometry mutation is explicitly deferred.** If a later feature edits a polygon's vertices, the rules for how `vertex_metadata` entries follow insertions and deletions will be defined alongside that feature, not pre-emptively here. Annotating today is in scope; reshaping is not.

## Screenshots

The Properties Panel renders one of four modes based on what's selected. Below: feature mode (with the per-platform override chip and the revert affordance), sub-feature mode on a track point and on a polygon vertex (cross-geometry hero — same form, different address), the multi-select read-only summary, and the read-only banner that fires either pre-flight or after a permission-denied save.

| | |
|---|---|
| ![Properties Panel in feature edit mode showing per-platform override chip and revert affordance, VS Code theme](/assets/images/future-debrief/shipped-properties-panel-feature-edit/properties-feature-vscode.png) | ![Properties Panel in sub-feature mode editing a track point with label, tags, and note fields](/assets/images/future-debrief/shipped-properties-panel-feature-edit/properties-subfeature-track-vscode.png) |
| Feature mode | Sub-feature mode (track point) |
| ![Properties Panel in sub-feature mode editing a polygon ring vertex with the same form as the track point](/assets/images/future-debrief/shipped-properties-panel-feature-edit/properties-subfeature-polygon-vscode.png) | ![Properties Panel multi-select summary mode showing read-only comparison of two contacts](/assets/images/future-debrief/shipped-properties-panel-feature-edit/properties-multiselect-vscode.png) |
| Sub-feature mode (polygon ring vertex) — same form, different address | Multi-select summary |
| ![Read-only banner displayed across the top of the Properties Panel](/assets/images/future-debrief/shipped-properties-panel-feature-edit/properties-readonly-vscode.png) | ![Read-only state in the live web-shell with banner and disabled inputs](/assets/images/future-debrief/shipped-properties-panel-feature-edit/workflow-readonly.png) |
| Read-only banner alone | Read-only in the live web-shell (banner + disabled inputs) |

The mode-swap frame strip captures the four key states the dispatcher cycles through. (The cloud environment has no `ffmpeg`, so the spec's planned GIF is rendered as a four-frame sequence the PR description displays side-by-side.)

![Plot mode — Properties Panel showing whole-plot metadata](/assets/images/future-debrief/shipped-properties-panel-feature-edit/workflow-mode-swap-1-plot.png)
![Feature mode — Properties Panel showing a single selected feature's editable fields](/assets/images/future-debrief/shipped-properties-panel-feature-edit/workflow-mode-swap-2-feature.png)
![Sub-feature mode — Properties Panel showing per-vertex label, tags, and note](/assets/images/future-debrief/shipped-properties-panel-feature-edit/workflow-mode-swap-3-subfeature.png)
![Multi-select mode — Properties Panel showing a read-only summary of multiple selected features](/assets/images/future-debrief/shipped-properties-panel-feature-edit/workflow-mode-swap-4-multi.png)

## By the Numbers

| | |
|---|---|
| User stories | 7 (4× P1, 3× P2) |
| LinkML classes added | 1 (`VertexMetadata`) |
| LinkML slots added | 1 (`vertex_metadata: VertexMetadata[]` on `BaseFeatureProperties`) |
| Concrete subclasses that inherit the new slot | 13 |
| New runtime dependencies | 0 |
| Schema pytest cases (full suite / new in #192) | 916 / 53 |
| Component-library Vitest cases (full suite / new in #192) | 2 250 / ~300 |
| Session-state Vitest cases (full suite / new in #192) | 675 / 14 |
| VS Code extension Vitest cases | 780 (no regressions) |
| Web-shell Playwright cases (all #192 specs) | 42 |
| Storybook screenshot captures | 7 (3 themes for the feature mode + 4 mode-specific) |
| Total tests passed at HEAD | **4 670** |
| Total tests failed | **0** |
| Breaking API changes | 1 (`MapView.onSelect` signature — same prop name, new payload shape) |
| Plot-editor #447 regression count | 0 (49/49 tests pass unchanged) |

## Lessons Learned

- **Audit "we inherit that from #447" claims before designing on top of them.** The original plan said the save path, the provenance call site, and the staging buffer were #447 plumbing reused as-is. The Spec Navigator review showed that wasn't true — the save path landed but the staging buffer and the provenance call site were never wired. I'd been planning to lean on infrastructure that didn't exist. The integrated save-path Vitest (`saveSession-integration.test.ts`) is the test that closes that gap; it would not have existed without the second review pass.
- **A breaking signature change to a high-traffic prop is cheap if the package boundary is right.** `MapView.onSelect` going from `(featureId, event)` to `({ target, modifier, shift })` rippled through one VS Code call-site and two web-shell call-sites, the FeatureList convergence, two Storybook stories, and one selection-sync test. It took the Phase 5 agent under 20 minutes from first edit to all-green. The same change spread across packages owned by different teams would have cost a week.
- **Browser-safe subpath exports are worth setting up before they bite.** Adding `@debrief/session-state/browser` for the components package was a 30-line change that took an hour to discover (the regression was invisible until the VS Code webview pretest fell over with `Could not resolve "fs/promises"`). The web-shell was already aliasing the package to a local shim for the same reason — that pattern should be a project-wide convention, not a per-app workaround.
- **Inlining a JSON registry into a component is fragile, even when it's expedient.** The platform registry lookup for the revert affordance reads `shared/data/platform-registry.json`. The `@debrief/data` package uses `node:fs`, which doesn't work in the webview. The Phase 8 work mirrored the JSON inline; this is a known follow-up. The right fix is a `@debrief/data/browser` subpath that ships the JSON bundled at build time.

## What's Next

- Wire a Save action in the host UI. The staging buffer's `applyEditsToFeatures` → `saveSession` → `appendProvenance` glue is shipped; the panel currently never invokes it from a visible control. The follow-up backlog item will surface a Save button in the panel header.
- Add `@debrief/data/browser` to remove the inline platform-registry mirror in `FeatureEditorMode.tsx`.
- Vertex re-mapping under geometry mutation. The current sparse-path keying means that if a polygon shrinks under the analyst, vertex_metadata entries whose path no longer resolves are skipped. The next feature to edit polygon vertices should define the re-mapping rules at the same time.
- Convert the workflow PNG sequences into GIFs once `ffmpeg` is on the CI image. The capture spec is already in place — only the post-processing step is missing.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/192-properties-panel-feature-edit/spec.md)
→ [View the evidence](https://github.com/debrief/debrief-future/tree/main/specs/192-properties-panel-feature-edit/evidence)
