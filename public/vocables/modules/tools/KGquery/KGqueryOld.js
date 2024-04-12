import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import Lineage_sources from "../lineage/lineage_sources.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Lineage_relationIndividualsFilter from "../lineage/lineage_relationIndividualsFilter.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import PopupMenuWidget from "../../uiWidgets/popupMenuWidget.js";
import Export from "../../shared/export.js";
import common from "../../shared/common.js";
import Lineage_whiteboard from "../lineage/lineage_whiteboard.js";
import IndividualAggregateWidget from "../../uiWidgets/individualAggregateWidget.js";
import IndividualValueFilterWidget from "../../uiWidgets/individualValuefilterWidget.js";
import SimpleListSelectorWidget from "../../uiWidgets/simpleListSelectorWidget.js";
import SourceSelectorWidget from "../../uiWidgets/sourceSelectorWidget.js";
import MainController from "../../shared/mainController.js";
import KGquery_graph from "./KGquery_graph.js";
import SavedQueriesWidget from "../../uiWidgets/savedQueriesWidget.js";
import KGquery_myQueries from "./KGquery_myQueries.js";
import SQLquery_filters from "./SQLquery_filters.js";

var KGquery = (function () {
    var self = {};
    self.querySets = { sets: [], groups: [], currentIndex: -1 };

    self.vicinityArray = [];

    self.classDivsMap = {};
    self.classeMap = {};
    self.pathDivsMap = {};
    self.allPathEdges = {};
    self.isLoaded = false;
    self.pathEdgesColors = ["green", "blue", "orange", "grey", "yellow"];

    self.onLoaded = function () {
        $("#actionDivContolPanelDiv").load("modules/tools/KGquery/html/KGquery_leftPanel.html", function () {
            KGquery_graph.init();
        });
        $("#graphDiv").load("modules/tools/KGquery/html/KGquery_centralPanel.html", function () {
            self.currentSource = Lineage_sources.activeSource;
            self.showSourcesDialog();
        });
    };

    self.init = function () {
        KGquery_graph.drawVisjsModel("saved");
        SavedQueriesWidget.showDialog("STORED_KGQUERY_QUERIES", "KGquery_myQueriesDiv", self.currentSource, null, KGquery_myQueries.save, KGquery_myQueries.load);
    };

    self.showSourcesDialog = function (forceDialog) {
        if (!forceDialog && Config.userTools["KGquery"].urlParam_source) {
            self.currentSource = Config.userTools["KGquery"].urlParam_source;
            self.init();
            return;
        }

        var options = {
            includeSourcesWithoutSearchIndex: true,
            withCheckboxes: false,
        };
        var selectTreeNodeFn = function (event, obj) {
            $("#mainDialogDiv").dialog("close");
            self.currentSource = obj.node.id;
            self.init();
        };
        //MainController.UI.showHideRightPanel("hide");
        SourceSelectorWidget.initWidget(["OWL"], "mainDialogDiv", true, selectTreeNodeFn, null, options);
    };

    self.addQuerySet = function (booleanOperator) {
        self.switchRightPanel();
        var pathItem = []; //array of 3 items: formNode, toNode,Property,(inverse 1)
        var color = self.pathEdgesColors[self.querySets.sets.length];
        var querySet = { elements: [], color: color, booleanOperator: booleanOperator, classFiltersMap: {} }; // array of queryElements with a color and a currentIndex
        self.addQueryElementToQuerySet(querySet);
        self.querySets.sets.push(querySet);
        self.querySets.currentIndex = self.querySets.sets.length - 1;

        var booleanOperatorHtml = "";
        if (booleanOperator) {
            var unionStr = booleanOperator == "Union" ? "selected=selected" : "";
            var minusStr = booleanOperator == "Minus" ? "selected=selected" : "";
            booleanOperatorHtml =
                "<div style='  font-weight: bold;color: brown; '>" +
                " <select  onchange='KGquery.onBooleanOperatorChange(" +
                self.querySets.currentIndex +
                ",$(this).val())'> " +
                "<option " +
                unionStr +
                ">Union</option>" +
                "<option " +
                minusStr +
                ">Minus</option>" +
                "</select>" +
                "</div>";

            //  self.clearAll(true);
        }
        var setHtml =
            "<div id='KGquery_setDiv_" +
            self.querySets.currentIndex +
            "' class='KGquery_setDiv' style='color:" +
            color +
            ";border-color:" +
            color +
            "'>" +
            booleanOperatorHtml +
            "Set " +
            (self.querySets.currentIndex + 1);
        if (self.querySets.currentIndex > 0) {
            setHtml += "&nbsp;<button class='btn btn-sm my-1 py-0 btn-outline-primary KGquery_smallButton' onclick='KGquery.removeSet( " + self.querySets.currentIndex + ")' >X</button>";
        }
        // "<button onclick='' >save</button>" +
        setHtml += "</div>";

        $("#KGquery_pathsDiv").append(setHtml);
        $("#KGquery_setDiv_" + self.querySets.currentIndex).bind("click", function () {
            var id = $(this).attr("id");
            var index = parseInt(id.replace("KGquery_setDiv_", ""));
            self.querySets.currentIndex = index;
        });
    };

    self.addQueryElementToQuerySet = function (querySet) {
        var queryElement = {
            fromNode: "",
            toNode: "",
            paths: [], //array of pathItems between from and toNode
            queryElementDivId: "",
            fromNodeDivId: "",
            toNodeDivId: "",
        };
        querySet.elements.push(queryElement);
        return queryElement;
    };

    self.addNode = function (node, nodeEvent) {
        if (!node) {
            return;
        }
        self.currentGraphNode = node;
        var html = "";

        function getClassNodeDivHtml(node, nodeDivId) {
            var html =
                "<div  class='KGquery_pathNodeDiv' id='" +
                nodeDivId +
                "'>" +
                "<span style='font:bold 14px'>" +
                self.getVarName(node, true) +
                "" +
                "<button class='KGquery_divActions btn btn-sm my-1 py-0 btn-outline-primary' about='add filter' onclick='KGquery.addNodeFilter(\"" +
                nodeDivId +
                "\");'>F</button>";

            html += "<div style='font-size: 10px;' id='" + nodeDivId + "_filter'></div> " + "</div>" + "</div>";
            return html;
        }

        function getQueryElementHtml(setIndex, queryElementDivId, elementIndex) {
            var html =
                "<div  class='KGquery_pathDiv'  style='border:solid 2px " +
                color +
                "' id='" +
                queryElementDivId +
                "'>" +
                "&nbsp;<button class='btn btn-sm my-1 py-0 btn-outline-primary KGquery_smallButton' onclick='KGquery.removeQueryElement( " +
                setIndex +
                ", " +
                elementIndex +
                ") '>X</button>" +
                "" +
                "</div>";
            return html;
        }

        /**
     add a new queryElement if formNode and toNodes are registered
     if a path exist the new node has to be the target (to) Node of a new path and the from node should be the nearest node among the previous paths nodes
     */
        var currentQuerySet = self.querySets.sets[self.querySets.currentIndex];
        var currentQueryElement = currentQuerySet.elements[currentQuerySet.elements.length - 1];
        self.currentGraphNode.setIndex = self.querySets.currentIndex;
        var color = currentQuerySet.color;

        // re init query element if clik on previous node unless ctrlKey
        /*  if (currentQueryElement.fromNode && currentQueryElement.fromNode.id == node.id && !event.ctrlKey) {
      currentQueryElement.fromNode = null;
      currentQueryElement.toNode = null;
      return;
    }*/
        if (currentQueryElement.fromNode && currentQueryElement.toNode) {
            self.getNearestNode(self.currentGraphNode.id, currentQuerySet, function (err, nodeId) {
                // var queryElementDivId = "queryElementDiv_" + common.getRandomHexaId(3);

                var newQueryElement = self.addQueryElementToQuerySet(currentQuerySet);
                var elementIndex = currentQuerySet.elements.length;
                var queryElementDivId = "queryElementDiv_" + self.querySets.currentIndex + "_" + elementIndex;
                newQueryElement.fromNode = { id: nodeId };

                newQueryElement.queryElementDivId = queryElementDivId;
                var nodeDivId = "nodeDiv_" + common.getRandomHexaId(3);

                newQueryElement.fromNodeDivId = nodeDivId;
                self.classDivsMap[nodeDivId] = self.currentGraphNode;

                $("#KGquery_setDiv_" + self.querySets.currentIndex).append(getQueryElementHtml(self.querySets.currentIndex, queryElementDivId, elementIndex));

                var fromNode = self.classeMap[nodeId];
                $("#" + newQueryElement.queryElementDivId).append(getClassNodeDivHtml(fromNode, nodeDivId));
                currentQueryElement = newQueryElement;
                self.addNode(self.currentGraphNode, nodeEvent);
            });

            return;
        } else if (!currentQueryElement.fromNode) {
            self.classeMap[self.currentGraphNode.id] = self.currentGraphNode;
            var elementIndex = currentQuerySet.elements.length;
            var queryElementDivId = "queryElementDiv_" + self.querySets.currentIndex + "_" + elementIndex;
            var nodeDivId = "nodeDiv_" + common.getRandomHexaId(3);

            currentQueryElement.fromNode = self.currentGraphNode;
            currentQueryElement.queryElementDivId = queryElementDivId;
            currentQueryElement.fromNodeDivId = nodeDivId;
            self.classDivsMap[nodeDivId] = self.currentGraphNode;
            if (nodeEvent && nodeEvent.ctrlKey) {
                currentQueryElement.fromNode.newInstance = common.getRandomHexaId(3);
            }

            $("#KGquery_setDiv_" + self.querySets.currentIndex).append(getQueryElementHtml(self.querySets.currentIndex, queryElementDivId, elementIndex));
            $("#" + currentQueryElement.queryElementDivId).append(getClassNodeDivHtml(self.currentGraphNode, nodeDivId));
        }

        // set register query path
        else if (!currentQueryElement.toNode) {
            self.classeMap[self.currentGraphNode.id] = self.currentGraphNode;
            currentQueryElement.toNode = self.currentGraphNode;
            if (nodeEvent && nodeEvent.ctrlKey) {
                currentQueryElement.toNode.newInstance = common.getRandomHexaId(3);
            }

            self.getPathBetweenNodes(currentQueryElement.fromNode.id, currentQueryElement.toNode.id, function (err, path) {
                if (err) {
                    return alert(err.responseText);
                }

                self.managePathAmbiguousEdges(path, function (unAmbiguousPath) {
                    //register queryPath in pathDivsMap

                    var cleanedPath = self.processPathDuplicateClassIds(unAmbiguousPath, currentQueryElement);

                    currentQueryElement.paths = cleanedPath;
                    self.pathDivsMap[queryElementDivId] = currentQueryElement;

                    //add toNode to control panel
                    var nodeDivId = "nodeDiv_" + common.getRandomHexaId(3);
                    self.classDivsMap[nodeDivId] = self.currentGraphNode;
                    $("#" + currentQueryElement.queryElementDivId).append(getClassNodeDivHtml(self.currentGraphNode, nodeDivId));

                    //update of graph edges color
                    var newVisjsEdges = [];
                    path.forEach(function (pathItem, index) {
                        var edgeId;
                        if (true || pathItem.length == 3) {
                            edgeId = pathItem[0] + "_" + pathItem[2] + "_" + pathItem[1];
                        } else {
                            edgeId = pathItem[1] + "_" + pathItem[2] + "_" + pathItem[0];
                        }

                        newVisjsEdges.push({ id: edgeId, color: color, width: 3 });
                        KGquery_graph.outlineNode(pathItem[0]);
                        KGquery_graph.outlineNode(pathItem[1]);
                    });

                    KGquery_graph.KGqueryGraph.data.edges.update(newVisjsEdges);

                    $("#KGquery_SetsControlsDiv").css("display", "flex");

                    if (nodeEvent && nodeEvent.shiftKey) {
                        self.addNodeFilter(nodeDivId);
                    }
                });
            });
        }

        KGquery_graph.outlineNode(self.currentGraphNode.id);

        if (nodeEvent && nodeEvent.shiftKey) {
            self.addNodeFilter(nodeDivId);
        }
    };

    self.managePathAmbiguousEdges = function (path, callback) {
        var fromToMap = {};
        path.forEach(function (pathItem, pathIndex) {
            var fromTo = [pathItem[0] + "_" + pathItem[1]];
            if (!fromToMap[fromTo]) {
                fromToMap[fromTo] = [];
            }
            fromToMap[fromTo].push(pathItem[2]);
        });
        var ambiguousEdges = null;
        for (var key in fromToMap) {
            if (fromToMap[key].length > 1) {
                ambiguousEdges = { id: key, properties: fromToMap[key] };
            }
        }

        if (ambiguousEdges && ambiguousEdges.properties.length > 0) {
            return SimpleListSelectorWidget.showDialog(
                null,
                function (callbackLoad) {
                    return callbackLoad(ambiguousEdges.properties);
                },
                function (selectedProperty) {
                    ambiguousEdges.selectedProperty = selectedProperty;

                    var pathsToDelete = [];
                    path.forEach(function (pathItem, pathIndex) {
                        if (ambiguousEdges.id == [pathItem[0] + "_" + pathItem[1]] || ambiguousEdges.id == [pathItem[1] + "_" + pathItem[0]]) {
                            if (pathItem[2] != ambiguousEdges.selectedProperty) {
                                pathsToDelete.push(pathIndex);
                            }
                        }
                    });
                    var unambiguousPaths = [];
                    path.forEach(function (pathItem, pathIndex) {
                        if (pathsToDelete.indexOf(pathIndex) < 0) {
                            unambiguousPaths.push(pathItem);
                        }
                    });
                    return callback(unambiguousPaths);
                }
            );
        } else {
            return callback(path);
        }
    };

    self.processPathDuplicateClassIds = function (path, currentQueryElement) {
        //manage multiple instance or sameClass
        path.forEach(function (pathItem, index) {
            for (var i = 0; i < 2; i++) {
                if (pathItem[i] == currentQueryElement.fromNode.id && currentQueryElement.fromNode.newInstance) {
                    path[index][i] = pathItem[i] + "_" + currentQueryElement.fromNode.newInstance;
                }
                if (pathItem[i] == currentQueryElement.toNode.id && currentQueryElement.toNode.newInstance) {
                    path[index][i] = pathItem[i] + "_" + currentQueryElement.toNode.newInstance;
                }
            }
        });
        return path;
    };

    /**
   *
   * remove path element is this path allready exists in the query
   *

   * @returns {{}}
   */
    self.removeRedondantPredicates = function (pathItem) {
        var nonRedondantPaths = [];
        var ok = true;
        pathItem.forEach(function (singlePath) {
            if (self.allPathEdges[singlePath[0] + "_" + singlePath[1] + "_" + singlePath[2]]) {
                ok = false;
            } else if (self.allPathEdges[singlePath[1] + "_" + singlePath[0] + "_" + singlePath[2]]) {
                ok = false;
            } else {
                self.allPathEdges[singlePath[0] + "_" + singlePath[1] + "_" + singlePath[2]] = 1;
                self.allPathEdges[singlePath[1] + "_" + singlePath[0] + "_" + singlePath[2]] = 1;
                ok = true;
                nonRedondantPaths.push(singlePath);
            }
        });
        return nonRedondantPaths;
    };

    self.addNodeFilter = function (classDivId) {
        var aClass = self.classDivsMap[classDivId];
        var classSetIndex = aClass.setIndex;
        if (self.querySets.sets[classSetIndex].classFiltersMap[aClass.id]) {
            delete self.querySets.sets[classSetIndex].classFiltersMap[aClass.id];
            $("#" + classDivId + "_filter").html("");
            return;
        }
        var varName = [self.getVarName(aClass, true)];
        var datatype = aClass.data.datatype;

        IndividualValueFilterWidget.showDialog(null, self.currentSource, varName, aClass.id, datatype, function (err, filter) {
            if (err) {
                return alert(err);
            }
            if (!filter) {
                return;
            }
            self.querySets.sets[classSetIndex].classFiltersMap[aClass.id] = { class: aClass, filter: filter };
            $("#" + classDivId + "_filter").append(filter);
        });
    };

    self.aggregateQuery = function () {
        var message = "";
        if (self.querySets.sets.length > 0) {
            message = "<font color='blue'>aggregate works only with variables belonging to the same set !</font>";
        }
        IndividualAggregateWidget.showDialog(
            null,
            function (callback) {
                callback(self.classeMap);
            },

            function (err, aggregateClauses) {
                self.queryKG("table", { aggregate: aggregateClauses });
            },
            message
        );
    };

    self.queryKG = function (output, options, isVirtualSQLquery) {
        if (!options) {
            options = {};
        }
        /* if (!self.querySets.toNode) {
return alert("missing target node in  path");
}*/

        $("#KGquery_dataTableDiv").html("");
        self.message("searching...");
        $("#KGquery_waitImg").css("display", "block");

        $("#KGquery_graphDiv").css("display", "none");
        $("#KGquery_dataTableDiv").css("display", "block");

        if (isVirtualSQLquery) {
            return SQLquery_filters.showFiltersDialog(self.querySets, self.currentSource);
        }

        self.execPathQuery(options, function (err, result) {
            self.message("", true);
            if (err) {
                return alert(err.responseText);
            }

            if (result.results.bindings.length == 0) {
                return alert("no result");
            }

            self.message("found items :" + result.results.bindings.length);
            if (output == "table") {
                self.queryResultToTable(result);
            } else if (output == "vijsGraph") {
                self.queryResultToVisjsGraph(result);
            }
        });
    };

    self.execPathQuery = function (options, callback) {
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
            if (querySet.booleanOperator) {
                whereStr += "\n " + querySet.booleanOperator + "\n ";
            }

            var predicateStr = "";
            var filterStr = "";
            var optionalStrs = "";

            querySet.elements.forEach(function (queryElement, queryElementIndex) {
                var subjectVarName = self.getVarName(queryElement.fromNode);
                var subjectUri = queryElement.fromNode.id;
                if (!distinctTypesMap[subjectVarName]) {
                    distinctTypesMap[subjectVarName] = 1;
                    filterStr += " " + subjectVarName + "  rdf:type <" + subjectUri + ">. ";
                }

                var objectVarName = self.getVarName(queryElement.toNode);

                if (queryElement.fromNode.id == queryElement.toNode.id) {
                    objectVarName = objectVarName + "_2";
                }

                var objectUri = queryElement.toNode.id;
                var subjectUri = queryElement.fromNode.id;
                if (!distinctTypesMap[objectVarName]) {
                    distinctTypesMap[objectVarName] = 1;

                    filterStr += " " + objectVarName + "  rdf:type <" + objectUri + ">.";
                }

                var transitionPredicate = "";

                queryElement.paths.forEach(function (pathItem, pathIndex) {
                    var startVarName;
                    var endVarName;
                    var inverseStr = "";
                    if (pathItem.length == 4) {
                        startVarName = self.getVarName({ id: pathItem[1] });
                        endVarName = self.getVarName({ id: pathItem[0] });

                        if (queryElement.fromNode.id == queryElement.toNode.id) {
                            endVarName = endVarName + "_2";
                        }

                        inverseStr = "^";
                    } else {
                        startVarName = self.getVarName({ id: pathItem[0] });
                        endVarName = self.getVarName({ id: pathItem[1] });

                        if (queryElement.fromNode.id == queryElement.toNode.id) {
                            endVarName = endVarName + "_2";
                        }
                    }

                    var basicPredicate = startVarName + " " + inverseStr + "<" + pathItem[2] + "> " + endVarName + ".\n";
                    if (!uniqueBasicPredicatesMap[basicPredicate]) {
                        uniqueBasicPredicatesMap[basicPredicate] = 1;
                        predicateStr += basicPredicate;
                    }
                });

                for (var key in querySet.classFiltersMap) {
                    filterStr += querySet.classFiltersMap[key].filter + " \n";
                }

                function addToStringIfNotExists(str, text) {
                    if (text.indexOf(str) > -1) {
                        return text;
                    } else {
                        return text + str;
                    }
                }

                var optionalStr = "";
                optionalStr = addToStringIfNotExists(" OPTIONAL {" + subjectVarName + " owl:hasValue " + subjectVarName + "Value}\n", optionalStr);
                optionalStr = addToStringIfNotExists(" OPTIONAL {" + objectVarName + " owl:hasValue " + objectVarName + "Value}\n", optionalStr);
                optionalStr = addToStringIfNotExists(" OPTIONAL {" + subjectVarName + " rdfs:label " + subjectVarName + "Label}\n", optionalStr);
                optionalStr = addToStringIfNotExists(" OPTIONAL {" + objectVarName + " rdfs:label " + objectVarName + "Label}\n", optionalStr);
                optionalStrs += " \n" + optionalStr;
            });

            whereStr += "{" + predicateStr + "\n" + "" + "\n" + filterStr + "\n" + optionalStrs + "}";
        });

        var fromStr = Sparql_common.getFromStr(self.currentSource);
        var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#>" + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" + "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>";

        query += " Select " + selectStr + "  " + fromStr + " where {" + whereStr + "}";

        query += " " + groupByStr + " limit 10000";

        var url = Config.sources[self.currentSource].sparql_server.url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: self.currentSource, caller: "getObjectRestrictions" }, function (err, result) {
            if (err) {
                return callback(err);
            }

            callback(null, result);
        });
    };

    self.visjsNodeOptions = {
        shape: "box", //Lineage_whiteboard.defaultShape,
        //  size: Lineage_whiteboard.defaultShapeSize,
        color: "#ddd", //Lineage_whiteboard.getSourceColor(source)
    };

    self.getPathBetweenNodes = function (fromNodeId, toNodeId, callback) {
        var vicinityArray = self.vicinityArray;

        if (fromNodeId == toNodeId) {
            var pathes = [];
            vicinityArray.forEach(function (path) {
                if (path[0] == path[1] && path[1] == fromNodeId) {
                    pathes.push(path);
                }
            });

            return callback(null, pathes);
        }

        var body = {
            fromNodeUri: fromNodeId,
            toNodeUri: toNodeId,
            vicinityArray: vicinityArray,
        };

        var payload = {
            body: body,
        };

        $.ajax({
            type: "POST",
            url: `${Config.apiUrl}/shortestPath`,
            data: payload,
            dataType: "json",
            success: function (data, _textStatus, _jqXHR) {
                return callback(null, data);
            },
            error: function (err) {
                return callback(err);
            },
        });
    };

    self.getNearestNode = function (nodeId, querySet, callback) {
        var allCandidateNodesMap = {};

        querySet.elements.forEach(function (queryElement) {
            if (false) {
                // take all nodes in the path
                queryElement.paths.forEach(function (pathItem) {
                    allCandidateNodesMap[pathItem[0]] = 0;
                    allCandidateNodesMap[pathItem[1]] = 0;
                });
            } else {
                // only terminaisons of path
                allCandidateNodesMap[queryElement.fromNode.id] = 0;
                allCandidateNodesMap[queryElement.toNode.id] = 0;
            }
        });
        var allCandidateNodesArray = Object.keys(allCandidateNodesMap);
        async.eachSeries(
            allCandidateNodesArray,
            function (candidateNodeId, callbackEach) {
                self.getPathBetweenNodes(candidateNodeId, nodeId, function (err, path) {
                    if (err) {
                        return callbackEach(err);
                    }

                    allCandidateNodesMap[candidateNodeId] = path.length;
                    callbackEach();
                });
            },
            function (err) {
                if (err) {
                    return callback(err);
                }

                var minEdges = 100;
                var nearestNodeId = null;
                for (var key in allCandidateNodesMap)
                    if (allCandidateNodesMap[key] < minEdges) {
                        minEdges = allCandidateNodesMap[key];
                        nearestNodeId = key;
                    }
                callback(null, nearestNodeId);
            }
        );
    };

    self.queryResultToVisjsGraph = function (result) {
        var classNodes = self.getAllQueryPathClasses();

        /*    var edgesModel={}
  self.querySets.sets.forEach(function (querySet) {
      querySet.elements.forEach(function (queryElement, queryElementIndex) {
          edgesModel[queryElement.fromNode+"_"+queryElement.toNode.id]= {  }
      })
  })*/

        var data = result.results.bindings;
        var visjsData = { nodes: [], edges: [] };
        var existingNodes = {};
        data.forEach(function (item, index) {
            var lineNodeId = common.getRandomHexaId(5);
            visjsData.nodes.push(VisjsUtil.getVisjsNode(self.currentSource, lineNodeId, "", null, { shape: "text", size: 2, color: "#ddd" }));

            classNodes.forEach(function (classNode) {
                var varNameKey = self.getVarName(classNode, true);
                var labelKey = varNameKey + "Label";

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

            $("#mainDialogDiv2").dialog("close");
            Lineage_whiteboard.drawNewGraph(visjsData, "graphDiv");
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
                line.push(item[col] ? item[col].value : null);
            });

            tableData.push(line);
        });

        Export.showDataTable("KGquery_dataTableDiv", tableCols, tableData, null, null, function (err, datatable) {
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
                    varName = varName.replace("Label", "").replace("Value", "");
                }
                var uri = dataItem[varName].value;
                var node = { data: { id: uri } };
                NodeInfosWidget.showNodeInfos(self.currentSource, node, "smallDialogDiv");
            });
        });
    };

    self.clearAll = function (exceptSetQueries) {
        self.querySets = { sets: [], groups: [], currentIndex: -1 };
        self.classDivsMap = {};

        self.pathDivsMap = {};
        self.allPathEdges = {};
        $("#KGquery_graphDiv").css("display", "flex");
        $("#KGquery_dataTableDiv").css("display", "none");
        if (!exceptSetQueries) {
            self.classeMap = {};
            self.SetQueries = [];
            self.queryPathesMap = {};
            KGquery_graph.resetVisjNodes();
            KGquery_graph.resetVisjEdges();
            //   KGquery_graph.drawVisjsModel("saved")
            $("#KGquery_pathsDiv").html("");
            self.addQuerySet();
            $("#KGquery_SetsControlsDiv").css("display", "none");
        }
    };

    self.getVarName = function (node, withoutQuestionMark) {
        var varName = (withoutQuestionMark ? "" : "?") + Sparql_common.formatStringForTriple(node.label || Sparql_common.getLabelFromURI(node.id), true);
        if (node.newInstance) {
            varName += "_" + node.newInstance;
        }
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
        var isGraphDisplayed = $("#KGquery_graphDiv").css("display");
        if (!forceGraph && isGraphDisplayed == "block") {
            $("#KGquery_graphDiv").css("display", "none");
            $("#KGquery_dataTableDiv").css("display", "block");
        } else {
            $("#KGquery_graphDiv").css("display", "block");
            $("#KGquery_dataTableDiv").css("display", "none");
        }
    };

    self.onBooleanOperatorChange = function (querySetIndex, value) {
        self.querySets.sets[querySetIndex].booleanOperator = value;
    };

    self.removeQueryElement = function (setIndex, elementIndex) {
        $("#queryElementDiv_" + setIndex + "_" + elementIndex).remove();
        self.querySets.sets[setIndex].elements.splice(elementIndex, 1);
    };
    self.removeSet = function (setIndex) {
        $("#KGquery_setDiv_" + setIndex).remove();
        self.querySets.sets.splice(setIndex, 1);
        self.querySets.currentIndex = self.querySets.sets.length;
    };

    return self;
})();

export default KGquery;
window.KGquery = KGquery;
