import Lineage_sources from "../lineage/lineage_sources.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";

import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";

import Export from "../../shared/export.js";
import common from "../../shared/common.js";
import Lineage_whiteboard from "../lineage/lineage_whiteboard.js";
import IndividualAggregateWidget from "./individualAggregateWidget.js";

import SourceSelectorWidget from "../../uiWidgets/sourceSelectorWidget.js";
import MainController from "../../shared/mainController.js";
import KGquery_graph from "./KGquery_graph.js";
import SavedQueriesWidget from "../../uiWidgets/savedQueriesWidget.js";
import KGquery_myQueries from "./KGquery_myQueries.js";
import SQLquery_filters from "./SQLquery_filters.js";
import KGquery_controlPanel from "./KGquery_controlPanel.js";
import KGquery_paths from "./KGquery_paths.js";

import UI from "../../../modules/shared/UI.js";

import KGquery_filter from "./KGquery_filter.js";

import Containers_widget from "../containers/containers_widget.js";

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

    self.onLoaded = function () {
        //Lineage_sources.showHideEditButtons = UI.disableEditButtons;
        //self.oldshowHideEditButtons=Lineage_sources.showHideEditButtons;
        //Lineage_sources.showHideEditButtons = UI.disableEditButtons;
        UI.initMenuBar(KGquery.loadSource);
        //KGquery.clearAll();
        UI.disableEditButtons();
        if (Config.clientCache.KGquery) {
            KGquery_myQueries.load(null, Config.clientCache.KGquery);
        }
        self.clearAll();
        $("#messageDiv").attr("id", "KGquery_messageDiv");
        $("#waitImg").attr("id", "KGquery_waitImg");
    };
    self.unload = function () {
        Lineage_sources.registerSource = UI.oldRegisterSource;
        //Lineage_sources.showHideEditButtons = self.oldshowHideEditButtons;
        //reapply changed DOM

        $("#KGquery_messageDiv").attr("id", "messageDiv");
        $("#KGquery_waitImg").attr("id", "waitImg");
        $("#graphDiv").empty();
        $("#lateralPanelDiv").empty();
    };

    self.init = function () {
        KGquery_graph.drawVisjsModel("saved");
        //SavedQueriesWidget.list();
        SavedQueriesWidget.showDialog("tabs_myQueries",self.currentSource,KGquery_myQueries.save, KGquery_myQueries.load);
        
    };

    self.initOutputType = function () {
        const KGquery_outputTypeSelectNode = $("#KGquery_outputTypeSelect");
        for (const toolName in Config.userTools.KGquery.toTools) {
            KGquery_outputTypeSelectNode.append(`<option>${toolName}</option>`);
        }
    };

    self.loadSource = function () {
        KGquery.currentSource = MainController.currentSource;
        Lineage_sources.loadSources(MainController.currentSource, function (err) {
            if (err) {
                return alert(err.responseText);
            }
            $("#graphDiv").load("./modules/tools/KGquery/html/KGquery_centralPanel.html", function () {
                $("#lateralPanelDiv").load("./modules/tools/KGquery/html/KGquery_leftPanel.html", function () {
                    UI.disableEditButtons();
                    KGquery_graph.drawVisjsModel("saved");
                    UI.openTab("lineage-tab", "tabs_Query", KGquery.initQuery, "#QueryTabButton");
                    UI.resetWindowHeight();
                    self.clearAll();
                    if (Config.clientCache.KGquery) {
                        setTimeout(function () {
                            KGquery_myQueries.load(null, Config.clientCache.KGquery);
                        }, 1000);
                    }
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
        // self.currentQuerySet = querySet;
        self.divsMap[querySetDivId] = querySet;
        return querySet;
    };

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
                    return alert(err.responseText);
                }

                self.addNodeToQueryElement(self.currentQueryElement, node, "fromNode");
                var nearestNode = self.classeMap[nearestNodeId];
                self.addNodeToQueryElement(self.currentQueryElement, nearestNode, "toNode");

                KGquery_paths.setQueryElementPath(self.currentQueryElement, function (err, result) {
                    if (err) {
                        return alert(err.responseText);
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
                    return alert(err.responseText);
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

    self.addEdge = function (edge, evt) {
        var fromNode = KGquery_graph.KGqueryGraph.data.nodes.get(edge.from);
        fromNode = JSON.parse(JSON.stringify(fromNode));

        var toNode = KGquery_graph.KGqueryGraph.data.nodes.get(edge.to);
        toNode = JSON.parse(JSON.stringify(toNode));
        if (edge.from == edge.to) {
            toNode = JSON.parse(JSON.stringify(fromNode));

            if (edge.data.propertyId == "rdfs:member") {
                fromNode.alias = fromNode.label + "_parent";
                var options = { memberClass: fromNode.data.id };

                Containers_widget.showDialog(self.currentSource, options, function (err, result) {
                    //  KGquery_filter.selectContainerFilters(fromNode,function(err, result){
                    fromNode.data.containerFilter = {
                        classId: result ? result.topMember.id : null,
                        depth: result ? result.depth : 1,
                    };
                    KGquery.addEdgeNodes(fromNode, toNode, edge);
                });
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

    self.aggregateQuery = function () {
        var message = "";
        if (self.querySets.sets.length > 0) {
            message = "<font color='blue'>aggregate works only with variables belonging to the same set !</font>";
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

        IndividualAggregateWidget.showDialog(
            null,
            function (callback) {
                callback(varsMap);
            },

            function (err, aggregateClauses) {
                self.queryKG("table", { aggregate: aggregateClauses });
            },
            message,
        );
    };

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

        self.execPathQuery(options, function (err, result) {
            self.message("", true);
            if (err) {
                if (err.responseText) {
                    return alert(err.responseText);
                }
            }

            if (result.results) {
                if (result.results.bindings.length == 0) return alert("no result");
                self.message("found items :" + result.results.bindings.length);
            }
            /*
            KGquery_myQueries.save(function (err, query) {
                Config.clientCache.KGquery = query;
            });
            */
            if (output == "table") {
                self.queryResultToTable(result);
            } else if (output == "Graph") {
                self.queryResultToVisjsGraph(result);
            } else if (output == "shacl") {
                //  KGconstraints_validator.process(result);
            } else {
                Config.userTools.KGquery.toTools[output](result);
            }
        });
    };

    self.execPathQuery = function (options, callback) {
        var optionalPredicatesSparql = "";
        var containerFiltersSparql = "";
        var query = "";
        var data;
        async.series(
            [
                //selectOptionalPredicates
                function (callbackSeries) {
                    if (options.aggregate) {
                        return callbackSeries();
                    }
                    if(KGquery_myQueries.currentOptionalPredicatesSparql){
                        optionalPredicatesSparql = KGquery_myQueries.currentOptionalPredicatesSparql;
                        KGquery_myQueries.currentOptionalPredicatesSparql = null;
                        return callbackSeries();
                    }

                    KGquery_filter.selectOptionalPredicates(self.querySets, options, function (err, result) {
                        if (err) {
                            UI.message(err, true);
                            callbackSeries(err);
                        }
                        optionalPredicatesSparql = result;
                        KGquery.currentOptionalPredicatesSparql = optionalPredicatesSparql;
                        callbackSeries();
                    });
                },

                //build query
                function (callbackSeries) {
                    if (!options) {
                        options = {};
                    }

                    var distinctTypesMap = {};
                    var uniqueBasicPredicatesMap = {};

                    var selectStr = "distinct *";
                    var groupByStr = "";
                    if (options.aggregate) {
                        selectStr = options.aggregate.select;
                        groupByStr = " GROUP BY " + options.aggregate.groupBy;
                    }

                    var whereStr = "";
                    var uniqueQueries = {};

                    self.querySets.sets.forEach(function (querySet) {
                        if (querySet.elements.length == 0 || !querySet.elements[0].fromNode) {
                            return;
                        }
                        if (querySet.booleanOperator) {
                            whereStr += "\n " + querySet.booleanOperator + "\n ";
                        }

                        var predicateStr = "";
                        var filterStr = "";
                        var otherPredicatesStrs = "";

                        querySet.elements.forEach(function (queryElement, queryElementIndex) {
                            if (!queryElement.toNode) {
                                return;
                                if (queryElement.fromNode) {
                                } else {
                                }
                            }

                            var subjectVarName = self.getVarName(queryElement.fromNode);

                            var subjectUri = queryElement.fromNode.id;
                            if (!distinctTypesMap[subjectVarName]) {
                                distinctTypesMap[subjectVarName] = 1;
                                filterStr += " " + subjectVarName + "  rdf:type <" + subjectUri + ">. ";
                            }
                            var subjectUri = queryElement.fromNode.id;

                            if (queryElement.toNode) {
                                var objectVarName = self.getVarName(queryElement.toNode);
                                var objectUri = queryElement.toNode.id;
                                if (!distinctTypesMap[objectVarName]) {
                                    distinctTypesMap[objectVarName] = 1;
                                    filterStr += " " + objectVarName + "  rdf:type <" + objectUri + ">.";
                                }
                            }
                            var filterClassLabels = {};
                            queryElement.paths.forEach(function (pathItem, pathIndex) {
                                var propertyStr = pathItem[2];

                                if (propertyStr == "rdfs:member") {
                                    if (!queryElement.fromNode.data.containerFilter) {
                                        return;
                                    }
                                    if (queryElement.fromNode.data.containerFilter.classId) {
                                        filterStr += "\n FILTER(" + subjectVarName + "=<" + queryElement.fromNode.data.containerFilter.classId + ">)\n ";
                                    }
                                    var depth = queryElement.fromNode.data.containerFilter.depth || 1;
                                    {
                                        if (depth) {
                                            var str = "";
                                            var number = parseInt(depth);
                                            propertyStr = " rdfs:member{0," + number + "} ";
                                            otherPredicatesStrs += " FILTER (" + pathItem[0] + " !=" + pathItem[1] + ") ";
                                        } else {
                                        }
                                    }
                                } else {
                                    propertyStr = "<" + propertyStr + "> ";
                                }

                                var startVarName;
                                var endVarName;
                                var inverseStr = "";
                                if (pathItem.length == 4) {
                                    startVarName = pathItem[1]; //self.getVarName({ id: pathItem[1] });
                                    endVarName = pathItem[0]; //self.getVarName({ id: pathItem[0] });
                                    inverseStr = "^";
                                } else {
                                    startVarName = pathItem[0]; //; self.getVarName({ id: pathItem[0] });
                                    endVarName = pathItem[1]; // self.getVarName({ id: pathItem[1] });
                                }

                                var basicPredicate = startVarName + " " + inverseStr + propertyStr + endVarName + ".\n";
                                if (!uniqueBasicPredicatesMap[basicPredicate]) {
                                    uniqueBasicPredicatesMap[basicPredicate] = 1;
                                    predicateStr += basicPredicate;
                                }
                            });
                        });

                        for (var key in querySet.classFiltersMap) {
                            filterStr += querySet.classFiltersMap[key].filter + " \n";
                        }

                        if (options.aggregate) {
                            whereStr += options.aggregate.where;
                            var groupByPredicates = options.aggregate.groupByPredicates;
                            otherPredicatesStrs += " \n" + KGquery_filter.getAggregatePredicates(groupByPredicates);

                            filterStr += KGquery_filter.getAggregateFilterOptionalPredicates(querySet, filterStr);
                        } else {
                        }

                        whereStr += predicateStr + "\n" + "" + "\n" + filterStr + "\n" + otherPredicatesStrs;
                        if (optionalPredicatesSparql) {
                            if (!predicateStr) {
                                // if only optional predicate make first predicate not optional (when only one class ...)
                                optionalPredicatesSparql = `?${querySet.elements[0].fromNode.label} rdf:type <${querySet.elements[0].fromNode.id}>.\n` + optionalPredicatesSparql;
                                optionalPredicatesSparql = optionalPredicatesSparql.replace("OPTIONAL", "");
                            }

                            whereStr += optionalPredicatesSparql;
                        }
                        //  whereStr = "{" + whereStr + "}";
                    });

                    var fromStr = Sparql_common.getFromStr(self.currentSource);
                    query =
                        "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
                        "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                        "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>";

                    var queryType = "SELECT";
                    if (options.output == "shacl") {
                        queryType = "CONSTRUCT";
                        selectStr = "";
                    }
                    query += queryType + " " + selectStr + "  " + fromStr + " where {" + whereStr + "}";

                    query += " " + groupByStr + " limit 10000";

                    callbackSeries();
                },

                //execute query
                function (callbackSeries) {
                    //var url = Config.sources[self.currentSource].sparql_server.url + "?format=text&query=";

                    //url="http://51.178.139.80:8890/sparql?format=text/Turtle&query="
                    var url = Config.sources[self.currentSource].sparql_server.url + "?format=json&query=";
                    if (options.output == "shacl") {
                        url = "http://51.178.139.80:8890/sparql?format=text/Turtle&query=";
                    }
                    self.currentSparqlQuery = {
                        url: url,
                        query: query,
                        source: self.currentSource,
                    };
                    // query = Sparql_common.setPrefixesInSelectQuery(query);
                    
                    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: self.currentSource, caller: "getObjectRestrictions" }, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        data = result;
                        callbackSeries(null, result);
                    });
                },
                function (callbackSeries) {
                    callbackSeries();
                },
            ],
            function (err) {
                callback(err, data);
            },
        );
    };

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
            visjsData.nodes.push(VisjsUtil.getVisjsNode(self.currentSource, lineNodeId, "", null, { shape: "text", size: 2, color: "#ddd" }));

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

        Export.showDataTable("KGquery_dataTableDialogDiv", tableCols, tableData, null, { paging: true }, function (err, datatable) {
            $("#dataTableDivExport").on("click", "td", function () {
                var table = $("#dataTableDivExport").DataTable();

                var index = table.cell(this).index();
                var row = table.row(this).data();
                var column = table.cell(this).column().data();
                var data = table.cell(this).data();

                var datasetIndex = column[index.row];
                var dataItem = self.currentData[datasetIndex];
                var varName = self.tableCols[index.column].title;
                if (true || !dataItem[varName]) {
                    varName = KGquery.currentSelectedPredicates.filter((key) => key.id == varName)[0].data.varName;
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
            $("#KGquery_SetsControlsDiv").hide();
        }
    };

    self.getVarName = function (node, withoutQuestionMark) {
        var varName = (withoutQuestionMark ? "" : "?") + Sparql_common.formatStringForTriple(node.alias || node.label || Sparql_common.getLabelFromURI(node.id), true);

        return varName;
    };

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

    self.message = function (message, stopWaitImg) {
        $("#KGquery_messageDiv").html(message);
        if (stopWaitImg) {
            $("#KGquery_waitImg").css("display", "none");
        } else {
            $("#KGquery_waitImg").css("display", "block");
        }
    };

    self.switchRightPanel = function (forceGraph) {
        return;
        var isGraphDisplayed = $("#KGquery_graphDiv").css("display");
        if (!forceGraph && isGraphDisplayed == "block") {
            $("#KGquery_graphDiv").css("display", "none");
        } else {
            $("#KGquery_graphDiv").css("display", "block");
        }
    };

    self.onBooleanOperatorChange = function (querySetDivId, value) {
        self.divsMap[querySetDivId].booleanOperator = value;
    };

    self.removeQueryElement = function (queryElementDivId) {
        $("#" + queryElementDivId).remove();
        var queryElement = self.divsMap[queryElementDivId];
        self.querySets.sets[queryElement.setIndex].elements.splice(queryElement.index, 1);
    };

    self.removeSet = function (querySetDivId) {
        $("#" + querySetDivId).remove();
        var set = self.divsMap[querySetDivId];
        self.querySets.sets.splice(set.index, 1);
    };

    self.onOutputTypeSelect = function (output) {
        if (output == "") {
            return;
        }
        self.queryKG(output);
        $("#KGquery_outputTypeSelect").val("");
    };

    self.addOutputType = function () {
        $("KGquery_outputTypeSelect");
    };
    self.initMyQuery = function () {
        //SavedQueriesWidget.list();
        SavedQueriesWidget.showDialog("tabs_myQueries",self.currentSource,KGquery_myQueries.save, KGquery_myQueries.load);
        
    };
    self.initQuery = function () {
        if ($("#tabs_Query").children().length == 0) {
            $("#tabs_Query").load("./modules/tools/KGquery/html/KGqueryQueryTab.html", function () {
                //  KGquery.addQuerySet();
            });
        }
    };
    self.initGraph = function () {
        if ($("#tabs_Graph").children().length == 0) {
            $("#tabs_Graph").load("./modules/tools/KGquery/html/KGqueryGraphTab.html", function () {
                KGquery_graph.init();
                //  KGquery_graph.drawVisjsModel("saved");
            });
        }
    };

    self.checkRequirements = function () {
        KGquery.queryKG("shacl");
    };

    return self;
})();

export default KGquery;
window.KGquery = KGquery;
