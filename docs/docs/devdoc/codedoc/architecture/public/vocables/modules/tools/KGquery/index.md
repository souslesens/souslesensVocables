<!-- AUTO-GENERATED: do not edit by hand -->
# KGquery tool documentation

<!-- AUTO-DESC:START -->

## Overview

KGquery is designed to query semantic data (triples) using a semantic model (a graph). It allows users to create requests from the graph, apply filters, calculate aggregates, display results in table or graph form, and save or retrieve queries

## Modules

### 1. KGquery_controlPanel

The module manages the user interface control panel for building and visualizing knowledge graph queries. It allows adding, labeling, and styling query sets with boolean operators (Union/Minus) in the UI and supports adding query elements to sets, marking them as optional via sliders or checkboxes. It also enables adding nodes and predicates to query elements and linking them with filters. It’s globally a controller that manage users actions and redirect to the related methods. It acts as a controller and
manage actions and redirect methods.

### 2. KGquery_filter

It manages filtering functionality for knowledge graph queries, allowing users to select optional predicates for query refinement. Optional Predicate Selection: it collects non-object properties from query nodes, aggregate displays them in a jsTree UI, and allows users to select which predicates to include. It supports queries, filtered properties mapping, and setting a sample size for query execution. Filters can be applied to nodes, updating both the internal query state and the jsTree interface.

### 3. KGquery_graph

This module is responsible for constructing SPARQL clauses related to the predicates of a query derived from a knowledge graph. It defines the standard SPARQL prefixes (rdf, rdfs, owl, xsd) used in all queries. It transforms graphical query elements (nodes, paths, options) into structured SPARQL triples. It manages RDF types, class relationships, direct or inverse paths, and OPTIONAL clauses. It supports simple queries, joined queries (JOIN), union queries (UNION), and aggregated queries. It dynamically assembles the SELECT, WHERE, GROUP BY, and ORDER BY clauses. The module returns the final query as well as metadata (union, join, distinct types). It globally manages graphics representation and contains interactions related to the requests, draws the graphs and manage users actions.

### 4. KGquery_myQueries

It handles saving and loading of knowledge graph queries. It Captures the current query state, including query sets, SPARQL query, optional predicates, and select clauses. With the Load Function, it is able to restore a saved query state, recreating query sets, nodes, edges, and filters in the interface. Alerts the user if saving or loading fails, ensuring the workflow doesn’t break unexpectedly.

### 5. KGquery_nodeSelector

This module manages node selection in knowledge graph queries using a jsTree interface. It converts Vis.js graph data into a jsTree structure, displaying only nodes with non-object properties. Nodes in the rtee can be selected, triggering the onSelectNode function to identify linked nodes within a certain depth. The module filters the jsTree to show only allowed nodes and adds selected nodes to the current query.

### 6. KGquery_paths

It provides functionality for: configuring and managing paths between nodes, manipulating identifiers and variables in paths, managing graphical display of paths, finding shortest paths between nodes and also managing path ambiguities.

### 7. KGquery_predicates

It builds SPARQL queries from a knowledge graph structure. It generates rdf:type predicates for nodes, path predicates between nodes, and handles optional clauses. It supports multiple query sets with UNION or JOIN logic and applies class filters. It can also build aggregate queries with GROUP BY and ORDER BY. Overall, it focuses on constructing query strings, not executing them.

### 8. KGquery_proxy

This module acts as a proxy between the visualized knowledge graph (Vis.js) and the SPARQL query construction engine (KGquery). It orchestrates the initialization of the context, the addition of nodes and edges to the query, the selection of optional predicates, and the application of filters.

### 9. KGquery

This is the central module for querying, managing, and visualizing knowledge graphs. It handles query sets, query elements, nodes, edges, and supports building SPARQL path queries dynamically. It can execute queries, aggregate results, and display them as tables, graphs, Gantt charts, or tag-based visualizations. It manages integration with widgets like KGqueryAggregateWidget, KGquery_graph, and SavedQueriesWidget allows flexible visualization and export of results. Globally it transforms actions in requests.

### 10. KGqueryAggregateWidget

This module implements a UI component for creating SPARQL aggregate queries. It provides a dialog where users select aggregating variables, aggregation functions, and target variables. Properties are analyzed to determine whether they are groupable or numeric based on their datatypes based on XSD datatypes. The widget dynamically generates the SPARQL (SELECT, WHERE, GROUP BY, and ORDER BY) clauses. The resulting aggregation clauses are returned for integration into a larger query process.

## Features

- **Visual Query Construction**: Click nodes and edges directly in the graph.
- **Automatic SPARQL Generation**
- **Boolean Query Logic**: Support for AND, OR, UNION combinations.
- **Optional Patterns**: automatic OPTIONAL handling.
- **Aggregation**: count, max, group by.
- **Cardinality Analysis**: Automatic detection of property cardinalities.
- **Graph Decorators**: Custom colors, shapes, icons, and label.
- **Persistent Graph and Query Models**

## Usage

- Load an Ontology Source.
- Draw the Top Classes.
- Expand the graph.
- Process to the require search.


<!-- AUTO-DESC:END -->


```{toctree}
:maxdepth: 5
:caption: Contents


```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `KGquery_controlPanel.js`
- `KGquery_filter.js`
- `KGquery_graph.js`
- `KGquery_myQueries.js`
- `KGquery_nodeSelector.js`
- `KGquery_paths.js`
- `KGquery_predicates.js`
- `KGquery_proxy.js`
- `KGquery.js`
- `KGqueryAggregateWidget.js`
- `KGqueryOld.js`

<!-- AUTO-INLINE-FILES:END -->

