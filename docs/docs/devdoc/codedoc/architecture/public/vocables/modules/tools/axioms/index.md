<!-- AUTO-GENERATED: do not edit by hand -->
# Axioms documentation tool

<!-- AUTO-DESC:START -->

## Overview

Axioms form an OWL authoring and exploration toolkit: it loads ontology classes/properties, extract and cache axioms/triples, convert between triples and Manchester syntax for display and validation. It provides guided axiom construction with context-aware suggestions. The visualization layer renders axioms as an interactive Vis.js graph with a “live legend” to add/remove nodes, then serializes the built graph back into RDF triple.

## Modules

### 1. axioms_manager

This module loads all ontology classes and object properties from a data source and stores them in a shared resource map. It retrieves class axioms or converts RDF triples into Manchester Syntax by calling backend API endpoints. It can list classes that have axioms defined and fetch detailed axiom information for a given class.

### 2. axiom_editor

It initializes an interactive UI for building OWL class axioms by selecting sources, classes, properties, and keywords. It constructs axioms visually by assembling UI elements, validates the syntax via API calls, and displays errors or success messages. It can generate triples, visualize them in a graph, or list them in a data table for export or further inspection.

### 3. axiomExtractor

This module runs a series of SPARQL queries to extract all basic OWL axioms from a source, including subclass relations, restrictions, intersections, unions, inverses, disjoints, and complements. It builds a structured in‑memory map of these axioms enriched with human‑readable labels. It can retrieve all axioms related to a specific class and recursively expand blank nodes to generate full RDF triples representing the class definition. It also updates and extends the internal axiom store when new triples are added, enabling visualization, analysis, or further processing.

### 4. axiom_activeLegend

It manages an “active legend” UI that lets users interactively build OWL axioms by clicking legend nodes (Class, ObjectProperty, Restriction, Connective) and selecting suggestions. It updates a Vis.js axiom graph in real time and can convert the graph structure into RDF triples. It supports saving the created axiom by inserting generated triples into the triple store and updating local axiom caches / UI trees for immediate reuse and visualization.

### 5. axioms_graph

It converts OWL axiom triples into a structured internal graph representation, inferring node types, symbols, and predicates to prepare them for visualization. It generates Vis.js graph nodes and edges with hierarchical layouts, handling restrictions, logical connectives, blank nodes, inverse properties, and disjoint‑class constructs. It supports adding new axiom fragments to an existing graph and recalculates node levels and visual properties to keep the representation readable and consistent.

### 6. axioms_suggestions

It analyzes the partially written axiom and the last selected token and determine whether the next valid elements should be classes, properties, or keywords, based on context. It retrieves semantically valid classes or properties using ontology domain and range constraints, ensuring suggestions comply with OWL semantics. It merges keyword suggestions with class/property lists, sorts them, removes duplicates, and returns a final set of context‑appropriate completion options.

### 7. nodeinfosAxioms

It loads and displays all axioms for a selected ontology class then renders them in a jstree and a Vis.js graph. It ini.tializes the active legend and resource maps, enabling users to explore or edit axioms. It supports interactive graph operations and keeps UI panels synchronized with user selections. It also allows creating new axioms via the legend interface

## Features

- **Automatic extraction of OWL axioms from SPARQL endpoints**: query an ontology source and extract core OWL
- **Intelligent suggestion engine based on ontology**: computes which classes, properties, or keywords are valid. Ensures that suggested axioms remain logically valid
- **Graph‑based visualization and exploration of axioms**: transform RDF triples into a dynamic VisJS graph
- **Axiom-oriented legend and guided graph interactions**:  add classes, properties, connectives, and restrictions directly from the graph interface, enforcing valid OWL construction rules
- **Node-centric axiom inspection and editing dashboard**: provides a full panel for any ontology resource

## Usage

- Load an ontology class in the interface, the system automatically extracts all its OWL axioms
- View these axioms as an interactive graph, exploring restrictions, properties, and logical constructors
- Inspect and navigate them through the axiom tree component
- Refine or add new axioms
- Build valid axioms directly on the graph, ensuring semantic correctness

<!-- AUTO-DESC:END -->


```{toctree}
:maxdepth: 5
:caption: Contents


```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `axiom_activeLegend.js`
- `axiom_editor.js`
- `axiomExtractor.js`
- `axioms_graph.js`
- `axioms_manager.js`
- `axioms_suggestions.js`
- `nodeInfosAxioms.js`

<!-- AUTO-INLINE-FILES:END -->
