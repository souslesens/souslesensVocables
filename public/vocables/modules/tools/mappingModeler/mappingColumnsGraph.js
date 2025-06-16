import common from "../../shared/common.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import MappingsDetails from "./mappingsDetails.js";
import DataSourceManager from "./dataSourcesManager.js";
import MappingModeler from "./mappingModeler.js";

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
     *  returns a visjsNode representing a table
     * @param table
     * @returns {{shape: string, color: string, data: {id, label, type: string}, id, label}}
     */

    /**
     * defines the parameters of the hierachical layout of visjs Graph graph
     * @type {{treeSpacing: number, sortMethod: string, blockShifting: boolean, levelSeparation: number, parentCentralization: boolean, nodeSpacing: number, shakeTowards: string, edgeMinimization: boolean, direction: string}}
     */
    self.layoutHierarchical = {
        direction: "DU",
        sortMethod: "hubsize",
        shakeTowards: "roots",
        blockShifting: true,
        edgeMinimization: true,
        parentCentralization: true,
        treeSpacing: 200,
        nodeSpacing: 200,
        levelSeparation: 300,
    };
    self.physicsHierarchical = {
        enabled: false,
        hierarchicalRepulsion: {
            centralGravity: 0.3,
            nodeDistance: 200,
        },
    };
    self.getVisjsTableNode = function (table) {
        var newRessource = {
            id: table,
            label: table,

            shape: "box",
            color: "#d8cacd",
            level: 1,
            data: {
                id: table,
                label: table,
                type: "Table",
                dataTable: table,
            },
        };
        return newRessource;
    };

    /**
     * return a visJsEdge
     * @param from
     * @param to
     * @param label
     * @param arrowType
     * @param uri
     * @returns {{data: {id, source: (*|null), type}, color: *, arrows: {to: {type, enabled: boolean}}, from, to, label, smooth: {forceDirection: string, roundness: number, type: string}}}
     */
    self.getVisjsObjectPropertyEdge = function (from, to, label, arrowType, property, uri, color) {
        var edge = {
            from: from,
            to: to,
            label: label,
            width: 4,
            arrows: {
                to: {
                    enabled: true,
                    type: arrowType,
                },
            },
            smooth: {
                type: "curvedCW",
                forceDirection: "vertical",
                roundness: 0.65,
            },
            data: {
                id: uri,
                type: uri,
                source: property ? property.source : null,
            },
            color: color,
        };
        return edge;
    };
    /**
     * Draws a new resource node in the Vis.js graph.
     * Positions the node dynamically and links it with existing nodes if necessary.
     * @function
     * @name drawResource
     * @memberof module:MappingColumnsGraph
     * @param {Object} newResource - The resource to be added to the graph.
     * @returns {void}
     */
    self.drawResource = function (newResource, callback) {
        self.graphDivWidth = $("#mappingModeler_graphDiv").width();
        minX = -self.graphDivWidth / 2 + stepX;
        var arrows = {
            to: {
                enabled: true,
                type: "arrow",
            },
        };
        var edgeColor = "#ccc";

        if (self.currentGraphNode && newResource.data.type == "Class") {
            newResource.level = 3;
        } else if (self.currentGraphNode && newResource.data.type == "Table") {
            newResource.level = 1;
        } else {
            newResource.level = 2;
        }

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
            //  self.visjsGraph.network.fit();

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
                        width: 3,
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

        // MappingModeler.hideForbiddenResources(newResource.data.type);
        JstreeWidget.empty("suggestionsSelectJstreeDiv");
        self.currentGraphNode = newResource;
        if (callback) {
            callback();
        }
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
    //
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
            physics: self.physicsHierarchical,

            visjsOptions: {
                edges: {
                    smooth: true,
                },
            },

            layoutHierarchical: self.layoutHierarchical,
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
               if ( !DataSourceManager.currentConfig.currentDataSource) {
                    return alert("choose a data source first");
                }
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
            if (node.data && node.data.type == "Table") {
                var tableSourceType = node.id.indexOf(".") > -1 ? "csvSource" : "table";

                if (tableSourceType == "table" && !DataSourceManager.currentConfig.currentDataSource) {
                    return alert("choose a data source first");
                    
                }

                var obj = {
                    event: "xx",
                    node: {
                        id: node.id,
                        data: { type: tableSourceType, id: node.id, label: node.id },
                    },
                };
                DataSourceManager.onDataSourcesJstreeSelect(null, obj);
                //  self.zoomOnTable(node.id)
            }

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
                    color: "#00afef",
                    width: 3,
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
     * Adds nodes to the Vis.js graph in batches based on their associated data tables.
     * Nodes are grouped by their `dataTable` property and added to the graph incrementally.
     * Ensures that the graph layout is adjusted after each batch is added.
     * Permits to have a structured visualisation
     *
     * @function
     * @name addNodesByDataTableBatch
     * @memberof module:MappingColumnsGraph
     * @param {Array<Object>} nodes - The list of nodes to be added to the graph.
     * @returns {void}
     */

    self.addNodesByDataTableBatch = function (nodes, callback) {
        var dataTables = nodes.map(function (node) {
            return node.data.dataTable;
        });
        dataTables = common.array.distinctValues(dataTables);
        dataTables = dataTables.filter(function (item) {
            return item != undefined;
        });
        var index = 0;
        async.eachSeries(
            dataTables,
            function (table, callbackEach) {
                var tableNodes = nodes.filter(function (node) {
                    return node.data.dataTable == table;
                });
                if (index == 0) {
                    MappingColumnsGraph.visjsGraph.data.nodes = tableNodes;
                    MappingColumnsGraph.visjsGraph.draw(function () {
                        MappingColumnsGraph.visjsGraph.network.fit();
                        callbackEach();
                    });
                } else {
                    MappingColumnsGraph.visjsGraph.data.nodes.add(tableNodes);
                    MappingColumnsGraph.visjsGraph.network.fit();
                    callbackEach();
                }
                index++;
            },
            function (err) {
                if (err) {
                    return alert(err);
                }
                var classNodes = nodes.filter(function (node) {
                    return node.data.type == "Class";
                });
                MappingColumnsGraph.visjsGraph.data.nodes.add(classNodes);
                MappingColumnsGraph.visjsGraph.network.fit();
                if (callback) {
                    callback();
                }
            },
        );
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
        //   return callback()
        setTimeout(function () {
            self.visjsGraph.loadGraph(
                "mappings_" + MappingModeler.currentSLSsource + "_ALL" + ".json",
                false,
                function (err, result) {
                    if (err) {
                        if (callback) {
                            return callback(err);
                        }
                        return err;
                    }
                    if (result?.options?.config) {
                        DataSourceManager.rawConfig = result.options.config;
                        DataSourceManager.currentConfig = result.options.config;
                    }
                    MappingColumnsGraph.visjsGraph.data = result;
                    if (result.nodes.length == 0) {
                        MappingColumnsGraph.visjsGraph.draw(function () {
                            if (callback) {
                                return callback();
                            }
                        });
                    }
                    // Draw graph by DataTable batches
                    self.addNodesByDataTableBatch(result.nodes, function () {
                        if (true) {
                            self.visjsGraph.data.nodes.get().forEach(function (node) {
                                if (node.data.type == "Class") {
                                    node.level = 3;
                                } else if (node.data.type == "Table") {
                                    node.level = 1;
                                } else {
                                    node.level = 2;
                                }
                            });
                            self.visjsGraph.data.edges.get().forEach(function (edge) {
                                if (edge.smooth === null) {
                                    edge.smooth = "smooth";
                                }
                            });
                        }

                        MappingColumnsGraph.visjsGraph.network.setOptions({ physics: self.physicsHierarchical });
                        UI.resetWindowSize();

                        if (callback) {
                            return callback();
                        }
                    });
                },
                true,
                self.migrateToHierarchicalGraphFn,
            );
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
        if (graph.data?.nodes?.length == 0) {
            nodes = [];
        } else {
            var nodes = graph.data.nodes.get();
        }
        if (graph.data?.edges?.length == 0) {
            edges = [];
        } else {
            var edges = graph.data.edges.get();
        }
        //var nodes = graph.data.nodes.get();
        //var positions = {};
        var positions = graph.network.getPositions();
        // Initialisation of Config if there isn't
        if (!DataSourceManager.rawConfig || Object.keys(DataSourceManager.rawConfig).length == 0) {
            if (Config.sources[MappingModeler.currentSLSsource].baseUri) {
                var graphUri = Config.sources[MappingModeler.currentSLSsource].baseUri;
            } else {
                var graphUri = Config.sources[MappingModeler.currentSLSsource].graphUri;
            }
            var newJson = {
                sparqlServerUrl: Config.sources[MappingModeler.currentSLSsource].sparql_server.url,
                graphUri: graphUri,
                prefixes: {},
                lookups: {},
                databaseSources: {},
                csvSources: {},
                isConfigInMappingGraph: true,
            };
            DataSourceManager.rawConfig = newJson;
        }
        nodes = self.sortVisjsColumns(nodes);
        var config = JSON.parse(JSON.stringify(DataSourceManager.rawConfig));
        // replace the graphUri by baseUri (graphUri used in old versions)
        if (Config.sources[MappingModeler.currentSLSsource].baseUri) {
            config.graphUri = Config.sources[MappingModeler.currentSLSsource].baseUri;
        } else {
            config.graphUri = Config.sources[MappingModeler.currentSLSsource].graphUri;
        }

        delete config.currentDataSource;
        var data = {
            nodes: nodes,
            edges: edges,
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
     * Retrieves distinct data tables from the Vis.js graph nodes.
     * Filters out undefined values and returns a list of unique data tables.
     * @function
     * @name getDatasourceTablesFromVisjsGraph
     * @memberof module:MappingColumnsGraph
     * @returns {Array<string>} List of unique data table names.
     */
    self.getDatasourceTablesFromVisjsGraph = function () {
        if (self?.visjsGraph?.data?.nodes?.length == 0) {
            return [];
        }
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
        self.saveVisjsGraph(function () {
            //   self.loadVisjsGraph();
        });
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
     * @name sortVisjsColumns
     * @memberof module:MappingColumnsGraph
     * @param {array}  nodes - The nodes to be sorted.
     * @returns {void}
     */
    self.sortVisjsColumns = function (nodes) {
        //var typesWithDataTable = ["Table", "Column", "RowIndex", "VirtualColumn"];
        nodes.sort(function (a, b) {
            if (!a.data.dataTable && !b.data.dataTable) {
                return 0;
            }
            if (!a.data.dataTable) {
                return -1;
            }
            if (!b.data.dataTable) {
                return 1;
            }
            if (a.data.dataTable < b.data.dataTable) {
                return -1;
            } else if (a.data.dataTable > b.data.dataTable) {
                return 1;
            }
            return 0;
        });
        return nodes;
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
        try {
            self.visjsGraph.data.edges.add(edge);
        } catch (e) {
            console.log(e);
        }
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

    /**
     *
     * @param table
     */
    self.zoomOnTable = function (table) {
        MappingColumnsGraph.hideNodesFromOtherTables(table);
        self.visjsGraph.network.focus(table, {
            scale: 0.85,
            offset: { x: 10, y: 200 },
            locked: false,
            animation: true,
        });
    };

    /**
     * migrates existing graphs based on previous version to hierarchical graph without fixed positions
     * @param data
     */
    self.migrateToHierarchicalGraphFn = function (data) {
        var visjsOptions = data.context.options.visjsOptions;
        data.positions = {};
        var isHierarchical = visjsOptions.layout && visjsOptions.layout.hierarchical;
        var distinctEdges = {};
        var dataTables = self.getDatasourceTablesFromVisjsGraph();
        if (true || !isHierarchical) {
            var tables = {};
            var nodesMap = {};
            var newNodes = [];
            data.nodes.forEach(function (oldNode) {
                var node = {};
                node.id = oldNode.id;
                node.label = oldNode.label;
                node.data = oldNode.data;
                node.shape = "box";
                node.color = oldNode.color;
                node.size = 18;

                if (oldNode.data.type == "Class") {
                    node.level = 3;
                } else if (oldNode.data.type == "Table") {
                    node.color = "#d8cacd";
                    node.level = 1;
                    node.data.dataTable = node.id;
                } else {
                    node.level = 2;

                    if (node.data.dataTable) {
                        var dataTableToNodeEdges = data.edges.filter(function (edge) {
                            return edge.to == node.id && edge.from == node.data.dataTable;
                        });
                        if (dataTableToNodeEdges.length == 0) {
                            var edgeKey = node.data.dataTable + node.id;
                            if (!distinctEdges[edgeKey]) {
                                distinctEdges[edgeKey] = 1;
                                data.edges.push({
                                    id: common.getRandomHexaId(5),
                                    to: node.id,
                                    from: node.data.dataTable,
                                    color: "#ef4270",
                                    width: 2,
                                });
                            }
                        }
                        if (!tables[node.data.dataTable]) {
                            tables[node.data.dataTable] = 1;
                        }
                    }
                }

                nodesMap[node.id] = node;
                newNodes.push(node);
            });
            //newNodes=self.sortVisjsColumns(newNodes);
            data.nodes = newNodes;

            data.edges.forEach(function (edge) {
                edge.width = 3;
                edge.font = { size: 16 };
                if (edge.smooth === null) {
                    edge.smooth = {
                        type: "curvedCW",
                        forceDirection: "vertical",
                        roundness: 0.45,
                    };
                }
            });

            for (var table in tables) {
                if (!nodesMap[table]) {
                    var tableNode = MappingColumnsGraph.getVisjsTableNode(table);
                    data.nodes.push(tableNode);
                }
            }
            data.context.options.layoutHierarchical = self.layoutHierarchical;
            data.nodes = self.sortVisjsColumns(data.nodes);
        }
        /**
         * Exports the current mappings from the Vis.js graph to a JSON file.
         * Saves the graph data before exporting
         * Handles errors during the export process and displays appropriate messages.
         *
         * @function
         * @name exportMappings
         * @memberof module:MappingColumnsGraph
         * @returns {void}
         */
        self.exportMappings = function () {
            self.saveVisjsGraph(function (err) {
                var fileName = "mappings_" + MappingModeler.currentSLSsource + "_ALL" + ".json";
                var payload = {
                    dir: "graphs/",
                    fileName: fileName,
                };

                $.ajax({
                    type: "GET",
                    url: `${Config.apiUrl}/data/file`,
                    data: payload,
                    dataType: "json",
                    success: function (result, _textStatus, _jqXHR) {
                        var data = JSON.parse(result);
                        if (data?.options?.config?.sparqlServerUrl) {
                            data.options.config.sparqlServerUrl = "_default";
                        }
                        Export.downloadJSON(data, fileName);
                    },
                    error(err) {
                        if (callback) {
                            return callback(err);
                        }
                        if (err.responseJSON == "file does not exist") {
                            return;
                        }
                        return alert(err);
                    },
                });
            });
        };

        self.importMappingsFromJSONFile = function () {
            ImportFileWidget.showImportDialog(function (err, result) {
                if (err) {
                    return alert(err);
                }
                var data = JSON.parse(result);
                if (data.nodes.length == 0) {
                    return alert("no nodes in file");
                }
                var fileName = "mappings_" + MappingModeler.currentSLSsource + "_ALL" + ".json";
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
                    success: function (result, _textStatus, _jqXHR) {
                        MappingModeler.onLoaded();
                    },
                    error(err) {
                        return alert(err);
                    },
                });
            });
        };

        return data;
    };
    /**
     * Imports mappings from a JSON file into the Vis.js graph file.
     * Opens a file import dialog, parses the JSON content, and uploads the data to the graphs in instance data repository.
     *
     * @function
     * @name importMappingsFromJSONFile
     * @memberof module:MappingColumnsGraph
     * @returns {void}
     */
    self.importMappingsFromJSONFile = function () {
        ImportFileWidget.showImportDialog(function (err, result) {
            if (err) {
                return alert(err);
            }
            var data = JSON.parse(result);
            if (data.nodes.length == 0) {
                return alert("no nodes in file");
            }
            if (data?.options?.config?.graphUri != Config.sources[MainController.currentSource].graphUri) {
                return alert("graphUri in file is not the same as the current graphUri, update graphURI in JSON file");
            }
            var fileName = "mappings_" + MappingModeler.currentSLSsource + "_ALL" + ".json";
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
                success: function (result, _textStatus, _jqXHR) {
                    MappingModeler.onLoaded();
                },
                error(err) {
                    return alert(err);
                },
            });
        });
    };

    /**
     * Exports the current mappings from the Vis.js graph to a JSON file.
     * Saves the graph data before exporting
     *
     *
     * @function
     * @name exportMappings
     * @memberof module:MappingColumnsGraph
     * @returns {void}
     */
    self.exportMappings = function () {
        self.saveVisjsGraph(function (err) {
            var fileName = "mappings_" + MappingModeler.currentSLSsource + "_ALL" + ".json";
            var payload = {
                dir: "graphs/",
                fileName: fileName,
            };

            $.ajax({
                type: "GET",
                url: `${Config.apiUrl}/data/file`,
                data: payload,
                dataType: "json",
                success: function (result, _textStatus, _jqXHR) {
                    var data = JSON.parse(result);
                    Export.downloadJSON(data, fileName);
                },
                error(err) {
                    if (callback) {
                        return callback(err);
                    }
                    if (err.responseJSON == "file does not exist") {
                        return;
                    }
                    return alert(err);
                },
            });
        });
    };

    self.hideNodesFromOtherTables = function (table) {
        var nodes = MappingColumnsGraph.visjsGraph.data.nodes.get();
        var newNodes = [];
        nodes.forEach(function (node) {
            var hide = false;
            if (node.data && node.data.dataTable && node.data.dataTable != table) hide = true;
            newNodes.push({ id: node.id, hidden: hide });
        });
        MappingColumnsGraph.visjsGraph.data.nodes.update(newNodes);
    };
    return self;
})();

export default MappingColumnsGraph;
window.MappingColumnsGraph = MappingColumnsGraph;
