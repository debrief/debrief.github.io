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

1. [Client UI](sub-systems/client_ui.html)
2. [STAC Server (Static / File-Based)](sub-systems/stac_server_static_file_based.html)
3. [Import Service](sub-systems/import_service.html)
4. [Export Service](sub-systems/export_service.html)
5. [Pipeline Engine](sub-systems/pipeline_engine.html)

### Shared Services

6. [Platform Library](sub-systems/platform_library.html)
7. [Pipeline Processor](sub-systems/pipeline_processor.html)
8. [STAC Server (Dynamic / Server-Based)](sub-systems/stac_server_dynamic_server_based.html)

### Collaborative Services

9. [Authentication](sub-systems/authentication.html)
10. [Commenting](sub-systems/commenting.html)
11. [Presence Locking](sub-systems/presence_locking.html)
12. [Analysis Dashboard](sub-systems/analysis_dashboard.html)
13. [Wargame Metadata](sub-systems/wargame_metadata.html)

### AI Supervision

14. [LLM Supervisor](sub-systems/llm_supervisor.html)
15. [MCP Agent Registry](sub-systems/mcp_agent_registry.html)

<div class="mermaid">

architecture-beta
    group core(server)[Core]

    service db(database)[Client UI] in core
    service disk1(disk)[Data store] in core
    service disk2(internet)[Import service] in core
    service server(internet)[Export service] in core
    service pipes(server)[Pipeline Engine] in core

    group subs(Internet)[Subsystems]

    group llm(internet)[LLM] in subs
    service l1(cloud)[LLM Supervisor] in llm
    service l2(cloud)[MCP Agent Registry] in llm

    group shared(internet)[Shared] in subs

    service d8(database)[Platform Library] in shared
    service d11(server)[Pipeline Processor] in shared
    service d12(database)[STAC Server] in shared


    group collab(internet)[Collaborative] in subs

    service d13(server)[Authentication] in collab
    service d6(server)[Commenting] in collab
    service d7(server)[Presence Locking] in collab
    service d9(cloud)[Analysis Dashboard] in collab
    service d10(database)[Wargame Metadata] in collab

</div>

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
