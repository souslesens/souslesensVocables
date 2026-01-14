# Coding Standards - Quick Reference

This document consolidates coding standards from `refactoring-guidelines.md` and observed patterns in the codebase.

## Code Formatting

### Use Prettier
**Always run before commit:**
```bash
npm run prettier:write
```

## Language

✅ **All code and comments in English**
❌ No French in variable names, function names, or comments

## Comments

### Minimize Unnecessary Comments

Only comment for:
- Subtle/complex logic
- Non-obvious algorithms
- Important warnings

❌ **Don't comment obvious code:**
```javascript
// BAD
str += "<tr>";  // Add table row
var count = 0;  // Initialize counter
```

✅ **Good comments explain why, not what:**
```javascript
// GOOD
// URI shortened to last segment for readability, full URI in tooltip
var label = Sparql_common.getLabelFromURI(uri);

// Virtuoso has a 10000 row limit, so we paginate
var limitSize = 10000;
```

### Use JSDoc for Functions

```javascript
/**
 * Calculates shortest path between two nodes
 * @function
 * @name getShortestPath
 * @param {string} source - Data source name
 * @param {string} fromId - Starting node URI
 * @param {string} toId - Target node URI
 * @param {Function} callback - Callback (err, path)
 * @returns {void}
 */
self.getShortestPath = function(source, fromId, toId, callback) {
    // Implementation
};
```

## Naming Conventions

### Variables
```javascript
// camelCase for all variables
var currentSource = null;
var selectedNodes = [];
var maxResultSize = 10000;

// Descriptive names
var labelsMap = {};           // NOT: var lm = {};
var existingNodes = {};       // NOT: var en = {};
```

### Functions
```javascript
// Event handlers: on<Event>
self.onButtonClick = function() { };
self.onNodeSelected = function() { };

// Getters: get<Thing>
self.getCurrentSource = function() { };
self.getSelectedNodes = function() { };

// Setters: set<Thing>
self.setCurrentSource = function(source) { };

// Actions: verbNoun
self.deleteNode = function(nodeId) { };
self.addToSelection = function(node) { };
self.clearSelection = function() { };
```

### Callbacks
```javascript
// Use 'callback' as standard name
function doSomething(param, callback) {
    if (err) {
        return callback(err);
    }
    callback(null, result);
}

// async.series: use callbackSeries
async.series([
    function(callbackSeries) {
        callbackSeries();
    }
], callback);

// async.eachSeries: use callbackEach
async.eachSeries(items, function(item, callbackEach) {
    callbackEach();
}, callback);
```

## Code Structure

### Methods Belong to Module

✅ **Define methods on self:**
```javascript
var MyModule = (function() {
    var self = {};

    self.publicMethod = function() { };
    self.helperMethod = function() { };

    return self;
})();
```

❌ **Don't define functions inside functions:**
```javascript
// BAD
self.generateTable = function(data) {
    // Avoid this pattern
    var generateRow = function(item) {
        return "<tr><td>" + item + "</td></tr>";
    };

    data.forEach(generateRow);
};

// GOOD
self.generateTable = function(data) {
    var html = "";
    data.forEach(function(item) {
        html += self.generateRow(item);
    });
    return html;
};

self.generateRow = function(item) {
    return "<tr><td>" + item + "</td></tr>";
};
```

**Exception:** Standard array methods are fine:
```javascript
// OK - standard array methods
data.forEach(function(item) { });
data.map(function(item) { return item.id; });
data.filter(function(item) { return item.selected; });
```

## Async Patterns

### Use async.js Library

✅ **For sequential operations:**
```javascript
async.series([
    function(callbackSeries) { callbackSeries(); },
    function(callbackSeries) { callbackSeries(); }
], callback);
```

✅ **For array iteration:**
```javascript
async.eachSeries(items, function(item, callbackEach) {
    processItem(item, callbackEach);
}, callback);
```

❌ **Don't use Promise or async/await:**
```javascript
// BAD - Don't introduce
async function doSomething() {
    const result = await query();
}

// BAD - Don't introduce
return new Promise((resolve, reject) => { });
```

### Error Handling

**Always check errors first:**
```javascript
function(err, result) {
    if (err) {
        return callback(err);  // Stop execution
    }
    // Continue with result
}
```

**Error propagation:**
```javascript
// Option 1: Propagate up
if (err) {
    return callback(err);
}

// Option 2: Show to user
if (err) {
    return MainController.errorAlert(err);
}

// Option 3: Log and continue
if (err) {
    console.error(err);
    return callback();  // Don't propagate
}
```

## HTML Generation

### Build Strings Progressively

```javascript
self.generateTable = function(title, data) {
    var str = "<div class='tableDiv'>";
    str += "<table class='infosTable'><tbody>";
    str += "<tr><td class='title'>" + title + "</td></tr>";

    data.forEach(function(item) {
        str += "<tr><td>" + item.name + "</td></tr>";
    });

    str += "</tbody></table></div>";
    return str;
};
```

## Module Structure

### Standard Template

```javascript
import Dependency1 from "./dependency1.js";
import Dependency2 from "./dependency2.js";

var ModuleName = (function () {
    var self = {};

    // Module state
    self.currentSource = null;
    self.loadedData = {};

    // Private variables
    var privateConfig = { };

    // Initialization
    self.init = function() {
        // Setup
    };

    // Public methods
    self.publicMethod = function(param, callback) {
        if (err) return callback(err);
        callback(null, result);
    };

    return self;
})();

// Dual export
export default ModuleName;
window.ModuleName = ModuleName;
```

## jQuery Patterns

### Chainable Operations

```javascript
$("#elementId")
    .html(content)
    .css("display", "block")
    .trigger("focus");
```

### Event Binding

```javascript
// After DOM ready
$("#divId").load("template.html", function() {
    $("#buttonId").on("click", handler);
});

// Inline handlers (use global window.Module)
<button onclick="ModuleName.method()">Click</button>
```

## File Organization

### Imports at Top

```javascript
import Module1 from "../../path/to/module1.js";
import Module2 from "../../path/to/module2.js";
import Util from "../shared/util.js";

var MyModule = (function() {
    // Module code
})();
```

### Exports at Bottom

```javascript
export default MyModule;
window.MyModule = MyModule;
```

## Testing

### Before Commit

1. Run Prettier: `npm run prettier:write`
2. Check console for errors
3. Test affected functionality
4. Check backward compatibility

## Git Workflow

### Commit Messages

```bash
# Good commit messages
git commit -m "Add cardinality calculation to KGquery_graph edges"
git commit -m "Fix null pointer in lineage_sources.loadSource"
git commit -m "Refactor SPARQL query building in KGquery_predicates"

# Bad commit messages
git commit -m "Fix bug"
git commit -m "Update code"
git commit -m "WIP"
```

### Pull Requests

See [contribute-to-development.md](../docs/docs/devdoc/contribute-to-development.md) in main docs.

---

*Last Updated: 2024-12-29*
*See also: [refactoring-guidelines.md](./refactoring-guidelines.md), [claude.md](./claude.md)*
