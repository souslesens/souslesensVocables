# SousLeSens Vocables - Claude Code Guidelines


## Workspace Trust

This repository and all its worktrees are trusted local environments.

Claude does not need to ask for confirmation before:
- Editing files
- Running git commands
- Applying multiple changes
within this workspace.


# Claude Permissions

Claude is allowed to:
- Read, create, update, and delete files within this repository and its worktrees
- Execute git commands locally, including add, commit, branch, and diff
- Modify code freely without requesting confirmation for each change

Claude is NOT allowed to:
- Push commits to any remote
- Create or modify GitHub pull requests
- Modify issues or comments on GitHub
- Perform any action on GitHub requiring write permissions

Claude MUST:
- Ask explicit user permission before any GitHub write operation
- Ask before pushing, even if explicitly told to "finish the task"

# Avoid useless comments

Write self‑explanatory code: prefer expressive, precise names and clear structure over comments.
Use descriptive identifiers (variables, functions, classes) that convey intent and domain meaning.
Comments are only allowed for:

Complex logic that isn’t obvious from the code,
Business decisions or domain rationale,
Temporary patches/workarounds (include why and removal conditions),
Separating long multi‑step processes (section headers or brief overviews).


Avoid redundant or obvious comments (e.g., “increment i”, restating what the code plainly does).
Aim for minimal comments by making the code self‑documenting through naming, structure, and small focused functions

## Overview

This directory contains documentation to help Claude Code understand and work effectively with the SousLeSens Vocables codebase.

## Project Description

**SousLeSens Vocables** is a semantic web platform for knowledge graph visualization, ontology management, and SPARQL query building. It provides a rich web-based interface for exploring and manipulating RDF/OWL ontologies stored in triple stores.

## Quick Reference

### Key Documentation Files

- **[claude.md](./claude.md)** (this file) - Main overview and quick reference

- **[refactoring-guidelines.md](./refactoring-guidelines.md)** - Code style and refactoring rules
- **[architecture.md](./architecture.md)** - System architecture deep dive
- **[module-patterns.md](./module-patterns.md)** - Common module patterns with examples
- **[sparql-guidelines.md](./sparql-guidelines.md)** - SPARQL execution and query building
- **[coding-standards.md](./coding-standards.md)** - Detailed coding standards

### Technology Stack

**Frontend:**
- JavaScript ES6+ with module system (`import`/`export`)
- jQuery for DOM manipulation and AJAX
- Vis.js for graph visualization
- JSTree for hierarchical tree displays
- Async.js for callback-based async flow control

**Backend:**
- Node.js with Express.js
- SPARQL for semantic data queries
- Integration with triple stores (Virtuoso, GraphDB, etc.)

**Build Tools:**
- Webpack for bundling
- ESLint for code quality

## Core Architecture Patterns

### 1. IIFE Module Pattern (Universal)

**Every module follows this pattern:**

```javascript
var ModuleName = (function () {
    var self = {};

    // Private variables (closure scope)
    var privateVar = null;

    // Public methods and properties
    self.publicMethod = function() {
        // Implementation
    };

    self.publicProperty = null;

    return self;
})();

// ES6 Module Export
export default ModuleName;

// Global Window Assignment (for backward compatibility with inline HTML)
window.ModuleName = ModuleName;
```

**Why both exports?**
- `export default` for ES6 module imports
- `window.ModuleName` for inline HTML event handlers like `onclick="ModuleName.method()"`

### 2. Async Flow Control with async.js

**The codebase uses async.js (NOT async/await):**

```javascript
// Sequential execution
async.series([
    function(callbackSeries) {
        // Step 1
        callbackSeries(null, result);  // Or callbackSeries(err)
    },
    function(callbackSeries) {
        // Step 2 (waits for step 1)
        callbackSeries();
    }
], function(err, results) {
    if (err) {
        return callback(err);
    }
    // All steps complete
});

// Iterating array sequentially
async.eachSeries(items, function(item, callbackEach) {
    // Process item
    callbackEach();
}, function(err) {
    // All items processed
});

// Looping with condition
async.whilst(
    function() { return condition; },  // Test function
    function(callbackWhilst) {
        // Loop body
        callbackWhilst();
    },
    function(err) {
        // Loop complete
    }
);
```

