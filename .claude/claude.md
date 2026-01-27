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
- **[function-index.md](./function-index.md)** - **CRITICAL: Function index for DRY compliance**
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

## Recent Important Changes (2024-12-29)

### Cardinality Integration in KGquery_graph

**What changed:**
- Edges now automatically calculate cardinality from instance data
- Edge labels enriched with cardinality: `"propertyName (1)"` or `"propertyName (n)"`
- Original labels preserved in `edge.data.originalLabel` and `edge.data.propertyLabel`

**New helper function:**
```javascript
var originalLabel = KGquery_graph.getEdgeOriginalLabel(edge);
```

**Impact:**
- `edge.label` contains enriched label with cardinality
- `edge.data.maxCardinality` contains calculated value
- Use `getEdgeOriginalLabel()` if you need label without cardinality suffix

## Common Tasks & How To Do Them

### Execute a SPARQL Query

```javascript
var url = Config.sources[source].sparql_server.url + "?format=json&query=";
var query = "SELECT ?s WHERE { ?s ?p ?o } LIMIT 10";

Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: source}, function(err, result) {
    if (err) return callback(err);

    result.results.bindings.forEach(function(item) {
        console.log(item.s.value);
    });

    callback(null, result);
});
```

### Add Nodes to Graph

```javascript
var newNode = {
    id: nodeUri,
    label: "Node Label",
    shape: "box",
    color: "#ddd",
    data: { id: nodeUri, source: source }
};

KGquery_graph.visjsData.nodes.push(newNode);
KGquery_graph.KGqueryGraph.data.nodes.update([newNode]);  // Update Vis.js
```

### Show a Dialog

```javascript
$("#mainDialogDiv").load("modules/path/to/template.html", function() {
    UI.openDialog("mainDialogDiv", { title: "My Dialog" });
    // Initialize content
});
```

### Fill a Select Element

```javascript
var options = [
    { id: "1", label: "Option 1" },
    { id: "2", label: "Option 2" }
];

common.fillSelectOptions("selectId", options, false, "label", "id");
```

## DRY Principle - MANDATORY

### Before Implementing ANY Feature

**Claude Code MUST follow this workflow:**

1. **Consult the Function Index FIRST**
   - Read [function-index.md](./function-index.md) before writing any new code
   - Search for existing functions that might fulfill your needs
   - Check if similar functionality already exists

2. **Reuse Existing Functions**
   - Use existing utility functions from `common.js`, `UI.js`, etc.
   - Use existing SPARQL methods from `sparql_proxy.js`, `sparql_generic.js`
   - Use existing UI widgets from `uiWidgets/`

3. **Only Create New Functions When Necessary**
   - If no existing function can fulfill the requirement
   - If the function will be reused in multiple places
   - Document the new function with JSDoc

4. **Update the Index**
   - When creating a new public function, add it to [function-index.md](./function-index.md)
   - Include full JSDoc signature and example usage

### DRY Compliance Checklist

Before writing a new function, verify:
- [ ] Searched function-index.md for existing solutions
- [ ] Checked common.js for utility functions
- [ ] Checked UI.js for UI helpers
- [ ] Checked sparql_*.js for SPARQL operations
- [ ] No similar function exists in the target module

---

## Principles for Working with This Codebase

### Do ✅

- **CONSULT function-index.md FIRST** - Before implementing any feature
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

- **Don't duplicate existing functionality** - Check the index first!
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

## File Organization

```
.claude/
├── claude.md (this file)           # Main overview and quick reference
├── function-index.md               # Function index for DRY (CONSULT FIRST!)
├── refactoring-guidelines.md       # Code style rules (MUST READ)
├── architecture.md                 # System architecture deep dive
├── module-patterns.md              # Module patterns with examples
├── sparql-guidelines.md            # SPARQL query guidelines
├── coding-standards.md             # Detailed coding standards
└── commands/                       # Custom Claude commands
```

## How to Update This Documentation

When making significant changes:
1. Update the relevant `.md` file in `.claude/`
2. Add entry to "Recent Important Changes" section (this file)
3. Update code examples if APIs changed
4. Document any breaking changes prominently

## Getting Started Checklist

When Claude needs to work on this codebase:

- [ ] **FIRST: Consult [function-index.md](./function-index.md)** for existing functions (DRY!)
- [ ] Read [refactoring-guidelines.md](./refactoring-guidelines.md) for code style
- [ ] Understand the IIFE module pattern (this file)
- [ ] Know how to execute SPARQL queries (this file)
- [ ] Understand async.js usage (this file)
- [ ] Know the visjsData structure (this file)
- [ ] Review recent changes section (this file)

## Recent Important Changes (2025-01-12)

### DRY Principle Implementation

**What changed:**
- Added [function-index.md](./function-index.md) - Comprehensive function index with JSDoc
- Claude Code must consult this index BEFORE implementing any feature
- New public functions must be added to the index with full documentation

**Workflow:**
1. Read function-index.md before writing new code
2. Search for existing functions that fulfill requirements
3. Reuse existing functions when possible
4. Only create new functions when necessary
5. Update function-index.md when creating new public functions

---

*Last Updated: 2025-01-12*
*Maintained by: Project Contributors*
