# SousLeSens Vocables - Claude Code Guidelines


## Workspace Trust

Repo + worktrees = trusted local env.

Claude no ask confirmation for:
- Editing files
- Running git commands
- Applying multiple changes
in workspace.


# Claude Permissions

Claude allowed:
- Read, create, update, delete files in repo + worktrees
- Local git: add, commit, branch, diff
- Modify code freely, no per-change confirmation

Claude NOT allowed:
- Push commits to remote
- Create/modify GitHub PRs
- Modify GitHub issues/comments
- Any GitHub write action

Claude MUST:
- Ask explicit permission before GitHub write op
- Ask before push, even if told "finish task"

# Avoid useless comments

Write self‑explanatory code: expressive precise names + clear structure over comments.
Use descriptive identifiers (variables, functions, classes) conveying intent + domain meaning.
Comments only for:

Complex logic not obvious from code,
Business decisions / domain rationale,
Temporary patches/workarounds (include why + removal conditions),
Separating long multi‑step processes (section headers / brief overviews).


No redundant/obvious comments (e.g. "increment i", restating code).
Minimal comments via self‑documenting code: naming, structure, small focused functions

## Overview

Docs to help Claude Code work with SousLeSens Vocables codebase.

## Project Description

**SousLeSens Vocables** = semantic web platform for knowledge graph viz, ontology mgmt, SPARQL query building. Web UI for exploring + manipulating RDF/OWL ontologies in triple stores.

## Quick Reference

### Key Documentation Files

- **[claude.md](./claude.md)** (this file) - Main overview + quick reference

- **[refactoring-guidelines.md](./refactoring-guidelines.md)** - Code style + refactoring rules
- **[architecture.md](./architecture.md)** - System architecture deep dive
- **[module-patterns.md](./module-patterns.md)** - Common module patterns + examples
- **[sparql-guidelines.md](./sparql-guidelines.md)** - SPARQL execution + query building
- **[coding-standards.md](./coding-standards.md)** - Detailed coding standards

### Technology Stack

**Frontend:**
- JavaScript ES6+ module system (`import`/`export`)
- jQuery for DOM + AJAX
- Vis.js for graph viz
- JSTree for hierarchical trees
- Async.js for callback async flow

**Backend:**
- Node.js + Express.js
- SPARQL for semantic queries
- Triple store integration (Virtuoso, GraphDB, etc.)

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
- `window.ModuleName` for inline HTML handlers like `onclick="ModuleName.method()"`

### 2. Async Flow Control with async.js

**Codebase uses async.js (NOT async/await):**

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

**Primary way to execute SPARQL queries:**

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
- **KGquery_graph.js** - Graph viz with Vis.js, cardinality mgmt
- **KGquery_paths.js** - Shortest path between nodes
- **KGquery_filter.js** - Query filtering + optional predicates
- **KGquery_predicates.js** - SPARQL query building
- **KGquery_proxy.js** - API for programmatic access

#### `tools/lineage/` - Ontology Lineage and Visualization
- **lineage_whiteboard.js** - Main viz controller (5000+ lines)
- **lineage_sources.js** - Source mgmt
- **lineage_selection.js** - Node selection
- **lineage_relations.js** - Relationship mgmt
- **lineage_graphTraversal.js** - Graph traversal algos

#### `sparqlProxies/` - SPARQL Execution Layer
- **sparql_proxy.js** - Main proxy for executing SPARQL (**USE THIS**)
- **sparql_common.js** - Common SPARQL utilities
- **sparql_generic.js** - Generic SPARQL ops (CRUD)
- **sparql_OWL.js** - OWL queries
- **sparql_SKOS.js** - SKOS queries

#### `uiWidgets/` - Reusable UI Components
- **JstreeWidget.js** - Hierarchical tree wrapper (jsTree)
- **NodeInfosWidget.js** - Node info display + tabs
- **PopupMenuWidget.js** - Context menus + smart positioning
- **SimpleListSelectorWidget.js** - Basic list selection
- **DateWidget.js** - Date range filtering

#### `shared/` - Shared Utilities
- **common.js** - Common utility functions
- **mainController.js** - App controller
- **ontologyModels.js** - Ontology data mgmt

## Important Data Structures

### Graph Data (visjsData)

**Used throughout for graph viz:**

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
   - Use existing utils from `common.js`, `UI.js`, etc.
   - Use existing SPARQL methods from `sparql_proxy.js`, `sparql_generic.js`
   - Use existing UI widgets from `uiWidgets/`

