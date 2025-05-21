---
layout: page
title: "Technical Strategy: Debrief Rewrite Project"
date: 2025-05-21
tags: [Mermaid]
mermaid: true
---

## 🔹 Overview

This document defines the technical architecture for replacing the legacy Java-based Debrief application with a modular, browser-based platform. The architecture supports collaborative workflows, reproducible pipelines, AI integration, and long-term adaptability across secure MOD environments.

---

## 🔹 Core Principles

* **React-based frontend** (browser-first, Electron-optional)
* **Modular, service-oriented backend**
* **Hybrid data storage model** (local SQLite/JSON + central STAC server)
* **Provenance and audit support** for reproducible analysis
* **Model Context Protocol (MCP) agents**, orchestrated by LLM supervisor
* **Runtime UI extensibility** via plugin manifests and dynamic forms

---

## 🔹 Client UI

* Timeline, spatial viewer, RJSF-based dynamic forms
* Private/public annotations; threaded review comments
* FeatureCollection-level presence and pessimistic locking
* Role-based access to advanced tools (e.g., pipeline viewer)
* Storyboard exports and dynamic PPT for offline analysis sharing

---

## 🔹 Server-Side Components

* **API Gateway**: routing, access control
* **Project/Session Manager**: stores visualisation state and metadata
* **Authentication**: OIDC/PKI-based identity
* **Collaboration Service**: presence, ownership, lock management
* **Annotation & Comment Manager**: threaded comments, status tracking
* **Export Service**: GeoJSON, KML, CSV, HTML table, dynamic PPT
* **Audit & Provenance Tracker**: inline with features or metadata

---

## 🔹 Data Storage

### Local Mode (Offline/Electron)

* Feature data and pipelines stored as GeoJSON + SQLite
* Provenance and audit trail embedded in each Feature object

### Central Mode (Networked)

* STAC server acts as the authoritative store
* Tracks, annotations, and narrative data treated as STAC Items

---

## 🔹 Model Context Protocol (MCP) Agents

* Independently deployable services (REST)
* Called by the client UI or LLM supervisor
* Receive config via dynamic forms; return structured feature edits or annotations
* Internal use of Python/code permitted; version/commit ID recorded per invocation

### LLM Supervisor

* Selects/configures MCP agents to deliver analysis pipelines
* Offers suggestions, completes steps, or explains transformations

---

## 🔹 Reproducible Analytical Pipelines (RAP)

### Client Pipeline Model

* Each **Feature** owns its own pipeline by default
* Pipelines are merged into a new **metadata Feature** when combining features
* All **edit actions** tracked as pipeline steps:

  * Import, property/geometry edits, merge, filter, MCP agent execution
  * Styling changes, annotations, feature grouping

### Pipeline Step Schema

Each step includes:

* `timestamp`, `user`, `action_type`
* `parameters` (e.g. bearing error, filter threshold)
* `tool_id`, `commit_id` (if tool-based)
* `notes`, and for merged pipelines: `input_feature_ids`, `output_feature_ids`

### Pipeline Viewer (Advanced Users Only)

* Timeline or table view of steps
* Filter by type, tool, feature
* View diffs between steps
* Revert, disable, or re-order steps
* Export as **HTML table** for briefings or review packs

---

## 🔹 Pipeline Publishing & Processor Jobs

### Publishing

* Pipelines remain local by default
* Published only when they have enduring value or automation utility
* Publishing creates a shareable, immutable reference to the pipeline

### Jobs

* A **job** combines:

  * A published pipeline
  * Input source (file folder or STAC collection)
  * Output target
  * Optional parameters
* Jobs define their own **trigger** (e.g., folder monitor, STAC tag)
* The **Pipeline Processor** manages and executes jobs via API

---

## 🔹 AI & TMA Assistant

* The **TMA Assistant** is a specialised backend MCP agent for bearing-only track estimation
* Accessible via the UI pipeline tools and callable from RAP workflows
* Resulting inferences are stored as derived FeatureCollections with full provenance

---

## 🔹 Future Enhancements

* Pipeline forking and reuse
* Push notifications on new STAC updates
* Visualisation state transitions for storyboard playback
* UI plugin sandboxing (e.g., iframe or Shadow DOM)
* Additional MCP agents for simulation, prediction, or anomaly detection
