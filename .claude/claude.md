# SousLeSens Vocables - Claude Code Guidelines


## Workspace Trust

Repo + worktrees = trusted local env. No confirmation for editing files or applying multiple changes in workspace.

Git: see `# Claude Permissions`, local ops only.


# Claude Permissions

Allowed:
- Read, create, update, delete files in repo + worktrees
- Local git: add, commit, branch, diff
- Modify code freely, no per-change confirmation

NOT allowed:
- Push commits to remote
- Create/modify GitHub PRs
- Modify GitHub issues/comments
- Any GitHub write action

MUST ask explicit permission before any GitHub write op, and before push even if told "finish task".

# Avoid useless comments

Self-explanatory code: precise names + clear structure over comments. Identifiers convey intent + domain meaning.

Comment only for: complex logic not obvious from code, business/domain rationale, temporary patches (why + removal conditions), section headers in long multi-step processes.

No redundant comments (e.g. "increment i", restating code). A useful comment is a few words on one line, not a sentence: `// stop on a loop`, `// climb single parents, stop chain at the first anomaly`. Write one whenever it earns its place, never to pad.

Create a function only for a clear, precise, independent need, never to split code for its own sake. See `### Keep the number of new functions low`.

## Project Description

**SousLeSens Vocables** = semantic web platform for knowledge graph viz, ontology mgmt, SPARQL query building. Web UI for exploring + manipulating RDF/OWL ontologies in triple stores.

## Quick Reference

### Key Documentation Files

- **[claude.md](./claude.md)** (this file) - Main overview + quick reference
- **[refactoring-guidelines.md](./refactoring-guidelines.md)** - Code style + refactoring rules
- **[module-patterns.md](./module-patterns.md)** - Common module patterns + examples
- **[sparql-guidelines.md](./sparql-guidelines.md)** - SPARQL execution + query building
- **[coding-standards.md](./coding-standards.md)** - Detailed coding standards

### Technology Stack

Authoritative: `package.json`. The constraints it does not show are in `### Do ✅` / `### Don't ❌`: async.js and not async/await, dual export on every client module.

## Core Architecture Patterns

### 1. IIFE Module Pattern (Universal)

**Every module follows this pattern:**

```javascript
var ModuleName = (function () {
    var self = {};

    // module state and constants live on self, never floating in the closure
    self.currentSource = null;
    self.blankNodeColumnTypes = ["RowIndex", "VirtualColumn"];

    self.publicMethod = function (source) {
        // a variable whose scope is this function body stays a local var
        var matchingNodes = [];
        return matchingNodes;
    };

    return self;
})();

// ES6 Module Export
export default ModuleName;

// Global Window Assignment (for backward compatibility with inline HTML)
window.ModuleName = ModuleName;
```

Both exports needed: `export default` for ES6 imports, `window.ModuleName` for inline HTML handlers like `onclick="ModuleName.method()"`.

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

Authoritative: `sparqlProxies/sparql_generic.js` (CRUD), `sparql_OWL.js`, `sparql_SKOS.js`. Grep the method name, signatures drift.

## Key Module Reference

Layout under `public/vocables/modules/`: one directory per tool in `tools/`, SPARQL layer in `sparqlProxies/`, reusable UI in `uiWidgets/`, cross-tool utils in `shared/`. `ls` for the rest.

The only non-obvious entry point: `sparqlProxies/sparql_proxy.js` executes SPARQL, **USE THIS**, not a hand-rolled fetch.

## Important Data Structures

### Graph Data (visjsData)

Vis.js `{ nodes, edges }` with a `data` object carrying the SousLeSens payload on both. Authoritative: `KGquery_graph.js` and `lineage_whiteboard.js`. Inspect a live one with `KGquery_graph.visjsData` rather than trusting a copy here.

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

Template loading, jsTree wiring, jQuery idioms: authoritative in `module-patterns.md` and in the modules themselves. Copy the neighbouring module, not a snippet from here.

