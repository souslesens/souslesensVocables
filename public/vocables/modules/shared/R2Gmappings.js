import KGcreator from "../tools/KGcreator.js";
import VisjsGraphClass from "../graph/VisjsGraphClass.js";
import Lineage_whiteboard from "../tools/lineage/lineage_whiteboard.js";
import PopupMenuWidget from "../uiWidgets/popupMenuWidget.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";


import JoinTablesWidget from "../uiWidgets/joinTablesWidget.js";


var R2Gmappings = (function() {
  var self = {};
  self.currentConfig = {};
  self.currentSource = {};
  self.allTriplesMappings = {};

  self.init = function() {
    $("#KGcreator_centralPanelTabs").tabs({
      activate: function(e, ui) {
        var divId = ui.newPanel.selector;
        if (divId == "#KGcreator_resourceslinkingTab") {
          //  R2Gmappings.drawOntologyModel(self.currentSlsvSource);
        }
      }
    });
    R2Gmappings.graphActions.drawOntologyModel(self.currentSlsvSource);
    $("#KGcreator_resourceLinkRightPanel").load("snippets/KGcreator/graphControlPanel.html", function() {
    });
  };

  self.loadSourceConfig = function(source, callback) {
    self.currentSource = source;
    var payload = {
      dir: "mappings/" + source,
      name: "main.json"
    };
    $.ajax({
      type: "GET",
      url: Config.apiUrl + "/data/file",
      data: payload,
      dataType: "json",
      success: function(result, _textStatus, _jqXHR) {
        self.currentConfig = JSON.parse(result);


        var jstreeData = [];
        var options = {
          openAll: true,
          selectTreeNodeFn: function(event, obj) {
            if (obj.node.data.type == "databaseSource") {
              R2Gmappings.loadDataSource(self.currentSource, "databaseSource", obj.node.id);
            }
            else if (obj.node.data.type == "databaseSource") {
              R2Gmappings.loadDataSource(self.currentSource, "csvSource", obj.node.id);
            }
            else if (obj.node.data.type == "table") {

              var mappingObj = self.currentConfig.currentMappings[obj.node.data.id];
              self.loadMappingsInJsonEditor(mappingObj);
              var columns = self.currentConfig.databaseSources[self.currentConfig.currentDataSource].tables[obj.node.data.id];
              var table = obj.node.data.id;
              self.showTablesColumnTree(table, columns);
              self.currentTreeNode = obj.node;
            }
            else if (obj.node.data.type == "csvFile") {

              var mappingObj = self.currentConfig.currentMappings[obj.node.data.id];
              self.loadMappingsInJsonEditor(mappingObj);
              self.showCsvColumnTree(obj.node.id);
              self.currentTreeNode = obj.node;
            }
            else if (obj.node.data.type == "tableColumn") {
              self.currentTreeNode = obj.node;
            }
            else if (obj.node.data.type == "csvFileColumn") {
              self.currentTreeNode = obj.node;
            }
          },

          contextMenu: KGcreator.getContextMenu()
          //  withCheckboxes: true,
        };

        jstreeData.push({
          id: "databaseSources",
          text: "databaseSources",
          parent: "#",
          data: {
            type: "sourceType"
          }


        });
        jstreeData.push({
          id: "csvSources",
          text: "csvSources",
          parent: "#",
          data: {
            type: "sourceType"
          }

        });

        for (var datasource in self.currentConfig.databaseSources) {
          jstreeData.push({
            id: datasource,
            text: datasource,
            parent: "databaseSources",
            data: { id: datasource, type: "databaseSource" }

          });
          JstreeWidget.loadJsTree("databaseSources", jstreeData, options);

        }
        for (var datasource in self.currentConfig.csvSources) {
          jstreeData.push({
            id: datasource,
            text: datasource,
            parent: "csvSources",
            data: { id: datasource, type: "csvFile" }

          });
          JstreeWidget.loadJsTree("KGcreator_csvTreeDiv", jstreeData, options);

        }


      },
      error: function(err) {
        callback(err);
      }
    });
  };


  self.loadDataSource = function(slsvSource, sourceType, dataSource) {
    self.currentConfig.currentDataSource = dataSource;
    self.currentConfig.databaseSources[dataSource].dataSource = dataSource;
    self.currentConfig.databaseSources[dataSource].tables = [];
    self.currentConfig.databaseSources[dataSource].mappings = {};

    async.series([
        function(callbackSeries) {
          if (sourceType != "databaseSource") {
            return callbackSeries();
          }
          KGcreator.listTables(dataSource, function(err, tables) {
            if (err) {
              return callbackSeries();
            }
            self.currentConfig.databaseSources[dataSource].tables = tables;
            callbackSeries();
          });
        },
        function(callbackSeries) {
          if (sourceType != "csvSource") {
            return callbackSeries();
          }
          KGcreator.listFiles(slsvSource, function(err, files) {
            if (err) {
              return callbackSeries();
            }
            self.currentConfig.csvSources.files = files;
            callbackSeries();
          });
        },
        function(callbackSeries) {
          self.getAllTriplesMappings(slsvSource, self.currentConfig.currentDataSource, function(err, mappings) {
            if (err) {
              return callbackSeries();
            }
            self.currentConfig.currentMappings = mappings;


            //  self.currentConfig.databaseSources[dataSource].mappings = mappings;
            callbackSeries();
          });
        }
        ,
        function(callbackSeries) {
          if (self.currentConfig.databaseSources[dataSource]) {
            self.showTablesTree(self.currentConfig.databaseSources[dataSource]);
          }
          else if (self.currentConfig.csvSources[dataSource]) {
            self.showTablesTree(self.currentConfig.csvSources[dataSource]);
          }
          callbackSeries();

        }
      ]
      , function(err) {
        if (err) {
          return alert(err);
        }
      });
  };


  self.showTablesTree = function(datasourceConfig) {
    var jstreeData = [];

    for (var table in datasourceConfig.tables) {
      var label = table;
      if (self.currentConfig.currentMappings[table]) {
        label = "<span class='KGcreator_fileWithMappings'>" + table + "</span>";
      }
      jstreeData.push({
        id: table,
        text: label,
        parent: datasourceConfig.dataSource,
        data: {
          id: table, label: table,
          type: "table"
        }
      });

    }
    JstreeWidget.addNodesToJstree("KGcreator_csvTreeDiv", datasourceConfig.dataSource, jstreeData);
  };
  self.showCsvFilesTree = function(datasourceConfig) {
    var jstreeData = [];

    for (var file in datasourceConfig.file) {
      var label = file;
      if (self.currentConfig.currentMappings[file + ".json"]) {
        label = "<span class='KGcreator_fileWithMappings'>" + file + "</span>";
      }
      jstreeData.push({
        id: file,
        text: label,
        parent: "csvSources",
        data: {
          id: table, label: file,
          type: "csvSources"
        }
      });

    }


    JstreeWidget.addNodesToJstree("KGcreator_csvTreeDiv", "csvSources", jstreeData);

  };
  self.showTablesColumnTree = function(table, tableColumns) {
    var jstreeData = [];


    var columnMappings = self.getColumnMappings(table, null, "s");

    tableColumns.forEach(function(column) {
      var label = column;

      if (columnMappings[column]) {
        label = "<span class='KGcreator_fileWithMappings'>" + column + "</span>";

      }

      jstreeData.push({
        id: table + "_" + column,
        text: label,
        parent: table,
        data: { id: column, table: table, label: column, type: "tableColumn" }

      });


    });


    JstreeWidget.addNodesToJstree("KGcreator_csvTreeDiv", table, jstreeData);
    self.graphActions.graphColumnToClassPredicates([table]);


    for (var column in columnMappings) {

    }
    self.graphActions.drawColumnNodes(jstreeData);

  };
  self.showCsvColumnTree = function(table, datasourceConfig) {
    var jstreeData = [];
//KGcreator.
    for (var table in datasourceConfig.tables) {
      var label = table;
      if (self.currentConfig.currentMappings[self.currentConfig.currentDataSource + "_" + table + ".json"]) {
        label = "<span class='KGcreator_fileWithMappings'>" + table + "</span>";
      }


      var columns = datasourceConfig.tables[table];
      columns.forEach(function(column) {
        jstreeData.push({
          id: table + "_" + column,
          text: column,
          parent: table,
          data: { id: column, table: table, label: column, type: "csvFileColumn" }

        });
      });
    }


    JstreeWidget.addNodesToJstree("KGcreator_csvTreeDiv", table, jstreeData);

  };


  self.getMappingsList = function(source, callback) {

    var payload = {
      dir: "mappings/" + source
    };


    $.ajax({
      type: "GET",
      url: Config.apiUrl + "/data/files",
      data: payload,
      dataType: "json",
      success: function(result, _textStatus, _jqXHR) {
        self.mappingFiles = {};
        if (result == null) {
          return callback();
        }
        var mappingFiles = [];
        result.forEach(function(file) {
          if (file != "main.json") {
            mappingFiles.push(file);
          }
        });
        callback(null, mappingFiles);
      },
      error: function(err) {
        callback(err);
      }
    });
  };


  self.loadMappingsInJsonEditor = function(mappingObj) {

    KGcreator.currentJsonObject = mappingObj;
    KGcreator.mainJsonEditor.load(mappingObj);
    KGcreator.setUpperOntologyPrefix();

    KGcreator.mainJsonEditorModified = false;

    if (!KGcreator.currentJsonObject.graphUri) {
      KGcreator.currentJsonObject.graphUri = KGcreator.currentGraphUri || "";
    }
    else {
      KGcreator.currentGraphUri = KGcreator.currentJsonObject.graphUri;
    }

  };


  self.getIndividualMapping = function(source, className) {
    self.getAllTriplesMappings(source, self.currentConfig.currentDataSource, function(err, allTripleMappings) {
      if (err) {
        return callback(err);
      }

      var table = null;
      var column = null;
      for (var fileName in allTripleMappings) {
        var tripleModels = allTripleMappings[fileName].tripleModels;
        var databaseSource = allTripleMappings[fileName].databaseSource;

        tripleModels.forEach(function(triple) {
          if (triple.p == "rdf:type" && triple.o == className) {
            table = fileName;
            column = triple.s;
            return { databaseSource: databaseSource, table: table, column: column };
          }
        });
      }
    });
  };
  self.getIndividualRecord = function(source, className, uri, callback) {
    var mapping = self.getIndividualMapping(source, className);

    var sql = "select * from " + mapping.table + "where " + mapping.column + " = '" + uri + "'";
  };


  self.graphActions = {
    drawOntologyModel: function(source) {
      if (!source) {
        source = KGcreator.currentSlsvSource;
      }
      var options = {
        visjsOptions: {
          keepNodePositionOnDrag: true,
          onclickFn: R2Gmappings.graphActions.onNodeClick,
          onRightClickFn: R2Gmappings.graphActions.showGraphPopupMenu,
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
            return JoinTablesWidget.showJoinTablesDialog(databaseSourceConfig, sourceNode.data.id, targetNode.data.id);
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
        nodes.forEach(function(node) {
          newNodes.push({ id: node, opacity: 0.2, font: { color: "#ccc" }, layer: "ontology" });
        });
        nodes.forEach(function(edge) {
          newEdges.push({ id: edge, opacity: 0.2, font: { color: "#ccc", physics: false } });
        });
        Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(newNodes);
        Lineage_whiteboard.lineageVisjsGraph.data.edges.update(newEdges);

      });


    },
    onNodeClick: function(node, point, event) {
      PopupMenuWidget.hidePopup();
      self.currentGraphNode = node;
    },

    showNodeNodeInfos: function() {
      NodeInfosWidget.showNodeInfos(self.currentGraphNode.data.source, self.currentGraphNode, "mainDialogDiv");
    },
    showGraphPopupMenu: function(node, point, event) {
      if (!node) {
        return;
      }
      self.currentGraphNode = node;
      if (!node || !node.data) {
        return;
      }
      var html = "";


      html = "    <span class=\"popupMenuItem\" onclick=\"R2Gmappings.graphActions.showNodeNodeInfos();\"> Node Infos</span>";
      html += "    <span class=\"popupMenuItem\" onclick=\"R2Gmappings.graphActions.showLinkFieldToClassDialog();\"> Set fieldClass</span>";
      $("#popupMenuWidgetDiv").html(html);
      PopupMenuWidget.showPopup(point, "popupMenuWidgetDiv");
    },


    showLinkFieldToClassDialog: function() {
      PopupMenuWidget.hidePopup();
      var columnNode = self.currentTreeNode;
      if (columnNode.data.type.indexOf("Column") < 0) {
        return alert("select a field (column)");
      }

      var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
      if (existingNodes[columnNode.data.id]) {
        if (!confirm("field " + columnNode + " already has a type, continue anyway ?")) {
          return;
        }
      }


      $("#smallDialogDiv").dialog("open");

      $("#smallDialogDiv").load("snippets/KGcreator/linkColumnToClassDialog.html", function() {
        var columnTriples = {};


        for (var key in self.currentConfig.currentMappings) {
          columnTriples[key] = self.getColumnMappings(key, columnNode.data.id, "s");

        }

        var triplesHtml = "<ul>";
        for (var key in columnTriples) {
          if (!columnTriples[key][columnNode.data.id]) {
            continue;
          }
          triplesHtml += "<li><b>" + key + "</b></li>";
          triplesHtml += "<ul>";
          columnTriples[key][columnNode.data.id].forEach(function(triple) {
            triplesHtml += "<li>" + triple.s + "-" + triple.p + "->" + triple.o + "</li>";
          });
          triplesHtml += "</ul>";

          triplesHtml += "</ul>";
        }

        if (Object.keys(columnTriples).length > 0) {
          $("#LinkColumn_existingMapping").html(triplesHtml);
          $("#LinkColumn_basicTypeSelect").css("display", "none");
        }
        else {
          $("#LinkColumn_basicTypeSelect").css("display", "block");
        }
      });

    },

    validateLinkColumnToClass: function() {
      var columnNode = self.currentTreeNode;


      if (!self.currentGraphNode) {
        return alert("select a node");
      }
      if (confirm(" set class " + self.currentGraphNode.data.label + " as rdf:type for  field " + columnNode.data.label)) {

        KGcreator.currentJsonObject.tripleModels.push({
          s: columnNode.data.id,
          p: "rdf:type",
          o: self.currentGraphNode.data.id
        });
        KGcreator.mainJsonEditor.load(KGcreator.currentJsonObject);

        columnNode.data.classNode = self.currentGraphNode.id;
        self.graphActions.drawColumnToClassGraph([columnNode]);
      }

    },


    drawColumnToClassGraph: function(columnNodes) {


      var visjsData = { nodes: [], edges: [] };
      var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();


      columnNodes.forEach(function(columnNode) {
        var columnNodeId = columnNode.data.id;
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
            data: { id: columnNode.data.id, table: columnNode.data.id, type: "column" }
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


    },

    graphColumnToClassPredicates: function(tables) {
      var columnsWithClass = [];
      var existingGraphNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
      for (var table in self.currentConfig.currentMappings) {
        if (!tables || tables.indexOf(table > -1)) {
          self.currentConfig.currentMappings[table].tripleModels.forEach(function(triple) {
            if (triple.p == "rdf:type" && existingGraphNodes[triple.o]) {
              columnsWithClass.push({
                data: { id: table + "_" + triple.s, table: table, label: triple.s, type: "tableColumn", classNode: triple.o }
              });
            }
          });
        }
      }

      self.graphActions.drawColumnToClassGraph(columnsWithClass);
    },


    graphColumnToColumnPredicates: function(tables) {
      var edges = [];
      var existingGraphNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
      for (var table in self.currentConfig.currentMappings) {
        if (!tables || tables.indexOf(table > -1)) {
          self.currentConfig.currentMappings[table].tripleModels.forEach(function(triple) {
            if (triple.p.indexOf("http://") > -1) {// && existingGraphNodes[triple.o]) {
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
    },
    drawDataSourceMappings: function() {
      self.graphActions.graphColumnToClassPredicates(null);
      self.graphActions.graphColumnToColumnPredicates(null);
    }


  };

  self.getAllTriplesMappings = function(slsvSource, mappingSource, callback) {

    var payload = {
      dir: "mappings/" + slsvSource,
      name: mappingSource + ".json"
    };

    $.ajax({
      type: "GET",
      url: `${Config.apiUrl}/data/file`,
      data: payload,
      dataType: "json",
      success: function(result, _textStatus, _jqXHR) {
        try {

          return callback(null, JSON.parse(result));

        } catch (e) {
          return callback(e);
        }
        callback();
      },
      error(err) {
        return callback(null, {});
      }
    });

  };

  self.getAllTriplesMappingsOld = function(source, callback) {
    if (false && self.allTriplesMappings[source]) {
      return callback(null, self.allTriplesMappings[source]);
    }
    self.getMappingsList(source, function(err, result) {
      if (err) {
        return alert(err.responseText);
      }

      var allTripleMappings = {};

      async.eachSeries(
        result,
        function(mappingFileName, callbackEach) {
          var payload = {
            dir: "mappings/" + source,
            name: mappingFileName
          };
          allTripleMappings[mappingFileName] = {};
          $.ajax({
            type: "GET",
            url: `${Config.apiUrl}/data/file`,
            data: payload,
            dataType: "json",
            success: function(result, _textStatus, _jqXHR) {
              try {
                var jsonObject = JSON.parse(result);
                allTripleMappings[mappingFileName] = jsonObject;
              } catch (e) {
                console.log("parsing error " + mappingFileName);
              }
              callbackEach();
            },
            error(err) {
              return callbackEach(err);
            }
          });
        },
        function(err) {
          if (err) {
            return callback(err.responseText);
          }
          self.allTriplesMappings[source] = allTripleMappings;


          /*    for (var key in allTripleMappings) {
                delete allTripleMappings[key].graphUri
                delete allTripleMappings[key].fileName;
                delete allTripleMappings[key].databaseSource;
              }*/


          return callback(null, allTripleMappings);
        }
      );
    });
  };


  self.getColumnMappings = function(table, column, role) {
    var columnTriples = {};
    if (!self.currentConfig.currentMappings[table]) {
      return columnTriples;
    }

    self.currentConfig.currentMappings[table].tripleModels.forEach(function(triple) {
      if ((column && triple[role] == column) || !column) {
        if (!columnTriples[triple[role]]) {
          columnTriples[triple[role]] = [];
        }
        columnTriples[triple[role]].push(triple);
      }
    });
    return columnTriples;
  };


  return self;
})();

export default R2Gmappings;
window.R2Gmappings = R2Gmappings;
