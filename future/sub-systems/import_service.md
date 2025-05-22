# Import Service

This document defines the Import Service sub-system, part of the Debrief Rewrite under the Core Sub-Systems category.

## Purpose

The Import Service is responsible for parsing input documents into structured FeatureCollections for use in the Debrief analysis platform. It serves as the ingestion entry point for a variety of source formats.

The initial focus is on:
- Supporting OpRep documents (structured military messages)
- Providing demo support for legacy .rep and .dpf formats

## Operation
- Accepts a file upload from the user
- Parses the input into a valid GeoJSON FeatureCollection
- Initially extracts a LineString representing the vessel track
- Future versions will include Point features for events and sensor readings

## Metadata and Provenance
- Each FeatureCollection generated includes:
  - source: identifier of the input file or message
  - checksum: hash of the source document for traceability
- Each feature includes metadata referencing the source and checksum

## Interfaces
- Exposed via a user-driven UI module in the Client
- May be invoked directly or via drag/drop file handler
- Does not initially expose a REST API or pipeline interface

## File Formats (Initial Support)
- OpRep documents
  - Structured text with sections
  - Initial import focuses on position/course/speed/depth lines
- .rep / .dpf files
  - Legacy Debrief formats
  - Included for demonstration purposes, not for core workflows

## Future Enhancements
- Expand OpRep support to include additional narrative sections
- Add tagging of features by time, serial, or classification
- Enable background batch import via Pipeline Processor
- Support structured .csv or .xlsx as alternative input formats