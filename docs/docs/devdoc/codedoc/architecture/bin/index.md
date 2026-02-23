<!-- AUTO-GENERATED: do not edit by hand -->
# Bin

<!-- AUTO-DESC:START -->

This page summarizes the code structure for this directory and its immediate subdirectories. It focuses on the `bin` area of the codebase. Use the table of contents below to navigate deeper.

<!-- AUTO-DESC:END -->

## Overview

The **bin** directory contains the **Node.js backend modules** of SousLeSensVocables. It provides all server-side functionality including:

- HTTP/WebSocket server entry point and routing
- SPARQL query execution and graph store management
- Knowledge graph construction from tabular data (CSV, databases)
- Ontology model extraction from RDF/OWL graphs
- User authentication (local, Auth0, Keycloak)
- Data format conversion (CSV, RDF, SKOS, XSD, SQL)
- Elasticsearch indexing and proxying
- File-based configuration and JSON storage
- Logging, security filtering, and general utilities

Backend modules are organized as Express.js route handlers and standalone utility modules. Most modules export their functions via `module.exports` and follow the Node.js error-first callback pattern. Some modules are standalone scripts (e.g., `usersGenerator..js`) meant to be run directly.

---

## Modules

### Server entry point

1. **www** — Express.js HTTP/WebSocket server entry point that creates and configures the server, handles socket connections via Socket.io, and initializes SocketManager.

### Authentication & user management

2. **authentication..js** — Handles user authentication via multiple strategies (local, Auth0, Keycloak) and manages user account creation/updates against the user model database.
3. **user..js** — User account handler providing async functions to fetch user details and profiles from the user model, supporting disabled/Keycloak authentication modes.
4. **userRequestFiltering..js** — SPARQL query security validator that filters user requests against allowed sources and graph URIs with read/write access control lists using SPARQL parser.
5. **usersGenerator..js** — Standalone script that parses CSV user data and generates user account objects with login/password/groups from first name/last name/group columns for batch import.

### Configuration & storage

6. **configManager..js** — Loads and manages application configuration (general config, profiles, sources, blender sources) from JSON files and provides access through callback interfaces.
7. **jsonFileStorage.js** — Simple file-based JSON storage utility providing synchronous store/retrieve/delete operations for reading and writing JSON configuration files.
8. **globalParams..js** — Simple configuration constants module storing MySQL connection parameters (host, user, password, database).

### SPARQL & graph operations

9. **SPARQLutil..js** — SPARQL utility for generating and executing INSERT DATA statements against graphs with deduplication and pagination for large triple sets.
10. **graphStore..js** — Manages graph import/export via curl commands against SPARQL graph CRUD endpoints, supporting authentication and large buffer sizes for file operations.
11. **graphTraversal..js** — Implements graph traversal algorithms (BFS) and SPARQL queries to build graph vicinity arrays for ontology exploration and relationship discovery.
12. **OntologyModel..js** — Ontology model builder that executes SPARQL queries to extract classes, properties, restrictions, and constraints from RDF/OWL graphs.
13. **parliamentProxy.js** — HTTP proxy client for Parliament SPARQL engine supporting query execution and FROM clause transformation for graph specification.

### RDF & data export

14. **exportGraph..js** — Exports RDF triples from a SPARQL graph URI to N-Triples format by paginating through SPARQL SELECT results and writing triples to file.
15. **exportRDF..js** — Exports RDF data from SPARQL endpoints by executing paginated SPARQL queries and writing results in N-Triples format with proper escaping of literals and URIs.
16. **RDF_IO..js** — RDF serialization utility converting triples to Turtle format using N3 library with automatic namespace prefix generation and RDF element type conversion.

### Knowledge graph construction

17. **KGtripleBuilder..js** — Knowledge Graph triple builder providing SPARQL prefix management, predefined Part-14 relations mapping, and URI validation for ontology construction.
18. **sourceIntegrator..js** — Integrates external ontologies by parsing RDF via Jena, converting triples to SPARQL INSERT statements, and managing URI mapping.
19. **sourceManager..js** — Creates and manages semantic sources (SKOS vocabularies) by querying reference sources, transforming data, and building triple sets for target SPARQL endpoints.

### Data & file management

