# SPARQL Guidelines

Quick reference for executing SPARQL queries in SousLeSens Vocables.

## Primary Execution Method

### Sparql_proxy.querySPARQL_GET_proxy

**This is the main method to execute SPARQL queries.**

```javascript
var url = Config.sources[source].sparql_server.url + "?format=json&query=";
var query = "SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10";

Sparql_proxy.querySPARQL_GET_proxy(
    url,                    // SPARQL endpoint URL with ?format=json&query=
    query,                  // SPARQL query string
    "",                     // queryOptions (additional URL params)
    { source: source },     // options object
    function(err, result) { // callback
        if (err) {
            return callback(err);
        }
        // result.results.bindings contains the data
        callback(null, result);
    }
);
```

**Parameters:**
- `url`: Full endpoint URL with `?format=json&query=`
- `query`: SPARQL query string
- `queryOptions`: Additional URL parameters (usually `""`)
- `options`: Object with `source` property and optional `caller`
- `callback`: Error-first callback `function(err, result)`

## Result Structure

```javascript
{
    head: {
        vars: ["s", "p", "o"]  // Variable names without '?'
    },
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
    var subject = binding.s.value;      // Always use .value
    var predicate = binding.p.value;
    var object = binding.o.value;
});
```

## Common Query Patterns

### 1. Basic SELECT Query

```javascript
var query = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
    "SELECT ?s ?label WHERE { " +
    "?s rdf:type owl:Class. " +
    "?s rdfs:label ?label. " +
    "} LIMIT 100";
```

### 2. Query with FROM Clauses

```javascript
var fromStr = Sparql_common.getFromStr(source, false);
var query = "SELECT ?s ?p ?o " + fromStr + " WHERE { ?s ?p ?o }";
```

### 3. Query with FILTER

```javascript
var ids = ["http://example.org/Class1", "http://example.org/Class2"];
var filterStr = Sparql_common.setFilter("s", ids);
// Creates: FILTER(?s IN (<http://example.org/Class1>, <http://example.org/Class2>))

var query = "SELECT ?s WHERE { ?s ?p ?o. " + filterStr + " }";
```

### 4. Pagination Pattern

```javascript
var offset = 0;
var limitSize = 10000;
var allResults = [];

async.whilst(
    function() { return resultSize > 0; },
    function(callbackWhilst) {
        var query = baseQuery + " LIMIT " + limitSize + " OFFSET " + offset;

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source}, function(err, result) {
            if (err) return callbackWhilst(err);

            var bindings = result.results.bindings;
            resultSize = bindings.length;
            offset += resultSize;
            allResults = allResults.concat(bindings);

            callbackWhilst();
        });
    },
    function(err) {
        callback(err, allResults);
    }
);
```

## High-Level SPARQL Methods

### Sparql_generic

```javascript
// Get node children
Sparql_generic.getNodeChildren(source, nodeId, options, callback);

// Delete triples
Sparql_generic.deleteTriples(source, subjectUri, predicateUri, objectUri, callback);

// Insert triples
var triples = [
    { subject: "uri1", predicate: "uri2", object: "uri3" }
];
Sparql_generic.insertTriples(source, triples, options, callback);
```

### Sparql_OWL

```javascript
// Get dictionary entries
var filter = "?id rdf:type owl:Class";
Sparql_OWL.getDictionary(source, { filter: filter }, null, callback);

// Get all triples
Sparql_OWL.getAllTriples(source, subjectUri, options, callback);
```

### Sparql_common Utilities

```javascript
// Build FROM clauses
var fromStr = Sparql_common.getFromStr(source, includeImports);

// Build FILTER IN clause
var filterStr = Sparql_common.setFilter("varName", uriArray);

// Extract label from URI
var label = Sparql_common.getLabelFromURI("http://example.org/MyClass");
// Result: "MyClass"
```

## Error Handling

```javascript
Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source}, function(err, result) {
    if (err) {
        // Check for specific errors
        if (err.responseText && err.responseText.indexOf("Virtuoso 42000") > -1) {
            return MainController.errorAlert("Query timeout - select more specific data");
        }

        // General error handling
        console.error(err);
        UI.message("Error in SPARQL query");
        return callback(err);
    }

    // Process result
    callback(null, result);
});
```

## Best Practices

1. **Always build URL with format parameter:**
   ```javascript
   var url = Config.sources[source].sparql_server.url + "?format=json&query=";
   ```

2. **Use Sparql_common utilities for FROM and FILTER:**
   ```javascript
   var fromStr = Sparql_common.getFromStr(source, false);
   var filterStr = Sparql_common.setFilter("s", ids);
   ```

3. **Handle pagination for large results:**
   - Use LIMIT/OFFSET for results > 10,000
   - Accumulate results in array

4. **Check result before accessing:**
   ```javascript
   if (result && result.results && result.results.bindings) {
       result.results.bindings.forEach(...)
   }
   ```

5. **Always access .value property:**
   ```javascript
   var uri = binding.s.value;  // NOT just binding.s
   ```

## Query Building Helpers

### Dynamic Property Paths

```javascript
// Build path like: ?s prop1 / prop2 / prop3 ?o
var properties = ["prop1Uri", "prop2Uri", "prop3Uri"];
var pathStr = properties.map(p => "<" + p + ">").join(" / ");
var query = "SELECT ?s ?o WHERE { ?s " + pathStr + " ?o }";
```

### Optional Patterns

```javascript
var query = "SELECT ?s ?label WHERE { " +
    "?s rdf:type owl:Class. " +
    "OPTIONAL { ?s rdfs:label ?label } " +  // May not have label
    "}";
```

### UNION Patterns

```javascript
var query = "SELECT ?s WHERE { " +
    "{ ?s rdf:type owl:Class } " +
    "UNION " +
    "{ ?s rdf:type owl:ObjectProperty } " +
    "}";
```

---

*Last Updated: 2024-12-29*
*See also: [claude.md](./claude.md), [module-patterns.md](./module-patterns.md)*
