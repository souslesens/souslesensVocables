/**
 * KGquery Module
 * Module for querying and visualizing knowledge graphs.
 * Provides functionality to build and execute queries on knowledge graphs.
 * @module KGquery

 */

import Lineage_sources from "../lineage/lineage_sources.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";

import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";

import Export from "../../shared/export.js";
import common from "../../shared/common.js";
import Lineage_whiteboard from "../lineage/lineage_whiteboard.js";
import KGqueryAggregateWidget from "./KGqueryAggregateWidget.js";

import SourceSelectorWidget from "../../uiWidgets/sourceSelectorWidget.js";
import MainController from "../../shared/mainController.js";
import KGquery_graph from "./KGquery_graph.js";
import SavedQueriesWidget from "../../uiWidgets/savedQueriesWidget.js";
import KGquery_myQueries from "./KGquery_myQueries.js";
import SQLquery_filters from "./sql/SQLquery_filters.js";
import KGquery_controlPanel from "./KGquery_controlPanel.js";
import KGquery_paths from "./KGquery_paths.js";
import GanttWidget from "../../uiWidgets/ganttWidget.js";

import UI from "../../../modules/shared/UI.js";

import KGquery_filter from "./KGquery_filter.js";

import Containers_widget from "../containers/containers_widget.js";
import UserDataWidget from "../../uiWidgets/userDataWidget.js";
import KGquery_predicates from "./KGquery_predicates.js";