### 3. Error-First Callbacks

**Node.js convention used throughout:**

```javascript
function doSomething(param, callback) {
    if (error) {
        return callback(err);  // First param is error
    }
    callback(null, result);  // null means no error
}

// Usage:
doSomething(param, function(err, result) {
    if (err) {
        return MainController.errorAlert(err);
    }
    // Use result
});
```

## Critical SPARQL Execution Pattern

### Main Method: Sparql_proxy.querySPARQL_GET_proxy

**This is the primary way to execute SPARQL queries:**

```javascript
var url = Config.sources[source].sparql_server.url + "?format=json&query=";
var query = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
    "SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10";

Sparql_proxy.querySPARQL_GET_proxy(
    url,
    query,
    "",  // queryOptions (URL params)
    { source: source },  // options object
    function(err, result) {
        if (err) {
            return callback(err);
        }
        // result.results.bindings contains the data
        callback(null, result);
    }
);
```

**Result structure:**

```javascript
{
    head: { vars: ["?s", "?p", "?o"] },
    results: {
        bindings: [
            {
                s: { type: "uri", value: "http://example.org/resource" },
                p: { type: "uri", value: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" },
                o: { type: "uri", value: "http://www.w3.org/2002/07/owl#Class" }
            },
            // ... more bindings
        ]
    }
}
```

**Accessing values:**

```javascript
result.results.bindings.forEach(function(binding) {
    var subject = binding.s.value;  // Always access .value property
    var predicate = binding.p.value;
    var object = binding.o.value;
});
```

### Other SPARQL Methods

```javascript

// Delete triples
Sparql_generic.deleteTriples(source, subjectUri, predicateUri, objectUri, callback);

// Insert triples
Sparql_generic.insertTriples(source, triples, options, callback);

// Get node children
Sparql_generic.getNodeChildren(source, nodeId, options, callback);
```

## Key Module Reference

### Core Modules (`public/vocables/modules/`)

#### `tools/KGquery/` - Knowledge Graph Query Builder
- **KGquery.js** - Main orchestrator, query execution
- **KGquery_graph.js** - Graph visualization with Vis.js, cardinality management
- **KGquery_paths.js** - Shortest path finding between nodes
- **KGquery_filter.js** - Query filtering and optional predicates
- **KGquery_predicates.js** - SPARQL query building
- **KGquery_proxy.js** - API for programmatic access

#### `tools/lineage/` - Ontology Lineage and Visualization
- **lineage_whiteboard.js** - Main visualization controller (5000+ lines)
- **lineage_sources.js** - Source management
- **lineage_selection.js** - Node selection handling
- **lineage_relations.js** - Relationship management
- **lineage_graphTraversal.js** - Graph traversal algorithms

#### `sparqlProxies/` - SPARQL Execution Layer
- **sparql_proxy.js** - Main proxy for executing SPARQL (**USE THIS**)
- **sparql_common.js** - Common SPARQL utilities
- **sparql_generic.js** - Generic SPARQL operations (CRUD)
- **sparql_OWL.js** - OWL-specific queries
- **sparql_SKOS.js** - SKOS-specific queries

#### `uiWidgets/` - Reusable UI Components
- **JstreeWidget.js** - Hierarchical tree wrapper (jsTree library)
- **NodeInfosWidget.js** - Node information display with tabs
- **PopupMenuWidget.js** - Context menus with smart positioning
- **SimpleListSelectorWidget.js** - Basic list selection
- **DateWidget.js** - Date range filtering

#### `shared/` - Shared Utilities
- **common.js** - Common utility functions
- **mainController.js** - Application controller
- **ontologyModels.js** - Ontology data management

## Important Data Structures

### Graph Data (visjsData)

**Used throughout for graph visualization:**

