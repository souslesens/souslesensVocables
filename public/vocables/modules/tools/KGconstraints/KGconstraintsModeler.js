import KGconstraintsModeler_activeLegend from "../axioms/axiom_activeLegend.js";
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
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import _commonBotFunctions from "../../bots/_commonBotFunctions.js";
import OntologyModels from "../../shared/ontologyModels.js";
import KGconstraints_editor from "./KGconstraints_editor.js";
import Cfihos_pump_poc from "./Cfihos_pump_poc.js";

// imports React app

var KGconstraintsModeler = (function () {
    var self = {};
    self.currentSource = null;
    self.currentDataSource = null;
    self.graphDiv = "KGconstraintsModeler_graphDiv";
    self.legendItemsArray = [
        { label: "Individual", color: "#eab3b3", shape: "ellipse" },
        { label: "Class", color: "#00afef", shape: "box" },
        { label: "ObjectProperty", color: "#efbf00", shape: "text" },
        { label: "DatatypeProperty", color: "#90d6e4", shape: "text" },
        { label: "Constraint", color: "#ef4270", shape: "triangle" },
    ];

    self.umountKGUploadApp = null;
    self.createApp = null;

    self.uploadFormData = {
        displayForm: "", // can be database, file or ""
        currentSource: "",
        selectedDatabase: "",
        selectedFiles: [],
    };

    self.onLoaded = function () {
        async.series([
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
                $("#lateralPanelDiv").load("./modules/tools/KGconstraints/html/KGconstraintsModeler_LeftPanel.html", function (err) {
                    self.initActiveLegend("KGconstraintsModeler_activeLegendDiv");
                    $("#graphDiv").load("./modules/tools/KGconstraints/html/KGconstraintsModeler_graphDiv.html", function (err) {
                        //$("#mainDialogDiv").dialog("open");
                        return callbackSeries();
                    });
                });
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
                                    // KGcreator.createDataBaseSourceConstraints();
                                },
                            };
                            return items;
                        } else if (node.id == "csvSources") {
                            items.csvSources = {
                                label: "add Csv Sources",
                                action: function (_e) {
                                    // pb avec source
                                    self.displayUploadApp("file");
                                    // KGcreator.createCsvSourceConstraints();
                                },
                            };
                            return items;
                        }
                    },
                };
                callbackSeries();
            },

            function (callbackSeries) {
                self.loadVisjsGraph();
                callbackSeries();
            },
        ]);
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

        Axiom_activeLegend.drawLegend("KGconstraintsModeler_activeLegendDiv", self.legendItemsArray, options);
    };

    self.hideForbiddenResources = function (resourceType) {
        var connectedEdges;
        if (self.currentGraphNode) {
            connectedEdges = self.visjsGraph.network.getConnectedEdges(self.currentGraphNode.id).length;
        }
        var hiddenNodes = [];
        if (resourceType == "Individual") {
            hiddenNodes.push("Individual");
            if (connectedEdges == 0) {
                hiddenNodes.push("ObjectProperty");
            } else {
                hiddenNodes.push("Class");
            }
            hiddenNodes.push("DatatypeProperty");
            hiddenNodes.push("Constraint");
        }
        if (resourceType == "Class") {
            hiddenNodes.push("Class");
            hiddenNodes.push("Constraint");
        }
        if (resourceType == "ObjectProperty") {
            hiddenNodes.push("ObjectProperty");
            hiddenNodes.push("DatatypeProperty");
        }
        if (resourceType == "DatatypeProperty") {
            hiddenNodes.push("DatatypeProperty");
            hiddenNodes.push("Class");
        }
        if (resourceType == "Constraint") {
            hiddenNodes.push("Constraint");
        }

        KGconstraintsModeler_activeLegend.hideLegendItems(hiddenNodes);
    };

    self.onSuggestionsSelect = function (event, obj) {
        if (obj.node && obj.node.children && obj.node.children.length > 0) {
            return;
        }
        var resourceUri = obj.node.id;
        var newResource = null;
        var id = common.getRandomHexaId(8);
        if (resourceUri == "createClass") {
            return self.showCreateResourceBot("Class", null);
        } else if (resourceUri == "createObjectProperty") {
            return self.showCreateResourceBot("ObjectProperty", null);
        } else if (resourceUri == "createDatatypeProperty") {
            return self.showCreateDatatypePropertyBot("ObjectProperty", null);
        } else if (self.currentResourceType == "Individual") {
            var individual = prompt("Individual name");
            if (!individual) {
                return;
            }
            var newResource = {
                id: id,
                label: individual,
                shape: self.legendItems[self.currentResourceType].shape,
                color: self.legendItems[self.currentResourceType].color,
                level: 0,
                data: {
                    id: individual,
                    label: individual,
                    type: self.currentResourceType,
                    source: self.currentSource,
                },
            };
            self.drawResource(newResource);
            setTimeout(function () {
                self.onLegendNodeClick({ id: "Class" });
            }, 500);
            return;
        } else if (self.currentResourceType == "Class") {
            var resource = self.allResourcesMap[resourceUri];
            id = common.getRandomHexaId(5);
            newResource = {
                id: id,
                label: resource.label,
                shape: self.legendItems[self.currentResourceType].shape,
                color: self.legendItems[self.currentResourceType].color,
                data: {
                    id: resourceUri,
                    label: resource.label,
                    type: self.currentResourceType,
                    source: resource.source,
                },
            };

            self.drawResource(newResource);
        } else if (self.currentResourceType == "ObjectProperty") {
            id = common.getRandomHexaId(5);
            var resource = self.allResourcesMap[resourceUri];
            newResource = {
                id: id,
                label: resource.label,
                shape: self.legendItems[self.currentResourceType].shape,
                color: self.legendItems[self.currentResourceType].color,

                data: {
                    id: resourceUri,
                    label: resource.label,
                    type: self.currentResourceType,
                    source: resource.source,
                },
            };
            self.drawResource(newResource);
        } else if (self.currentResourceType == "DatatypeProperty") {
            id = common.getRandomHexaId(5);
            var resource = self.allResourcesMap[resourceUri];
            newResource = {
                id: id,
                label: resource.label,
                shape: self.legendItems[self.currentResourceType].shape,
                color: self.legendItems[self.currentResourceType].color,

                data: {
                    id: resourceUri,
                    label: resource.label,
                    type: self.currentResourceType,
                    source: resource.source,
                },
            };
            self.drawResource(newResource);
        } else if (self.currentResourceType == "Constraint") {
            id = common.getRandomHexaId(5);
            var resource = self.allResourcesMap[resourceUri];
            newResource = {
                id: resourceUri,
                label: resourceUri.substring(3),
                shape: self.legendItems[self.currentResourceType].shape,
                color: self.legendItems[self.currentResourceType].color,

                data: {
                    id: resourceUri,
                    label: resourceUri.label,
                    type: self.currentResourceType,
                    source: "shacl",
                },
            };
            self.drawResource(newResource);
        }
    };

    self.drawResource = function (newResource) {
        var graphDivWidth = $("#KGconstraintsModeler_graphDiv").width();
        var arrows = {
            to: {
                enabled: true,
                type: "arrow",
            },
        };
        if (self.currentGraphNode && self.currentGraphNode.level) {
            newResource.level = self.currentGraphNode.level + 1;
        } else {
            newResource.level = 0;
        }
        var edgeColor = "#ccc";

        if (false) {
            if (!self.currentOffest) {
                self.currentOffest = { x: -graphDivWidth / 2, y: 0 };
            }
            if (self.currentGraphNode && newResource.data.type != "Individual") {
                var edges = self.visjsGraph.network.getConnectedEdges(self.currentGraphNode.id);
                var n = edges.length || 1;
                var pointAround = common.getpointCoordinatesAtAngle(
                    self.currentGraphNode.x || self.currentGraphNode._graphPosition.x,
                    self.currentGraphNode.y || self.currentGraphNode._graphPosition.y,
                    -180 / n,
                    100
                );
                newResource.x = pointAround.x;
                newResource.y = pointAround.y;
            } else {
                newResource.x = self.currentOffest.x += 200;
                if (self.currentOffest.x > graphDivWidth) {
                    self.currentOffest.y += 150;
                }
                newResource.y = self.currentOffest.y;
            }
            newResource.fixed = { x: true, y: true };
        }

        newResource.size = 12;
        var visjsData = { nodes: [], edges: [] };
        var visjsNode = newResource;

        visjsData.nodes.push(visjsNode);

        if (self.visjsGraph) {
            self.visjsGraph.data.nodes.add(visjsData.nodes);

            if (newResource.data.type != "Individual" && self.currentGraphNode) {
                var label, type;
                var edgeArrows = null;
                if (newResource.data.type == "Class") {
                    label = "";
                    type = "rdfs:subClassOf";
                    edgeArrows = arrows;
                } else {
                    label = "";
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
                    arrows: null,
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
        //$("#axioms_legend_suggestionsSelect").empty();
        /* if ($('#suggestionsSelectJstreeDiv').jstree().destroy) {
                 $('#suggestionsSelectJstreeDiv').jstree().destroy();
             }*/
        if (!self.currentGraphNode || self.currentGraphNode.data.type != "Individual") {
            self.currentGraphNode = newResource;
        }
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
        var xOffset = 200;
        var yOffset = 30;
        self.graphOptions = {
            keepNodePositionOnDrag: true,
            layoutHierarchical: {
                direction: "LR",
                sortMethod: "hubsize",
                levelSeparation: xOffset,
                // parentCentralization: false,
                shakeTowards: "roots",
                blockShifting: true,
                edgeMinimization: true,
                parentCentralization: true,

                nodeSpacing: yOffset,
            },

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

            onclickFn: KGconstraintsModeler.onVisjsGraphClick,
            onRightClickFn: KGconstraintsModeler.showGraphPopupMenu,
        };

        self.visjsGraph = new VisjsGraphClass(graphDiv, visjsData, self.graphOptions);
        self.visjsGraph.draw(function () {
            if (callback) {
                return callback();
            }
        });
    };

    self.onVisjsGraphClick = function (node, event, options) {
        if (!node) return;
        self.currentGraphNode = node;
        self.hideForbiddenResources(self.currentGraphNode.data.type);
        //add relation between columns
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
            html = '    <span class="popupMenuItem" onclick="KGconstraintsModeler.graphActions.removeNodeEdgeGraph();"> Remove Edge</span>';
        } else {
            html = '    <span class="popupMenuItem" onclick="KGconstraintsModeler.graphActions.removeNodeFromGraph();"> Remove Node</span>';
        }
        if (node.data) {
            html += '    <span class="popupMenuItem" onclick="KGconstraintsModeler.graphActions.showNodeInfos()">Node Infos</span>';
            if (true || node.data.type == "Class") {
                html += '    <span class="popupMenuItem" onclick="KGconstraintsModeler.graphActions.setItemAsSelected()">Select</span>';
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
                return $("#smallDialogDiv").load("./modules/tools/KGconstraintsModeler/html/mappingColumnInfos.html", function () {
                    $("#smallDialogDiv").dialog("open");
                    self.mappingColumnInfo.editColumnInfos();
                    self.mappingColumnInfo.columnClass = self.getColumnType(self.currentGraphNode.id);
                    self.showDatatypeGraph(self.currentGraphNode.label);
                });
            } else {
                NodeInfosWidget.showNodeInfos(self.currentGraphNode.data.source, self.currentGraphNode, "smallDialogDiv");
            }
        },

        setItemAsSelected: function () {
            self.isTemplateModified = true;
            var type = self.currentGraphNode.data.type;

            if (self.currentGraphNode.data.superClass == "Picklist") {
                Cfihos_pump_poc.getPickListContent(self.currentGraphNode.data.id, function (err, result) {
                    if (err) return alert(err.responseText || err);
                    var jstreeData = [];
                    jstreeData.push({
                        id: self.currentGraphNode.data.id,
                        text: self.currentGraphNode.data.label,
                        parent: "#",
                    });
                    result.forEach(function (item) {
                        jstreeData.push({
                            id: item.id,
                            text: item.label,
                            parent: self.currentGraphNode.data.id,
                        });
                    });

                    var html = "<div id='KGconstraint_picklistTreeDiv' style='width:350px;height:500px;overflow:auto'></div>" + "<button onclick='Cfihos_pump_poc.saveCheckedPicklistValues()'";
                    $("#smallDialogDiv").html(html);
                    $("#smallDialogDiv").dialog("open");
                    var options = { withCheckboxes: true };
                    JstreeWidget.loadJsTree("KGconstraint_picklistTreeDiv", jstreeData, options);
                });
            } else if (type == "Class") {
                self.currentGraphNode.data.Selected = true;
                self.visjsGraph.data.nodes.update({ id: self.currentGraphNode.id, color: "#b5d8ed" });
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

                KGconstraintsModeler_bot.start(KGconstraintsModeler_bot.workflowMappingDetail, params, function (err, result) {
                    var params = KGconstraintsModeler_bot.params;
                    data.uriType = params.URItype;
                    data.rdfType = params.rdfType;
                    (data.rdfsLabel = params.rdfsLabel),
                        self.visjsGraph.data.nodes.update({
                            id: self.currentGraphNode.id,
                            data: data,
                        });
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

            KGconstraintsModeler_bot.start(KGconstraintsModeler_bot.workflowColumnmMappingOther, params, function (err, result) {
                var params = KGconstraintsModeler_bot.params;
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

        if (self.currentResourceType == "Individual") {
            return self.onSuggestionsSelect(null, { node: {} });
        } else if (self.currentResourceType == "Class") {
            //   self.hideLegendItems();
            var newObject = { id: "createClass", label: "_Create New" };
            self.getAllClasses(self.currentSource, function (err, classes) {
                if (err) {
                    return alert(err);
                }

                var classesCopy = JSON.parse(JSON.stringify(classes));
                classesCopy.unshift(newObject);
                self.loadSuggestionSelectJstree(classesCopy, "Class");
            });
        } else if (self.currentResourceType == "ObjectProperty") {
            //   self.hideLegendItems();
            var newObjects = [{ id: "createObjectProperty", label: "_Create New " }];
            var currentClass = self.currentGraphNode.data.id;
            Axioms_suggestions.getValidPropertiesForClasses(self.currentSource, currentClass, null, null, function (err, properties) {
                if (err) {
                    return alert(err);
                }
                /* properties.forEach(function (item) {
                         item.label = item.source.substring(0, 3) + ":" + item.label;
                     });*/
                properties = common.array.sort(properties, "label");
                //To add NewObjects only one time
                var propertiesCopy = JSON.parse(JSON.stringify(properties));
                propertiesCopy.unshift(...newObjects);
                self.loadSuggestionSelectJstree(propertiesCopy, "ObjectProperty");
                //self.setSuggestionsSelect(properties, false, newObjects);
            });
        } else if (self.currentResourceType == "DatatypeProperty") {
            self.loadSuggestionSelectJstree(null, "DatatypeProperty");
            //self.setSuggestionsSelect(properties, false, newObjects);
        } else if (self.currentResourceType == "Constraint") {
            self.loadSuggestionSelectJstree(null, "Constraint");
            //self.setSuggestionsSelect(properties, false, newObjects);
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
                /*  self.allClasses.forEach(function (item) {
                          item.label = item.source.substring(0, 3) + ":" + item.label;
                      });*/
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
    self.getAllObjectProperties = function (source, callback) {
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

    self.getAllDatatypeProperties = function (source, callback) {};

    self.hideLegendItems = function (hiddenNodes) {
        var legendNodes = KGconstraintsModeler_activeLegend.data.nodes.getIds();
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
        self.getAllObjectProperties(source, function (err, result) {
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

    self.clearConstraints = function () {
        if (self.visjsGraph) {
            self.visjsGraph.clearGraph();
        }
        $("#" + self.graphDivId).html("");
        self.visjsGraph = null;
        var visjsData = { nodes: [], edges: [] };
        self.drawGraphCanvas(self.graphDiv, visjsData, function () {});

        KGconstraintsModeler_activeLegend.hideLegendItems([]);
    };
    self.saveConstraints = function () {
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
            CreateAxiomResource_bot.params.newObject.label = self.currentSource + ":" + CreateAxiomResource_bot.params.newObject.label;
            // update Axiom_manager
            if (resourceType == "Class") {
                self.allClasses.push(CreateAxiomResource_bot.params.newObject);
            } else if (resourceType == "ObjectProperty") {
                self.allProperties.push(CreateAxiomResource_bot.params.newObject);
            }
            self.allResourcesMap[CreateAxiomResource_bot.params.newObject.id] = CreateAxiomResource_bot.params.newObject;

            var jstreeData = [];
            jstreeData.push({
                id: CreateAxiomResource_bot.params.newObject.id,
                parent: resourceType,
                text: CreateAxiomResource_bot.params.newObject.label,
                data: {
                    id: CreateAxiomResource_bot,
                    label: CreateAxiomResource_bot.params.newObject.label,
                    source: self.currentSource,
                },
            });

            JstreeWidget.addNodesToJstree("suggestionsSelectJstreeDiv", resourceType, jstreeData);

            //  $("#axioms_legend_suggestionsSelect option").eq(0).before($("<option></option>").val(CreateAxiomResource_bot.params.newObject.id).text(CreateAxiomResource_bot.params.newObject.label));
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
        var json = self.ConstraintsToKGcreatorJson(columnsMap);
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

    self.generateBasicConstraints = function () {
        var json = self.generateBasicContentMappingContent();

        $("#smallDialogDiv").html(
            '<button class="w3-button nodesInfos-iconsButtons " style="font-size: 10px;margin-left:7px;" onclick=" KGconstraintsModeler.copyKGcreatorConstraints()"><input type="image" src="./icons/CommonIcons/CopyIcon.png"></button>' +
                ' <textarea id="KGconstraintsModeler_infosTA" style="display: block;width:800px;height: 500px;overflow: auto;"> </textarea>'
        );
        $("#smallDialogDiv").dialog("open");
        $("#KGconstraintsModeler_infosTA").val(JSON.stringify(json, null, 2));
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
    self.ConstraintsToKGcreatorJson = function (columnsMap) {
        var columnsMapLabels = Object.values(columnsMap).map(function (column) {
            return column.label;
        });
        var allConstraints = {};

        for (var nodeId in columnsMap) {
            var data = columnsMap[nodeId].data;
            var subject = self.nodeToKGcreatorColumnName(data);

            if (!allConstraints[data.dataTable]) {
                allConstraints[data.dataTable] = { tripleModels: [] };
            }
            if (data.rdfType) {
                var predicate = "rdf:type";
                if (data.rdfType == "owl:Class") {
                    predicate = "rdfs:subClassOf";
                }

                allConstraints[data.dataTable].tripleModels.push({
                    s: subject,
                    p: predicate,
                    o: data.rdfType,
                });
            }

            if (data.rdfsLabel) {
                allConstraints[data.dataTable].tripleModels.push({
                    s: subject,
                    p: "rdfs:label",
                    o: data.rdfsLabel,
                    isString: true,
                });
            }
            if (data.transform) {
                if (!allConstraints[data.dataTable].transform) {
                    allConstraints[data.dataTable].transform = {};
                }
                allConstraints[data.dataTable].transform[data.label] = data.transform;
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

                allConstraints[data.dataTable].tripleModels.push({
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

                    allConstraints[data.dataTable].tripleModels.push(triple);
                });
            }
        }

        var json = allConstraints;

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

    self.copyKGcreatorConstraints = function () {
        var text = $("#KGconstraintsModeler_infosTA").val();
        $("#KGconstraintsModeler_infosTA").focus();
        common.copyTextToClipboard(text);
    };

    self.saveVisjsGraph = function () {
        var version = "ALL";
        if (self.isTemplateModified) {
            var templateName = prompt("new template version");
            if (!templateName) {
                alert("your modifications will be ignored");
            } else {
                version = templateName;
            }
        }

        self.visjsGraph.saveGraph("Constraints_" + self.currentSource + "_" + version + ".json", true);
    };

    self.loadVisjsGraph = function () {
        self.clearConstraints();
        setTimeout(function () {
            self.visjsGraph.loadGraph("Constraints_" + self.currentSource + "_ALL" + ".json");
            //    self.visjsGraph.loadGraph("Constraints_" + self.currentSource + "_" + self.currentDataSource + "_" + self.currentTable.name + ".json");
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
        $("#mainDialogDiv").load("./modules/tools/KGconstraintsModeler/html/classesDialog.html", function () {
            $("#mainDialogDiv").dialog("open");

            //self.addRowClass();
            self.calculateColumnConstraintsFromGraph();
            Object.keys(self.classDialogData).forEach(function (column) {
                self.addRowClass(column);
            });
        });
    };
    self.calculateColumnConstraintsFromGraph = function () {
        var graphNodes = KGconstraintsModeler.visjsGraph.data.nodes.get();
        var edges = KGconstraintsModeler.visjsGraph.data.edges.get();
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
            `<button class='slsv-button-1' id='class-datatype-${column}' style='padding:2px 2px;margin:0px;' onclick='KGconstraintsModeler.datatypePropertiesDefine("${column}")'> Datatype </button>   `
        );
        $("#classDefineSample").append(
            `<button class='slsv-button-1' id='class-sample-${column}' style='padding:2px 2px;margin:0px;' onclick='KGconstraintsModeler.sampleData("${column}")'> Sample</button> `
        );
        $("#classDefineTransform").append(
            `<button class='slsv-button-1' id='class-transform-${column}' style='padding:2px 2px;margin:0px;' onclick='KGconstraintsModeler.transformDialog("${column}")'> Fn</button>  `
        );
        //$('#classDefineClose').append(`<button class='slsv-button-1' id='class-close-${column}' style='padding:2px 2px;margin:0px;'> X</button>  `)
        var columns = JSON.parse(JSON.stringify(self.currentTable.columns));
        common.array.insertFirstArray(columns, column);

        var URITType = ["fromColumnTitle", "blankNode", "randomIdentifier"];
        var rdfObjectsType = ["owl:NamedIndividual", "rdf:Bag", "owl:Class"];
        //  sort by similarity for others than rowIndex

        var graphNodes = KGconstraintsModeler.visjsGraph.data.nodes.get();
        var currentGraphNode = graphNodes.filter(function (node) {
            return node.data.label == column;
        })[0];
        if (currentGraphNode.data.rdfType) {
            common.array.insertFirstArray(rdfObjectsType, currentGraphNode.data.rdfType);
        }
        if (currentGraphNode.data.uriType) {
            common.array.insertFirstArray(URITType, currentGraphNode.data.uriType);
        }
        if (currentGraphNode.data.rdfsLabel) {
            common.array.insertFirstArray(columns, currentGraphNode.data.rdfsLabel);
        }

        common.fillSelectOptions(`class-label-${column}`, columns, false);
        common.fillSelectOptions(`class-RDFType-${column}`, rdfObjectsType, false);
        common.fillSelectOptions(`class-URITType-${column}`, URITType, false);
    };
    self.datatypePropertiesDefine = function (column) {
        var graphNodes = KGconstraintsModeler.visjsGraph.data.nodes.get();
        self.currentGraphNode = graphNodes.filter(function (node) {
            return node.data.label == column;
        })[0];
        self.graphActions.showNodeInfos();
    };
    self.sampleData = function (column) {
        if (!column) {
            return;
        }
        var Constraints = self.generateBasicContentMappingContent()[self.currentTable.name].tripleModels;

        var filteredMapping = Constraints.filter(function (mapping) {
            return mapping.s.replaceAll("_$", "").replaceAll("_£").replaceAll("@", "") == column || mapping.o.replaceAll("_$", "").replaceAll("_£").replaceAll("@", "") == column;
        });
        //rajouter toutes les colonnes en lien avec celle la et mettre celle qui nous intéresse en premier

        KGcreator.showSampleData(self.currentTreeNode, column);
    };

    self.saveTechnicalView = function () {
        var nodes = KGconstraintsModeler.visjsGraph.data.nodes.get();
        Object.keys(self.classDialogData).forEach(function (rowIndex) {
            var currentNode = nodes.filter(function (node) {
                return node.label == rowIndex;
            })[0];

            currentNode.data.uriType = $("#class-URITType-" + rowIndex).val();
            currentNode.data.rdfsLabel = $("#class-label-" + rowIndex).val();
            currentNode.data.rdfType = $("#class-RDFType-" + rowIndex).val();
            self.visjsGraph.data.nodes.update(currentNode);
        });
        KGconstraintsModeler.saveVisjsGraph();
    };

    self.showDatatypeGraph = function (column) {
        //datatypeMappingGraph
        var Constraints = self.generateBasicContentMappingContent()[self.currentTable.name].tripleModels;
        var Constraints = self.generateBasicContentMappingContent()[self.currentTable.name].tripleModels;

        var filteredMapping = Constraints.filter(function (mapping) {
            return mapping.s.replaceAll("_$", "").replaceAll("_£").replaceAll("@", "") == column || mapping.o.replaceAll("_$", "").replaceAll("_£").replaceAll("@", "") == column;
        });

        self.currentConstraints = {};
        self.currentConstraints[self.currentTreeNode.id] = filteredMapping;
        self.drawDatatypeGraphFromConstraints(self.currentConstraints, "technicalMappingColumnGraphDiv");
        //KGcreator_graph.drawDetailedConstraints(self.currentTreeNode.id,"technicalMappingColumnGraphDiv");

        //KGcreator_graph.graphColumnToClassPredicates([table]);
    };
    self.drawDatatypeGraphFromConstraints = function (Constraints, divId) {
        /*if (tablesToDraw && !Array.isArray(tablesToDraw)) {
                    tablesToDraw = [tablesToDraw];
                }*/
        if (!divId) {
            divId = "technicalMappingColumnGraphDiv";
        }
        var sourceConstraints = Constraints;
        var visjsData = { nodes: [], edges: [] };

        var existingNodes = {};
        var json = {};
        var shape = "box";
        for (var table in sourceConstraints) {
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

            //var Constraints = sourceConstraints[table];
            var columns = KGconstraintsModeler.currentTable.columns;
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

            json[table] = Constraints[table];
            Constraints[table].forEach(function (item, index) {
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
    self.createDataBaseSourceConstraints = function () {
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

    self.createCsvSourceConstraints = function () {
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
            KGconstraintsModeler.onLoaded();
        });
    };
    self.transformDialog = function (column) {
        // return if  virtuals and rowIndex
        if (!column) {
            column = self.currentGraphNode.label;
        }
        $("#smallDialogDiv").load("./modules/tools/KGconstraintsModeler/html/transformColumnDialog.html", function (err) {
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
        var Constraints = self.generateBasicContentMappingContent()[self.currentTable.name].tripleModels;

        var filteredMapping = Constraints.filter(function (mapping) {
            return mapping.s.replace("@", "").replace("_$", "").replace("_£", "") == self.transformColumn || mapping.o.replace("@", "").replace("_$", "").replace("_£", "") == self.transformColumn;
        });

        var mappingWithTransform = {};
        mappingWithTransform[KGconstraintsModeler.currentTable.name] = {
            tripleModels: filteredMapping,
            transform: {},
        };
        mappingWithTransform[KGconstraintsModeler.currentTable.name].transform[self.transformColumn] = transformFn;

        // get transform and add to filtered mapping
        // change select view sample triple then use it
        self.viewSampleTriples(mappingWithTransform);
    };

    self.viewSampleTriples = function (Constraints) {
        var options = {};
        if (Config.clientSocketId) {
            options.clientSocketId = Config.clientSocketId;
        }
        options.deleteOldGraph = false;
        options.sampleSize = 500;
        options.ConstraintsFilter = Constraints;
        UI.message("creating triples...");
        var payload = {
            source: KGconstraintsModeler.currentSource,
            datasource: KGconstraintsModeler.currentDataSource,
            table: KGconstraintsModeler.currentTable.name,
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
        var nodes = KGconstraintsModeler.visjsGraph.data.nodes.get();
        var currentNode = nodes.filter(function (node) {
            return node.label == self.transformColumn;
        })[0];
        currentNode.data.transform = transformFn;
        self.visjsGraph.data.nodes.update(currentNode);
        KGconstraintsModeler.saveVisjsGraph();
    };

    self.loadSuggestionSelectJstree = function (objects, parentName) {
        if ($("#suggestionsSelectJstreeDiv").jstree()) {
            try {
                //  $('#suggestionsSelectJstreeDiv').jstree().destroy();
                $("#suggestionsSelectJstreeDiv").jstree().empty();
            } catch {}
        }
        var options = {
            openAll: true,
            selectTreeNodeFn: self.onSuggestionsSelect,
        };
        var jstreeData = [];
        jstreeData.push({
            id: parentName,
            parent: "#",
            text: parentName,
            data: {
                id: parentName,
                label: parentName,
            },
        });

        if (parentName == "Class" || parentName == "ObjectProperty") {
            var uniqueSources = {};
            objects.forEach(function (item) {
                if (item.source) {
                    if (!uniqueSources[item.source]) {
                        uniqueSources[item.source] = 1;

                        jstreeData.push({
                            id: item.source,
                            parent: parentName,
                            text: item.source,
                            data: {
                                id: item.source,
                                label: item.source,
                            },
                        });
                    }
                    jstreeData.push({
                        id: item.id,
                        parent: item.source,
                        text: item.label,
                        data: {
                            id: item.id,
                            text: item.label,
                            resourceType: item.resourceType,
                        },
                    });
                } else {
                    jstreeData.push({
                        id: item.id,
                        parent: parentName,
                        text: item.label,
                        data: {
                            id: item.id,
                            text: item.label,
                        },
                    });
                }
            });
        } else if (parentName == "DatatypeProperty") {
            var vocabs = [];
            var imports = Config.sources[self.currentSource].imports;
            if (imports) {
                vocabs = imports;
            }
            vocabs = vocabs.concat(Object.keys(Config.basicVocabularies));
            vocabs.splice(0, 0, self.currentSource);

            jstreeData.push({
                id: "createDatatypeProperty",
                text: "_Create New",
                parent: parentName,
            });

            vocabs.forEach(function (vocab) {
                jstreeData.push({
                    id: vocab,
                    text: vocab,
                    parent: parentName,
                });

                var properties = Config.ontologiesVocabularyModels[vocab].nonObjectProperties;

                for (var key in properties) {
                    var property = properties[key];
                    jstreeData.push({
                        id: property.id,
                        text: property.label,
                        parent: vocab,
                    });
                    self.allResourcesMap[property.id] = property;
                }
            });
        } else if (parentName == "Constraint") {
            for (var constraintType in KGconstraints_editor.constraintsMap) {
                jstreeData.push({
                    id: constraintType,
                    text: constraintType,
                    parent: parentName,
                });

                var constraints = KGconstraints_editor.constraintsMap[constraintType];
                for (var key in constraints) {
                    var constraint = constraints[key];
                    jstreeData.push({
                        id: key,
                        text: key.substring(3),
                        parent: constraintType,
                    });
                    self.allResourcesMap[constraint.id] = constraint;
                }
            }
        } else {
            objects.forEach(function (item) {
                jstreeData.push({
                    id: item,
                    parent: parentName,
                    text: item,
                    data: {
                        id: item,
                        label: item,
                    },
                });
            });
        }
        JstreeWidget.loadJsTree("suggestionsSelectJstreeDiv", jstreeData, options, function () {});
    };
    return self;
})();

export default KGconstraintsModeler;
window.KGconstraintsModeler = KGconstraintsModeler;
