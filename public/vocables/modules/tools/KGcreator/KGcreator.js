import SourceSelectorWidget from "../../uiWidgets/sourceSelectorWidget.js";
import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import PopupMenuWidget from "../../uiWidgets/popupMenuWidget.js";
import Lineage_sources from "../lineage/lineage_sources.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";



import KGcreator_graph from "./KGcreator_graph.js";
import KGcreator_mappings  from "./KGcreator_mappings.js";
import KGcreator_run   from "./KGcreator_run.js"
import KGcreator_joinTables from "./KGcreator_joinTables.js";



var KGcreator = (function () {
    var self = {};
    self.currentConfig = {};
    self.currentSlsvSource = {};
    self.allTriplesMappings = {};
    var mappingsDir = "mappings";
    // mappingsDir=  "CSV"

  self.displayUploadApp = function () {
    $.getScript("/kg_upload_app.js");
  };



  self.onLoaded = function () {
    $("#actionDivContolPanelDiv").load("./modules/tools/KGcreator/html/leftPanel.html", function () {
   //   self.loadCsvDirs();
      self.showSourcesDialog(function (err, result) {
        if (err) {
          return alert(err.responseText);
        }
        $("#graphDiv").load("./modules/tools/KGcreator/html/centralPanel.html", function () {
          $("#KGcreator_centralPanelTabs").tabs({
            activate: function (e, ui) {
              var divId = ui.newPanel.selector;
              if (divId == "#KGcreator_resourceslinkingTab") {
                KGcreator_graph.drawOntologyModel(self.currentSlsvSource);
              }
            },
          });

          if (!authentication.currentUser.groupes.indexOf("admin") > -1) {
            $("#KGcreator_deleteKGcreatorTriplesBtn").css("display", "none");
          }
          MainController.UI.showHideRightPanel("hide");

        });
      });
    });
    $("#accordion").accordion("option", { active: 2 });
  };





  self.showSourcesDialog = function (callback) {
    var options = {
      withCheckboxes: false,
    };
    var selectTreeNodeFn = function () {
      self.currentSlsvSource =  SourceSelectorWidget.getSelectedSource()[0];
      $("#mainDialogDiv").dialog("close");
      if(!self.currentSlsvSource)
        return alert("select a source")
      self.initSource();
      //  self.initCentralPanel();
    };

    SourceSelectorWidget.initWidget(["OWL"], "mainDialogDiv", true, selectTreeNodeFn, null, options);
    if (callback) {
      callback();
    }
  };


self.initSource=function(){
  $("#KGcreator_centralPanelTabs").tabs({
    activate: function (e, ui) {
      var divId = ui.newPanel.selector;
      if (divId == "#KGcreator_resourceslinkingTab") {
        //  KGcreator.drawOntologyModel(self.currentSlsvSource);
      }
    },
  });

  self.initSlsvSourceConfig(self.currentSlsvSource, function(err, result){
    if( err)
      return alert(err)
    KGcreator_graph.drawOntologyModel(self.currentSlsvSource);
  })
  $("#KGcreator_resourceLinkRightPanel").load("./modules/tools/KGcreator/html/graphControlPanel.html", function () {});


}






    self.getSlsvSourceConfig = function (source, callback) {

        var payload = {
            dir: mappingsDir + "/" + source,
            name: "main.json",
        };
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/data/file",
            data: payload,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                return callback(null, JSON.parse(result));
            },
            error: function (err) {
                //    callback(err);
                var newJson = {
                    graphUri: Config.sources[self.currentSlsvSource].graphUri,
                    prefixes: {},
                    databaseSources: {},
                    csvSources: {},
                };
                return callback(null, newJson);
            },
        });
    };

    self.initSlsvSourceConfig = function (source, callback) {
        self.getSlsvSourceConfig(source, function (err, result) {
            if (err) {
                return callback(err);
            }
            self.currentConfig = result;
            self.rawConfig = JSON.parse(JSON.stringify(result));

            var jstreeData = [];
            var options = {
                openAll: true,
                selectTreeNodeFn: function (event, obj) {
                    self.currentTreeNode = obj.node;
                    KGcreator.currentTreeNode = obj.node;

                    if (obj.node.data.type == "databaseSource") {
                        KGcreator.loadDataBaseSource(self.currentSlsvSource, obj.node.data.sqlType, obj.node.id);
                    } else if (obj.node.data.type == "databaseSource") {
                        KGcreator.loadDataSource(self.currentSlsvSource, "csvSource", obj.node.id);
                    } else if (obj.node.data.type == "table") {
                        var mappingObj = self.currentConfig.currentMappings[obj.node.data.id];

                        self.loadMappingsInJsonEditor(mappingObj, obj.node.data.id);
                        var columns = self.currentConfig.databaseSources[self.currentConfig.currentDataSource].tables[obj.node.data.id];
                        var table = obj.node.data.id;
                        self.showTablesColumnTree(table, columns);
                    } else if (obj.node.data.type == "csvFile") {
                        var mappingObj = self.currentConfig.currentMappings[obj.node.data.id];
                        self.loadMappingsInJsonEditor(mappingObj, obj.node.data.id);
                        self.showCsvColumnTree(obj.node.id);
                    } else if (obj.node.data.type == "tableColumn") {
                    } else if (obj.node.data.type == "csvFileColumn") {
                    }
                },

                contextMenu: function (node, x) {
                    var items = {};
                    if (node.id == "databaseSources") {
                        items.addDatabaseSource = {
                            label: "addDatabaseSources",
                            action: function (_e) {
                                KGcreator.createDataBaseSourceMappings();
                            },
                        };
                        return items;
                    } else if (node.id == "csvSources") {
                        items.csvSources = {
                            label: "addCsvSources",
                            action: function (_e) {
                                // pb avec source
                                KGcreator.createCsvSourceMappings();
                            },
                        };
                        return items;
                    } else if (node.data.type == "table") {
                        items.mapRow = {
                            label: "mapRow",
                            action: function (_e) {
                                // pb avec source
                                KGcreator.mapColumn.showMappingDialog();
                            },
                        };

                        items.showSampleData = {
                            label: "showSampleData",
                            action: function (_e) {
                                // pb avec source
                                KGcreator.showSampleData(node, true, 200);
                            },
                        };
                        items.removeTableMappings = {
                            label: "removeTableMappings",
                            action: function (_e) {
                                // pb avec source
                                KGcreator.removeTableMappings(node);
                            },
                        };
                        return items;
                    } else if (node.data.type == "tableColumn") {
                        var KGcreatorTab = $("#KGcreator_centralPanelTabs").tabs("option", "active");

                        if (KGcreatorTab == 1) {
                            return (items = KGcreator.getContextMenu());
                        }

                        items.mapColumn = {
                            label: "map Column",
                            action: function (_e) {
                                // pb avec source
                                KGcreator.mapColumn.showMappingDialog();
                            },
                        };

                        items.showSampleData = {
                            label: "showSampleData",
                            action: function (_e) {
                                // pb avec source
                                KGcreator.showSampleData(node, false, 200);
                            },
                        };
                        items.removeColumnMappings = {
                            label: "removeColumnMappings",
                            action: function (_e) {
                                // pb avec source
                                KGcreator.removeColumnMappings(node);
                            },
                        };
                        return items;
                    } else if (node.data.type == "csvFile") {
                        items = KGcreator.getContextMenu();
                        items.showSampleData = {
                            label: "showSampleData",
                            action: function (_e) {
                                // pb avec source
                                KGcreator.showSampleData(node, true, 200);
                            },
                        };
                        items.removeTableMappings = {
                            label: "removeTableMappings",
                            action: function (_e) {
                                // pb avec source
                                KGcreator.removeTableMappings(node);
                            },
                        };
                        return items;
                    }

                    return items;
                },

                // show_contextmenu: KGcreator.getContextMenu()
                //  withCheckboxes: true,
            };

            jstreeData.push({
                id: "databaseSources",
                text: "databaseSources",
                parent: "#",
                data: {
                    type: "sourceType",
                },
            });
            jstreeData.push({
                id: "csvSources",
                text: "csvSources",
                parent: "#",
                data: {
                    type: "sourceType",
                },
            });

            for (var datasource in self.currentConfig.databaseSources) {
              var sqlType=self.currentConfig.databaseSources[datasource].type

                jstreeData.push({
                    id: datasource,
                    text: datasource,
                    parent: "databaseSources",
                    data: { id: datasource,type:"databaseSource",sqlType: sqlType}
                });

            }
            for (var datasource in self.currentConfig.csvSources) {

                jstreeData.push({
                    id: datasource,
                    text: datasource,
                    parent: "csvSources",
                    data: { id: datasource, type: "csvFile" },
                });
            }
            JstreeWidget.loadJsTree("KGcreator_csvTreeDiv", jstreeData, options);
            if (callback) {
                return callback();
            }
        });
    };

    self.saveSlsvSourceConfig = function (source, data, callback) {
        var payload = {
            dir: mappingsDir + "/" + source,
            fileName: "main.json",
            data: JSON.stringify(data, null, 2),
        };
        $.ajax({
            type: "POST",
            url: Config.apiUrl + "/data/file",
            data: payload,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                MainController.UI.message(mappingsDir + "/" + source + "config saved");
            },
            error: function (err) {
                callback(err);
            },
        });
    };

    self.updateDataSourceTripleModels = function (table, triples, save) {
        if (!table) {
            table = self.currentTreeNode.data.table;
        }
        self.currentConfig.currentMappings[table].tripleModels = self.currentConfig.currentMappings[table].tripleModels.concat(triples);
        if (save) {
            self.saveDataSourceMappings();
        }
    };

    self.saveDataSourceMappings = function (source, datasource, data, callback) {
        if (!source) {
            (source = self.currentSlsvSource), self.currentConfig.currentDataSource, self.currentConfig.currentMappings;
        }
        if (!datasource) {
            datasource = self.currentConfig.currentDataSource;
        }
        if (!data) {
            data = self.currentConfig.currentMappings;
        }

        var payload = {
            dir: mappingsDir + "/" + source,
            fileName: datasource + ".json",
            data: JSON.stringify(data, null, 2),
        };
        $.ajax({
            type: "POST",
            url: Config.apiUrl + "/data/file",
            data: payload,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                MainController.UI.message(mappingsDir + "/" + source + "config saved");
            },
            error: function (err) {
                alert(err);
            },
        });
    };

  self.loadDataBaseSource = function (slsvSource, dataSource,sqlType) {
    self.currentConfig.currentDataSource = dataSource;
    self.currentConfig.databaseSources[dataSource].dataSource = dataSource;
    self.currentConfig.databaseSources[dataSource].tables = [];


    async.series(
      [
        function (callbackSeries) {
          KGcreator.listDatabaseTables(dataSource, sqlType,function (err, tables) {
            if (err) {
              return callbackSeries();
            }
            self.currentConfig.databaseSources[dataSource].tables = tables;
            callbackSeries();
          });
        },
        function (callbackSeries) {
          self.loadSourceMappings(slsvSource,dataSource, function (err, mappings) {
            if (err) {
              return callbackSeries();
            }
            self.currentConfig.currentMappings = mappings;
            callbackSeries();
          });
        },
        function (callbackSeries) {
            self.showTablesTree(self.currentConfig.databaseSources[dataSource]);
          callbackSeries();
        }
      ],
      function (err) {
        if (err) {
          return alert(err);
        }
      }
    );
  };

    self.loadCsvFile = function (slsvSource, fileName) {
        self.currentConfig.currentDataSource = dataSource;
        self.currentConfig.databaseSources[dataSource].dataSource = dataSource;
        self.currentConfig.databaseSources[dataSource].tables = [];


        async.series(
            [


                function (callbackSeries) {

                    KGcreator.listFiles(slsvSource, function (err, files) {
                        if (err) {
                            return callbackSeries();
                        }
                        self.currentConfig.csvSources.files = files;
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    self.loadSourceMappings(slsvSource, self.currentConfig.currentDataSource, function (err, mappings) {
                        if (err) {
                            return callbackSeries();
                        }
                        self.currentConfig.currentMappings = mappings;

                        //  self.currentConfig.databaseSources[dataSource].mappings = mappings;
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    if (self.currentConfig.databaseSources[dataSource]) {
                        self.showTablesTree(self.currentConfig.databaseSources[dataSource]);
                    } else if (self.currentConfig.csvSources[dataSource]) {
                        self.showTablesTree(self.currentConfig.csvSources[dataSource]);
                    }
                    callbackSeries();
                },
            ],
            function (err) {
                if (err) {
                    return alert(err);
                }
            }
        );
    };





    self.showTablesTree = function (datasourceConfig) {
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
                    id: table,
                    label: table,
                    type: "table",
                },
            });
        }
        JstreeWidget.addNodesToJstree("KGcreator_csvTreeDiv", datasourceConfig.dataSource, jstreeData);
    };

    self.showCsvFilesTree = function (datasourceConfig) {
      const payload = {
        dir: "CSV/" + self.currentCsvDir,
        name: obj.node.id,
        options: JSON.stringify({ lines: 100 }),
      };

      $.ajax({
        type: "GET",
        url: `${Config.apiUrl}/data/csv`,
        dataType: "json",
        data: payload,
        success: function (result, _textStatus, _jqXHR) {
          var jstreeData = [];

          result.headers.forEach(function (col) {
            jstreeData.push({
              id: obj.node.id + "_" + col,
              text: col,
              parent: obj.node.id,
              data: { id: col, sample: result.data[0] },
            });
          });
          JstreeWidget.addNodesToJstree("KGcreator_csvTreeDiv", "csvSources", jstreeData);
        },
        error: function (err) {
          // alert(err.responseText);
        },
      });



    };
    self.showTablesColumnTree = function (table, tableColumns) {
        var jstreeData = [];

        var columnMappings = self.getColumnsMappings(table, null, "s");

        tableColumns.forEach(function (column) {
            var label = column;

            if (columnMappings[column]) {
                label = "<span class='KGcreator_fileWithMappings'>" + column + "</span>";
            }

            jstreeData.push({
                id: table + "_" + column,
                text: label,
                parent: table,
                data: { id: column, table: table, label: column, type: "tableColumn" },
            });
        });

        JstreeWidget.addNodesToJstree("KGcreator_csvTreeDiv", table, jstreeData);
       KGcreator_graph.graphColumnToClassPredicates([table]);
    };
    self.showCsvColumnTree = function (table, datasourceConfig) {
        var jstreeData = [];
        //KGcreator.
        for (var table in datasourceConfig.tables) {
            var label = table;
            if (self.currentConfig.currentMappings[self.currentConfig.currentDataSource + "_" + table + ".json"]) {
                label = "<span class='KGcreator_fileWithMappings'>" + table + "</span>";
            }

            var columns = datasourceConfig.tables[table];
            columns.forEach(function (column) {
                jstreeData.push({
                    id: table + "_" + column,
                    text: column,
                    parent: table,
                    data: { id: column, table: table, label: column, type: "csvFileColumn" },
                });
            });
        }

        JstreeWidget.addNodesToJstree("KGcreator_csvTreeDiv", table, jstreeData);
    };

    self.removeColumnMappings = function (node) {
        if (!confirm(" remove mappings for column " + node.text)) {
            return;
        }

        var tableTriples = self.currentConfig.currentMappings[node.data.table].tripleModels;
        tableTriples.forEach(function (triple, index) {
            if (triple.s == node.data.id) {
                tableTriples.splice(index, 1);
                JstreeWidget.setSelectedNodeStyle({ color: "black" });
                KGcreator_mappings.deleteColumnNode(node);
            }
        });

        self.saveDataSourceMappings();
    };

    self.removeTableMappings = function (node) {
        if (!confirm(" remove mappings for table " + node.text)) {
            return;
        }
        delete self.currentConfig.currentMappings[node.data.id];
        JstreeWidget.setSelectedNodeStyle({ color: "black" });
      KGcreator_mappings.deleteTableNodes(node);
        self.saveDataSourceMappings();
    };

    self.getMappingsList = function (source, callback) {
        var payload = {
            dir: mappingsDir + "/" + source,
        };

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/data/files",
            data: payload,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                self.mappingFiles = {};
                if (result == null) {
                    return callback();
                }
                var mappingFiles = [];
                result.forEach(function (file) {
                    if (file != "main.json" && file.indexOf(".json" > -1)) {
                        mappingFiles.push(file);
                    }
                });
                callback(null, mappingFiles);
            },
            error: function (err) {
                callback(err);
            },
        });
    };

    self.loadMappingsInJsonEditor = function (mappingObj, table) {
        if (!mappingObj) {
            mappingObj = {
                tripleModels: [],
                transform: {},
                lookups: [],
                prefixes: {},
            };
            self.currentConfig.currentMappings[table] = mappingObj;
        }

        KGcreator.currentJsonObject = mappingObj;
        KGcreator.mainJsonEditor.load(mappingObj);
        KGcreator.setUpperOntologyPrefix();

        KGcreator.mainJsonEditorModified = false;

        if (!KGcreator.currentJsonObject.graphUri) {
            KGcreator.currentJsonObject.graphUri = KGcreator.currentGraphUri || "";
        } else {
            KGcreator.currentGraphUri = KGcreator.currentJsonObject.graphUri;
        }
    };

    self.getIndividualMapping = function (source, className) {
        self.loadSourceMappings(source, self.currentConfig.currentDataSource, function (err, allTripleMappings) {
            if (err) {
                return callback(err);
            }

            var table = null;
            var column = null;
            for (var fileName in allTripleMappings) {
                var tripleModels = allTripleMappings[fileName].tripleModels;
                var databaseSource = allTripleMappings[fileName].databaseSource;

                tripleModels.forEach(function (triple) {
                    if (triple.p == "rdf:type" && triple.o == className) {
                        table = fileName;
                        column = triple.s;
                        return { databaseSource: databaseSource, table: table, column: column };
                    }
                });
            }
        });
    };
    self.getIndividualRecord = function (source, className, uri, callback) {
        var mapping = self.getIndividualMapping(source, className);

        var sql = "select * from " + mapping.table + "where " + mapping.column + " = '" + uri + "'";
    };



    self.getClass2ColumnMapping = function (mappings, classUri) {
        var matches = [];
        for (var table in mappings) {
            mappings[table].tripleModels.forEach(function (triple) {
                if (triple.p == "rdf:type" && triple.o == classUri) {
                    matches.push({ table: table, column: triple.s.replace("$_", "") });
                }
            });
        }

        return matches;
    };

    self.loadSourceMappings = function (slsvSource, dataSource, callback) {
        var payload = {
            dir: mappingsDir + "/" + slsvSource,
            name: dataSource + ".json",
        };

        $.ajax({
            type: "GET",
            url: `${Config.apiUrl}/data/file`,
            data: payload,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                callback(null, JSON.parse(result));
            },
            error(err) {
                return callback(null, {});
            },
        });
    };

    self.getColumnsMappings = function (table, column, role) {
        var columnTriples = {};
        if (!self.currentConfig.currentMappings[table]) {
            return columnTriples;
        }

        self.currentConfig.currentMappings[table].tripleModels.forEach(function (triple) {
            if ((column && triple[role] == column) || !column) {
                if (!columnTriples[triple[role]]) {
                    columnTriples[triple[role]] = [];
                }
                columnTriples[triple[role]].push(triple);
            }
        });
        return columnTriples;
    };

    self.createDataBaseSourceMappings = function () {
        var name = prompt("DBname");
        if (!name) {
            return;
        }
        self.currentConfig.databaseSources[name] = {
            type: "sql.sqlserver",
            connection: "_default",
            tableJoins: [],
        };

        self.saveSlsvSourceConfig(self.currentSlsvSource, self.currentConfig, function (err, result) {
            if (err) {
                return alert(err);
            }
            MainController.UI.message("source " + name + " saved");
        });
    };

    self.createCsvSourceMappings = function () {
        var name = prompt("fileName");
        if (!name) {
            return;
        }
    };



  self.listDatabaseTables = function (databaseSource,type, callback) {
  

    const params = new URLSearchParams({
      name: databaseSource,
      type: type,
    });

    $.ajax({
      type: "GET",
      url: Config.apiUrl + "/kg/model?" + params.toString(),
      dataType: "json",
      success: function (data, _textStatus, _jqXHR) {
        self.currentDataSourceModel = data;
        var tables = [];
        self.currentSource = self.currentDbName;
        self.currentdabase = { type: type, dbName: self.currentDbName };
        for (var key in data) {
          tables.push(key);
        }
          return callback(null, data);
       
      },
      error: function (_err) {
          return callback(err);
      },
    });
  };

  self.listFiles = function (currentCsvDir) {
    self.currentCsvDir = currentCsvDir ? currentCsvDir : $("#KGcreator_csvDirsSelect").val();
    var payload = {
      dir: "CSV/" + self.currentCsvDir,
    };
    $.ajax({
      type: "GET",
      url: Config.apiUrl + "/data/files",
      data: payload,
      dataType: "json",
      success: function (result, _textStatus, _jqXHR) {
        self.showTablesTree(result);
      },
      error: function (err) {
        alert(err.responseText);
      },
    });
  };


  self.migrateOldMappings = function (slsvSource) {
        if (!slsvSource) {
            slsvSource = self.currentSlsvSource;
        }
        var json = {};
        KGcreator.getAllTriplesMappingsOld(slsvSource, function (err, mappingObjects) {
            if (err) {
                return alert(err);
            }
            for (var key in mappingObjects) {
                var item = mappingObjects[key];

                var obj = {
                    tripleModels: item.tripleModels,
                    lookups: item.lookups,
                    transform: item.transform,
                    prefixes: item.prefixes,
                };
                json[item.fileName] = obj;
            }
            var x = json;
        });
    };
    return self;
})();

export default KGcreator;
window.KGcreator = KGcreator;
