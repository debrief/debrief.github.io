Client UI

This document defines the Client UI sub-system, part of the Debrief Rewrite under the Core Sub-Systems category.

Purpose

The Client UI is the primary user interface for analysts and reviewers. It provides:
	•	A spatial map viewer with timeline synchronisation
	•	Timeline-based controls and filtering
	•	Support for playback, zoom, and annotation tools
	•	Interface for RAP pipelines, imports, and exports
	•	Access to comments, presence status, and collaboration metadata
	•	RJSF-driven forms for agent configuration and tool parameters
	•	Storyboard editing and playback

It is designed to operate in:
	•	Browser-first deployments (MODNET, internal networks)
	•	Electron-wrapped deployments (for offline, at-sea, or deployed scenarios)

Interfaces
	•	Reads and writes GeoJSON FeatureCollections with metadata extensions
	•	Communicates via REST with:
	•	Import and Export Services
	•	STAC Server (for background layers and datasets)
	•	Presence/Locking and Commenting Services
	•	Platform Library (for annotation and participant tagging)
	•	Wargame Metadata Store (if present)
	•	MCP Agent Registry (for tool forms)
	•	LLM Supervisor (for insight requests or tasking)
	•	Displays embedded audit trails and annotation status

Deployment Mode
	•	Packaged as a web app built in React
	•	Served statically via a web server or bundled in Electron
	•	Can run standalone or connected to services
	•	Fallbacks to local file import/export if networked services are unavailable

Notes
	•	Supports private and public annotations, with toggles
	•	Pluggable via manifest-based tool registration and RJSF schema support
	•	UI adjusts based on deployment mode (basic vs dashboard-enabled)