Error handling has three outlets, pick one per call site: `MainController.errorAlert(err)` to show it, `return callback(err)` to propagate, `UI.message(err)` for a silent notice. Shape in `### 3. Error-First Callbacks`.

## DRY Principle - MANDATORY

Reuse before creating: utils in `common.js` and `UI.js`, SPARQL in `sparql_proxy.js` and `sparql_generic.js`, widgets in `uiWidgets/`. Create a function only when nothing fits or it is reused in several places. See `### Keep the number of new functions low`.

---

## Reading Guidelines

Read `.claude/` docs (module-patterns.md, refactoring-guidelines.md, etc.) only when the task requires. No proactive reads at session start.

## Efficient File Reading

Gather the context the change needs before touching anything: what already exists so DRY is not broken, and what the change impacts. Stop there. Reading whole directories blind is noise, not context.

File > 200 lines: Grep first for the target line, then Read with `offset` + `limit`.

Files already read in session: no re-read unless modified.

## Principles for Working with This Codebase

### Do ✅

- **Reuse existing functions** - DRY rigorously
- **Read what the change needs before modifying** - see `## Efficient File Reading`
- **Preserve backward compatibility** - Many parts depend on existing APIs
- **Follow existing patterns** - No new paradigms
- **Use async.js for async flow** - No Promises / async/await
- **Handle all errors** - Error-first callbacks consistently
- **Test thoroughly** - Cover null/undefined, empty arrays, edge cases
- **Update documentation** - Keep files current on changes

### Don't ❌

- **Don't duplicate existing functionality**
- **Don't break existing APIs** - Function signatures = contracts
- **Don't modify global state carelessly** - Use module-level state
- **Don't use modern async/await** - Codebase uses callbacks
- **Don't remove "unused" code** - May be called from HTML/plugins
- **Don't add dependencies lightly** - Keep stack lean
- **Don't mix coding styles** - Follow refactoring-guidelines.md
- **Don't skip the dual export** - Both ES6 + window.X needed

## Code Readability Rules (MANDATORY)

### Client code: everything lives on the IIFE `self` (MANDATORY)

In `public/vocables/**` a module is an IIFE returning `self`. Nothing floats in the closure next to `self`: no free `var`, no free `function`. Every constant, state flag and function is a member of `self`, so the whole module surface is inspectable from the console and callable from HTML handlers.

```javascript
// WRONG: free constants and free function in the closure
var BLANK_NODE_COLUMN_TYPES = ["RowIndex", "VirtualColumn"];
var isSynchronizing = false;
function isBlankNodeColumn(columnNodeData) { ... }

// RIGHT
self.blankNodeColumnTypes = ["RowIndex", "VirtualColumn"];
self.isSynchronizingBlankNodeGroup = false;
self.isBlankNodeColumn = function (columnNodeData) { ... };
```

Variables local to a function body stay local, this rule is not about them.

### No UPPER_CASE identifiers (MANDATORY)

No screaming constants. Constants use camelCase whatever their scope, regex constants and lookup tables included. Overrides the generic "extract magic values to UPPER_CASE constants" convention.

```javascript
// WRONG
var BLANK_NODE_URI_TYPES = ["blankNode", "randomIdentifier"];
const PARAM_TAG_REGEX = /^@param/;

// RIGHT
self.blankNodeUriTypes = ["blankNode", "randomIdentifier"];
var paramTagRegex = /^@param/;
```

### Keep the number of new functions low

Before adding a function, check it is not a two-line wrapper over one you just wrote, and that no existing module already does it. Merge helpers always called together. Prefer a loop inside the caller over a private helper used once.

### No chained array/string methods

Never chain `.split()`, `.map()`, `.filter()`, `.find()`, `.reduce()`. Each step gets its own named variable so the intermediate state is readable.

```javascript
// WRONG
const lines = rawJsDoc.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

// RIGHT
const rawLines = rawJsDoc.split("\n");
const trimmedLines = rawLines.map((line) => line.trim());
const nonEmptyLines = trimmedLines.filter((line) => line.length > 0);
```