20. **dataController..js** — Manages file I/O operations in the `/data` subdirectory, supporting file listing, saving, reading, and directory creation with support for PNG base64 data.
21. **_csvCrawler..js** — Reads CSV files from disk and bulk indexes them into Elasticsearch, transforming CSV rows into indexed documents with configurable field mapping and de-duplication.
22. **csv2sql..js** — Converts CSV files to SQL by analyzing column types, generating CREATE TABLE and INSERT statements, and determining field metadata for database table creation.
23. **xlsx2json..js** — Converts Excel spreadsheet files to JSON format for data import pipelines.

### Database proxies

24. **mySQLproxy..js** — MySQL connection pool manager with query execution, data model introspection, and field type detection for relational database operations.
25. **SQLutil..js** — SQL utility for converting CSV files to JSON with CSV separator detection, type inference, and table creation support with configurable row slicing.

### Elasticsearch & search

26. **elasticRestProxy..js** — Proxies HTTP requests to Elasticsearch with authentication handling and configurable URL routing for indexing, searching, and bulk operations.

### HTTP & networking

27. **httpProxy..js** — HTTP client proxy wrapper using superagent library for GET/POST requests with header management, proxy support, and response handling.
28. **socketManager..js** — WebSocket connection manager tracking client sockets and providing message broadcasting to specific connected clients by socket ID.
29. **remoteCodeRunner.js** — Remote code execution module that dynamically imports and executes user-defined functions from external JavaScript modules via ES6 import.

### Annotation & NLP

30. **annotatorLive..js** — Extracts nouns from text using Spacy NLP server and matches them against concepts across multiple SPARQL sources to annotate text with semantic entities.

### Logging & utilities

31. **logger..js** — Winston-based logging system with daily rotating file support, configurable log levels, and symlink management for structured application logging.
32. **util..js** — General utility functions including array slicing, SQL parsing, random ID/hash generation, string utilities, date formatting, and CSV operations.
33. **htmlToPDF.js** — Converts HTML content to PDF files using wkhtmltopdf library with configurable encoding and link settings.

---

## Features

- **Multi-strategy authentication** supporting local accounts, Auth0, and Keycloak with role/profile-based access control.
- **SPARQL security filtering** that validates user queries against read/write ACLs on graph URIs.
- **Knowledge graph construction pipeline** from CSV/database sources through mapping definitions to RDF triple insertion.
- **Ontology model extraction** via SPARQL queries to build in-memory models of classes, properties, restrictions, and constraints.
- **Graph import/export** in multiple formats (N-Triples, Turtle) with pagination for large datasets.
- **Elasticsearch integration** for full-text search, fuzzy matching, and concept indexing.
- **Database connectivity** across MySQL, PostgreSQL, and SQL Server with query execution and schema introspection.
- **WebSocket-based progress communication** for long-running operations (KG building, annotation).
- **File-based JSON configuration** management for sources, profiles, and application settings.

---

## Usage

- The server is started via `www`, which initializes Express.js routes and Socket.io connections.
- Backend modules are imported by Express route handlers in `routes/` or called directly by other `bin/` modules.
- Configuration is loaded at startup by `configManager..js` and made available globally via `Config`.
- SPARQL operations go through `SPARQLutil..js`, `graphStore..js`, or `OntologyModel..js` depending on the use case.
- KG construction is orchestrated by the `KGbuilder/` subdirectory modules, which read mapping definitions and generate triples from tabular data.


```{toctree}
:maxdepth: 5
:caption: Contents

annotator/index
axioms/index
KG/index
KGbuilder/index
mediawiki/index
other/index
shacl/index
skosConverters/index
```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `_csvCrawler..js`
- `annotatorLive..js`
- `authentication..js`
- `configManager..js`
- `csv2sql..js`
- `dataController..js`
- `dockerProtege`
- `elasticRestProxy..js`
- `exportGraph..js`
- `exportRDF..js`
- `globalParams..js`
- `graphStore..js`
- `graphTraversal..js`
- `htmlToPDF.js`
- `httpProxy..js`
- `jsonFileStorage.js`
- `KGtripleBuilder..js`
- `logger..js`
- `mySQLproxy..js`
- `nginxConfig.txt`
- `OntologyModel..js`
- `parliamentProxy.js`
- `RDF_IO..js`
- `remoteCodeRunner.js`
- `socketManager..js`
- `sourceIntegrator..js`
- `sourceManager..js`
- `SPARQLutil..js`
- `SQLutil..js`
- `test.js`
- `user..js`
- `userRequestFiltering..js`
- `usersGenerator..js`
- `util..js`
- `www`
- `xlsx2json..js`

<!-- AUTO-INLINE-FILES:END -->
