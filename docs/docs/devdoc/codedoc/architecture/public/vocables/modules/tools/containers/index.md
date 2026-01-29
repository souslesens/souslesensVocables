<!-- AUTO-GENERATED: do not edit by hand -->
# Containers documentation tool

<!-- AUTO-DESC:START -->

## Overview

Containers holds non semantic object such as technical collection. This tool query RDF containers, visualize them, and allow user interactions. It is able to fetch container hierarchies and update memberships via SPARQL. It is then render in a Vis.js graph and display in a jstree.

## Modules

### 1. container_graph

The module retrieves container types and hierarchical relations from SPARQL results and prepares them for graph rendering. It builds Vis.js nodes and edges, styling containers, classes, and individuals with distinct shapes and colors for clarity. The module can graph parent containers or all descendants of a selected container. It also manages layout, merging data into existing graphs, and applying ontology-based decorations for improved visualization.

### 2. container_query

It handles SPARQL interactions for containers, including retrieving top‑level containers and filtering them. It can fetch full descendant hierarchies using SPARQL property paths, returning parent–member relationships and type information for each node. It also retrieves container ascendants, enabling upward navigation through rdfs:member chains with optional depth or type filters. The module updates container structures by writing new parent membership via SPARQL DELETE/INSERT operations.

### 3. container_tree

This module builds and manages the jstree view of RDF containers, loading top containers or ancestor paths depending on the user’s search input. It transforms SPARQL results into tree nodes, handles selection to display descendants, and provides context‑menu actions for graphing, copying, adding, or deleting containers.
It also manages drag‑and‑drop moves and persists structure changes by issuing SPARQL DELETE/INSERT updates to modify container memberships

### 4. container_widget

IT opens a dialog box to browse and select RDF containers, wiring search inputs to either load top containers or display ancestor paths in a jstree. It validates the selection (top member + optional depth) and returns a payload to the caller; it list container types and graph parent containers via containers_graph.

## Features

- **Query RDF containers**: fetch top containers, descendants, and ancestors using SPARQL, including depth‑controlled graph via rdfs:member paths.
- **Edit container structure**: move nodes between containers, add/paste resources, and delete containers through SPARQL DELETE/INSERT.
- **Tree visualization**: display containers as an expandable tree with search, context menus, - drag‑and‑drop, and interactive selection. 
- **Graph visualization**: draw containers, classes, and individuals with specific colors/shapes; show descendants or parent graphs.
- **Search tools**: search by label to display matching containers with their ancestors or to filter possible parent containers.
- **ID mapping and consistency management**: maintain URI ↔ UI‑ID mapping to keep trees, graphs, and SPARQL data aligned.

## Usage

- Quickly find a container by name
- See where it sits in the hierarchy (its ancestors)
- Explore immediate members (children/leaves)
- Visualize the full descendant structure as a graph
- Optionally reorganize the hierarchy (drag a container into another container)

<!-- AUTO-DESC:END -->


```{toctree}
:maxdepth: 5
:caption: Contents

```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `containers_graph.js`
- `containers_query.js`
- `containers_tree.js`
- `containers_widget.html`
- `containers_widget.js`

<!-- AUTO-INLINE-FILES:END -->

