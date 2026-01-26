<!-- AUTO-GENERATED: do not edit by hand -->
# Bot documentation


# Bots

## Overview

The **Bots** directory contains a set of **interactive, step-by-step assistants** used across SousLeSensVocables tools to guide users through multi-step operations such as:

- Creating ontology resources
- Building OWL restrictions
- Creating mappings
- Exploring and composing graphs
- Configuring user-oriented actions (e.g., sharing user data, finding similar nodes)

Bots are typically implemented as **declarative workflows** executed by a shared UI engine. A bot usually defines:

- A `workflow` object (with branching via `_OR` / `_DEFAULT`)
- A `functions` map keyed by workflow step names
- Optional `functionTitles` for user-facing prompts
- A `start(...)` entry point that initializes the engine and begins the workflow

Most bots instantiate `BotEngineClass`, but some legacy bots rely on a shared global `_botEngine` and/or reuse function sets from other bots (for example `SparqlQuery_bot.functions`).

The underlying engine provides reusable UI primitives (list selection, value prompting, history navigation), allowing bots to focus on domain logic such as:

- SPARQL operations
- Lineage graph actions
- Ontology model access
- Mapping configuration persistence
- User data sharing flows
- Interactive SPARQL querying with multiple output modes (graph/table/CSV)

---

## Modules

### Engine (core workflow runner)

1. **BotEngineClass** (`_botEngineClass.js`) — Core UI workflow runner: loads the bot UI template, executes workflow steps, supports branching (`_OR`), and maintains navigation history (previous/reset).

### Shared utilities & workflow helpers

2. **CommonBotFunctions** (`_commonBotFunctions.js`) — Shared helpers: load ontology models for a source and its imports, and produce sorted lists of vocabularies, classes, properties, and non-object properties for bot UI selection.
3. **NonObjectPropertyFilterWorklow** (`_nonObjectPropertyFilterWorklow.js`) — Helper workflow to build datatype/non-object property SPARQL filter fragments by selecting property/operator/value and chaining conditions with AND/OR/end.

### Resource creation & OWL modeling

4. **CreateResource_bot** (`createResource_bot.js`) — Generic resource creation (Class, Individual, DatatypeProperty) with optional post-actions (edit or draw in lineage whiteboard).
5. **CreateAxiomResource_bot** (`createAxiomResource_bot.js`) — Focused creation for axiom resources: creates `owl:Class` (optional `subClassOf`) and sub-properties, returning a normalized `params.newObject`.
6. **CreateRestriction_bot** (`createRestriction_bot.js`) — Creates OWL restrictions: writes cardinality restrictions as blank nodes and delegates value restriction creation to a lineage edge dialog.

### Source onboarding

7. **CreateSLSVsource_bot** (`createSLSVsource_bot.js`) — “OntoCreator” bot to create a new source, optionally upload a graph (file/URL), add ontology metadata (creator/description), and redirect to tools (Lineage/MappingModeler).

### Graph exploration & navigation (Lineage / Whiteboard)

8. **GraphPaths_bot** (`graphPaths_bot.js`) — Graph exploration: computes and draws paths from/to/between nodes with output as text/CSV or graph highlighting.
9. **NodeRelations_bot** (`nodeRelations_bot.js`) — Interactive “query graph” assistant from the lineage whiteboard current node: explores object properties, annotation/datatype properties (including value filtering), restrictions (including inverse restrictions), container membership, and additional lineage utilities (e.g., similars dialog, traversal visualizations).
10. **Similars_bot** (`similars_bot.js`) — Interactive assistant to search “similar” nodes either in the whiteboard selection or in a source, with exact/fuzzy matching, optional result filtering (by parent), and multiple output options (graph/table/save).

### KGcreator mapping assistance

11. **KGcreator_bot** (`KGcreator_bot.js`) — Mapping assistant in KGcreator context: helps define mapping triple models (URI typing, `rdf:type`, predicates, non-object properties, joins) and persists mapping config.

### KGQuery assistants