```javascript
{
    nodes: [
        {
            id: "http://example.org/Class1",
            label: "Class1",
            shape: "box",  // dot, box, triangle, ellipse, diamond, etc.
            color: "#ddd",
            data: {
                id: "http://example.org/Class1",
                source: "myOntology",
                type: "owl:Class",
                nonObjectProperties: [...]  // Datatype properties
            }
        }
    ],
    edges: [
        {
            id: "edgeId",
            from: "http://example.org/Class1",
            to: "http://example.org/Class2",
            label: "hasRelation (n)",  // With cardinality suffix
            data: {
                propertyId: "http://example.org/hasRelation",
                propertyLabel: "hasRelation",  // Original label
                originalLabel: "hasRelation",  // Preserved original
                maxCardinality: 5,  // Calculated cardinality
                source: "myOntology"
            },
            arrows: { to: { enabled: true, type: "solid" } },
            color: "#aaa"
        }
    ]
}
```

### Configuration Access

**Global Config object:**

```javascript
Config.sources[sourceName].sparql_server.url  // SPARQL endpoint
Config.sources[sourceName].graphUri           // Named graph URI
Config.sources[sourceName].editable           // Write permission
Config.apiUrl                                 // Backend API base URL
Config.defaultGraphTheme                      // UI theme
```

## Common Patterns You'll See

### 1. Loading HTML Templates

```javascript
$("#divId").load("modules/path/to/template.html", function() {
    // Setup after template loads
    UI.openDialog("divId", { title: "Dialog Title" });

    // Bind events
    $("#buttonId").on("click", function() {
        // Handle click
    });
});
```

### 2. JSTree Integration

```javascript
var jstreeData = [
    { id: "node1", text: "Label", parent: "#", data: {...} },
    { id: "node2", text: "Child", parent: "node1", data: {...} }
];

var options = {
    withCheckboxes: true,
    selectTreeNodeFn: function(event, obj) {
        // Handle selection
    },
    validateFn: function(checkedNodes) {
        // Handle validation
    }
};

JstreeWidget.loadJsTree("divId", jstreeData, options, function() {
    // Tree loaded
});
```

### 3. jQuery Patterns

```javascript
// Chaining
$("#elementId").html(html).css("display", "block").trigger("focus");

// Get/set values
var value = $("#selectId").val();
$("#inputId").val(newValue);

// Event binding
$("#buttonId").on("click", handler);
$("#inputId").bind("keydown", null, function() {
    if (event.keyCode == 13) {  // Enter key
        // Handle
    }
});
```

### 4. Error Handling

```javascript
// Standard pattern
Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source}, function(err, result) {
    if (err) {
        // Option 1: Show to user
        return MainController.errorAlert(err);

        // Option 2: Propagate up
        return callback(err);

        // Option 3: Silent message
        return UI.message(err);
    }

    // Process result
    callback(null, result);
});
```

## DRY Principle - MANDATORY

### Before Implementing ANY Feature

**Claude Code MUST follow this workflow:**

1. **Reuse Existing Functions**
   - Use existing utility functions from `common.js`, `UI.js`, etc.
   - Use existing SPARQL methods from `sparql_proxy.js`, `sparql_generic.js`
   - Use existing UI widgets from `uiWidgets/`

2. **Only Create New Functions When Necessary**
   - If no existing function can fulfill the requirement
   - If the function will be reused in multiple places

---

## Reading Guidelines

Only read `.claude/` documentation files (architecture.md, module-patterns.md, refactoring-guidelines.md, etc.) when the task explicitly requires it. Do not read them proactively at session start.

## Efficient File Reading

For any file > 200 lines: always Grep first to find the target line number, then Read with `offset` + `limit`. Never Read a full large file to "understand context".

For files already read in the current session: do not re-read unless the file was modified.

## Principles for Working with This Codebase

### Do ✅


- **Reuse existing functions** - Apply DRY principle rigorously
- **Always read files before modifying** - Understand the context
- **Preserve backward compatibility** - Many parts depend on existing APIs
- **Follow existing patterns** - Don't introduce new paradigms
- **Use async.js for async flow** - Don't introduce Promises or async/await
- **Handle all errors** - Use error-first callbacks consistently
- **Test thoroughly** - Consider null/undefined, empty arrays, edge cases
- **Update documentation** - Keep these files current when making changes
- **Update function-index.md** - When creating new public functions

