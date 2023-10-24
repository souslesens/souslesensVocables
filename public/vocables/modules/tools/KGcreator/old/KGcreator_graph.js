var KGcreator_graph = (function() {

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
          var databaseSourceConfig = {
            dbName: self.currentConfig.currentDataSource,
            type: self.currentConfig.databaseSources[self.currentConfig.currentDataSource].type
          };
          return JoinTablesWidget.showJoinTablesDialog(databaseSourceConfig, sourceNode.data.id, targetNode.data.id, function(err, result) {
            self.rawConfig.databaseSources[self.currentConfig.currentDataSource].tableJoins.push(result);

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
    html += "    <span class=\"popupMenuItem\" onclick=\"KGcreator.mapColumn.showMappingDialog(true);\"> Set column Class</span>";
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
    for (var table in self.currentConfig.currentMappings) {
      if (!tables || tables.indexOf(table) > -1) {
        self.currentConfig.currentMappings[table].tripleModels.forEach(function(triple) {
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
    for (var table in self.currentConfig.currentMappings) {
      if (!tables || tables.indexOf(table > -1)) {
        self.currentConfig.currentMappings[table].tripleModels.forEach(function(triple) {
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
    var tableJoins = self.currentConfig.databaseSources[dataSource].tableJoins;
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


  return self;


})();