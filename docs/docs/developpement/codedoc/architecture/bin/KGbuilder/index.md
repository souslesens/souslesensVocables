<!-- AUTO-GENERATED: do not edit by hand -->
# KGbuilder

<!-- AUTO-DESC:START -->

This page summarizes the code structure for this directory and its immediate subdirectories. It focuses on the `bin / KGbuilder` area within the `bin` module. Use the table of contents below to navigate deeper.

<!-- AUTO-DESC:END -->

## Overview

The **KGbuilder** directory contains the **current-generation knowledge graph construction pipeline**. It handles the end-to-end process of transforming tabular data (CSV files or database tables) into RDF triples and inserting them into a SPARQL triple store. The pipeline is designed to run as a background task with real-time progress communication via WebSocket.

---

## Modules

1. **KGbuilder_main.js** — Main entry point for the KG builder that orchestrates the triple generation workflow from CSV or database sources, managing mappings, data processing, and socket-based progress communication.
2. **KGbuilder_socket.js** — Simple socket wrapper that sends progress messages to connected clients or logs to console during knowledge graph building operations.
3. **KGbuilder_triplesWriter.js** — Writes generated RDF triples to SPARQL endpoints in batches, constructing proper INSERT queries with standard ontology prefixes (RDF, RDFS, OWL, SKOS, etc.).
4. **mappingsParser.js** — Parses visjs-format mapping graphs from JSON files, extracts column mappings and triple models, and builds data structures for RDF generation from tabular sources.
5. **recreateGraph.js** — Async wrapper script that deletes existing knowledge graph triples and retrieves mapping configurations for graph reconstruction operations.
6. **triplesMaker.js** — Reads tabular data in batches and generates RDF triples from column-to-predicate mappings, supporting CSV files and database tables with progress tracking and deduplication.

---

## Features

- **Batch processing** of large datasets with configurable batch sizes and progress tracking.
- **Socket-based progress communication** for real-time feedback to the frontend during long-running builds.
- **Standard ontology prefix management** (RDF, RDFS, OWL, SKOS, XSD) for generated INSERT queries.
- **Mapping graph parsing** from visjs-format JSON files, bridging the MappingModeler frontend with backend triple generation.
- **Graph recreation** with delete-and-rebuild capability for iterative mapping development.
- **Deduplication** of generated triples to avoid redundant insertions.

---

## Usage

- The pipeline is triggered from the frontend KGcreator/MappingModeler tools.
- `KGbuilder_main.js` is called with a source configuration, reads mapping definitions via `mappingsParser.js`, processes data via `triplesMaker.js`, and writes results via `KGbuilder_triplesWriter.js`.
- Progress is reported via `KGbuilder_socket.js` to the connected WebSocket client.
- `recreateGraph.js` is used to delete and rebuild a graph from scratch.


```{toctree}
:maxdepth: 5
:caption: Contents

```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `KGbuilder_main.js`
- `KGbuilder_socket.js`
- `KGbuilder_triplesWriter.js`
- `mappingsParser.js`
- `recreateGraph.js`
- `triplesMaker.js`

<!-- AUTO-INLINE-FILES:END -->
