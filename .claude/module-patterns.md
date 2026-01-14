# Module Patterns - Real Examples from Codebase

This document provides **real, working patterns** extracted from the SousLeSens Vocables codebase.

## Table of Contents

1. [Module Structure Pattern](#module-structure-pattern)
2. [SPARQL Execution Patterns](#sparql-execution-patterns)
3. [Async Flow Patterns](#async-flow-patterns)
4. [UI Widget Patterns](#ui-widget-patterns)
5. [Graph Visualization Patterns](#graph-visualization-patterns)
6. [Common Utility Patterns](#common-utility-patterns)

---

## Module Structure Pattern

### Standard Module Template

**From: lineage_sources.js, KGquery.js, etc.**

```javascript
import Dependency1 from "../../path/to/dependency1.js";
import Dependency2 from "../../path/to/dependency2.js";

var ModuleName = (function () {
    var self = {};

    // Module state
    self.currentSource = null;
    self.loadedData = {};

    // Private variables (closure)
    var privateConfig = {
        maxItems: 100
    };

    // Initialization method
    self.init = function() {
        $("#someDiv").tabs();
        common.fillSelectOptions("selectId", options, true);
    };

    // Public methods
    self.methodName = function(param, callback) {
        if (!param) {
            return callback("param is required");
        }

        async.series([
            function(callbackSeries) {
                // Step 1
                callbackSeries();
            },
            function(callbackSeries) {
                // Step 2
                callbackSeries();
            }
        ], function(err) {
            if (err) {
                return callback(err);
            }
            callback(null, result);
        });
    };

    return self;
})();

export default ModuleName;
window.ModuleName = ModuleName;
```

---

## SPARQL Execution Patterns

### Pattern 1: Basic Query Execution

**From: lineage_graphTraversal.js:113**

```javascript
var url = Config.sources[source].sparql_server.url + "?format=json&query=";
var query = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
    "SELECT ?s ?sLabel WHERE { " +
    "?s rdfs:label ?sLabel. " +
    "FILTER(?s IN (<" + ids.join(">, <") + ">)) " +
    "} LIMIT 10000";

Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: source}, function(err, result) {
    if (err) {
        return callbackSeries(err);
    }

    result.results.bindings.forEach(function(item) {
        var uri = item.s.value;
        var label = item.sLabel ? item.sLabel.value : Sparql_common.getLabelFromURI(uri);
        labelsMap[uri] = label;
    });

    callbackSeries();
});
```

### Pattern 2: Using FROM Clauses

**From: KGquery_graph.js**

```javascript
var fromStr = Sparql_common.getFromStr(source, false);
var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
    "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
    "SELECT DISTINCT ?s ?p ?o " +
    fromStr +  // Adds FROM clauses
    " WHERE { " +
    "?s ?p ?o. " +
    "FILTER(?type IN (owl:Class, owl:ObjectProperty)) " +
    "} ";

Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: source}, callback);
```

### Pattern 3: Building Dynamic FILTER Clauses

**From: Sparql_common.js**

```javascript
var ids = ["http://example.org/Class1", "http://example.org/Class2"];
var filterStr = Sparql_common.setFilter("s", ids);
// Result: "FILTER(?s IN (<http://example.org/Class1>, <http://example.org/Class2>))"

var query = "SELECT ?s WHERE { ?s ?p ?o. " + filterStr + " }";
```

### Pattern 4: Paginated Query Execution

**From: KGquery.js:650-692**

```javascript
var offset = 0;
var limitSize = 10000;
var data = { results: { bindings: [] }, head: { vars: [] } };
var resultSize = 1;

async.whilst(
    function() {
        return resultSize > 0;
    },
    function(callbackWhilst) {
        var query2 = query + " LIMIT " + limitSize + " OFFSET " + offset;

        Sparql_proxy.querySPARQL_GET_proxy(url, query2, "", {source: source}, function(err, result) {
            if (err) {
                return callbackWhilst(err);
            }

            var bindings = result.results.bindings;
            resultSize = bindings.length;
            offset += resultSize;
            totalSize += resultSize;

            data.results.bindings = data.results.bindings.concat(bindings);
            data.head.vars = result.head.vars;

            callbackWhilst();
        });
    },
    function(err) {
        callbackSeries(null, data);
    }
);
```

---

## Async Flow Patterns

### Pattern 1: Sequential Steps with async.series

**From: lineage_graphTraversal.js:74-141**

```javascript
self.getShortestPathObjects = function(source, fromNodeId, toNodeId, options, callback) {
    var path = [];
    var relations = [];
    var labelsMap = {};

    async.series([
        // Step 1: Get path URIs
        function(callbackSeries) {
            self.getShortestpathUris(source, fromNodeId, toNodeId, options, function(err, result) {
                if (err) return callbackSeries(err);
                path = result;
                if (path.length == 0) {
                    return alert("no path found");
                }
                callbackSeries();
            });
        },
        // Step 2: Get labels
        function(callbackSeries) {
            var ids = [];
            path.forEach(function(item) {
                if (ids.indexOf(item[0]) < 0) ids.push(item[0]);
                if (ids.indexOf(item[1]) < 0) ids.push(item[1]);
            });

            var query = "SELECT ?s ?sLabel WHERE { ?s rdfs:label ?sLabel. }";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source}, function(err, result) {
                result.results.bindings.forEach(function(item) {
                    labelsMap[item.s.value] = item.sLabel ? item.sLabel.value : "...";
                });
                callbackSeries();
            });
        },
        // Step 3: Build relations
        function(callbackSeries) {
            path.forEach(function(item) {
                relations.push({
                    from: item[0],
                    to: item[1],
                    prop: item[2]
                });
            });
            callbackSeries();
        }
    ], function(err) {
        return callback(err, relations);
    });
};
```

### Pattern 2: Iterating with async.eachSeries

**From: lineage_combine.js:72-95**

```javascript
async.eachSeries(
    selectedSources,  // Array to iterate
    function(source, callbackEach) {
        if (!Config.sources[source]) {
            return callbackEach();  // Skip this item
        }

        Lineage_sources.registerSource(source);
        self.currentSources.push(source);

        Lineage_whiteboard.drawTopConcepts(source, {}, null, function(err) {
            if (err) {
                return callbackEach();  // Continue despite error
            }
            self.menuActions.groupSource(source);
            callbackEach();  // Process next source
        });
    },
    function(err) {
        // All sources processed
        if (err) {
            return UI.message(err);
        }
        $("#GenericTools_searchScope").val("whiteboardSources");
        Lineage_sources.setCurrentSource(Lineage_sources.activeSource);
    }
);
```

### Pattern 3: Nested async.series

**From: KGquery_graph.js:980-1086**

```javascript
self.buildInferredGraph = function(source, callback) {
    var visjsData = { nodes: [], edges: [] };

    async.series([
        // Step 1: Get implicit model
        function(callbackSeries) {
            self.getImplicitModelVisjsData(source, function(err, result2) {
                if (err) return callbackSeries(err);

                visjsData.nodes = visjsData.nodes.concat(result2.nodes);
                visjsData.edges = visjsData.edges.concat(result2.edges);

                callbackSeries();
            });
        },
        // Step 2: Load datatype properties
        function(callbackSeries) {
            OntologyModels.getKGnonObjectProperties(source, {}, function(err, nonObjectPropertiesmap) {
                if (err) return callbackSeries(err);

                visjsData.nodes.forEach(function(node) {
                    if (nonObjectPropertiesmap[node.data.id]) {
                        if (!node.data.nonObjectProperties) {
                            node.data.nonObjectProperties = [];
                        }
                        node.data.nonObjectProperties = node.data.nonObjectProperties.concat(
                            nonObjectPropertiesmap[node.data.id].properties
                        );
                    }
                });

                callbackSeries();
            });
        },
        // Step 3: Add cardinalities
        function(callbackSeries) {
            self.addCardinalityToEdges(source, visjsData, function(err) {
                if (err) {
                    console.log("Error adding cardinalities:", err);
                }
                callbackSeries(err);
            });
        }
    ], function(err) {
        self.visjsData = visjsData;
        return callback(err, visjsData);
    });
};
```

---

## UI Widget Patterns

### Pattern 1: Basic Widget Structure

**From: simpleListSelectorWidget.js**

```javascript
var SimpleListSelectorWidget = (function() {
    var self = {};

    self.divId = null;
    self.validateFn = null;

    self.showDialog = function(options, loadFn, validateFn) {
        self.divId = options.divId || "smallDialogDiv";
        self.validateFn = validateFn;

        var multipleStr = options.multiple ? " multiple" : "";
        var size = options.size || 15;

        var html = "<div>" +
            "<select id='SimpleListSelectorWidget_select' size='" + size + "'" + multipleStr + ">" +
            "<option></option>" +
            "</select>" +
            "<button onclick='SimpleListSelectorWidget.onOKbutton()'>OK</button>" +
            "</div>";

        $("#" + self.divId).html(html);
        $("#" + self.divId).dialog("open");

        // Load data via callback
        loadFn(function(data) {
            common.fillSelectOptions("SimpleListSelectorWidget_select", data, !options.multiple, "label", "id");
        });
    };

    self.onOKbutton = function() {
        var value = $("#SimpleListSelectorWidget_select").val();
        $("#" + self.divId).dialog("close");
        return self.validateFn(value);
    };

    return self;
})();

export default SimpleListSelectorWidget;
window.SimpleListSelectorWidget = SimpleListSelectorWidget;
```

### Pattern 2: Loading HTML Template

**From: NodeInfosWidget.js**

```javascript
self.showNodeInfos = function(sourceLabel, node, divId, options) {
    self.currentSource = sourceLabel;
    self.currentNode = node;

    $("#" + divId).load("modules/uiWidgets/html/nodeInfosWidget.html", function() {
        UI.openDialog(divId, { title: "Node Information" });

        // Setup tabs
        $("#nodeInfosWidget_tabsDiv").tabs({
            activate: function(event, ui) {
                var panelId = ui.newPanel.attr("id");
                if (panelId == "nodeInfos-details") {
                    self.showDetailsTab();
                }
            }
        });

        // Bind events
        $("#nodeInfos_backButton").on("click", function() {
            self.showPreviousNode();
        });

        // Load initial data
        self.loadNodeData();
    });
};
```

### Pattern 3: JSTree Integration

**From: JstreeWidget.js**

```javascript
self.loadJsTree = function(divId, jstreeData, options, callback) {
    if (!divId) {
        divId = "jstreeDiv";
    }

    var jstreeOptions = {
        core: {
            data: jstreeData,
            themes: { icons: false }
        },
        plugins: []
    };

    if (options.withCheckboxes) {
        jstreeOptions.plugins.push("checkbox");
    }

    if (options.searchPlugin) {
        jstreeOptions.plugins.push("search");
        jstreeOptions.search = options.searchPlugin;
    }

    $("#" + divId).jstree("destroy");  // Clean previous instance
    $("#" + divId).jstree(jstreeOptions);

    $("#" + divId).on("select_node.jstree", function(event, data) {
        if (options.selectTreeNodeFn) {
            options.selectTreeNodeFn(event, data);
        }
    });

    if (callback) {
        callback();
    }
};
```

---

## Graph Visualization Patterns

### Pattern 1: Building visjsData Structure

**From: KGquery_graph.js:290-509**

```javascript
self.getImplicitModelVisjsData = function(source, callback) {
    var visjsData = { nodes: [], edges: [] };
    var existingNodes = {};
    var implicitModel = [];

    async.series([
        // Get model data
        function(callbackSeries) {
            OntologyModels.getImplicitModel(source, {}, function(err, result) {
                implicitModel = result;
                callbackSeries();
            });
        },
        // Build graph
        function(callbackSeries) {
            implicitModel.forEach(function(item) {
                // Add source node
                if (!existingNodes[item.sClass.value]) {
                    existingNodes[item.sClass.value] = 1;

                    visjsData.nodes.push({
                        id: item.sClass.value,
                        label: item.sClassLabel.value,
                        shape: "box",
                        color: "#ddd",
                        data: {
                            id: item.sClass.value,
                            source: source,
                            type: "owl:Class"
                        }
                    });
                }

                // Add target node
                if (!existingNodes[item.oClass.value]) {
                    existingNodes[item.oClass.value] = 1;

                    visjsData.nodes.push({
                        id: item.oClass.value,
                        label: item.oClassLabel.value,
                        shape: "box",
                        color: "#ddd",
                        data: {
                            id: item.oClass.value,
                            source: source
                        }
                    });
                }

                // Add edge
                var edgeId = item.sClass.value + "_" + item.prop.value + "_" + item.oClass.value;
                if (!existingNodes[edgeId]) {
                    existingNodes[edgeId] = 1;

                    visjsData.edges.push({
                        id: edgeId,
                        from: item.sClass.value,
                        to: item.oClass.value,
                        label: item.propLabel.value,
                        data: {
                            propertyId: item.prop.value,
                            propertyLabel: item.propLabel.value,
                            source: source
                        },
                        arrows: { to: { enabled: true, type: "solid" } },
                        color: "#aaa"
                    });
                }
            });

            callbackSeries();
        }
    ], function(err) {
        return callback(err, visjsData);
    });
};
```

### Pattern 2: Updating Vis.js Graph

**From: KGquery_graph.js:531-641**

```javascript
// Update single node
self.setNodeAttr = function(attr, value) {
    if (!self.currentGraphNode) {
        return;
    }

    var newNode = {
        id: self.currentGraphNode.id,
        [attr]: value
    };

    self.KGqueryGraph.data.nodes.update(newNode);
};

// Update multiple nodes
self.setAllNodesAttr = function(attr, value) {
    var nodesId = self.KGqueryGraph.data.nodes.getIds();
    var newNodes = [];

    nodesId.forEach(function(id) {
        newNodes.push({
            id: id,
            [attr]: value
        });
    });

    self.KGqueryGraph.data.nodes.update(newNodes);
};
```

### Pattern 3: Drawing Graph

**From: KGquery_graph.js:1270-1380**

```javascript
self.drawModel = function(displayGraphInList, callback) {
    if (!self.visjsData) {
        return alert("no graph model");
    }

    // Enrich edge labels with cardinality
    self.visjsData.edges.forEach(function(item) {
        if (!item.data) item.data = {};
        if (!item.data.originalLabel && item.label) {
            item.data.originalLabel = item.label;
        }

        var baseLabel = item.data.originalLabel || item.data.propertyLabel || item.label;

        if (item.data.maxCardinality !== undefined) {
            var cardinalityLabel = item.data.maxCardinality === 1 ? "1" : "n";
            item.label = baseLabel + " (" + cardinalityLabel + ")";
        }

        self.labelsMap[item.id] = item.label;
    });

    // Create Vis.js graph
    self.KGqueryGraph = new VisjsGraphClass("KGquery_graphDiv", self.visjsData, self.visjsOptions);

    // Draw with callback
    self.KGqueryGraph.draw(function() {
        self.simulationOn = true;

        // Center graph
        self.KGqueryGraph.network.moveTo({
            position: { x: 0, y: 0 },
            scale: 1 / 0.9
        });

        if (callback) {
            callback();
        }
    });
};
```

---

## Common Utility Patterns

### Pattern 1: Filling Select Options

**From: common.js**

```javascript
// Simple array of strings
var options = ["Option 1", "Option 2", "Option 3"];
common.fillSelectOptions("selectId", options, false);

// Array of objects
var options = [
    { id: "1", label: "Option 1" },
    { id: "2", label: "Option 2" }
];
common.fillSelectOptions("selectId", options, false, "label", "id");
```

### Pattern 2: Error Handling

```javascript
// User-facing error
if (err) {
    return MainController.errorAlert(err);
}

// Silent UI message
if (err) {
    return UI.message(err);
}

// Log and continue
if (err) {
    console.error(err);
    return callback();  // Don't propagate
}

// Propagate error up
if (err) {
    return callback(err);
}
```

### Pattern 3: jQuery Dialog Management

```javascript
// Open dialog
$("#mainDialogDiv").load("path/to/template.html", function() {
    UI.openDialog("mainDialogDiv", {
        title: "Dialog Title",
        width: 800,
        height: 600
    });
});

// Close dialog
$("#mainDialogDiv").dialog("close");

// Initialize dialog
$("#dialogDiv").dialog({
    autoOpen: false,
    modal: true,
    width: "90vw",
    height: $(document).height() * 0.9
});
```

---

*Last Updated: 2024-12-29*
*See also: [claude.md](./claude.md), [sparql-guidelines.md](./sparql-guidelines.md)*
