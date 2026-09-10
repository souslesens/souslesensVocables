<!-- AUTO-GENERATED: do not edit by hand -->
# KG

<!-- AUTO-DESC:START -->

This page summarizes the code structure for this directory and its immediate subdirectories. It focuses on the `bin / KG` area within the `bin` module. Use the table of contents below to navigate deeper.

<!-- AUTO-DESC:END -->

## Overview

The **KG** (Knowledge Graph) directory contains the **legacy knowledge graph construction pipeline** and supporting modules for building RDF triples from structured data sources (CSV files, relational databases). It handles:

- Database connectivity across multiple engines (PostgreSQL, MySQL, SQL Server)
- CSV/matrix data transformation and formatting
- Equipment tag analysis and codification (industrial domain)
- Dictionary-based fuzzy matching via Elasticsearch
- Mapping configuration management
- Triple generation orchestration

This directory represents an older generation of KG building tools. The newer pipeline is in `bin/KGbuilder/`.

---

## Modules

### Core KG building

1. **KGbuilder..js** — Main orchestrator for knowledge graph construction that generates RDF triples from CSV or database sources using mapping definitions and handles triple generation workflows.
2. **KGcontroller..js** — File-based controller for managing mapping configurations, storing/retrieving JSON mapping definitions, and assembling global mapping collections for sources.

### Database connectors

3. **dbConnector.js** — Knex.js-based database connection abstraction that provides query execution and metadata retrieval (table/column information) across different database drivers (PostgreSQL, MySQL, SQL Server).
4. **KGSqlConnector..js** — Provides MySQL-specific SQL connections and queries for retrieving tag and model data with complex joins across multiple attribute tables.
5. **PostgresProxy..js** — PostgreSQL connection proxy and schema conversion utilities for migrating from SQL Server to PostgreSQL format.
6. **SQLserverConnector..js** — Manages SQL Server connections via the mssql library and handles data queries, with support for complex data enrichment and geometry operations.

### Data transformation

7. **CSVmatrixFormatter.js** — Transforms CSV data by reading files, extracting specified columns, and normalizing data into matrix format for further processing.
8. **codification..js** — Parses and analyzes equipment tag numbering systems (TEPDK format) from database records, mapping hierarchical codes to functional classifications and equipment properties for knowledge graphs.
9. **definitions.js** — Maintains a hardcoded list of POS CAESAR ontology URIs for industrial domain concepts (physical objects, quantities, activities, etc.) used in KG mappings.
10. **temporary..js** — Utility script that converts Excel spreadsheet data to tab-separated format by extracting specified columns from worksheets.

### Matching & analysis

11. **dictionaryMatcher..js** — Performs fuzzy text matching and similarity finding between CSV data and Elasticsearch indices to find semantic relationships and matching concepts.
12. **tagAnalyzer..js** — Analyzes equipment tag naming patterns, extracting character-level patterns (numeric vs alphabetic) and matching tags to functional classifications via database lookups.

---

## Features

- **Multi-database connectivity** via Knex.js abstraction supporting PostgreSQL, MySQL, and SQL Server with unified query interface.
- **Industrial domain support** with equipment tag codification (TEPDK format) and POS CAESAR ontology mappings.
- **Fuzzy matching** between CSV data and Elasticsearch-indexed dictionaries for semantic enrichment.
- **Mapping configuration management** with JSON-based storage and retrieval of column-to-predicate mappings.

---

## Usage

- The KG builder is typically invoked by the frontend KGcreator tool via Express routes.
- `KGcontroller..js` manages mapping configurations that define how CSV columns map to RDF predicates.
- `KGbuilder..js` orchestrates the pipeline: reads data via connectors, applies mappings, and generates triples.
- Database connectors are selected based on the configured data source type.


```{toctree}
:maxdepth: 5
:caption: Contents

tools/index
```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `codification..js`
- `CSVmatrixFormatter.js`
- `dbConnector.js`
- `definitions.js`
- `dictionaryMatcher..js`
- `KGbuilder..js`
- `KGcontroller..js`
- `KGSqlConnector..js`
- `PostgresProxy..js`
- `SQLserverConnector..js`
- `tagAnalyzer..js`
- `temporary..js`

<!-- AUTO-INLINE-FILES:END -->
