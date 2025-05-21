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

- **React-based frontend** (browser-first, Electron-optional)
- **Modular, service-oriented backend**
- **Hybrid data storage model** (local SQLite/JSON + central STAC server)
- **Provenance and audit support** for reproducible analysis
- **Model Context Protocol (MCP) agents**, orchestrated by LLM supervisor
- **Runtime UI extensibility** via plugin manifests and dynamic forms

---

## 🔹 Client UI

- Timeline, spatial viewer, RJSF-based dynamic forms
- Private/public annotations; threaded review comments
- FeatureCollection-level presence and pessimistic locking
- Role-based access to advanced tools (e.g., pipeline viewer)
- Storyboard exports and dynamic PPT for offline analysis sharing

---

## 🔹 Server-Side Components

- **API Gateway**: routing, access control
- **Project/Session Manager**: stores visualisation state and metadata
- **Authentication**: OIDC/PKI-based identity
- **Import Service**: file format parser
- **Collaboration Service**: presence, ownership, lock management
- **Annotation & Comment Manager**: threaded comments, status tracking
- **Export Service**: GeoJSON, KML, CSV, HTML table, dynamic PPT
- **Audit & Provenance Tracker**: inline with features or metadata

---

## 🔹 Data Storage

### Local Mode (Offline/Electron)
- Feature data and pipelines stored as GeoJSON + SQLite
- Provenance and audit trail embedded in each Feature object

### Central Mode (Networked)
- STAC server acts as the authoritative store
- Tracks, annotations, and narrative data treated as STAC Items

---

## 🔹 Model Context Protocol (MCP) Agents

- Independently deployable services (REST)
- Called by the client UI or LLM supervisor
- Receive config via dynamic forms; return structured feature edits or annotations
- Internal use of Python/code permitted; version/commit ID recorded per invocation

### LLM Supervisor
- Selects/configures MCP agents to deliver analysis pipelines
- Offers suggestions, completes steps, or explains transformations
- Responds to analyst questions and tasks
- Observes user interactions and may suggest relevant overlays or tools

---

## 🔹 Reproducible Analytical Pipelines (RAP)

### Client Pipeline Model
- Each **Feature** owns its own pipeline by default
- Pipelines are merged into a new **metadata Feature** when combining features
- All **edit actions** tracked as pipeline steps:
  - Import, property/geometry edits, merge, filter, MCP agent execution
  - Styling changes, annotations, feature grouping

### Pipeline Step Schema
Each step includes:
- `timestamp`, `user`, `action_type`
- `parameters` (e.g. bearing error, filter threshold)
- `tool_id`, `commit_id` (if tool-based)
- `notes`, and for merged pipelines: `input_feature_ids`, `output_feature_ids`

### Pipeline Viewer (Advanced Users Only)
- Timeline or table view of steps
- Filter by type, tool, feature
- View diffs between steps
- Revert, disable, or re-order steps
- Export as **HTML table** for briefings or review packs

---

## 🔹 Pipeline Publishing & Processor Jobs

### Publishing
- Pipelines remain local by default
- Published only when they have enduring value or automation utility
- Publishing creates a shareable, immutable reference to the pipeline

### Jobs
- A **job** combines:
  - A published pipeline
  - Input source (file folder or STAC collection)
  - Output target
  - Optional parameters
- Jobs define their own **trigger** (e.g., folder monitor, STAC tag)
- The **Pipeline Processor** manages and executes jobs via API

---

## 🔹 AI & TMA Assistant

### TMA Assistant
- A specialised backend MCP agent for bearing-only track estimation
- Accessible via the UI pipeline tools and callable from RAP workflows
- Resulting inferences are stored as derived FeatureCollections with full provenance

### AI Insight Workflow

#### Analyst Use Cases
LLMs should contribute by:
- Removing mundane tasks:
  - Applying plot and track formatting
  - Generating range/bearing plots
  - Producing key event tables
  - Removing outliers in movement data
- Revealing hidden insights:
  - Identifying comms gaps or underperformance
  - Relating course to environment or shipping
  - Spotting missed detections or decision points
- Exposing new inferences:
  - Comparing vessel vs expected performance
  - Validating detection geometry vs sensor specs
  - Cross-checking decisions against orders
  - Surfacing route reuse or environmental correlations

