import common from "./../../common.js"
import Sparql_OWL from "./../../sparqlProxies/sparql_OWL.js"
import Sparql_common from "./../../sparqlProxies/sparql_common.js"
import Sparql_proxy from "./../../sparqlProxies/sparql_proxy.js"
import Lineage_classes from "./lineage_classes.js"
import SourceBrowser from "./../sourceBrowser.js"
import visjsGraph from "./../../graph/visjsGraph2.js"
import Export from "./../../export.js"



var Lineage_query = (function () {
    var self = {};
    self.databasesMap = {};
    self.relationObj = {};
    self.currentRelation = null;
    self.filters = {};

    self.existingTables = {};
    self.isLoaded = false;

    self.showQueryDailog = function () {
        $("#QueryDialog").dialog("open");
        if (self.isLoaded) {
            return;
        }
        self.filters = {};
        self.isLoaded = true;

        self.operators = {
            string: ["contains", "not contains", "="],
            number: ["=", "!=", "<", "<=", ">", ">="],
        };
        $("#QueryDialog").load("snippets/lineage/queryDialog.html", function () {
            var data = [
                "",
                "rdf:type",
                "rdfs:label",
                "rdfs:isDefinedBy",
                "rdfs:comment",
                "skos:altLabel",
                "skos:prefLabel",
                "skos:definition",
                "skos:example",
                "rdfs:subClassOf",
                "rdfs:member",
                "OTHER",
            ];
            var predicates = [];
            data.forEach(function (item) {
                predicates.push({ label: item, id: item });
            });

            common.fillSelectOptions("lineageQuery_predicateSelect", predicates, true, "label", "id");

            $("#lineageQuery_value").keypress(function (e) {
                if (e.which == 13) {
                    var str = $("#lineageQuery_value").val();
                    if (str.length > 0) {
                        Lineage_query.addFilter();
                    }
                }
            });
        });
    };

    self.onSelectType = function (role, type) {
        $("#lineageQuery_valueDiv").css("display", "block");
        if (role == "predicate" && type == "OTHER") {
            Sparql_OWL.getObjectProperties(Lineage_sources.activeSource, { withoutImports: false }, function (err, result) {
                if (err) {
                    return alert(err.responseText);
                }
                $("#lineageQuery_predicateUriSelect").css("display", "block");

                common.fillSelectOptions("lineageQuery_predicateUriSelect", result, true, "propertyLabel", "property");
            });
            return;
        }

        var predicate = $("#lineageQuery_predicateUriSelect").val();
        if (predicate.indexOf("hasBeginning") > -1) {
            $("#lineageQuery_objectTypeSelect").val("date");
            common.fillSelectOptions("lineageQuery_operator", self.operators["number"], true);
            $("#lineageQuery_operator").val(">=");

            common.setDatePickerOnInput("lineageQuery_value");
        } else if (predicate.indexOf("hasEnding") > -1) {
            $("#lineageQuery_objectTypeSelect").val("date");
            common.fillSelectOptions("lineageQuery_operator", self.operators["number"], true);
            $("#lineageQuery_operator").val("<=");
            common.setDatePickerOnInput("lineageQuery_value");
        } else if (type == "string") {
            common.fillSelectOptions("lineageQuery_operator", self.operators["string"], true);
            $("#lineageQuery_valueDiv").css("display", "block");
        } else if (type == "date") {
            common.fillSelectOptions("lineageQuery_operator", self.operators["number"], true);
            var predicate = $("#lineageQuery_predicateUriSelect").val();
            if (predicate.indexOf("hasBeginning") > -1) {
                $("#lineageQuery_operator").val(">=");
            }
            if (predicate.indexOf("hasEnding") > -1) {
                $("#lineageQuery_operator").val("<=");
            }
        } else if (type == "number") {
            common.fillSelectOptions("lineageQuery_operator", self.operators["number"], true);
            common.setDatePickerOnInput("lineageQuery_value");
        } else if (type == "owl:Class" || type == "owl:NamedIndividual" || type == "rdf:Bag") {
            if (role == "subject") {
                $("#lineageQuery_subjectUriSelect").css("display", "block");
                $("#lineageQuery_valueDiv").css("display", "none");
                KGcreator.fillObjectOptionsFromPrompt(type, "lineageQuery_subjectUriSelect");
                //  fillUriSelect("lineageQuery_subjectUriSelect");
            }
            if (role == "object") {
                $("#lineageQuery_objectUriSelect").css("display", "block");
                $("#lineageQuery_valueDiv").css("display", "none");
                KGcreator.fillObjectOptionsFromPrompt(type, "lineageQuery_objectUriSelect");

                //  fillUriSelect("lineageQuery_objectUriSelect");
            }
        } else {
        }
    };

    self.reset = function () {
        $("#lineageQuery_subjectTypeSelect").val("");
        $("#lineageQuery_subjectUriSelect").val("");
        $("#lineageQuery_predicateSelect").val("");
        $("#lineageQuery_predicateUriSelect").val("");
        $("#lineageQuery_objectTypeSelect").val("");

        $("#filterBooleanOperator").val(" FILTER  EXISTS ");
        $("#lineageQuery_operator").val("contains");
        $("#lineageQuery_value").val("");
    };

    self.addFilter = function () {
        var subjectType = $("#lineageQuery_subjectTypeSelect").val();
        var subjectUri = $("#lineageQuery_subjectUriSelect").val();
        var subjectUriLabel = $("#lineageQuery_subjectUriSelect option:selected").text();

        var predicateType = $("#lineageQuery_predicateSelect").val();
        var predicateUri = $("#lineageQuery_predicateUriSelect").val();
        var predicateUriLabel = $("#lineageQuery_predicateUriSelect option:selected").text();

        var objectType = $("#lineageQuery_objectTypeSelect").val();
        var objectUri = $("#lineageQuery_objectUriSelect").val();
        var objectUriLabel = $("#lineageQuery_objectUriSelect option:selected").text();
        if (objectUri == "_seearch") {
            objectUri = null;
        }
        if (subjectUri == "_seearch") {
            subjectUri = null;
        }

        var filterBooleanOperator = $("#filterBooleanOperator").val();

        var operator = $("#lineageQuery_operator").val();
        var value = $("#lineageQuery_value").val();

        if (!objectType && !objectUri && !predicateType && !predicateUri) {
            return alert(" not enough criteria ");
        }

        $("#LineageQuery_value").val("");

        var filterId = "filter_" + common.getRandomHexaId(5);

        var html = "<div class='LineageQuery_QueryElt' id='" + filterId + "'> ";
        html += "<button style='size: 10px' onclick='Lineage_query.removeFilter(\"" + filterId + "\")'>X</button>";

        var obj = {
            subjectType: subjectType,
            subjectUri: subjectUri,

            predicateType: predicateType,
            predicateUri: predicateUri,

            objectType: objectType,
            objectUri: objectUri,

            filterBooleanOperator: filterBooleanOperator,
        };

        var valueStr = "";
        if (value) {
            obj.operator = operator;
            obj.value = value;
            valueStr = objectType + " " + operator + "&nbsp;" + value;
        }

        if (Object.keys(self.filters).length > 0) {
            html += filterBooleanOperator + " ";
        }
        html += "&nbsp;" + (subjectUriLabel || subjectType) + " " + (predicateUriLabel || predicateType) + " " + (objectUriLabel || valueStr) + "&nbsp;";

        html += "</div>";

        self.filters[filterId] = obj;

        $("#lineageQuery_Filters").append(html);
        ///  $("#LineageQuery_createFilterDiv").css("display", "none");
        return obj;
    };

    self.removeFilter = function (filterId) {
        delete self.filters[filterId];
        $("#" + filterId).remove();
    };

    self.executeQuery = function (queryType) {
        function getSelectedNodesFilter(varname, type, predicateType, callback) {
            function getFilter(graphNodes) {
                var key = "id";
                if (["rdf:type", "rdfs:subClassOf"].indexOf(predicateType) < 0) {
                    //filter label
                    key = "label";
                }
                var array = [];
                graphNodes.forEach(function (node) {
                    array.push(node.data[key]);
                });
                if (key == "id") {
                    return Sparql_common.setFilter(varname, array);
                } else {
                    return Sparql_common.setFilter(varname, null, array, { exactMatch: 1 });
                }
            }

            if (type == "_selectedNode") {
                if (!Lineage_classes.currentGraphNode) {
                    return callback("no node selected");
                }
                var filter = getFilter([Lineage_classes.currentGraphNode]);
                return callback(null, filter);
            } else if (type == "_whiteBoardNodes") {
                if (!visjsGraph.data) {
                    return callback("no nodes on witheboard");
                }
                var filter = getFilter(visjsGraph.data.nodes);
                return callback(null, filter);
            }
            return "";
        }

        if (Object.keys(self.filters).length == 0) {
            return alert("add a  filter first ");
        }

        var source = Lineage_sources.activeSource;
        var fromStr = Sparql_common.getFromStr(source, false, true);
        var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" + "PREFIX owl: <http://www.w3.org/2002/07/owl#>" + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" + "select ";

        if (queryType == "count") {
            query += "(count (distinct ?s) AS ?count)";
        } else {
            query += "*";
        }
        query += fromStr;

        query += " where {";
        query += "{ ?s rdfs:label ?sLabel. ?s rdf:type ?sType. ";
        var filterIndex = 0;
        for (var key in self.filters) {
            if (filterIndex > 0) {
                query += "\n " + filter.filterBooleanOperator + " \n";
            }
            filterIndex += 1;

            var filter = self.filters[key];

            var subjectFilterStr = "",
                predicateFilterStr = "",
                objectFilterStr = "";

            if (filter.subjectType) {
                getSelectedNodesFilter("s", filter.subjectType, filter.predicateType, function (err, result) {
                    if (err) {
                        return alert(err);
                    }
                    subjectFilterStr = result;
                });
                if (!subjectFilterStr) {
                    subjectFilterStr = " filter( ?sType =" + filter.subjectType + ") ";
                }
            }

            if (filter.objectUri) {
                objectFilterStr = " ?s ?p" + filterIndex + " ?o" + filterIndex + " .";
                objectFilterStr += "  filter( ?o" + filterIndex + " =<" + filter.objectUri + ">) ";
            } else if (filter.value) {
                if (!filter.predicateUri) {
                    objectFilterStr = " ?s ?p" + filterIndex + " ?o" + filterIndex + " .";
                }

                if (filter.objectType == "string") {
                    objectFilterStr = " ?s ?p" + filterIndex + " ?o" + filterIndex + " .";
                    if (filter.operator == "contains") {
                        objectFilterStr += " ?o" + filterIndex + " rdfs:label ?o" + filterIndex + "Label . Filter(regex(str(?o" + filterIndex + "Label),'" + filter.value + "','i')).";
                    } else if (filter.operator == "not contains") {
                        objectFilterStr += " ?o " + filterIndex + "rdfs:label ?o" + filterIndex + "Label . Filter( ! regex(str(?o" + filterIndex + "Label),'" + filter.value + "','i')).";
                    } else {
                        objectFilterStr += " ?o" + filterIndex + " rdfs:label ?o" + filterIndex + "Label . Filter(?o" + filterIndex + "Label" + filter.operator + "'" + filter.value + "').";
                    }
                } else if (filter.objectType == "number") {
                    objectFilterStr += "  Filter(?o" + filterIndex + filter.operator + "'" + filter.value + "'^^xsd:float).";
                } else if (filter.objectType == "date") {
                    objectFilterStr += " Filter(?o" + filterIndex + filter.operator + "'" + filter.value + "'^^xsd:dateTime).";
                }
            } else {
                //usual types
                getSelectedNodesFilter("s", filter.objectType, filter.predicateType, function (err, filter) {
                    if (err) {
                        return alert(err);
                    }
                    //filter=filter.replace("?sLabel","?s");
                    objectFilterStr = filter;
                });
            }

            if (filter.predicateUri) {
                predicateFilterSt = "";
                if (objectFilterStr.indexOf("p" + filterIndex) < 0) predicateFilterStr += "?s ?p" + filterIndex + " ?o" + filterIndex;
                predicateFilterStr += " filter( ?p" + filterIndex + " =<" + filter.predicateUri + ">) ";
            }

            query += " \n" + subjectFilterStr + " \n" + predicateFilterStr + " \n" + objectFilterStr;

            query += "}";
        }

        query += " } limit 10000";

        if (queryType == "copyQuery") {
            return common.copyTextToClipboard(query);
        }
        var url = Config.sources[source].sparql_server.url + "?format=json&query=";

        self.setMessage("executing query...", true);
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
            self.setMessage("");
            if (err) {
                return callback(err);
            }

            if (queryType == "count") {
                var count = result.results.bindings[0].count.value;
                $("#lineageQuery_listResultDiv").html("" + count + " subjects found");
            } else if (queryType == "graph") {
                if (result.results.bindings.length == 0) {
                    return $("#lineageQuery_listResultDiv").html("no result");
                }
                self.setMessage("drawing nodes...", true);
                var nodeIds = [];
                result.results.bindings.forEach(function (item) {
                    if (nodeIds.indexOf(item.s.value) < 0) {
                        nodeIds.push(item.s.value);
                    }
                });
                Lineage_classes.addNodesAndParentsToGraph(source, nodeIds, {});
                Lineage_query.executeQuery("list");
                self.setMessage("");
                $("#QueryDialog").dialog({
                    position: { my: "left top", at: "left top", of: "#leftPanelDiv" },
                });
            } else if (queryType == "list") {
                var jsdata = [];
                var jstreeData = [];
                var uniqueNodes = {};
                if (result.results.bindings.length == 0) {
                    return $("#lineageQuery_listResultDiv").html("no result");
                }
                result.results.bindings.forEach(function (item) {
                    if (!uniqueNodes[item.sType.value]) {
                        uniqueNodes[item.sType.value] = 1;
                        jstreeData.push({
                            id: item.sType.value,
                            text: Sparql_common.getLabelFromURI(item.sType.value),
                            parent: "#",
                        });
                    }
                    if (!uniqueNodes[item.s.value]) {
                        uniqueNodes[item.s.value] = 1;
                        var label = item.s ? item.sLabel.value : Sparql_common.getLabelFromURI(item.s.value);
                        jstreeData.push({
                            id: item.s.value,
                            text: label,
                            parent: item.sType.value,
                            data: {
                                id: item.s.value,
                                label: label,
                                source: source,
                            },
                        });
                    }
                });

                var options = {
                    contextMenu: Lineage_query.getResultListContextmenu(),
                    selectTreeNodeFn: function (event, obj) {
                        self.currentTreeNode = obj.node;
                    },
                    open_all: true,
                };
                $("#lineageQuery_listResultDiv").html("<div style='width:600px;height:300px;overflow: auto'><div id='lineageQuery_listResultDivTree'></div>");
                common.jstree.loadJsTree("lineageQuery_listResultDivTree", jstreeData, options, function () {});
            }
        });
    };
    self.setMessage = function (message, waitImage) {
        $("#lineageQuery_messageSpan").html(message);
        $("#LineageQuery_waitImg").css("display", waitImage ? "block" : "none");
    };

    self.getResultListContextmenu = function () {
        var items = {};
        items["NodeInfos"] = {
            label: "Node infos",
            action: function (_e) {
                SourceBrowser.showNodeInfos(self.currentTreeNode.data.source, self.currentTreeNode, "mainDialogDiv");
            },
        };
        items.graphNode = {
            label: "graph Node",
            action: function (_e) {
                var selectedNodes = $("#lineageQuery_listResultDivTree").jstree().get_selected(true);
                if (selectedNodes.length > 1) {
                    Lineage_classes.drawNodesAndParents(selectedNodes, 0);
                } else if (self.currentTreeNode.children.length > 0) {
                    var selectedNodes = [];
                    self.currentTreeNode.children.forEach(function (childId) {
                        var node = $("#lineageQuery_listResultDivTree").jstree().get_node(childId);
                        selectedNodes.push(node);
                    });

                    Lineage_classes.drawNodesAndParents(selectedNodes, 0);
                } else {
                    Lineage_classes.drawNodesAndParents(self.currentTreeNode, 1, null, function (err, result) {});
                }
            },
        };

        items["Decorate"] = {
            label: "Decorate",
            action: function (_e) {
                self.showDecorateGraphDialog();
            },
        };
        return items;
    };

    self.showDecorateGraphDialog = function () {
        var existingNodes = visjsGraph.getExistingIdsMap();
        if (Object.keys(existingNodes).length == 0) {
            return alert("draw nodes first");
        }
        $("#LineagePopup").dialog("open");
        $("#LineagePopup").load("snippets/lineage/selection/lineage_selection_decorateDialog.html", function () {
            $("#lineage_selection_decorate_applyButton").bind("click", Lineage_query.decorateGraphNodes);
            var colors = common.paletteIntense;
            var array = [];
            colors.forEach(function (color) {
                array.push();
            });
            common.fillSelectOptions("lineage_selection_decorate_colorSelect", colors, true);

            $("#lineage_selection_decorate_colorSelect option").each(function () {
                $(this).css("background-color", $(this).val());
            });

            var shapes = ["ellipse", "circle", "database", "box", "text", "diamond", "dot", "star", "triangle", "triangleDown", "hexagon", "square"];
            common.fillSelectOptions("lineage_selection_decorate_shapeSelect", shapes, true);
        });
    };

    self.decorateGraphNodes = function () {
        function decorate(nodes) {
            var newIds = [];

            var color = $("#lineage_selection_decorate_colorSelect").val();
            var shape = $("#lineage_selection_decorate_shapeSelect").val();
            var size = $("#lineage_selection_decorate_sizeInput").val();
            var existingNodes = visjsGraph.getExistingIdsMap();
            nodes.forEach(function (nodeId) {
                if (!existingNodes[nodeId]) {
                    return;
                }
                var obj = { id: nodeId };
                if (color) {
                    obj.color = color;
                }
                if (shape) {
                    obj.shape = shape;
                }
                if (size) {
                    obj.size = size;
                }
                newIds.push(obj);
            });
            $("#LineagePopup").dialog("close");
            visjsGraph.data.nodes.update(newIds);
        }

        var selectedNodes = $("#lineageQuery_listResultDivTree").jstree().get_selected(true);
        if (selectedNodes.length > 1) {
            decorate(selectedNodes);
        } else if (self.currentTreeNode.children.length > 0) {
            var selectedNodes = [];
            self.currentTreeNode.children.forEach(function (childId) {
                selectedNodes.push(childId);
            });
            decorate(selectedNodes, 1);
        } else {
            decorate([self.currentTreeNode.id]);
        }
    };
    self.onColumnSelect = function () {
        var node = $("#LineageQuery_SQL_columnsTree").jstree().get_selected(true)[0];
        self.currentColumn = node.data.column;
        self.currentTable = node.data.table;
        $("#LineageQuery_createFilterDiv").css("display", "block");
        $("#LineageQuery_ExecuteDiv").css("display", "block");

        $("#LineageQuery_filteringColumn").html(self.currentColumn);
    };

    self.fillColumnValuesSelect = function () {
        if (self.currentTable == "#") {
            return;
        }
        self.getColumnValues(self.currentTable, self.currentColumn, function (err, data) {
            if (data.size >= self.dataSizeLimit) {
                return alert("too many values");
            }

            common.fillSelectOptions("LineageQuery_valuesSelect", data, true, self.currentColumn, self.currentColumn);
            $("#LineageQuery_operator").val("=");
        });
    };
    self.onColumnValuesSelect = function () {
        var value = $("#LineageQuery_valuesSelect").val();
        $("#LineageQuery_value").val(value);
        $("#LineageQuery_operator").val("=");
    };

    self.getColumnValues = function (table, column, callback) {
        self.dataSizeLimit = 1000;
        var sqlQuery = " select distinct column from " + table + " limit " + self.dataSizeLimit;
        if (self.queryContext.currentDataSource.type == "sql.sqlserver") {
            sqlQuery = " select distinct  " + column + " from " + table;
        }

        const params = new URLSearchParams({
            type: self.queryContext.currentDataSource.type,
            dbName: self.queryContext.currentDataSource.dbName,
            sqlQuery: sqlQuery,
        });

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/kg/data?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                if (callback) {
                    return callback(null, data);
                }
            },
            error(err) {
                if (callback) {
                    return callback(null);
                }
            },
        });
    };

    self.displayResultToTable = function (data) {
        var dataSet = [];
        var cols = [];

        if (true) {
            allSelectColumns = [];
            for (var column in data[0]) {
                if (allSelectColumns.indexOf(column) < 0) {
                    cols.push({ title: column, defaultContent: "" });
                    allSelectColumns.push(column);
                }
            }

            data.forEach(function (item) {
                var line = [];
                allSelectColumns.forEach(function (column) {
                    line.push(item[column] || "");
                });
                dataSet.push(line);
            });
        }

        $("#LineageLinkedDataQuery_tabs").tabs("option", { active: 2 });
        Export.showDataTable("LineageLinkedDataQuery_tableResult", cols, dataSet, null);
    };

    self.displayResultToVisjsGraph = function (data) {
        var currentDatabase = self.currentDatabase;
        var fromClass = self.databasesMap[currentDatabase].fromClass;
        var toClass = self.databasesMap[currentDatabase].toClass;

        var visjsData = { nodes: [], edges: [] };
        var existingNodes = visjsGraph.getExistingIdsMap();

        if (!existingNodes[fromClass.classId]) {
            existingNodes[fromClass.classId] = 1;
            visjsData.nodes.push({
                id: fromClass.classId,
                label: fromClass.classLabel,
                shape: Lineage_classes.defaultShape,
                color: Lineage_classes.getSourceColor(Lineage_sources.activeSource),
                data: {
                    id: fromClass.classId,
                    label: fromClass.label,
                    source: Lineage_sources.activeSource,
                    type: "class",
                },
            });
        }
        if (!existingNodes[toClass.classId]) {
            existingNodes[toClass.classId] = 1;
            visjsData.nodes.push({
                id: toClass.classId,
                label: toClass.classLabel,
                shape: Lineage_classes.defaultShape,
                color: Lineage_classes.getSourceColor(Lineage_sources.activeSource),
                data: {
                    id: toClass.classId,
                    label: toClass.label,
                    source: Lineage_sources.activeSource,
                    type: "class",
                },
            });
        }
        var primaryKeyFromColumn = null;
        var primaryKeyToColumn = null;
        for (var columnAlias in data[0]) {
            var array = columnAlias.split(",");
            if (array.length == 3) {
                if (array[0] == fromClass.classLabel) {
                    primaryKeyFromColumn = columnAlias;
                } else if (array[0] == toClass.classLabel) {
                    primaryKeyToColumn = columnAlias;
                }
            }
        }
        data.forEach(function (item) {
            var idFrom = item[primaryKeyFromColumn];
            var idTo = item[primaryKeyToColumn];

            if (!existingNodes[idFrom]) {
                existingNodes[idFrom] = 1;
                visjsData.nodes.push({
                    id: idFrom,
                    label: idFrom,
                    shape: "square",
                    size: Lineage_classes.defaultShapeSize,
                    color: "brown",
                    data: {
                        id: idFrom,
                        label: idFrom,
                        source: self.currentDatabase,
                        type: "linkedSQLdata",
                    },
                });
            }

            if (!existingNodes[idTo]) {
                existingNodes[idTo] = 1;
                visjsData.nodes.push({
                    id: idTo,
                    label: idTo,
                    shape: "square",
                    size: Lineage_classes.defaultShapeSize,
                    color: "grey",
                    data: {
                        id: idTo,
                        label: idTo,
                        source: self.currentDatabase,
                        type: "linkedSQLdata",
                    },
                });
            }
            var edgeId = idFrom + "_" + fromClass.classId;
            if (!existingNodes[edgeId]) {
                existingNodes[edgeId] = 1;
                visjsData.edges.push({
                    id: edgeId,
                    from: idFrom,
                    to: fromClass.classId,
                    arrows: {
                        to: {
                            enabled: true,
                            type: "solid",
                            scaleFactor: 0.5,
                        },
                    },
                    color: Lineage_classes.defaultEdgeColor,
                });
            }
            var edgeId = idTo + "_" + toClass.classId;
            if (!existingNodes[edgeId]) {
                existingNodes[edgeId] = 1;
                visjsData.edges.push({
                    id: edgeId,
                    from: idTo,
                    to: toClass.classId,
                    arrows: {
                        to: {
                            enabled: true,
                            type: "solid",
                            scaleFactor: 0.5,
                        },
                    },
                    color: Lineage_classes.defaultEdgeColor,
                });
            }
            var edgeId = idFrom + "_" + idTo;
            if (!existingNodes[edgeId]) {
                existingNodes[edgeId] = 1;
                visjsData.edges.push({
                    id: edgeId,
                    from: idFrom,
                    to: idTo,
                    arrows: {
                        to: {
                            enabled: true,
                            type: "solid",
                            scaleFactor: 0.5,
                        },
                    },
                    dashes: true,
                    color: "blue",
                    data: {
                        id: edgeId,
                        source: self.currentDatabase,
                        type: "linkedSQLdataEdge",
                    },
                });
            }
        });

        if (!visjsGraph.data || !visjsGraph.data.nodes) {
            self.drawNewGraph(visjsData);
        }
        visjsGraph.data.nodes.add(visjsData.nodes);
        visjsGraph.data.edges.add(visjsData.edges);
        visjsGraph.network.fit();
        $("#waitImg").css("display", "none");
    };

    self.copySqlToClipboard = function () {
        var sql = $("#LineageQuery_SqlDiv").html();
        common.copyTextToClipboard(sql);
    };
    self.stackContext = function () {
        self.queryContexts.push(self.queryContext);
    };

    self.clearQuery = function () {
        self.queryContexts = {};
        $("#LineageQuery_SqlDiv").html("");
        $("#LineageQuery_SQL_columnsTree").jstree().uncheck_all();
        self.onSelectRelation(self.currentRelation);
    };

    self.viewSQL = function () {
        $("#LineageQuery_SqlDivWrapper").css("display", "block");
    };

    return self;
})();



export default Lineage_query

window.Lineage_query=Lineage_query;