`.join()` after a single `.map()` is acceptable only when the result is extracted to a named variable first.

### Extract regex into named constants

Never put a regex literal inside `.match()`, `.replace()`, `.test()` or `.split()`. Declare it as a named `const` above the usage, camelCase with a `Regex` suffix. Never UPPER_CASE.

```javascript
// WRONG: inline regex
const match = line.match(/^@param\s+\{([^}]+)\}\s+(\[?[\w.]+\]?)/);
const cleaned = name.replace(/^\[|\]$/g, "");

// WRONG: UPPER_CASE not allowed for regex
const PARAM_TAG_RE = /^@param\s+\{([^}]+)\}\s+(\[?[\w.]+\]?)/;

// RIGHT
const paramTagRegex = /^@param\s+\{([^}]+)\}\s+(\[?[\w.]+\]?)/;
const optionalBracketsRegex = /^\[|\]$/g;
const match = line.match(paramTagRegex);
const cleaned = name.replace(optionalBracketsRegex, "");
```

### No abbreviated names in callbacks

Never single-letter or cryptic names in `.map()`, `.filter()`, `.find()`, `.forEach()` callbacks. Use the full semantic name of what the element represents.

```javascript
// WRONG
registry.find((e) => e.name === name)
entry.params.filter((p) => p.required)
missingParams.map((p) => p.name)

// RIGHT
registry.find((registryEntry) => registryEntry.name === name)
entry.params.filter((param) => param.required)
missingParams.map((param) => param.name)
```

Destructured match groups: rename abbreviated captures immediately.

```javascript
// WRONG
const [, type, rawName, desc] = paramMatch;

// RIGHT
const [, type, rawName, description] = paramMatch;
```

### Never throw in a data or query flow (MANDATORY)

Errors travel through the error-first callback, as a plain string message. Nothing catches a `throw`
in these flows, so it kills the async chain it sits in and reaches no user.

```javascript
// WRONG
throw new Error("onlyClasses cannot be combined with classFilter");

// RIGHT
return callback("onlyClasses cannot be combined with classFilter");
```

Validation therefore belongs in the nearest function that has a callback, not in the helper that
built the value. A synchronous helper returns its result and nothing else.

Callers surface it with `MainController.errorAlert(err)`, `UI.message(err)`, or by propagating with
`return callback(err)`. See `### 4. Error Handling`.

The `throw` calls already in `public/vocables/**` are React mount guards at bootstrap and vendored
files. Neither is a precedent for new code.

### A loop must be readable without simulating it (MANDATORY)

If understanding a block requires tracing an example through it, rewrite it before showing it. Three checks:

Name identifiers after the domain thing they hold, never after their mechanical role.

```javascript
// WRONG
var currentId = key;
var parentId = singleParents[currentId];

// RIGHT
var currentClass = key;
var parentClass = singleParents[currentClass];
```

Drop bookkeeping state when the data already being built answers the same question.

```javascript
// WRONG
var walkedParents = {};
walkedParents[key] = 1;
if (walkedParents[parentClass]) { break; }

// RIGHT
if (parentClass === key || ancestorChain.indexOf(parentClass) > -1) { break; }
```

No state seeded before a loop just to make the first iteration behave.

### Data transformation pipelines (MANDATORY)

Any multi-step transformation over a map or list: index building, taxonomy computation, graph flattening, aggregation.

**One block, one job.** A loop does one thing. Write as few blocks as possible: merge loops walking the same collection for related purposes, split a loop doing two unrelated jobs. At most one short comment per block, saying why, never what.

**Never read and write the same field in one pass.** When a decision depends on other entries, compute every decision first, apply after. Two loops, first read-only, second write-only. A single loop makes the result depend on iteration order, silently.

**One field, one meaning.** A field must not hold an unordered set at one step and an ordered chain at the next. Use two fields, or drop the intermediate one.

