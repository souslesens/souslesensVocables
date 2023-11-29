import common from "../../shared/common.js";
import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Lineage_whiteboard from "../lineage/lineage_whiteboard.js";
import KGcreator from "./KGcreator.js";
import KGcreator_mappings from "./KGcreator_mappings.js";
import KGcreator_joinTables from "./KGcreator_joinTables.js";

var KGcreator_graph = (function () {
    var self = {};
    self.drawOntologyModel = function (source) {
        if (!source) {
            source = KGcreator.currentSlsvSource;
        }
        var options = {
            visjsOptions: {
                keepNodePositionOnDrag: true,
                onclickFn: KGcreator_graph.onNodeClick,
                onRightClickFn: KGcreator_graph.showGraphPopupMenu,
                visjsOptions: {
                    physics: {
                        stabilization: {
                            enabled: false,
                            iterations: 180, // maximum number of iteration to stabilize
                            updateInterval: 10,
                            ///  onlyDynamicEdges: false,
                            fit: true,
                        },
                        barnesHut: {
                            springLength: 0,
                            damping: 0.15,
                            centralGravity: 0.8,
                        },
                        minVelocity: 0.75,
                    },
                    nodes: { font: { color: Lineage_whiteboard.defaultNodeFontColor } },
                    edges: {
                        font: {
                            color: Lineage_whiteboard.defaultEdgeColor,
                            multi: true,
                            size: 10,
                            strokeWidth: 0,

                            //ital: true,
                        },
                    },
                },
            },
        };
        options.visjsOptions.manipulation = {
            enabled: false,
            initiallyActive: true,
            deleteNode: false,
            deleteEdge: false,
            // editNode: false,
            // editEdge: false,

            addEdge: function (edgeData, callback) {
                self.onAddEdge(edgeData, callback);
            },
        };
        Lineage_whiteboard.lineageVisjsGraph = new VisjsGraphClass("KGcreator_resourceLinkGraphDiv", { nodes: [], edges: [] }, {});

        Lineage_sources.activeSource = source;
        Lineage_whiteboard.drawModel(source, "KGcreator_resourceLinkGraphDiv", options, function (err) {
            var nodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.getIds();
            var edges = Lineage_whiteboard.lineageVisjsGraph.data.edges.getIds();
            var newNodes = [];
            var newEdges = [];
            var opacity = 0.7;
            var fontColor = "rgb(58,119,58)";
            nodes.forEach(function (node) {
                newNodes.push({ id: node, opacity: opacity, font: { color: fontColor }, layer: "ontology" });
            });
            nodes.forEach(function (edge) {
                newEdges.push({ id: edge, opacity: opacity, font: { color: fontColor, physics: false } });
            });
            Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(newNodes);
            Lineage_whiteboard.lineageVisjsGraph.data.edges.update(newEdges);
        });
    };

    self.onNodeClick = function (node, point, event) {
        PopupMenuWidget.hidePopup();
        if (!node || !node.data) {
            return (self.currentGraphNode = null);
        }
        self.currentGraphNode = node;
        if (node.data.type == "table") {
            Lineage_whiteboard.lineageVisjsGraph.network.addEdgeMode();
        } else {
            Lineage_whiteboard.lineageVisjsGraph.network.disableEditMode();
        }
    };

    self.showNodeNodeInfos = function () {
        NodeInfosWidget.showNodeInfos(self.currentGraphNode.data.source, self.currentGraphNode, "mainDialogDiv");
    };
    self.showGraphPopupMenu = function (node, point, event) {
        if (!node) {
            return;
        }
        self.currentGraphNode = node;
        if (!node || !node.data) {
            return;
        }
        var html = "";

        html = '    <span class="popupMenuItem" onclick="KGcreator_graph.showNodeNodeInfos();"> Node Infos</span>';
        html += '    <span class="popupMenuItem" onclick="KGcreator_mappings.showMappingDialog(true);"> Set column Class</span>';
        $("#popupMenuWidgetDiv").html(html);
        PopupMenuWidget.showPopup(point, "popupMenuWidgetDiv");
    };

    self.drawColumnToClassGraph = function (columnNodes) {
        var visjsData = { nodes: [], edges: [] };
        var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();

        columnNodes.forEach(function (columnNode, index) {
            var columnNodeId = columnNode.id;
            var classNode = columnNode.classNode;
            if (!existingNodes[columnNode.table]) {
                existingNodes[columnNode.table] = 1;
                visjsData.nodes.push({
                    id: columnNode.table,
                    label: columnNode.table,

                    shadow: Lineage_whiteboard.nodeShadow,
                    shape: "box",
                    size: Lineage_whiteboard.defaultShapeSize,
                    color: "#fff",
                    data: { id: columnNode.table, type: "table" },
                });
            }
            if (!existingNodes[columnNodeId]) {
                existingNodes[columnNodeId] = 1;
                visjsData.nodes.push({
                    id: columnNodeId,
                    label: columnNode.label,

                    shadow: Lineage_whiteboard.nodeShadow,
                    shape: "square",
                    size: Lineage_whiteboard.defaultShapeSize,
                    color: "#00afef",
                    font: { color: "#00afef" },
                    data: { id: columnNode.id, table: columnNode.table, type: "column" },
                });
                //edge to table
                var edgeId = columnNode.table + "_" + columnNodeId;
                if (!existingNodes[edgeId]) {
                    existingNodes[edgeId] = 1;

                    var physics = true;
                    if (index > 0) {
                        physics = false;
                    }

                    visjsData.edges.push({
                        id: edgeId,
                        from: columnNode.table,
                        to: columnNodeId,
                        data: {
                            id: edgeId,
                            from: columnNode.table,
                            to: columnNode.id,
                            type: "table",
                        },
                        color: "#bbb",
                        //  physics:false
                    });
                }

                //edge toClass

                var edgeId = columnNodeId + "_" + classNode;
                if (!existingNodes[edgeId]) {
                    existingNodes[edgeId] = 1;

                    visjsData.edges.push({
                        id: edgeId,
                        from: columnNodeId,
                        to: classNode,
                        data: {
                            id: edgeId,
                            from: columnNode.id,
                            to: classNode,
                            type: "map",
                        },
                        color: "#aed",
                        width: 2,
                        physics: physics,
                        smooth: {
                            type: "continuous",
                        },
                    });
                }
            }
        });

        Lineage_whiteboard.lineageVisjsGraph.data.nodes.add(visjsData.nodes);
        Lineage_whiteboard.lineageVisjsGraph.data.edges.add(visjsData.edges);
    };

    self.graphColumnToClassPredicates = function (tables) {
        var columnsWithClass = [];
        var existingGraphNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
        for (var table in KGcreator.currentConfig.currentMappings) {
            if (!tables || tables.indexOf(table) > -1) {
                KGcreator.currentConfig.currentMappings[table].tripleModels.forEach(function (triple) {
                    if (triple.p == "rdf:type" && existingGraphNodes[triple.o]) {
                        columnsWithClass.push({ id: table + "_" + triple.s, table: table, label: triple.s, type: "tableColumn", classNode: triple.o });
                    }
                });
            }
        }

        self.drawColumnToClassGraph(columnsWithClass);
    };

    self.graphColumnToColumnPredicates = function (tables) {
        var edges = [];
        var existingGraphNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
        for (var table in KGcreator.currentConfig.currentMappings) {
            if (!tables || tables.indexOf(table > -1)) {
                KGcreator.currentConfig.currentMappings[table].tripleModels.forEach(function (triple) {
                    if (triple.p.indexOf("http://") > -1) {
                        // && existingGraphNodes[triple.o]) {
                        var edgeId = table + "_" + triple.s + "_" + triple.p + "_" + triple.o;
                        if (!existingGraphNodes[edgeId]) {
                            existingGraphNodes[edgeId] = 1;
                            edges.push({
                                id: edgeId,
                                from: table + "_" + triple.s,
                                to: table + "_" + triple.o,
                                label: Sparql_common.getLabelFromURI(triple.p),
                                color: "#ec56da",
                                //dashes: true,

                                physics: false,
                                width: 2,
                                smooth: {
                                    type: "continuous",
                                },
                                arrows: {
                                    to: {
                                        enabled: true,
                                        type: "solid",
                                        scaleFactor: 0.5,
                                    },
                                },
                            });
                        }
                    }
                });
            }
        }
        Lineage_whiteboard.lineageVisjsGraph.data.edges.add(edges);
    };

    self.graphTablesJoins = function (dataSource) {
        var tableJoins = KGcreator.rawConfig.databaseSources[dataSource].tableJoins;
        if (!tableJoins) {
            return (KGcreator.rawConfig.databaseSources[dataSource].tableJoins = []);
        }
        var edges = [];
        var existingGraphNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
        tableJoins.forEach(function (join) {
            var edgeId = join.fromTable + "_" + join.toTable;
            if (!existingGraphNodes[edgeId]) {
                existingGraphNodes[edgeId] = 1;
                edges.push({
                    id: edgeId,
                    from: join.fromTable,
                    to: join.toTable,
                    label: join.fromColumn + "->" + join.toColumn,
                    color: "#70ac47",
                    //dashes: true,
                    arrows: {
                        to: {
                            enabled: true,
                        },
                    },
                    physics: false,
                    width: 2,
                });
            }
        });
        Lineage_whiteboard.lineageVisjsGraph.data.edges.add(edges);
    };
    self.onAddEdge = function (edgeData, callbabck) {
        var sourceNode = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get(edgeData.from);
        var targetNode = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get(edgeData.to);

        if (sourceNode.data && sourceNode.data.type == "table" && targetNode.data && targetNode.data.type == "table") {
            var databaseSourceConfig = KGcreator.currentConfig.currentDataSource;
            return KGcreator_joinTables.showJoinTablesDialog(databaseSourceConfig, sourceNode.data.id, targetNode.data.id, function (err, result) {
                KGcreator.rawConfig.databaseSources[databaseSourceConfig.name].tableJoins.push(result);

                KGcreator.saveSlsvSourceConfig(function (err, result) {
                    if (err) {
                        return alert(err);
                    }

                    MainController.UI.message("join saved");
                });
            });
        } else {
            return null;
        }
    };

    self.drawDataSourceMappings = function () {
        if (!KGcreator.currentConfig.currentDataSource) {
            return alert("select a source");
        }
        self.graphColumnToClassPredicates(null);
        self.graphColumnToColumnPredicates(null);
        self.graphTablesJoins(KGcreator.currentConfig.currentDataSource.name);
    };

    self.groupByFile = function () {
        var nodes = self.mappingVisjsGraph.data.nodes.get();
        var newNodes = {};
        var visjsData = { nodes: [], edges: [] };
        nodes.forEach(function (node) {
            if (!node.data || !node.data.fileName) {
                return;
            }
            if (!newNodes[node.data.fileName]) {
                newNodes[node.data.fileName] = 1;
                visjsData.nodes.push({
                    id: node.data.fileName,
                    label: node.data.fileName,
                    shape: "dot",
                    color: node.color,
                });
            }
            var edgeId = node.data.fileName + "_" + node.id;
            visjsData.edges.push({
                id: edgeId,
                from: node.id,
                to: node.data.fileName,
                color: "grey",
            });
        });

        self.mappingVisjsGraph.data.nodes.update(visjsData.nodes);
        self.mappingVisjsGraph.data.edges.update(visjsData.edges);
    };

    self.deleteColumnNode = function (columnNodes) {
        if (!Array.isArray(columnNodes)) {
            columnNodes = [columnNodes];
        }

        var columnNodeIds = [];
        columnNodes.forEach(function (columnNode) {
            columnNodeIds.push(columnNode.id);
        });
        Lineage_whiteboard.lineageVisjsGraph.data.nodes.remove(columnNodeIds);
    };
    self.deleteTableNodes = function (tableNode) {
        var columnNodeIds = tableNode.children;
        columnNodeIds.push(tableNode.id);
        Lineage_whiteboard.lineageVisjsGraph.data.nodes.remove(columnNodeIds);
    };

    self.groupByClass = function () {};

    self.groupMappings = function () {
        var nodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
        var visjsData = { nodes: [], edges: [] };
        var existingGraphNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();

        if (!existingGraphNodes["classes"]) {
            existingGraphNodes["classes"] = 1;
            visjsData.nodes.push({
                id: "_classes",
                label: "classes",
                shape: "dot",
                size: 5,
            });
        }
        if (!existingGraphNodes["mappings"]) {
            existingGraphNodes["mappings"] = 1;
            visjsData.nodes.push({
                id: "_mappings",
                label: "mappings",
                shape: "dot",
                size: 5,
            });
        }
        nodes.forEach(function (node) {
            if (node.data.type == "table") {
                var edgeId = "_classes_" + node.id;
                if (!existingGraphNodes[edgeId]) {
                    existingGraphNodes[edgeId] = 1;
                    visjsData.edges.push({
                        id: edgeId,
                        from: "_classes",
                        to: node.id,
                        width: 0,
                    });
                }
            } else if (node.data.type != "column") {
                var edgeId = "_mappings_" + node.id;
                if (!existingGraphNodes[edgeId]) {
                    existingGraphNodes[edgeId] = 1;
                    visjsData.edges.push({
                        id: edgeId,
                        from: "_mappings",
                        to: node.id,
                        width: 0,
                    });
                }
            }
        });

        Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(visjsData.nodes);
        Lineage_whiteboard.lineageVisjsGraph.data.edges.update(visjsData.edges);
    };

    self.drawDetailedMappings = function (tablesToDraw) {
        if (tablesToDraw && !Array.isArray(tablesToDraw)) {
            tablesToDraw = [tablesToDraw];
        }
        var sourceMappings = KGcreator.currentConfig.currentMappings;
        var visjsData = { nodes: [], edges: [] };

        var existingNodes = {};
        var json = {};
        var shape = "box";
        for (var table in sourceMappings) {
            if (!tablesToDraw || tablesToDraw.indexOf(table) > -1) {
                if (!existingNodes[table]) {
                    existingNodes[table] = 1;
                    visjsData.nodes.push({
                        id: table,
                        label: table,
                        shape: "ellipse",
                        color: "#ddd",
                        data: {
                            id: table,
                            label: table,
                            fileName: table,
                            type: "table",
                        },
                    });
                }

                var mappings = sourceMappings[table];
                json[table] = mappings;
                mappings.tripleModels.forEach(function (item, index) {
                    function getNodeAttrs(str) {
                        if (str.indexOf("http") > -1) {
                            return { type: "Class", color: "#70ac47", shape: "dot", size: 20 };
                        } else if (str.indexOf(":") > -1) {
                            // return "#0067bb";
                            return { type: "OwlType", color: "#aaa", shape: "ellipse" };
                        } else if (str.indexOf("$_") > -1) {
                            // return "#0067bb";
                            return { type: "blankNode", color: "#b0f5f5", shape: "square" };
                        } else if (str.indexOf("_rowIndex") > -1) {
                            // return "#0067bb";
                            return { type: "rowIndex", color: "#f90edd", shape: "star" };
                        } else {
                            if (table) {
                                var color = common.getResourceColor("mappingFileName", table);
                                return { type: "OwlType", color: "#00afef", shape: "box" };
                                //   return { type: "FileColumn", color: color, shape: "box" };
                            }
                            return {};
                        }
                    }

                    var sId = table + "_" + item.s;
                    var oId = table + "_" + item.o;
                    if (!existingNodes[sId]) {
                        existingNodes[sId] = 1;
                        var label = Sparql_common.getLabelFromURI(item.s);
                        var attrs = getNodeAttrs(item.s);
                        var drawRelation = true;
                        if (item.o == "owl:NamedIndividual") {
                            attrs.shape = "triangle";
                            drawRelation = false;
                        }
                        if (item.o == "owl:Class") {
                            attrs.shape = "triangle";
                            drawRelation = false;
                        }
                        if (item.o == "rdf:Bag") {
                            attrs.shape = "box";
                            drawRelation = false;
                        }
                        /*  if (item.isString) {
                            attrs.shape = "text";

                        }*/

                        visjsData.nodes.push({
                            id: sId,
                            label: label,
                            shape: attrs.shape,
                            color: attrs.color,
                            data: {
                                id: item.s,
                                label: label,
                                fileName: table,
                                type: attrs.type,
                            },
                        });
                    }
                    if (item.o != "owl:NamedIndividual" && item.o != "owl:Class") {
                        if (!existingNodes[oId]) {
                            existingNodes[oId] = 1;
                            var label = Sparql_common.getLabelFromURI(item.o);

                            var attrs = getNodeAttrs(item.o);
                            visjsData.nodes.push({
                                id: oId,
                                label: label,
                                shape: attrs.shape,
                                color: attrs.color,
                                data: {
                                    id: item.s,
                                    label: label,
                                    fileName: table,
                                    type: attrs.type,
                                },
                            });
                        }

                        var edgeId = sId + item.p + oId;
                        var label = Sparql_common.getLabelFromURI(item.p);
                        if (!existingNodes[edgeId]) {
                            existingNodes[edgeId] = 1;
                            visjsData.edges.push({
                                id: edgeId,
                                from: sId,
                                to: oId,
                                label: label,
                                // color: getNodeAttrs(item.o),
                                arrows: {
                                    to: {
                                        enabled: true,
                                        type: Lineage_whiteboard.defaultEdgeArrowType,
                                        scaleFactor: 0.5,
                                    },
                                },
                            });
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
                                label: label,
                            });
                        }
                    }
                });
            }
        }

        //   var html = "<div id='KGcreator_mappingsGraphDiv' style='width:1100px;height:750px'></div>";
        $("#mainDialogDiv").dialog("open");
        //  $("#mainDialogDiv").html(html);
        $("#mainDialogDiv").load("modules/tools/KGcreator/html/detailedMappings.html", function () {
            self.mappingVisjsGraph = new VisjsGraphClass("KGcreator_mappingsGraphDiv", visjsData, {});
            self.mappingVisjsGraph.draw();
            var options = {
                mode: "tree",
            };
            self.jsonEditor = new JsonEditor("#KGcreator_mappingsGraphEditor", json);
            //  JSONEditor().setMode("tree");
        });
    };

    self.saveDetailedMappings = function () {
        var mappings = self.jsonEditor.get();
        KGcreator.currentConfig.currentMappings = mappings;
        KGcreator.saveDataSourceMappings();
    };

    self.toSVG = function () {
        self.mappingVisjsGraph.toSVG();
    };

    return self;
})();

export default KGcreator_graph;
window.KGcreator_graph = KGcreator_graph;
