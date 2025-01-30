import Axiom_activeLegend from "../axioms/axiom_activeLegend.js";

import SourceSelectorWidget from "../../uiWidgets/sourceSelectorWidget.js";
import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import Axioms_graph from "../axioms/axioms_graph.js";
import Axioms_suggestions from "../axioms/axioms_suggestions.js";
import CommonBotFunctions from "../../bots/_commonBotFunctions.js";
import common from "../../shared/common.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import Clipboard from "../../shared/clipboard.js";

import SimpleListFilterWidget from "../../uiWidgets/simpleListFilterWidget.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import OntologyModels from "../../shared/ontologyModels.js";
import MappingsDetails from "./mappingsDetails.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import DataSourceManager from "./dataSourcesManager.js";

var MappingModeler = (function () {
    var self = {};

    self.graphDiv = "mappingModeler_graphDiv";
    self.jstreeDivId = "mappingModeler_jstreeDiv";
    self.legendGraphDivId = "nodeInfosAxioms_activeLegendDiv";
    self.legendItemsArray = [
        //{ label: "Table", color: "#a8da83", shape: "ellipse" },
        { label: "Column", color: "#cb9801", shape: "ellipse", size: 14 },
        { label: "RowIndex", color: "#cb9801", shape: "triangle" },
        { label: "VirtualColumn", color: "#cb9801", shape: "square" },
        { label: "URI", color: "#bc7dec", shape: "square" },

        { label: "Class", color: "#00afef", shape: "box" },
    ];

    self.onLoaded = function () {
        async.series(
            [
                function (callbackSeries) {
                    //reinitialize config (Change Source and reload after modification)
                    DataSourceManager.currentConfig = {};
                    DataSourceManager.rawConfig = {};
                    return callbackSeries();
                },
                function (callbackSeries) {
                    self.currentSource = MainController.currentSource;
                    UI.initMenuBar(function () {
                        self.loadSource(function () {
                            self.initResourcesMap(self.currentSource);
                            return callbackSeries();
                        });
                    });
                },

                function (callbackSeries) {
                    $("#graphDiv").load("./modules/tools/mappingModeler/html/mappingModeler_graphDiv.html", function (err) {
                        //$("#mainDialogDiv").dialog("open");
                        return callbackSeries();
                    });
                },
                //init visjsGraph
                function (callbackSeries) {
                    var visjsData = { nodes: [], edges: [] };
                    self.drawGraphCanvas(self.graphDiv, visjsData, function () {
                        callbackSeries();
                    });
                },
                //load visjs mapping graph
                function (callbackSeries) {
                    self.loadVisjsGraph(function (err) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        return callbackSeries();
                    });
                },
                function (callbackSeries) {
                    DataSourceManager.currentSlsvSource = self.currentSource;
                    DataSourceManager.getSlsvSourceConfig(self.currentSource, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }

                        return callbackSeries();
                    });
                },
                function (callbackSeries) {
                    $("#lateralPanelDiv").load("./modules/tools/mappingModeler/html/mappingModelerLeftPanel.html", function (err) {
                        $("#MappingModeler_leftTabs").tabs({});
                        $($("#MappingModeler_leftTabs").children()[0]).css("border-radius", "0px");

                        /*
                        $($('#MappingModeler_leftTabs').children()[0]).find("*").removeAttr("class");
                        
                       
                        $($('#MappingModeler_leftTabs').children()[0]).find("li").addClass('lineage-tabDiv');
                        $($('#MappingModeler_leftTabs').children()[0]).find("a").css('text-decoration','none');*/
                        DataSourceManager.loaDataSourcesJstree(self.jstreeDivId, function (err) {
                            return callbackSeries();
                        });
                    });
                },
            ],
            function (err) {
                if (err) {
                    return err;
                }
            },
        );
    };

    self.loadSuggestionSelectJstree = function (objects, parentName) {
        if ($("#suggestionsSelectJstreeDiv").jstree()) {
            try {
                $("#suggestionsSelectJstreeDiv").jstree().empty();
            } catch {}
        }
        self.filterSuggestionList = null;

        var options = {
            openAll: true,

            contextMenu: function (node, x) {
                var items = {};
                if (self.currentResourceType == "Column") {
                    items.showSampleData = {
                        label: "showSampleData",
                        action: function (_e) {
                            MappingModeler.showSampleData();
                        },
                    };
                }
                return items;
            },
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

        if (parentName == "Classes" || parentName == "Properties") {
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
                        text: item.label.split(":")[1],
                        data: {
                            id: item.id,
                            text: item.label.split(":")[1],
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
        } else {
            objects.forEach(function (item) {
                if (item != "" && item != "#") {
                    jstreeData.push({
                        id: item,
                        parent: parentName,
                        text: item,
                        data: {
                            id: item,
                            label: item,
                        },
                    });
                }
            });
        }
        var sourceIndex = jstreeData.findIndex((obj) => obj.id == self.currentSource);
        if (sourceIndex > -1) {
            if (parentName == "Properties") {
                common.array.moveItem(jstreeData, sourceIndex, 5);
            } else {
                common.array.moveItem(jstreeData, sourceIndex, 2);
            }
        }

        JstreeWidget.loadJsTree("suggestionsSelectJstreeDiv", jstreeData, options, function () {});
    };

    self.initActiveLegend = function (divId) {
        var options = {
            onLegendNodeClick: self.onLegendNodeClick,
            showLegendGraphPopupMenu: self.showLegendGraphPopupMenu,
            // xOffset: 300,
            horizontal: true,
        };
        Axiom_activeLegend.isLegendActive = true;
        self.legendItems = {};
        self.legendItemsArray.forEach(function (item) {
            self.legendItems[item.label] = item;
        });

        Axiom_activeLegend.drawLegend("nodeInfosAxioms_activeLegendDiv", self.legendItemsArray, options, function () {
            $("#nodeInfosAxioms_activeLegendDiv").find("canvas").addClass("coloredContainerImportant");
        });
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

    self.onSuggestionsSelect = function (event, obj) {
        var resourceUri = obj.node.id;
        var newResource = null;
        var id = common.getRandomHexaId(8);
        if (resourceUri == "createClass") {
            return self.showCreateResourceBot("Class", null);
        } else if (resourceUri == "createObjectProperty") {
            return self.showCreateResourceBot("ObjectProperty", null);
        } else if (resourceUri == "function") {
            return self.predicateFunctionShowDialog();
        } else if (self.currentResourceType == "Column") {
            // Verify that he not already exists
            var nodeInVisjsGraph = self.visjsGraph.data.nodes.get().filter(function (node) {
                return node.data.dataTable == self.currentTable.name && resourceUri == node.label;
            });
            if (nodeInVisjsGraph.length > 0) {
                return alert("Column already exists in the graph");
            }

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
                    datasource: DataSourceManager.currentConfig.currentDataSource.id,
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
                        source: property ? property.source : null,
                    },
                    color: color,
                };
                self.addEdge([edge]);

                self.currentRelation = null;
                //$("#axioms_legend_suggestionsSelect").empty();
                JstreeWidget.empty("suggestionsSelectJstreeDiv");
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
            self.addNode(visjsData.nodes);

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
                self.addEdge(visjsData.edges);
            }

            //
        } else {
            self.drawGraphCanvas(self.graphDiv, visjsData);
        }

        self.hideForbiddenResources(newResource.data.type);
        //$("#axioms_legend_suggestionsSelect").empty();
        JstreeWidget.empty("suggestionsSelectJstreeDiv");
        //$('#suggestionsSelectJstreeDiv').jstree().destroy();

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
        if (!node) {
            PopupMenuWidget.hidePopup("popupMenuWidgetDiv");
            return;
        }

        if (self.visjsGraph.network.isCluster(node.id) == true) {
            self.visjsGraph.network.openCluster(node.id);
        }
        self.currentGraphNode = node;

        //add relation between columns
        if (options.ctrlKey) {
            function getColumnClass(node) {
                var connections = self.visjsGraph.getFromNodeEdgesAndToNodes(node.id);

                var classId = null;
                connections.forEach(function (connection) {
                    if (connection.edge.data.type == "rdf:type" && connection.edge.label == "a") {
                        classId = connection.toNode.data.id;
                    }
                });
                return classId;
            }

            if (!self.currentRelation) {
                self.currentRelation = {
                    from: { id: node.id, classId: getColumnClass(node), dataTable: node.data.dataTable },
                    to: null,
                    type: node.data.type,
                };
            } else {
                if (node.data.dataTable != self.currentRelation.from.dataTable) {
                    self.currentRelation = null;
                    return alert("Relations between Columns from different datbels are not possible");
                }
                self.currentRelation.to = { id: node.id, classId: getColumnClass(node) };
                if (self.currentRelation.type != "Class" && node.data.type == "Class") {
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
            if (node.data.type == "Column") {
                html += '    <span class="popupMenuItem" onclick="MappingModeler.graphActions.showSampledata()">show sample data</span>';
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
                self.removeEdge(edges);
                self.removeNode(self.currentGraphNode.id);
            }
        },

        removeNodeEdgeGraph: function () {
            if (confirm("delete edge")) {
                self.removeEdge(self.currentGraphNode.id);
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

            self.addEdge(edges);
            self.currentRelation = null;
        },

        showNodeInfos: function () {
            if (self.currentGraphNode.data.type == "URI") {
            } else if (["Column", "RowIndex", "VirtualColumn"].indexOf(self.currentGraphNode.data.type) > -1) {
                MappingsDetails.mappingColumnInfo.editColumnInfos();
                MappingsDetails.mappingColumnInfo.columnClass = self.getColumnType(self.currentGraphNode.id);
                return;
                /*
                return $("#smallDialogDiv").load("./modules/tools/mappingModeler/html/mappingColumnInfos.html", function () {
                    $("#smallDialogDiv").dialog("open");
                    MappingsDetails.mappingColumnInfo.editColumnInfos();
                    MappingsDetails.mappingColumnInfo.columnClass = self.getColumnType(self.currentGraphNode.id);
                    //MappingsDetails.drawDetailedMappingsGraph(self.currentGraphNode.label);
                });*/
            } else {
                NodeInfosWidget.showNodeInfos(self.currentGraphNode.data.source, self.currentGraphNode, "smallDialogDiv");
            }
        },

        showSampledata: function () {
            MappingModeler.showSampleData();
        },
    };

    self.onLegendNodeClick = function (node, event) {
        if (!node) {
            return;
        }

        self.currentResourceType = node.id;
        if (self.currentResourceType == "URI") {
            var params = {
                title: "Create SpecificURI",
            };

            MappingModeler_bot.start(MappingModeler_bot.workflowCreateSpecificResource, params, function (err, result) {
                var params = MappingModeler_bot.params;

                var graphUri = Config.sources[self.currentSource].graphUri;
                var uri = common.getURI(params.rdfsLabel, self.currentSource, params.uriType, null);
                if (params.rdfsLabel) {
                    var newResource = {
                        id: uri,
                        label: params.rdfsLabel,
                        shape: self.legendItems[self.currentResourceType].shape,
                        color: self.legendItems[self.currentResourceType].color,
                        level: 0,
                        data: {
                            id: uri,
                            label: params.rdfsLabel,
                            rdfsLabel: params.rdfsLabel,
                            type: "URI",
                            rdfType: params.rdfType,
                            uriType: "fromLabel",
                            dataTable: self.currentTable.name,
                            datasource: self.currentDataSource,
                        },
                    };

                    self.drawResource(newResource);
                }
            });
        } else if (self.currentResourceType == "Column") {
            self.loadSuggestionSelectJstree(self.currentTable.columns, "Columns");
            //common.fillSelectOptions("axioms_legend_suggestionsSelect", self.currentTable.columns, false);
        } else if (self.currentResourceType == "Class") {
            //   self.hideLegendItems();
            var newObject = { id: "createClass", label: "_Create new Class_" };
            self.getAllClasses(self.currentSource, function (err, classes) {
                if (err) {
                    return alert(err);
                }
                /*
                if(classes[0].id!='createClass'){
                    self.setSuggestionsSelect(classes, false, newObject);
                }else{
                    self.setSuggestionsSelect(classes, false);
                }*/
                var classesCopy = JSON.parse(JSON.stringify(classes));
                classesCopy.unshift(newObject);
                self.loadSuggestionSelectJstree(classesCopy, "Classes");
            });
        } else if (self.currentResourceType == "ObjectProperty") {
            //   self.hideLegendItems();
            var newObjects = [
                { id: "createObjectProperty", label: "_Create new ObjectProperty_" },
                { id: "function", label: "function" },
                { id: "rdfs:member", label: "_rdfs:member_" },
                { id: "rdfs:subClassOf", label: "_rdfs:subClassOf_" },
            ];
            var options = { includesnoConstraintsProperties: true };
            //Axioms_suggestions.getValidPropertiesForClasses(self.currentSource, self.currentRelation.from.classId, self.currentRelation.to.classId, options, function (err, properties) {

            OntologyModels.getAllowedPropertiesBetweenNodes(self.currentSource, self.currentRelation.from.classId, self.currentRelation.to.classId, { keepSuperClasses: true }, function (err, result) {
                if (err) {
                    return alert(err);
                }
                var properties = [];
                for (var group in result.constraints) {
                    for (var propId in result.constraints[group]) {
                        properties.push({
                            id: propId,
                            label: result.constraints[group][propId].label,
                            source: result.constraints[group][propId].source,
                            resourceType: "ObjectProperty",
                        });
                    }
                }
                properties = common.array.distinctValues(properties, "id");
                properties = common.array.sort(properties, "label");
                properties.forEach(function (item) {
                    if (!item.label) {
                        item.label = Sparql_common.getLabelFromURI(item.id);
                    }
                    item.label = item.source.substring(0, 3) + ":" + item.label;
                });
                properties = common.array.sort(properties, "label");
                //To add NewObjects only one time
                var propertiesCopy = JSON.parse(JSON.stringify(properties));
                propertiesCopy.unshift(...newObjects);
                self.loadSuggestionSelectJstree(propertiesCopy, "Properties");
                //self.setSuggestionsSelect(properties, false, newObjects);
            });
        } else if (self.currentResourceType == "RowIndex") {
            self.onSuggestionsSelect(null, { node: { id: "RowIndex" } });
        } else if (self.currentResourceType == "VirtualColumn") {
            var columnName = prompt("Virtual column name");
            if (columnName) {
                self.onSuggestionsSelect(null, { node: { id: columnName } });
            }
        }
    };

    self.showLegendGraphPopupMenu = function () {};

    self.switchLeftPanel = function (target) {
        var tabsArray = ["dataSource", "mappings", "triples"];
        if (target == "mappings") {
            MappingModeler.initActiveLegend(self.legendGraphDivId);
            //MappingModeler.loadVisjsGraph();
        }
        if (target == "triples") {
        }

        $("#MappingModeler_leftTabs").tabs("option", "active", tabsArray.indexOf(target));
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
                    if (item.source) {
                        item.label = item.source.substring(0, 3) + ":" + item.label;
                    }
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
        self.updateNode(newNodes);
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
            var previousLabel = CreateAxiomResource_bot.params.newObject.label;
            CreateAxiomResource_bot.params.newObject.label = self.currentSource.substring(0, 3) + ":" + CreateAxiomResource_bot.params.newObject.label;
            // update Axiom_manager
            CreateAxiomResource_bot.params.newObject.source = self.currentSource;
            if (resourceType == "Class") {
                self.allClasses.push(CreateAxiomResource_bot.params.newObject);
            } else if (resourceType == "ObjectProperty") {
                self.allProperties.push(CreateAxiomResource_bot.params.newObject);
            }
            self.allResourcesMap[CreateAxiomResource_bot.params.newObject.id] = CreateAxiomResource_bot.params.newObject;
            // update suggestion select jsTree
            var jstreeData = Object.values($("#suggestionsSelectJstreeDiv").jstree()._model.data);
            jstreeData.push({
                id: CreateAxiomResource_bot.params.newObject.id,
                text: previousLabel,
                parent: self.currentSource,
                data: {
                    id: CreateAxiomResource_bot.params.newObject.id,
                    text: CreateAxiomResource_bot.params.newObject.label,
                    resourceType: "Class",
                },
            });
            if (!$("#suggestionsSelectJstreeDiv").jstree().get_node(self.currentSource)) {
                jstreeData.push({
                    id: self.currentSource,
                    text: self.currentSource,
                    parent: resourceType == "Class" ? "Classes" : "Properties",
                    data: {
                        id: self.currentSource,
                        text: self.currentSource,
                    },
                });
            }
            JstreeWidget.updateJstree("suggestionsSelectJstreeDiv", jstreeData, { openAll: true });
        });
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

    self.saveVisjsGraph = function () {
        self.visjsGraph.saveGraph("mappings_" + self.currentSource + "_" + self.currentDataSource + "_" + self.currentTable.name, true);
        //self.visjsGraph.saveGraph("mappings_" + self.currentSource + "_ALL" + ".json", true);
        self.saveVisjsGraphWithConfig();
    };
    self.saveVisjsGraphWithConfig = function (callback) {
        var fileName = "mappings_" + self.currentSource + "_ALL" + ".json";
        var graph = MappingModeler.visjsGraph;
        var nodes = graph.data.nodes.get();
        var positions = graph.network.getPositions();
        // Initialisation of Config if there isn't
        if (!DataSourceManager.rawConfig || Object.keys(DataSourceManager.rawConfig).length == 0) {
            var newJson = {
                sparqlServerUrl: Config.sources[self.currentSource].sparql_server.url,
                graphUri: Config.sources[self.currentSource].graphUri,
                prefixes: {},
                lookups: {},
                databaseSources: {},
                csvSources: {},
                isConfigInMappingGraph: true,
            };
            DataSourceManager.rawConfig = newJson;
        }
        var config = JSON.parse(JSON.stringify(DataSourceManager.rawConfig));
        delete config.currentDataSource;
        var data = {
            nodes: nodes,
            edges: graph.data.edges.get(),
            context: graph.currentContext,
            positions: positions,
            options: { config: config },
        };
        if (!fileName) {
            fileName = prompt("graph name");
        }
        if (!fileName || fileName == "") {
            return;
        }
        if (fileName.indexOf(".json") < 0) {
            fileName = fileName + ".json";
        }
        var payload = {
            fileName: fileName,
            data: data,
        };
        var payload = {
            dir: "graphs/",
            fileName: fileName,
            data: JSON.stringify(data, null, 2),
        };

        $.ajax({
            type: "POST",
            url: `${Config.apiUrl}/data/file`,
            data: payload,
            dataType: "json",
            success: function (_result, _textStatus, _jqXHR) {
                $("#visjsGraph_savedGraphsSelect").append($("<option></option>").attr("value", fileName).text(fileName));
                UI.message("graph saved");
                if (callback) {
                    callback();
                }
            },
            error(err) {
                return alert(err);
            },
        });
    };
    self.loadVisjsGraph = function (callback) {
        self.clearMappings();
        setTimeout(function () {
            self.visjsGraph.loadGraph("mappings_" + self.currentSource + "_ALL" + ".json", false, function (err, result) {
                if (result?.options?.config) {
                    DataSourceManager.rawConfig = result.options.config;
                    DataSourceManager.currentConfig = result.options.config;
                }
                if (!self.visjsGraph.data.nodes.get(table)) {
                    self.addDataSourceNode();
                    self.visjsGraph.network.fit();
                    var maxX = 0;
                    var maxY = 0;
                    self.visjsGraph.data.nodes.get().forEach(function (node) {
                        maxX = Math.max(node.x, maxX);
                        maxY = Math.max(node.y, maxY);
                    });
                    self.currentOffest = { y: maxY, x: maxX };
                }

                var tables = [];
                var map = {};
                var index = 0;
                var dataTables = self.getDataTablesFromVisjsGraph();

                for (var tableIndex in dataTables) {
                    var table = dataTables[tableIndex];
                    var clusterOptionsByData = {
                        joinCondition: function (node) {
                            if (node.data && node.data.dataTable == table && table != MappingModeler?.currentTable?.name) {
                                if (!map[node.id]) {
                                    map[node.id] = 1;
                                    return true;
                                }
                            }
                            return false;
                        },

                        clusterNodeProperties: {
                            id: "table" + index,
                            borderWidth: 3,
                            shape: "ellipse",
                            color: "#ddd",
                            label: "table" + table,
                            y: -500,
                            x: index++ * 200 - 400,
                            fixed: { x: true, y: true },
                        },
                    };

                    self.visjsGraph.network.clustering.cluster(clusterOptionsByData);
                }
                if (callback) {
                    return callback();
                }
            });
        }, 500);
    };

    self.onDataSourcesJstreeSelect = function (event, obj) {
        self.currentTreeNode = obj.node;
        var isRightClick = false;
        if (obj.event.which == 3) {
            isRightClick = true;
        }

        if (obj.node.data.type == "databaseSource") {
            DataSourceManager.initNewDataSource(obj.node.id, "databaseSource", obj.node.data.sqlType, obj.node.data.table);
            //MappingModeler.switchLeftPanel("mappings");
            DataSourceManager.loadDataBaseSource(DataSourceManager.currentSlsvSource, obj.node.id, obj.node.data.sqlType);
        } else if (obj.node.data.type == "csvSource") {
            DataSourceManager.initNewDataSource(obj.node.id, "csvSource", obj.node.data.sqlType, obj.node.id);
            var fileName = DataSourceManager.currentSlsvSource;
            DataSourceManager.loadCsvSource(DataSourceManager.currentSlsvSource, obj.node.id, false, function (err, columns) {
                if (err) {
                    return alert("file not found");
                }

                self.currentResourceType = "Column";
                self.currentTable = {
                    name: obj.node.id,
                    columns: columns,
                };
                self.loadSuggestionSelectJstree(columns, "Columns");
                if (!isRightClick) {
                    MappingModeler.switchLeftPanel("mappings");
                }
                $("#MappingModeler_currentDataSource").html(DataSourceManager.currentConfig.currentDataSource.name);
            });
        } else if (obj.node.data.type == "table") {
            self.currentTable = {
                name: obj.node.data.label,
                columns: DataSourceManager.currentConfig.currentDataSource.tables[obj.node.data.id],
            };
            var table = obj.node.data.id;
            DataSourceManager.currentConfig.currentDataSource.currentTable = table;

            //self.hideForbiddenResources("Table");
            self.currentResourceType = "Column";
            self.loadSuggestionSelectJstree(self.currentTable.columns, "Columns");
            if (!isRightClick) {
                MappingModeler.switchLeftPanel("mappings");
            }
            //common.fillSelectOptions("axioms_legend_suggestionsSelect", self.currentTable.columns, false);
            $("#MappingModeler_currentDataSource").html(DataSourceManager.currentConfig.currentDataSource.name);
        }

        $("#MappingModeler_currentDataSource").html(DataSourceManager.currentConfig.currentDataSource.name);
        if (obj.node.data.type == "table") {
            $("#MappingModeler_currentDataSource").html(DataSourceManager.currentConfig.currentDataSource.currentTable);
        }
    };

    self.addDataSourceNode = function () {
        var nodes = self.visjsGraph.data.nodes.get();
        var edges = self.visjsGraph.data.edges.get();
        var allDataTables = {};

        nodes.forEach(function (node) {
            if (node.data.dataTable && !allDataTables[node.data.dataTable]) {
                allDataTables[node.data.dataTable] = 1;
            }
        });
        var dataTablesNodes = [];
        var dataTablesEdges = [];
        Object.keys(allDataTables).forEach(function (dataTable) {
            var dataTableVisjsNode = nodes.filter(function (node) {
                return node.label == dataTable;
            });
            if (dataTableVisjsNode.length == 0) {
                dataTablesNodes.push({
                    id: dataTable,
                    label: dataTable,
                    level: 1,
                    shadow: true,
                    shape: "ellipse",
                    size: 5,
                    color: "#8f8a8c",
                    data: {
                        id: dataTable,
                        label: dataTable,
                        dataTable: dataTable,
                        type: "dataTable",
                    },
                });
            }
            //Add links to all nodes in dataTable
            var currentDataTableNodes = nodes.filter(function (node) {
                return node.data.dataTable == dataTable;
            });
            if (currentDataTableNodes.length > 0) {
                currentDataTableNodes.forEach(function (node) {
                    var dataTableVisjsEdge = edges.filter(function (edge) {
                        return edge.from == dataTable && edge.to == node.id;
                    });
                    if (dataTableVisjsEdge.length == 0) {
                        dataTablesEdges.push({
                            from: dataTable,
                            to: node.id,
                            id: common.getRandomHexaId(5),
                            color: "#8f8a8c",
                            width: 1,
                            data: { type: "tableToColumn" },
                            arrow: {
                                to: { enabled: true, type: "arrow" },
                            },
                        });
                    }
                });
            }
        });
        if (dataTablesNodes.length > 0) {
            self.addNode(dataTablesNodes);
        }
        if (dataTablesEdges.length > 0) {
            self.addEdge(dataTablesEdges);
        }
        //  MappingModeler.saveVisjsGraph();
        return;
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
                TripleFactory.showTriplesInDataTable(result);
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

    self.filterSuggestionTree = function () {
        var keyword = $("#mappingModeler_suggestionsnput").val();
        var data = $("#suggestionsSelectJstreeDiv").jstree()._model.data;
        /*if(!keyword){
            return;
        }*/
        if (!data) {
            return;
        }
        if (!self.filterSuggestionList) {
            self.filterSuggestionList = JSON.parse(JSON.stringify(data));
        }
        keyword = keyword.toLowerCase();

        var newData = [];
        Object.keys(self.filterSuggestionList).forEach(function (nodeId) {
            var node = self.filterSuggestionList[nodeId];
            // We filter only last leafs of jstree
            if (node.children.length == 0) {
                var node_text = node.text.toLowerCase();
                if (node_text.includes(keyword)) {
                    newData.push(node);
                }
            } else {
                newData.push(node);
            }
        });

        JstreeWidget.updateJstree("suggestionsSelectJstreeDiv", newData);
    };

    self.predicateFunctionShowDialog = function () {
        $("#smallDialogDiv").load("./modules/tools/mappingModeler/html/functionDialog.html", function () {
            $("#smallDialogDiv").dialog("open");
        });
    };
    self.addPredicateFunction = function () {
        var edge = {
            from: self.currentRelation.from.id,
            to: self.currentRelation.to.id,
            label: "_function_",
            arrows: {
                to: {
                    enabled: true,
                    type: "diamond",
                },
            },
            smooth: { type: "curvedCW" },
            data: {
                id: "function{" + $("#MappingModeler_fnBody").val() + "}",
                type: "function",
                source: "function",
            },
            color: "#375521",
        };
        self.addEdge([edge]);
        $("#smallDialogDiv").dialog("close");
    };
    self.loadSource = function (callback) {
        Lineage_sources.loadSources(MainController.currentSource, function (err) {
            if (err) {
                return alert(err.responseText);
            }
            $("#Lineage_graphEditionButtons").hide();
            return callback();
        });
    };
    self.showSampleData = function (node, columns, callback) {
        // alert("coming soon");
        if (!columns) {
            var hasColumn = false;
        } else {
            if (Array.isArray(columns) && columns.length > 0) {
                var hasColumn = true;
            } else {
                if (columns != "") {
                    var hasColumn = true;
                    columns = [columns];
                }
            }
        }

        function showTable(data) {
            var headers = [];
            var tableCols = [];
            data.forEach(function (item) {
                for (var key in item)
                    if (headers.indexOf(key) < 0) {
                        headers.push(key);
                        tableCols.push({ title: key, defaultContent: "", width: "15%" });
                    }
            });
            if (hasColumn) {
                tableCols = tableCols.filter(function (col) {
                    return columns.includes(col.title);
                });
            }

            var lines = [];
            data.forEach(function (item) {
                var line = [];
                headers.forEach(function (column) {
                    if (!hasColumn) {
                        line.push(item[column] || "");
                    } else {
                        if (columns.includes(column)) {
                            line.push(item[column] || "");
                        }
                    }
                });
                lines.push(line);
            });

            Export.showDataTable("smallDialogDiv", tableCols, lines);
            return;
        }

        if (DataSourceManager.currentConfig.currentDataSource.sampleData) {
            showTable(DataSourceManager.currentConfig.currentDataSource.sampleData);
        } else if (DataSourceManager.currentConfig.currentDataSource.type == "databaseSource") {
            if (!node || !node.data) {
                node = MappingModeler.currentTreeNode;
                if (!node.data) {
                    return alert("no Table  selected");
                }
            }
            var size = 200;
            var sqlQuery = "select top  " + size + "* from " + node.data.id;
            if (DataSourceManager.currentConfig.currentDataSource.sqlType == "postgres") {
                sqlQuery = "select   " + "* from public." + node.data.id + " LIMIT " + size;
            }
            const params = new URLSearchParams({
                type: DataSourceManager.currentConfig.currentDataSource.sqlType,
                dbName: DataSourceManager.currentConfig.currentDataSource.id,
                sqlQuery: sqlQuery,
            });

            $.ajax({
                type: "GET",
                url: Config.apiUrl + "/kg/data?" + params.toString(),
                dataType: "json",

                success: function (data, _textStatus, _jqXHR) {
                    showTable(data.rows);
                },
                error(err) {
                    return alert(err.responseText);
                },
            });
        } else if (DataSourceManager.currentConfig.currentDataSource.type == "csvSource") {
            alert("Comming Soon...");
        }
    };
    self.getDataTablesFromVisjsGraph = function () {
        var dataTables = self.visjsGraph.data.nodes.get().map(function (node) {
            return node?.data?.dataTable;
        });
        if (dataTables.length > 0) {
            dataTables = common.array.distinctValues(dataTables);
            dataTables = dataTables.filter(function (item) {
                return item != undefined;
            });
        } else {
            dataTables = [];
        }
        return dataTables;
    };
    self.updateNode = function (node) {
        if (!node) {
            return;
        }
        self.visjsGraph.data.nodes.update(node);
        self.saveVisjsGraph();
    };
    self.removeNode = function (node) {
        if (!node) {
            return;
        }
        self.visjsGraph.data.nodes.remove(node);
        self.saveVisjsGraph();
    };
    self.addNode = function (node) {
        if (!node) {
            return;
        }
        self.visjsGraph.data.nodes.add(node);
        self.saveVisjsGraph();
    };
    self.updateEdge = function (edge) {
        if (!edge) {
            return;
        }
        self.visjsGraph.data.edges.update(edge);
        self.saveVisjsGraph();
    };
    self.removeEdge = function (edge) {
        if (!edge) {
            return;
        }
        self.visjsGraph.data.edges.remove(edge);
        self.saveVisjsGraph();
    };
    self.addEdge = function (edge) {
        if (!edge) {
            return;
        }
        self.visjsGraph.data.edges.add(edge);
        self.saveVisjsGraph();
    };

    return self;
})();

export default MappingModeler;
window.MappingModeler = MappingModeler;