var KGquery = (function () {
    var self = {};
    self.querySets = { sets: [], groups: [], currentIndex: -1 };
    self.divsMap = {};
    self.classeMap = {};
    self.allPathEdges = {};
    self.isLoaded = false;
    self.maxResultSizeforLineageViz = 3000;
    self.maxOptionalPredicatesInQuery = 10;
    self.pathEdgesColors = ["green", "blue", "orange", "grey", "yellow"];

    /**
     * Called when the module is loaded.
     * Initializes the user interface and loads saved queries.
     * @function
     * @name onLoaded
     * @memberof module:KGquery
     * @returns {void}
     * @category KGquery
     * @public
     */
    self.onLoaded = function () {
        //Lineage_sources.showHideEditButtons = UI.disableEditButtons;
        //self.oldshowHideEditButtons=Lineage_sources.showHideEditButtons;
        //Lineage_sources.showHideEditButtons = UI.disableEditButtons;
        UI.initMenuBar(KGquery.loadSource);
        KGquery_graph.visjsData = null;
        UserDataWidget.currentTreeNode = null;

        //KGquery.clearAll();
        UI.disableEditButtons();
        if (Config.clientCache.KGquery) {
            KGquery_myQueries.load(null, Config.clientCache.KGquery);
        }
        //self.clearAll();
        $("#messageDiv").attr("id", "KGquery_messageDiv");
        $("#waitImg").attr("id", "KGquery_waitImg");
        $("#MappingModeler_currentDataSourceDiv").remove();
        KGquery.initMyQuery();
    };
    /**
     * Unloads the module and restores initial state.
     * @function
     * @name unload
     * @memberof module:KGquery
     * @returns {void}
     */
    self.unload = function () {
        Lineage_sources.registerSource = UI.oldRegisterSource;
        $("#KGquery_messageDiv").attr("id", "messageDiv");
        $("#KGquery_waitImg").attr("id", "waitImg");
        $("#graphDiv").empty();
        $("#lateralPanelDiv").empty();
    };

    /**
     * Initializes the module.
     * Draws the graph model and sets up saved queries.
     * @function
     * @name init
     * @memberof module:KGquery
     * @returns {void}
     */
    self.init = function () {
        KGquery_graph.drawVisjsModel("saved");

        SavedQueriesWidget.showDialog("tabs_myQueries", self.currentSource, KGquery_myQueries.save, KGquery_myQueries.load, "KGquery/savedQueries/");
    };

    /**
     * Initializes the output type selector with available tools.
     * @function
     * @name initOutputType
     * @memberof module:KGquery
     * @returns {void}
     */
    self.initOutputType = function () {
        const KGquery_outputTypeSelectNode = $("#KGquery_outputTypeSelect");
        for (const toolName in Config.userTools.KGquery.toTools) {
            KGquery_outputTypeSelectNode.append(`<option>${toolName}</option>`);
        }
    };

    self.initVarNamesMap = function () {
        self.varNameToClassMap = {};
        self.classToVarNameMap = {};
        var nodes = KGquery_graph.KGqueryGraph.data.nodes.get();
        nodes.forEach(function (node) {
            var varName = self.getVarName(node);
            self.varNameToClassMap[varName] = node.id;
            self.classToVarNameMap[node.id] = varName;
        });
    };

    /**
     * Loads a source and initializes the graph visualization.
     * @function
     * @name loadSource
     * @memberof module:KGquery
     * @returns {void}
     */
    self.loadSource = function () {
        KGquery.currentSource = MainController.currentSource;
        Lineage_sources.loadSources(MainController.currentSource, function (err) {
            if (err) {
                return MainController.errorAlert(err);
            }
            $("#graphDiv").load("./modules/tools/KGquery/html/KGquery_centralPanel.html", function () {
                $("#lateralPanelDiv").load("./modules/tools/KGquery/html/KGquery_leftPanel.html", function () {
                    UI.disableEditButtons();
                    UI.openTab("lineage-tab", "tabs_Query", KGquery.initQuery, "#QueryTabButton");
                    UI.resetWindowSize();
                    self.clearAll();
                    if (Config.clientCache.KGquery) {
                        setTimeout(function () {
                            KGquery_myQueries.load(null, Config.clientCache.KGquery);
                        }, 1000);
                    }
                    $("#rightControlPanelDiv").load("./modules/tools/KGquery/html/KGqueryGraphButtons.html", function () {});
                });
                $("#KGquery_dataTableDialogDiv").dialog({
                    autoOpen: false,
                    height: $(document).height() * 0.9,
                    width: "100vW",
                    modal: false,
                });
            });
        });
    };

    /**
     * Adds a new query set with a boolean operator.
     * @function
     * @name addQuerySet
     * @memberof module:KGquery
     * @param {string} booleanOperator - The boolean operator to use (AND, OR, etc.)
     * @returns {Object} querySet - The newly created query set
     * @property {string} querySet.divId - The ID of the div containing the query set
     * @property {Array} querySet.elements - Array of query elements in this set
     * @property {string} querySet.color - The color assigned to this query set
     * @property {string} querySet.booleanOperator - The boolean operator for this set
     * @property {Object} querySet.classFiltersMap - Map of class filters
     * @property {number} querySet.index - Index of this query set
     */
    self.addQuerySet = function (booleanOperator) {
        var label = "";
        var color = self.pathEdgesColors[self.querySets.sets.length];
        var querySetDivId = KGquery_controlPanel.addQuerySet("KGquery_pathsDiv", booleanOperator, label, color);

        var querySet = {
            divId: querySetDivId,
            elements: [],
            color: color,
            booleanOperator: booleanOperator,
            classFiltersMap: {},
            index: self.querySets.sets.length,
        }; // array of queryElements with a color and a currentIndex

        // self.addQueryElementToQuerySet(querySet);
        self.querySets.sets.push(querySet);
        self.currentQuerySet = querySet;
        self.divsMap[querySetDivId] = querySet;
        return querySet;
    };

    /**
     * Adds a query element to a query set.
     * @function
     * @name addQueryElementToQuerySet
     * @memberof module:KGquery
     * @param {Object} querySet - The query set to add the element to
     * @returns {Object} queryElement - The newly created query element
     * @property {string} queryElement.divId - The ID of the div containing this element
     * @property {string} queryElement.fromNode - The source node
     * @property {string} queryElement.toNode - The target node
     * @property {Array} queryElement.paths - Array of paths between fromNode and toNode
     * @property {string} queryElement.queryElementDivId - The element's div ID
     * @property {string} queryElement.fromNodeDivId - The source node's div ID
     * @property {string} queryElement.toNodeDivId - The target node's div ID
     * @property {number} queryElement.index - Index within the query set
     * @property {number} queryElement.setIndex - Index of the parent query set
     */
    self.addQueryElementToQuerySet = function (querySet) {
        //  $("#KGquery_SetsControlsDiv").show();
        var queryElementDivId = KGquery_controlPanel.addQueryElementToCurrentSet(querySet.divId);
        var queryElement = {
            divId: queryElementDivId,
            fromNode: "",
            toNode: "",
            paths: [], //array of pathItems between from and toNode
            queryElementDivId: "",
            fromNodeDivId: "",
            toNodeDivId: "",
            index: querySet.elements.length,
            setIndex: querySet.index,
        };
        querySet.elements.push(queryElement);
        // self.currentQueryElement = queryElement;
        self.divsMap[queryElementDivId] = queryElement;
        return queryElement;
    };

    /**
     * Adds a node to a query element.
     * @function
     * @name addNodeToQueryElement
     * @memberof module:KGquery
     * @param {Object} queryElement - The query element to add the node to
     * @param {Object} node - The node to add
     * @param {string} role - The role of the node ('fromNode' or 'toNode')
     * @returns {void}
     */
    self.addNodeToQueryElement = function (queryElement, node, role) {
        self.classeMap[node.id] = node;
        queryElement[role] = node;
        if (role == "toNode") {
            // to be finished
        }
        var nodeDivId = KGquery_controlPanel.addNodeToQueryElementDiv(queryElement.divId, role, node.alias || node.label);

        KGquery_graph.outlineNode(node.id);
        node.data.setIndex = self.currentQuerySet.index;
        node.data.nodeDivId = nodeDivId;
        //  node.data.queryElement = queryElement;
        self.divsMap[nodeDivId] = node;
    };

    /**
     * Adds a node to the graph.
     * @function
     * @name addNode
     * @memberof module:KGquery
     * @param {Object} selectedNode - The node to add
     * @param {Object} nodeEvent - The event that triggered the addition
     * @param {Function} [callback] - Optional callback after adding
     * @returns {void}
     */
    self.addNode = function (selectedNode, nodeEvent, callback) {
        if (!selectedNode) {
            return;
        }

        var node = JSON.parse(JSON.stringify(selectedNode));

        /* if existing path in queryFlement a new one is created
  with a from Node that is the nearest node from the existing Node of all previous element in the set*/

        if (!self.currentQuerySet) {
            self.currentQuerySet = self.addQuerySet();
        }
        if (self.currentQuerySet.elements.length == 0) {
            self.currentQueryElement = self.addQueryElementToQuerySet(self.currentQuerySet);
        }
        if (self.currentQueryElement.toNode) {
            self.currentQueryElement = self.addQueryElementToQuerySet(self.currentQuerySet);
        }

        if (self.currentQuerySet.elements.length > 1) {
            var excludeSelf = false;

            //   $("#KGquery_SetsControlsDiv").show();
            KGquery_paths.getNearestNodeId(node.id, self.currentQuerySet, excludeSelf, function (err, nearestNodeId) {
                if (err) {
                    return MainController.errorAlert(err);
                }

                self.addNodeToQueryElement(self.currentQueryElement, node, "fromNode");
                var nearestNode = self.classeMap[nearestNodeId];
                self.addNodeToQueryElement(self.currentQueryElement, nearestNode, "toNode");

                KGquery_paths.setQueryElementPath(self.currentQueryElement, function (err, result) {
                    if (err) {
                        return MainController.errorAlert(err);
                    }

                    var predicateLabel = KGquery_controlPanel.getQueryElementPredicateLabel(self.currentQueryElement);
                    KGquery_controlPanel.addPredicateToQueryElementDiv(self.currentQueryElement.divId, predicateLabel);
                    if (callback) {
                        return callback();
                    }
                });
            });
        } else if (!self.currentQueryElement.fromNode) {
            self.addNodeToQueryElement(self.currentQueryElement, node, "fromNode");
            self.currentFromNode = node;
            if (callback) {
                return callback();
            }
        } else if (!self.currentQueryElement.toNode) {
            //give new varName to the classId
            if (self.currentQueryElement.fromNode.id == node.id) {
                node.label += "_" + (self.currentQueryElement.paths.length + 1);
                node.data.label = node.label;
            }

            self.currentQueryElement.toNode = node;
            KGquery_paths.setQueryElementPath(self.currentQueryElement, function (err, result) {
                if (err) {
                    return MainController.errorAlert(err);
                }
                self.addNodeToQueryElement(self.currentQueryElement, node, "toNode");

                var predicateLabel = KGquery_controlPanel.getQueryElementPredicateLabel(self.currentQueryElement);
                KGquery_controlPanel.addPredicateToQueryElementDiv(self.currentQueryElement.divId, predicateLabel);
                if (callback) {
                    return callback();
                }
            });
        }
    };

    /**
     * Adds edge nodes to the graph.
     * @function
     * @name addEdgeNodes
     * @memberof module:KGquery
     * @param {Object} fromNode - The source node
     * @param {Object} toNode - The target node
     * @param {Object} edge - The edge data
     * @returns {void}
     */
    self.addEdgeNodes = function (fromNode, toNode, edge) {
        if (!self.currentQuerySet) {
            self.currentQuerySet = self.addQuerySet();
        }

        var queryElement = self.addQueryElementToQuerySet(self.currentQuerySet);
        self.addNodeToQueryElement(queryElement, fromNode, "fromNode");
        self.addNodeToQueryElement(queryElement, toNode, "toNode");
        var subPath = [edge.from, edge.to, edge.data.propertyId];

        var path = [subPath];
        var pathWithVarNames = KGquery_paths.substituteClassIdToVarNameInPath(queryElement, path);
        queryElement.paths = pathWithVarNames;
        self.addQueryElementToQuerySet(self.currentQuerySet);
    };

    /**
     * Adds edges between nodes in the graph.
     * @function
     * @name addEdge
     * @memberof module:KGquery
     * @param {Object} edge - The edge to add
     * @param {Object} evt - The event that triggered the addition
     * @returns {void}
     */
    self.addEdge = function (edge, evt) {
        var fromNode = KGquery_graph.KGqueryGraph.data.nodes.get(edge.from);
        fromNode = JSON.parse(JSON.stringify(fromNode));

        var toNode = KGquery_graph.KGqueryGraph.data.nodes.get(edge.to);
        toNode = JSON.parse(JSON.stringify(toNode));
        if (edge.from == edge.to) {
            toNode = JSON.parse(JSON.stringify(fromNode));

            if (edge.data.propertyId == "rdfs:member") {
                //  exclude  rdf:member predicate from graph !!!!!!!!!!
                if (false) {
                    fromNode.alias = fromNode.label + "_parent";
                    var options = { memberClass: fromNode.data.id };

                    Containers_widget.showDialog(self.currentSource, options, function (err, result) {
                        fromNode.data.containerFilter = {
                            classId: result ? result.topMember.id : null,
                            depth: result ? result.depth : 1,
                        };
                        KGquery.addEdgeNodes(fromNode, toNode, edge);
                    });
                }
            } else {
                var alias = toNode.label;
                if (self.currentQueryElement) {
                    alias += self.currentQueryElement.paths.length + 1;
                } else {
                    return;
                }
                toNode.alias = alias;
                return KGquery.addEdgeNodes(fromNode, toNode, edge);
            }
        } else {
            return KGquery.addEdgeNodes(fromNode, toNode, edge);
        }
    };

    /**
     * Performs aggregation on query results.
     * Shows a dialog for selecting aggregate clauses and validates that variables belong to the same set.
     * @function
     * @name aggregateQuery
     * @memberof module:KGquery
     * @returns {void}

     */
    self.aggregateQuery = function () {
        var message = "";
        if (self.querySets.sets.length > 1) {
            return alert("Aggregate works only with variables belonging to the same set");
            // message = "<font color='blue'>aggregate works only with variables belonging to the same set !</font>";
        }
        if (self.querySets.sets.length == 0) {
            return alert("no data selected");
        }
        var varsMap = {};

        self.querySets.sets.forEach(function (querySet) {
            querySet.elements.forEach(function (queryElement, queryElementIndex) {
                if (queryElement.fromNode) {
                    var key = queryElement.fromNode.alias || queryElement.fromNode.label;
                    varsMap[key] = queryElement.fromNode;
                }
                if (queryElement.toNode) {
                    var key = queryElement.toNode.alias || queryElement.toNode.label;
                    varsMap[key] = queryElement.toNode;
                }
            });
        });

        KGqueryAggregateWidget.showDialog(
            null,
            function (callback) {
                callback(varsMap);
            },

            function (err, aggregateClauses) {
                var query = KGquery_predicates.buildAggregateQuery(self.querySets.sets[0], aggregateClauses, {});
                var url = Config.sources[self.currentSource].sparql_server.url + "?format=json&query=";

                Sparql_proxy.querySPARQL_GET_proxy(
                    url,
                    query,
                    "",
                    {
                        source: self.currentSource,
                    },
                    function (err, result) {
                        if (err) {
                            return alert(err);
                        }
                        //   var bindings = result.results.bindings;
                        self.queryResultToTable(result);
                    },
                );
            },
            message,
        );
    };

    /**
     * Executes a query on the knowledge graph.
     * @function
     * @name queryKG
     * @memberof module:KGquery
     * @param {string} output - The desired output format ('table', 'Graph', 'shacl', or custom tool name)
     * @param {Object} [options] - Additional query options
     * @param {Object} [options.aggregate] - Aggregation settings for the query
     * @param {boolean} [isVirtualSQLquery=false] - Whether this is a virtual SQL query
     * @throws {Error} If the query execution fails
     * @returns {void}
     */
    self.queryKG = function (output, options, isVirtualSQLquery) {
        if (!options) {
            options = {};
        }
        options.output = output;

        self.message("searching...");
        $("#KGquery_waitImg").css("display", "block");

        if (isVirtualSQLquery) {
            return SQLquery_filters.showFiltersDialog(self.querySets, self.currentSource);
        }

        KGquery_filter.selectOptionalPredicates(self.querySets, {}, function (err, result) {
            if (err) {
                return alert(err);
            }

            KGquery.labelFromURIToDisplay = result.labelFromURIToDisplay;
            KGquery.selectClauseSparql = result.selectClauseSparql;
            KGquery.currentOptionalPredicatesSparql = result.optionalPredicatesSparql;
            KGquery.optionalPredicatesSubjecstMap = result.optionalPredicatesSubjecstMap;
            options.sampleSize = result.sampleSize;

            self.execPathQuery(options, function (err, result) {
                self.message("", true);
                if (err) {
                    if (err.responseText) {
                        return MainController.errorAlert(err);
                    }
                }

                if (result.results) {
                    if (result.results.bindings.length == 0) {
                        return alert("no result");
                    }
                    self.message("found items :" + result.results.bindings.length);
                }

                if (false && self.outputCsv) {
                    self.queryResultToCsv(result);
                }

                if (output == "table") {
                    self.queryResultToTable(result);
                    //  console.trace()
                } else if (output == "Graph") {
                    self.queryResultToVisjsGraph(result);
                } else if (output == "shacl") {
                    //  KGconstraints_validator.process(result);
                } else {
                    Config.userTools.KGquery.toTools[output](result);
                }
            });
        });
    };

    /**
     * Executes a SPARQL path query based on the provided options.
     * The query is constructed dynamically and executed in multiple steps.
     *
     * @function
     * @name execPathQuery
     * @memberof module:KGquery
     * @param {Object} options - The options for query execution
     * @param {string} options.output - The desired output format (e.g., "shacl")
     * @param {Function} callback - Callback function to handle the query results
     * @param {Error} callback.err - Error object if the query fails
     * @param {Object} callback.result - The query results if successful
     * @returns {void}
     */
    self.execPathQuery = function (options, callback) {
        var optionalPredicatesSparql = KGquery.currentOptionalPredicatesSparql;
        KGquery.selectClauseSparql = KGquery.selectClauseSparql;
        KGquery.labelFromURIToDisplay = KGquery.labelFromURIToDisplay;
        var containerFiltersSparql = "";
        var query = "";

        var isUnion = false;
        var isJoin = false;
        var data;
        var labelFromURIToDisplay = [];
        var sampleSize;
        var distinctSetTypes;
        async.series(
            [
                function (callbackSeries) {
                    var queryResult = KGquery_predicates.buildQuery(self.querySets, {});
                    query = queryResult.query;
                    isUnion = queryResult.isUnion;
                    isJoin = queryResult.isJoin;
                    distinctSetTypes = queryResult.distinctSetTypes;
                    return callbackSeries();
                },
                //execute query
                function (callbackSeries) {
                    var url = Config.sources[self.currentSource].sparql_server.url + "?format=json&query=";
                    if (options.output == "shacl") {
                        url = "http://51.178.139.80:8890/sparql?format=text/Turtle&query=";
                    }

                    self.currentSparqlQuery = {
                        url: url,
                        query: query,
                        source: self.currentSource,
                    };

                    var sampleSize = options.sampleSize;
                    var totalSize = 0;
                    var labelsMap = {};
                    var resultSize = 1;
                    var limitSize = sampleSize || 10000;
                    var offset = 0;
                    var csvSize = 10000;

                    self.outputCsv = false;
                    var limitCondition = true;
                    data = { results: { bindings: [] }, head: { vars: [] } };
                    if (limitSize > 10000) {
                        alert("sample size is too large, it will be set to 10000");
                        limitSize = 10000;
                    }
                    async.whilst(
                        function (_test) {
                            if (!self.outputCsv && totalSize >= csvSize) {
                                self.outputCsv = true;
                            }
                            UI.message("retreived " + totalSize);
                            // only one batch for sample size
                            if (options.sampleSize && totalSize > 0) {
                                limitCondition = false;
                            }

                            return resultSize > 0 && limitCondition;
                        },
                        function (callbackWhilst) {
                            var query2 = "" + query;
                            query2 += " limit " + limitSize + " offset " + offset;

                            Sparql_proxy.querySPARQL_GET_proxy(
                                url,
                                query2,
                                "",
                                {
                                    source: self.currentSource,
                                    caller: null,
                                },
                                function (err, result) {
                                    if (err) {
                                        return callbackSeries(err);
                                    }
                                    var bindings = result.results.bindings;
                                    offset += bindings.length;
                                    totalSize += bindings.length;
                                    resultSize = bindings.length;
                                    data.head.vars = result.head.vars;
                                    data.results.bindings = data.results.bindings.concat(bindings);
                                    callbackWhilst(null, result);
                                },
                            );
                        },
                        function (err) {
                            callbackSeries(null, data);
                        },
                    );
                },
                // Union Joins
                function (callbackSeries) {
                    if (!isUnion || !data || data?.results?.bindings.length == 0) {
                        return callbackSeries();
                    }
                    var results = data?.results?.bindings;
                    // SPARQL Query render differents unions paths with differents values of querySet variable for each set
                    var dataByQuerySet = common.array.arrayByCategory(results, "querySet");

                    //concat data sets with full outer joins
                    var joinedData;

                    dataByQuerySet.forEach(function (setData, index) {
                        if (joinedData) {
                            var keysCurrentSet = distinctSetTypes[index];
                            var keysPreviousSet = distinctSetTypes[index - 1];
                            var commonKeys = keysCurrentSet.filter((key) => keysPreviousSet.includes(key));
                            commonKeys = commonKeys.map((str) => str.replace(/\?/g, ""));
                            joinedData = common.array.fullOuterJoin(joinedData, setData, commonKeys);
                        } else {
                            joinedData = setData;
                        }
                    });

                    data.results.bindings = joinedData;
                    return callbackSeries();
                },
                //Delete querySet Variable
                function (callbackSeries) {
                    if (isJoin) {
                        data.results.bindings = common.array.removeColumn(data.results.bindings, "querySet");
                    }
                    return callbackSeries();
                },
            ],
            function (err) {
                callback(err, data);
            },
        );
    };

    /**
     * Converts query results to a Vis.js graph visualization.
     * @function
     * @name queryResultToVisjsGraph
     * @memberof module:KGquery
     * @param {Object} result - The query results to convert
     * @throws {Error} If result size exceeds maxResultSizeforLineageViz
     * @returns {void}
     */
    self.queryResultToVisjsGraph = function (result) {
        var classNodes = self.getAllQueryPathClasses();

        var data = result.results.bindings;
        if (data.length > self.maxResultSizeforLineageViz) {
            return alert("result size to large " + data.length + " to display graph .Add filters to reduce result size less than " + self.maxResultSizeforLineageViz);
        }

        var existingNodes = {};
        var visjsData = { nodes: [], edges: [] };
        data.forEach(function (item, index) {
            var lineNodeId = common.getRandomHexaId(5);
            visjsData.nodes.push(
                VisjsUtil.getVisjsNode(self.currentSource, lineNodeId, "", null, {
                    shape: "text",
                    size: 2,
                    color: "#ddd",
                }),
            );

            classNodes.forEach(function (classNode) {
                var varNameKey = self.getVarName(classNode, true);
                var labelKey = varNameKey + "Label";
                if (!item[varNameKey]) {
                    return;
                }
                if (!existingNodes[item[varNameKey].value]) {
                    existingNodes[item[varNameKey].value] = 1;

                    var options = {
                        shape: "triangle",
                        size: Lineage_whiteboard.defaultShapeSize,
                        color: common.getResourceColor("class", varNameKey),
                    };
                    var label = item[labelKey] ? item[labelKey].value : Sparql_common.getLabelFromURI(item[varNameKey].value);
                    visjsData.nodes.push(VisjsUtil.getVisjsNode(self.currentSource, item[varNameKey].value, label, null, options));
                    visjsData.edges.push({
                        id: lineNodeId + item[varNameKey].value,
                        from: item[varNameKey].value,
                        to: lineNodeId,
                    });
                }
            });
        });

        MainController.onToolSelect("lineage", null, function () {
            setTimeout(function () {
                Lineage_whiteboard.drawNewGraph(visjsData, "graphDiv");
            }, 2000);
        });
    };
    /**
     * Converts query results to a tags geometry visualization.
     * @function
     * @name queryToTagsGeometry
     * @memberof module:KGquery
     * @param {Object} result - The query results to convert
     * @returns {void}
     */
    self.queryToTagsGeometry = function (result) {
        const data = result.results.bindings;
        var tagsMap = {};
        data.forEach(function (item) {
            for (var key in item) {
                if (key.indexOf("tag") > -1) {
                    tagsMap[item[key].value] = 1;
                }
            }
        });
        MainController.onToolSelect("TagsGeometry", null, function () {
            setTimeout(function () {
                //   import TagsGeometry from "../../../../plugins/TagsGeometry/public/js/main.js";
                TagsGeometry.draw(tagsMap);
            }, 2000);
        });
    };

    /**
     * Converts query results to a tags calendar visualization.
     * @function
     * @name queryToTagsCalendar
     * @memberof module:KGquery
     * @param {Object} result - The query results to convert
     * @returns {void}
     */
    self.queryToTagsCalendar = function (result) {
        const data = result.results.bindings;
        if (data.length == 0) {
            return alert("no result");
        }
        MainController.onToolSelect("TagsCalendar", null, function () {
            setTimeout(function () {
                //   import TagsGeometry from "../../../../plugins/TagsGeometry/public/js/main.js";
                TagsCalendar.drawSparqlResultTimeLine({ data: data });
            }, 2000);
        });
    };

    /**
     * Converts query results to a table format and displays it in a dialog.
     * Handles large result sets by exporting to CSV if size exceeds 10000 rows.
     * @function
     * @name queryResultToTable
     * @memberof module:KGquery
     * @param {Object} result - The query results to convert
     * @param {Array} result.results.bindings - The query result bindings
     * @param {Array} result.head.vars - The query result variables
     * @returns {void}
     */
    self.queryResultToTable = function (result) {
        var data = result.results.bindings;
        //prepare columns
        var nonNullCols = {};
        data.forEach(function (item) {
            result.head.vars.forEach(function (varName) {
                if (varName.length < 3) {
                    return;
                }
                if (nonNullCols[varName]) {
                    return;
                }

                if (item[varName]) {
                    if (item[varName].type != "uri") {
                        nonNullCols[varName] = item[varName].type;
                    } else {
                        if (KGquery.labelFromURIToDisplay?.length > 0 && KGquery.labelFromURIToDisplay.includes(varName)) {
                            nonNullCols[varName] = "labelFromURI" + varName;
                        }
                    }
                }
            });
        });
        var tableCols = [];
        var colNames = [];
        tableCols.push({ title: "rowIndex", visible: false, defaultContent: "", width: "15%" });
        // colNames.push("rowIndex");
        for (var varName in nonNullCols) {
            tableCols.push({ title: varName, defaultContent: "", width: "15%" });
            colNames.push(varName);
        }

        var tableData = [];
        self.currentData = data;
        self.tableCols = tableCols;
        data.forEach(function (item, index) {
            var line = [index];
            colNames.forEach(function (col) {
                var value = null;

                if (item[col]) {
                    value = item[col].value;
                    if (item[col].type == "uri") {
                        value = Sparql_common.getLabelFromURI(value);
                    }
                    //format date
                    if (item[col].datatype == "http://www.w3.org/2001/XMLSchema#dateTime") {
                        var p = value.indexOf("T00:00:00.000Z");
                        if (p > -1) {
                            value = value.substring(0, p);
                        }
                    }
                }

                line.push(value);
            });

            tableData.push(line);
        });

        $("#KGquery_dataTableDialogDiv").dialog("option", "title", "Query result size: " + tableData.length);

        //$("#KGquery_dataTableDialogDiv").css("left", "10px");
        //$("#KGquery_dataTableDialogDiv").width("90vW");
        if (tableData.length > 10000) {
            var columns = tableCols.map(function (item) {
                return item.title;
            });
            tableData.unshift(columns);
            alert("to large results, it will be exported");
            return Export.exportDataToCSV(tableData);
        }
        console.trace();
        Export.showDataTable("KGquery_dataTableDialogDiv", tableCols, tableData, null, { paging: true }, function (err, datatable) {
            $("#dataTableDivExport").on("click", "td", function () {
                var table = $("#dataTableDivExport").DataTable();
                var index = table.cell(this).index();
                if (!index.row) {
                    return UI.message("No row corresponding");
                }
                var dataItem = self.currentData[index.row];

                var varName = self.tableCols[index.column].title;
                if (true || !dataItem[varName]) {
                    var varNameNode = KGquery.currentSelectedPredicates.filter((key) => key.id == varName);
                    if (varNameNode && varNameNode.length > 0 && varNameNode[0]?.data?.varName) {
                        varName = varNameNode[0].data.varName;
                    }
                    //varName = varName.split("_")[0];
                }
                var uri = dataItem[varName].value;
                var node = { data: { id: uri } };
                NodeInfosWidget.showNodeInfos(self.currentSource, node, "smallDialogDiv", null, function (err) {
                    $("#smallDialogDiv").parent().css("z-index", 1);
                });
            });
        });
    };

    self.queryResultToCsv = function (result) {
        var data = result.results.bindings;
        //prepare columns
        var nonNullCols = {};
        data.forEach(function (item) {
            result.head.vars.forEach(function (varName) {
                if (varName.length < 3) {
                    return;
                }
                if (nonNullCols[varName]) {
                    return;
                }

                if (item[varName]) {
                    if (item[varName].type != "uri") {
                        nonNullCols[varName] = item[varName].type;
                    } else {
                        if (KGquery.labelFromURIToDisplay?.length > 0 && KGquery.labelFromURIToDisplay.includes(varName)) {
                            nonNullCols[varName] = "labelFromURI" + varName;
                        }
                    }
                }
            });
        });
        var tableCols = [];
        var colNames = [];
        tableCols.push({ title: "rowIndex", visible: false, defaultContent: "", width: "15%" });
        // colNames.push("rowIndex");
        for (var varName in nonNullCols) {
            tableCols.push({ title: varName, defaultContent: "", width: "15%" });
            colNames.push(varName);
        }

        var tableData = [];
        self.currentData = data;
        self.tableCols = tableCols;
        data.forEach(function (item, index) {
            var line = [index];
            colNames.forEach(function (col) {
                var value = null;

                if (item[col]) {
                    value = item[col].value;
                    if (item[col].type == "uri") {
                        value = Sparql_common.getLabelFromURI(value);
                    }
                    //format date
                    if (item[col].datatype == "http://www.w3.org/2001/XMLSchema#dateTime") {
                        var p = value.indexOf("T00:00:00.000Z");
                        if (p > -1) {
                            value = value.substring(0, p);
                        }
                    }
                }

                line.push(value);
            });

            tableData.push(line);
        });
    };

    /**
     * Clears all query sets and resets the graph state.
     * Optionally preserves set queries if specified.
     * @function
     * @name clearAll
     * @memberof module:KGquery
     * @param {boolean} [exceptSetQueries] - If true, preserves set queries during cleanup
     * @returns {void}
     */
    self.clearAll = function (exceptSetQueries) {
        self.querySets.sets.forEach(function (querySet) {
            querySet.classFiltersMap = {};
        });
        self.querySets = { sets: [], groups: [], currentIndex: -1 };
        self.divsMap = {};
        self.currentQuerySet = null;
        self.allPathEdges = {};
        KGquery_filter.containersFilterMap = {};
        if (!exceptSetQueries) {
            self.classeMap = {};
            self.SetQueries = [];
            self.queryPathesMap = {};

            self.divsMap = {};
            if (self.currentSource) {
                KGquery_graph.drawVisjsModel("saved");
            }
            $("#KGquery_pathsDiv").html("");
            //$("#KGquery_SetsControlsDiv").hide();
        }
    };

    /**
     * Gets the variable name for a node.
     * @function
     * @name getVarName
     * @memberof module:KGquery
     * @param {Object} node - The node to get variable name for
     * @param {boolean} [withoutQuestionMark] - Whether to omit the question mark prefix
     * @returns {string} The variable name for the node
     */
    self.getVarName = function (node, withoutQuestionMark) {
        var varName = (withoutQuestionMark ? "" : "?") + Sparql_common.formatStringForTriple(node.alias || node.label || Sparql_common.getLabelFromURI(node.id), true);

        return varName;
    };

    /**
     * Gets all classes used in query paths.
     * @function
     * @name getAllQueryPathClasses
     * @memberof module:KGquery
     * @returns {Array<Object>} Array of class objects used in query paths
     */
    self.getAllQueryPathClasses = function () {
        var classes = [];
        self.querySets.sets.forEach(function (querySet) {
            querySet.elements.forEach(function (queryPath) {
                classes.push(queryPath.fromNode);
                classes.push(queryPath.toNode);
            });
        });
        return classes;
    };

    /**
     * Displays a message in the UI and controls the wait image.
     * @function
     * @name message
     * @memberof module:KGquery
     * @param {string} message - The message to display
     * @param {boolean} [stopWaitImg=false] - If true, hides the wait image
     * @returns {void}
     */
    self.message = function (message, stopWaitImg) {
        $("#KGquery_messageDiv").html(message);
        if (stopWaitImg) {
            $("#KGquery_waitImg").css("display", "none");
        } else {
            $("#KGquery_waitImg").css("display", "block");
        }
    };

    /**
     * Switches the right panel display between graph and other views.
     * @function
     * @name switchRightPanel
     * @memberof module:KGquery
     * @param {boolean} [forceGraph] - Whether to force graph display
     * @returns {void}
     */
    self.switchRightPanel = function (forceGraph) {
        return;
        var isGraphDisplayed = $("#KGquery_graphDiv").css("display");
        if (!forceGraph && isGraphDisplayed == "block") {
            $("#KGquery_graphDiv").css("display", "none");
        } else {
            $("#KGquery_graphDiv").css("display", "block");
        }
    };

    /**
     * Handles boolean operator changes for query sets.
     * @function
     * @name onBooleanOperatorChange
     * @memberof module:KGquery
     * @param {string} querySetDivId - ID of the query set div
     * @param {string} value - New boolean operator value ('AND', 'OR', 'Union', etc.)
     * @returns {void}
     */
    self.onBooleanOperatorChange = function (querySetDivId, value) {
        self.divsMap[querySetDivId].booleanOperator = value;
    };

    /**
     * Removes a query element from the graph.
     * @function
     * @name removeQueryElement
     * @memberof module:KGquery
     * @param {string} queryElementDivId - ID of the query element div to remove
     * @returns {void}
     */
    self.removeQueryElement = function (queryElementDivId) {
        var queryElement = self.divsMap[queryElementDivId];
        var elementLength = self.querySets.sets[queryElement.setIndex].elements.length;
        var classFiltersMap = self.querySets.sets[queryElement.setIndex].classFiltersMap;
        if (elementLength > 0) {
            for (let i = elementLength - 1; i >= queryElement.index; i--) {
                var element = self.querySets.sets[queryElement.setIndex].elements[i];
                //delete filters
                if (element?.fromNode?.data?.nodeDivId && classFiltersMap[element?.fromNode?.data?.nodeDivId]) {
                    delete classFiltersMap[element?.fromNode?.data?.nodeDivId];
                }
                if (element?.toNode?.data?.nodeDivId && classFiltersMap[element?.toNode?.data?.nodeDivId]) {
                    delete classFiltersMap[element?.toNode?.data?.nodeDivId];
                }
                $("#" + element.divId).remove();
                // Restore color of nodes
                if (element?.fromNode?.color) {
                    KGquery_graph.KGqueryGraph.data.nodes.update([
                        {
                            id: element.fromNode.id,
                            color: element.fromNode.color,
                        },
                    ]);
                }
                if (element?.toNode?.color) {
                    KGquery_graph.KGqueryGraph.data.nodes.update([
                        {
                            id: element.toNode.id,
                            color: element.toNode.color,
                        },
                    ]);
                }
            }

            self.querySets.sets[queryElement.setIndex].elements.splice(queryElement.index, elementLength - queryElement.index);
            self.querySets.sets[queryElement.setIndex].elements.forEach(function (item) {
                if (item?.fromNode?.id) {
                    KGquery_graph.outlineNode(item?.fromNode?.id);
                }
                if (item?.toNode?.id) {
                    KGquery_graph.outlineNode(item?.toNode?.id);
                }
            });
        } else {
            KGquery.clearAll();
            KGquery.switchRightPanel(true);
        }

        //self.querySets.sets[queryElement.setIndex].classFiltersMap[]
    };

    /**
     * Removes a query set from the graph.
     * @function
     * @name removeSet
     * @memberof module:KGquery
     * @param {string} querySetDivId - ID of the query set div to remove
     * @returns {void}
     */
    self.removeSet = function (querySetDivId) {
        $("#" + querySetDivId).remove();
        var set = self.divsMap[querySetDivId];
        self.querySets.sets.splice(set.index, 1);
        self.currentQuerySet = self.querySets.sets.at(-1);
    };

    /**
     * Handles output type selection changes.
     * @function
     * @name onOutputTypeSelect
     * @memberof module:KGquery
     * @param {string} output - The selected output type
     * @returns {void}
     */
    self.onOutputTypeSelect = function (output) {
        if (output == "") {
            return;
        }
        self.queryKG(output);
        $("#KGquery_outputTypeSelect").val("");
    };

    /**
     * Adds an output type to the select options.
     * @function
     * @name addOutputType
     * @memberof module:KGquery
     * @returns {void}
     */
    self.addOutputType = function () {
        $("KGquery_outputTypeSelect");
    };

    /**
     * Initializes the query interface.
     * Loads the query tab HTML if not already loaded.
     * @function
     * @name initQuery
     * @memberof module:KGquery
     * @returns {void}
     */
    self.initQuery = function () {
        if ($("#tabs_Query").children().length == 0) {
            $("#tabs_Query").load("./modules/tools/KGquery/html/KGqueryQueryTab.html", function () {
                //  KGquery.addQuerySet();
            });
        }
    };

    /**
     * Initializes the graph interface.
     * Loads the graph tab HTML if not already loaded and initializes the graph visualization.
     * @function
     * @name initGraph
     * @memberof module:KGquery
     * @returns {void}
     */
    self.initGraph = function () {
        if ($("#tabs_Graph").children().length == 0) {
            $("#tabs_Graph").load("./modules/tools/KGquery/html/KGqueryGraphTab.html", function () {
                KGquery_graph.init();
                //  KGquery_graph.drawVisjsModel("saved");
            });
        }
    };

    /**
     * Checks requirements by executing a SHACL query.
     * @function
     * @name checkRequirements
     * @memberof module:KGquery
     * @returns {void}
     */
    self.checkRequirements = function () {
        KGquery.queryKG("shacl");
    };

    self.queryResultToGantt = function (result) {
        var implicitModel = KGquery_graph.visjsData;
        GanttWidget.showDialog(null, implicitModel, result, function (err, result) {});
    };

    /**
     * Initializes the query management interface.
     * @function
     * @name initMyQuery
     * @memberof module:KGquery
     * @returns {void}
     */
    self.initMyQuery = function () {
        SavedQueriesWidget.showDialog("tabs_myQueries", self.currentSource, KGquery_myQueries.save, KGquery_myQueries.load, "KGquery/savedQueries/");
    };

    return self;
})();

export default KGquery;
window.KGquery = KGquery;
