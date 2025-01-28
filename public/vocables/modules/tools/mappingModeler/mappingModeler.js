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

/**
 * MappingModeler module.
 * The MappingModeler tool helps creating new mappings from sources, and visualising and editing these mappings.
 * @module MappingModeler
 */
var MappingModeler = (function () {
    var self = {};

    /**
     * ID of the graph container.
     * @type {string}
     * @memberof module:MappingModeler
     */
    self.graphDiv = "mappingModeler_graphDiv";

    /**
     * ID of the tree container.
     * @type {string}
     * @memberof module:MappingModeler
     */
    self.jstreeDivId = "mappingModeler_jstreeDiv";

    /**
     * ID of the legend container.
     * @type {string}
     * @memberof module:MappingModeler
     */
    self.legendGraphDivId = "nodeInfosAxioms_activeLegendDiv";

    /**
     * Array defining the legend items for the graph.
     * Each item includes label, color, shape, and size properties.
     * @type {Array<{label: string, color: string, shape: string, size: number}>}
     * @memberof module:MappingModeler
     */
    self.legendItemsArray = [
        //{ label: "Table", color: "#a8da83", shape: "ellipse" },
        { label: "Column", color: "#cb9801", shape: "ellipse", size: 14 },
        { label: "RowIndex", color: "#cb9801", shape: "triangle" },
        { label: "VirtualColumn", color: "#cb9801", shape: "square" },
        { label: "URI", color: "#bc7dec", shape: "square" },

        { label: "Class", color: "#00afef", shape: "box" },
    ];

    /**
     * Initializes the MappingModeler module.
     *
     * This method performs the following steps in sequence:
     * 1. Sets up the current source and initializes the UI menu bar.
     * 2. Loads the source configuration using `DataSourceManager`.
     * 3. Loads the HTML structure for the graph container.
     * 4. Initializes an empty VisJS graph canvas.
     * 5. Loads the VisJS mapping graph with data.
     * 6. Loads and sets up the lateral panel with tabs and the data source tree.
     *
     * @function onLoaded
     * @memberof module:MappingModeler
     * @returns {void}
     * @throws {Error} If any step in the initialization sequence fails.
     */
    self.onLoaded = function () {
        async.series(
            [
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
                    DataSourceManager.currentSlsvSource = self.currentSource;
                    DataSourceManager.getSlsvSourceConfig(self.currentSource, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }

                        return callbackSeries();
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
            }
        );
    };

    /**
     * Loads and initializes a suggestion tree in the specified container.
     * @function
     * @name loadSuggestionSelectJstree
     * @memberof module:MappingModeler
     * @param {Array<Object>} objects - The objects to populate the tree with.
     * @param {string} parentName - The name of the parent node.
     */
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

    /**
     * Initializes the active legend for a given container.
     * @function
     * @name initActiveLegend
     * @memberof module:MappingModeler
     * @param {string} divId - The ID of the container where the legend will be displayed.
     */
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

    /**
     * Hides specific resources in the legend based on the resource type.
     * @function
     * @name hideForbiddenResources
     * @memberof module:MappingModeler
     * @param {string} resourceType - The type of resource to hide.
     */
    self.hideForbiddenResources = function (resourceType) {
        var hiddenNodes = [];
        if (resourceType == "Table") {
            hiddenNodes.push("ObjectProperty");
            hiddenNodes.push("Class");
            hiddenNodes.push("Connective");
        }
        Axiom_activeLegend.hideLegendItems(hiddenNodes);
    };

    /**
     * Handles the selection of a suggestion from the tree.
     * @function
     * @name onSuggestionsSelect
     * @memberof module:MappingModeler
     * @param {Object} event - The selection event object.
     * @param {Object} obj - The selected tree node object.
     */
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

    /**
     * Draws a resource (table or column) in the graph with appropriate positioning and connections.
     * @function
     * @name drawResource
     * @memberof module:MappingModeler
     * @param {Object} newResource - The resource object to be drawn, including its data and metadata.
     */
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

    /**
     * Checks if a node with a specific ID already exists in the graph.
     * @function
     * @name objectIdExistsInGraph
     * @memberof module:MappingModeler
     * @param {string} id - The ID of the object to search for.
     * @returns {boolean} - Returns true if the object exists, false otherwise.
     */
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

    /**
     * Draws the graph canvas and initializes the visualization with options.
     * @function
     * @name drawGraphCanvas
     * @memberof module:MappingModeler
     * @param {HTMLElement} graphDiv - The HTML element where the graph will be rendered.
     * @param {Object} visjsData - The data for nodes and edges to be rendered on the graph.
     * @param {Function} [callback] - An optional callback to execute after the graph is drawn.
     */
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

    /**
     * Handles click events on the visualization graph.
     * @function
     * @name onVisjsGraphClick
     * @memberof module:MappingModeler
     * @param {Object} node - The clicked node object.
     * @param {Object} event - The event object containing details about the click event.
     * @param {Object} options - Additional options, such as modifier keys (e.g., ctrlKey).
     */
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

    /**
     * Displays a popup menu with actions for the selected graph node or edge.
     * @function
     * @name showGraphPopupMenu
     * @memberof module:MappingModeler
     * @param {Object} node - The node or edge for which the popup menu is shown.
     * @param {Object} point - The x and y coordinates of the menu's position.
     * @param {Object} event - The event object containing details about the context menu event.
     */
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
        /**
         * Outlines a node in the graph by adjusting its border width.
         * @function
         * @name graphActions.outlineNode
         * @memberof module:MappingModeler
         * @param {string} nodeId - The ID of the node to outline.
         */
        outlineNode: function (nodeId) {
            self.visjsGraph.decorateNodes(null, { borderWidth: 1 });
            self.visjsGraph.decorateNodes(nodeId, { borderWidth: 5 });
        },

        /**
         * Removes the currently selected node from the graph, along with its edges.
         * Prompts for confirmation before deletion.
         * @function
         * @name graphActions.removeNodeFromGraph
         * @memberof module:MappingModeler
         */
        removeNodeFromGraph: function () {
            if (confirm("delete node")) {
                var edges = self.visjsGraph.network.getConnectedEdges(self.currentGraphNode.id);
                self.removeEdge(edges);
                self.removeNode(self.currentGraphNode.id);
            }
        },

        /**
         * Removes the currently selected edge from the graph.
         * Prompts for confirmation before deletion.
         * @function
         * @name graphActions.removeNodeEdgeGraph
         * @memberof module:MappingModeler
         */
        removeNodeEdgeGraph: function () {
            if (confirm("delete edge")) {
                self.removeEdge(self.currentGraphNode.id);
            }
        },

        /**
         * Removes the currently selected edge from the graph.
         * Prompts for confirmation before deletion.
         * @function
         * @name graphActions.removeNodeEdgeGraph
         * @memberof module:MappingModeler
         */
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

        /**
         * Draws an edge between a column node and a class node, based on the current relation.
         * @function
         * @name graphActions.drawColumnToClassEdge
         * @memberof module:MappingModeler
         */
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

        /**
         * Displays detailed information about the currently selected node in a dialog box.
         * The information varies depending on the node's type.
         * @function
         * @name graphActions.showNodeInfos
         * @memberof module:MappingModeler
         */
        showNodeInfos: function () {
            if (self.currentGraphNode.data.type == "URI") {
            } else if (["Column", "RowIndex", "VirtualColumn"].indexOf(self.currentGraphNode.data.type) > -1) {
                return $("#smallDialogDiv").load("./modules/tools/mappingModeler/html/mappingColumnInfos.html", function () {
                    $("#smallDialogDiv").dialog("open");
                    MappingsDetails.mappingColumnInfo.editColumnInfos();
                    MappingsDetails.mappingColumnInfo.columnClass = self.getColumnType(self.currentGraphNode.id);
                    //MappingsDetails.drawDetailedMappingsGraph(self.currentGraphNode.label);
                });
            } else {
                NodeInfosWidget.showNodeInfos(self.currentGraphNode.data.source, self.currentGraphNode, "smallDialogDiv");
            }
        },

        /**
         * Shows sample data associated with the currently selected node.
         * @function
         * @name graphActions.showSampledata
         * @memberof module:MappingModeler
         */
        showSampledata: function () {
            MappingModeler.showSampleData();
        },
    };

    /**
     * Handles a click on a legend node to perform specific actions based on the node type.
     * @function
     * @name onLegendNodeClick
     * @memberof module:MappingModeler
     * @param {Object} node - The legend node clicked, containing its ID and properties.
     * @param {Object} event - The click event triggering the action.
     *
     * @description
     * Performs actions such as:
     * - Creating a specific URI resource.
     * - Loading suggestions for columns, classes, or properties.
     * - Managing virtual columns or row indices.
     */
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

    /**
     * Displays the legend graph popup menu (TO DO).
     * @function
     * @name showLegendGraphPopupMenu
     * @memberof module:MappingModeler
     */
    self.showLegendGraphPopupMenu = function () {};

    /**
     * Switches the left panel's active tab and initializes relevant components based on the target tab.
     * @function
     * @name switchLeftPanel
     * @memberof module:MappingModeler
     * @param {string} target - The target tab to activate. Possible values: "dataSource", "mappings", "triples".
     *
     * @description
     * - Activates the specified tab in the left panel.
     * - Initializes the active legend and loads the vis.js graph if the target is "mappings".
     */
    self.switchLeftPanel = function (target) {
        var tabsArray = ["dataSource", "mappings", "triples"];
        if (target == "mappings") {
            MappingModeler.initActiveLegend(self.legendGraphDivId);
            MappingModeler.loadVisjsGraph();
        }
        if (target == "triples") {
        }

        $("#MappingModeler_leftTabs").tabs("option", "active", tabsArray.indexOf(target));
    };

    /**
     * Retrieves all classes from the specified source or the current source if none is provided.
     * Caches the result to avoid redundant API calls.
     *
     * @function
     * @name get    AllClasses
     * @memberof module:MappingModeler
     * @param {string} source - The source to retrieve classes from. Defaults to `self.currentSource` if not provided.
     * @param {function} callback - Callback function to handle the result. Receives two arguments: error and result.
     *
     * @description
     * - If the classes are already cached in `self.allClasses`, returns the cached list.
     * - Otherwise, fetches all classes using `CommonBotFunctions.listSourceAllClasses`.
     * - Filters out duplicate class IDs and formats labels with source prefixes.
     * - The resulting class list is sorted alphabetically by label.
     * - Calls the callback with the formatted list or an error if the API call fails.
     */
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

    /**
     * Retrieves all object properties from the specified source or the current source if none is provided.
     * Caches the result to avoid redundant API calls.
     *
     * @function
     * @name getAllProperties
     * @memberof module:MappingModeler
     * @param {string} source - The source to retrieve properties from. Defaults to `self.currentSource` if not provided.
     * @param {function} callback - Callback function to handle the result. Receives two arguments: error and result.
     *
     * @description
     * - If the properties are already cached in `self.allProperties`, returns the cached list.
     * - Otherwise, fetches all object properties using `CommonBotFunctions.listSourceAllObjectProperties`.
     * - Filters out duplicate property IDs and prepares labels for each property.
     * - Sorts the resulting property list alphabetically by label.
     * - Calls the callback with the formatted list or an error if the API call fails.
     *
     * @example
     * self.getAllProperties("mySource", function(err, properties) {
     *     if (err) {
     *         console.error(err);
     *     } else {
     *         console.log(properties);
     *     }
     * });
     */
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

    /**
     * Hides or shows legend items based on the provided list of nodes to keep visible.
     *
     * @function
     * @name hideLegendItems
     * @memberof module:MappingModeler
     * @param {Array} hiddenNodes - Array of node IDs to keep visible. If not provided, all legend items are hidden.
     *
     * @description
     * - Retrieves all legend node IDs from `Axiom_activeLegend.data.nodes`.
     * - Iterates through each node ID, marking them as `hidden` if they are not in the `hiddenNodes` list.
     * - Updates the visibility of legend items using `self.updateNode`.
     *
     * @example
     * self.hideLegendItems(["node1", "node2"]);
     */
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

    /**
     * Initializes a map containing all classes and properties for a given source.
     *
     * @function
     * @name initResourcesMap
     * @memberof module:MappingModeler
     * @param {string} source - The data source from which resources are fetched.
     * @param {function} callback - Callback function invoked after resources are initialized. Receives two arguments: error and result.
     *
     * @description
     * - Initializes `self.allResourcesMap` as an empty object.
     * - Resets `self.allClasses` and `self.allProperties` to `null`.
     * - Calls `self.getAllClasses` to fetch all classes, adding each to the `self.allResourcesMap` by ID.
     * - Calls `self.getAllProperties` to fetch all properties, adding each to the `self.allResourcesMap` by ID.
     * - If a callback is provided, it is invoked after all resources are processed.
     *
     * @example
     * self.initResourcesMap("mySource", function(err, result) {
     *     if (err) {
     *         console.error(err);
     *     } else {
     *         console.log("Resources initialized:", self.allResourcesMap);
     *     }
     * });
     */
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

    /**
     * Clears the current graph mappings and resets the graph canvas.
     *
     * @function
     * @name clearMappings
     * @memberof module:MappingModeler
     *
     * @description
     * - Clears the `visjsGraph` object, which contains the graph visualization data.
     * - Removes all content from the graph's HTML container using its ID.
     * - Resets `self.visjsGraph` to `null`.
     * - Reinitializes an empty graph canvas using `self.drawGraphCanvas` with empty nodes and edges.
     *
     * @example
     * self.clearMappings();
     */
    self.clearMappings = function () {
        self.visjsGraph.clearGraph();
        $("#" + self.graphDivId).html("");
        self.visjsGraph = null;
        var visjsData = { nodes: [], edges: [] };
        self.drawGraphCanvas(self.graphDiv, visjsData, function () {});
    };

    /**
     * Saves the current mappings by clearing the graph display.
     *
     * @function
     * @name saveMappings
     * @memberof module:MappingModeler
     *
     * @description
     * - Clears all content from the graph's HTML container using its ID.
     * - Does not perform any additional saving or persistence logic in its current implementation.
     *
     * @example
     * self.saveMappings();
     */
    self.saveMappings = function () {
        $("#" + self.graphDivId).html("");
    };

    /**
     * Displays the create resource bot and starts the resource creation workflow based on the provided resource type.
     *
     * @function
     * @name showCreateResourceBot
     * @memberof module:MappingModeler
     *
     * @param {string} resourceType - The type of resource to create ("Class" or "ObjectProperty").
     * @param {Array} filteredUris - The URIs to filter the resource creation process.
     *
     * @description
     * - Initializes the workflow for creating a new resource based on the resource type.
     * - If the resource type is "Class", it uses the `workflowNewClass` workflow, otherwise, if it's "ObjectProperty", it uses the `workflowNewObjectProperty` workflow.
     * - Updates internal data structures (`allClasses`, `allProperties`, `allResourcesMap`) with the newly created resource.
     * - Adds the new resource to a suggestion list displayed in a jsTree widget.
     * - If the resource type is invalid, it alerts the user.
     *
     * @example
     * self.showCreateResourceBot("Class", filteredUris);
     */
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

    /**
     * Retrieves the column type for a given node in the graph.
     *
     * @function
     * @name getColumnType
     * @memberof module:MappingModeler
     *
     * @param {string} nodeId - The ID of the node whose column type is to be determined.
     *
     * @returns {string|null} - The column type (URI) if found, or null if no matching type is found.
     *
     * @description
     * - Iterates through the connections of the given node to find an edge of type "rdf:type".
     * - If a connection with a valid "rdf:type" is found, it returns the type (URI) associated with the connected node.
     * - If no valid type is found, it returns null.
     *
     * @example
     * var columnType = self.getColumnType("node123");
     */
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

    /**
     * Saves the current Vis.js graph with specific filenames based on the current source and data source.
     *
     * @function
     * @name saveVisjsGraph
     * @memberof module:MappingModeler
     *
     * @description
     * - Saves the current graph using the `saveGraph` method with two different filenames:
     *   1. A filename based on the current source, data source, and table name.
     *   2. A filename that includes the suffix "_ALL".
     * - Both graphs are saved in JSON format.
     *
     * @example
     * self.saveVisjsGraph();
     */
    self.saveVisjsGraph = function () {
        self.visjsGraph.saveGraph("mappings_" + self.currentSource + "_" + self.currentDataSource + "_" + self.currentTable.name, true);
        self.visjsGraph.saveGraph("mappings_" + self.currentSource + "_ALL" + ".json", true);
    };

    /**
     * Loads the Vis.js graph for the current source and data source and applies clustering to tables.
     *
     * @function
     * @name loadVisjsGraph
     * @memberof module:MappingModeler
     *
     * @param {Function} callback - A callback function to be executed after the graph is loaded and tables are clustered.
     *
     * @description
     * - Clears the current mappings before loading the graph.
     * - Loads the graph from the file `mappings_<currentSource>_ALL.json`.
     * - If the graph contains no nodes for the current table, it adds a new data source node and fits the network view.
     * - Calculates the maximum X and Y coordinates of the nodes and stores the offset.
     * - Retrieves the data tables from the graph and clusters them with specific options, such as setting node properties like shape, color, and position.
     * - Calls the provided callback function after the graph is fully loaded and processed.
     *
     * @example
     * self.loadVisjsGraph(function() {
     *   console.log("Graph loaded and clustering applied.");
     * });
     */

    self.loadVisjsGraph = function (callback) {
        self.clearMappings();
        setTimeout(function () {
            self.visjsGraph.loadGraph("mappings_" + self.currentSource + "_ALL" + ".json", false, function (err, result) {
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

    /**
     * Handles the selection of a data source node in the jstree and performs appropriate actions based on the node type.
     *
     * @function
     * @name onDataSourcesJstreeSelect
     * @memberof module:MappingModeler
     *
     * @param {Object} event - The jstree event object.
     * @param {Object} obj - The selected node object from jstree.
     *
     * @description
     * - Checks the type of the selected node (databaseSource, csvSource, or table).
     * - For a "databaseSource", it initializes a new data source and loads the database source data.
     * - For a "csvSource", it initializes a new data source and loads the CSV file, setting the table name and columns.
     * - For a "table", it sets the current table and its columns, and loads the suggestion select jstree for columns.
     * - Updates the left panel view to show the appropriate mappings.
     * - Updates the displayed current data source name in the UI.
     *
     * @example
     * self.onDataSourcesJstreeSelect(event, obj);
     */
    self.onDataSourcesJstreeSelect = function (event, obj) {
        self.currentTreeNode = obj.node;

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
                MappingModeler.switchLeftPanel("mappings");
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
            MappingModeler.switchLeftPanel("mappings");
            //common.fillSelectOptions("axioms_legend_suggestionsSelect", self.currentTable.columns, false);
            $("#MappingModeler_currentDataSource").html(DataSourceManager.currentConfig.currentDataSource.name);
        }

        $("#MappingModeler_currentDataSource").html(DataSourceManager.currentConfig.currentDataSource.name);
        if (obj.node.data.type == "table") {
            $("#MappingModeler_currentDataSource").html(DataSourceManager.currentConfig.currentDataSource.currentTable);
        }
    };

    /**
     * Adds data source nodes and edges to the Vis.js graph for data tables that are not already present.
     *
     * @function
     * @name addDataSourceNode
     * @memberof module:MappingModeler
     *
     * @description
     * - Scans the existing nodes and edges in the graph to identify unique data tables.
     * - For each unique data table, adds a new node if it does not already exist in the graph.
     * - Creates edges from the data table node to all related column nodes, if those edges do not already exist.
     * - Adds the new nodes and edges to the graph using `addNode` and `addEdge` methods.
     *
     * @example
     * self.addDataSourceNode();
     */
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

    /**
     * Sends a request to generate and display sample triples based on the provided mappings.
     *
     * @function
     * @name viewSampleTriples
     * @memberof module:MappingModeler
     *
     * @param {Object} mappings - The mappings to be applied as a filter when generating the sample triples.
     *
     * @description
     * - Constructs a payload with the current source, data source, table name, and options.
     * - Sends a POST request to the server to generate sample triples based on the provided mappings.
     * - Displays the generated triples in a data table using `TripleFactory.showTriplesInDataTable`.
     * - Shows a dialog with the generated triples and allows the user to close the dialog.
     * - If an error occurs during the request, an alert is shown with the error message.
     *
     * @example
     * self.viewSampleTriples(mappings);
     */
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

    /**
     * Filters the suggestion tree based on the input keyword.
     *
     * @function
     * @name filterSuggestionTree
     * @memberof module:MappingModeler
     *
     * @description
     * - Retrieves the input keyword from the filter field and converts it to lowercase.
     * - Checks if the suggestion tree data exists and creates a copy of it if necessary.
     * - Filters the nodes in the suggestion tree, only including leaf nodes whose text contains the keyword.
     * - Updates the jstree with the filtered nodes using `JstreeWidget.updateJstree`.
     *
     * @example
     * self.filterSuggestionTree();
     */
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

    /**
     * Opens a dialog displaying a function from an external HTML file.
     *
     * @function
     * @name predicateFunctionShowDialog
     * @memberof module:MappingModeler
     *
     * @description
     * - Loads the HTML content from `functionDialog.html` into the `#smallDialogDiv` element.
     * - Opens the dialog to display the loaded content.
     *
     * @example
     * self.predicateFunctionShowDialog();
     */
    self.predicateFunctionShowDialog = function () {
        $("#smallDialogDiv").load("./modules/tools/mappingModeler/html/functionDialog.html", function () {
            $("#smallDialogDiv").dialog("open");
        });
    };

    /**
     * Adds a predicate function edge to the current graph.
     *
     * @function
     * @name addPredicateFunction
     * @memberof module:MappingModeler
     *
     * @description
     * - Creates an edge with a label "_function_" and a diamond-shaped arrow pointing to the target node.
     * - The edge's data contains the function body retrieved from the `#MappingModeler_fnBody` input field.
     * - Adds the edge to the graph and then closes the dialog displaying the function input.
     *
     * @example
     * self.addPredicateFunction();
     */
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

    /**
     * Loads the current source data and hides the graph edition buttons.
     *
     * @function
     * @name loadSource
     * @memberof module:MappingModeler
     *
     * @param {Function} callback - The function to be executed once the source is loaded successfully.
     *
     * @description
     * - Uses `Lineage_sources.loadSources` to load the current source specified in `MainController.currentSource`.
     * - On success, hides the graph edition buttons and calls the provided callback function.
     * - If an error occurs during the loading process, an alert is displayed with the error message.
     *
     * @example
     * self.loadSource(function() {
     *   console.log("Source loaded successfully");
     * });
     */
    self.loadSource = function (callback) {
        Lineage_sources.loadSources(MainController.currentSource, function (err) {
            if (err) {
                return alert(err.responseText);
            }
            $("#Lineage_graphEditionButtons").hide();
            return callback();
        });
    };

    /**
     * Displays sample data for the selected node with the specified columns.
     *
     * @function
     * @name showSampleData
     * @memberof module:MappingModeler
     *
     * @param {Object} node - The selected node from which to fetch data.
     * @param {Array|string} columns - The specific columns to display, can be an array or a single column name.
     * @param {Function} callback - A callback function to be executed after showing the data (optional).
     *
     * @description
     * - Checks if columns are specified and prepares the table accordingly.
     * - Fetches and displays sample data from either a database or CSV source.
     * - For a database source, it fetches the first 200 rows based on a predefined SQL query.
     * - Displays the data in a table with the specified columns.
     * - Alerts the user if the CSV source is not yet implemented.
     *
     * @example
     * self.showSampleData(node, ['column1', 'column2'], function() {
     *   console.log("Sample data displayed");
     * });
     */

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

    /**
     * Retrieves distinct data tables from the nodes in the Vis.js graph.
     *
     * @function
     * @name getDataTablesFromVisjsGraph
     * @memberof module:MappingModeler
     *
     * @returns {Array} - An array of distinct data table names.
     *
     * @description
     * - Iterates over the nodes in the Vis.js graph and extracts the `dataTable` property.
     * - Filters out `undefined` values and removes duplicates to return a list of unique data tables.
     *
     * @example
     * var dataTables = self.getDataTablesFromVisjsGraph();
     * console.log(dataTables); // Outputs distinct data tables in the graph.
     */
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

    /**
     * Updates a node in the Vis.js graph.
     *
     * @function
     * @name updateNode
     * @memberof module:MappingModeler
     * @param {Object} node - The node to update.
     * @description Updates the specified node in the graph and saves the changes.
     */
    self.updateNode = function (node) {
        if (!node) return;
        self.visjsGraph.data.nodes.update(node);
        self.saveVisjsGraph();
    };

    /**
     * Removes a node from the Vis.js graph.
     *
     * @function
     * @name removeNode
     * @memberof module:MappingModeler
     * @param {Object} node - The node to remove.
     * @description Removes the specified node from the graph and saves the changes.
     */
    self.removeNode = function (node) {
        if (!node) return;
        self.visjsGraph.data.nodes.remove(node);
        self.saveVisjsGraph();
    };

    /**
     * Adds a node to the Vis.js graph.
     *
     * @function
     * @name addNode
     * @memberof module:MappingModeler
     * @param {Object} node - The node to add.
     * @description Adds the specified node to the graph and saves the changes.
     */
    self.addNode = function (node) {
        if (!node) return;
        self.visjsGraph.data.nodes.add(node);
        self.saveVisjsGraph();
    };

    /**
     * Updates an edge in the Vis.js graph.
     *
     * @function
     * @name updateEdge
     * @memberof module:MappingModeler
     * @param {Object} edge - The edge to update.
     * @description Updates the specified edge in the graph and saves the changes.
     */
    self.updateEdge = function (edge) {
        if (!edge) return;
        self.visjsGraph.data.edges.update(edge);
        self.saveVisjsGraph();
    };

    /**
     * Removes an edge from the Vis.js graph.
     *
     * @function
     * @name removeEdge
     * @memberof module:MappingModeler
     * @param {Object} edge - The edge to remove.
     * @description Removes the specified edge from the graph and saves the changes.
     */
    self.removeEdge = function (edge) {
        if (!edge) return;
        self.visjsGraph.data.edges.remove(edge);
        self.saveVisjsGraph();
    };

    /**
     * Adds an edge to the Vis.js graph.
     *
     * @function
     * @name addEdge
     * @memberof module:MappingModeler
     * @param {Object} edge - The edge to add.
     * @description Adds the specified edge to the graph and saves the changes.
     */
    self.addEdge = function (edge) {
        if (!edge) return;
        self.visjsGraph.data.edges.add(edge);
        self.saveVisjsGraph();
    };

    return self;
})();

export default MappingModeler;
window.MappingModeler = MappingModeler;
