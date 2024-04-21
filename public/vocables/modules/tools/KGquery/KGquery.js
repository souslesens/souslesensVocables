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
import KGquery_controlPanel from "./KGquery_controlPanel.js";
import KGquery_paths from "./KGquery_paths.js";
import KGquery_filter_bot from "../../bots/KGquery_filter_bot.js";
//import KGquery_annotations_bot from "../../bots/KGquery_annotations_bot.js";
import sparql_common from "../../sparqlProxies/sparql_common.js";
import ResponsiveUI from "../../../responsive/responsiveUI.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import jstreeWidget from "../../uiWidgets/jstreeWidget.js";

var KGquery = (function() {
    var self = {};
    self.querySets = { sets: [], groups: [], currentIndex: -1 };
    self.divsMap = {};
    self.classeMap = {};
    self.allPathEdges = {};
    self.isLoaded = false;
    self.maxResultSizeforLineageViz = 1000;
    self.maxOptionalPredicatesInQuery = 8;
    self.pathEdgesColors = ["green", "blue", "orange", "grey", "yellow"];

    self.onLoaded = function() {
        $("#actionDivContolPanelDiv").load("modules/tools/KGquery/html/KGquery_leftPanel.html", function() {
            KGquery_graph.init();
        });
        $("#graphDiv").load("modules/tools/KGquery/html/KGquery_centralPanel.html", function() {
            self.currentSource = Lineage_sources.activeSource;
            self.showSourcesDialog();
        });
    };

    self.init = function() {
        KGquery_graph.drawVisjsModel("saved");
        SavedQueriesWidget.showDialog("STORED_KGQUERY_QUERIES", "KGquery_myQueriesDiv", self.currentSource, null, KGquery_myQueries.save, KGquery_myQueries.load);
    };

    self.showSourcesDialog = function(forceDialog) {
        if (!forceDialog && Config.userTools["KGquery"].urlParam_source) {
            self.currentSource = Config.userTools["KGquery"].urlParam_source;
            self.init();
            return;
        }

        var options = {
            includeSourcesWithoutSearchIndex: true,
            withCheckboxes: false
        };
        var selectTreeNodeFn = function(event, obj) {
            $("#mainDialogDiv").dialog("close");
            self.currentSource = obj.node.id;
            self.init();
        };
        MainController.UI.showHideRightPanel("hide");
        $("#KGquery_SetsControlsDiv").hide();
        SourceSelectorWidget.initWidget(["OWL"], "mainDialogDiv", true, selectTreeNodeFn, null, options);
    };

    self.addQuerySet = function(booleanOperator) {
        var label = "";
        var color = self.pathEdgesColors[self.querySets.sets.length];
        var querySetDivId = KGquery_controlPanel.addQuerySet("KGquery_pathsDiv", booleanOperator, label, color);

        var querySet = {
            divId: querySetDivId,
            elements: [],
            color: color,
            booleanOperator: booleanOperator,
            classFiltersMap: {},
            index: self.querySets.sets.length
        }; // array of queryElements with a color and a currentIndex

        self.addQueryElementToQuerySet(querySet);
        self.querySets.sets.push(querySet);
        self.currentQuerySet = querySet;
        self.divsMap[querySetDivId] = querySet;
    };

    self.addQueryElementToQuerySet = function(querySet) {
        $("#KGquery_SetsControlsDiv").show();
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
            setIndex: querySet.index
        };
        querySet.elements.push(queryElement);
        self.currentQueryElement = queryElement;
        self.divsMap[queryElementDivId] = queryElement;
        return queryElement;
    };

    self.addNodeToQueryElement = function(queryElement, node, role) {
        self.classeMap[node.id] = node;
        queryElement[role] = node;
        if (role == "toNode") {
            // to be finished
        }
        var nodeDivId = KGquery_controlPanel.addNodeToQueryElementDiv(queryElement.divId, role, node.alias || node.label);

        KGquery_graph.outlineNode(node.id);
        node.data.setIndex = self.currentQuerySet.index;
        node.data.nodeDivId=nodeDivId
        //  node.data.queryElement = queryElement;
        self.divsMap[nodeDivId] = node;
    };

    self.addNode = function(selectedNode, nodeEvent) {
        if (!selectedNode) {
            return;
        }

        var node = JSON.parse(JSON.stringify(selectedNode));

        /* if existing path in queryFlement a new one is created
  with a from Node that is the nearest node from the existing Node of all previous element in the set*/

        if (self.currentQuerySet.elements.length > 1) {
            var excludeSelf = false;
            $("#KGquery_SetsControlsDiv").show();
            KGquery_paths.getNearestNodeId(node.id, self.currentQuerySet, excludeSelf, function(err, nearestNodeId) {
                if (err) {
                    return acllback(err.responseText);
                }

                self.addNodeToQueryElement(self.currentQueryElement, node, "fromNode");
                var nearestNode = self.classeMap[nearestNodeId];
                self.addNodeToQueryElement(self.currentQueryElement, nearestNode, "toNode");

                KGquery_paths.setQueryElementPath(self.currentQueryElement, function(err, result) {
                    if (err) {
                        return alert(err.responseText);
                    }

                    var predicateLabel = KGquery_controlPanel.getQueryElementPredicateLabel(self.currentQueryElement);
                    KGquery_controlPanel.addPredicateToQueryElementDiv(self.currentQueryElement.divId, predicateLabel);

                    self.currentQueryElement = self.addQueryElementToQuerySet(self.currentQuerySet);
                });
            });
        } else if (!self.currentQueryElement.fromNode) {
            self.addNodeToQueryElement(self.currentQueryElement, node, "fromNode");
            self.currentFromNode = node;
        } else if (!self.currentQueryElement.toNode) {
            //give new varName to the classId
            if (self.currentQueryElement.fromNode.id == node.id) {
                node.label += "_" + (self.currentQueryElement.paths.length + 1);
                node.data.label = node.label;
            }

            self.currentQueryElement.toNode = node;
            KGquery_paths.setQueryElementPath(self.currentQueryElement, function(err, result) {
                if (err) {
                    return alert(err.responseText);
                }
                self.addNodeToQueryElement(self.currentQueryElement, node, "toNode");
                var predicateLabel = KGquery_controlPanel.getQueryElementPredicateLabel(self.currentQueryElement);
                KGquery_controlPanel.addPredicateToQueryElementDiv(self.currentQueryElement.divId, predicateLabel);

                self.addQueryElementToQuerySet(self.currentQuerySet);
            });
        }
    };

    self.addEdge = function(edge, evt) {
        var fromNode = KGquery_graph.KGqueryGraph.data.nodes.get(edge.from);
        fromNode = JSON.parse(JSON.stringify(fromNode));

        var toNode = KGquery_graph.KGqueryGraph.data.nodes.get(edge.to);
        toNode = JSON.parse(JSON.stringify(toNode));
        if (edge.from == edge.to) {
            toNode = JSON.parse(JSON.stringify(fromNode));
            if (edge.data.propertyId == "rdfs:member") {
                fromNode.breakdownDepth = prompt("specify  number of breakdown levels :(default 1)") || 1;
                fromNode.alias = fromNode.label + "_parent";
            } else {
                toNode.alias = toNode.label + (self.currentQueryElement.paths.length + 1);
            }
        }

        var queryElement = self.addQueryElementToQuerySet(self.currentQuerySet);
        self.addNodeToQueryElement(queryElement, fromNode, "fromNode");
        self.addNodeToQueryElement(queryElement, toNode, "toNode");
        var subPath = [edge.from, edge.to, edge.data.propertyId];
        if (fromNode.breakdownDepth) {
            subPath.breakdownDepth = fromNode.breakdownDepth;
        }
        var path = [subPath];
        var pathWithVarNames = KGquery_paths.substituteClassIdToVarNameInPath(queryElement, path);
        queryElement.paths = pathWithVarNames;
        self.addQueryElementToQuerySet(self.currentQuerySet);
    };

    self.addNodeFilter = function(classDivId,addTojsTreeNode) {
        var aClass = self.divsMap[classDivId];
        var classSetIndex = aClass.data.setIndex;
        if (self.querySets.sets[classSetIndex].classFiltersMap[classDivId]) {
            delete self.querySets.sets[classSetIndex].classFiltersMap[classDivId];
            $("#" + classDivId + "_filter").html("");
            if(addTojsTreeNode){
                jstreeWidget.deleteNode(null,classDivId + "_filter")
            }
            return;
        }
        var varName = [self.getVarName(aClass, true)];
        var datatype = aClass.data.datatype;

        var currentFilterQuery = {
            source: self.currentSource,
            currentClass: aClass.id,
            varName: self.getVarName(aClass, true)
        };

        KGquery_filter_bot.start(aClass.data, currentFilterQuery, function(err, result) {
            if (err) {
                return alert(err.responseText);
            }
            self.querySets.sets[classSetIndex].classFiltersMap[classDivId] = { class: aClass, filter: result.filter };
            $("#" + classDivId + "_filter").text(result.filterLabel || result.filter);


            if(addTojsTreeNode){
                var jstreeData=[{
                    id: classDivId + "_filter",
                    text:result.filterLabel || result.filter,
                    parent:addTojsTreeNode
                }]
                jstreeWidget.addNodesToJstree(null,addTojsTreeNode,jstreeData)
            }

        });
    };

    self.aggregateQuery = function() {
        var message = "";
        if (self.querySets.sets.length > 0) {
            message = "<font color='blue'>aggregate works only with variables belonging to the same set !</font>";
        }

        var varsMap = {};

        self.querySets.sets.forEach(function(querySet) {
            querySet.elements.forEach(function(queryElement, queryElementIndex) {
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
            function(callback) {
                callback(varsMap);
            },

            function(err, aggregateClauses) {
                self.queryKG("table", { aggregate: aggregateClauses });
            },
            message
        );
    };

    self.queryKG = function(output, options, isVirtualSQLquery) {
        if (!options) {
            options = {};
        }

        $("#KGquery_dataTableDiv").html("");
        self.message("searching...");
        $("#KGquery_waitImg").css("display", "block");

        /*   $("#KGquery_graphDiv").css("display", "none");
        $("#KGquery_dataTableDiv").css("display", "block");*/

        if (isVirtualSQLquery) {
            return SQLquery_filters.showFiltersDialog(self.querySets, self.currentSource);
        }

        self.execPathQuery(options, function(err, result) {
            self.message("", true);
            if (err) {
                if(err.responseText)
                return alert(err.responseText);
            }

            if (result.results.bindings.length == 0) {
                return alert("no result");
            }

            self.message("found items :" + result.results.bindings.length);
            if (output == "table") {
                self.queryResultToTable(result);
            } else if (output == "Graph") {
                self.queryResultToVisjsGraph(result);
            } else if (output == "TagsGeometry") {
                self.queryToTagsGeometry(result.results.bindings);
            }
        });
    };


    self.filterQueryNonObjectProperties = function(callback) {
        var queryNonObjectProperties = [];
        var uniqueProps={}
var labelProperty={
    datatype :"http://www.w3.org/2001/XMLSchema#string",
    id:"rdf:label",
    label :"label"
}
        self.querySets.sets.forEach(function(querySet) {
            querySet.elements.forEach(function(queryElement, queryElementIndex) {
               queryElement.paths.forEach(function(pathItem, pathIndex) {
                    if (queryElement.fromNode && queryElement.fromNode.data.nonObjectProperties) {
                        var subjectVarName = self.getVarName(queryElement.fromNode,true);
                        var addLabel = true;

                        queryElement.fromNode.data.nonObjectProperties.forEach(function(property) {
                            if (property.label.indexOf("label") > -1) {
                                addLabel = false;
                            }

                            if(!uniqueProps[subjectVarName+"_"+property.label]) {
                                uniqueProps[subjectVarName+"_"+property.label]=1
                                queryNonObjectProperties.push({ varName: subjectVarName, property: property,nodeDivId: queryElement.fromNode.data.nodeDivId });
                            }
                        });
                        if (addLabel) {
                            if(!uniqueProps[subjectVarName+"_"+"rdfs:label"]) {
                                uniqueProps[subjectVarName + "_" + "rdfs:label"] = 1
                            }
                            queryNonObjectProperties.push({ varName: subjectVarName, property: labelProperty,nodeDivId: queryElement.fromNode.data.nodeDivId });
                        }


                    }
                    if (queryElement.toNode && queryElement.toNode.data.nonObjectProperties) {
                        var objectVarName = self.getVarName(queryElement.toNode,true);
                        var addLabel = true;
                        queryElement.toNode.data.nonObjectProperties.forEach(function(property) {
                            if (property.label.indexOf("label") > -1) {
                                addLabel = false;
                            }
                            if(!uniqueProps[objectVarName+"_"+property.label]) {
                                uniqueProps[objectVarName + "_" + property.label] = 1
                                queryNonObjectProperties.push({ varName: objectVarName, property: property ,nodeDivId: queryElement.toNode.data.nodeDivId});
                            }
                        });
                        if (addLabel) {
                            if(!uniqueProps[objectVarName+"_"+"rdfs:label"]) {
                                uniqueProps[objectVarName + "_" + "rdfs:label"] = 1
                                queryNonObjectProperties.push({ varName: objectVarName, property: labelProperty ,nodeDivId: queryElement.toNode.data.nodeDivId });
                            }
                        }

                    }

             });
            });
        });

            var jstreeData = [];
            queryNonObjectProperties.forEach(function(item) {
                var label = item.varName + "_" +item.property.label;
                var nodeDivId=item.nodeDivId
                jstreeData.push({
                    id: label,
                    text: label+"<button style='vertical-align:middle' class=\"slsv-invisible-button filterIcon\" about=\"add filter\" onclick=\"KGquery.addNodeFilter('"+nodeDivId+"','"+label+"')\"></button>",
                    parent: "#",
                    data:{property:item.property},
                    type:"Property"
                });
            });

                var options = {
                    withCheckboxes: true,

                    validateFn: function(checkedNodes) {

                        queryNonObjectProperties = []
                        if(!checkedNodes || checkedNodes.length==0)
                            return callback("no properties selected")
                        checkedNodes.forEach(function(node){
                            if(node.parents.length==1)
                                queryNonObjectProperties.push(node)
                        })



                       if(queryNonObjectProperties.length > self.maxOptionalPredicatesInQuery){
                           if(confirm("many properties have been selected. Query may take time or abort, Continue anyway?")){
                               return callback(null, queryNonObjectProperties);
                           }
                           else{
                               return callback("query aborted");
                           }
                       }

                        return callback(null, queryNonObjectProperties);
                    }
                };
                JstreeWidget.loadJsTree(null, jstreeData, options,function(){
                    if(queryNonObjectProperties.length < self.maxOptionalPredicatesInQuery){
                        JstreeWidget.checkAll()
                    }

        });






    };

    self.execPathQuery = function(options, callback) {
        var queryNonObjectProperties = [];
        var query = "";
        var data;
        async.series([


                //filterQueryNonObjectProperties
                function(callbackSeries) {
                    self.filterQueryNonObjectProperties(function(err, result) {
                        if (err) {
                            MainController.UI.message(err, true)
                            callbackSeries(err);
                        }
                        queryNonObjectProperties = result;
                        callbackSeries();
                    });
                },


                //build query
                function(callbackSeries) {
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

                    self.querySets.sets.forEach(function(querySet) {
                        if (querySet.booleanOperator) {
                            whereStr += "\n " + querySet.booleanOperator + "\n ";
                        }

                        var predicateStr = "";
                        var filterStr = "";
                        var otherPredicatesStrs = "";

                        querySet.elements.forEach(function(queryElement, queryElementIndex) {
                            if (!queryElement.toNode) {
                                if (queryElement.fromNode) {
                                } else {
                                    return;
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
                            queryElement.paths.forEach(function(pathItem, pathIndex) {
                                var propertyStr = pathItem[2];

                                if (propertyStr == "rdfs:member") {
                                    var depth = pathItem.breakdownDepth || 1;
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

                            for (var key in querySet.classFiltersMap) {
                                filterStr += querySet.classFiltersMap[key].filter + " \n";
                                var filterType = filterStr.match(/<.*>/) ? "uri" : "literal";
                                filterClassLabels["?" + querySet.classFiltersMap[key].class.label] = filterType;
                            }

                            if (!options.aggregate) {
                                otherPredicatesStrs += " \n" + self.getOtherPredicates(queryElement, filterClassLabels);
                            }
                        });
                        if (options.aggregate) {
                            whereStr += options.aggregate.where;
                            var groupByPredicates = options.aggregate.groupByPredicates;
                            otherPredicatesStrs += " \n" + self.getAggregatePredicates(groupByPredicates);
                        } else {
                        }

                        whereStr += "{" + predicateStr + "\n" + "" + "\n" + filterStr + "\n" + otherPredicatesStrs + "}";
                    });

                    var fromStr = Sparql_common.getFromStr(self.currentSource);
                    query =
                        "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
                        "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                        "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>";

                    query += " Select " + selectStr + "  " + fromStr + " where {" + whereStr + "}";

                    query += " " + groupByStr + " limit 10000";

                    callbackSeries();


                },


                //execute query
                function(callbackSeries) {

                    var url = Config.sources[self.currentSource].sparql_server.url + "?format=json&query=";

                    var currentSparqlQuery = {
                        url: url,
                        query: query,
                        source: self.currentSource
                    };

                    if (options.dontExecute) {
                        return callback(null, currentSparqlQuery);
                    }

                    var countOptional = common.countStringsInString(query, "OPTIONAL");
                    if (countOptional > self.maxOptionalPredicatesInQuery) {
                        return alert("query too long , remove  nodes");
                    }
                    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: self.currentSource, caller: "getObjectRestrictions" }, function(err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        data = result;
                        callbackSeries(null, result);
                    });

                },
                function(callbackSeries) {
                    callbackSeries();
                }
            ]
            , function(err) {
                callback(err, data);
            });
    };


    self.getAggregatePredicates = function(groupByPredicates) {
        var str = "";
        for (var key in groupByPredicates) {
            var obj = groupByPredicates[key];
            str += " ?" + obj.classLabel + " <" + obj.prop.id + "> ?" + obj.label + ". ";
        }

        return str;
    };
    self.getOtherPredicates = function(queryElement, filterClassLabels) {
        function getOptionalClause(varName) {
            var optionalStr = " OPTIONAL ";
            var filterType = filterClassLabels[varName];
            if (filterType && filterType != "uri") {
                optionalStr = "";
            }

            return optionalStr;
        }

        function addToStringIfNotExists(str, text) {
            if (text.indexOf(str) > -1) {
                return text;
            } else {
                return text + str;
            }
        }

        var otherPredicatesStr = "";
        var subjectVarName = self.getVarName(queryElement.fromNode);
        var objectVarName = self.getVarName(queryElement.toNode);
        if (queryElement.fromNode.data.nonObjectProperties) {
            var addLabelPredicate = true;
            queryElement.fromNode.data.nonObjectProperties.forEach(function(property) {
                if (property.label.indexOf("label") > -1) {
                    addLabelPredicate = false;
                }
                var optionalStr = getOptionalClause(subjectVarName);

                otherPredicatesStr = addToStringIfNotExists(optionalStr + " {" + subjectVarName + " <" + property.id + "> " + subjectVarName + "_" + property.label + "}\n", otherPredicatesStr);
            });

            if (addLabelPredicate) {
                var optionalStr = getOptionalClause(subjectVarName);
                otherPredicatesStr = addToStringIfNotExists(optionalStr + "  {" + subjectVarName + " rdfs:label " + subjectVarName + "_label}\n", otherPredicatesStr);
            }
        } else {
            var optionalStr = getOptionalClause(subjectVarName);
            otherPredicatesStr = addToStringIfNotExists(optionalStr + " {" + subjectVarName + " rdfs:label " + subjectVarName + "_label}\n", otherPredicatesStr);
        }
        if (queryElement.toNode) {
            if (queryElement.toNode.data.nonObjectProperties) {
                var addLabelPredicate = true;
                queryElement.toNode.data.nonObjectProperties.forEach(function(property) {
                    if (property.label.indexOf("label") > -1) {
                        addLabelPredicate = false;
                    }
                    var optionalStr = getOptionalClause(objectVarName);
                    otherPredicatesStr = addToStringIfNotExists(optionalStr + "  {" + objectVarName + " <" + property.id + "> " + objectVarName + "_" + property.label + "}\n", otherPredicatesStr);
                });
                if (addLabelPredicate) {
                    var optionalStr = getOptionalClause(objectVarName);
                    otherPredicatesStr = addToStringIfNotExists(optionalStr + "  {" + objectVarName + " rdfs:label " + objectVarName + "_label}\n", otherPredicatesStr);
                }
            } else {
                var optionalStr = getOptionalClause(objectVarName);
                otherPredicatesStr = addToStringIfNotExists(optionalStr + "  {" + objectVarName + " rdfs:label " + objectVarName + "_label}\n", otherPredicatesStr);
            }
        }
        return otherPredicatesStr;
    };

    self.queryResultToVisjsGraph = function(result) {
        var classNodes = self.getAllQueryPathClasses();

        var data = result.results.bindings;
        if (data.length > self.maxResultSizeforLineageViz) {
            return alert("result size to large " + data.length + " to display graph .Add filters to reduce result size less than " + self.maxResultSizeforLineageViz);
        }

        var existingNodes = {};
        var visjsData = { nodes: [], edges: [] };
        data.forEach(function(item, index) {
            var lineNodeId = common.getRandomHexaId(5);
            visjsData.nodes.push(VisjsUtil.getVisjsNode(self.currentSource, lineNodeId, "", null, { shape: "text", size: 2, color: "#ddd" }));

            classNodes.forEach(function(classNode) {
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
                        color: common.getResourceColor("class", varNameKey)
                    };
                    var label = item[labelKey] ? item[labelKey].value : Sparql_common.getLabelFromURI(item[varNameKey].value);
                    visjsData.nodes.push(VisjsUtil.getVisjsNode(self.currentSource, item[varNameKey].value, label, null, options));
                    visjsData.edges.push({
                        id: lineNodeId + item[varNameKey].value,
                        from: item[varNameKey].value,
                        to: lineNodeId
                    });
                }
            });
        });

        ResponsiveUI.onToolSelect("lineage", null, function() {
            KGquery_myQueries.save(function(err, query) {
                // Config.clientCache.KGquery = query;
            });
            setTimeout(function() {
                Lineage_whiteboard.drawNewGraph(visjsData, "graphDiv");
            }, 2000);
        });
    };
    self.queryToTagsGeometry = function(data) {
        var tagsMap = {};
        data.forEach(function(item) {
            for (var key in item) {
                if (key.indexOf("tag") > -1) {
                    tagsMap[item[key].value] = 1;
                }
            }
        });
        ResponsiveUI.onToolSelect("TagsGeometry", null, function() {
            setTimeout(function() {
                //   import TagsGeometry from "../../../../plugins/TagsGeometry/public/js/main.js";
                TagsGeometry.draw(tagsMap);
            }, 2000);
        });
    };

    self.queryResultToTable = function(result) {
        var data = result.results.bindings;
        //prepare columns
        var nonNullCols = {};
        data.forEach(function(item) {
            result.head.vars.forEach(function(varName) {
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
        data.forEach(function(item, index) {
            var line = [index];
            colNames.forEach(function(col) {
                var value = null;
                if (item[col]) {
                    value = item[col].value;

                    //format date
                    if (item[col].datatype == "http://www.w3.org/2001/XMLSchema#datetime") {
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

        $("#KGquery_dataTableDialogDiv").dialog("open");
        $("#KGquery_dataTableDialogDiv").dialog("option", "title", "Query result size: " + tableData.length);

        $("#KGquery_dataTableDialogDiv").css("left", "10px");
        $("#KGquery_dataTableDiv").width("90vW");
        //  $("#mainDialogDiv").html("<div id='KGquery_dataTableDiv' style='width:100vW;heigth:100vH'></div>")
        Export.showDataTable("KGquery_dataTableDiv", tableCols, tableData, null, { paging: true }, function(err, datatable) {
            $("#dataTableDivExport").on("click", "td", function() {
                var table = $("#dataTableDivExport").DataTable();

                var index = table.cell(this).index();
                var row = table.row(this).data();
                var column = table.cell(this).column().data();
                var data = table.cell(this).data();

                var datasetIndex = column[index.row];
                var dataItem = self.currentData[datasetIndex];
                var varName = self.tableCols[index.column].title;
                if (true || !dataItem[varName]) {
                    varName = varName.split("_")[0];
                }
                var uri = dataItem[varName].value;
                var node = { data: { id: uri } };
                NodeInfosWidget.showNodeInfos(self.currentSource, node, "smallDialogDiv", null, function(err) {
                    $("#smallDialogDiv").parent().css("z-index", 1);
                });
            });
        });
    };

    self.clearAll = function(exceptSetQueries) {
        self.querySets = { sets: [], groups: [], currentIndex: -1 };
        self.divsMap = {};
        self.currentQuerySet = self.addQuerySet();
        self.allPathEdges = {};
        /* $("#KGquery_graphDiv").css("display", "flex");
        $("#KGquery_dataTableDiv").css("display", "none");*/
        if (!exceptSetQueries) {
            self.classeMap = {};
            self.SetQueries = [];
            self.queryPathesMap = {};
            self.divsMap = {};
            KGquery_graph.resetVisjNodes();
            KGquery_graph.resetVisjEdges();
            //   KGquery_graph.drawVisjsModel("saved")
            $("#KGquery_pathsDiv").html("");
            self.addQuerySet();
            //Hide Union and minus showToClaude
            $("#KGquery_SetsControlsDiv").hide();
        }
    };

    self.getVarName = function(node, withoutQuestionMark) {
        var varName = (withoutQuestionMark ? "" : "?") + Sparql_common.formatStringForTriple(node.alias || node.label || Sparql_common.getLabelFromURI(node.id), true);

        return varName;
    };

    self.getAllQueryPathClasses = function() {
        var classes = [];
        self.querySets.sets.forEach(function(querySet) {
            querySet.elements.forEach(function(queryPath) {
                classes.push(queryPath.fromNode);
                classes.push(queryPath.toNode);
            });
        });
        return classes;
    };

    self.message = function(message, stopWaitImg) {
        $("#KGquery_messageDiv").html(message);
        if (stopWaitImg) {
            $("#KGquery_waitImg").css("display", "none");
        } else {
            $("#KGquery_waitImg").css("display", "block");
        }
    };

    self.switchRightPanel = function(forceGraph) {
        return;
        var isGraphDisplayed = $("#KGquery_graphDiv").css("display");
        if (!forceGraph && isGraphDisplayed == "block") {
            $("#KGquery_graphDiv").css("display", "none");
            $("#KGquery_dataTableDiv").css("display", "block");
        } else {
            $("#KGquery_graphDiv").css("display", "block");
            $("#KGquery_dataTableDiv").css("display", "none");
        }
    };

    self.onBooleanOperatorChange = function(querySetDivId, value) {
        self.divsMap[querySetDivId].booleanOperator = value;
    };

    self.removeQueryElement = function(queryElementDivId) {
        $("#" + queryElementDivId).remove();
        var queryElement = self.divsMap[queryElementDivId];
        self.querySets.sets[queryElement.setIndex].elements.splice(queryElement.index, 1);
    };

    self.removeSet = function(querySetDivId) {
        $("#" + querySetDivId).remove();
        var set = self.divsMap[querySetDivId];
        self.querySets.sets.splice(set.index, 1);
    };

    self.onOutputTypeSelect = function(output) {
        if (output == "") {
            return;
        }
        self.queryKG(output);
        $("#KGquery_outputTypeSelect").val("");
    };

    self.addOutputType = function() {
        $("KGquery_outputTypeSelect");
    };

    return self;
})();

export default KGquery;
window.KGquery = KGquery;
