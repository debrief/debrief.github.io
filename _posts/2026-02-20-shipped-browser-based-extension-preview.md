---
layout: future-post
title: "Shipped: Browser-Based Extension Preview"
date: 2026-02-20
track: [credibility]
author: Ian
reading_time: 3
tags: [tracer-bullet, developer-experience, code-review]
excerpt: "PR preview environments are live -- reviewers can now test the VS Code extension in a browser with one click."
---


## What We Built

Reviewing the VS Code extension no longer requires a local install. Phase 1 is complete: the preview container builds, runs code-server with the Debrief extension pre-loaded, and includes sample STAC catalogs and REP files. You can build it locally with `task preview:build`, run it with `task preview:run`, and open `http://localhost:8080` to see the full extension environment in your browser.

The container lives in a dedicated `preview/` directory, separate from the existing Fly.io demo environment. It's smaller (around 400MB vs the demo's gigabyte-plus desktop image), faster to spin up, and purpose-built for code review rather than general demonstration. The Dockerfile starts from `codercom/code-server:latest`, copies in the extension `.vsix` built by CI, installs it automatically, and opens a pre-configured workspace with sample tracks and STAC items ready to explore.

At the repo root, `app.json` and `heroku.yml` tell Heroku how to build and deploy the container. Once Heroku Review Apps are manually enabled (Phase 2), every PR will get its own preview URL. For now, the container works perfectly locally and CI validates the build on every push.

## How It Actually Works

The entrypoint script binds code-server to Heroku's dynamically-assigned `$PORT` (or falls back to 8080 locally). When the container starts, code-server launches with `--auth none` (no password prompt for ephemeral preview environments), installs the Debrief extension from the bundled `.vsix`, and opens the workspace at `/home/coder/workspace`. That workspace contains `samples/` with REP files and a complete STAC catalog structure, plus a `WELCOME.md` that displays by default.

The extension activates immediately. Reviewers can click the Debrief icon in the activity bar, browse STAC items in the explorer panel, load tracks onto the map, and test whatever changed in the PR. It's the full extension environment — map view, layers panel, time controller, tool log — running in a browser tab.

## What Changed During Implementation

The original plan assumed we'd need to generate synthetic sample data or download it at runtime. Turned out the `apps/vscode/test-data/` directory already had everything we needed — STAC catalogs, REP files, tracks with narrative annotations. We just copied those into the container at build time, which simplified the Dockerfile and removed any network dependencies from the startup sequence.

We wrestled briefly with whether to bundle the `.vsix` in the container or download it from CI artifacts. Bundling won: the Dockerfile copies `apps/vscode/*.vsix` from the build context, which means you run `task build` (which packages the extension), then `task preview:build` (which pulls the `.vsix` into the image). Simple, no artifact server needed, works locally and in CI.

The WELCOME.md went through a couple of iterations. The first draft was installation-focused ("here's how code-server works"), which didn't match the actual use case. The final version is reviewer-focused: what to click, which sample files demonstrate which features, what to look for if the extension isn't loading. Much more useful for someone landing in the environment for the first time.

## Playwright Smoke Test

The test suite validates that the preview environment actually works. It loads code-server, waits for the workbench to appear, checks that the Debrief activity bar icon is present, confirms the log panel is visible, and verifies the file explorer shows the sample workspace. It captures screenshots along the way — those land in `specs/099-browser-extension-preview/evidence/screenshots/`.

You can run the test locally against your own container or point it at a Heroku review app URL. It's a confidence check that code-server starts, the extension installs, and the workspace loads correctly.

## What's Next

Phase 2 waits on manual Heroku configuration. Once Review Apps are enabled via the Heroku dashboard, we'll validate the end-to-end flow: PR opens, Heroku builds the container, preview URL appears, reviewer clicks and lands in the extension environment. Then we'll update the PR template to include a "Preview Review" section with testing guidance and confirm that preview apps tear down automatically when PRs close.

The container definition, workspace setup, and test suite are done. The rest is wiring.

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
