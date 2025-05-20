# 🛠 Technical Strategy: Debrief Rewrite Project

## 🔹 Overview

This document outlines the proposed technical architecture for replacing the legacy Java-based Debrief maritime analysis tool with a modern, modular browser-based platform. The design balances operational resilience, extensibility, and support for collaborative and reproducible analysis workflows.

---

## 🔹 Core Architectural Principles

- **React-based frontend** for maintainability and modular extension
- **Browser-first, Electron-optional** model
- **Separation of data and visualisation state** for flexible collaboration
- **Hybrid data model**: File-based (SQLite/JSON) or centralised via STAC server
- **Modular backend** services for authentication, project/session logic, spatial queries, RAP execution, and AI orchestration
- **Runtime extensibility** for UI plugins and Modular Command Plugins (MCPs)

---

## 🔹 Component Breakdown

### 🖥 Client UI
- Built in **React**, deployable via browser or Electron
- Supports:
  - Feature-rich timeline and spatial viewer
  - Scenario-specific UIs for short-term NATO-style deployments
  - Presence and collaborative edit indicators
  - RJSF-based dynamic forms for plugin input
  - Plugin manifest support for loading remote UI components

### 🧠 Backend Services
- API Gateway for routing and access control
- Core services:
  - Authentication (PKI, OIDC)
  - Project/session manager
  - Timeline and serial tracker
  - Comments and threaded review tools
  - Exporter (ZIP package, KML, CSV, Storyboard, dynamic PPT)
  - Collaboration manager (presence, locking)
  - Audit log and provenance tracker

### 🌍 Spatial & Central Server
- **STAC server** acts as the centralised store for:
  - Tracks
  - Annotations
  - Temporal datasets
- Provides:
  - SpatioTemporal indexing
  - Metadata tagging
  - Support for GeoJSON FeatureCollections
- Backed by **pygeoapi** or compatible STAC implementation

### 🔄 Data Storage Model
- **Hybrid support**:
  - File-based (SQLite/JSON) with OS-level permissions (ideal for Electron/offline)
  - Centralised STAC server (for shared or collaborative environments)
- Data provenance and audit logs are embedded inline with project data

---

## 🔹 Modular Command Plugins (MCPs)

- Initially **HTTP REST microservices**
- Long-term: Orchestrated by **LLM-based supervisor**
- Can access STAC records and session/project state
- Accept config inputs (via RJSF), return enriched data or annotations
- Internal use of Python permitted, but hidden from user

---

## 🔹 AI & LLM Roles

- LLM supervises and composes MCPs into analytical workflows
- Supports:
  - Track summarisation
  - Detection of data inconsistencies
  - Repetitive formatting automation
  - Chat-based analytical assistant
- LLM not maritime-trained, but empowers analyst hypothesis generation

---

## 🔹 Provenance & Audit Strategy

- **Audit logs** are not for security, but traceability
- Stored **inline with data**
- Log:
  - All edits
  - Reason for changes (optional)
  - Author and timestamp

- **Provenance** tracks:
  - Source metadata, optional checksums
  - Tools and parameters used per transformation
  - Stored at the **GeoJSON Feature level**
  - Supports forks in data derivation history (e.g., duplicate plots)
  - Analysts/reviewers can view **history trees**

---

## 🔹 Reproducible Analytical Pipelines (RAP)

- Declarative pipelines
- Support execution in UI ("Run saved workflow")
- Store:
  - Transformation steps
  - Config parameters
  - Commit ID of invoked code

- Stored as:
  - Named reusable templates
  - Exportable formats
- Forkable on modification
- **Pipeline Processor** as separate module (can auto-run workflows on new data)

---

## 🔹 Export & Reporting

- Manual export only (no scheduled jobs)
- Outputs:
  - GeoJSON / KML
  - CSV (optional)
  - Storyboard ZIPs (with data, thin viewer, backdrop, optional transitions)
  - Skeleton PowerPoint briefings with:
    - Timed slides
    - Track keys
    - Important event summary
- Dynamic PPT as fallback when JS-blocked in secure transfers

---

## 🔹 Collaboration Model

- Mixed model:
  - Shared **data** state
  - Author-controlled **visualisation** state
  - Optional “follow” mode for synced view
- **Pessimistic locking** at FeatureCollection level (1 editor, many viewers)
- **Serial ownership** model:
  - Scoped timeline control
  - Ownership handover
  - Status tracking (e.g., “in analysis”, “published”)
- **Presence**:
  - Shown per datafile as lozenges
  - Editable state marked visually
  - Others may request ownership
- **Annotations**:
  - Spatial, temporal, callout types
  - Created as private or public
  - Public annotations editable by others
- **Comments**:
  - Threaded, tagged, statused
  - Can be attached to: projects, serials, tracks, annotations
  - Visible to all
  - Dashboard flags unresolved comments

---

## 🔹 Timeline of Development

```mermaid
gantt
  title Debrief Modernisation Timeline
  dateFormat  YYYY-MM
  section Foundation (NATO Project)
  UI Prototype        :    des1, 2025-06, 1M
  Backend Setup       :    des2, 2025-06, 1M
  Implementation      :    des3, 2025-07, 3M
  Trials              :    des4, 2026-02, 2M
  Delivery: milestone, m1, 2026-04, 1d
  section MOD Adoption
  Core Feature Rewrite:    feat1, 2025-10, 3M
  MOD Deployment Prep :    feat2, 2026-01, 2M
  section Advanced Features
  Collaboration Layer :    adv1,  2026-03, 2M
  Data Sync + Provenance:  adv2,  2026-05, 2M
  LLM Supervisor:          llm1, 2026-07, 2M