<!-- AUTO-GENERATED: do not edit by hand -->
# SparqlProxies tool documentation

<!-- AUTO-DESC:START -->

## Overview

SparqlProxies provide a complete toolkit to build, format, optimize, and execute SPARQL queries, including filters, prefixes, graph handling, and string sanitization. It implements a schema‑aware logic (SKOS, OWL, KG) for taxonomy navigation, triple manipulation, metadata retrieval, and ontology exploration across multiple sources. It includes a proxy execution layer and test suite to ensure secure querying, error handling, and correctness of SPARQL filters and responses.

## Modules

### 1. sparql_common

This module provides utility functions to build, clean, and format SPARQL queries (filters, prefixes, FROM clauses, date ranges, labels, etc.). It handles URIs, literals, blank nodes, and language‑specific labels for query results. It manages graph/source resolution, including imports and mappings across multiple RDF sources. It includes helpers to sanitize strings, extract labels from URIs, and generate standardized SPARQL fragments.

### 2. sparql_generic

It provides high‑level SPARQL utilities to retrieve, browse, and manipulate ontology/graph data (concepts, parents, children, triples, taxonomy). It wraps source‑specific controllers to fetch SKOS/OWL nodes, labels, collections, genealogy, and full graph structures. It implements bulk operations: slicing large ID lists, copying graphs, inserting/deleting triples, generating new URIs, and reconstructing hierarchies.It adds helpers to enrich results (missing labels, types, sorting) and to format SPARQL queries with prefixes, filters, and graph scoping.

### 3. sparql_OWL

This module manages to provide OWL‑specific SPARQL helpers to fetch top classes, children, parents, ancestors, restrictions, object properties and individuals from ontology graphs. It builds complex queries for taxonomy navigation, property domain/range inference, restriction extraction, and class hierarchy traversal. It includes utilities to resolve labels, types, graphs, and inherited constraints, and to enrich results with optional metadata. It supports bulk operations like fetching all triples, generating OWL exports, creating SKG graphs, and computing inferred property structures.

### 4. sparql_proxy

It  acts as a client‑side proxy layer that sends SPARQL queries (GET or POST) to remote endpoints, adding headers, prefixes, authentication, and optional caching. It automatically formats and encodes queries, manages Accept/Content‑Type negotiation, handles Fuseki/Virtuoso specifics, and logs or stores query history. It provides unified AJAX handling with error messages, retries, and support for exporting graphs, async querying, and injecting label graphs. It also ensures consistent routing through a backend /sparqlProxy API, enabling cross‑source querying, proxying, and secure credential forwarding.

### 5. sparql_SKOS

This module implements SKOS‑oriented SPARQL utilities to retrieve top concepts, children, parents, labels, collections and full genealogy of SKOS concepts. It uses SKOS predicates (prefLabel, altLabel, broader/narrower) and source‑specific settings to build flexible hierarchy and label‑focused queries. It provides functions to fetch all triples, update/insert/delete triples, copy graphs, and derive language lists for SKOS labels. It adds helpers to enrich bindings (types, labels), manage depth of traversal, and perform collection‑aware queries.

### 6. test_sparql

This module is a console‑based test suite that thoroughly checks getUriFilter() with URIs, literals, blank nodes, mixed inputs, and edge cases to validate correct SPARQL filter generation.

## Features

- **Visual Query Construction**: Click nodes and edges directly in the graph.
- **Boolean Query Logic**: Support for AND, OR, UNION combinations.
1. SPARQL Query Construction Utilities
All modules rely on sparql_common to dynamically build SPARQL filters, prefixes, graph clauses, date filters, string sanitization, and URI handling. [jemsprod-m...epoint.com]
2. Source‑Aware Graph Management
The system detects graph URIs, manages imports, and builds FROM/GRAPH clauses depending on the source definition, enabling cross‑source querying. [jemsprod-m...epoint.com]
3. Hierarchical Navigation (SKOS & OWL)
Sparql_OWL and Sparql_SKOS implement parent/child lookup, ancestors, descendants, taxonomy traversal, and genealogy extraction for both OWL and SKOS vocabularies. [jemsprod-m...epoint.com], [jemsprod-m...epoint.com]
4. Node‑Level Data Retrieval
Modules provide functions to fetch labels, types, triples, restrictions, item definitions, and domain/range metadata for any resource.
 [jemsprod-m...epoint.com], [jemsprod-m...epoint.com]
5. Triple Manipulation API
Insert, update, delete, copy, export, and reconstruct triples (NT/Turtle) across graphs with safe handling of blank nodes and URIs. [jemsprod-m...epoint.com], [jemsprod-m...epoint.com]
6. Proxy‑Based SPARQL Execution Layer
sparql_proxy.js unifies GET/POST execution, authentication, headers, error handling, async querying, and fallback logic across sparql servers. [jemsprod-m...epoint.com]
7. Bulk & Slice Processing
Sparql_generic automatically slices large sets of IDs or labels to avoid endpoint overload and then recombines the results. [jemsprod-m...epoint.com]
8. Multi‑Schema Support (SKOS / OWL / KG)
The utilities adapt queries to different schema types with configurable predicates (prefLabel, broader, subclassOf, type).
 [jemsprod-m...epoint.com], [jemsprod-m...epoint.com]
9. Result Enrichment Helpers
Automatic enrichment of bindings with missing labels, types, sorting, optional properties, and consistent labeling for UI use

## Usage

- retrieves and links concepts, hierarchies, and metadata from OWL and SKOS vocabularies to build a unified knowledge graph
- query the graph through a UI powered by sparql_proxy, which handles secure, optimized requests
- detect missing labels, taxonomy issues, and inconsistent properties across sources
- The result is a consolidated semantic backbone enabling faster decision‑making, asset classification, and cross‑department knowledge reuse.

<!-- AUTO-DESC:END -->


```{toctree}
:maxdepth: 5
:caption: Contents

```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `sparql_common.js`
- `sparql_generic.js`
- `sparql_OWL.js`
- `sparql_proxy.js`
- `sparql_SKOS.js`
- `test_sparql.js`

<!-- AUTO-INLINE-FILES:END -->

