---
layout: page
title: "Technical Strategy: Debrief Rewrite Project"
date: 2025-05-21
tags: [Mermaid]
mermaid: true
---
## 1. Vision and Scope

The Debrief rewrite project aims to modernise the existing Java-based desktop application into a modular, browser-first platform. The new architecture will improve:

* Maintainability and developer onboarding
* Integration with MOD digital infrastructure (cloud, identity, security)
* Support for collaboration and distributed workflows
* Reproducibility through pipeline capture (RAP)
* Extensibility through AI plugins and modular tools

The system is designed to operate in multiple deployment contexts:

* **Standalone**: Minimal install with local data access
* **Collaborative**: Shared services via MODNET or site-local servers
* **AI-enabled**: Integration of automated insights and agent-driven workflows

---

## 2. Architectural Overview

### Component Map

* **Core Sub-Systems** (required for minimal standalone operation)
* **Shared Services** (optional, scalable extensions)
* **AI Supervision** (optional automation layer)

### Runtime Environments

* Browser-based UI (React)
* Electron-based shell (for deployed/offline use)
* Static STAC server (local)
* REST-based services (networked mode)

### Storage Models

* Local FeatureCollection files (GeoJSON + audit)
* SQLite (optional for RAP, participant indexing)
* STAC-based server for central access to spatial/temporal data

---

## 3. Sub-System Summary

### Core Sub-Systems

1. **Client UI**
2. **STAC Server (Static / File-Based)**
3. **Import Service**
4. **Export Service**

### Shared Services

5. **Pipeline Engine (RAP)**
6. **Annotation & Comment System**
7. **Presence & Locking Service**
8. **Platform Library Service**
9. **Analysis Dashboard**
10. **Wargame Metadata Store**
11. **Pipeline Processor**
12. **STAC Server (Dynamic / Server-Based)**
13. **Authentication / Identity**

### AI Supervision

14. **LLM Supervisor**
15. **MCP Agent Registry**

Each sub-system may be deployed independently based on operational needs.

---

## 4. Integration Patterns

* REST APIs between services
* File-based inputs/outputs (.rep, .dpf, .geojson)
* STAC standard for discoverability and asset metadata
* RAP pipelines stored inline or externally
* FeatureCollections reference wargames and serials via `wargameId`, `serialId`

---

## 5. Security and Identity

* Standalone installs run with OS-level file permissions
* Shared deployments integrate with OIDC or PKI identity providers
* Presence and locking managed at the FeatureCollection level
* Annotations may be public or private; private annotations may be stored locally or in a presence service

---

## 6. Collaboration Modes

* **Standalone**: Users load local files, no presence/locking, private annotations only
* **Team-based wargame analysis**:

  * Wargame/serial metadata structures loaded
  * FeatureCollections tagged by serial
  * Dashboard shows status, comments, and edit ownership
* **Review workflows**:

  * View-only dashboards for reviewers
  * Unresolved comments, change logs, audit trails visible

---

## 7. Extensibility Strategy

* MCP agents are schema-described REST plugins
* UI extensions provided via manifests + RJSF forms
* RAP steps track tool execution, parameters, and results
* Supervisor orchestrates agents based on analyst tasks

---

## 8. Export and Review Outputs

* **Storyboard Export**:

  * Timeline-based, with viewports and visible annotations
  * Events table per step
  * Export as HTML bundle, PPT, screenshots, or MP4
* **Other Formats**:

  * GeoJSON, KML, CSV
  * Static viewer with timeline controls
  * RAP summaries (HTML table)

---

## 9. Roadmap and Deployment Strategy *(Optional)*

* **Phase 1**: NATO prototype (backend foundation + retro-style UI)
* **Phase 2**: MOD adoption (minimal core system)
* **Phase 3**: Shared services and dashboard integration
* **Phase 4**: AI supervision and RAP automation

---

## Appendices

* Mermaid diagrams (Architecture, RAP, Dashboard flows)
* Wargame/Serial JSON Schema (in future)
* RAP step format and pipeline export model
