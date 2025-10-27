import common from "../../shared/common.js";
import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Lineage_whiteboard from "../lineage/lineage_whiteboard.js";
import KGcreator from "./KGcreator.js";
import KGcreator_mappings from "./KGcreator_mappings.js";
import KGcreator_joinTables from "./KGcreator_joinTables.js";
import GraphDisplayLegend from "../../graph/graphDisplayLegend.js";
import SimpleListSelectorWidget from "../../uiWidgets/simpleListSelectorWidget.js";
import KGcreator_bot from "../../bots/KGcreator_bot.js";
import UI from "../../../modules/shared/UI.js";

var KGcreator_graph = (function () {
    var self = {};

    self.drawOntologyModel = function (source) {
        $("#KGcreator_topButtons").load("./modules/tools/KGcreator/html/linkButtons.html", function () {
            //UI.PopUpOnHoverButtons();
        });

        //return;
        if (!source) {
            source = KGcreator.currentSlsvSource;
        }
        var options = {
            visjsOptions: {
                keepNodePositionOnDrag: true,
                onclickFn: KGcreator_graph.onOntologyModelNodeClick,
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
            enabled: true,
            initiallyActive: true,
            deleteNode: false,
            deleteEdge: false,
            // editNode: false,
            // editEdge: false,

            addEdge: function (edgeData, callback) {
                self.onAddEdgeOntologyModel(edgeData, callback);
            },
        };
        Lineage_whiteboard.lineageVisjsGraph = new VisjsGraphClass("KGcreator_mappingsGraphDiv", { nodes: [], edges: [] }, {});

        Lineage_sources.activeSource = source;
        $("#KGcreator_resourceLinkGraphDiv").html("");
        Lineage_whiteboard.drawModel(source, "KGcreator_mappingsGraphDiv", options, function (err, topConcepts) {
            $("#KGcreator_resourceLinkRightPanel").load("./modules/tools/KGcreator/html/graphControlPanel.html", function () {});
            if (!err && topConcepts.length > 0) {
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
                GraphDisplayLegend.drawLegend("KGcreator_classes", "LineageVisjsLegendCanvas", false);

                KGcreator_graph.drawDataSourceMappings();
            }
        });
    };

    self.onOntologyModelNodeClick = function (node, point, event, caller) {
        // console.log(JSON.stringify(node));
        PopupMenuWidget.hidePopup();
        if (!node || !node.data) {
            return (self.currentGraphNode = null);
        }
        self.currentGraphNode = node;
        if (node.data.type == "table" || node.data.type == "column") {
            //  Lineage_whiteboard.lineageVisjsGraph.network.addEdgeMode();
        } else {
            Lineage_whiteboard.lineageVisjsGraph.network.disableEditMode();
        }
    };

    self.showNodeNodeInfos = function () {
        NodeInfosWidget.showNodeInfos(self.currentGraphNode.data.source, self.currentGraphNode, "KGcreator_dialogDiv");
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
        point.x = event.x;
        point.y = event.y;
        PopupMenuWidget.showPopup(point, "popupMenuWidgetDiv");
    };

    self.drawColumnToClassGraph = function (columnNodes) {
        var visjsData = { nodes: [], edges: [] };
        var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
        if (!existingNodes || Object.keys(existingNodes).length == 0) {
            return;
        }

        columnNodes.forEach(function (columnNode, index) {
            var columnNodeId = columnNode.id;
            var classNode = columnNode.classNode;
            if (false && !existingNodes[columnNode.table]) {
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
                    data: columnNode,
                });
                //edge to table
                var edgeId = columnNode.table + "_" + columnNodeId;
                if (false && !existingNodes[edgeId]) {
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
                        physics: true,
                        distance: 10,
                        smooth: {
                            type: "continuous",
                        },
                    });
                }
            }
        });

        Lineage_whiteboard.addVisDataToGraph(visjsData);
    };

    self.graphColumnToClassPredicates = function (tables) {
        var columnsWithClass = [];
        var existingGraphNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
        for (var table in KGcreator.currentConfig.currentMappings) {
            if (!tables || tables.indexOf(table) > -1) {
                KGcreator.currentConfig.currentMappings[table].tripleModels.forEach(function (triple) {
                    if (triple.p == "rdf:type" && existingGraphNodes[triple.o]) {
                        columnsWithClass.push({ id: table + "_" + triple.s, table: table, label: triple.s, type: "column", columnName: triple.s, classNode: triple.o });
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
                    if (triple.p.indexOf("http://") > -1 && !triple.isString) {
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

    self.graphInterTablesColumnPredicates = function () {
        /*    function getIntertablespaths(tableJoins) {
            KGcreator.currentConfig.currentMappings[tableJoins.fromTable].tripleModels.forEach(function(triple) {
                if (triple.s == tableJoins.fromColumn)
            })
        }*/

        var edges = [];
        var existingGraphNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();

        var tableJoins = KGcreator.rawConfig.databaseSources[KGcreator.currentConfig.currentDataSource.name].tableJoins;

        tableJoins.forEach(function (item) {
            var fromId = item.fromTable + "_" + item.fromColumn;
            var toId = item.toTable + "_" + item.toColumn;
            var edgeId = fromId + "_" + toId;
            edges.push({
                id: edgeId,
                from: fromId,
                to: toId,
                //  label: Sparql_common.getLabelFromURI(triple.p),
                color: "#000efd",
                dashes: true,

                physics: true,
                width: 1,
                smooth: {
                    type: "continuous",
                },
                /*  arrows: {
                    to: {
                        enabled: true,
                        type: "solid",
                        scaleFactor: 0.5,
                    },
                },*/
            });
        });

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
    self.onAddEdgeOntologyModel = function (edgeData, callback) {
        var sourceNode = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get(edgeData.from);
        var targetNode = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get(edgeData.to);

        if (sourceNode.data && sourceNode.data.type == "table" && targetNode.data && targetNode.data.type == "table") {
            var databaseSourceConfig = KGcreator.currentConfig.currentDataSource;
            return KGcreator_joinTables.showJoinTablesDialog(databaseSourceConfig, sourceNode.data.id, targetNode.data.id, function (err, result) {
                KGcreator.rawConfig.databaseSources[databaseSourceConfig.name].tableJoins.push(result);

                KGcreator.saveSlsvSourceConfig(function (err, result) {
                    if (err) {
                        return MainController.errorAlert(err);
                    }

                    UI.message("join saved");
                });
            });
        } else if (sourceNode.data && sourceNode.data.type == "column" && targetNode.data && targetNode.data.type == "column") {
            if (sourceNode.data.table != targetNode.data.table) {
                Lineage_whiteboard.lineageVisjsGraph.network.disableEditMode();
                if (!confirm("choose column that is the foreign key for the tartget table in the source table")) {
                    return;
                }
                var columns = KGcreator.currentConfig.currentDataSource.tables[sourceNode.data.table];
                SimpleListSelectorWidget.showDialog(
                    null,
                    function (callbackLoad) {
                        return callbackLoad(columns);
                    },

                    function (selectedColumn) {
                        if (!selectedColumn) {
                            return;
                        }

                        KGcreator_mappings.setPredicatesBetweenColumnsInTable(sourceNode.data, targetNode.data, selectedColumn);
                    },
                );
            } else {
                KGcreator_mappings.setPredicatesBetweenColumnsInTable(sourceNode.data, targetNode.data, null);
            }
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
        self.graphInterTablesColumnPredicates();
        //  self.graphTablesJoins(KGcreator.currentConfig.currentDataSource.name);
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
                    size: Lineage_whiteboard.defaultShapeSize,
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
                size: Lineage_whiteboard.defaultShapeSize,
            });
        }
        if (!existingGraphNodes["mappings"]) {
            existingGraphNodes["mappings"] = 1;
            visjsData.nodes.push({
                id: "_mappings",
                label: "mappings",
                shape: "dot",
                size: Lineage_whiteboard.defaultShapeSize,
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

    self.addInterTableJoinsToVisjsData = function (dataSource, visjsData) {
        if (!KGcreator.rawConfig || !KGcreator.rawConfig.databaseSources[dataSource] || !KGcreator.rawConfig.databaseSources[dataSource].tableJoins) {
            return visjsData;
        }
        var edges = [];
        var existingEdges = {};
        visjsData.edges.forEach(function (edge) {
            existingEdges[edge.id] = 1;
        });
        KGcreator.rawConfig.databaseSources[dataSource].tableJoins.forEach(function (item) {
            var sId = item.fromTable + "_" + item.fromColumn;
            var oId = item.toTable + "_" + item.toColumn;
            var edgeId = sId + "_" + oId;
            if (!existingEdges[edgeId]) {
                existingEdges[edgeId] = 1;
                visjsData.edges.push({
                    id: edgeId,
                    from: sId,
                    to: oId,
                    color: "#f90edd",
                    dashes: true,
                });
            }
        });
        return visjsData;
    };

    /////////////////////////////////////////Detailed Mappings//////////////////////////////////////////////////////

    self.drawDetailedMappings = function (tablesToDraw, divId) {
        if (tablesToDraw && !Array.isArray(tablesToDraw)) {
            tablesToDraw = [tablesToDraw];
        }
        if (!divId) {
            divId = "KGcreator_mappingsGraphDiv";
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
                        size: Lineage_whiteboard.defaultShapeSize,
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
                var columns = KGcreator.currentConfig.currentDataSource.tables[table];
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

                json[table] = mappings;
                mappings.tripleModels.forEach(function (item, index) {
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
                            if (!attrs) return;
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
        }

        visjsData = self.addInterTableJoinsToVisjsData(KGcreator.currentConfig.currentDataSource.name, visjsData);

        var options = {
            onclickFn: KGcreator_graph.onDetailedGraphNodeClick,
            visjsOptions: {
                manipulation: {
                    enabled: true,
                    initiallyActive: true,
                    deleteNode: false,
                    deleteEdge: false,
                    editNode: false,
                    editEdge: false,

                    addEdge: function (edgeData, callback) {
                        self.onAddEdgeDetailedMappings(edgeData, callback);
                    },
                },
            },
        };

        self.mappingVisjsGraph = new VisjsGraphClass(divId, visjsData, options);
        self.mappingVisjsGraph.draw();
        GraphDisplayLegend.drawLegend("KGcreatorMappings", "KGcreatorVisjsLegendCanvas", false);
        /*   $('#KGcreatorVisjsLegendCanvas').css('right','55%');
        var menuBarPosition=-($(window).height()-$('#MenuBar').height()+30);
        $('#KGcreatorVisjsLegendCanvas').css('top',0);*/
        $("#KGcreatorVisjsLegendCanvas").css("top", 0);
        $("#KGcreatorVisjsLegendCanvas").css("right", 200);
    };

    self.onDetailedGraphNodeClick = function (node, point, event, caller) {
        // console.log(JSON.stringify(node));
        PopupMenuWidget.hidePopup();
        if (!node || !node.data) {
            return (self.currentGraphNode = null);
        }
        self.currentGraphNode = node;
        if (event.ctrlKey && node.data.role == "column") {
            self.mappingVisjsGraph.network.addEdgeMode();
        } else {
            self.mappingVisjsGraph.network.disableEditMode();
            if (node.data.role == "column") {
                KGcreator.currentTreeNode = node;
                KGcreator_bot.start(node, KGcreator_mappings.afterMappingsFn);
            }
        }
    };

    self.onAddEdgeDetailedMappings = function (edgeData, callback) {
        var sourceNode = self.mappingVisjsGraph.data.nodes.get(edgeData.from);
        var targetNode = self.mappingVisjsGraph.data.nodes.get(edgeData.to);

        var node = {
            data: {
                id: sourceNode.data.id,
                table: sourceNode.data.table,
                predicateObjectColumn: targetNode.data.id,
                predicateObjectTable: targetNode.data.table,
            },
        };

        //   return KGcreator_bot.start(node);

        if (sourceNode.data && sourceNode.data.role == "column") {
            if (sourceNode.data.table != targetNode.data.table) {
                self.mappingVisjsGraph.network.disableEditMode();

                var columns = KGcreator.currentConfig.currentDataSource.tables[sourceNode.data.table];
                var virtualColumns = KGcreator.currentConfig.currentMappings[sourceNode.data.table].virtualColumns;
                if (virtualColumns) {
                    columns = columns.concat(virtualColumns);
                }

                SimpleListSelectorWidget.showDialog(
                    { title: "Choose correponding column as join key in source table" },
                    function (callbackLoad) {
                        return callbackLoad(columns);
                    },

                    function (selectedColumn) {
                        if (!selectedColumn) {
                            return;
                        }

                        KGcreator_mappings.setPredicatesBetweenColumnsInTable(sourceNode.data, targetNode.data, selectedColumn);
                    },
                );
            } else {
                KGcreator_mappings.setPredicatesBetweenColumnsInTable(sourceNode.data, targetNode.data, null);
            }
        } else {
            return null;
        }
    };

    self.toSVG = function () {
        self.mappingVisjsGraph.toSVG();
    };

    return self;
})();

export default KGcreator_graph;
window.KGcreator_graph = KGcreator_graph;
