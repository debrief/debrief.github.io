# 🛠 Technical Strategy: Debrief Rewrite Project

## 🔹 Overview

This document outlines the proposed technical architecture for replacing the legacy Java-based Debrief maritime analysis tool with a modern, modular browser-based platform. The design balances operational resilience, extensibility, and support for collaborative and reproducible analysis workflows.

---

## 🔹 Core Architectural Principles

- **React-based frontend** for maintainability and modular extension
- **Browser-first, Electron-optional** model
- **Separation of data and visualisation state** for flexible collaboration
- **Hybrid data model**: File-based (SQLite/JSON) or centralised via STAC server
- **Modular backend** services for authentication, project/session logic, spatial queries, RAP execution, and orchestration of Model Context Protocol (MCP) agents
- **Runtime extensibility** for UI plugins and dynamically loaded features

---

## 🔹 Component Breakdown

### 🖥 Client UI
- Built in **React**, deployable via browser or Electron
- Supports:
  - Timeline and spatial viewer
  - Scenario-specific UIs for short-term NATO-style deployments
  - Presence and collaborative editing indicators
  - RJSF-based dynamic forms for MCP agent input
  - Plugin manifest system for runtime UI extension

### 🧠 Backend Services
- API Gateway for routing and access control
- Core services:
  - Authentication (PKI, OIDC)
  - Project/session manager
  - Timeline and serial tracker
  - Comments and review system
  - Export engine (GeoJSON, ZIP, KML, CSV, storyboard, dynamic PPT)
  - Collaboration manager (presence, locking)
  - Audit log and provenance tracker

---

## 🌍 Spatial & Central Server

- Centralised store implemented using a **STAC server**
- Tracks, annotations, and temporal data stored as SpatioTemporal assets
- Accessed via pygeoapi or similar
- Supports:
  - Spatio-temporal queries
  - Searchable metadata
  - Integration with base layers, METOC, bathymetry

---

## 🔄 Data Storage Model

- **File-based** mode: JSON/SQLite on disk with OS-level permissions (used offline or in Electron)
- **Centralised STAC** mode: shared access and versioning in networked deployments
- Provenance and audit trails are stored **inline** with project data

---

## 🧠 Model Context Protocol (MCP) Agents

- Individual analysis tools or transformations are implemented as **MCP agents**
- MCP agents are:
  - Independently deployable (via REST APIs)
  - Accept configuration via forms or manifest files
  - Access spatial server data and session/project state
  - Hidden implementation detail (may use Python or other languages internally)

- An **LLM supervisor**:
  - Selects and composes MCP agents to deliver analytical workflows
  - Acts as a planner or assistant, not a domain expert
  - May auto-suggest pipelines or review inconsistencies

---

## 🔐 Provenance & Audit Strategy

- **Audit logs** are non-security and embedded with data
- Log:
  - All edits
  - Reasons for edits (optional)
  - Author/timestamp
- **Provenance** recorded at GeoJSON Feature level:
  - Tracks, zones, timestamped events
  - Source, tools, parameters
  - Supports forks (e.g., duplicate plots after transformation)
  - Analysts and reviewers can see full **history trees**

---

## 🔁 Reproducible Analytical Pipelines (RAP)

- RAPs are **declarative**, not code-based
- Store:
  - Sequence of transformations
  - Parameters used
  - Code version/commit ID (for external MCP agents)

- Features:
  - Re-run on new input
  - Ad-hoc tuning (with forking of pipeline)
  - Saved as named templates
  - Exportable for external tools

- Optional “pipeline processor” module:
  - Runs RAPs automatically on data from folders or feeds
  - Interchangeable with analyst-created pipelines in Debrief

---

## 📤 Export & Reporting

- **Manually triggered only**
- Supported formats:
  - GeoJSON / KML
  - CSV (optional)
  - Static viewer ZIP bundles with:
    - Data
    - Thin timeline UI
    - Optional base layers
    - Optional storyboard (pan/zoom transitions)
  - Skeleton PowerPoint briefs with:
    - Slide-per-event
    - Track legends
    - Important event tables
  - **Dynamic PPT** alternative when JS is blocked in defence networks

---

## 🤝 Collaboration Model

- **Mixed** real-time/asynchronous model:
  - Shared data updates
  - Independent visualisation state unless in “follow mode”
- **FeatureCollection-level locking**: One editor, many viewers
- **Serial ownership**:
  - Users “own” time periods
  - Ownership can transfer
  - Status tracked: not started → in analysis → reviewed → published
- **Presence**:
  - Shown per datafile (as lozenges)
  - Indicates owner and viewers
- **Annotations**:
  - Private or public
  - Public annotations are editable
- **Asynchronous comments**:
  - Threaded, tagged, status-aware
  - Can attach to project, serial, track, or annotation
  - Dashboard flags unresolved comments

---

## 🔮 Future Considerations

- Push-based workflows: analyst notifications on new track availability
- Mermaid state diagrams for collaboration workflows
- Plugin manifests for runtime UI injection
- Support for sandboxed UI extensions via Shadow DOM or iframes