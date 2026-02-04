<!-- AUTO-GENERATED: do not edit by hand -->
# Lineage documentation tool

<!-- AUTO-DESC:START -->

## Overview

Containers 

## Modules

### 1. lineage_axioms

The module manages and visualizes axioms in a lineage graph. It retrieves classes with their associated axioms from a data source and builds graph nodes and edges representing these relationships. The graph is drawn or updated, showing each class linked to its axiom types. It also includes a test function that loads a sample node and displays its axioms in a dialog.

### 2. lineage_combine

The module combines multiple ontology sources into a single lineage graph and manages their visibility and grouping. It opens a dialog to pick OWL/SKOS sources, registers them, draws them. It provides popup menu actions to hide, show, group, and ungroup sources directly from the graph. It offers a merge dialog where users choose target source node, merge mode and depth, whether to include restrictions, and nodes to merge. The merge process gathers descendants, preserves hierarchy and OWL restrictions, builds triples, inserts them into the target SPARQL graph, and reindexes in search.

### 3. lineage_combine

The module defines shared utility functions used across the lineage system. It lets users copy a node’s data to the clipboard in JSON format.  It allows deletion of ontology nodes while preventing deletion of nodes that have children. It supports pasting a copied node under a parent node, enforcing OWL type compatibility and generating the necessary RDF triples. It inserts these triples into the target SPARQL source and updates the jstree view accordingly and also toggles whether imported ontologies should be included in SPARQL queries.

### 4. lineage_createRelation

The module provides all mechanisms for creating relationships between ontology nodes, including predicates and OWL restrictions. It draws the new relationship in the lineage graph, applying colors, labels, arrow types and handling cardinalities when needed, and also supports advanced features such as creating sub‑properties, generating metadata triples, managing imports between ontology sources, and updating in‑memory ontology models. It allows deleting restrictions, including removing triples and updating caches and graph edges accordingly.

### 5. lineage_createResource

The module manages createation of new ontology resources such as classes or named individuals.  It generates all required RDF triples for the new resource, including label, type, hierarchy links, and metadata (creator, date, status). It generates the resource URI based on user input (specific URI, label‑based URI, or random). It writes the resource triples to the SPARQL backend, checks if the URI already exists, indexes the new node, and updates the ontology model cache. It also updates the lineage graph by drawing the new node (and parents) and supports additional features like adding predicates or creating subclasses.

### 6. lineage_createSLSVsource

The module is made to create new SLSV (Sous Le Sens Vocables) sources, it validates source name and graph URI before creating a new source configuration. It builds a complete source object containing metadata, SPARQL settings, schema type, permissions, imports, and ownership information. After that it automatically assigns a prefix and constructs a base URI for the new source. The source configuration is sent to the backend via an AJAX request, saving it on the server. 

### 7. lineage_decoration

The module handles visuals decorations and styles of nodes in the lineage graph (including colors, shapes, and icons).It initializes and updates the legend by resetting stored data and rendering a new legend tree. It decorates nodes based on upper‑ontology classifications by computing their ancestor classes and assigning predefined colors.
It handles special cases such as NamedIndividuals and container nodes. The Vis.js graph is updated with new styling, including class colors, blank‑node shapes, and custom icons stored in decoration data. A merged legend is built and dsiplayed showig ontology classes groupe under the top level ontology.

## Features

- **Query RDF containers**: fetch top containers, descendants, and ancestors using SPARQL, including depth‑controlled graph via rdfs:member paths.


## Usage

- Quickly find a container by name

<!-- AUTO-DESC:END -->


```{toctree}
:maxdepth: 5
:caption: Contents


```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `lineage_axioms.js`
- `lineage_combine.js`
- `lineage_common.js`
- `lineage_createRelation.js`
- `lineage_createResource.js`
- `lineage_createSLSVsource.js`
- `lineage_decoration.js`
- `lineage_dictionary.js`
- `lineage_graphPaths.js`
- `lineage_graphTraversal.js`
- `lineage_nodeCentricGraph.js`
- `lineage_properties.js`
- `lineage_reasoner.js`
- `lineage_relationFilter.js`
- `lineage_relationIndividualsFilter.js`
- `lineage_relations.js`
- `lineage_rules.js`
- `lineage_selection.js`
- `lineage_similars.js`
- `lineage_sources.js`
- `lineage_whiteboard.js`

<!-- AUTO-INLINE-FILES:END -->

