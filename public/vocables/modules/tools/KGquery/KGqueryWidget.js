import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import Lineage_sources from "../../tools/lineage/lineage_sources.js";
import OntologyModels from "../../shared/ontologyModels.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Lineage_relationIndividualsFilter from "../../tools/lineage/lineage_relationIndividualsFilter.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import PopupMenuWidget from "../../uiWidgets/popupMenuWidget.js";
import Export from "../../shared/export.js";
import common from "../../shared/common.js";
import Lineage_whiteboard from "../../tools/lineage/lineage_whiteboard.js";
import IndividualAggregateWidget from "../../uiWidgets/individualAggregateWidget.js";
import IndividualValueFilterWidget from "../../uiWidgets/individualValuefilterWidget.js";
import SimpleListSelectorWidget from "../../uiWidgets/simpleListSelectorWidget.js";
import TimeLineWidget from "./timeLineWidget.js";
import VirtualKGquery from "../KGquery/virtualKGquery.js";

var KGqueryWidget = (function () {
    var self = {};
    self.querySets = { sets: [], groups: [], currentIndex: -1 };

    self.vicinityArray = [];

    self.classDivsMap = {};
    self.classeMap = {};
    self.pathDivsMap = {};
    self.allPathEdges = {};
    self.isLoaded = false;
    self.pathEdgesColors = ["green", "blue", "orange", "grey", "yellow"];

    self.showDialog = function () {
        $("#mainDialogDiv2").dialog("open");
        $("#mainDialogDiv2").dialog("option", "title", "Query");
        if (true || !self.isLoaded) {
            $("#mainDialogDiv2").load("snippets/KGqueryWidget.html", function () {
                self.source = Lineage_sources.activeSource;
                self.drawVisjsModel();
                self.isLoaded = true;
            });
        }
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
                " <select  onchange='KGqueryWidget.onBooleanOperatorChange(" +
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
            "<div id='KGqueryWidget_setDiv_" +
            self.querySets.currentIndex +
            "' class='KGqueryWidget_setDiv' style='color:" +
            color +
            ";border-color:" +
            color +
            "'>" +
            booleanOperatorHtml +
            "Set " +
            (self.querySets.currentIndex + 1);
        if (self.querySets.currentIndex > 0) {
            setHtml += "&nbsp;<button class='btn btn-sm my-1 py-0 btn-outline-primary KGqueryWidget_smallButton' onclick='KGqueryWidget.removeSet( " + self.querySets.currentIndex + ")' >X</button>";
        }
        // "<button onclick='' >save</button>" +
        setHtml += "</div>";

        $("#KGqueryWidget_pathsDiv").append(setHtml);
        $("#KGqueryWidget_setDiv_" + self.querySets.currentIndex).bind("click", function () {
            var id = $(this).attr("id");
            var index = parseInt(id.replace("KGqueryWidget_setDiv_", ""));
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
        var html = "";
        if (!self.currentGraphNode) {
            return;
        }

        function getClassNodeDivHtml(node, nodeDivId) {
            var html =
                "<div  class='KGqueryWidget_pathNodeDiv' id='" +
                nodeDivId +
                "'>" +
                "<span style='font:bold 14px'>" +
                self.getVarName(node, true) +
                "" +
                "<button class='KGqueryWidget_divActions btn btn-sm my-1 py-0 btn-outline-primary' about='add filter' onclick='KGqueryWidget.addNodeFilter(\"" +
                nodeDivId +
                "\");'>F</button>";

            html += "<div style='font-size: 10px;' id='" + nodeDivId + "_filter'></div> " + "</div>" + "</div>";
            return html;
        }

        function getQueryElementHtml(setIndex, queryElementDivId, elementIndex) {
            var html =
                "<div  class='KGqueryWidget_pathDiv'  style='border:solid 2px " +
                color +
                "' id='" +
                queryElementDivId +
                "'>" +
                "&nbsp;<button class='btn btn-sm my-1 py-0 btn-outline-primary KGqueryWidget_smallButton' onclick='KGqueryWidget.removeQueryElement( " +
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

                $("#KGqueryWidget_setDiv_" + self.querySets.currentIndex).append(getQueryElementHtml(self.querySets.currentIndex, queryElementDivId, elementIndex));

                var fromNode = self.classeMap[nodeId];
                $("#" + newQueryElement.queryElementDivId).append(getClassNodeDivHtml(fromNode, nodeDivId));

                self.addNode();
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

            $("#KGqueryWidget_setDiv_" + self.querySets.currentIndex).append(getQueryElementHtml(self.querySets.currentIndex, queryElementDivId, elementIndex));
            $("#" + currentQueryElement.queryElementDivId).append(getClassNodeDivHtml(self.currentGraphNode, nodeDivId));
        }

        // set register query path
        else if (!currentQueryElement.toNode) {
            self.classeMap[self.currentGraphNode.id] = self.currentGraphNode;
            currentQueryElement.toNode = self.currentGraphNode;

            self.getPathBetweenNodes(currentQueryElement.fromNode.id, currentQueryElement.toNode.id, function (err, path) {
                if (err) {
                    return alert(err.responseText);
                }

                self.managePathAmbiguousEdges(path, function (unAmbiguousPath) {
                    //register queryPath in pathDivsMap
                    var cleanedPath = unAmbiguousPath;
                    currentQueryElement.paths = cleanedPath;
                    self.pathDivsMap[queryElementDivId] = currentQueryElement;

                    //add toNode to control panel
                    var nodeDivId = "nodeDiv_" + common.getRandomHexaId(3);
                    self.classDivsMap[nodeDivId] = self.currentGraphNode;
                    $("#" + currentQueryElement.queryElementDivId).append(getClassNodeDivHtml(self.currentGraphNode, nodeDivId));

                    //update of graph edges color
                    var newVisjsEdges = [];
                    path.forEach(function (pathItem, index) {
                        var edgeId = pathItem[0] + "_" + pathItem[2] + "_" + pathItem[1];

                        newVisjsEdges.push({ id: edgeId, color: color, width: 3 });
                    });

                    self.KGqueryGraph.data.edges.update(newVisjsEdges);

                    $("#KGqueryWidget_SetsControlsDiv").css("display", "flex");

                    if (nodeEvent && nodeEvent.ctrlKey) {
                        self.addNodeFilter(nodeDivId);
                    }
                });
            });
        }

        self.KGqueryGraph.data.nodes.update({ id: self.currentGraphNode.id, shape: "hexagon", size: 14, color: color });

        if (nodeEvent && nodeEvent.ctrlKey) {
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

        IndividualValueFilterWidget.showDialog(null, varName, aClass.id, datatype, function (err, filter) {
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

    self.queryKG = function (output, options) {
        if (!options) {
            options = {};
        }
        /* if (!self.querySets.toNode) {
return alert("missing target node in  path");
}*/

        $("#KGqueryWidget_dataTableDiv").html("");
        self.message("searching...");
        $("#KGqueryWidget_waitImg").css("display", "block");

        $("#KGqueryWidget_graphDiv").css("display", "none");
        $("#KGqueryWidget_dataTableDiv").css("display", "block");

        var isVirtualQuery = $("#KGqueryWidget_virtualQueryCBX").prop("checked");
        if (isVirtualQuery) {
            return VirtualKGquery.execPathQuery(self.querySets, self.source, "lifex_dalia_db", {}, function (err, result) {
                if (err) return alert(err);
            });
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
                        inverseStr = "^";
                    } else {
                        startVarName = self.getVarName({ id: pathItem[0] });
                        endVarName = self.getVarName({ id: pathItem[1] });
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

        var fromStr = Sparql_common.getFromStr(self.source);
        var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#>" + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" + "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>";

        query += " Select " + selectStr + "  " + fromStr + " where {" + whereStr + "}";

        query += " " + groupByStr + " limit 10000";

        var url = Config.sources[self.source].sparql_server.url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: self.source, caller: "getObjectRestrictions" }, function (err, result) {
            if (err) {
                return callback(err);
            }

            callback(null, result);
        });
    };

    self.visjsNodeOptions = {
        shape: "box", //Lineage_whiteboard.defaultShape,
        size: Lineage_whiteboard.defaultShapeSize,
        color: "#ddd", //Lineage_whiteboard.getSourceColor(source)
    };

    self.getPathBetweenNodes = function (fromNodeId, toNodeId, callback) {
        var vicinityArray = self.vicinityArray;

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

    self.getInferredModelVisjsData = function (source, callback) {
        if (!source) {
            source = self.source;
        }
        var inferredModel = [];
        var dataTypes = {};

        var visjsData = { nodes: [], edges: [] };

        async.series(
            [
                //get effective distinct ObjectProperties
                function (callbackSeries) {
                    OntologyModels.getInferredModel(source, {}, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        inferredModel = result;

                        if (inferredModel.length == 0) {
                            callbackSeries("no inferred model for source " + source);
                        } else {
                            callbackSeries();
                        }
                    });
                },

                function (callbackSeries) {
                    OntologyModels.getInferredClassValueDataTypes(source, {}, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }

                        result.forEach(function (item) {
                            dataTypes[item.class.value] = item.datatype.value;
                        });
                        callbackSeries();
                    });
                },

                function (callbackSeries) {
                    var existingNodes = {};

                    var source = self.source;
                    inferredModel.forEach(function (item) {
                        item.sClass = item.sClass || item.sparent;
                        item.oClass = item.oClass || item.oparent;

                        item.sClassLabel = item.sClassLabel || item.sparentLabel;
                        item.oClassLabel = item.oClassLabel || item.oparentLabel;

                        if (!existingNodes[item.sClass.value]) {
                            existingNodes[item.sClass.value] = 1;
                            self.visjsNodeOptions.color = common.getResourceColor("class", item.sClass.value, "palette");
                            var label = item.sClassLabel ? item.sClassLabel.value : Sparql_common.getLabelFromURI(item.sClass.value);
                            self.visjsNodeOptions.data = { datatype: dataTypes[item.sClass.value], source: source, id: item.sClass.value, label: label };

                            visjsData.nodes.push(VisjsUtil.getVisjsNode(source, item.sClass.value, label, null, self.visjsNodeOptions));
                        }
                        if (!existingNodes[item.oClass.value]) {
                            existingNodes[item.oClass.value] = 1;
                            var label = item.oClassLabel ? item.oClassLabel.value : Sparql_common.getLabelFromURI(item.oClass.value);
                            self.visjsNodeOptions.data = { datatype: dataTypes[item.oClass.value], id: item.oClass.value, label: label };
                            self.visjsNodeOptions.color = common.getResourceColor("class", item.oClass.value, "palette");
                            visjsData.nodes.push(VisjsUtil.getVisjsNode(source, item.oClass.value, label, null, self.visjsNodeOptions));
                        }
                        var edgeId = item.sClass.value + "_" + item.prop.value + "_" + item.oClass.value;
                        if (!existingNodes[edgeId]) {
                            existingNodes[edgeId] = 1;

                            visjsData.edges.push({
                                id: edgeId,
                                from: item.sClass.value,
                                to: item.oClass.value,
                                label: item.propLabel.value,
                                font: { color: Lineage_whiteboard.defaultPredicateEdgeColor },
                                data: {
                                    propertyId: item.prop.value,
                                    source: source,
                                    propertyLabel: item.propLabel.value,
                                },

                                arrows: {
                                    to: {
                                        enabled: true,
                                        type: "solid",
                                        scaleFactor: 0.5,
                                    },
                                },
                                // dashes: true,
                                color: Lineage_whiteboard.defaultPredicateEdgeColor,
                            });
                        }
                    });
                    return callbackSeries();
                },
            ],
            function (err) {
                if (err) {
                    return callback(err);
                }

                return callback(null, visjsData);
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
            visjsData.nodes.push(VisjsUtil.getVisjsNode(self.source, lineNodeId, "", null, { shape: "text", size: 2, color: "#ddd" }));

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
                    visjsData.nodes.push(VisjsUtil.getVisjsNode(self.source, item[varNameKey].value, label, null, options));
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

        Export.showDataTable("KGqueryWidget_dataTableDiv", tableCols, tableData, null, null, function (err, datatable) {
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
                NodeInfosWidget.showNodeInfos(self.source, node, "smallDialogDiv");
            });
        });
    };

    self.resetVisjNodes = function (ids) {
        var newNodes = [];
        if (!ids) {
            ids = self.KGqueryGraph.data.nodes.getIds();
        }
        if (!Array.isArray(ids)) {
            ids = [ids];
        }
        ids.forEach(function (id) {
            newNodes.push({
                id: id,
                shape: self.visjsNodeOptions.shape,
                size: self.visjsNodeOptions.size,
                color: self.visjsNodeOptions.color,
            });
        });
        self.KGqueryGraph.data.nodes.update(newNodes);
    };

    self.resetVisjEdges = function () {
        var newVisjsEdges = [];
        self.KGqueryGraph.data.edges.getIds().forEach(function (edgeId, index) {
            newVisjsEdges.push({ id: edgeId, color: Lineage_whiteboard.restrictionColor, width: 1 });
        });
        self.KGqueryGraph.data.edges.update(newVisjsEdges);
    };

    self.clearAll = function (exceptSetQueries) {
        self.querySets = { sets: [], groups: [], currentIndex: -1 };
        self.classDivsMap = {};

        self.pathDivsMap = {};
        self.allPathEdges = {};
        $("#KGqueryWidget_graphDiv").css("display", "flex");
        $("#KGqueryWidget_dataTableDiv").css("display", "none");
        if (!exceptSetQueries) {
            self.classeMap = {};
            self.SetQueries = [];
            self.queryPathesMap = {};
            self.resetVisjEdges();
            self.resetVisjNodes();
            $("#KGqueryWidget_pathsDiv").html("");
            self.addQuerySet();
            $("#KGqueryWidget_SetsControlsDiv").css("display", "none");
        }
    };
    self.graphActions = {
        onNodeClick: function (node, point, nodeEvent) {
            if (nodeEvent.ctrlKey) {
                NodeInfosWidget.showNodeInfos(self.source, node, "smallDialogDiv", {});
            } else {
                self.currentGraphNode = node;
                KGqueryWidget.addNode(node, nodeEvent);
            }
        },

        onDnDnode: function (startNode, endNode, point) {},
    };

    self.getVarName = function (node, withoutQuestionMark) {
        return (withoutQuestionMark ? "" : "?") + Sparql_common.formatStringForTriple(node.label || Sparql_common.getLabelFromURI(node.id), true);
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
        $("#KGqueryWidget_messageDiv").html(message);
        if (stopWaitImg) {
            $("#KGqueryWidget_waitImg").css("display", "none");
        } else {
            $("#KGqueryWidget_waitImg").css("display", "block");
        }
    };

    self.switchRightPanel = function () {
        var isGraphDisplayed = $("#KGqueryWidget_graphDiv").css("display");
        if (isGraphDisplayed == "block") {
            $("#KGqueryWidget_graphDiv").css("display", "none");
            $("#KGqueryWidget_dataTableDiv").css("display", "block");
        } else {
            $("#KGqueryWidget_graphDiv").css("display", "block");
            $("#KGqueryWidget_dataTableDiv").css("display", "none");
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
        $("#KGqueryWidget_setDiv_" + setIndex).remove();
        self.querySets.sets.splice(setIndex, 1);
        self.querySets.currentIndex = self.querySets.sets.length;
    };

    self.saveModelGraph = function () {
        var fileName = self.source + "_KGmodelGraph.json";
        self.KGqueryGraph.saveGraph(fileName, true);
        return;
        var graphData = { nodes: self.KGqueryGraph.data.nodes.get(), edges: self.KGqueryGraph.data.edges.get() };
        var str = JSON.stringify(graphData);

        var payload = {
            dir: "graphs/",
            fileName: self.source + "_KGmodelGraph.json",
            data: str,
        };

        $.ajax({
            type: "POST",
            url: `${Config.apiUrl}/data/file`,
            data: payload,
            dataType: "json",
            success: function (_result, _textStatus, _jqXHR) {
                self.message("KG Model Graph saved");
            },
            error(err) {
                return alert(err.responseText);
            },
        });
    };
    self.drawVisjsModel = function () {
        var visjsData;
        var visjsOptions = {
            onclickFn: KGqueryWidget.graphActions.onNodeClick,
            dndCtrlFn: KGqueryWidget.graphActions.onDnDnode,
        };

        function draw() {
            self.vicinityArray = [];
            visjsData.edges.forEach(function (edge) {
                self.vicinityArray.push([edge.from, edge.to, edge.data.propertyId]);
            });

            self.KGqueryGraph = new VisjsGraphClass("KGqueryWidget_graphDiv", visjsData, visjsOptions);

            // cannot get colors from loadGraph ???!!
            self.KGqueryGraph.draw(function () {
                var newNodes = [];
                visjsData.nodes.forEach(function (node) {
                    newNodes.push({ id: node.id, color: node.color, shape: node.shape });
                });
                self.KGqueryGraph.data.nodes.update(newNodes);
            });

            self.clearAll();
        }

        var visjsGraphFileName = self.source + "_KGmodelGraph.json";

        self.KGqueryGraph = new VisjsGraphClass("KGqueryWidget_graphDiv", { nodes: [], edges: [] }, visjsOptions);

        if (true) {
            self.KGqueryGraph.loadGraph(visjsGraphFileName, null, function (err, result) {
                if (err) visjsData = { nodes: [], edges: [] };
                else visjsData = result;
                //  return draw();
                self.getInferredModelVisjsData(self.source, function (err, result2) {
                    if (err) return alert(err);
                    var oldNodesMap = {};
                    var oldEdgesMap = {};
                    var newNodes = [];
                    var newEdges = [];
                    visjsData.nodes.forEach(function (item) {
                        oldNodesMap[item.id] = item;
                    });

                    visjsData.edges.forEach(function (item) {
                        oldEdgesMap[item.id] = item;
                    });

                    result2.nodes.forEach(function (item) {
                        if (!oldNodesMap[item.id]) {
                            newNodes.push(item);
                        }
                    });
                    result2.edges.forEach(function (item) {
                        if (!oldEdgesMap[item.id]) {
                            newEdges.push(item);
                        }
                    });
                    visjsData.nodes = visjsData.nodes.concat(newNodes);
                    visjsData.edges = visjsData.edges.concat(newEdges);

                    return draw();
                });
            });
        } else {
            self.getInferredModelVisjsData(self.source, function (err, result) {
                if (err) {
                    return alert(err.responseText);
                }
                visjsData = result;
                draw();
            });
            /*  self.KGqueryGraph.loadGraph(visjsGraphFileName, null, function (err, result) {
                if (false && result) {
                    visjsData = result;
                    return draw();
                } else {
                    self.getInferredModelVisjsData(self.source, function (err, result) {
                        if (err) {
                            return alert(err.responseText);
                        }
                        visjsData = result;
                        draw();
                    });
                }
            });*/
        }
    };

    return self;
})();

export default KGqueryWidget;
window.KGqueryWidget = KGqueryWidget;
