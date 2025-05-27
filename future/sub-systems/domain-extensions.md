# Vision: *Debrief Core + Domain Extensions*

## Debrief Core (Reusable Across All Domains)

These are the foundational systems, shared regardless of domain:

| Layer             | Component                                          | Role                                                                 |
| ----------------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| **Data Handling** | FeatureCollection-based track store, STAC metadata | Manages track/event data                                             |
| **UI**            | Timeline, Map Viewer, Layer Manager                | Visualises spatiotemporal data                                       |
| **Collab**        | Comments, Locking, Dashboard                       | Supports multi-user workflows                                        |
| **RAP Engine**    | Reproducible Analysis Pipelines                    | Automates repeatable tasks                                           |
| **AI**            | LLM Supervisor + MCP agents                        | Provides insights, suggestions, summaries                            |
| **Import/Export** | Pluggable import/export service                    | Converts domain-specific formats to/from standardised internal forms |
{:.table-striped}

---

## 🔌 Domain Extensions (Optional, Plug-in Based)

| Domain           | Extension Name    | Key Features                                                                                              |
| ---------------- | ----------------- | --------------------------------------------------------------------------------------------------------- |
| **Maritime**     | Maritime Ops Pack | Platform library (subs/surface), `.rep`/`.dpf` importers, sonar visualisation, bathymetry-aware analytics |
| **Land**         | Ground Ops Pack   | Road network overlays, terrain masking, foot/mobile unit support, dismounted patrol tracking              |
| **Air**          | Air Ops Pack      | Altitude-aware plotting, airspace zones, route planning overlays, UAV/ISR footage integration             |
| **Cyber**        | Cyber Pack        | Event timelines, intrusion kill chains, pivot analysis, network topology overlays                         |
| **Multi-domain** | Doctrinal Pack    | Campaign phases, asset-task relationships, joint mission evaluation views                                 |

Each pack includes:

* Platform metadata
* Importers for common domain formats
* Domain-specific pipeline modules (e.g., “check terrain line-of-sight”, “identify SIGINT gaps”)
* Optional UI elements (e.g., airspace deconfliction grid)

---

## 📙 Diagram: Architecture Sketch

<div class="mermaid">

graph TD
A\[Debrief Core]
A --> B1\[STAC Server]
A --> B2\[Client UI]
A --> B3\[Pipeline Engine]
A --> B4\[LLM Supervisor]
A --> B5\[Collab Dashboard]
B2 --> C1\[Map Viewer]
B2 --> C2\[Timeline]
B2 --> C3\[Storyboarding]
A --> D1\[Import Service]
A --> D2\[Export Service]

subgraph Maritime Pack
E1\[.rep/.dpf Importer]
E2\[Sonar View]
E3\[Platform Library: Ships/Subs]
end

subgraph Land Pack
F1\[Terrain Server]
F2\[Road/Urban Overlay]
F3\[Patrol Tracker]
end

subgraph Air Pack
G1\[Altitude Visualisation]
G2\[Air Corridor Models]
G3\[UAV Feed Annotator]
end

subgraph Cyber Pack
H1\[Network Timeline]
H2\[Intrusion Correlator]
end

A --> E1
A --> F1
A --> G1
A --> H1

</div>

---

## 🏗 Implementation Strategy

* Each pack = standalone plugin folder or module
* Use a **registry pattern** to dynamically load:

  * Import/export formats
  * Platform types & metadata
  * Pipeline tools
  * UI extensions
* Base all UI on **generic trackable features + events**
* Define extension points for:

  * Sidebar components
  * Timeline decorations
  * Map overlays
  * MCP agent bundles
