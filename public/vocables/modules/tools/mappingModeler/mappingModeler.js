import Axiom_activeLegend from "../axioms/axiom_activeLegend.js";
import KGcreator from "../KGcreator/KGcreator.js";
import SourceSelectorWidget from "../../uiWidgets/sourceSelectorWidget.js";
import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import Axioms_graph from "../axioms/axioms_graph.js";
import Axioms_suggestions from "../axioms/axioms_suggestions.js";
import CommonBotFunctions from "../../bots/_commonBotFunctions.js";
import common from "../../shared/common.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import Clipboard from "../../shared/clipboard.js";
import KGcreator_graph from "../KGcreator/KGcreator_graph.js";
import SimpleListFilterWidget from "../../uiWidgets/simpleListFilterWidget.js";

// imports React app
import("/assets/mappingModeler_upload_app.js");

var MappingModeler = (function () {
    var self = {};
    self.currentSource = null;
    self.currentDataSource = null;
    self.graphDiv = "mappingModeler_graphDiv";
    self.legendItemsArray = [
        { label: "Table", color: "#375521", shape: "ellipse" },
        { label: "Column", color: "#cb9801", shape: "ellipse" },
        { label: "RowIndex", color: "#cb9801", shape: "triangle" },
        { label: "VirtualColumn", color: "#cb9801", shape: "square" },

        { label: "Class", color: "#00afef", shape: "box" },
    ];

    self.umountKGUploadApp = null;
    self.createApp = null;

    self.uploadFormData = {
        displayForm: "", // can be database, file or ""
        currentSource: "",
        selectedDatabase: "",
        selectedFiles: [],
    };

    self.displayUploadApp = function (displayForm) {
        self.uploadFormData.displayForm = displayForm;
        //   return   $.getScript("/kg_upload_app.js");
        if (!displayForm) {
            return;
        }
        var html = ' <div style="width:500px;height: 400px" id="mount-mappingModeler-upload-app-here"></div>';
        $("#smallDialogDiv").html(html);

        $("#smallDialogDiv").dialog({
            open: function (event, ui) {
                if (self.createApp === null) {
                    throw new Error("React app is not ready");
                }

                self.uploadFormData.currentSource = self.currentSource;

                self.umountKGUploadApp = self.createApp(self.uploadFormData);
            },
            beforeClose: function () {
                self.umountKGUploadApp();
                KGcreator.currentSlsvSource = self.currentSource;
                KGcreator.getSlsvSourceConfig(self.currentSource, function (err, result) {
                    if (err) {
                        return err;
                    }

                    KGcreator.currentConfig = result;
                });
            },
        });
        $("#smallDialogDiv").dialog("open");
    };
    self.onLoaded = function () {
        async.series([
            //init source
            /*function(callbackSeries) {
                    SourceSelectorWidget.initWidget(["OWL"], "mainDialogDiv", true, function(source) {
                        var source = SourceSelectorWidget.getSelectedSource()[0];
                        $("#mainDialogDiv").dialog("close");

                            self.currentSource = source;

                        return callbackSeries();
                    });
                },*/
            function (callbackSeries) {
                self.currentSource = MainController.currentSource;
                self.initResourcesMap(self.currentSource);
                return callbackSeries();
            },

            function (callbackSeries) {
                KGcreator.currentSlsvSource = self.currentSource;
                KGcreator.getSlsvSourceConfig(self.currentSource, function (err, result) {
                    if (err) {
                        return callbackSeries(err);
                    }

                    KGcreator.currentConfig = result;
                    return callbackSeries();
                });
            },

            function (callbackSeries) {
                $("#lateralPanelDiv").load("./modules/tools/mappingModeler/html/mappingModelerLeftPanel.html", function (err) {
                    $("#graphDiv").load("./modules/tools/mappingModeler/html/mappingModeler_graphDiv.html", function (err) {
                        //$("#mainDialogDiv").dialog("open");
                        return callbackSeries();
                    });
                });
            },

            function (callbackSeries) {
                //var divId = "nodeInfosAxioms_activeLegendDiv";

                //    self.initActiveLegend(divId);

                return callbackSeries();
            },

            // load jstree
            function (callbackSeries) {
                var options = {
                    openAll: true,
                    selectTreeNodeFn: self.onDataSourcesJstreeSelect,
                    contextMenu: function (node, x) {
                        var items = {};
                        if (node.id == "databaseSources") {
                            items.addDatabaseSource = {
                                label: "addDatabaseSources",
                                action: function (_e) {
                                    self.displayUploadApp("database");
                                    // KGcreator.createDataBaseSourceMappings();
                                },
                            };
                            return items;
                        } else if (node.id == "csvSources") {
                            items.csvSources = {
                                label: "add Csv Sources",
                                action: function (_e) {
                                    // pb avec source
                                    self.displayUploadApp("file");
                                    // KGcreator.createCsvSourceMappings();
                                },
                            };
                            return items;
                        }
                    },
                };
                KGcreator.loadDataSourcesJstree("mappingModeler_jstreeDiv", options, function (err, result) {
                    return callbackSeries(err);
                });
            },
            //initDataSource
            function (callbackSeries) {
                return callbackSeries();
            },

            //init visjsGraph
            function (callbackSeries) {
                var visjsData = { nodes: [], edges: [] };
                self.drawGraphCanvas(self.graphDiv, visjsData, function () {
                    callbackSeries();
                });
            },
        ]);
    };

    self.onDataSourcesJstreeSelect = function (event, obj) {
        self.currentTreeNode = obj.node;

        //  KGcreator_run.getTableAndShowMappings();

        if (obj.node.data.type == "databaseSource") {
            KGcreator.initDataSource(obj.node.id, "databaseSource", obj.node.data.sqlType, obj.node.data.table);

            KGcreator.loadDataBaseSource(KGcreator.currentSlsvSource, obj.node.id, obj.node.data.sqlType);
        } else if (obj.node.data.type == "csvSource") {
            KGcreator.initDataSource(obj.node.id, "csvSource", obj.node.data.sqlType, obj.node.id);
            KGcreator.loadCsvSource(KGcreator.currentSlsvSource, obj.node.id, false, function (err, jstreeData) {
                if (err) {
                    return alert("file not found");
                }
                var columns = [];
                jstreeData.forEach(function (item) {
                    columns.push(item.data.id);
                });
                //self.hideForbiddenResources("Table");
                self.currentResourceType = "Column";
                self.currentTable = {
                    name: obj.node.id,
                    columns: columns,
                };
                common.fillSelectOptions("axioms_legend_suggestionsSelect", columns, false);
            });
            self.hideDataSources("nodeInfosAxioms_activeLegendDiv");
        } else if (obj.node.data.type == "table") {
            self.currentTable = {
                name: obj.node.data.label,
                columns: KGcreator.currentConfig.currentDataSource.tables[obj.node.data.id],
            };
            var table = obj.node.data.id;
            KGcreator.currentConfig.currentDataSource.currentTable = table;

            self.hideDataSources("nodeInfosAxioms_activeLegendDiv");
            self.hideForbiddenResources("Table");
            self.currentResourceType = "Column";
            common.fillSelectOptions("axioms_legend_suggestionsSelect", self.currentTable.columns, false);
        }
        self.currentDataSource = KGcreator.currentConfig.currentDataSource?.name;
    };
    self.hideDataSources = function (divId) {
        MappingModeler.switchDataSourcePanel("hide");
        self.initActiveLegend(divId);
        try {
            self.loadVisjsGraph();
        } catch (e) {}
    };
    self.initActiveLegend = function (divId) {
        var options = {
            onLegendNodeClick: self.onLegendNodeClick,
            showLegendGraphPopupMenu: self.showLegendGraphPopupMenu,
            xOffset: 300,
        };
        Axiom_activeLegend.isLegendActive = true;
        self.legendItems = {};
        self.legendItemsArray.forEach(function (item) {
            self.legendItems[item.label] = item;
        });

        Axiom_activeLegend.drawLegend("nodeInfosAxioms_activeLegendDiv", self.legendItemsArray, options);
    };

    self.hideForbiddenResources = function (resourceType) {
        var hiddenNodes = [];
        if (resourceType == "Table") {
            hiddenNodes.push("ObjectProperty");
            hiddenNodes.push("Class");
            hiddenNodes.push("Connective");
        }
        Axiom_activeLegend.hideLegendItems(hiddenNodes);
    };

    self.onSuggestionsSelect = function (resourceUri) {
        var newResource = null;
        var id = common.getRandomHexaId(8);
        if (resourceUri == "createClass") {
            return self.showCreateResourceBot("Class", null);
        } else if (resourceUri == "createObjectProperty") {
            return self.showCreateResourceBot("ObjectProperty", null);
        } else if (self.currentResourceType == "Column") {
            newResource = {
                id: id,
                label: resourceUri,
                shape: self.legendItems[self.currentResourceType].shape,
                color: self.legendItems[self.currentResourceType].color,
                level: 0,
                data: {
                    id: resourceUri,
                    label: resourceUri,
                    type: self.currentResourceType,
                    dataTable: self.currentTable.name,
                    datasource: self.currentDataSource,
                },
            };
            self.drawResource(newResource);
            setTimeout(function () {
                self.onLegendNodeClick({ id: "Class" });
            }, 500);
        } else if (self.currentResourceType == "Class") {
            var resource = self.allResourcesMap[resourceUri];
            newResource = {
                id: resourceUri,
                label: resource.label,
                shape: self.legendItems[self.currentResourceType].shape,
                color: self.legendItems[self.currentResourceType].color,
                data: {
                    id: resourceUri,
                    label: resource.label,
                    type: "Class",
                    source: resource.source,
                },
            };

            self.drawResource(newResource);
        } else if (self.currentResourceType == "RowIndex") {
            newResource = {
                id: id,
                label: "#",
                shape: self.legendItems[self.currentResourceType].shape,
                color: self.legendItems[self.currentResourceType].color,
                size: 12,
                data: {
                    id: id,
                    label: "#",

                    type: self.currentResourceType,
                    dataTable: self.currentTable.name,
                    datasource: self.currentDataSource,
                },
            };
            self.drawResource(newResource);
            setTimeout(function () {
                self.onLegendNodeClick({ id: "Class" });
            }, 500);
        } else if (self.currentResourceType == "VirtualColumn") {
            newResource = {
                id: id,
                label: resourceUri,
                shape: self.legendItems[self.currentResourceType].shape,
                color: self.legendItems[self.currentResourceType].color,
                size: 12,

                data: {
                    id: resourceUri,
                    label: resourceUri,
                    type: self.currentResourceType,
                    dataTable: self.currentTable.name,
                    datasource: self.currentDataSource,
                },
            };
            self.drawResource(newResource);
            setTimeout(function () {
                self.onLegendNodeClick({ id: "Class" });
            }, 500);
        } else if (self.currentResourceType == "ObjectProperty") {
            var smooth = null;
            var property = self.allResourcesMap[resourceUri];
            if (self.currentRelation) {
                self.currentRelation.data = { type: "Objectproperty", propId: resourceUri };

                var color = "#1244e8";
                // ObjectProperty
                if (self.allResourcesMap[resourceUri]) {
                    self.currentRelation.label = self.allResourcesMap[resourceUri].label;
                } else {
                    //other
                    smooth = { type: "curvedCW" };
                    self.currentRelation.label = resourceUri;
                    color = "#375521";
                }
                var edge = {
                    from: self.currentRelation.from.id,
                    to: self.currentRelation.to.id,
                    label: self.currentRelation.label,
                    arrows: {
                        to: {
                            enabled: true,
                            type: "diamond",
                        },
                    },
                    smooth: smooth,
                    data: {
                        id: resourceUri,
                        type: resourceUri,
                        source: property.source,
                    },
                    color: color,
                };
                self.visjsGraph.data.edges.add([edge]);
                self.currentRelation = null;
                $("#axioms_legend_suggestionsSelect").empty();
            }
        }
    };

    self.drawResource = function (newResource) {
        var graphDivWidth = $("#mappingModeler_graphDiv").width();
        var arrows = {
            to: {
                enabled: true,
                type: "arrow",
            },
        };
        var edgeColor = "#ccc";
        if (!self.currentOffest) {
            self.currentOffest = { x: -graphDivWidth / 2, y: 0 };
        }
        if (self.currentGraphNode && newResource.data.type == "Class") {
            newResource.x = self.currentGraphNode.x;
            newResource.y = self.currentGraphNode.y - 100;
        } else {
            newResource.x = self.currentOffest.x += 200;
            if (self.currentOffest.x > graphDivWidth) {
                self.currentOffest.y += 150;
            }
            newResource.y = self.currentOffest.y;
        }
        newResource.fixed = { x: true, y: true };

        var visjsData = { nodes: [], edges: [] };
        var visjsNode = newResource;
        if (newResource.data.type == "Class") {
            if (!self.objectIdExistsInGraph(newResource.data.id)) {
                visjsData.nodes.push(visjsNode);
            }
        } else {
            visjsData.nodes.push(visjsNode);
        }

        if (self.visjsGraph) {
            self.visjsGraph.data.nodes.add(visjsData.nodes);

            if (newResource.data.type == "Class" && self.currentGraphNode) {
                var label, type;
                if (self.currentGraphNode.data.type == "Class") {
                    label = "";
                    type = "rdfs:subClassOf";
                } else {
                    label = "a";
                    type = "rdf:type";
                }

                var edgeId = common.getRandomHexaId(5);
                visjsData.edges.push({
                    id: edgeId,
                    from: self.currentGraphNode.id,
                    label: label,
                    to: newResource.id,
                    width: 2,
                    data: { type: type },
                    arrows: arrows,
                    color: edgeColor,
                });

                //  self.updateCurrentGraphNode(visjsNode);
                self.visjsGraph.data.edges.add(visjsData.edges);
            }

            //
        } else {
            self.drawGraphCanvas(self.graphDiv, visjsData);
        }

        self.hideForbiddenResources(newResource.data.type);
        $("#axioms_legend_suggestionsSelect").empty();

        self.currentGraphNode = newResource;
    };

    self.objectIdExistsInGraph = function (id) {
        var items = self.visjsGraph.data.nodes.get();
        var exists = false;
        items.forEach(function (item) {
            if (item.data && item.data.id == id) {
                exists = true;
            }
        });
        return exists;
    };

    self.drawGraphCanvas = function (graphDiv, visjsData, callback) {
        self.graphOptions = {
            keepNodePositionOnDrag: true,
            /* physics: {
    enabled:true},*/

            visjsOptions: {
                edges: {
                    smooth: {
                        type: "cubicBezier",
                        // type: "diagonalCross",
                        forceDirection: "horizontal",
                        roundness: 0.4,
                    },
                },
            },

            onclickFn: MappingModeler.onVisjsGraphClick,
            onRightClickFn: MappingModeler.showGraphPopupMenu,
        };

        self.visjsGraph = new VisjsGraphClass(graphDiv, visjsData, self.graphOptions);
        self.visjsGraph.draw(function () {
            if (callback) {
                return callback();
            }
        });
    };

    self.onVisjsGraphClick = function (node, event, options) {
        self.currentGraphNode = node;

        //add relation between columns
        if (options.ctrlKey) {
            function getColumnClass(node) {
                var connections = self.visjsGraph.getFromNodeEdgesAndToNodes(node.id);

                var classId = null;
                connections.forEach(function (connection) {
                    if ((connection.edge.data.type = "rdf:type")) {
                        classId = connection.toNode.data.id;
                    }
                });
                return classId;
            }

            if (!self.currentRelation) {
                self.currentRelation = {
                    from: { id: node.id, classId: getColumnClass(node) },
                    to: null,
                    type: node.data.type,
                };
            } else {
                self.currentRelation.to = { id: node.id, classId: getColumnClass(node) };
                if (self.currentRelation.from.type != "Class" && node.data.type == "Class") {
                    self.graphActions.drawColumnToClassEdge(self.currentRelation);
                } else if (self.currentRelation.from.type != "Class" && node.data.type != "Class") {
                    self.onLegendNodeClick({ id: "ObjectProperty" });
                }
            }
        } else {
            self.currentRelation = null;
        }
    };

    self.showGraphPopupMenu = function (node, point, event) {
        if (!node) {
            return;
        }

        self.currentGraphNode = node;
        self.graphActions.outlineNode(node.id);

        if (!node) {
            return;
        }
        var html = "";
        if (node.from) {
            //edge
            html = '    <span class="popupMenuItem" onclick="MappingModeler.graphActions.removeNodeEdgeGraph();"> Remove Edge</span>';
        } else {
            html = '    <span class="popupMenuItem" onclick="MappingModeler.graphActions.removeNodeFromGraph();"> Remove Node</span>';
        }
        if (node.data) {
            html += '    <span class="popupMenuItem" onclick="MappingModeler.graphActions.showNodeInfos()">Node Infos</span>';
            if (node.data.type == "Class") {
                html += '    <span class="popupMenuItem" onclick="MappingModeler.graphActions.addSuperClassToGraph()">draw superClass</span>';
            }
        }

        $("#popupMenuWidgetDiv").html(html);
        point.x = event.x;
        point.y = event.y;
        PopupMenuWidget.showPopup(point, "popupMenuWidgetDiv");
    };

    self.graphActions = {
        outlineNode: function (nodeId) {
            self.visjsGraph.decorateNodes(null, { borderWidth: 1 });
            self.visjsGraph.decorateNodes(nodeId, { borderWidth: 5 });
        },
        removeNodeFromGraph: function () {
            if (confirm("delete node")) {
                var edges = self.visjsGraph.network.getConnectedEdges(self.currentGraphNode.id);
                self.visjsGraph.data.edges.remove(edges);
                self.visjsGraph.data.nodes.remove(self.currentGraphNode.id);
            }
        },

        removeNodeEdgeGraph: function () {
            if (confirm("delete edge")) {
                self.visjsGraph.data.edges.remove(self.currentGraphNode.id);
            }
        },
        addSuperClassToGraph: function () {
            var options = {
                filter: " ?object rdf:type owl:Class",
                withImports: true,
            };
            Sparql_OWL.getFilteredTriples(self.currentSource, self.currentGraphNode.data.id, "http://www.w3.org/2000/01/rdf-schema#subClassOf", null, options, function (err, result) {
                if (err) {
                    return alert(err);
                }
                if (result.length == 0) {
                    return alert("no superClass");
                }
                var item = result[0];

                var newResource = {
                    id: item.object.value,
                    label: item.objectLabel.value,
                    shape: self.legendItems["Class"].shape,
                    color: self.legendItems["Class"].color,
                    data: {
                        id: item.object.value,
                        label: item.objectLabel.value,
                        type: "Class",
                    },
                };

                self.drawResource(newResource);
            });
        },

        drawColumnToClassEdge: function () {
            if (!self.currentRelation) {
                return;
            }
            var edges = [
                {
                    from: self.currentRelation.from.id,
                    to: self.currentRelation.to.id,
                    label: "a",
                    color: "ddd",
                    width: 2,
                    arrows: {
                        to: {
                            enabled: true,
                            type: "arrow",
                        },
                    },
                    data: { type: "rdf:type" },
                },
            ];

            self.visjsGraph.data.edges.add(edges);
            self.currentRelation = null;
        },

        showNodeInfos: function () {
            if (["Column", "RowIndex", "VirtualColumn"].indexOf(self.currentGraphNode.data.type) > -1) {
                return $("#smallDialogDiv").load("./modules/tools/mappingModeler/html/mappingColumnInfos.html", function () {
                    $("#smallDialogDiv").dialog("open");
                    self.mappingColumnInfo.editColumnInfos();
                    self.mappingColumnInfo.columnClass = self.getColumnType(self.currentGraphNode.id);
                    self.showDatatypeGraph(self.currentGraphNode.label);
                });
            } else {
                NodeInfosWidget.showNodeInfos(self.currentGraphNode.data.source, self.currentGraphNode, "smallDialogDiv");
            }
        },
    };
    self.mappingColumnInfo = {
        editColumnInfos: function () {
            var data = self.currentGraphNode.data;

            if (!data.uriType) {
                // showBot
                var params = {
                    title: "" + data.label,
                    columns: self.currentTable.columns,
                };

                MappingModeler_bot.start(MappingModeler_bot.workflowMappingDetail, params, function (err, result) {
                    var params = MappingModeler_bot.params;
                    data.uriType = params.URItype;
                    data.rdfType = params.rdfType;
                    (data.rdfsLabel = params.rdfsLabel), self.visjsGraph.data.nodes.update({ id: self.currentGraphNode.id, data: data });
                    self.mappingColumnInfo.editColumnInfos();
                    self.showDatatypeGraph(self.currentGraphNode.label);
                });
            }

            self.mappingColumnEditor = new JsonEditor("#mappingColumnJonEditor", data);
        },
        save: function () {
            var data = self.mappingColumnEditor.get();
            self.currentGraphNode.data = data;
            self.visjsGraph.data.nodes.update({ id: self.currentGraphNode.id, data: data });
            $("#smallDialogDiv").dialog("close");
            self.saveVisjsGraph();
            self.showDatatypeGraph(self.currentGraphNode.label);
        },

        startOtherPredicatesBot: function () {
            var params = {
                source: self.currentSource,
                columns: self.currentTable.columns,
                title: "" + self.currentTable.name,
                columnClass: self.mappingColumnInfo.columnClass,
            };

            MappingModeler_bot.start(MappingModeler_bot.workflowColumnmMappingOther, params, function (err, result) {
                var params = MappingModeler_bot.params;
                var data = self.mappingColumnEditor.get();
                if (params.nonObjectPropertyId) {
                    if (!data.otherPredicates) {
                        data.otherPredicates = [];
                    }
                    data.otherPredicates.push({
                        property: params.nonObjectPropertyId,
                        object: params.predicateObjectColumn,
                        range: Config.ontologiesVocabularyModels[params.nonObjectPropertyVocab].nonObjectProperties[params.nonObjectPropertyId].range,
                        dateFormat: params.nonObjectPropertyDateFormat || null, //if any
                    });
                    self.visjsGraph.data.nodes.update({ id: self.currentGraphNode.id, data: data });
                    //  self.mappingColumnInfo.editColumnInfos()
                    self.mappingColumnEditor = new JsonEditor("#mappingColumnJonEditor", data);
                    self.showDatatypeGraph(self.currentGraphNode.label);
                }
            });
        },
    };

    self.onLegendNodeClick = function (node, event) {
        if (!node) {
            return;
        }
        self.currentResourceType = node.id;

        if (self.currentResourceType == "Column") {
            common.fillSelectOptions("axioms_legend_suggestionsSelect", self.currentTable.columns, false);
        } else if (self.currentResourceType == "Class") {
            //   self.hideLegendItems();
            var newObject = { id: "createClass", label: "_Create new Class_" };
            self.getAllClasses(self.currentSource, function (err, classes) {
                if (err) {
                    return alert(err);
                }
                if (classes[0].id != "createClass") {
                    self.setSuggestionsSelect(classes, false, newObject);
                } else {
                    self.setSuggestionsSelect(classes, false);
                }
            });
        } else if (self.currentResourceType == "ObjectProperty") {
            //   self.hideLegendItems();
            var newObjects = [
                { id: "createObjectProperty", label: "_Create new ObjectProperty_" },
                { id: "rdfs:member", label: "_rdfs:member_" },
            ];
            Axioms_suggestions.getValidPropertiesForClasses(self.currentSource, self.currentRelation.from.classId, self.currentRelation.to.classId, function (err, properties) {
                if (err) {
                    return alert(err);
                }
                properties.forEach(function (item) {
                    item.label = item.source.substring(0, 3) + ":" + item.label;
                });
                properties = common.array.sort(properties, "label");
                self.setSuggestionsSelect(properties, false, newObjects);
            });
        } else if (self.currentResourceType == "RowIndex") {
            self.onSuggestionsSelect({ id: "RowIndex" });
        } else if (self.currentResourceType == "VirtualColumn") {
            var columnName = prompt("Virtual column name");
            if (columnName) {
                self.onSuggestionsSelect(columnName);
            }
        }
    };

    self.showLegendGraphPopupMenu = function () {};

    self.switchDataSourcePanel = function (target) {
        if (target == "show") {
            $("#mappingModeler_jstreeDiv").css("display", "block");
            $("#mappingModeler_mainDiv").css("display", "none");
            $("#mappingModeler_graphPanelDiv").css("display", "none");
        } else {
            $("#mappingModeler_jstreeDiv").css("display", "none");
            $("#mappingModeler_mainDiv").css("display", "block");
            $("#mappingModeler_graphPanelDiv").css("display", "block");
        }
    };
    self.getAllClasses = function (source, callback) {
        if (!source) {
            source = self.currentSource;
        }
        if (!self.allClasses) {
            CommonBotFunctions.listSourceAllClasses(source, null, false, [], function (err, result) {
                if (err) {
                    return callback(err.responseText);
                }
                self.allClasses = [];
                var uniqueIds = {};
                result.forEach(function (item) {
                    if (!uniqueIds[item.id]) {
                        uniqueIds[item.id] = 1;
                        item.label = item.label; //.replace(/ /g, "_");
                        item.resourceType = "Class";
                        self.allClasses.push(item);
                    }
                });
                self.allClasses.forEach(function (item) {
                    item.label = item.source.substring(0, 3) + ":" + item.label;
                });
                self.allClasses = common.array.sort(self.allClasses, "label");
                common.array.sort(self.allClasses, "label");
                if (callback) {
                    return callback(null, self.allClasses);
                }
                return self.allClasses;
            });
        } else {
            if (callback) {
                return callback(null, self.allClasses);
            }
            return self.allClasses;
        }
    };
    self.getAllProperties = function (source, callback) {
        if (!source) {
            source = self.currentSource;
        }

        if (!self.allProperties) {
            CommonBotFunctions.listSourceAllObjectProperties(source, null, false, function (err, result) {
                if (err) {
                    return callback(err.responseText);
                }
                self.allProperties = [];
                var uniqueIds = {};
                result.forEach(function (item) {
                    if (!uniqueIds[item.id]) {
                        uniqueIds[item.id] = 1;

                        item.label = item.label; //,.replace(/ /g, "_");
                        item.resourceType = "ObjectProperty";
                        self.allProperties.push(item);
                    }
                });
                common.array.sort(self.allProperties, "label");
                if (callback) {
                    return callback(null, self.allProperties);
                }
                return self.allProperties;
            });
        } else {
            if (callback) {
                return callback(null, self.allProperties);
            }
            return self.allProperties;
        }
    };
    self.hideLegendItems = function (hiddenNodes) {
        var legendNodes = Axiom_activeLegend.data.nodes.getIds();
        var newNodes = [];
        legendNodes.forEach(function (nodeId) {
            var hidden = !hiddenNodes || hiddenNodes.indexOf(nodeId) > -1;
            newNodes.push({ id: nodeId, hidden: hidden });
        });
        self.visjsGraph.data.nodes.update(newNodes);
    };

    /*
       if unique, filters exiting nodes in graph before showing list
       *
        */
    self.setSuggestionsSelect = function (items, unique, newOptions, drawGraphFn) {
        if (unique) {
            var existingNodeIds = self.visjsGraph.data.nodes.getIds();
            var filteredItems = [];
            items.forEach(function (item) {
                if (existingNodeIds.indexOf(item.id) < 0) {
                    filteredItems.push(item);
                }
            });
        } else {
            filteredItems = items;
        }
        if (newOptions) {
            if (!Array.isArray(newOptions)) {
                newOptions = [newOptions];
            }
            newOptions.forEach(function (newOption, index) {
                filteredItems.splice(index, 0, newOption);
            });
        }
        common.fillSelectOptions("axioms_legend_suggestionsSelect", filteredItems, false, "label", "id");
    };

    self.initResourcesMap = function (source, callback) {
        self.allResourcesMap = {};
        self.allClasses = null;
        self.allProperties = null;

        self.getAllClasses(source, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.forEach(function (item) {
                self.allResourcesMap[item.id] = item;
            });
        });
        self.getAllProperties(source, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.forEach(function (item) {
                self.allResourcesMap[item.id] = item;
            });
            if (callback) {
                return callback(err, result);
            }
        });
    };

    self.clearMappings = function () {
        self.visjsGraph.clearGraph();
        $("#" + self.graphDivId).html("");
        self.visjsGraph = null;
        var visjsData = { nodes: [], edges: [] };
        self.drawGraphCanvas(self.graphDiv, visjsData, function () {});
    };
    self.saveMappings = function () {
        $("#" + self.graphDivId).html("");
    };

    self.showCreateResourceBot = function (resourceType, filteredUris) {
        var botWorkFlow;
        if (resourceType == "Class") {
            botWorkFlow = CreateAxiomResource_bot.workflowNewClass;
            // Axiom_manager.allClasses=null;
        } else if (resourceType == "ObjectProperty") {
            botWorkFlow = CreateAxiomResource_bot.workflowNewObjectProperty;
            //  Axiom_manager.allProperties=null;
        } else {
            return alert("no valid resourceType");
        }
        var params = { source: self.currentSource, filteredUris: filteredUris };
        return CreateAxiomResource_bot.start(botWorkFlow, params, function (err, result) {
            if (err) {
                return alert(err);
            }
            CreateAxiomResource_bot.params.newObject.label = self.currentSource.substring(0, 3) + ":" + CreateAxiomResource_bot.params.newObject.label;
            // update Axiom_manager
            if (resourceType == "Class") {
                self.allClasses.push(CreateAxiomResource_bot.params.newObject);
            } else if (resourceType == "ObjectProperty") {
                self.allProperties.push(CreateAxiomResource_bot.params.newObject);
            }
            self.allResourcesMap[CreateAxiomResource_bot.params.newObject.id] = CreateAxiomResource_bot.params.newObject;

            $("#axioms_legend_suggestionsSelect option").eq(0).before($("<option></option>").val(CreateAxiomResource_bot.params.newObject.id).text(CreateAxiomResource_bot.params.newObject.label));
            //   self.onLegendNodeClick({data:{id:"Class"}})
        });
    };
    self.generateBasicContentMappingContent = function () {
        var nodesMap = {};
        var nodes = self.visjsGraph.data.nodes.get();

        nodes.forEach(function (node) {
            nodesMap[node.id] = node;
        });

        var columnsMap = {};
        nodes.forEach(function (node, callbackEach) {
            if (node.data.type == "Class") {
                return;
            }

            columnsMap[node.id] = node;
        });
        var x = columnsMap;
        var json = self.mappingsToKGcreatorJson(columnsMap);
        return json;
    };

    self.getColumnType = function (nodeId) {
        var connections = self.visjsGraph.getFromNodeEdgesAndToNodes(nodeId);
        var type = null;
        connections.forEach(function (connection) {
            if (connection.edge.data.type == "rdf:type" && connection.toNode.data.id.indexOf("http") > -1) {
                type = connection.toNode.data.id;
            }
        });
        return type;
    };

    self.generateBasicMappings = function () {
        var json = self.generateBasicContentMappingContent();

        $("#smallDialogDiv").html(
            '<button class="w3-button nodesInfos-iconsButtons " style="font-size: 10px;margin-left:7px;" onclick=" MappingModeler.copyKGcreatorMappings()"><input type="image" src="./icons/CommonIcons/CopyIcon.png"></button>' +
                ' <textarea id="mappingModeler_infosTA" style="display: block;width:800px;height: 500px;overflow: auto;"> </textarea>'
        );
        $("#smallDialogDiv").dialog("open");
        $("#mappingModeler_infosTA").val(JSON.stringify(json, null, 2));
    };
    self.nodeToKGcreatorColumnName = function (data) {
        var colname;
        if (data.uriType == "blankNode" || !data.rdfsLabel) {
            colname = data.id + "_$";
        } else if (data.uriType == "randomIdentifier") {
            colname = data.id + "_£";
        } else if (data.uriType == "fromColumnTitle") {
            colname = data.id;
        }

        if (data.type == "VirtualColumn") {
            colname = "@" + colname;
        }
        return colname;
    };
    self.mappingsToKGcreatorJson = function (columnsMap) {
        var columnsMapLabels = Object.values(columnsMap).map(function (column) {
            return column.label;
        });
        var allMappings = {};

        for (var nodeId in columnsMap) {
            var data = columnsMap[nodeId].data;
            var subject = self.nodeToKGcreatorColumnName(data);
            if (!allMappings[data.dataTable]) {
                allMappings[data.dataTable] = { tripleModels: [] };
            }
            if (data.rdfType) {
                var predicate = "rdf:type";
                if (data.rdfType == "owl:Class") predicate = "rdfs:subClassOf";
                allMappings[data.dataTable].tripleModels.push({
                    s: subject,
                    p: predicate,
                    o: data.rdfType,
                });
            }

            if (data.rdfsLabel) {
                allMappings[data.dataTable].tripleModels.push({
                    s: subject,
                    p: "rdfs:label",
                    o: data.rdfsLabel,
                    isString: true,
                });
            }
            if (data.transform) {
                if (!allMappings[data.dataTable].transform) {
                    allMappings[data.dataTable].transform = {};
                }
                allMappings[data.dataTable].transform[data.label] = data.transform;
            }

            var connections = self.visjsGraph.getFromNodeEdgesAndToNodes(nodeId);

            connections.forEach(function (connection) {
                var property = connection.edge.data.type;
                var object = connection.toNode.data.id;
                if (columnsMapLabels.includes(object)) {
                    object = self.nodeToKGcreatorColumnName(
                        Object.values(columnsMap).filter(function (node) {
                            return object == node.label;
                        })[0].data
                    );
                }
                allMappings[data.dataTable].tripleModels.push({
                    s: subject,
                    p: property,
                    o: object,
                });
            });
            if (data.otherPredicates) {
                data.otherPredicates.forEach(function (predicate) {
                    var triple = {
                        s: subject,
                        p: predicate.property,
                        o: predicate.object,
                    };

                    if (predicate.range) {
                        if (predicate.range.indexOf("Resource") > -1) {
                            triple.isString = true;
                        } else {
                            triple.dataType = predicate.range;
                        }
                    } else {
                        triple.isString = true;
                    }
                    if (predicate.dateFormat) {
                        triple.dateFormat = predicate.dateFormat;
                    }

                    allMappings[data.dataTable].tripleModels.push(triple);
                });
            }
        }

        var json = allMappings;

        return json;
    };
    self.nodeToKGcreatorColumnName = function (data) {
        var colname;
        if (data.uriType == "blankNode" || !data.rdfsLabel) {
            colname = data.id + "_$";
        } else if (data.uriType == "randomIdentifier") {
            colname = data.id + "_£";
        } else if (data.uriType == "fromColumnTitle") {
            colname = data.id;
        }

        if (data.type == "VirtualColumn") {
            colname = "@" + colname;
        }
        return colname;
    };

    self.copyKGcreatorMappings = function () {
        var text = $("#mappingModeler_infosTA").val();
        $("#mappingModeler_infosTA").focus();
        common.copyTextToClipboard(text);
    };

    self.saveVisjsGraph = function () {
        self.visjsGraph.saveGraph("mappings_" + self.currentSource + "_" + self.currentDataSource + "_" + self.currentTable.name, true);
        self.visjsGraph.saveGraph("mappings_" + self.currentSource + "_ALL" + ".json", true);
    };

    self.loadVisjsGraph = function () {
        self.clearMappings();
        setTimeout(function () {
            self.visjsGraph.loadGraph("mappings_" + self.currentSource + "_ALL" + ".json");
            //    self.visjsGraph.loadGraph("mappings_" + self.currentSource + "_" + self.currentDataSource + "_" + self.currentTable.name + ".json");
            setTimeout(function () {
                self.visjsGraph.network.fit();
                var maxX = 0;
                var maxY = 0;
                self.visjsGraph.data.nodes.get().forEach(function (node) {
                    maxX = Math.max(node.x, maxX);
                    maxY = Math.max(node.y, maxY);
                });
                self.currentOffest = { y: maxY, x: maxX };
            }, 500);
        }, 500);
    };

    self.classDialogData = {};

    self.classesDialog = function (divId) {
        if (!divId) {
            divId = "mainDialogDiv";
        }
        $("#mainDialogDiv").load("./modules/tools/mappingModeler/html/classesDialog.html", function () {
            $("#mainDialogDiv").dialog("open");

            //self.addRowClass();
            self.calculateColumnMappingsFromGraph();
            Object.keys(self.classDialogData).forEach(function (column) {
                self.addRowClass(column);
            });
        });
    };
    self.calculateColumnMappingsFromGraph = function () {
        var graphNodes = MappingModeler.visjsGraph.data.nodes.get();
        var edges = MappingModeler.visjsGraph.data.edges.get();
        var notClassNodes = graphNodes.filter(function (item) {
            return item.data.type != "Class";
        });
        notClassNodes.forEach(function (item) {
            var Column = { id: item.id, label: item.data.label };
            var typeId = edges.filter(function (edge) {
                return edge.from == Column.id && edge.label == "a";
            })[0].to;
            var type = graphNodes.filter(function (node) {
                return node.id == typeId;
            })[0].data;
            var properties = edges.filter(function (edge) {
                return edge.from == Column.id && edge.label != "a";
            });

            if (item.data.type == "RowIndex") {
                Column.label = "rowIndex";
            }
            if (!self.classDialogData[Column.label]) {
                self.classDialogData[Column.label] = {};
            }
            self.classDialogData[Column.label].type = type;
            self.classDialogData[Column.label].properties = properties;
            if (item.data.type == "VirtualColumn") {
                self.classDialogData[Column.label].isVirtualColumn = "true";
            }
        });
    };
    self.addRowClass = function (column) {
        /*var classIndexes=Object.keys(self.classDialogData);

            if(classIndexes.length>0){

                var rowIndex=parseInt(classIndexes[classIndexes.length-1])+1;
            }
            else{
                var rowIndex=0;
            }*/
        //self.classDialogData[rowIndex]={Column:'',Type:'',Label:'',DatatypeProperties:{},Transform:{}};

        $("#classDefineColumn").append(`<span id='class-column-${column}'> ${column} </span> `);
        $("#classDefineType").append(`<span id='class-type-${column}' >${self.allResourcesMap[self.classDialogData[column].type.id].label} </span>  `);
        $("#classDefineRDFType").append(`<select id='class-RDFType-${column}' style='padding:2px 2px'> </select>  `);
        $("#classDefineLabel").append(`<select id='class-label-${column}' style='padding:2px 2px'> <select> `);
        $("#classURIType").append(`<select id='class-URITType-${column}' style='padding:2px 2px'> </select>  `);
        $("#classDefineDatatypeProperty").append(
            `<button class='slsv-button-1' id='class-datatype-${column}' style='padding:2px 2px;margin:0px;' onclick='MappingModeler.datatypePropertiesDefine("${column}")'> Datatype </button>   `
        );
        $("#classDefineSample").append(
            `<button class='slsv-button-1' id='class-sample-${column}' style='padding:2px 2px;margin:0px;' onclick='MappingModeler.sampleData("${column}")'> Sample</button> `
        );
        $("#classDefineTransform").append(`<button class='slsv-button-1' id='class-transform-${column}' style='padding:2px 2px;margin:0px;'> Fn</button>  `);
        //$('#classDefineClose').append(`<button class='slsv-button-1' id='class-close-${column}' style='padding:2px 2px;margin:0px;'> X</button>  `)
        var columns = JSON.parse(JSON.stringify(self.currentTable.columns));

        let index = columns.indexOf(column);
        if (index > -1) {
            columns.splice(index, 1);
            columns.unshift(column);
        }

        var URITType = ["fromLabel", "blankNode", "randomIdentifier"];
        var rdfObjectsType = ["owl:NamedIndividual", "rdf:Bag", "owl:Class"];
        // to comment and to sort by similarity for others than rowIndex

        common.fillSelectOptions(`class-label-${column}`, columns, false);
        common.fillSelectOptions(`class-RDFType-${column}`, rdfObjectsType, false);
        common.fillSelectOptions(`class-URITType-${column}`, URITType, false);
    };
    self.datatypePropertiesDefine = function (column) {
        var graphNodes = MappingModeler.visjsGraph.data.nodes.get();
        self.currentGraphNode = graphNodes.filter(function (node) {
            return node.data.label == column;
        })[0];
        self.graphActions.showNodeInfos();
    };
    self.sampleData = function (column) {
        if (!column) {
            return;
        }
        //rajouter toutes les colonnes en lien avec celle la et mettre celle qui nous intéresse en premier
        KGcreator.showSampleData(self.currentTreeNode, column);
    };

    self.saveDefineClass = function () {
        // Step 1 : Enregistrer le dictionnaire
        Object.keys(self.classDialogData).forEach(function (rowIndex) {
            self.classDialogData[rowIndex].Column = $("#class-column-" + rowIndex).val();
            self.classDialogData[rowIndex].Type = $("#class-type-" + rowIndex).val();
            self.classDialogData[rowIndex].Label = $("#class-label-" + rowIndex).val();
        });
        self.updateModelFromDict();
        //self.classDialogData[rowIndex]={Column:'',Type:'',Label:'',DatatypeProperties:{},Transform:{}};
        // Step 2 : Dessiner le mapping à partir du dictionnaire
    };
    self.updateModelFromDict = function () {
        Object.keys(self.classDialogData).forEach(function (rowIndex) {
            // traiter le cas d'un noeud préexistant à modifier non traité ici
            self.onSuggestionsSelect(self.classDialogData[rowIndex].Column);
            self.onSuggestionsSelect(self.classDialogData[rowIndex].Type);
            //traiter le label
        });
    };

    self.showDatatypeGraph = function (column) {
        //datatypeMappingGraph
        var mappings = self.generateBasicContentMappingContent()[self.currentTable.name].tripleModels;

        var filteredMapping = mappings.filter(function (mapping) {
            return mapping.s.replaceAll("_$", "").replaceAll("_£").replaceAll("@", "") == column || mapping.o.replaceAll("_$", "").replaceAll("_£").replaceAll("@", "") == column;
        });

        self.currentMappings = {};
        self.currentMappings[self.currentTreeNode.id] = filteredMapping;
        self.drawDatatypeGraphFromMappings(self.currentMappings, "technicalMappingColumnGraphDiv");
        //KGcreator_graph.drawDetailedMappings(self.currentTreeNode.id,"technicalMappingColumnGraphDiv");

        //KGcreator_graph.graphColumnToClassPredicates([table]);
    };
    self.drawDatatypeGraphFromMappings = function (mappings, divId) {
        /*if (tablesToDraw && !Array.isArray(tablesToDraw)) {
                tablesToDraw = [tablesToDraw];
            }*/
        if (!divId) {
            divId = "technicalMappingColumnGraphDiv";
        }
        var sourceMappings = mappings;
        var visjsData = { nodes: [], edges: [] };

        var existingNodes = {};
        var json = {};
        var shape = "box";
        for (var table in sourceMappings) {
            if (!existingNodes[table]) {
                existingNodes[table] = 1;
                /*visjsData.nodes.push({
                        id: table,
                        label: table,
                        shape: "ellipse",
                        size: Lineage_whiteboard.defaultShapeSize,
                        color: "#ddd",
                        data: {
                            id: table,
                            label: table,
                            fileName: table,
                            type: "table",
                        },
                    });*/
            }

            //var mappings = sourceMappings[table];
            var columns = MappingModeler.currentTable.columns;
            if (columns == undefined) {
                //There is a mapping for this column but the Table is not on db anymore
                continue;
            }

            function getTripleLabelRole(id) {
                if (id.endsWith("_$")) {
                    return "column";
                }
                if (id.startsWith("@")) {
                    return "column";
                }
                var role = null;
                columns.forEach(function (column) {
                    if (column == id) {
                        role = "column";
                    }
                });
                return role;
            }

            json[table] = mappings[table];
            mappings[table].forEach(function (item, index) {
                if (!item.s || !item.p || !item.o) {
                    return alert("tripleModel is malformed " + JSON.stringify(item));
                }

                function getNodeAttrs(str) {
                    if (str.indexOf("http") > -1) {
                        return { type: "Class", color: "#70ac47", shape: "box", size: 30 };
                    } else if (str.indexOf(":") > -1) {
                        drawRelation = false; //rdf Bag
                        return null;
                        return { type: "OwlType", color: "#aaa", shape: "ellipse" };
                    } else if (str.endsWith("_$")) {
                        return { type: "blankNode", color: "#00afef", shape: "square" };
                    } else if (str.indexOf("_rowIndex") > -1) {
                        return { type: "rowIndex", color: "#f90edd", shape: "star" };
                    } else {
                        drawRelation = false;
                        return { type: "OwlType", color: "#00afef", shape: "hexagon" };
                    }
                }

                var sId = table + "_" + item.s;
                var oId = table + "_" + item.o;

                if (!existingNodes[sId]) {
                    if (!sId) {
                        return;
                    }
                    existingNodes[sId] = 1;
                    var label = Sparql_common.getLabelFromURI(item.s);

                    var attrs = getNodeAttrs(item.s);
                    var drawRelation = true;
                    if (item.o == "owl:NamedIndividual") {
                        // attrs.shape = "triangle";
                        drawRelation = false;
                    }
                    if (item.o == "owl:Class") {
                        // attrs.shape = "triangle";
                        drawRelation = false;
                    }
                    if (item.o == "rdf:Bag") {
                        //   attrs.shape = "box";
                        drawRelation = false;
                    } else if (item.s.startsWith("@")) {
                        attrs.color = "#8200fd";
                    }
                    /*  if (item.isString) {
                attrs.shape = "text";

            }*/

                    visjsData.nodes.push({
                        id: sId,
                        label: label,
                        shape: attrs.shape,
                        color: attrs.color,
                        font: { color: attrs.color },
                        size: Lineage_whiteboard.defaultShapeSize,
                        data: {
                            id: item.s,
                            label: label,
                            fileName: table,
                            type: attrs.type,
                            role: getTripleLabelRole(item.s),
                            table: table,
                        },
                    });
                }
                if (item.o != "owl:NamedIndividual" && item.o != "owl:Class") {
                    if (!existingNodes[oId]) {
                        existingNodes[oId] = 1;
                        var label = Sparql_common.getLabelFromURI(item.o);

                        var attrs = getNodeAttrs(item.o);
                        if (!attrs) {
                            return;
                        }
                        visjsData.nodes.push({
                            id: oId,
                            label: label,
                            shape: attrs.shape,
                            color: attrs.color,
                            font: attrs.shape == "box" ? { color: "white" } : { color: attrs.color },
                            size: Lineage_whiteboard.defaultShapeSize,
                            data: {
                                id: item.o,
                                label: label,
                                fileName: table,
                                type: attrs.type,
                                role: getTripleLabelRole(item.o),
                                table: table,
                            },
                        });
                    }

                    var edgeId = sId + item.p + oId;
                    var label = Sparql_common.getLabelFromURI(item.p);
                    if (label.endsWith("member")) {
                        var color = "#07b611";
                        var dashes = true;
                    }
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;
                        visjsData.edges.push({
                            id: edgeId,
                            from: sId,
                            to: oId,
                            label: label,
                            color: color,
                            dashes: dashes,
                            font: { size: 12, ital: true, color: color || "brown" },
                            // color: getNodeAttrs(item.o),
                            arrows: {
                                to: {
                                    enabled: true,
                                    type: Lineage_whiteboard.defaultEdgeArrowType,
                                    scaleFactor: 0.5,
                                },
                            },
                        });
                    } else {
                    }
                }
                if (index == 0) {
                    var edgeId = table + "_" + sId;
                    var label = Sparql_common.getLabelFromURI(item.p);
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;
                        visjsData.edges.push({
                            id: edgeId,
                            from: table,
                            to: sId,
                            //  label: label
                        });
                    }
                }
            });
        }

        //visjsData = self.addInterTableJoinsToVisjsData(KGcreator.currentConfig.currentDataSource.name, visjsData);

        var options = {
            onclickFn: KGcreator_graph.onDetailedGraphNodeClick,
            visjsOptions: {
                manipulation: {
                    enabled: false,
                },
            },
        };

        self.datatypeVisjsGraph = new VisjsGraphClass(divId, visjsData, options);
        self.datatypeVisjsGraph.draw();

        /*   $('#KGcreatorVisjsLegendCanvas').css('right','55%');
            var menuBarPosition=-($(window).height()-$('#MenuBar').height()+30);
            $('#KGcreatorVisjsLegendCanvas').css('top',0);*/
        $("#KGcreatorVisjsLegendCanvas").css("top", 0);
        $("#KGcreatorVisjsLegendCanvas").css("right", 200);
    };
    self.createDataBaseSourceMappings = function () {
        // hide uploadApp
        self.displayUploadApp("");
        $("#smallDialogDiv").dialog("close");

        var datasource = self.uploadFormData.selectedDatabase;
        if (!datasource) {
            return;
        }
        self.currentConfig.databaseSources[datasource.id] = { name: datasource.name };
        self.rawConfig.databaseSources[datasource.id] = { name: datasource.name };
        self.saveSlsvSourceConfig(function (err, result) {
            if (err) {
                return alert(err);
            }
            self.addDataSourceToJstree("databaseSource", datasource, "sql.sqlserver");
        });
    };

    self.createCsvSourceMappings = function () {
        // hide uploadApp
        self.displayUploadApp("");
        $("#smallDialogDiv").dialog("close");
        var datasourceName = self.uploadFormData.selectedFiles[0];
        if (!datasourceName) {
            return;
        }

        KGcreator.currentConfig.csvSources[datasourceName] = {};
        KGcreator.rawConfig = KGcreator.currentConfig;

        KGcreator.saveSlsvSourceConfig(function (err, result) {
            if (err) {
                return alert(err);
            }
            MappingModeler.onLoaded();
            /*$('#mappingModeler_jstreeDiv').jstree().destroy();
            KGcreator.currentSlsvSource = self.currentSource;
            KGcreator.getSlsvSourceConfig(self.currentSource, function (err, result) {
                if (err) {
                    return err;
                }

                KGcreator.currentConfig = result;
                var options = self.jstreeOptions;
                KGcreator.loadDataSourcesJstree("mappingModeler_jstreeDiv", options, function (err, result) {
                    
                 }); 
            });
           */
        });
    };
    self.transformDialog = function (column) {
        // return if  virtuals and rowIndex
        if (!column) {
            column = self.currentGraphNode.label;
        }
        $("#smallDialogDiv").load("./modules/tools/mappingModeler/html/transformColumnDialog.html", function (err) {
            $("#smallDialogDiv").dialog("open");
            $("#smallDialogDiv").dialog("option", "title", "Transform for " + column);
            self.transformColumn = column;
        });
    };
    self.createPrefixTransformFn = function () {
        if (!self.currentTreeNode) {
            var column_selected = $("#KGcreator_transformColumnSelect").val();
        } else {
            var column_selected = self.currentTreeNode.data.id;
        }
        var prefix = prompt("Enter Prefix", column_selected);
        if (!prefix) {
            return;
        }
        var str = "if((mapping.isString||mapping.dataType) && role=='o') return value; else return '" + prefix + "-'+value;";
        $("#KGcreator_fnBody").val(str);
    };

    self.testTransform = function () {
        //  display view sample triples with added transform for column mapping
        var transformFnStr = $("#KGcreator_fnBody").val();

        transformFnStr = transformFnStr.replace(/"/g, "'");

        try {
            new Function("row", "mapping", transformFnStr);
        } catch (err) {
            return alert("error in function code " + err.message);
        }
        var transformFn = "function{" + transformFnStr + "}";
        var mappings = self.generateBasicContentMappingContent()[self.currentTable.name].tripleModels;

        var filteredMapping = mappings.filter(function (mapping) {
            return mapping.s.replace("@", "").replace("_$", "").replace("_£", "") == self.transformColumn || mapping.o.replace("@", "").replace("_$", "").replace("_£", "") == self.transformColumn;
        });

        var mappingWithTransform = {};
        mappingWithTransform[MappingModeler.currentTable.name] = { tripleModels: filteredMapping, transform: {} };
        mappingWithTransform[MappingModeler.currentTable.name].transform[self.transformColumn] = transformFn;

        // get transform and add to filtered mapping
        // change select view sample triple then use it
        self.viewSampleTriples(mappingWithTransform);
    };

    self.viewSampleTriples = function (mappings) {
        var options = {};
        if (Config.clientSocketId) {
            options.clientSocketId = Config.clientSocketId;
        }
        options.deleteOldGraph = false;
        options.sampleSize = 500;
        options.mappingsFilter = mappings;
        UI.message("creating triples...");
        var payload = {
            source: MappingModeler.currentSource,
            datasource: MappingModeler.currentDataSource,
            table: MappingModeler.currentTable.name,
            options: JSON.stringify(options),
        };
        $.ajax({
            type: "POST",
            url: `${Config.apiUrl}/kg/triples`,
            data: payload,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                // var str = JSON.stringify(result, null, 2);

                //   $("#KGcreator_infosDiv").val(str);
                KGcreator_run.showTriplesInDataTable(result);
                $("#mainDialogDiv").parent().css("z-index", 1);
                $("#mainDialogDiv").dialog({
                    close: function (event, ui) {
                        $("#mainDialogDiv").parent().css("z-index", "unset");
                    },
                });
                UI.message("", true);
            },
            error(err) {
                if (callback) {
                    return callback(err.responseText);
                }
                return alert(err.responseText);
            },
        });
    };
    self.saveTransform = function () {
        var transformFnStr = $("#KGcreator_fnBody").val();

        transformFnStr = transformFnStr.replace(/"/g, "'");

        try {
            new Function("row", "mapping", transformFnStr);
        } catch (err) {
            return alert("error in function code " + err.message);
        }
        var transformFn = "function{" + transformFnStr + "}";
        var nodes = MappingModeler.visjsGraph.data.nodes.get();
        var currentNode = nodes.filter(function (node) {
            return node.label == self.transformColumn;
        })[0];
        currentNode.data.transform = transformFn;
        self.visjsGraph.data.nodes.update(currentNode);
        MappingModeler.saveVisjsGraph();
    };
    return self;
})();

export default MappingModeler;
window.MappingModeler = MappingModeler;
