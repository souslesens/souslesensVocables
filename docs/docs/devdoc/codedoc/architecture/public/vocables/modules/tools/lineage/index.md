<!-- AUTO-GENERATED: do not edit by hand -->
# Lineage documentation tool

<!-- AUTO-DESC:START -->

## Overview

Lineage is designed to visualize ontologies and knowledge graph data as dynamic, interactive graphs on a whiteboard interface. It offers functionnalities to : load ontology sources, manage imports as welle as build, update, and interact with the ontology graph and provide selection, similarity detection, rule building, relation querying, filtering, SPARQL operations, and node‑centric exploration tool.
All of these are displayed in a coherent UI dialog interface and context menus.

## Modules

### 1. lineage_axioms

The module manages and visualizes axioms in a lineage graph. It retrieves classes with their associated axioms from a data source and builds graph nodes and edges representing these relationships. The graph is drawn or updated, showing each class linked to its axiom types. It also includes a test function that loads a sample node and displays its axioms in a dialog.

### 2. lineage_combine

This module combines multiple ontology sources into a single lineage graph and manages their visibility and grouping. It opens a dialog to pick OWL/SKOS sources, registers them, draws them. It provides popup menu actions to hide, show, group, and ungroup sources directly from the graph. It offers a merge dialog where users choose target source node, merge mode and depth, whether to include restrictions, and nodes to merge. The merge process gathers descendants, preserves hierarchy and OWL restrictions, builds triples, inserts them into the target SPARQL graph, and reindexes in search.

### 3. lineage_common

It defines shared utility functions used across the lineage system. It lets users copy a node’s data to the clipboard in JSON format.  It allows deletion of ontology nodes while preventing deletion of nodes that have children. It supports pasting a copied node under a parent node, enforcing OWL type compatibility and generating the necessary RDF triples. It inserts these triples into the target SPARQL source and updates the jstree view accordingly and also toggles whether imported ontologies should be included in SPARQL queries.

### 4. lineage_createRelation

This module provides all mechanisms for creating relationships between ontology nodes, including predicates and OWL restrictions. It draws the new relationship in the lineage graph, applying colors, labels, arrow types and handling cardinalities when needed, and also supports advanced features such as creating sub‑properties, generating metadata triples, managing imports between ontology sources, and updating in‑memory ontology models. It allows deleting restrictions, including removing triples and updating caches and graph edges accordingly.

### 5. lineage_createResource

It manages creation of new ontology resources such as classes or named individuals.  It generates all required RDF triples for the new resource, including label, type, hierarchy links, and metadata (creator, date, status). It generates the resource URI based on user input (specific URI, label‑based URI, or random). It writes the resource triples to the SPARQL backend, checks if the URI already exists, indexes the new node, and updates the ontology model cache. It also updates the lineage graph by drawing the new node (and parents) and supports additional features like adding predicates or creating subclasses.

### 6. lineage_createSLSVsource

This module is made to create new SLSV (Sous Le Sens Vocables) sources, it validates source name and graph URI before creating a new source configuration. It builds a complete source object containing metadata, SPARQL settings, schema type, permissions, imports, and ownership information. After that it automatically assigns a prefix and constructs a base URI for the new source. The source configuration is sent to the backend via an AJAX request, saving it on the server. 

### 7. lineage_decoration

This module handles visuals decorations and styles of nodes in the lineage graph (including colors, shapes, and icons).It initializes and updates the legend by resetting stored data and rendering a new legend tree. It decorates nodes based on upper‑ontology classifications by computing their ancestor classes and assigning predefined colors.
It handles special cases such as NamedIndividuals and container nodes. The Vis.js graph is updated with new styling, including class colors, blank‑node shapes, and custom icons stored in decoration data. A merged legend is built and displayed showing ontology classes grouped under the top level ontology.

### 8. lineage_dictionary

Ontology dictionaries and terms mappings are managed by this module. It handles operations and queries based on dictionary, it resolves domain/range source relationship. It supports dictionary based search, filtering and constraints. Metadata and timestamp are also managed by this module as well as dictionary visualization and navigation. It provides validation actions (promote, unPromote, trash, delete) that execute SPARQL UPDATEs on selected restriction nodes.

### 9. lineage_graphPath

Build a graph structure from VisJS node and edge data, optionally reversing edges. It computes all possible paths: from one node, to one node, or between two nodes, with safeguards against excessive iterations. The resulting paths is formatted in several output types (text, CSV, HTML, or list of edges) and optionally removes duplicates. Paths are highlighted on the VisJS graph by decorating edges, or displays them as text/CSV/HTML.A function allows to clear all path decorations and restore original edge colors.

### 10. lineage_graphTraversal

Build a graph structure from VisJS

### 11. lineage_nodeCentricGraph

Build a hierarchical subgraph starting from a chosen root node, collecting all reachable nodes and edges and assigning each node a depth level. It also Detects and stores orphan nodes that are not reachable from the chosen root. Hierarchical Vis.js graph (top‑down or left‑right) are drawn using the extracted subgraph and custom layout options. Provide a function to list all relations of a given node.
Act as a helper module to visualize node‑centric views of the larger whiteboard graph.

