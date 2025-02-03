import common from "../../shared/common.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import MappingsDetails from "./mappingsDetails.js";
import DataSourceManager from "./dataSourcesManager.js";


var MappingColumnsGraph = (function () {

    var self = {}
    self.currentOffset = null
    self.currentGraphNode = {}
    self.visjsGraph = {}
    self.graphDiv = "mappingModeler_graphDiv";

    var stepX = 200;
    var stepY = 150;
    var minX = 0

    self.drawResource = function (newResource) {
        self.graphDivWidth = $("#mappingModeler_graphDiv").width();
        minX = (-self.graphDivWidth / 2) + stepX
        var arrows = {
            to: {
                enabled: true,
                type: "arrow",
            },
        };
        var edgeColor = "#ccc";
       self.initOffsets()
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
        newResource.fixed = {x: true, y: true};

        var visjsData = {nodes: [], edges: []};
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
                        data: {type: type},
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

    self.initOffsets=function(){
        if (!self.currentOffset) {
            self.currentOffset = {x: -self.graphDivWidth / 2, y: 0};
        }
    }

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

            if (!MappingModeler.currentRelation) {
                MappingModeler.currentRelation = {
                    from: {id: node.id, classId: getColumnClass(node), dataTable: node.data.dataTable},
                    to: null,
                    type: node.data.type,
                };
            } else {
                if (node.data.dataTable && node.data.dataTable != MappingModeler.currentRelation.from.dataTable) {
                    MappingModeler.currentRelation = null;
                    return alert("Relations between Columns from different datbels are not possible");
                }
                MappingModeler.currentRelation.to = {id: node.id, classId: getColumnClass(node)};
                if (MappingModeler.currentRelation.type != "Class" && node.data.type == "Class") {
                    self.graphActions.drawColumnToClassEdge(MappingModeler.currentRelation);
                } else if (MappingModeler.currentRelation.from.type != "Class" && node.data.type != "Class") {
                    MappingModeler.onLegendNodeClick({id: "ObjectProperty"});
                }
            }
        } else {
            MappingModeler.currentRelation = null;
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
            html = '    <span class="popupMenuItem" onclick="MappingColumnsGraph.graphActions.removeNodeEdgeGraph();"> Remove Edge</span>';
        } else {
            html = '    <span class="popupMenuItem" onclick="MappingColumnsGraph.graphActions.removeNodeFromGraph();"> Remove Node</span>';
        }
        html+="--------------<br>"
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
        outlineNode: function (nodeId) {
            self.visjsGraph.decorateNodes(null, {borderWidth: 1});
            self.visjsGraph.decorateNodes(nodeId, {borderWidth: 5});
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
                    data: {type: "rdf:type"},
                },
            ];

            self.addEdge(edges);
            MappingModeler.currentRelation = null;
        },

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

        showSampledata: function () {
            MappingModeler.showSampleData();
        },

        showColumnDetails: function (node) {
            var divId = "columnMappingDetailsDiv"
            $("#smallDialogDiv").html("<div id='" + divId + "'></div>")
            $("#smallDialogDiv").dialog("option","title","Column Technical Mappings")
            $("#smallDialogDiv").dialog("open")
            MappingsDetails.showColumnTechnicalMappingsDialog(divId,node || self.currentGraphNode, function(){
                $("#smallDialogDiv").dialog("close")
            })

        }
    };

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
                            y: maxY + stepY
                        };
                    } else {
                        self.currentOffset = {
                            x: maxX + stepX,
                            y: maxY
                        };
                    }

                }


                var map = {};
                var index = 0;
                var dataTables = self.getDatasourceTablesFromVisjsGraph();

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
                            id: "cluster_" + table,
                            borderWidth: 3,
                            shape: "ellipse",
                            color: "#ddd",
                            label: table,
                            y: -200,
                            x: (index++ * 250) - 400,
                            fixed: {x: true, y: true},
                            data: {table: table}
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
            options: {config: config},
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

    self.addDataSourceNode = function () {
        return
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
                            data: {type: "tableToColumn"},
                            arrow: {
                                to: {enabled: true, type: "arrow"},
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
    self.saveVisjsGraphWithConfig = function (callback) {
        self.saveVisjsGraph(callback)
    }

    self.clearGraph = function () {
        var currentDataSource=DataSourceManager.currentConfig.currentDataSource
        MappingColumnsGraph.visjsGraph.clearGraph();
        MappingColumnsGraph.visjsGraph = null;
        var visjsData = {nodes: [], edges: []};
        MappingColumnsGraph.drawGraphCanvas(MappingColumnsGraph.graphDiv, visjsData, function () {
            DataSourceManager.currentConfig.currentDataSource=currentDataSource
        });
        self.initOffsets()
    };


    return self;
})()

export default MappingColumnsGraph;
window.MappingColumnsGraph = MappingColumnsGraph