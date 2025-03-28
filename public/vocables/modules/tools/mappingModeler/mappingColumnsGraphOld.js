import common from "../../shared/common.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import MappingsDetails from "./mappingsDetails.js";
import DataSourceManager from "./dataSourcesManager.js";

/**
 * MappingColumnsGraph module.
 * Handles the visualization and management of mapping columns in a graph.
 * @module MappingColumnsGraph
 * @see [Tutorial: Overview]{@tutorial overview}
 */
var MappingColumnsGraph = (function () {
    var self = {};

    /**
     * Current graph node being manipulated.
     * @type {Object}
     * @memberof module:MappingColumnsGraph
     */
    self.currentOffset = null;

    /**
     * Stores the currently selected graph node.
     * @memberof module:MappingColumnsGraph
     */
    self.currentGraphNode = {};

    /**
     * Instance of the Vis.js graph.
     * @type {Object}
     * @memberof module:MappingColumnsGraph
     */
    self.visjsGraph = {};

    /**
     * ID of the HTML container where the graph is rendered.
     * @memberof module:MappingColumnsGraph
     */
    self.graphDiv = "mappingModeler_graphDiv";

    /**
     * X-axis step size for node positioning.
     * @type {number}
     * @memberof module:MappingColumnsGraph
     */
    var stepX = 200;

    /**
     * Y-axis step size for node positioning.
     * @type {number}
     * @memberof module:MappingColumnsGraph
     */
    var stepY = 150;

    /**
     * Minimum X position for graph layout adjustments.
     * @type {number}
     * @memberof module:MappingColumnsGraph
     */
    var minX = 0;

    /**
     * Draws a new resource node in the Vis.js graph.
     * Positions the node dynamically and links it with existing nodes if necessary.
     * @function
     * @name drawResource
     * @memberof module:MappingColumnsGraph
     * @param {Object} newResource - The resource to be added to the graph.
     * @returns {void}
     */
    self.drawResource = function (newResource) {
        self.graphDivWidth = $("#mappingModeler_graphDiv").width();
        minX = -self.graphDivWidth / 2 + stepX;
        var arrows = {
            to: {
                enabled: true,
                type: "arrow",
            },
        };
        var edgeColor = "#ccc";
        self.initOffsets();
        if (self.currentGraphNode && newResource.data.type == "Class") {
            newResource.x = self.currentGraphNode.x;
            newResource.y = self.currentGraphNode.y - 100;
        } else {
            newResource.x = self.currentOffset.x += 200;
            if (self.currentOffset.x > self.graphDivWidth) {
                self.currentOffset.y += stepY;
                self.currentOffset.x = minX;
            }
            newResource.y = self.currentOffset.y;
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
            self.visjsGraph.network.fit();

            if (self.currentGraphNode && self.currentGraphNode.data) {
                if (newResource.data.type == "Class" && self.currentGraphNode) {
                    var label, type;
                    if (self.currentGraphNode.data.type == "Class") {
                        label = "";
                        type = "rdfs:subClassOf";
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
                        arrows: arrows,
                        color: edgeColor,
                    });

                    //  self.updateCurrentGraphNode(visjsNode);
                    self.addEdge(visjsData.edges);
                }
            }

            //
        } else {
            self.drawGraphCanvas(self.graphDiv, visjsData);
        }

        MappingModeler.hideForbiddenResources(newResource.data.type);
        //$("#axioms_legend_suggestionsSelect").empty();
        JstreeWidget.empty("suggestionsSelectJstreeDiv");
        //$('#suggestionsSelectJstreeDiv').jstree().destroy();

        self.currentGraphNode = newResource;
    };

    /**
     * Initializes the offset values for positioning nodes in the graph.
     * Ensures that the offset is set correctly before adding new nodes.
     * @function
     * @name initOffsets
     * @memberof module:MappingColumnsGraph
     * @returns {void}
     */
    self.initOffsets = function () {
        if (!self.currentOffset) {
            self.currentOffset = { x: -self.graphDivWidth / 2, y: 0 };
        }
    };

    /**
     * Checks if a given object ID already exists in the Vis.js graph.
     * Iterates through existing nodes to determine if the ID is present.
     * @function
     * @name objectIdExistsInGraph
     * @memberof module:MappingColumnsGraph
     * @param {string} id - The ID of the object to check.
     * @returns {boolean} True if the object exists, otherwise false.
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
     * Draws the graph canvas using Vis.js with specified options.
     * Configures the graph's visual settings and event handlers.
     * @function
     * @name drawGraphCanvas
     * @memberof module:MappingColumnsGraph
     * @param {string} graphDiv - The ID of the div container for the graph.
     * @param {Object} visjsData - Data containing nodes and edges for the graph.
     * @param {Function} [callback] - Optional callback function to execute after drawing.
     * @returns {void}
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

            onclickFn: MappingColumnsGraph.onVisjsGraphClick,
            onRightClickFn: MappingColumnsGraph.showGraphPopupMenu,
        };

        self.visjsGraph = new VisjsGraphClass(graphDiv, visjsData, self.graphOptions);
        self.visjsGraph.draw(function () {
            if (callback) {
                return callback();
            }
        });
    };

    /**
     * Handles click events on the Vis.js graph.
     * Updates the current selected node and manages relations between columns.
     * @function
     * @name onVisjsGraphClick
     * @memberof module:MappingColumnsGraph
     * @param {Object} node - The clicked node object.
     * @param {Object} event - The click event object.
     * @param {Object} options - Additional event options.
     * @param {boolean} [options.ctrlKey=false] - Indicates if the Ctrl key was pressed during the click.
     * @param {boolean} [options.shiftKey=false] - Indicates if the Shift key was pressed during the click.
     * @param {boolean} [options.altKey=false] - Indicates if the Alt key was pressed during the click.
     * @returns {void}
     */
    self.onVisjsGraphClick = function (node, event, options) {
        if (!node) {
            MappingModeler.currentRelation = null;
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
                    if (connection.edge.data.type == "rdf:type" || connection.edge.data.type == "rdfs:subClassOf") {
                        classId = connection.toNode.data.id;
                    }
                });
                return classId;
            }

            if (!MappingModeler.currentRelation) {
                MappingModeler.currentRelation = {
                    from: { id: node.id, classId: getColumnClass(node), dataTable: node.data.dataTable },
                    to: null,
                    type: node.data.type,
                };
            } else {
                if (node.data.dataTable && node.data.dataTable != MappingModeler.currentRelation.from.dataTable) {
                    MappingModeler.currentRelation = null;
                    return alert("Relations between Columns from different datbels are not possible");
                }
                MappingModeler.currentRelation.to = { id: node.id, classId: getColumnClass(node) };
                if (MappingModeler.currentRelation.type != "Class" && node.data.type == "Class") {
                    self.graphActions.drawColumnToClassEdge(MappingModeler.currentRelation);
                } else if (MappingModeler.currentRelation.from.type != "Class" && node.data.type != "Class") {
                    MappingModeler.onLegendNodeClick({ id: "ObjectProperty" });
                }
            }
        } else {
            MappingModeler.currentRelation = null;
        }
    };

    /**
     * Displays the context menu for a graph node.
     * Shows relevant options based on the node type (Class, Column, or Edge).
     * @function
     * @name showGraphPopupMenu
     * @memberof module:MappingColumnsGraph
     * @param {Object} node - The node where the menu should appear.
     * @param {Object} point - The coordinates for the popup menu.
     * @param {Object} event - The event triggering the menu.
     * @returns {void}
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
            html = '    <span class="popupMenuItem" onclick="MappingColumnsGraph.graphActions.removeNodeEdgeGraph();"> Remove Edge</span>';
        } else {
            html = '    <span class="popupMenuItem" onclick="MappingColumnsGraph.graphActions.removeNodeFromGraph();"> Remove Node</span>';
        }
        html += "--------------<br>";
        if (node.data) {
            if (node.data.type == "Class") {
                html += '    <span class="popupMenuItem" onclick="MappingColumnsGraph.graphActions.showNodeInfos()">Node Infos</span>';
                html += '    <span class="popupMenuItem" onclick="MappingColumnsGraph.graphActions.addSuperClassToGraph()">draw superClass</span>';
            }
            if (node.data.type == "Column") {
                html += '    <span class="popupMenuItem" onclick="MappingColumnsGraph.graphActions.showColumnDetails()">Detailed mappings</span>';
                html += '    <span class="popupMenuItem" onclick="MappingColumnsGraph.graphActions.showSampledata()">show sample data</span>';
            }
        }

        $("#popupMenuWidgetDiv").html(html);
        point.x = event.x;
        point.y = event.y;
        PopupMenuWidget.showPopup(point, "popupMenuWidgetDiv");
    };

    self.graphActions = {
        /**
         * Outlines a selected node by increasing its border width.
         * @function
         * @name outlineNode
         * @memberof module:MappingColumnsGraph
         * @param {string} nodeId - The ID of the node to highlight.
         * @returns {void}
         */
        outlineNode: function (nodeId) {
            self.visjsGraph.decorateNodes(null, { borderWidth: 1 });
            self.visjsGraph.decorateNodes(nodeId, { borderWidth: 5 });
        },

        /**
         * Removes a node from the graph after user confirmation.
         * Also removes its connected edges.
         * @function
         * @name removeNodeFromGraph
         * @memberof module:MappingColumnsGraph
         * @returns {void}
         */
        removeNodeFromGraph: function () {
            if (confirm("delete node")) {
                var edges = self.visjsGraph.network.getConnectedEdges(self.currentGraphNode.id);
                self.removeEdge(edges);
                self.removeNode(self.currentGraphNode.id);
            }
        },

        /**
         * Removes an edge from the graph after user confirmation.
         * @function
         * @name removeNodeEdgeGraph
         * @memberof module:MappingColumnsGraph
         * @returns {void}
         */
        removeNodeEdgeGraph: function () {
            if (confirm("delete edge")) {
                self.removeEdge(self.currentGraphNode.id);
            }
        },

        /**
         * Adds a superclass to the graph for the selected node.
         * Queries the ontology for superclass relationships.
         * @function
         * @name addSuperClassToGraph
         * @memberof module:MappingColumnsGraph
         * @returns {void}
         */
        addSuperClassToGraph: function () {
            var options = {
                filter: " ?object rdf:type owl:Class",
                withImports: true,
            };
            Sparql_OWL.getFilteredTriples(MappingModeler.currentSLSsource, self.currentGraphNode.data.id, "http://www.w3.org/2000/01/rdf-schema#subClassOf", null, options, function (err, result) {
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
         * Draws an edge between a column and a class in the graph.
         * @function
         * @name drawColumnToClassEdge
         * @memberof module:MappingColumnsGraph
         * @returns {void}
         */
        drawColumnToClassEdge: function () {
            if (!MappingModeler.currentRelation) {
                return;
            }
            var edges = [
                {
                    from: MappingModeler.currentRelation.from.id,
                    to: MappingModeler.currentRelation.to.id,
                    label: "",
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
            MappingModeler.currentRelation = null;
        },

        /**
         * Displays detailed information about the selected node.
         * @function
         * @name showNodeInfos
         * @memberof module:MappingColumnsGraph
         * @returns {void}
         */
        showNodeInfos: function () {
            if (self.currentGraphNode.data.type == "URI") {
            } else if (["Column", "RowIndex", "VirtualColumn"].indexOf(self.currentGraphNode.data.type) > -1) {
                return;
                /*  MappingsDetails.mappingColumnInfo.editColumnInfos();
                  MappingsDetails.mappingColumnInfo.columnClass = self.getColumnType(self.currentGraphNode.id);*/
            } else {
                NodeInfosWidget.showNodeInfos(self.currentGraphNode.data.source, self.currentGraphNode, "smallDialogDiv");
            }
        },

        /**
         * Displays sample data related to the selected column.
         * @function
         * @name showSampledata
         * @memberof module:MappingColumnsGraph
         * @returns {void}
         */
        showSampledata: function () {
            MappingModeler.showSampleData();
        },

        /**
         * Shows detailed mappings for the selected column in a dialog.
         * @function
         * @name showColumnDetails
         * @memberof module:MappingColumnsGraph
         * @param {Object} [node] - The node for which details should be displayed. Defaults to the currently selected node.
         * @returns {void}
         */
        showColumnDetails: function (node) {
            var divId = "columnMappingDetailsDiv";
            $("#smallDialogDiv").html("<div id='" + divId + "'></div>");
            $("#smallDialogDiv").dialog("option", "title", "Column Technical Mappings");
            $("#smallDialogDiv").dialog("open");
            MappingsDetails.showColumnTechnicalMappingsDialog(divId, node || self.currentGraphNode, function () {
                $("#smallDialogDiv").dialog("close");
            });
        },
    };

    /**
     * Loads the Vis.js graph for the current mapping source.
     * Retrieves graph data from a JSON file and adjusts layout positioning.
     * Clusters nodes based on data tables for better visualization.
     * @function
     * @name loadVisjsGraph
     * @memberof module:MappingColumnsGraph
     * @param {function} [callback] - Optional callback function executed after loading the graph.
     * @returns {void}
     */
    self.loadVisjsGraph = function (callback) {
        MappingModeler.clearMappings();
        setTimeout(function () {
            self.visjsGraph.loadGraph("mappings_" + MappingModeler.currentSLSsource + "_ALL" + ".json", false, function (err, result) {
                if (result?.options?.config) {
                    DataSourceManager.rawConfig = result.options.config;
                    DataSourceManager.currentConfig = result.options.config;
                }
                if (true) {
                    //  self.addDataSourceNode();
                    self.visjsGraph.network.fit();
                    var maxX = 0;
                    var maxY = 0;
                    self.visjsGraph.data.nodes.get().forEach(function (node) {
                        maxX = Math.max(node.x, maxX);
                        maxY = Math.max(node.y, maxY);
                    });
                    if (maxX + stepX > self.graphDivWidth) {
                        self.currentOffset = {
                            x: minX,
                            y: maxY + stepY,
                        };
                    } else {
                        self.currentOffset = {
                            x: maxX + stepX,
                            y: maxY,
                        };
                    }
                }

                if (result?.nodes) {
                    self.createDataSourcesClusters();
                }

                if (callback) {
                    return callback();
                }
            });
        }, 500);
    };
    /**
     * Creates clusters from the different data sources used in the graph.
     * Groups nodes based on their associated data tables and clusters them for better visualization.
     *
     * @function
     * @name createDataSourcesClusters
     * @returns {void}
     */
    self.createDataSourcesClusters = function () {
        var map = {};
        var index = 0;
        var dataTables = self.getDatasourceTablesFromVisjsGraph();

        for (var tableIndex in dataTables) {
            var table = dataTables[tableIndex];

            var clusterOptionsByData = {
                joinCondition: function (node) {
                    if (node.data && node.data.dataTable == table && table != MappingModeler?.currentTable?.name) {
                        if (!map[node.id]) {
                            map[node.id] = table;
                            return true;
                        }
                    }
                    return false;
                },

                clusterNodeProperties: {
                    id: "cluster_" + table,
                    borderWidth: 3,
                    shape: "ellipse",
                    color: "#ddd",
                    label: table,
                    y: -200,
                    x: index++ * 250 - 400,
                    fixed: { x: true, y: true },
                    data: { table: table },
                    allowSingleNodeCluster: true,
                },
            };

            self.visjsGraph.network.clustering.cluster(clusterOptionsByData);
        }
    };

    /**
     * Saves the current Vis.js graph to a JSON file.
     * Captures nodes, edges, positions, and configuration data before sending it to the backend for storage.
     * @function
     * @name saveVisjsGraph
     * @memberof module:MappingColumnsGraph
     * @param {function} [callback] - Optional callback function executed after saving the graph.
     * @returns {void}
     */
    self.saveVisjsGraph = function (callback) {
        var fileName = "mappings_" + MappingModeler.currentSLSsource + "_ALL" + ".json";
        var graph = MappingColumnsGraph.visjsGraph;
        var nodes = graph.data.nodes.get();
        var positions = graph.network.getPositions();
        // Initialisation of Config if there isn't
        if (!DataSourceManager.rawConfig || Object.keys(DataSourceManager.rawConfig).length == 0) {
            var newJson = {
                sparqlServerUrl: Config.sources[MappingModeler.currentSLSsource].sparql_server.url,
                graphUri: Config.sources[MappingModeler.currentSLSsource].graphUri,
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

    /**
     * Adds data source nodes and edges to the Vis.js graph, representing data tables and their relationships.
     * Checks for existing nodes and edges, adding new ones if necessary.
     * Links data tables to columns based on their associations.
     * @function
     * @name addDataSourceNode
     * @memberof module:MappingColumnsGraph
     * @returns {void}
     */
    self.addDataSourceNode = function () {
        return;
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
        //  MappingColumnsGraph.saveVisjsGraph();
        return;
    };

    /**
     * Retrieves distinct data tables from the Vis.js graph nodes.
     * Filters out undefined values and returns a list of unique data tables.
     * @function
     * @name getDatasourceTablesFromVisjsGraph
     * @memberof module:MappingColumnsGraph
     * @returns {Array<string>} List of unique data table names.
     */
    self.getDatasourceTablesFromVisjsGraph = function () {
        var tables = self.visjsGraph.data.nodes.get().map(function (node) {
            return node?.data?.dataTable;
        });
        if (tables.length > 0) {
            tables = common.array.distinctValues(tables);
            tables = tables.filter(function (item) {
                return item != undefined;
            });
        } else {
            tables = [];
        }
        return tables;
    };

    /**
     * Updates a node in the Vis.js graph and saves the updated graph.
     * @function
     * @name updateNode
     * @memberof module:MappingColumnsGraph
     * @param {Object} node - The node to be updated.
     * @returns {void}
     */
    self.updateNode = function (node) {
        if (!node) {
            return;
        }
        self.visjsGraph.data.nodes.update(node);
        self.saveVisjsGraph();
    };

    /**
     * Removes a node from the Vis.js graph and saves the updated graph.
     * @function
     * @name removeNode
     * @memberof module:MappingColumnsGraph
     * @param {Object} node - The node to be removed.
     * @returns {void}
     */
    self.removeNode = function (node) {
        if (!node) {
            return;
        }
        self.visjsGraph.data.nodes.remove(node);
        self.saveVisjsGraph();
    };

    /**
     * Adds a new node to the Vis.js graph and saves the updated graph.
     * @function
     * @name addNode
     * @memberof module:MappingColumnsGraph
     * @param {Object} node - The node to be added.
     * @returns {void}
     */
    self.addNode = function (node) {
        if (!node) {
            return;
        }
        self.visjsGraph.data.nodes.add(node);
        self.saveVisjsGraph();
    };

    /**
     * Updates an edge in the Vis.js graph and saves the updated graph.
     * @function
     * @name updateEdge
     * @memberof module:MappingColumnsGraph
     * @param {Object} edge - The edge to be updated.
     * @returns {void}
     */
    self.updateEdge = function (edge) {
        if (!edge) {
            return;
        }
        self.visjsGraph.data.edges.update(edge);
        self.saveVisjsGraph();
    };

    /**
     * Removes an edge from the Vis.js graph and saves the updated graph.
     * @function
     * @name removeEdge
     * @memberof module:MappingColumnsGraph
     * @param {Object} edge - The edge to be removed.
     * @returns {void}
     */
    self.removeEdge = function (edge) {
        if (!edge) {
            return;
        }
        self.visjsGraph.data.edges.remove(edge);
        self.saveVisjsGraph();
    };

    /**
     * Adds a new edge to the Vis.js graph and saves the updated graph.
     * @function
     * @name addEdge
     * @memberof module:MappingColumnsGraph
     * @param {Object} edge - The edge to be added.
     * @returns {void}
     */
    self.addEdge = function (edge) {
        if (!edge) {
            return;
        }
        self.visjsGraph.data.edges.add(edge);
        self.saveVisjsGraph();
    };

    /**
     * Saves the Vis.js graph with the current configuration.
     * @function
     * @name saveVisjsGraphWithConfig
     * @memberof module:MappingColumnsGraph
     * @param {Function} callback - Optional callback to execute after saving.
     * @returns {void}
     */
    self.saveVisjsGraphWithConfig = function (callback) {
        self.saveVisjsGraph(callback);
    };

    /**
     * Clears the current graph, resets offsets, and reinitializes the graph canvas.
     * @function
     * @name clearGraph
     * @memberof module:MappingColumnsGraph
     * @returns {void}
     */
    self.clearGraph = function () {
        var currentDataSource = DataSourceManager.currentConfig.currentDataSource;
        MappingColumnsGraph.visjsGraph.clearGraph();
        MappingColumnsGraph.visjsGraph = null;
        var visjsData = { nodes: [], edges: [] };
        MappingColumnsGraph.drawGraphCanvas(MappingColumnsGraph.graphDiv, visjsData, function () {
            DataSourceManager.currentConfig.currentDataSource = currentDataSource;
        });
        self.initOffsets();
    };

    return self;
})();

export default MappingColumnsGraph;
window.MappingColumnsGraph = MappingColumnsGraph;
