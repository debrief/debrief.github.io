---
layout: future-post
title: "Shipped: Snapshots with Doubly-Linked Chain"
date: 2026-02-09
track: [credibility]
author: Ian
reading_time: 3
tags: [tracer-bullet, provenance, snapshots, stac]
excerpt: "Save clean GeoJSON snapshots at any timeline point, navigate history without loading files, assemble cross-snapshot timelines on demand"
---


## What We Built

The snapshot service lets analysts capture the state of a plot at any point in its history, not just the current state. Each snapshot saves clean GeoJSON (all Log entries stripped) as a STAC asset, linked to previous snapshots through a doubly-linked chain. 86 tests passing, zero regressions.

The service provides four core operations: create snapshots from any timeline position, detect snapshot boundaries lazily without file I/O, load entries from previous snapshots on demand, and assemble deduplicated timelines across the chain.

## How It Works

The doubly-linked chain lives in system records (`snapshotLinks.prev`/`next`). When you create a snapshot, the service writes the file first, then updates the chain only on success. This write-then-link atomicity means a failed snapshot never corrupts the chain.

Boundary detection is lazy. Each snapshot records `provEntryCount` in its metadata, so the UI can show "Show earlier history (12 earlier operations)" without loading any files. Only when the analyst clicks do we actually read from disk.

Cross-snapshot timeline assembly merges entries from multiple snapshots, deduplicates by line number and position hash, and sorts chronologically. The analyst sees one continuous history even though it spans multiple files.

All functions are pure with dependency injection, which made testing straightforward. We mock `stacService` for I/O, pass in fake snapshot chains, verify the outputs.

## Lessons Learned

Write-then-link atomicity was the right call. We initially considered updating links first, but that meant a failed write would leave orphaned chain pointers. Writing the file first means the worst case is an unreferenced snapshot, which doesn't break anything.

The `provEntryCount` field emerged from testing. We needed a way to show "there's more history" without the I/O cost of loading previous snapshots every time. Turned out to be one of the more useful metadata fields.

Deep cloning GeoJSON before stripping provenance was non-negotiable. Early tests caught cases where we mutated the original data structure, which would have been a nightmare in production.

## What's Next

Feature #072 (Log Panel) will consume these APIs to provide the analyst-facing UI. That's where the "Show earlier history" button lives, where you scrub through the timeline, where you trigger "Capture from here."

The snapshot service is plumbing. The Log Panel is where analysts will actually see it work.

> [See the code](https://github.com/debrief/debrief-future/tree/main/specs/074-snapshots)