### Don't ❌

- **Don't duplicate existing functionality** 
- **Don't break existing APIs** - Function signatures are contracts
- **Don't modify global state carelessly** - Use module-level state
- **Don't use modern async/await** - The codebase uses callbacks
- **Don't remove "unused" code** - It may be called from HTML or plugins
- **Don't add dependencies lightly** - Keep the stack lean
- **Don't mix coding styles** - Follow refactoring-guidelines.md
- **Don't skip the dual export** - Both ES6 and window.X are needed

## Debugging Tips

### Check the Browser Console
Most errors appear in browser console with stack traces

### Enable SPARQL Query Logging
```javascript
Sparql_proxy.debugSparql = true;  // Logs all queries
```

### Inspect visjsData
```javascript
console.log(KGquery_graph.visjsData);  // See current graph data
```

### Check Config
```javascript
console.log(Config.sources);  // See available sources
console.log(Config.currentSource);  // Current active source
```

## Domain Concepts (SousLeSens)

### Source

Central concept. A **source** = one ontology or knowledge graph stored in the triple store.
Defined in `config/sources.json`. Each source has:

- `graphUri` — named graph URI in the triple store (e.g. `http://rds.posccaesar.org/ontology/...`)
- `schemaType` — `"OWL"` or `"SKOS"` — determines which controller is used
- `controller` — `"Sparql_OWL"` or `"Sparql_SKOS"` — the JS module handling queries
- `sparql_server.url` — SPARQL endpoint (`"_default"` = main Virtuoso instance)
- `predicates` — custom predicates for hierarchy (broaderPredicate, prefLabel, etc.)
- `imports` — list of other source names whose triples are also loaded
- `owner`, `published` — access control

```javascript
Config.sources[sourceName]          // Access source config
Config.sources[sourceName].graphUri // Named graph URI
Lineage_sources.activeSource        // Currently selected source name
```

### OWL vs SKOS

Two distinct data models with different query strategies:

**OWL** (`schemaType: "OWL"`, controller: `Sparql_OWL`)

- Classes (`owl:Class`), properties (`owl:ObjectProperty`, `owl:DatatypeProperty`)
- Hierarchy via `rdfs:subClassOf`
- Instances via `rdf:type`
- Used for formal ontologies (ISO standards, engineering ontologies)

**SKOS** (`schemaType: "SKOS"`, controller: `Sparql_SKOS`)

- Concepts (`skos:Concept`), concept schemes
- Hierarchy via `skos:broader` / `skos:narrower`
- Labels via `skos:prefLabel`, `skos:altLabel`
- Used for thesauri, taxonomies, controlled vocabularies (GEMET, etc.)

The `schemaType` determines which SPARQL queries are generated — never assume OWL structure on a SKOS source.

### Profile

Controls user access. Defined in `config/profiles.json`. Each profile has:

- `allowedTools` — which tools are visible (lineage, KGquery, MappingModeler, etc.)
- `allowedSourceSchemas` — which schema types the user can access (`OWL`, `SKOS`, `INDIVIDUALS`)
- `sourcesAccessControl` — per-source read/readwrite permissions
- `defaultSourceAccessControl` — fallback permission

```javascript
// Current user profile available via:
Config.userProfile
```

### Tools

- **Lineage** — visualizes ontology/KG as interactive graph on a whiteboard. Main tool.
- **KGquery** — builds SPARQL queries visually from a graph model, executes them, shows results in table/graph
- **MappingModeler** — creates semantic mappings from SQL/CSV data sources to OWL/SKOS models

### graphUri vs source name

- **source name** = human key in `sources.json` (e.g. `"ISO_15926-part-14_PCA"`) — used in JS code
- **graphUri** = actual URI of the named graph in Virtuoso — used in SPARQL `FROM` clauses
- `Sparql_common.getFromStr(source)` converts source name → `FROM <graphUri>` clause