#### Insight Delivery Modes
- Timeline flags, side-panel suggestions, inline commentary
- Summary cards, storyboard slide suggestions
- Possibly inserting steps into editable pipelines (future capability)

#### Analyst Interactions
- Link insight to track, serial, or annotation
- Accept/reject insight
- Promote insight to a timeline event or annotation

#### Explanation Format
- Use terse language with IDs, measurements, and keywords
- Avoid verbose natural language

#### Confidence Representation
- Probability or percentage (e.g., 84%)
- Colour-coded confidence tiers
- Analyst-configurable confidence thresholds

#### Feedback Mechanisms
- Flag incorrect insights
- Tag as duplicate or already known
- Rate insight usefulness (e.g., thumbs up/down)

---

## 🔹 Networked Infrastructure

### Integrated Data & Services
Debrief will support integration with:
- Authentication and identity providers
- Shared track stores (STAC-based)
- Narrative event sources (logs, diaries, observations)
- Reference datasets (e.g., MMSI, ship specifications)
- Environmental datasets (METOC, bathymetry, oceanographic models)
- Simulation tools (e.g., sonar model runners)
- Interoperability via STAC or REST standards
- Event-driven processing (e.g., new data triggers analysis)

### Dataset Discovery
- Browseable STAC catalogues
- Context-aware suggestions
- Search/filter interface
- Manual link entry for advanced users
- Button/tool hints when linked data is available

### Application Profiles
- Different builds will support different levels of network integration
- Example: a basic offline app may wrap a local folder as the track store

### Multi-Site Collaboration
- Review workflows (prepare at one site, validate at another)
- Cross-site presence indicators
- Distributed RAP execution (local run, central results)
- The **FeatureCollection is the unit of editing** (one editor at a time)

### Supervisor Role in Collaboration
- Supervisor does **not** coordinate collaboration
- Collaborative context is handled via dashboards (e.g., who is editing what)
- Supervisor may observe user actions and suggest relevant overlays or tools

---

## 🔹 Storyboards and Exports

### Definition and Behaviour
- Storyboards consist of spatial/temporal data + time-step viewports
- “Next” and “Back” navigate steps; temporal filters apply per step
- Each step may show a floating “Events Table” with key annotations

### Editing UI
- Timeline editor with rectangular time bands and viewport decorations
- Hoverable event markers with tooltip details and toggle-to-include
- Pan/zoom tools define viewports (unlocked per step)
- Timeline shows annotation lifetimes and step boundaries

### Annotations
- Assigned to a single step by default, but can span steps
- Visibility is user-controlled; only visible annotations are exported
- Private annotations stored locally or via Presence service per user

### Export Formats (in priority order)
1. HTML ZIP bundle (self-contained viewer)
2. Dynamic PowerPoint with transitions
3. Screenshot sequence (one per step)
4. MP4 video capture (larger files)
5. Re-openable export for Debrief client
6. PDF export not supported

### Storage Model
- Storyboard steps are stored as special features with polygon viewports
- Metadata is stored within each storyboard feature’s `properties`
- Storyboard history becomes part of the plot’s provenance chain

---

## 🔹 Audit Log

### Purpose
- Trace what changed, when, and why
- Track who performed changes
- Embed audit for RAP reproducibility
- Export change summaries
- Verify collaborative workflows
- Not used for access control/security

### Storage
- Embedded within each FeatureCollection as a top-level `audit` property
- Never separated from the data it describes

### Captured Events
- Manual data edits
- Feature creation/deletion
- Import/export actions
- Annotation/tag/visibility changes
- Comment/resolution threads
- Storyboard/viewport modifications

### Interaction
- Per-feature and full-collection history views
- Filterable by user, time, or action
- Supports diffs between entries
- Exportable as tabular or timeline-style report
- No need for spatial or timeline overlay views

---

## 🔹 Future Enhancements

- Pipeline forking and reuse
- Push notifications on new STAC updates
- Visualisation state transitions for storyboard playback
- UI plugin sandboxing (e.g., iframe or Shadow DOM)
- Additional MCP agents for simulation, prediction, or anomaly detection