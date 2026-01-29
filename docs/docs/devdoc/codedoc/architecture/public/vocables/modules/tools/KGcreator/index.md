<!-- AUTO-GENERATED: do not edit by hand -->
# KGcreator documentation tool

<!-- AUTO-DESC:START -->

## Overview

KGcreator manages data sources, lets users explore tables/columns, and define RDF mappings. It allows to visualize these mappings and ontology elements in an interactive graph. It handle joins and triple creation for columns.

## Modules

### 1. KGcreator

This module loads and manages a UI that lets you connect data sources (databases or CSV files), browse their tables/columns in a tree, create “mappings” (RDF triples), visualize them as a graph, and save/load those mappings as JSON files on the server.

### 2. KGcreator_graph

It draws and manages an interactive graph that visualizes ontology classes, tables, columns, and their mappings using Vis.js. It connects mapping data from KGcreator to the graph, showing class assignments, column-to-column links, and table joins. It handles graph interactions and manages creating new edges to define joins or predicates. It also renders detailed mapping graphs and updates.

### 3. KGcreator_joinTables

This module lets the user define a join between two database tables by selecting join tables and key columns. It loads the database schema, fills dropdowns with tables and columns, and builds a join object from the user’s selections. It can display the generated SQL join and allows testing or previewing it. Finally, it returns the join definition to KGcreator through a callback so it can be saved in the mapping configuration.

### 4. KGcreator_mappings

It allows the user to map a selected table column to RDF triples via a dialog box. It builds/edits triples (subject–predicate–object), supports basic type mappings, blank nodes, string literals, lookups, and custom transform functions. It saves the resulting column/table mappings back into KGcreator’s configuration JSON and updates the jsTree style and the Vis.js graph accordingly.

### 5. KGcreator_run

It executes KGcreator mappings by generating RDF triples from a selected table or from all mappings, optionally showing sample triples in a data table. It can filter mappings based on the user’s text selection, send generation requests to the backend, and display progress or results.
It also supports deleting KGcreator‑generated triples, clearing or re‑indexing the graph, and stopping ongoing triple generation. Finally, it coordinates UI updates, mapping previews, and interactions with the server to run or test KGcreator mappings.

## Features

- **Datasource browsing & actions**: builds the DB/CSV tree, exposes rich context menus
- **DB/CSV ingestion + mapping load**: loads DB tables, CSV headers and the corresponding mappings JSON and populates columns
- **Column→RDF triple mapping UI**: create/edit triple models
- **Advanced mapping capabilities**: supports lookups, per-column transform functions, and ontology-driven predicate selection
- **Join object construction**: builds a structured join definition from UI selections
- **Interactive ontology + mappings visualization**: draw the ontology model and overlay mapping elements
- **Graph-driven mapping & join creation**: create edges directly in the graph—table→table edges open the join dialog and save joins
- **Generate RDF triples from mappings**: send requests to the backend
- **Preview and monitor execution**: display generated triples and reports progress/messages

## Usage

- Load a new data source and its schema
- Inspect relational structures and define how tables connect through intermediate tables
- Select columns and open the semantic mapping dialog bow
- Assign RDF types, predicates, and lookup rules to translate raw columns into triples
- Add optional transform functions to normalize identifiers or format values consistently
- Save all mappings, enabling automated extraction of a coherent, queryable knowledge graph

<!-- AUTO-DESC:END -->


```{toctree}
:maxdepth: 5
:caption: Contents


```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `KGcreator_graph.js`
- `KGcreator_joinTables.js`
- `KGcreator_mappings.js`
- `KGcreator_run.js`
- `KGcreator.js`

<!-- AUTO-INLINE-FILES:END -->