12. **KGquery_annotations_bot** (`KGquery_annotations_bot.js`) — Assistant to configure SPARQL query selection (select variables) and filters by reusing `SparqlQuery_bot.functions`, then returns `filter` and `filterLabel` via the validator callback.
13. **KGquery_filter_bot** (`KGquery_filter_bot.js`) — Interactive filter builder: selects a (non-object) property, operator, and value (including date range), then builds a SPARQL `FILTER(...)` clause with optional logical chaining.
14. **KGquery_composite_graph_bot** (`KGquery_composite_graph_bot.js`) — “HyperGraphMaker” bot: imports KGquery graphs from a source and its imports, downloads/regenerates graphs, colors imported graphs, merges them, and optionally joins graphs by selecting a common class.
15. **SparqlQuery_bot** (`sparqlQuery_bot.js`) — Interactive SPARQL query assistant for querying graphs and displaying results as a new graph, adding to the current graph, exporting as table/CSV, or editing/executing raw SPARQL (including saved queries and “last query” recall).

### MappingModeler helpers (technical mappings / lookups / extra predicates)

16. **MappingModeler_bot** (`mappingModeler_bot.js`) — Mapping Modeler assistant to apply technical mapping actions such as adding predicates (including non-object properties), adding `rdf:type`, adding `rdfs:subClassOf`, adding transformations, and creating datatype properties via `CreateResource_bot`.
17. **Lookups_bot** (`mappingModeler_lookups_bot.js`) — Wizard to create and save “lookup” configurations: selects datasource/table/columns/target mapping, writes lookup into config, then saves the visjs mapping graph.

### User data & sharing

18. **ShareUserData_bot** (`shareUserData_bot.js`) — Assistant to share a UserData item with profiles and/or users, list current sharing, and remove shared profiles/users; persists updates by patching and saving UserData metadata.

### UI widgets used by bots

19. **ManchesterSyntaxWidget** (`manchesterSyntaxWidget.js`) — Token-based input widget that suggests ontology classes/properties (from source + imports + basic vocabularies) and builds a Manchester-like expression from validated tokens.

---

## Features

- **Reusable workflow engine** with consistent UI primitives (list selection, prompts, previous/reset navigation, branching via `_OR`).
- **Ontology-aware selection helpers** across a source and its imports (vocabularies/classes/properties/non-object properties).
- **SPARQL-backed persistence** and model manipulation via SPARQL proxies and lineage services (creating resources, restrictions, metadata, predicate graphs).
- **Graph/Lineage integration**: draw created resources, compute and highlight paths, explore node relations/restrictions, and visualize traversals.
- **Similarity search workflows**: exact/fuzzy matching on nodes, optional filtering of results, and multiple display/export options.
- **Sharing workflows** for user data: share with profiles/users, list and revoke sharing, and persist metadata updates.
- **KGQuery support**: interactive filter construction, “hypergraph” composition, and a general-purpose SPARQL query bot with multiple output modes (graph/table/CSV) including query editing and saved query reuse.
- **MappingModeler support**: guided technical mapping operations (predicates, `rdf:type`, subclass, transforms, lookups) and datatype property creation via shared CreateResource bot.

---

## Usage

- Choose the appropriate bot module and call its `start(...)` entry point (signatures vary: some bots instantiate `BotEngineClass` locally, some reuse a shared/global engine).
- Define or reuse a workflow object to represent the step chain and branching logic (`_OR`, `_DEFAULT`).
- Implement workflow steps inside the bot’s `functions` map and provide user-facing titles via `functionTitles` for consistent prompts.
- Use shared utilities (`CommonBotFunctions`) to load ontology models and list selectable items consistently; use specialized workflow helpers (e.g., `NonObjectPropertyFilterWorklow`) to generate consistent filter fragments.
- Persist results via SPARQL/Lineage/MappingModeler/UserData services (triples insertion, metadata updates, mapping graph saving), and depending on the bot, outputs are returned via a validator/callback, stored in `params` (e.g., `params.newObject`), and/or produced as UI side-effects (dialogs, graph rendering, or saved configurations).



## List

- `_botEngineClass.js`
- `_commonBotFunctions.js`
- `_nonObjectPropertyFilterWorklow.js`
- `createAxiomResource_bot.js`
- `createResource_bot.js`
- `createRestriction_bot.js`
- `createSLSVsource_bot.js`
- `graphPaths_bot.js`
- `KGcreator_bot.js`
- `KGquery_annotations_bot.js`
- `KGquery_composite_graph_bot.js`
- `KGquery_filter_bot.js`
- `manchesterSyntaxWidget.js`
- `mappingModeler_bot.js`
- `mappingModeler_lookups_bot.js`
- `nodeRelations_bot.js`
- `shareUserData_bot.js`
- `similars_bot.js`
- `sparqlQuery_bot.js`
