import common from "../../shared/common.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import MappingsDetails from "./mappingsDetails.js";
import DataSourceManager from "./dataSourcesManager.js";
import MappingModeler from "./mappingModeler.js";
import Lineage_graphPaths from "../lineage/lineage_graphPaths.js";
import UIcontroller from "./uiController.js";

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

    self.getVisjsDatatypePropertyEdgeBetweenClassAndRange = function (domainId, rangeId, propUri, propLabel) {
        return {
            id: domainId + "_dp_" + propUri + "_" + rangeId,
            from: domainId,
            to: rangeId,
            label: propLabel,
            width: 3,
            arrows: { to: { enabled: true, type: "arrow" } },
            smooth: { type: "curvedCCW", forceDirection: "vertical", roundness: 0.5 },
            color: "#9b59b6",
            data: { id: propUri, type: "DatatypeProperty" },
        };
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
    self.drawResource = function (newResource, options, callback) {
        if (!options) {
            options = {};
        }
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
        } else if (newResource.data.type == "superClass" && newResource.level) {
            // keep level of superClass
        } else {
            newResource.level = 2;
        }
        var existingNodes = self.visjsGraph.getExistingIdsMap();

        var visjsData = { nodes: [], edges: [] };
        var visjsNode = newResource;

        if (newResource.data.type == "Class") {
            var tableWithSameClass = MappingsDetails.isColumnAllreadyMappedInAnotherTable(self.currentGraphNode, newResource.data.id);
            if (!tableWithSameClass && !existingNodes[visjsNode.id]) {
                visjsData.nodes.push(visjsNode);
            } else {
                self.visjsGraph.data.nodes.update({ id: newResource.id, hidden: false });
            }
            self.saveVisjsGraph();
        } else {
            visjsData.nodes.push(visjsNode);
        }

        if (self.visjsGraph) {
            if (options.noSave) {
                var existingNodes = self.visjsGraph.getExistingIdsMap();
                if (!existingNodes[newResource.id]) {
                    self.visjsGraph.data.nodes.add(visjsData.nodes);
                }
            } else {
                self.addNodes(visjsData.nodes);
            }

            //  self.visjsGraph.network.fit();

            if (self.currentGraphNode && self.currentGraphNode.data) {
                if ((newResource.data.type == "Class" || newResource.data.type == "superClass") && self.currentGraphNode) {
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
                    if (options.noSave) {
                        self.visjsGraph.data.edges.add(visjsData.edges);
                    } else {
                        self.addEdge(visjsData.edges);
                    }
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

    self.getColumnsClasses = function (nodes) {
        if (!nodes) {
            nodes = self.visjsGraph.data.nodes.get();
        }
        if (!Array.isArray(nodes)) {
            nodes = [nodes];
        }
        var map = {};
        nodes.forEach(function (node) {
            map[node.id] = self.getColumnClass(node);
        });
        return map;
    };

    self.getColumnClass = function (node) {
        if (!node.id) {
            node = { id: node };
        }
        var connections = self.visjsGraph.getFromNodeEdgesAndToNodes(node.id);

        var classId = null;
        connections.forEach(function (connection) {
            if (connection.edge.data && (connection.edge.data.type == "rdf:type" || connection.edge.data.type == "rdfs:subClassOf")) {
                classId = connection.toNode.data.id;
            }
        });
        return classId;
    };

    self.getClassColumns = function (node) {
        if (!node.id) {
            node = { id: node };
        }
        var connections = self.visjsGraph.getFromNodeEdgesAndToNodes(node.id, true);

        var columns = [];
        connections.forEach(function (connection) {
            if (connection.edge.data.type == "rdf:type" || connection.edge.data.type == "rdfs:subClassOf") {
                columns.push(connection.fromNode);
            }
        });
        return columns;
    };

    self.getAllColumnsClasses = function (nodes) {
        if (!nodes) {
            nodes = self.visjsGraph.data.nodes.get();
        }
        if (!Array.isArray(nodes)) {
            nodes = [nodes];
        }
        var map = {};
        nodes.forEach(function (node) {
            map[node.id] = self.getColumnClass(node);
        });
        return map;
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
            self.relationMessage();

            return;
        }

        if (self.visjsGraph.network.isCluster(node.id) == true) {
            self.visjsGraph.network.openCluster(node.id);
        }
        self.currentGraphNode = node;

        //add relation between columns
        if (options.ctrlKey) {
            if (!DataSourceManager.currentConfig.currentDataSource) {
                return alert("Choose a data source first");
            }

            if (!MappingModeler.currentRelation) {
                self.relationMessage(node.data.label, null);
                MappingModeler.currentRelation = {
                    from: { id: node.id, classId: self.getColumnClass(node), dataTable: node.data.dataTable },
                    to: null,
                    type: node.data.type,
                };
            } else {
                if (node.data.dataTable && node.data.dataTable != MappingModeler.currentRelation.from.dataTable) {
                    MappingModeler.currentRelation = null;
                    self.relationMessage();
                    return alert("Relations between columns from different tables are not possible");
                }
                MappingModeler.currentRelation.to = { id: node.id, classId: self.getColumnClass(node) };
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
                    // return alert("choose a data source first");
                    MappingColumnsGraph.activeSourceFromNode(node, function () {});
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
            self.relationMessage();
        }
    };

    self.activeSourceFromNode = function (node, callback) {
        var obj = {};
        obj.node = {};
        var dataSource = node.data.datasource;
        var csvSource = DataSourceManager.currentConfig.csvSources;
        var dataBaseSource = DataSourceManager.currentConfig.databaseSources;
        obj.node.id = dataSource;
        obj.node.data = {};
        Object.keys(dataBaseSource).forEach(function (key) {
            if (key == dataSource) {
                obj.node.data.type = "databaseSource";
            }
        });
        Object.keys(csvSource).forEach(function (key) {
            if (key == dataSource) {
                obj.node.data.type = "csvSource";
            }
        });
        if (obj.node.data.type == "databaseSource") {
            $.ajax({
                type: "GET",
                url: Config.apiUrl + "/databases/" + dataSource,
                dataType: "json",
                success: function (data, _textStatus, _jqXHR) {
                    obj.node.data.id = data.name;
                    obj.node.data.sqlType = data.driver;
                    DataSourceManager.onDataSourcesJstreeSelect(undefined, obj, function () {
                        var obj2 = { node: { label: node.data.dataTable, data: { type: "table", id: node.data.dataTable, label: node.data.dataTable } } };
                        DataSourceManager.onDataSourcesJstreeSelect(undefined, obj2, callback);
                    });
                },
                error: function (err) {
                    
                    if (callback) return callback(err);
                    return MainController.errorAlert(err);
                },
            });
        } else {
            obj.node.data.id = dataSource;
            DataSourceManager.onDataSourcesJstreeSelect(undefined, obj, callback);
        }
    };
    /**
     * @function
     * @name showImplicitGraphPopupMenu
     * @memberof module:MappingColumnsGraph
     * Displays a minimal context menu for implicit-model nodes (Class/superClass only).
     * Sets `currentGraphNode`, renders a “Node Infos” action, and positions the popup at the event coordinates.
     * @param {Object} node - Vis.js node object; must include `data.type`.
     * @param {{x:number,y:number}} point - Screen point (will be updated from `event`).
     * @param {{x:number,y:number}} event - Mouse event with screen coordinates.
     * @returns {void}
     */

    self.showImplicitGraphPopupMenu = function (node, point, event) {
        if (!node || !node.data) return;

        var html = "";
        if (node.data.type === "Class" || node.data.type === "superClass") {
            self.currentGraphNode = node;
            html += '    <span class="popupMenuItem" onclick="MappingColumnsGraph.graphActions.showNodeInfos()">Node Infos</span>';
        }

        if (html !== "") {
            $("#popupMenuWidgetDiv").html(html);
            point.x = event.x;
            point.y = event.y;
            PopupMenuWidget.showPopup(point, "popupMenuWidgetDiv");
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
            if (node.data.type == "Class" || node.data.type == "superClass") {
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
            if (confirm("Delete node?")) {
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
            if (confirm("Delete edge?")) {
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
                    return MainController.errorAlert(err);
                }
                if (result.length == 0) {
                    return alert("No superClass");
                }
                var item = result[0];

                var classLegendItem = MappingModeler.legendItemsArray.filter(function (item) {
                    return item.label == "Class";
                });
                if (classLegendItem.length > 0) {
                    classLegendItem = classLegendItem[0];
                }
                var level = 3;
                if (self.currentGraphNode.level) {
                    level = self.currentGraphNode.level + 1;
                }
                var newResource = {
                    id: item.object.value,
                    label: item.objectLabel.value,
                    shape: classLegendItem.shape ? classLegendItem.shape : "",
                    color: classLegendItem.color ? classLegendItem.color : "",
                    level: level,
                    data: {
                        id: item.object.value,
                        label: item.objectLabel.value,
                        type: "superClass",
                    },
                };

                self.drawResource(newResource, { noSave: true }, function (err) {});
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
            self.relationMessage();
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
            } else if (MappingModeler.columnsMappingsObjects.indexOf(self.currentGraphNode.data.type) > -1) {
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
            UI.openDialog("smallDialogDiv", { title: "Column Technical Mappings" });
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
                    return MainController.errorAlert(err);
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
                        return MappingColumnsGraph.visjsGraph.draw(function () {
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

        // MappingsDetails.setIsMainColumnKey()

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
        // add lastUpdated dict on update
        if (!config.lastUpdate) {
            config.lastUpdate = {};
        }
        config.lastUpdate.user = authentication.currentUser.identifiant;
        config.lastUpdate.date = new Date().toISOString();
        delete config.currentDataSource;
        var data = {
            nodes: nodes,
            edges: edges,
            context: graph.currentContext,
            positions: positions,
            options: { config: config },
        };
        if (!fileName) {
            fileName = prompt("Graph name");
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
        var dataStr = JSON.stringify(data, null, 2);
        var payload = {
            dir: "graphs/",
            fileName: fileName,
            data: dataStr,
        };

        try {
            JSON.parse(dataStr);

            $.ajax({
                type: "POST",
                url: `${Config.apiUrl}/data/file`,
                data: payload,
                dataType: "json",
                success: function (_result, _textStatus, _jqXHR) {
                    $("#visjsGraph_savedGraphsSelect").append($("<option></option>").attr("value", fileName).text(fileName));
                    UI.message("Graph saved");
                    if (callback) {
                        callback();
                    }
                },
                error(err) {
                    return MainController.errorAlert(err);
                },
            });
        } catch (e) {
            return MainController.errorAlert(e);
        }
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
    self.updateNode = function (node, callback) {
        if (!node) {
            return;
        }
        self.visjsGraph.data.nodes.update(node);
        self.saveVisjsGraph(function () {
            if (callback) {
                callback();
            }
        });
    };

    /**
     * Removes a node from the Vis.js graph and saves the updated graph.
     * @function
     * @name removeNode
     * @memberof module:MappingColumnsGraph
     * @param {Object} node - The node to be removed.
     * @returns {void}
     */
    self.removeNode = function (node, callback) {
        if (!node) {
            return;
        }

        self.visjsGraph.data.nodes.remove(node);
        self.saveVisjsGraph(function () {
            if (callback) {
                callback();
            }
        });
    };

    /**
     * Adds a new node to the Vis.js graph and saves the updated graph.
     * @function
     * @name addNodes
     * @memberof module:MappingColumnsGraph
     * @param {Object} node - The node to be added.
     * @returns {void}
     */
    self.addNodes = function (nodes, callback) {
        if (!nodes) {
            return;
        }
        if (!Array.isArray(nodes)) {
            nodes = [nodes];
        }

        var save = false;
        var existingNodeIds = self.visjsGraph.data.nodes.getIds();
        nodes.forEach(function (node) {
            if (existingNodeIds.indexOf(node.id) > -1) {
                return;
            }
            save = true;
            self.visjsGraph.data.nodes.add(node);
        });
        if (save) {
            self.saveVisjsGraph(function () {
                if (callback) {
                    callback();
                }
            });
        }
    };

    /**
     * Updates an edge in the Vis.js graph and saves the updated graph.
     * @function
     * @name updateEdge
     * @memberof module:MappingColumnsGraph
     * @param {Object} edge - The edge to be updated.
     * @returns {void}
     */
    self.updateEdge = function (edge, callback) {
        if (!edge) {
            return;
        }
        self.visjsGraph.data.edges.update(edge);
        self.saveVisjsGraph(function () {
            if (callback) {
                callback();
            }
        });
    };

    /**
     * Removes an edge from the Vis.js graph and saves the updated graph.
     * @function
     * @name removeEdge
     * @memberof module:MappingColumnsGraph
     * @param {Object} edge - The edge to be removed.
     * @returns {void}
     */
    self.removeEdge = function (edge, callback) {
        if (!edge) {
            return;
        }
        self.visjsGraph.data.edges.remove(edge);
        self.saveVisjsGraph(function () {
            if (callback) {
                callback();
            }
        });
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
        self.visjsGraph.network.fit();
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
        var dataSources = {};
        var dataTables = self.getDatasourceTablesFromVisjsGraph();

        if (data && data.nodes) {
            data.nodes.forEach(function (node) {
                if (node && node.data && MappingModeler.columnsMappingsObjects.indexOf(node.data.type) !== -1) {
                    if (node.data.dataTable && (node.data.datasource || node.data.dataSource)) {
                        dataSources[node.data.dataTable] = node.data.datasource || node.data.dataSource;
                    }
                }
            });
        }

        data.nodes.forEach(function (node) {
            if (node && node.data && node.data.type == "Table") {
                if (Object.keys(dataSources).indexOf(node.id) !== -1) {
                    node.data.datasource = dataSources[node.id];
                }
            }
        });
        if (true || !isHierarchical) {
            var tables = {};
            var nodesMap = {};
            var newNodes = [];
            data.nodes.forEach(function (oldNode) {
                var node = {};
                node.id = oldNode.id;
                node.label = oldNode.label;
                node.data = oldNode.data;
                node.shape = oldNode.shape || "box";
                node.color = oldNode.color;
                node.size = 18;
                /*if(oldNode.data.prefixURI){
                    if(data?.options?.config){
                        if(!data?.options?.config?.prefixURI){
                            data.options.config.prefixURI = {};
                        }
                        data.options.config.prefixURI[oldNode.label] = oldNode.data.prefixURI;

                    }
                   
                }*/
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
                        return MainController.errorAlert(err);
                    },
                });
            });
        };

                    /**
             * Imports mappings from a JSON file into the Vis.js graph file.
             * Opens a file import dialog, parses the JSON content, and uploads the data to the graphs in instance data repository.
             *
            //  * @function
            //  * @name importMappingsFromJSONFile
            //  * @memberof module:MappingColumnsGraph
            //  * @returns {void}
            //  */
        /**
         * Import mappings from a JSON file into the current mapping graph (pre-checks data sources).
         *
         * (No id databases: crash)
         * When importing mappings created on another server, the target server may not contain the same
         * database source ids. This function prevents crashes by validating required database sources
         * *before* writing the mapping graph file.
         *
         * ### What is validated
         * 1) JSON integrity: detects any `nodes[i].data.datasource` value that is not declared in
         *    `options.config.databaseSources` nor `options.config.csvSources`.
         * 2) Target server availability: calls `GET /databases` and checks that every id declared in
         *    `options.config.databaseSources` is available (exists and/or is authorized for the user).
         *
         * ### User feedback
         * - Shows a short-title dialog (**Import blocked**) with an explicit reason and actionable steps.
         * - Pinpoints locations in the imported JSON by attempting to compute line numbers for:
         *   - `options.config.databaseSources.<id>`
         *   - `nodes[i].data.datasource` occurrences
         *   If line numbers cannot be determined (e.g., minified JSON), `?` is shown.
         *
         * @function
         * @name importMappingsFromJSONFile
         * @memberof module:MappingColumnsGraph
         * @returns {void}
         */


        self.importMappingsFromJSONFile = function () {
            ImportFileWidget.showImportDialog(function (err, result) {
                if (err) {
                    return MainController.errorAlert(err);
                }
                var data = JSON.parse(result);
                var rawJson = result;
                if (data.nodes.length == 0) {
                    return alert("no nodes in file");
                }
                if (data.options?.config?.lastUpdate) {
                    delete data.options.config.lastUpdate;
                }
                if (data?.options?.config?.graphUri != Config.sources[MainController.currentSource].graphUri) {
                return alert("graphUri in file is not the same as the current graphUri, update graphURI in JSON file");
                }

                // --- Vérif DB avant import (DB-first) ---

                // On enlève lastUpdate du fichier importé (évite d’écraser l’historique)
                if (data?.options?.config?.lastUpdate) {
                    delete data.options.config.lastUpdate;
                }


                // 1) Helpers pour calculer les numéros de ligne dans le JSON importé
                /**
                 * Compute a 1-based line number from a character index in the imported JSON text.
                 * Returns null if the index is invalid.
                 * @param {number} idx
                 * @returns {number|null}
                 */
                function lineOfIndex(idx) {
                if (idx < 0) return null;
                return rawJson.slice(0, idx).split("\n").length; // 1-based
                }

                // Ligne d’une clé dans options.config.<sectionName>.<key>

                /**
                 * Try to locate the line number of a key inside `options.config.<sectionName>` in the imported JSON.
                 * This relies on textual search in the raw JSON (may return null on minified/unexpected formatting).
                 * @param {string} sectionName
                 * @param {string} key
                 * @returns {number|null}
                 */
                function findConfigKeyLine(sectionName, key) {
                var sectionNeedle = `"${sectionName}": {`;
                var sectionPos = rawJson.indexOf(sectionNeedle);
                if (sectionPos < 0) return null;

                var window = rawJson.slice(sectionPos, sectionPos + 20000);
                var keyNeedle = `"${key}"`;
                var keyPosLocal = window.indexOf(keyNeedle);
                if (keyPosLocal < 0) return null;

                return lineOfIndex(sectionPos + keyPosLocal);
                }

                // Ligne d’une occurrence nodes[i].data.datasource

                /**
                 * Try to locate the line number of a `nodes[i].data.datasource` occurrence for a given node id and datasource id.
                 * This relies on textual search in the raw JSON (may return null on minified/unexpected formatting).
                 * @param {string} nodeId
                 * @param {string} dsValue
                 * @returns {number|null}
                 */
                function findNodeDatasourceLine(nodeId, dsValue) {
                var idNeedle = `"id": "${nodeId}"`;
                var idPos = rawJson.indexOf(idNeedle);
                if (idPos < 0) return null;

                var window = rawJson.slice(idPos, idPos + 4000);
                var dsNeedle = `"datasource": "${dsValue}"`;
                var dsPosLocal = window.indexOf(dsNeedle);

                var finalPos = (dsPosLocal >= 0) ? (idPos + dsPosLocal) : idPos;
                return lineOfIndex(finalPos);
                }

                // 2) Lire la config du fichier importé (DB et CSV)
                var dbSourcesFromFile = data?.options?.config?.databaseSources || {};
                var csvSourcesFromFile = data?.options?.config?.csvSources || {};
                var dbIdsFromConfig = Object.keys(dbSourcesFromFile);
                var csvIdsFromConfig = Object.keys(csvSourcesFromFile);

                // 3) Collecter toutes les datasources réellement utilisées dans nodes[]
                //    et garder leurs emplacements (nodes[i] + ligne)
                var dsUsages = {}; // { dsId: [ {nodeIndex,nodeId,nodeType,dataTable,line} ] }
                (data.nodes || []).forEach(function (n, i) {
                var ds = n && n.data ? n.data.datasource : null;
                if (!ds) return;

                if (!dsUsages[ds]) dsUsages[ds] = [];
                dsUsages[ds].push({
                    nodeIndex: i,
                    nodeId: n.id,
                    nodeType: n.data.type,
                    dataTable: n.data.dataTable,
                    line: findNodeDatasourceLine(n.id, ds),
                });
                });

                var dsUsedIds = Object.keys(dsUsages);

                // 4) Cas JSON incohérent : datasource utilisée dans nodes[] mais absente de la config
                var unknownIds = dsUsedIds.filter(function (id) {
                return dbIdsFromConfig.indexOf(id) < 0 && csvIdsFromConfig.indexOf(id) < 0;
                });

                // 5) Les DB à vérifier côté serveur = celles déclarées comme DB dans la config
                var requiredDbIds = dbIdsFromConfig.slice();

                /**
                 * Display a blocking dialog during import validation.
                 * The dialog title is intentionally short to avoid UI ellipsis.
                 * @param {string} title
                 * @param {string} htmlBody
                 * @returns {void}
                 */

                
                function showImportBlockingDialog(title, htmlBody) {
                var html =
                    "<div style='font-size:13px;line-height:1.45'>" +
                    htmlBody +
                    "</div>";
                $("#mainDialogDiv").html(html);
                UI.openDialog("mainDialogDiv", { title: title });
                }

                // Si le JSON est incohérent : datasource utilisée dans nodes[] mais pas déclarée dans config
                if (unknownIds.length > 0) {
                var unknownHtml = unknownIds
                    .map(function (id) {
                    var occ = (dsUsages[id] || []).slice(0, 5).map(function (o) {
                        return (
                        "&nbsp;&nbsp;• <code>nodes[" +
                        o.nodeIndex +
                        "].data.datasource</code> (line " +
                        (o.line || "?") +
                        ") — type=" +
                        o.nodeType +
                        (o.dataTable ? " — table=" + o.dataTable : "")
                        );
                    }).join("<br>");

                    var more =
                        dsUsages[id] && dsUsages[id].length > 5
                        ? "<br>&nbsp;&nbsp;… (+" + (dsUsages[id].length - 5) + " more occurrences)"
                        : "";

                    return "<li><b>" + id + "</b><br>" + occ + more + "</li>";
                    })
                    .join("");

                showImportBlockingDialog(
                    "Import blocked",
                    "<p>These data sources are used in <code>nodes[].data.datasource</code> but are declared neither in <code>options.config.databaseSources</code> nor in <code>options.config.csvSources</code>.</p>" +
                    "<ul>" +
                    unknownHtml +
                    "</ul>" +
                    "<p><b>Fix:</b> add these ids to the config, or replace the value in the nodes listed below.</p>"
                );
                return; // STOP
                }

                // fonction utilitaire pour faire le POST (appelée seulement si OK)
                function doImportPost(dataToSave) {
                    var fileName = "mappings_" + MappingModeler.currentSLSsource + "_ALL" + ".json";
                    var payload = {
                        dir: "graphs/",
                        fileName: fileName,
                        data: JSON.stringify(dataToSave, null, 2),
                    };



                    $.ajax({
                        type: "POST",
                        url: `${Config.apiUrl}/data/file`,
                        data: payload,
                        dataType: "json",
                        success: function (_result, _textStatus, _jqXHR) {
                            MappingModeler.onLoaded();
                        },
                        error: function (err) {
                            return MainController.errorAlert(err);
                        },
                    });
                }

                // Si aucune DB n’est déclarée dans le mapping, on continue
                if (requiredDbIds.length === 0) {
                    return doImportPost(data);
                }

                // 3) Appeler l’API liste des DB accessibles à l’utilisateur (rôles inclus)
                $.ajax({
                    type: "GET",
                    url: `${Config.apiUrl}/databases`,
                    dataType: "json",
                    success: function (resp) {
                        var available = Array.isArray(resp) ? resp : (resp && resp.resources ? resp.resources : []);
                        var availableIds = new Set(available.map(function (x) { return x.id; }));

                        var missing = requiredDbIds.filter(function (id) { return !availableIds.has(id); });


                        if (missing.length > 0) {
                        var missingHtml = missing
                            .map(function (id) {
                            var name =
                                dbSourcesFromFile[id] && dbSourcesFromFile[id].name
                                ? dbSourcesFromFile[id].name
                                : "(unknown name)";

                            var cfgLine = findConfigKeyLine("databaseSources", id);

                            var occ = (dsUsages[id] || []).slice(0, 5).map(function (o) {
                                return (
                                "&nbsp;&nbsp;• <code>nodes[" +
                                o.nodeIndex +
                                "].data.datasource</code> (line " +
                                (o.line || "1") +
                                ") — type=" +
                                o.nodeType +
                                (o.dataTable ? " — table=" + o.dataTable : "")
                                );
                            }).join("<br>");

                            var more =
                                dsUsages[id] && dsUsages[id].length > 5
                                ? "<br>&nbsp;&nbsp;… (+" + (dsUsages[id].length - 5) + " more occurrences)"
                                : "";

                            return (
                                "<li><b>" +
                                id +
                                "</b> — " +
                                name +
                                "<br>Declared in file: <code>options.config.databaseSources." +
                                id +
                                "</code> (line " +
                                (cfgLine || "?") +
                                ")" +
                                "<br>" +
                                occ +
                                more +
                                "</li>"
                            );
                            })
                            .join("");

                        showImportBlockingDialog(
                            "Import blocked",
                            "<p>These databases are referenced by the mapping but are not available on this server (missing or not authorized).</p>" +
                            "<ul>" +
                            missingHtml +
                            "</ul>" +
                            "<p><b>To fix:</b><br>" +
                            "1) Create/add these databases on the target server (ConfigEditor ▸ Databases).<br>" +
                            "2) Grant access to your account (ConfigEditor ▸ profiles/allowedDatabases).<br>" +
                            "3) Or edit the imported JSON to point to an existing id.</p>"
                        );
                        return; // STOP: on n'écrit pas /data/file
                        }


                        // OK => on importe
                        return doImportPost(data);
                    },

                    error: function (e) {
                    // Cas Offline / API down : e.responseJSON est souvent undefined
                    var status = (e && typeof e.status !== "undefined") ? e.status : 0;

                    var details =
                        (e && e.responseJSON && (e.responseJSON.message || e.responseJSON.error)) ||
                        (e && e.responseText) ||
                        (e && e.statusText) ||
                        "Unable to reach the /databases API (offline or server unavailable).";

                    return MainController.errorAlert(
                        "Database validation failed (status=" + status + ") : " + details
                    );
                    }

                });

            });
        };

        return data;
    };
    /**
     * Imports mappings from a JSON file into the Vis.js graph file.
     * Opens a file import dialog, parses the JSON content, and uploads the data to the graphs in instance data repository.
     *
    //  * @function
    //  * @name importMappingsFromJSONFile
    //  * @memberof module:MappingColumnsGraph
    //  * @returns {void}
    //  */
    // self.importMappingsFromJSONFile = function () {
    //     ImportFileWidget.showImportDialog(function (err, result) {
    //         if (err) {
    //             return MainController.errorAlert(err);
    //         }
    //         var data = JSON.parse(result);
    //         if (data.nodes.length == 0) {
    //             return alert("no nodes in file");
    //         }
    //         if (data?.options?.config?.graphUri != Config.sources[MainController.currentSource].graphUri) {
    //             return alert("graphUri in file is not the same as the current graphUri, update graphURI in JSON file");
    //         }
    //         var fileName = "mappings_" + MappingModeler.currentSLSsource + "_ALL" + ".json";
    //         var payload = {
    //             dir: "graphs/",
    //             fileName: fileName,
    //             data: JSON.stringify(data, null, 2),
    //         };

    //         $.ajax({
    //             type: "POST",
    //             url: `${Config.apiUrl}/data/file`,
    //             data: payload,
    //             dataType: "json",
    //             success: function (result, _textStatus, _jqXHR) {
    //                 MappingModeler.onLoaded();
    //             },
    //             error(err) {
    //                 return MainController.errorAlert(err);
    //             },
    //         });
    //     });
    // };

    // /**
    //  * Exports the current mappings from the Vis.js graph to a JSON file.
    //  * Saves the graph data before exporting
    //  *
    //  *
    //  * @function
    //  * @name exportMappings
    //  * @memberof module:MappingColumnsGraph
    //  * @returns {void}
    //  */
    // self.exportMappings = function () {
    //     self.saveVisjsGraph(function (err) {
    //         var fileName = "mappings_" + MappingModeler.currentSLSsource + "_ALL" + ".json";
    //         var payload = {
    //             dir: "graphs/",
    //             fileName: fileName,
    //         };

    //         $.ajax({
    //             type: "GET",
    //             url: `${Config.apiUrl}/data/file`,
    //             data: payload,
    //             dataType: "json",
    //             success: function (result, _textStatus, _jqXHR) {
    //                 var data = JSON.parse(result);
    //                 Export.downloadJSON(data, fileName);
    //             },
    //             error(err) {
    //                 if (callback) {
    //                     return callback(err);
    //                 }
    //                 if (err.responseJSON == "file does not exist") {
    //                     return;
    //                 }
    //                 return MainController.errorAlert(err);
    //             },
    //         });
    //     });
    // };

    self.hideNodesFromOtherTables = function (table) {
        var nodes = MappingColumnsGraph.visjsGraph.data.nodes.get();
        var edges = MappingColumnsGraph.visjsGraph.data.edges.get();

        var newNodes = [];
        var newNodesMap = {};
        var tableNodes = {};

        nodes.forEach(function (node) {
            var hidden = true;
            if (node.data && node.data.dataTable) {
                if (node.data.dataTable == table) {
                    tableNodes[node.id] = node;
                    hidden = false;
                }
            }
            newNodesMap[node.id] = { id: node.id, hidden: hidden };
        });
        //show classes linked to column
        var edgesFromClassMap = {};
        edges.forEach(function (edge) {
            if (edge.data && (edge.data.type == "rdf:type" || edge.data.type == "owl:Class")) {
                if (tableNodes[edge.from]) {
                    newNodesMap[edge.to].hidden = false;
                    newNodesMap[edge.from].hidden = false;
                }
            }
        });

        for (var nodeId in newNodesMap) {
            newNodes.push(newNodesMap[nodeId]);
        }

        MappingColumnsGraph.visjsGraph.data.nodes.update(newNodes);
    };

    self.relationMessage = function (fromLabel, toLabel) {
        if (MappingModeler.currentResourceType != "ObjectProperty") {
            return;
        }
        $("#mappingModeler_relationInfos").html("from: <b>" + (fromLabel ?? "None") + "</b> to: <b>" + (toLabel ?? "None") + "</b>");
    };

    self.drawClassesGraph = function () {
        var columns = self.getNodesOfType(MappingModeler.columnsMappingsObjects);
        var edgesFromMap = self.getEdgesMap("from");
        var classNodesMap = self.getNodesMap("Class");
        var linkedClasses = {};
        var classVisjsData = { nodes: [], edges: [] };
        var uniqueNodes = {};

        async.series(
            [
                //get transitive linked classes
                function (callbackSeries) {
                    columns.forEach(function (column) {
                        var columnClass = self.getColumnClass(column);
                        if (edgesFromMap[column.id]) {
                            var edgesFrom = edgesFromMap[column.id];
                            edgesFrom.forEach(function (edge) {
                                if (edge.from == column.id) {
                                    var edgeType = edge.data ? edge.data.id : null;

                                    if (edgeType && edgeType != "owl:Class" && edgeType != "rdf:type") {
                                        if (!linkedClasses[columnClass]) {
                                            linkedClasses[columnClass] = [];
                                        }
                                        edge.targetClass = self.getColumnClass(edge.to);
                                        linkedClasses[columnClass].push(edge);
                                    } else {
                                    }
                                }
                            });
                        }
                    });
                    callbackSeries();
                },

                //build visjgraph
                function (callbackSeries) {
                    for (var classId in linkedClasses) {
                        if (!uniqueNodes[classId]) {
                            uniqueNodes[classId] = 1;
                            var startClass = classNodesMap[classId];

                            if (startClass) {
                                startClass.hidden = false;
                                classVisjsData.nodes.push(startClass);
                            }
                        }
                        var targetClass;
                        var targetEdges = linkedClasses[classId];
                        targetEdges.forEach(function (edge) {
                            targetClass = classNodesMap[edge.targetClass];
                            if (targetClass && !uniqueNodes[edge.targetClass]) {
                                uniqueNodes[edge.targetClass] = 1;
                                targetClass.hidden = false;
                                classVisjsData.nodes.push(targetClass);
                            }

                            if (targetClass) {
                                var edge2 = {
                                    label: edge.label,
                                    data: {
                                        label: edge.label,
                                        id: edge.data.id,
                                    },
                                    from: classId,
                                    to: targetClass.id,
                                    arrows: {
                                        to: {
                                            enabled: true,
                                            type: "arrow",
                                        },
                                    },
                                };
                                classVisjsData.edges.push(edge2);
                            }
                        });
                    }
                    callbackSeries();
                },
                // --- get link from column to class and build vijsgraph
                function (callbackSeries) {
                    var addedColEdgeIds = {};

                    columns.forEach(function (column) {
                        if (!column) return;

                        var columnId = null;
                        if (column.id) columnId = column.id;
                        if (!columnId) return;

                        var columnLabel = columnId;
                        if (column.label) columnLabel = column.label;

                        var dataTable = null;
                        if (column.data && column.data.dataTable) dataTable = column.data.dataTable;

                        var displayLabel = columnLabel;
                        if (dataTable) displayLabel = dataTable + ":" + columnLabel;

                        var datableKey = dataTable;
                        var columnColor = common.getResourceColor("dataTable", datableKey, "paletteIntense");
                        var classId = self.getColumnClass(column);
                        if (!classId) return;
                        if (!uniqueNodes[classId]) return;

                        if (!uniqueNodes[columnId]) {
                            classVisjsData.nodes.push({
                                id: columnId,
                                label: displayLabel,
                                shape: "box",
                                color: columnColor,
                                data: column.data,
                            });
                            uniqueNodes[columnId] = 1;
                        }
                        var edgeColumnToClass = [];
                        if (edgesFromMap && edgesFromMap[columnId]) edgeColumnToClass = edgesFromMap[columnId];

                        var edgeType = null;
                        edgeColumnToClass.forEach(function (edge) {
                            if (edgeType) return;
                            if (edge && edge.data && edge.data.type) edgeType = edge.data.type;
                        });

                        var edgeId = columnId + "->" + classId + "|" + edgeType;
                        if (!addedColEdgeIds[edgeId]) {
                            classVisjsData.edges.push({
                                id: edgeId,
                                from: columnId,
                                to: classId,
                                label: "",
                                color: "#00afef",
                                width: 3,
                                arrows: { to: { enabled: true, type: "arrow" } },
                                data: { type: edgeType },
                            });
                            addedColEdgeIds[edgeId] = 1;
                        }
                    });

                    callbackSeries();
                },

                // build datatype property edge
                function (callbackSeries) {
                    var addedDpEdgeIds = {};
                    var cols = columns;
                    cols.forEach(function (column) {
                        // columnId
                        var columnId = null;
                        if (column) {
                            if (column.id) {
                                columnId = column.id;
                            }
                        }
                        if (!columnId) {
                            return;
                        }

                        // columnLalbel
                        var columnLalbel = columnId;
                        if (column) {
                            if (column.label) {
                                columnLalbel = String(column.label);
                            }
                        }

                        // dataTable
                        var dataTable = null;
                        if (column && column.data && column.data.dataTable) {
                            dataTable = column.data.dataTable;
                        }

                        if (!uniqueNodes[columnId]) {
                            classVisjsData.nodes.push({
                                id: columnId,
                                label: String(columnLalbel),
                                shape: "box",
                                color: "#eaf4ff",
                                data: column.data,
                            });
                            uniqueNodes[columnId] = 1;
                        }

                        // otherPredicates
                        var dataTypeNodes = null;
                        if (column && column.data && column.data.otherPredicates) {
                            dataTypeNodes = column.data.otherPredicates;
                        }
                        if (!dataTypeNodes) {
                            return;
                        }
                        dataTypeNodes.forEach(function (predItem) {
                            if (!predItem) {
                                return;
                            }
                            var dpColumnId = predItem.object;

                            var propUri = null;
                            if (predItem.property) {
                                propUri = Sparql_common.getLabelFromURI(predItem.property);
                            }
                            if (!propUri) {
                                return;
                            }

                            // create node if not existing
                            if (!uniqueNodes[dpColumnId] && !uniqueNodes[dpColumnId]) {
                                classVisjsData.nodes.push({
                                    id: dpColumnId,
                                    label: dpColumnId,
                                    shape: "box",
                                    size: 10,
                                    color: "#ddd",
                                    data: {
                                        id: dpColumnId,
                                        type: "DatatypeProperty",
                                        source: MappingModeler.currentSLSsource,
                                        prop: propUri,
                                        propLabel: propUri,
                                        dataTable: dataTable,
                                    },
                                });
                                uniqueNodes[dpColumnId] = 1;
                                uniqueNodes[dpColumnId] = 1;
                            }

                            // edge from datatype propertie to column
                            var edgeId = columnId + "->" + dpColumnId + "|" + propUri;
                            if (!addedDpEdgeIds[edgeId]) {
                                var dpColor = Lineage_whiteboard && Lineage_whiteboard.datatypeColor ? Lineage_whiteboard.datatypeColor : "#9b59b6";
                                classVisjsData.edges.push({
                                    id: edgeId,
                                    from: columnId,
                                    to: dpColumnId,
                                    label: propUri,
                                    arrows: { to: { enabled: true, type: "solid" } },
                                    font: { color: Lineage_whiteboard.datatypeColor, size: 12 },
                                    color: dpColor,
                                    width: 3,
                                    dashes: true,
                                    data: { id: propUri, type: "DatatypeProperty" },
                                });
                                addedDpEdgeIds[edgeId] = 1;
                            }
                        });
                    });

                    callbackSeries();
                },

                // draw graph
                function (callbackSeries) {
                    //  classVisjsData={nodes:[], edges:[]}
                    var html = "<div style='width:1000px;height:800px' id='mappingModeler_implicitModelGraph'></div>";
                    $("#mainDialogDiv").html(html);
                    UI.openDialog("mainDialogDiv", { title: "Implicit Model" });

                    var implicitOptions = {
                        visjsOptions: { autoResize: true, width: "100%", height: "100%" },
                        onclickFn: function (node, event, options) {
                            if (!node) return;
                            self.currentGraphNode = node;

                            if (!node.data) return;

                            if (!MappingModeler.columnsMappingsObjects.includes(node.data.type)) return;

                            var baseLabel = null;
                            if (node.data && node.data.label) {
                                baseLabel = node.data.label;
                            }

                            var parentTable = null;
                            if (node.data && node.data.dataTable) {
                                parentTable = node.data.dataTable;
                            }

                            var dialogNode = {
                                id: node.id,
                                label: baseLabel,
                                data: node.data,
                            };
                            MappingColumnsGraph.activeSourceFromNode(dialogNode, function () {
                                MappingsDetails.openColumnTechDialog(dialogNode, function () {});
                            });
                        },

                        onRightClickFn: function (node, point, event) {
                            self.showImplicitGraphPopupMenu(node, point, event);
                        },
                    };

                    self.implicitModelVisjsGraph = new VisjsGraphClass("mappingModeler_implicitModelGraph", classVisjsData, implicitOptions);
                    self.implicitModelVisjsGraph.draw(function () {});

                    // self.drawGraphCanvas(self.graphDiv, classVisjsData);
                    callbackSeries();
                },
            ],
            function (err) {},
        );
    };

    /**
     * @function
     * @name getNodesOfType
     * @memberof module:MappingColumnsGraph
     * Returns nodes (or their ids) whose `data.type` matches one or more requested types.
     * @param {string|string[]} types - Type name or list of types to include.
     * @param {boolean} [onlyIds=false] - If true, returns node ids instead of full node objects.
     * @returns {Array<string|Object>} Array of nodes or ids filtered by type; empty array if none.
     */

    self.getNodesOfType = function (types, onlyIds) {
        if (!types) {
            return [];
        }
        if (!Array.isArray(types)) {
            types = [types];
        }
        if (types.length == 0) {
            return [];
        }

        var nodes = self.visjsGraph.data.nodes.get();
        var filteredNodes = [];
        nodes.forEach(function (node) {
            if (node?.data?.type && types.includes(node.data.type)) {
                if (onlyIds) {
                    filteredNodes.push(node.id);
                } else {
                    filteredNodes.push(node);
                }
            }
        });
        return filteredNodes;
    };

    self.getNodesMap = function (type) {
        var nodes = self.visjsGraph.data.nodes.get();
        var map = {};
        nodes.forEach(function (node) {
            if (!type || (node.data && node.data.type == type)) {
                map[node.id] = node;
            }
        });
        return map;
    };
    self.getEdgesMap = function (key) {
        var edges = self.visjsGraph.data.edges.get();
        var map = {};
        var calculatedKey;
        edges.forEach(function (edge) {
            if (!key || key == "id") {
                calculatedKey = edge.id;
            } else {
                calculatedKey = edge[key];
            }
            if (!map[calculatedKey]) {
                map[calculatedKey] = [];
            }
            map[calculatedKey].push(edge);
        });
        return map;
    };

    return self;
})();

export default MappingColumnsGraph;
window.MappingColumnsGraph = MappingColumnsGraph;
