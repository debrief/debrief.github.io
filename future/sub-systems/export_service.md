# Export Service

This document defines the `Export Service` sub-system, part of the Debrief Rewrite under the **Core Sub-Systems** category.

## Purpose

The Export Service enables users to extract and share analysis results from Debrief in a variety of formats, supporting visual briefing, structured reporting, and interoperation with external tools.

## Initial Capabilities

* **Screenshot to Clipboard**

  * Most common current workflow
  * Allows pasting plots into PowerPoint or Word
  * Supports map viewport, timeline, and visible annotations

* **CSV Export**

  * Tabular summaries of key events or RAP outputs
  * Useful for spreadsheets or data transformation

* **HTML Bundle Export**

  * Zipped viewer with static data and simple playback tools
  * Includes plot, timeline, event markers, and optional annotations

* **PowerPoint Export** *(Planned)*

  * Dynamic slides representing storyboard steps
  * Embedded maps, event tables, and navigation controls

## Interfaces

* Triggered via **contextual export buttons** in:

  * Timeline view
  * Storyboard Editor
  * Annotation or event summaries
* No background batch or scheduled exports at this time

## Behaviour

* Export is always user-triggered
* Visible annotations and viewport state are respected in export output
* Storyboard export, when available, will include navigation and embedded event data

## Future Enhancements

* Export as screenshot sequences
* Export as MP4 for video playback
* Export a standalone `Debrief Bundle` (HTML + data + embedded player)
* Export audit trail or RAP summary tables for review packs

## Notes

* PDF export is *not* supported or prioritised
* Clipboard remains the primary interaction for visual output
