# MappingModeler

## Overview

MappingModeler is a web-based semantic data mapping tool designed to facilitate the creation, visualization, and management of mappings between different data sources. It provides an intuitive UI, interactive graphs, and various modules for handling mappings efficiently.

## Modules

### 1. DataSourceManager

Manages data-source configurations and operations for the Mapping Modeler:
 - Loads database/CSV sources and builds the left JsTree.
 - Switches current data source/table and updates MappingModeler state & tabs.
 - Syncs source config with the Vis.js graph (save, init, delete).
 - Provides table stats and helpers to add/remove sources and mappings.

### 2. MappingColumnsGraph

Handles the visualization and management of mapping columns in a graph-based interface.

### 3. MappingModeler

The core module for creating new mappings from sources, visualizing them, and enabling editing capabilities.

### 4. MappingsDetails

Manages technical (non-structural) mappings within the application.

### 5. MappingTransform

Responsible for generating and managing mappings for the MappingTransform process. It retrieves mappings from the Vis.js graph and formats them as JSON for further processing. It also supports generating SLS and (soon) R2ML mappings.

### 6. TripleFactory

Handles the creation, filtering, and management of RDF triples. This includes generating sample triples, creating mappings triples, and indexing the graph.

### 7. UIcontroller

Manages the UI display, including panels, tab activation, and visibility of data sources, column mappings, technical mappings, and RDF triples.

## Features

- **Graph-based Visualization**: Uses Vis.js for an interactive mapping experience.
- **Data Source Management**: Supports configuring and integrating various data sources.
- **Mapping Creation & Editing**: Enables users to define and modify mappings dynamically.
- **Technical & Structural Mappings**: Differentiates between different types of mappings.
- **Triple Generation**: Supports RDF triple creation for semantic web applications.
- **User-friendly Interface**: Provides a structured UI for efficient navigation and mapping operations.

## Usage
- Configure data sources in DataSourceManager.
- Use MappingModeler to create and edit mappings.
- Visualize mapping columns with MappingColumnsGraph.
- Generate and format mappings with MappingTransform.
- Manage technical mappings using MappingsDetails.
- Handle RDF triples with TripleFactory.
- Control UI components via UIcontroller.
