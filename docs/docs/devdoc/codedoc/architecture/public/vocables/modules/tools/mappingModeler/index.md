<!-- AUTO-GENERATED: do not edit by hand -->
# MappingModeler

<!-- AUTO-DESC:START -->

# MappingModeler documentation tool

## Overview

MappingModeler is a web-based semantic data mapping tool designed to facilitate the creation, visualization, and management of mappings between different data sources. It provides an intuitive UI, interactive graphs, and various modules for handling mappings efficiently.

## Modules

### 1. DataSourceManager

This module handle creating, deleting, and updating data sources and their mappings within the mapping modeler. It Manages configuration,
loading, and saving of data sources (databases and CSV files). It builds and updates the Jstree UI to display sources, tables, and their
statistics.

### 2. MappingColumnsGraph

Handles the visualization and management of mapping columns in a graph-based interface.
It manages the graph visualization of tables, columns, classes, and mappings using Vis.js. It handles drawing, updating, clustering, and
saving graph nodes/edges that represent mapping relationships. It loads, migrates, imports, and exports mapping graphs, keeping them
synchronized with data source configurations

### 3. MappingModeler

The core module for creating new mappings from sources, visualizing them, and enabling editing capabilities.
It manages user interactions for creating, editing, and deleting mappings between tables, columns, classes, and properties.
It loads and displays suggestions (columns, classes, properties) and handles resource creation through integrated bots.
It controls visualization updates, sample data preview, triples generation, and synchronization with data source and graph modules.

### 4. MappingsDetails

Manages technical (non-structural) mappings within the application (for columns, such as URI patterns, rdf:type, rdfs:label, transforms,
and custom predicates). It builds and displays the detailed mappings tree and graph, letting users inspect, edit, and delete mapping elements.
It handles column‑level dialogs to configure mapping rules, including transformations, lookups, datatype properties, and subclass behaviors.

### 5. MappingTransform

Responsible for generating and managing mappings for the MappingTransform process. It retrieves mappings from the Vis.js graph and formats them
as JSON for further processing. It also supports generating SLS and (soon) R2ML mappings. It provides utility functions for filtering mappings, adding restrictions, attaching lookups, and preparing mapping sets for triple creation workflow

### 6. TripleFactory

Handles the creation, filtering, and management of RDF triples. This includes generating sample triples, creating mappings triples, and indexing
the graph.

### 7. UIcontroller

Manages the UI display, including panels, tab activation, and visibility of data sources, column mappings, technical mappings and RDF triples.
It coordinates UI actions with other modules (e.g., MappingModeler, MappingsDetails)

## Features

- **Graph-based Visualization**: Uses Vis.js for an interactive mapping experience
- **Data Source Management**: Supports configuring and integrating various data sources
- **Mapping Creation & Editing**: Enables users to define and modify mappings dynamically
- **Technical & Structural Mappings**: Differentiates between different types of mappings
- **Triple Generation**: Supports RDF triple creation for semantic web applications
- **User-friendly Interface**: Provides a structured UI for efficient navigation and mapping operations

## Usage
- Configure data sources in DataSourceManager
- Use MappingModeler to create and edit mappings
- Visualize mapping columns with MappingColumnsGraph
- Generate and format mappings with MappingTransform
- Manage technical mappings using MappingsDetails
- Handle RDF triples with TripleFactory
- Control UI components via UIcontroller

<!-- AUTO-DESC:END -->


```{toctree}
:maxdepth: 5
:caption: Contents


```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `mappingColumnsGraph.js`
- `mappingModeler.js`
- `mappingModelerRelations.js`
- `mappingsDetails.js`
- `mappingTransform.js`
- `tripleFactory.js`
- `uiController.js`

<!-- AUTO-INLINE-FILES:END -->