2. **Only Create New Functions When Necessary**
   - No existing function fits requirement
   - Function reused in multiple places

---

## Reading Guidelines

Read `.claude/` docs (architecture.md, module-patterns.md, refactoring-guidelines.md, etc.) only when task requires. No proactive reads at session start.

## Efficient File Reading

File > 200 lines: Grep first for target line, then Read with `offset` + `limit`. Never Read full large file for "context".

Files already read in session: no re-read unless modified.

## Principles for Working with This Codebase

### Do ✅


- **Reuse existing functions** - DRY rigorously
- **Always read files before modifying** - Get context
- **Preserve backward compatibility** - Many parts depend on existing APIs
- **Follow existing patterns** - No new paradigms
- **Use async.js for async flow** - No Promises / async/await
- **Handle all errors** - Error-first callbacks consistently
- **Test thoroughly** - Cover null/undefined, empty arrays, edge cases
- **Update documentation** - Keep files current on changes
- **Update function-index.md** - When creating new public functions

### Don't ❌

- **Don't duplicate existing functionality** 
- **Don't break existing APIs** - Function signatures = contracts
- **Don't modify global state carelessly** - Use module-level state
- **Don't use modern async/await** - Codebase uses callbacks
- **Don't remove "unused" code** - May be called from HTML/plugins
- **Don't add dependencies lightly** - Keep stack lean
- **Don't mix coding styles** - Follow refactoring-guidelines.md
- **Don't skip the dual export** - Both ES6 + window.X needed

## Debugging Tips

### Check the Browser Console
Errors appear in browser console with stack traces

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

Central concept. **source** = one ontology / KG in triple store.
Defined in `config/sources.json`. Each source has:

- `graphUri` — named graph URI in triple store (e.g. `http://rds.posccaesar.org/ontology/...`)
- `schemaType` — `"OWL"` or `"SKOS"` — determines controller
- `controller` — `"Sparql_OWL"` or `"Sparql_SKOS"` — JS module handling queries
- `sparql_server.url` — SPARQL endpoint (`"_default"` = main Virtuoso instance)
- `predicates` — custom predicates for hierarchy (broaderPredicate, prefLabel, etc.)
- `imports` — list of other source names whose triples also load
- `owner`, `published` — access control

```javascript
Config.sources[sourceName]          // Access source config
Config.sources[sourceName].graphUri // Named graph URI
Lineage_sources.activeSource        // Currently selected source name
```

### OWL vs SKOS

Two distinct data models, different query strategies:

**OWL** (`schemaType: "OWL"`, controller: `Sparql_OWL`)

- Classes (`owl:Class`), properties (`owl:ObjectProperty`, `owl:DatatypeProperty`)
- Hierarchy via `rdfs:subClassOf`
- Instances via `rdf:type`
- For formal ontologies (ISO standards, engineering ontologies)

**SKOS** (`schemaType: "SKOS"`, controller: `Sparql_SKOS`)

- Concepts (`skos:Concept`), concept schemes
- Hierarchy via `skos:broader` / `skos:narrower`
- Labels via `skos:prefLabel`, `skos:altLabel`
- For thesauri, taxonomies, controlled vocabularies (GEMET, etc.)

`schemaType` determines generated SPARQL — never assume OWL structure on SKOS source.

### Profile

Controls user access. Defined in `config/profiles.json`. Each profile has:

- `allowedTools` — visible tools (lineage, KGquery, MappingModeler, etc.)
- `allowedSourceSchemas` — accessible schema types (`OWL`, `SKOS`, `INDIVIDUALS`)
- `sourcesAccessControl` — per-source read/readwrite permissions
- `defaultSourceAccessControl` — fallback permission

```javascript
// Current user profile available via:
Config.userProfile
```

### Tools

- **Lineage** — visualizes ontology/KG as interactive graph on whiteboard. Main tool.
- **KGquery** — builds SPARQL queries visually from graph model, executes, shows results in table/graph
- **MappingModeler** — creates semantic mappings from SQL/CSV data sources to OWL/SKOS models

### graphUri vs source name

- **source name** = human key in `sources.json` (e.g. `"ISO_15926-part-14_PCA"`) — used in JS code
- **graphUri** = actual URI of named graph in Virtuoso — used in SPARQL `FROM` clauses
- `Sparql_common.getFromStr(source)` converts source name → `FROM <graphUri>` clause