**Separate an in-progress marker from a memo.** In-progress = "on the current call stack", cleared on the way back up. Memo = "computed, reuse it", lives for the whole pass. Delete temporary fields in a loop of their own, after the build, never inside it.

**Filter invalid input before a selection, not after.** A selection is exclusive, it discards the alternatives. Neutralizing a bad winner afterwards cannot recover them.

**Surface an anomaly instead of arbitrating it.** When the data is ambiguous, route the entry to an explicit marker so it shows up in the output. Never pick a winner on a heuristic the data does not support.

**No tie-break on upstream order.** Equal candidates are separated on a stable value. Relying on the row order a SPARQL endpoint or API returned makes the output change between two runs over unchanged data.

**Initialize accumulators explicitly.** `var accumulator;` in a loop body does not reset between iterations: the declaration is hoisted and the assignment never happens. Write `var accumulator = null;`.

**Do not add reporting the output already carries.** If the written data records the anomaly, a parallel array plus a log line is duplication.

## Debugging Tips

Errors land in the browser console with stack traces. `Sparql_proxy.debugSparql = true` logs every query. `KGquery_graph.visjsData`, `Config.sources` and `Config.currentSource` are inspectable from the console.

## Domain Concepts (SousLeSens)

### Source

Central concept. **source** = one ontology / KG in triple store, defined in `config/sources.json`. Each source has:

- `graphUri`: named graph URI in triple store (e.g. `http://rds.posccaesar.org/ontology/...`)
- `schemaType`: `"OWL"` or `"SKOS"`, determines controller
- `controller`: `"Sparql_OWL"` or `"Sparql_SKOS"`, JS module handling queries
- `sparql_server.url`: SPARQL endpoint (`"_default"` = main Virtuoso instance)
- `predicates`: custom predicates for hierarchy (broaderPredicate, prefLabel, etc.)
- `imports`: other source names whose triples also load
- `owner`, `published`: access control

```javascript
Config.sources[sourceName]          // Access source config
Config.sources[sourceName].graphUri // Named graph URI
Lineage_sources.activeSource        // Currently selected source name
```

### OWL vs SKOS

Two data models, different query strategies.

**OWL** (`schemaType: "OWL"`, controller `Sparql_OWL`): classes (`owl:Class`), properties (`owl:ObjectProperty`, `owl:DatatypeProperty`), hierarchy via `rdfs:subClassOf`, instances via `rdf:type`. Formal ontologies (ISO standards, engineering).

**SKOS** (`schemaType: "SKOS"`, controller `Sparql_SKOS`): concepts (`skos:Concept`), concept schemes, hierarchy via `skos:broader` / `skos:narrower`, labels via `skos:prefLabel`, `skos:altLabel`. Thesauri, taxonomies, controlled vocabularies (GEMET, etc.).

`schemaType` determines generated SPARQL. Never assume OWL structure on a SKOS source.

### Profile

Controls user access, defined in `config/profiles.json`. Each profile has:

- `allowedTools`: visible tools (lineage, KGquery, MappingModeler, etc.)
- `allowedSourceSchemas`: accessible schema types (`OWL`, `SKOS`, `INDIVIDUALS`)
- `sourcesAccessControl`: per-source read/readwrite permissions
- `defaultSourceAccessControl`: fallback permission

```javascript
// Current user profile available via:
Config.userProfile
```

### Tools

- **Lineage**: ontology/KG as interactive graph on whiteboard. Main tool.
- **KGquery**: builds SPARQL queries visually from the graph model, executes, shows results in table/graph.
- **MappingModeler**: semantic mappings from SQL/CSV data sources to OWL/SKOS models.

### graphUri vs source name

- **source name** = human key in `sources.json` (e.g. `"ISO_15926-part-14_PCA"`), used in JS code
- **graphUri** = actual URI of the named graph in Virtuoso, used in SPARQL `FROM` clauses
- `Sparql_common.getFromStr(source)` converts source name to a `FROM <graphUri>` clause