### 12. lineage_properties

This module manage ontology properties (object and datatype), including their hierarchies, domains, ranges, restrictions, and metadata. It also builds jstree structures to browse properties, loads sub‑properties on demand, and provides context‑menu actions such as viewing info, drawing graphs, or copying/pasting nodes. Several types of property‑based graphs: restrictions graphs, range‑and‑domain graphs, predicate graphs, and property‑relation graphs, are integrated them into the whiteboard visualization. Properties and their characteristics can be retrieved via SPARQL (domain, range, inverse properties, sub‑properties), and formats them for export. It also supports search across sources, generates property matrices for OWL classes, and handles UI actions for filtering, expanding, displaying, or exporting property information.

### 13. lineage_reasoner

This module acts as the reasoning engine of the Lineage tool, coordinating SPARQL access, UI dialogs, remote reasoning calls, and graph rendering. It provides reasoning features for ontologies, allowing inference, consistency checking, and detection of unsatisfiable classes. It queries a backend reasoner API, retrieves and parses results in functional‑style syntax, converts them to JSON triples, and enriches them with human‑readable labels. It displays results either as tables or as Vis.js graph visualizations, with filtering and selection via jstree widgets. It also supports choosing inference predicates, listing inferred subjects, and drawing reasoning‑based node/edge structures.

### 14. lineage_relationFilter

It manages how users create and apply filters on relations between ontology nodes. It dynamically adjusts filter options according to domain and range information, loads allowed operators, and shows domain/range constraints when available. It also supports literal or URI‑based values, validates inputs, and finally generates SPARQL filter fragments that get appended to the relation‑query filter area.

### 15. lineage_relationindividualsFilter

This module manages filtering of ontology individuals when exploring relations. The user can choose a class or constraint role, search for individuals by label, and select them from a tree. It builds SPARQL filters for selected individuals or date‑based criteria, updates the query filter block, and optionally adds domain/range constraints. Finally, it applies the filter to the relations visualization and closes the dialog.

### 16. lineage_relations

It manages how relationships between ontology nodes are queried, filtered, and visualized. Users may choose properties, directions, and filters, then builds SPARQL‑based queries accordingly. It retrieves predicates, restrictions, inverse relations, and inferred properties, and draws them as Vis.js graphs or tables. It integrates domain/range and individual filters, merges results from multiple SPARQL calls, and handles graph updates, coloring. It also supports saving, reloading, and re‑executing user‑defined relation queries.

### 17. lineage_rules

A rules‑editing interface is provided and allows to search ontology classes and properties, select them, and add them as premises or conclusions of a rule. It displays search results in a tree and expands nodes with allowed properties pulled from ontology constraints. It stores selected rule components, lets users remove them, and builds structured rule payloads for simple reclassification rules or multi‑premise rules involving object properties. Finally, it sends the rule definition to a backend reasoning service for execution

### 18. lineage_selection

It manages how nodes are selected, deselected, and manipulated inside the lineage graph. It keeps track of selected nodes, updates their visual styling, and generates a tree view of selections for inspection. It supports multi‑selection using keyboard modifiers, lets perform actions such as filtering, decorating, exporting, and modifying predicates on the chosen nodes. It also handles advanced selection utilities like selecting all graph nodes, retrieving only selected IDs, generating SPARQL filters, or identifying “top” nodes in parent‑child structures.

### 19. lineage_similars

Module that allows to find nodes with similar labels—either exactly or approximately—across ontology sources or within the current whiteboard. It lets users choose the starting nodes and the target sources, searches matching labels via ElasticSearch, and builds similarity groups. It then generates edges linking similar nodes, displays them as a graph or table, or saves them as similarity triples. It also provides tools to explore and export similarity taxonomies and to save it.

### 20. lineage_sources

Ontology sources are managed in the Lineage tool: loading them, activating one as the current source, and displaying them in the UI. It initializes sources by registering their models, imports, and ElasticSearch indexes, and sets the top‑level ontology accordingly. It updates the whiteboard to show or hide nodes by source, adjusts colors or opacity, and handles grouping, ungrouping, closing, and exporting sources. It also controls UI elements such as edit buttons, search scope settings, and source‑specific menus. Overall, it orchestrates all interactions between ontology sources, the whiteboard graph, and user permissions.

### 21. lineage_whiteboard

This module s the central engine orchestrating visualization, interaction, and data retrieval for the Lineage knowledge‑graph whiteboard. It controls the entire Lineage whiteboard graph: creating it, resetting it, and updating it with nodes, edges, colors, layouts, and user interactions. It loads ontology sources, draws top concepts, fetches parents, children, restrictions, object properties, linked data, similars, and inferred classes, and adds them as visual graph elements. It manages all graph events such as clicks, double‑clicks, hover selection, context menus, zooming, expanding, collapsing, removing nodes, showing info panels, and running SPARQL‑based queries. It also handles clustering, node styling, source‑based coloring, property‑based coloring, and decorations. The module provides export/import of whiteboards (JSON, SVG, GraphML, PlantUML), browsing tools, and integration with search widgets, linked data widgets, and relation‑creation dialogs.

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

