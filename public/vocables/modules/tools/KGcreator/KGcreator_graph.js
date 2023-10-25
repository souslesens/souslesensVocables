import common from "../../shared/common.js";
import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Lineage_whiteboard from "../lineage/lineage_whiteboard.js";

var KGcreator_graph = (function () {
    var self = {};
  self.drawOntologyModel = function(source) {
    if (!source) {
      source = KGcreator.currentSlsvSource;
    }
    var options = {
      visjsOptions: {
        keepNodePositionOnDrag: true,
        onclickFn: KGcreator.onNodeClick,
        onRightClickFn: KGcreator.showGraphPopupMenu,
        visjsOptions: {
          physics: {
            stabilization: {
              enabled: false,
              iterations: 180, // maximum number of iteration to stabilize
              updateInterval: 10,
              ///  onlyDynamicEdges: false,
              fit: true
            },
            barnesHut: {
              springLength: 0,
              damping: 0.15,
              centralGravity: 0.8
            },
            minVelocity: 0.75
          },
          nodes: { font: { color: Lineage_whiteboard.defaultNodeFontColor } },
          edges: {
            font: {
              color: Lineage_whiteboard.defaultEdgeColor,
              multi: true,
              size: 10,
              strokeWidth: 0

              //ital: true,
            }
          }
        }
      }
    };
    options.visjsOptions.manipulation = {
      enabled: true,
      initiallyActive: true,
      deleteNode: false,
      deleteEdge: false,
      // editNode: false,
      // editEdge: false,

      addEdge: function(edgeData, callback) {
        var sourceNode = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get(edgeData.from);
        var targetNode = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get(edgeData.to);

        if (sourceNode.data && sourceNode.data.type == "table" && targetNode.data && targetNode.data.type == "table") {
          var databaseSourceConfig = KGcreator.currentConfig.currentDataSource
          return JoinTablesWidget.showJoinTablesDialog(databaseSourceConfig, sourceNode.data.id, targetNode.data.id, function(err, result) {
            self.rawConfig.currentDataSource.tableJoins.push(result);

            self.saveSlsvSourceConfig(self.currentSource, self.rawConfig, function(err, result) {
              if (err) {
                return alert(err);
              }

              MainController.UI.message("join saved");
            });
          });
        }
        else {
          return null;
        }
      }
    };
    Lineage_whiteboard.lineageVisjsGraph = new VisjsGraphClass("KGcreator_resourceLinkGraphDiv", { nodes: [], edges: [] }, {});

    Lineage_sources.activeSource = source;
    Lineage_whiteboard.drawModel(source, "KGcreator_resourceLinkGraphDiv", options, function(err) {
      var nodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.getIds();
      var edges = Lineage_whiteboard.lineageVisjsGraph.data.edges.getIds();
      var newNodes = [];
      var newEdges = [];
      var opacity = 0.7;
      var fontColor = "rgb(58,119,58)";
      nodes.forEach(function(node) {
        newNodes.push({ id: node, opacity: opacity, font: { color: fontColor }, layer: "ontology" });
      });
      nodes.forEach(function(edge) {
        newEdges.push({ id: edge, opacity: opacity, font: { color: fontColor, physics: false } });
      });
      Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(newNodes);
      Lineage_whiteboard.lineageVisjsGraph.data.edges.update(newEdges);
    });
  };


  self.onNodeClick = function(node, point, event) {
    PopupMenuWidget.hidePopup();
    self.currentGraphNode = node;
  };

  self.showNodeNodeInfos = function() {
    NodeInfosWidget.showNodeInfos(self.currentGraphNode.data.source, self.currentGraphNode, "mainDialogDiv");
  };
  self.showGraphPopupMenu = function(node, point, event) {
    if (!node) {
      return;
    }
    self.currentGraphNode = node;
    if (!node || !node.data) {
      return;
    }
    var html = "";

    html = "    <span class=\"popupMenuItem\" onclick=\"KGcreator.showNodeNodeInfos();\"> Node Infos</span>";
    html += "    <span class=\"popupMenuItem\" onclick=\"KGcreator_mappings.showMappingDialog(true);\"> Set column Class</span>";
    $("#popupMenuWidgetDiv").html(html);
    PopupMenuWidget.showPopup(point, "popupMenuWidgetDiv");
  };

  self.drawColumnToClassGraph = function(columnNodes) {
    var visjsData = { nodes: [], edges: [] };
    var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();

    columnNodes.forEach(function(columnNode) {
      var columnNodeId = columnNode.id;
      var classNode = columnNode.data.classNode;
      if (!existingNodes[columnNode.data.table]) {
        existingNodes[columnNode.data.table] = 1;
        visjsData.nodes.push({
          id: columnNode.data.table,
          label: columnNode.data.table,

          shadow: Lineage_whiteboard.nodeShadow,
          shape: "ellipse",
          size: Lineage_whiteboard.defaultShapeSize,
          color: "#fff",
          data: { id: columnNode.data.table, type: "table" }
        });
      }
      if (!existingNodes[columnNodeId]) {
        existingNodes[columnNodeId] = 1;
        visjsData.nodes.push({
          id: columnNodeId,
          label: columnNode.data.label,

          shadow: Lineage_whiteboard.nodeShadow,
          shape: "box",
          size: Lineage_whiteboard.defaultShapeSize,
          color: "#ddd",
          data: { id: columnNode.data.id, table: columnNode.data.table, type: "column" }
        });
        //edge to table
        var edgeId = columnNode.data.table + "_" + columnNodeId;
        if (!existingNodes[edgeId]) {
          existingNodes[edgeId] = 1;

          visjsData.edges.push({
            id: edgeId,
            from: columnNode.data.table,
            to: columnNodeId,
            data: {
              id: edgeId,
              from: columnNode.data.table,
              to: columnNode.data.id,
              type: "table"
            },
            color: "#bbb"
            // physics:false
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
              from: columnNode.data.id,
              to: classNode,
              type: "map"
            },
            color: "blue"
          });
        }
      }
    });

    Lineage_whiteboard.lineageVisjsGraph.data.nodes.add(visjsData.nodes);
    Lineage_whiteboard.lineageVisjsGraph.data.edges.add(visjsData.edges);
  };

  self.graphColumnToClassPredicates = function(tables) {
    var columnsWithClass = [];
    var existingGraphNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
    for (var table in KGcreator.currentConfig.currentMappings) {
      if (!tables || tables.indexOf(table) > -1) {
       KGcreator.currentConfig.currentMappings[table].tripleModels.forEach(function(triple) {
          if (triple.p == "rdf:type" && existingGraphNodes[triple.o]) {
            columnsWithClass.push({
              data: { id: table + "_" + triple.s, table: table, label: triple.s, type: "tableColumn", classNode: triple.o }
            });
          }
        });
      }
    }

    self.drawColumnToClassGraph(columnsWithClass);
  };

  self.graphColumnToColumnPredicates = function(tables) {
    var edges = [];
    var existingGraphNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
    for (var table in KGcreator.currentConfig.currentMappings) {
      if (!tables || tables.indexOf(table > -1)) {
       KGcreator.currentConfig.currentMappings[table].tripleModels.forEach(function(triple) {
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
                color: "#f90edd",
                //dashes: true,
                arrows: {
                  to: {
                    enabled: true,
                    type: "curve"
                  }
                }
                // physics:false
              });
            }
          }
        });
      }
    }
    Lineage_whiteboard.lineageVisjsGraph.data.edges.add(edges);
  };

  self.graphTablesJoins = function(dataSource) {
    var tableJoins =KGcreator.currentConfig.databaseSources[dataSource].tableJoins;
    var edges = [];
    var existingGraphNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
    tableJoins.forEach(function(join) {
      var edgeId = join.fromTable + "_" + join.toTable;
      if (!existingGraphNodes[edgeId]) {
        existingGraphNodes[edgeId] = 1;
        edges.push({
          id: edgeId,
          from: join.fromTable,
          to: join.toTable,
          label: join.fromColumn + "->" + join.toColumn,
          color: "#0067bb",
          //dashes: true,
          arrows: {
            to: {
              enabled: true
            }
          },
          physics: false
        });
      }
    });
    Lineage_whiteboard.lineageVisjsGraph.data.edges.add(edges);
  }
  ;

  self.drawDataSourceMappings = function() {
    if (!self.currentSource) {
      alert("select a source");
    }
    self.graphColumnToClassPredicates(null);
    self.graphColumnToColumnPredicates(null);
    self.graphTablesJoins(self.currentConfig.currentDataSource);

  };
    self.showDialog = function (mappingObjectsMap) {
        self.drawMappings(mappingObjectsMap, function (err, visjsData) {
            self.loadMappingsJstree(visjsData);
        });
    };

    self.loadMappingsJstree = function (visjsData) {
        var jstreeData = [
            {
                id: "MappingFiles",
                text: "MappingFiles",
                parent: "#",
                data: {
                    type: "MappingFiles",
                },
            },
            {
                id: "Classes",
                text: "Classes",
                parent: "#",
                data: {
                    type: "Classes",
                },
            },
        ];
        // var nodes=self.mappingVisjsGraph.data.nodes.get();
        var nodes = visjsData.nodes;
        var existingNodes = {};
        nodes.forEach(function (item) {
            var jstreeNode = JSON.parse(JSON.stringify(item));
            jstreeNode.text = jstreeNode.label;
            if (item.data && item.data.type == "Class") {
                jstreeNode.parent = "Classes";
                jstreeData.push(jstreeNode);
            }
            if (item.data && item.data.type == "FileColumn") {
                if (!existingNodes[jstreeNode.data.fileName]) {
                    existingNodes[jstreeNode.data.fileName] = 1;
                    jstreeNode.parent = "MappingFiles";
                    jstreeData.push({
                        id: jstreeNode.data.fileName,
                        text: jstreeNode.data.fileName,
                        parent: "MappingFiles",
                        data: { id: jstreeNode.data.fileName, label: jstreeNode.data.fileName, fileName: jstreeNode.data.fileName },
                    });
                }
            }
        });
        var options = {
            selectTreeNodeFn: function (event, obj) {
                if (!obj.node.data) return;
                var fileName = obj.node.data.fileName;
                var newNodes = [];
                self.mappingVisjsGraph.data.nodes.get().forEach(function (visjsNode) {
                    var hidden = true;
                    if (obj.node.data.type == "MappingFiles" || (visjsNode.data && visjsNode.data.fileName == fileName)) {
                        hidden = false;
                    }
                    newNodes.push({ id: visjsNode.id, hidden: hidden });
                });
                self.mappingVisjsGraph.data.nodes.update(newNodes);
            },
        };

        JstreeWidget.loadJsTree("KGcreatorGraph_jstreeDiv", jstreeData, options);
    };

    self.drawMappings = function (mappingObjectsMap, callback) {
        if (!mappingObjectsMap) {
            mappingObjectsMap = { [self.currentJsonObject.fileName]: self.currentJsonObject };
        }
        var visjsData = { nodes: [], edges: [] };

        var existingNodes = {};
        var shape = "box";
        for (var fileName in mappingObjectsMap) {
            var mappingObject = mappingObjectsMap[fileName];
            if (mappingObject.tripleModels) {
                mappingObject.tripleModels.forEach(function (item) {
                    function getNodeAttrs(str) {
                        if (str.indexOf("http") > -1) {
                            return { type: "Class", color: "#70ac47", shape: "ellipse" };
                        }
                        if (str.indexOf(":") > -1) {
                            // return "#0067bb";
                            return { type: "OwlType", color: "#aaa", shape: "ellipse" };
                        } else {
                            if (mappingObject.fileName) {
                                var color = common.getResourceColor("mappingFileName", mappingObject.fileName);
                                return { type: "FileColumn", color: color, shape: "box" };
                            }
                            return {};
                        }
                    }

                    if (!existingNodes[item.s]) {
                        existingNodes[item.s] = 1;
                        var label = Sparql_common.getLabelFromURI(item.s);
                        var attrs = getNodeAttrs(item.s);
                        visjsData.nodes.push({
                            id: item.s,
                            label: label,
                            shape: attrs.shape,
                            color: attrs.color,
                            data: {
                                id: item.s,
                                label: label,
                                fileName: fileName,
                                type: attrs.type,
                            },
                        });
                    }
                    if (!existingNodes[item.o]) {
                        existingNodes[item.o] = 1;
                        var label = Sparql_common.getLabelFromURI(item.o);

                        var attrs = getNodeAttrs(item.o);
                        visjsData.nodes.push({
                            id: item.o,
                            label: label,
                            shape: attrs.shape,
                            color: attrs.color,
                            data: {
                                id: item.s,
                                label: label,
                                fileName: fileName,
                                type: attrs.type,
                            },
                        });
                    }
                    var edgeId = item.s + item.p + item.o;
                    var label = Sparql_common.getLabelFromURI(item.p);
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;
                        visjsData.edges.push({
                            id: edgeId,
                            from: item.s,
                            to: item.o,
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
                });
            }
        }

        //  var html = "<div id='KGcreator_mappingsGraphDiv' style='width:1100px;height:750px'></div>";
        $("#mainDialogDiv").dialog("open");
        //$("#mainDialogDiv").html(html);
        $("#mainDialogDiv").load("snippets/KGcreator/KGcreatorGraph.html", function () {
            self.mappingVisjsGraph = new visjsGraphClass("KGcreator_mappingsGraphDiv", visjsData, {});
            self.mappingVisjsGraph.draw();

            callback(null, visjsData);
        });
    };
    self.groupByFile = function () {
        var nodes = self.mappingVisjsGraph.data.nodes.get();
        var newNodes = {};
        var visjsData = { nodes: [], edges: [] };
        nodes.forEach(function (node) {
            if (!node.data || !node.data.fileName) return;
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


  self.deleteColumnNode= function (columnNodes) {
    if (!Array.isArray(columnNodes)) {
      columnNodes = [columnNodes];
    }

    var columnNodeIds = [];
    columnNodes.forEach(function (columnNode) {
      columnNodeIds.push(columnNode.id);
    });
    Lineage_whiteboard.lineageVisjsGraph.data.nodes.remove(columnNodeIds);
  }  ;
  self. deleteTableNodes= function (tableNode) {
    var columnNodeIds = tableNode.children;
    columnNodeIds.push(tableNode.id);
    Lineage_whiteboard.lineageVisjsGraph.data.nodes.remove(columnNodeIds);

  };



    self.groupByClass = function () {};

    self.toSVG = function () {
        self.mappingVisjsGraph.toSVG();
    };




    return self;
})();

export default KGcreator_graph;
window.KGcreatorGraph = KGcreator_graph;
