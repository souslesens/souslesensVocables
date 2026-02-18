import KGquery from "./KGquery.js";
import KGquery_graph from "./KGquery_graph.js";
import KGquery_proxy from "./KGquery_proxy.js";
import KGquery_filter from "./KGquery_filter.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import UI from "../../shared/UI.js";
import MainController from "../../shared/mainController.js";

var KGquery_NodeInfos = (function () {
    var self = {};

    self.nodesByWindowTypeCache = {};
    self.currentSource = null;
    self.currentTargetClassId = null;
    self.currentTargetClassName = null;
    self.uri = null;
    self.currentNodesByWindowType = null;
    self.currentDatatypesResult = null;
    self.savedKGqueryState = null;

    self.saveKGqueryState = function () {
        self.savedKGqueryState = {
            querySets: JSON.parse(JSON.stringify(KGquery.querySets)),
            divsMap: Object.assign({}, KGquery.divsMap),
            currentQuerySet: KGquery.currentQuerySet,
            allPathEdges: KGquery.allPathEdges ? Object.assign({}, KGquery.allPathEdges) : {},
            classToVarNameMap: Object.assign({}, KGquery.classToVarNameMap),
            varNameToClassMap: Object.assign({}, KGquery.varNameToClassMap),
            selectClauseSparql: KGquery.selectClauseSparql,
            currentOptionalPredicatesSparql: KGquery.currentOptionalPredicatesSparql,
            optionalPredicatesSubjecstMap: KGquery.optionalPredicatesSubjecstMap ? Object.assign({}, KGquery.optionalPredicatesSubjecstMap) : {},
            labelFromURIToDisplay: KGquery.labelFromURIToDisplay ? KGquery.labelFromURIToDisplay.slice() : [],
            currentSelectedPredicates: KGquery.currentSelectedPredicates ? KGquery.currentSelectedPredicates.slice() : [],
            currentSource: KGquery.currentSource,
            containersFilterMap: KGquery_filter.containersFilterMap ? Object.assign({}, KGquery_filter.containersFilterMap) : {},
        };
    };

    self.restoreKGqueryState = function () {
        if (!self.savedKGqueryState) {
            return;
        }
        KGquery.querySets = self.savedKGqueryState.querySets;
        KGquery.divsMap = self.savedKGqueryState.divsMap;
        KGquery.currentQuerySet = self.savedKGqueryState.currentQuerySet;
        KGquery.allPathEdges = self.savedKGqueryState.allPathEdges;
        KGquery.classToVarNameMap = self.savedKGqueryState.classToVarNameMap;
        KGquery.varNameToClassMap = self.savedKGqueryState.varNameToClassMap;
        KGquery.selectClauseSparql = self.savedKGqueryState.selectClauseSparql;
        KGquery.currentOptionalPredicatesSparql = self.savedKGqueryState.currentOptionalPredicatesSparql;
        KGquery.optionalPredicatesSubjecstMap = self.savedKGqueryState.optionalPredicatesSubjecstMap;
        KGquery.labelFromURIToDisplay = self.savedKGqueryState.labelFromURIToDisplay;
        KGquery.currentSelectedPredicates = self.savedKGqueryState.currentSelectedPredicates;
        KGquery.currentSource = self.savedKGqueryState.currentSource;
        KGquery_filter.containersFilterMap = self.savedKGqueryState.containersFilterMap;
        self.savedKGqueryState = null;
    };

    self.generateRawInfosStr = function (prop, value, notTr) {
        var str = "<tr class='infos_table'>";
        str += "<td class='detailsCellName'>" + prop + "</td>";
        str += "<td class='detailsCellValue'><div class='KGquery_NodeInfos_content'>" + value + "</div></td>";
        if (!notTr) {
            str += "</tr>";
        }
        return str;
    };

    self.generatePropertiesBloc = function (title, properties) {
        var str = "<div class='NodesInfos_tableDiv'>";
        str += "<table class='infosTable'><tbody>";
        str += "<tr><td class='NodesInfos_CardId' colspan='2'>" + title + "</td></tr>";

        properties.forEach(function (prop) {
            var columnName = prop.column_name || "";
            var value = prop.value || "";
            str += self.generateRawInfosStr(columnName, value);
        });

        str += "</tbody></table>";
        str += "</div>";
        return str;
    };

    self.generatePropertiesPave = function (title, properties) {
        var str = "<div class='NodesInfos_tableDiv'>";
        str += "<table class='infosTable'><tbody>";
        str += "<tr><td class='NodesInfos_CardId' colspan='" + properties.length + "'>" + title + "</td></tr>";

        str += "<tr>";
        properties.forEach(function (prop) {
            var columnName = prop.column_name || "";
            str += "<td class='detailsCellName' style='text-align:center;'>" + columnName + "</td>";
        });
        str += "</tr>";

        str += "<tr>";
        properties.forEach(function (prop) {
            var value = prop.value || "";
            str += "<td class='detailsCellValue' style='text-align:center;'>" + value + "</td>";
        });
        str += "</tr>";

        str += "</tbody></table>";
        str += "</div>";
        return str;
    };

    self.generateSparqlResultsPave = function (title, sparqlResult, columnsToDisplay) {
        if (!sparqlResult || !sparqlResult.results || !sparqlResult.results.bindings || sparqlResult.results.bindings.length === 0) {
            return "<div class='NodesInfos_tableDiv'><p>No data available</p></div>";
        }

        var bindings = sparqlResult.results.bindings;
        var columns = columnsToDisplay || sparqlResult.head.vars || Object.keys(bindings[0]);

        var filteredColumns = columns.filter(function (columnName) {
            var hasNonBlankNode = bindings.some(function (binding) {
                if (!binding[columnName]) {
                    return true;
                }
                var value = binding[columnName].value || "";
                return !value.startsWith("_:b");
            });
            return hasNonBlankNode;
        });

        filteredColumns = filteredColumns.filter(function (columnName) {
            if (bindings.length > 0 && bindings[0][columnName]) {
                return bindings[0][columnName].type !== "uri";
            }
            return true;
        });

        var str = "<div class='NodesInfos_tableDiv'>";
        str += "<table class='infosTable'><tbody>";
        str += "<tr><td class='NodesInfos_CardId' colspan='" + filteredColumns.length + "'>" + title + "</td></tr>";

        str += "<tr>";
        filteredColumns.forEach(function (columnName) {
            var displayName = columnName.replace(/_/g, " ");
            displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
            str += "<td class='detailsCellName' style='text-align:center;'>" + displayName + "</td>";
        });
        str += "</tr>";

        bindings.forEach(function (binding) {
            str += "<tr>";
            filteredColumns.forEach(function (columnName) {
                var value = "";
                if (binding[columnName]) {
                    value = binding[columnName].value || "";
                    if (binding[columnName].type === "uri") {
                        var uriParts = value.split("/");
                        var shortValue = uriParts[uriParts.length - 1];
                        value = "<span title=\"" + value + "\">" + shortValue + "</span>";
                    }
                }

                if (columnName.endsWith("_label")) {
                    var uriColumnName = columnName.replace("_label", "");
                    var uri = binding[uriColumnName] ? binding[uriColumnName].value : null;
                    if (uri && value) {
                        var targetClassId = self.findClassIdForVarName(uriColumnName);
                        var source = self.currentSource;
                        value =
                            '<a href="#" onclick="KGquery_NodeInfos.showNodeInfos(\'' +
                            source +
                            "', '" +
                            uri +
                            "', '" +
                            (targetClassId || "") +
                            "', 'smallDialogDiv'); return false;\">" +
                            value +
                            "</a>";
                    }
                }

                str += "<td class='detailsCellValue' style='text-align:center;'>" + value + "</td>";
            });
            str += "</tr>";
        });

        str += "</tbody></table></div>";
        return str;
    };

    self.findClassIdForVarName = function (varName) {
        if (!KGquery.classToVarNameMap) {
            return null;
        }
        for (var classId in KGquery.classToVarNameMap) {
            var mapped = KGquery.classToVarNameMap[classId];
            if (mapped === "?" + varName || mapped === varName) {
                return classId;
            }
        }
        return null;
    };

    self.showNodeInfos = function (source, uri, targetClassId, divId, callback) {
        if (!callback) {
            callback = function () {};
        }

        self.currentSource = source;
        self.uri = uri;
        self.currentTargetClassId = targetClassId;

        var classNode = KGquery_graph.visjsData.nodes.find(function (node) {
            return node.id === targetClassId;
        });
        self.currentTargetClassName = classNode ? Sparql_common.getLabelFromURI(classNode.id) : Sparql_common.getLabelFromURI(targetClassId);

        var dialogTitle = "Infos : " + (uri ? Sparql_common.getLabelFromURI(uri) : self.currentTargetClassName);
        UI.openDialog(divId, { title: dialogTitle });

        $("#" + divId).load("./modules/tools/KGquery/html/KGquery_NodeInfos.html", function () {
            self.buildNodeInfosDisplay(uri, targetClassId, source, divId, function (err) {
                if (err) {
                    console.log(err);
                }
                callback(err);
            });
        });
    };

    self.buildNodeInfosDisplay = function (uri, targetClassId, source, divId, callback) {
        async.series(
            [
                // Retrieve datatype properties from graph node
                function (callbackSeries) {
                    var classNode = KGquery_graph.visjsData.nodes.find(function (node) {
                        return node.id === targetClassId;
                    });
                    if (!classNode) {
                        return callbackSeries("Class node not found in graph: " + targetClassId);
                    }
                    self.datatypeProperties = classNode.data.nonObjectProperties || [];
                    callbackSeries();
                },

                // Display datatype properties of the instance
                function (callbackSeries) {
                    if (!uri) {
                        return callbackSeries();
                    }
                    self.displayNodeDatatypeProperties(uri, self.datatypeProperties, "Bloc", self.currentTargetClassName + " Attributes", "KGquery_NodeInfos_targetInfosDiv", source, function (err, datatypeResult) {
                        if (err) {
                            return callbackSeries(err);
                        }

                        if (datatypeResult && datatypeResult.label && datatypeResult.label.value) {
                            UI.openDialog(divId, { title: "Infos : " + datatypeResult.label.value });
                        }

                        $("#" + divId).dialog("option", "position", { my: "center", at: "center", of: window });
                        self.currentDatatypesResult = datatypeResult;
                        callbackSeries();
                    });
                },

                // Compute nodesByWindowType (with cache)
                function (callbackSeries) {
                    var cacheKey = source + "_" + targetClassId;
                    if (self.nodesByWindowTypeCache[cacheKey]) {
                        self.currentNodesByWindowType = self.nodesByWindowTypeCache[cacheKey];
                        return callbackSeries();
                    }

                    self.getNodesByWindowType(source, targetClassId, function (err, result) {
                        if (err) {
                            console.log(err);
                            return callbackSeries(err);
                        }
                        self.currentNodesByWindowType = result;
                        self.nodesByWindowTypeCache[cacheKey] = result;
                        callbackSeries();
                    });
                },

                // Create dynamic tabs for Window nodes
                function (callbackSeries) {
                    self.addNodeInfosTab(self.currentNodesByWindowType, "Window", "kgni_window_tab", self.loadWindowNodeProperties, callbackSeries);
                },

                // Load Pave nodes for the target class
                function (callbackSeries) {
                    if (!uri) {
                        return callbackSeries();
                    }
                    self.loadPavesForClass(targetClassId, uri, self.currentTargetClassName, "KGquery_NodeInfos_targetInfosDiv", callbackSeries);
                },
            ],
            function (err) {
                if (err) {
                    console.log(err);
                }
                if (callback) {
                    callback(err);
                }
            }
        );
    };

    self.displayNodeDatatypeProperties = function (uri, datatypeProperties, displayType, title, targetDivId, source, callback) {
        var datatypeStr = "";
        datatypeProperties.forEach(function (item) {
            if (item.id === "http://www.w3.org/2000/01/rdf-schema#label" || item.id === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                return;
            }
            datatypeStr += "OPTIONAL {<" + uri + "> <" + item.id + "> ?" + item.label + ".}\n";
        });

        var fromStr = Sparql_common.getFromStr(source);
        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
            "SELECT * " +
            fromStr +
            " WHERE { " +
            "<" +
            uri +
            "> rdfs:label ?label. " +
            datatypeStr +
            "}";

        var url = Config.sources[source].sparql_server.url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
            if (err) {
                console.log(err);
                return callback(err);
            }

            if (!result.results || !result.results.bindings || result.results.bindings.length === 0) {
                UI.message("No data found for this item");
                return callback();
            }

            var datatypeResult = result.results.bindings[0];

            var properties = [];

            if (datatypeResult.label && datatypeResult.label.value) {
                properties.push({
                    column_name: "Label",
                    value: datatypeResult.label.value,
                });
            }

            for (var propName in datatypeResult) {
                if (propName === "label") {
                    continue;
                }

                var propValue = "";
                if (datatypeResult[propName] && datatypeResult[propName].value) {
                    propValue = datatypeResult[propName].value;
                }

                var readablePropName = propName.replace(/_/g, " ");
                readablePropName = readablePropName.charAt(0).toUpperCase() + readablePropName.slice(1);

                properties.push({
                    column_name: readablePropName,
                    value: propValue,
                });
            }

            var str = "";
            if (displayType === "Pave") {
                str = self.generatePropertiesPave(title, properties);
            } else {
                str = self.generatePropertiesBloc(title, properties);
            }

            $("#" + targetDivId).html(str);
            callback(null, datatypeResult);
        });
    };

    self.getNodesByWindowType = function (source, targetClassId, callback) {
        if (!source) {
            return callback("source is required");
        }
        if (!targetClassId) {
            return callback("targetClassId is required");
        }

        var graph = KGquery_graph.visjsData;
        if (!graph || !graph.edges) {
            return callback("KGquery_graph is not loaded");
        }

        var result = [];
        var processed = new Set();

        function getConnectedEdges(nodeId) {
            return graph.edges.filter(function (edge) {
                return edge.from === nodeId || edge.to === nodeId;
            });
        }

        function getNeighborCount(nodeId, excludeNodeId) {
            var edges = getConnectedEdges(nodeId);
            var neighbors = new Set();
            edges.forEach(function (edge) {
                var neighborId = edge.from === nodeId ? edge.to : edge.from;
                if (neighborId !== excludeNodeId) {
                    neighbors.add(neighborId);
                }
            });
            return neighbors.size;
        }

        function getEdgeCardinality(edge) {
            if (edge.data && edge.data.maxCardinality !== undefined) {
                return edge.data.maxCardinality;
            }
            return 1;
        }

        function processNode(nodeId, rank, parentNodeId) {
            var connectedEdges = getConnectedEdges(nodeId);

            connectedEdges.forEach(function (edge) {
                var neighborId = edge.from === nodeId ? edge.to : edge.from;

                if (neighborId === parentNodeId || processed.has(neighborId)) {
                    return;
                }

                var neighborCount = getNeighborCount(neighborId, nodeId);

                if (neighborCount > 0) {
                    result.push({
                        id: neighborId,
                        type: "Window",
                    });
                    processed.add(neighborId);
                    processNode(neighborId, rank + 1, nodeId);
                } else {
                    var cardinality = getEdgeCardinality(edge);

                    if (cardinality === 1) {
                        result.push({
                            id: neighborId,
                            type: "Pave",
                            linkedObject: nodeId,
                        });
                        processed.add(neighborId);
                    } else {
                        result.push({
                            id: neighborId,
                            type: "Window",
                        });
                        processed.add(neighborId);
                        processNode(neighborId, rank + 1, nodeId);
                    }
                }
            });
        }

        processed.add(targetClassId);
        processNode(targetClassId, 1, null);
        callback(null, result);
    };

    self.addNodeInfosTab = function (nodes, filterType, tabPrefix, contentLoaderCallback, callback) {
        if (!nodes || nodes.length === 0) {
            return callback();
        }

        var filteredNodes = nodes.filter(function (node) {
            return node.type === filterType;
        });

        if (filteredNodes.length === 0) {
            return callback();
        }

        var tabsHtml = "";
        var tabContentsHtml = "";

        filteredNodes.forEach(function (node, index) {
            var nodeData = KGquery_graph.visjsData.nodes.find(function (n) {
                return n.id === node.id;
            });

            var nodeLabel = nodeData ? nodeData.label : filterType + " " + (index + 1);
            var tabId = tabPrefix + "_" + index;

            tabsHtml += '<li><a href="#' + tabId + '">' + nodeLabel + "</a></li>";
            tabContentsHtml += '<div id="' + tabId + '" style="overflow:auto"></div>';
        });

        var existingTabs = $("#KGquery_NodeInfos_tabsDiv > ul");
        if (existingTabs.length > 0) {
            existingTabs.append(tabsHtml);
            $("#KGquery_NodeInfos_tabsDiv").append(tabContentsHtml);

            try {
                $("#KGquery_NodeInfos_tabsDiv").tabs();
            } catch (e) {
                // tabs already initialized
            }
            $("#KGquery_NodeInfos_tabsDiv").tabs("refresh");

            $("#KGquery_NodeInfos_tabsDiv")
                .off("tabsactivate")
                .on("tabsactivate", function (_event, ui) {
                    var tabId = ui.newPanel.attr("id");

                    if (tabId && tabId.startsWith(tabPrefix + "_")) {
                        var tabIndex = parseInt(tabId.replace(tabPrefix + "_", ""));
                        var node = filteredNodes[tabIndex];

                        if (node && !ui.newPanel.data("loaded")) {
                            self.loadTabContent(node, tabId, tabPrefix, filteredNodes, ui);

                            if (contentLoaderCallback) {
                                contentLoaderCallback(node, tabId);
                            }
                        }
                    }
                });
        }

        callback();
    };

    self.executeNodeQuery = function (node, nodeIds, targetClassId, targetClassName, uri, callback) {
        var queryResult;

        async.series(
            [
                function (callbackSeries) {
                    KGquery_proxy.addNodesToKGquery(nodeIds, function (err) {
                        if (err) {
                            console.log(err);
                            return callbackSeries(err);
                        }
                        callbackSeries();
                    });
                },

                function (callbackSeries) {
                    var tabNode = KGquery_graph.visjsData.nodes.find(function (visJsNode) {
                        return visJsNode.id == node.id;
                    });
                    if (!tabNode) {
                        return callbackSeries();
                    }

                    var nodesPropertiesMap = {};
                    nodeIds.forEach(function (nodeId) {
                        if (nodeId == tabNode.id) {
                            nodesPropertiesMap[nodeId] = null;
                        } else if (nodeId != targetClassId) {
                            nodesPropertiesMap[nodeId] = ["http://www.w3.org/2000/01/rdf-schema#label"];
                        }
                    });

                    KGquery_proxy.setOptionalPredicates(nodesPropertiesMap, function (err) {
                        if (err) {
                            console.log(err);
                            return callbackSeries(err);
                        }
                        callbackSeries();
                    });
                },

                function (callbackSeries) {
                    var filterStr = "FILTER ( ?" + targetClassName + " =<" + uri + ">)";
                    var filterObj = {
                        filter: filterStr,
                        filterLabel: "",
                        filterParams: {
                            property: "http://www.w3.org/2000/01/rdf-schema#label",
                            propertyLabel: "label",
                            varName: targetClassName,
                        },
                    };

                    var nodeFiltersMap = {};
                    nodeFiltersMap[targetClassId] = filterObj;

                    KGquery_proxy.addNodeFilters(nodeFiltersMap, function (err) {
                        if (err) {
                            console.log(err);
                            return callbackSeries(err);
                        }
                        callbackSeries();
                    });
                },

                function (callbackSeries) {
                    KGquery.execPathQuery({}, function (err, result) {
                        if (err) {
                            console.log(err);
                            return callbackSeries(err);
                        }
                        queryResult = result;
                        callbackSeries();
                    });
                },
            ],
            function (err) {
                if (err) {
                    return callback(err);
                }
                callback(null, queryResult);
            }
        );
    };

    self.loadTabContent = function (node, tabId, tabPrefix, filteredNodes, ui) {
        ui.newPanel.data("loaded", true);

        self.saveKGqueryState();
        KGquery.clearAll(true);
        KGquery_proxy.init(self.currentSource, function () {
            var targetClassId = self.currentTargetClassId;
            var nodeIds = [targetClassId, node.id];

            self.executeNodeQuery(node, nodeIds, targetClassId, self.currentTargetClassName, self.uri, function (err, queryResult) {
                self.restoreKGqueryState();

                if (err) {
                    console.log(err);
                    MainController.errorAlert(err);
                    return;
                }

                if (!queryResult || !queryResult.results || !queryResult.results.bindings) {
                    return;
                }

                var nodeName = Sparql_common.getLabelFromURI(node.id);
                var columnsToKeep = queryResult.head.vars.filter(function (title) {
                    return title.includes(nodeName);
                });

                var title = nodeName + " Properties";
                var html = self.generateSparqlResultsPave(title, queryResult, columnsToKeep);
                $("#" + tabId).html(html);

                self.loadPavesForClass(node.id, self.uri, self.currentTargetClassName, tabId, node.id, function (err) {
                    if (err) {
                        console.log("Error loading panes:", err);
                    }
                });
            });
        });
    };

    self.loadWindowNodeProperties = function (windowNode, targetDivId) {
        $("#" + targetDivId).html("");
    };

    self.loadNodeContentAsPave = function (node, uri, targetClassName, intermediateClassId, callback) {
        if (typeof intermediateClassId === "function") {
            callback = intermediateClassId;
            intermediateClassId = null;
        }

        self.saveKGqueryState();
        KGquery.clearAll(true);
        KGquery_proxy.init(self.currentSource, function () {
            var targetClassId = self.currentTargetClassId;
            var nodeIds = [targetClassId];

            if (intermediateClassId) {
                nodeIds.push(intermediateClassId);
            }

            nodeIds.push(node.id);

            self.executeNodeQuery(node, nodeIds, targetClassId, targetClassName, uri, function (err, queryResult) {
                self.restoreKGqueryState();

                if (err) {
                    console.log(err);
                    return callback(err);
                }

                if (!queryResult || !queryResult.results || !queryResult.results.bindings) {
                    return callback(null, "");
                }

                var nodeName = Sparql_common.getLabelFromURI(node.id);

                var intermediateClassName = "";
                if (intermediateClassId && KGquery.classToVarNameMap[intermediateClassId]) {
                    intermediateClassName = KGquery.classToVarNameMap[intermediateClassId].replaceAll("?", "");
                }

                var columnsToKeep = queryResult.head.vars.filter(function (title) {
                    return !title.includes(targetClassName) && title != intermediateClassName;
                });
                var title = nodeName + " Properties";
                var html = self.generateSparqlResultsPave(title, queryResult, columnsToKeep);

                callback(null, html);
            });
        });
    };

    self.loadPavesForClass = function (classId, uri, className, targetDivId, intermediateClassId, callback) {
        if (typeof intermediateClassId === "function") {
            callback = intermediateClassId;
            intermediateClassId = null;
        }

        if (!self.currentNodesByWindowType || self.currentNodesByWindowType.length === 0) {
            if (callback) callback();
            return;
        }

        var paveNodes = self.currentNodesByWindowType.filter(function (node) {
            return node.type === "Pave" && node.linkedObject === classId;
        });

        if (!paveNodes || paveNodes.length === 0) {
            if (callback) callback();
            return;
        }

        async.eachSeries(
            paveNodes,
            function (paveNode, callbackEach) {
                self.loadNodeContentAsPave(paveNode, uri, className, intermediateClassId, function (err, html) {
                    if (err) {
                        console.log(err);
                        return callbackEach(err);
                    }

                    $("#" + targetDivId).append(html);
                    callbackEach();
                });
            },
            function (err) {
                if (err) {
                    console.log(err);
                }
                if (callback) {
                    callback(err);
                }
            }
        );
    };

    return self;
})();

export default KGquery_NodeInfos;
window.KGquery_NodeInfos = KGquery_NodeInfos;
