<!-- AUTO-GENERATED: do not edit by hand -->
# admin tool documentation

<!-- AUTO-DESC:START -->

## Overview

This module defines an Admin toolset for managing ontology sources, indexes, SPARQL graphs, and various maintenance operations within the application.

## Module

### 1. admin

It provides all tools required to maintain, export, clean, and inspect ontology data.
This module is a comprehensive administrative control panel that manages: ontology sources, elasticsearch indexes, SPARQL graphs, axporting/importing ontologies, taxonomy extraction, inverse property generation, SKG creation, user‑allowed sources, source metadata display, SPARQL utilities.

## Features

- **TSF Dictionary viewer**: Open a dialog showing the TSF dictionary using Lineage_dictionary.
- **Elasticsearch Index Management**: Clean and refresh indices.
- **Ontology Export Tools**: Export N-Triples and turtle TTL, export taxonomy to csv.
- **Taxonomies & Labels**: Retrieve and displays class hierarchy (taxonomy), Automatically generates skos.
- **Ontology Editing**: Open a dialog to define a property and its inverse, create inverse restriction triples in the ontology using SPARQL‑OWL.
- **SPARQL Graph Operations**: Completely deletes all triples in a source graph, copy a graph to another endpoint.
- **SKG generation**: Build an SKG version of an ontology in a chosen SPARQL graph URI.
- **Visualization Tools**: Generate a visual matrix displaying each property with its domain and range.

## Usage

- Manage ontology sources selected through a checkbox-based source selector.
- Clean or rebuild Elasticsearch indexes, export ontologies (NT, TTL, CSV), and inspect allowed sources.
- Modify SPARQL graphs, copy them to other endpoints, or generate inverse property restrictions.
- Access to the SPARQL query interface for running custom queries on selected sources

<!-- AUTO-DESC:END -->


```{toctree}
:maxdepth: 5
:caption: Contents

```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `admin.html`
- `admin.js`
- `graphLoaderDialog.html`
- `sparqlQuery.html`

<!-- AUTO-INLINE-FILES:END -->

