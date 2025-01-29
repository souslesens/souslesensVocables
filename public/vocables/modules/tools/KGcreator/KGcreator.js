import Lineage_sources from "../lineage/lineage_sources.js";
import KGcreator_graph from "./KGcreator_graph.js";
import KGcreator_mappings from "./KGcreator_mappings.js";
import KGcreator_bot from "../../bots/KGcreator_bot.js";

// imports React app
import("/assets/kg_upload_app.js");

var KGcreator = (function () {
    var self = {};
    self.currentConfig = {};
    self.currentSlsvSource = {};
    self.allTriplesMappings = {};
    var mappingsDir = "mappings";
    self.currentTab = "";
    self.umountKGUploadApp = null;
    self.createApp = null;

    self.uploadFormData = {
        displayForm: "", // can be database, file or ""
        currentSource: "",
        selectedDatabase: "",
        selectedFiles: [],
    };

    self.displayUploadApp = function (displayForm) {
        self.uploadFormData.displayForm = displayForm;
        //   return   $.getScript("/kg_upload_app.js");
        if (!displayForm) {
            return;
        }
        var html = ' <div style="width:500px;height: 400px" id="mount-kg-upload-app-here"></div>';
        $("#smallDialogDiv").html(html);

        $("#smallDialogDiv").dialog({
            open: function (event, ui) {
                if (self.createApp === null) {
                    throw new Error("React app is not ready");
                }

                self.uploadFormData.currentSource = self.currentSlsvSource;

                self.umountKGUploadApp = self.createApp(self.uploadFormData);
            },
            beforeClose: function () {
                self.umountKGUploadApp();
                self.initSource();
            },
        });
        $("#smallDialogDiv").dialog("open");
    };

    self.onLoaded = function () {
        self.currentTab = "";

        UI.initMenuBar(self.loadSource);

        $("#Lineage_graphEditionButtons").show();
        $("#Lineage_graphEditionButtons").empty();
        $("#Lineage_graphEditionButtons").attr("id", "KGcreator_topButtons");
        //KGcreator_mappings.showMappingDialog=self.showMappingDialogResponsive;
    };
    self.unload = function () {
        self.currentTab = "";
        $("#KGcreator_topButtons").css("flex-direction", "row");
        $("#KGcreator_topButtons").attr("id", "Lineage_graphEditionButtons");
        $("#MenuBar").css("height", "90px");
        $("#KGcreator_topButtons").css("flex-direction", "row");
        $("#Lineage_graphEditionButtons").empty();
        $("#MenuBarFooter").css("display", "block");
    };
    self.loadSource = function () {
        Lineage_sources.loadSources(MainController.currentSource, function (err) {
            if (err) {
                return alert(err.responseText);
            }
            $("#graphDiv").load("./modules/tools/KGcreator/html/centralPanel.html", function () {
                $("#lateralPanelDiv").load("./modules/tools/KGcreator/html/leftPanel.html", function () {
                    self.currentSlsvSource = MainController.currentSource;
                    UI.openTab("lineage-tab", "KGcreator_source_tab", KGcreator.initLinkTab, "#MapButton");
                    self.initSource();
                    UI.resetWindowHeight();
                    $("#KGcreator_dialogDiv").dialog({
                        autoOpen: false,
                    });
                });
            });
        });
    };

    self.initSource = function () {
        $("#KGcreator_centralPanelTabs").tabs({
            activate: function (e, ui) {
                var divId = ui.newPanel.selector;
                if (divId == "#KGcreator_resourceslinkingTab") {
                    //  KGcreator.drawOntologyModel(self.currentSlsvSource);
                }
            },
        });

        self.initSlsvSourceConfig(self.currentSlsvSource, function (err, result) {
            if (err) {
                return alert(err);
            }
            //  KGcreator_graph.drawOntologyModel(self.currentSlsvSource);
        });
    };

    self.getSlsvSourceConfig = function (source, callback) {
        var payload = {
            dir: mappingsDir + "/" + source,
            fileName: "main.json",
        };
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/data/file",
            data: payload,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                var json;
                try {
                    json = JSON.parse(result);
                } catch (e) {
                    return callback(e);
                }
                return callback(null, json);
            },
            error: function (err) {
                self.initNewSlsvSource(source, function (err, json) {
                    return callback(null, json);
                });
            },
        });
    };

    // create dir and main.json
    self.initNewSlsvSource = function (source, callback) {
        var newJson = {
            sparqlServerUrl: Config.sources[self.currentSlsvSource].sparql_server.url,
            graphUri: Config.sources[self.currentSlsvSource].graphUri,
            prefixes: {},
            lookups: {},
            databaseSources: {},
            csvSources: {},
        };

        var payload = {
            dir: mappingsDir,
            newDirName: source,
        };
        $.ajax({
            type: "POST",
            url: Config.apiUrl + "/data/dir",
            data: payload,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                KGcreator.rawConfig = newJson;
                return callback(null, newJson);
            },
            error: function (err) {
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

            var options = {
                openAll: true,
                selectTreeNodeFn: function (event, obj) {
                    self.currentTreeNode = obj.node;

                    //  KGcreator_run.getTableAndShowMappings();

                    if (obj.node.data.type == "databaseSource") {
                        /*    self.currentConfig.currentDataSource = {
                            name: obj.node.id,
                            tables: [],
                            type: "databaseSource",
                            sqlType: obj.node.data.sqlType,
                            currentTable: obj.node.data.table,
                        };*/
                        self.initDataSource(obj.node.id, "databaseSource", obj.node.data.sqlType, obj.node.data.table);

                        KGcreator.loadDataBaseSource(self.currentSlsvSource, obj.node.id, obj.node.data.sqlType);
                    } else if (obj.node.data.type == "csvSource") {
                        self.initDataSource(obj.node.id, "csvSource", obj.node.data.sqlType, obj.node.id);
                        KGcreator.loadCsvSource(self.currentSlsvSource, obj.node.id, true, function (err, result) {
                            if (err) {
                                return alert("file not found");
                            }
                            KGcreator_mappings.showTableMappings(obj.node.id);
                        });
                    } else if (obj.node.data.type == "table") {
                        var columns = self.currentConfig.currentDataSource.tables[obj.node.data.id];
                        var table = obj.node.data.id;
                        self.currentConfig.currentDataSource.currentTable = table;
                        self.showTablesColumnTree(table, columns);
                        self.showTableVirtualColumnsTree(table);
                        KGcreator_mappings.showTableMappings(obj.node.id);
                    } else if (obj.node.data.type == "tableColumn") {
                        KGcreator_bot.start(obj.node);
                    } else if (obj.node.data.type == "csvFileColumn") {
                    }
                },

                contextMenu: function (node, x) {
                    var items = {};
                    if (node.id == "databaseSources") {
                        items.addDatabaseSource = {
                            label: "addDatabaseSources",
                            action: function (_e) {
                                self.displayUploadApp("database");
                                // KGcreator.createDataBaseSourceMappings();
                            },
                        };
                        return items;
                    } else if (node.id == "csvSources") {
                        items.csvSources = {
                            label: "add Csv Sources",
                            action: function (_e) {
                                // pb avec source
                                self.displayUploadApp("file");
                                // KGcreator.createCsvSourceMappings();
                            },
                        };
                        return items;
                    } else if (node.data.type == "databaseSource") {
                        items.showDataSourceMappings = {
                            label: "show data source Mappings",
                            action: function (_e) {
                                // pb avec source
                                KGcreator_mappings.showDataSourceMappings(node);
                            },
                        };
                        items.drawOntolologyModel = {
                            label: "draw Ontolology and mappings",
                            action: function (_e) {
                                // pb avec source
                                KGcreator_graph.drawOntologyModel(self.currentSlsvSource);
                            },
                        };

                        return items;
                    } else if (node.data.type == "table") {
                        /*  items.showTableMappings = {
                              label: "showTableMappings",
                              action: function (_e) {
                                  // pb avec source
                                  KGcreator_mappings.showTableMappings(node);
                              },
                          };*/
                        items.mappingBot = {
                            label: "add virtual column",
                            action: function (_e) {
                                // pb avec source
                                KGcreator_bot.start(node);
                            },
                        };
                        /*   items.mapColumn = {
                               label: "map Rows",
                               action: function (_e) {
                                   // pb avec source
                                   KGcreator_mappings.showMappingDialog(null, { rowIndex: 1 });
                               },
                           };*/

                        items.transforms = {
                            label: "edit transforms",
                            action: function (_e) {
                                // pb avec source
                                KGcreator_mappings.showTransformDialog(node);
                            },
                        };

                        items.showSampleData = {
                            label: "show sample data",
                            action: function (_e) {
                                // pb avec source
                                KGcreator.showSampleData(node, null, 200);
                            },
                        };
                        items.removeTableMappings = {
                            label: "remove table Mappings",
                            action: function (_e) {
                                // pb avec source
                                KGcreator.removeTableMappings(node);
                            },
                        };

                        return items;
                    } else if (node.data.type == "tableColumn") {
                        var KGcreatorTab = $("#KGcreator_centralPanelTabs").tabs("option", "active");

                        //   return (items = KGcreator.getContextMenu());

                        items.mappingBot = {
                            label: "map column",
                            action: function (_e) {
                                // pb avec source
                                KGcreator_bot.start(node);
                            },
                        };

                        items.mapColumn = {
                            label: "map column advanced",
                            action: function (_e) {
                                // pb avec source
                                KGcreator_mappings.showMappingDialog();
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
                    } else if (node.data.type == "csvSource") {
                        /*  items.showTableMappings = {
                              label: "show table mappings",
                              action: function (_e) {
                                  // pb avec source
                                  KGcreator_mappings.showTableMappings(node);
                              },
                          };*/
                        items.mappingBot = {
                            label: "add virtual column",
                            action: function (_e) {
                                // pb avec source
                                KGcreator_bot.start(node);
                            },
                        };
                        /*  items.mapColumn = {
                              label: "map Rows",
                              action: function (_e) {
                                  // pb avec source
                                  KGcreator_mappings.showMappingDialog(null, { rowIndex: 1 });
                              },
                          };*/
                        items.lookups = {
                            label: "lookups",
                            action: function (_e) {
                                // pb avec source
                                KGcreator_mappings.showLookupsDialog(node);
                            },
                        };
                        items.tranforms = {
                            label: "edit tranforms",
                            action: function (_e) {
                                // pb avec source
                                KGcreator_mappings.showTransformDialog(node);
                            },
                        };
                        // Table == Fichier pour les CSV donc on met le delete ici
                        items.deleteCsvFile = {
                            label: "delete file",
                            action: function (_e) {
                                // pb avec source
                                KGcreator.deleteCsvFile(node);
                            },
                        };

                        items.showSampleData = {
                            label: "show sample Data",
                            action: function (_e) {
                                // pb avec source
                                KGcreator.showSampleData(node, null, 200);
                            },
                        };
                        items.removeTableMappings = {
                            label: "remove table mappings",
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

            self.loadDataSourcesJstree("KGcreator_csvTreeDiv", options, callback);
        });
    };

    self.loadDataSourcesJstree = function (jstreeDivId, options, callback) {
        self.dataSourcejstreeDivId = jstreeDivId;
        var jstreeData = [];
        jstreeData.push({
            id: "databaseSources",
            text: "databaseSources",
            parent: "#",
            type: "databaseSources",
            data: {
                type: "sourceType",
            },
        });
        jstreeData.push({
            id: "csvSources",
            text: "csvSources",
            parent: "#",
            type: "CSVS",
            data: {
                type: "sourceType",
            },
        });
        // Get SQL types when there is with api route
        async.eachSeries(
            Object.entries(self.currentConfig.databaseSources),
            function (item, callbackEach) {
                var key = item[0];
                var datasource = item[1];
                $.ajax({
                    type: "GET",
                    url: Config.apiUrl + "/databases/" + key,
                    dataType: "json",
                    success: function (result, _textStatus, _jqXHR) {
                        jstreeData.push({
                            id: key,
                            text: datasource.name || key,
                            parent: "databaseSources",
                            data: { id: datasource.name, type: "databaseSource", sqlType: result.driver },
                        });
                        return callbackEach();
                    },
                    error: function (err) {
                        jstreeData.push({
                            id: key,
                            text: datasource.name || key,
                            parent: "databaseSources",
                            data: { id: datasource.name, type: "databaseSource" },
                        });
                        return callbackEach();
                    },
                });
            },
            function (err) {
                for (var datasource in self.currentConfig.csvSources) {
                    jstreeData.push({
                        id: datasource,
                        text: datasource,
                        parent: "csvSources",
                        type: "CSV",
                        data: { id: datasource, type: "csvSource" },
                    });
                }
                JstreeWidget.loadJsTree(jstreeDivId, jstreeData, options);
                if (callback) {
                    return callback(err, self.currentConfig);
                }
            },
        );
    };

    self.initDataSource = function (name, type, sqlType, table) {
        //close Previous DataSource
        var parent_node = $("#" + self.dataSourcejstreeDivId).jstree()._model.data[self.currentConfig?.currentDataSource?.name];
        if (parent_node) {
            $("#" + self.dataSourcejstreeDivId)
                .jstree(true)
                .delete_node(parent_node.children);
        }
        self.currentConfig.currentDataSource = {
            name: name, //obj.node.id,
            tables: [],
            type: type, //"databaseSource",
            sqlType: sqlType, // obj.node.data.sqlType,
            currentTable: table, // obj.node.data.table,
        };
    };
    self.saveSlsvSourceConfig = function (callback) {
        var data = KGcreator.rawConfig;
        var source = self.currentSlsvSource;

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
                UI.message(mappingsDir + "/" + source + "config saved");
                callback();
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
            source = self.currentSlsvSource;
        }
        if (!datasource) {
            datasource = self.currentConfig.currentDataSource.name;
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
                UI.message(mappingsDir + "/" + source + "config saved");
                if (callback) {
                    return callback();
                }
            },
            error: function (err) {
                if (callback) {
                    return callback(err);
                }
                alert(err);
            },
        });
    };

    self.loadDataBaseSource = function (slsvSource, dataSource, sqlType, callback) {
        fetch(`${Config.apiUrl}/databases/${dataSource}`).then((response) => {
            response.json().then((data) => {
                async.series(
                    [
                        function (callbackSeries) {
                            KGcreator.listDatabaseTables(data.id, data.driver, function (err, tables) {
                                if (err) {
                                    return callbackSeries();
                                }
                                self.currentConfig.currentDataSource.tables = tables;
                                callbackSeries();
                            });
                        },

                        function (callbackSeries) {
                            self.loadDataSourceMappings(slsvSource, dataSource, function (err, mappings) {
                                if (err) {
                                    return callbackSeries();
                                }
                                self.currentConfig.currentMappings = mappings;
                                callbackSeries();
                            });
                        },

                        function (callbackSeries) {
                            self.showTablesTree(self.currentConfig.currentDataSource);
                            callbackSeries();
                        },

                        function (callbackSeries) {
                            KGcreator_mappings.showDataSourceMappings(null);
                            callbackSeries();
                        },
                    ],
                    function (err) {
                        if (err) {
                            return alert(err);
                        }
                        if (callback) {
                            callback();
                        }
                    },
                );
            });
        });
    };

    self.loadCsvSource = function (slsvSource, fileName, loadJstree, callback) {
        var columns = [];
        var jstreeData = [];
        async.series(
            [
                function (callbackSeries) {
                    var payload = {
                        fileName: fileName,
                        dir: "CSV/" + slsvSource,
                        lines: 100,
                    };
                    $.ajax({
                        type: "GET",
                        url: Config.apiUrl + "/data/csv",
                        data: payload,
                        dataType: "json",
                        success: function (result, _textStatus, _jqXHR) {
                            columns = result.headers;
                            var tableObj = { [fileName]: columns };
                            self.currentConfig.currentDataSource.tables = tableObj;
                            self.currentConfig.currentDataSource.sampleData = result.data[0];
                            callbackSeries();
                        },
                        error: function (err) {
                            callbackSeries(err);
                        },
                    });
                },
                function (callbackSeries) {
                    self.loadDataSourceMappings(slsvSource, fileName, function (err, mappings) {
                        if (err) {
                            return callbackSeries();
                        }
                        self.currentConfig.currentMappings = mappings;

                        //  self.currentConfig.databaseSources[dataSource].mappings = mappings;
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    columns.forEach(function (column) {
                        var label = column;

                        var columnMappings = self.getColumnsMappings(fileName, null, "s");

                        if (columnMappings[column] || columnMappings[column + "_$"]) {
                            label = "<span class='KGcreator_fileWithMappings'>" + column + "</span>";
                        }

                        jstreeData.push({
                            id: fileName + "_" + column,
                            text: label,
                            type: "Column",
                            parent: fileName,
                            data: { id: column, table: fileName, label: column, type: "tableColumn" },
                        });
                    });

                    if (self.currentConfig.currentMappings && self.currentConfig.currentMappings[fileName] && self.currentConfig.currentMappings[fileName].virtualColumns) {
                        self.currentConfig.currentMappings[fileName].virtualColumns.forEach(function (virtualColumn) {
                            var label = "<span class='KGcreator_virtualColumn'>" + virtualColumn + "</span>";
                            jstreeData.push({
                                id: fileName + "_" + virtualColumn,
                                text: label,
                                type: "Column",
                                parent: fileName,
                                data: { id: virtualColumn, table: fileName, label: virtualColumn, type: "tableColumn" },
                            });
                        });
                    }
                    if (loadJstree) {
                        JstreeWidget.addNodesToJstree(self.dataSourcejstreeDivId, fileName, jstreeData);
                        KGcreator_graph.graphColumnToClassPredicates([fileName]);
                    }
                    callbackSeries();
                },

                function (callbackSeries) {
                    if (loadJstree) {
                        self.showTableVirtualColumnsTree(fileName);
                    }
                    callbackSeries();
                },
                function (callbackSeries) {
                    callbackSeries();
                },
            ],
            function (err) {
                if (err) {
                    if (callback) {
                        return callback(err);
                    }
                    return alert(err);
                }
                if (callback) {
                    return callback(null, jstreeData);
                }
            },
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
                type: "Table",
                parent: datasourceConfig.dataSource,
                data: {
                    id: table,
                    label: table,
                    type: "table",
                },
            });
        }
        JstreeWidget.addNodesToJstree(self.dataSourcejstreeDivId, datasourceConfig.name, jstreeData);
    };

    self.showTablesColumnTree = function (table, tableColumns) {
        var jstreeData = [];

        var columnMappings = self.getColumnsMappings(table, null, "s");
        tableColumns.sort();
        tableColumns.forEach(function (column) {
            var label = column;

            if (columnMappings[column]) {
                label = "<span class='KGcreator_fileWithMappings'>" + column + "</span>";
            }
            jstreeData.push({
                id: table + "_" + column,
                text: label,
                parent: table,
                type: "Column",
                data: { id: column, table: table, label: column, type: "tableColumn" },
            });
        });

        JstreeWidget.addNodesToJstree(self.dataSourcejstreeDivId, table, jstreeData);
        KGcreator_graph.graphColumnToClassPredicates([table]);
    };

    self.showTableVirtualColumnsTree = function (table) {
        if (!table) {
            return alert("no table selected");
        }
        if (!self.currentConfig.currentMappings || !self.currentConfig.currentMappings[table] || !self.currentConfig.currentMappings[table].virtualColumns) {
            return;
        }
        var jstreeData = [];
        self.currentConfig.currentMappings[table].virtualColumns.forEach(function (virtualColumn) {
            var label = "<span class='KGcreator_virtualColumn'>" + virtualColumn + "</span>";
            jstreeData.push({
                id: table + "_" + virtualColumn,
                type: "Column",
                text: label,
                parent: table,
                data: { id: virtualColumn, table: table, label: virtualColumn, type: "tableColumn" },
            });
        });
        JstreeWidget.addNodesToJstree(self.dataSourcejstreeDivId, table, jstreeData);
        KGcreator_graph.graphColumnToClassPredicates([table]);
    };

    self.removeColumnMappings = function (node) {
        if (!confirm(" remove mappings for column " + node.text)) {
            return;
        }

        var tableTriples = self.currentConfig.currentMappings[node.data.table].tripleModels;
        var tableTriplesCopy = JSON.parse(JSON.stringify(tableTriples));
        tableTriples.forEach(function (triple, index) {
            if (triple.s.replace("_$", "") == node.data.id) {
                tableTriplesCopy = tableTriplesCopy.filter((element) => JSON.stringify(element) != JSON.stringify(triple));
                JstreeWidget.setSelectedNodeStyle({ color: "black" });
                KGcreator_graph.deleteColumnNode(node);
            }
        });
        self.currentConfig.currentMappings[node.data.table].tripleModels = tableTriplesCopy;

        var virtualColumns = self.currentConfig.currentMappings[node.data.table].virtualColumns;

        var index = virtualColumns.indexOf(node.data.id);
        if (index > -1) {
            virtualColumns.splice(index, 1);
        }

        self.saveDataSourceMappings();
    };

    self.removeTableMappings = function (node) {
        if (!confirm(" remove mappings for table " + node.text)) {
            return;
        }
        delete self.currentConfig.currentMappings[node.data.id];
        JstreeWidget.setSelectedNodeStyle({ color: "black" });
        //KGcreator_mappings.KGcreator_graph(node);
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

    self.getIndividualMapping = function (source, className) {
        self.loadDataSourceMappings(source, self.currentConfig.currentDataSource, function (err, allTripleMappings) {
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

    self.loadDataSourceMappings = function (slsvSource, dataSource, callback) {
        var payload = {
            dir: mappingsDir + "/" + slsvSource,
            fileName: dataSource + ".json",
        };

        $.ajax({
            type: "GET",
            url: `${Config.apiUrl}/data/file`,
            data: payload,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                var json;
                try {
                    json = JSON.parse(result);
                } catch (e) {
                    return callback(e);
                }
                callback(null, json);
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
            if ((column && triple[role].replace("_$", "") == column.replace("_$", "")) || !column) {
                if (!columnTriples[triple[role]]) {
                    columnTriples[triple[role]] = [];
                }
                columnTriples[triple[role]].push(triple);
            }
        });

        return columnTriples;
    };

    self.getColumnClass = function (table, column) {
        var classId = null;
        self.currentConfig.currentMappings[table].tripleModels.forEach(function (triple) {
            if (triple.s == column && triple.p == "rdf:type" && triple.o.indexOf("http") == 0) classId = triple.o;
        });
        return classId;
    };

    self.createDataBaseSourceMappings = function () {
        // hide uploadApp
        self.displayUploadApp("");
        $("#smallDialogDiv").dialog("close");

        var datasource = self.uploadFormData.selectedDatabase;
        if (!datasource) {
            return;
        }
        self.currentConfig.databaseSources[datasource.id] = { name: datasource.name };
        self.rawConfig.databaseSources[datasource.id] = { name: datasource.name };
        self.saveSlsvSourceConfig(function (err, result) {
            if (err) {
                return alert(err);
            }
            self.addDataSourceToJstree("databaseSource", datasource, "sql.sqlserver");
        });
    };

    self.createCsvSourceMappings = function () {
        // hide uploadApp
        self.displayUploadApp("");
        $("#smallDialogDiv").dialog("close");
        var datasourceName = self.uploadFormData.selectedFiles[0];
        if (!datasourceName) {
            return;
        }

        self.currentConfig.csvSources[datasourceName] = {};
        self.rawConfig.csvSources[datasourceName] = {};

        self.saveSlsvSourceConfig(function (err, result) {
            if (err) {
                return alert(err);
            }
            self.addDataSourceToJstree("csvSource", datasourceName);
            self.initDataSource(datasourceName, "csvSource", "csv");
            self.loadCsvSource(self.currentSlsvSource, datasourceName, true, function (err, result) {
                if (err) {
                    return alert(err.responseText);
                }
            });
        });
    };

    self.addDataSourceToJstree = function (type, datasource, sqlType) {
        var jstreeData = [
            {
                id: datasource.id,
                text: datasource.name,
                parent: type + "s",
                data: { id: datasource.name, type: type },
            },
        ];

        JstreeWidget.addNodesToJstree(self.dataSourcejstreeDivId, type + "s", jstreeData);
    };

    self.listDatabaseTables = function (databaseSource, type, callback) {
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
                self.currentSource = self.currentDbName;
                self.currentdabase = { type: type, dbName: self.currentDbName };
                return callback(null, data);
            },
            error: function (err) {
                return callback(err);
            },
        });
    };

    self.showSampleData = function (node, columns, callback) {
        // alert("coming soon");
        if (!columns) {
            var hasColumn = false;
        } else {
            if (Array.isArray(columns) && columns.length > 0) {
                var hasColumn = true;
            } else {
                if (columns != "") {
                    var hasColumn = true;
                    columns = [columns];
                }
            }
        }
        function showTable(data) {
            var headers = [];
            var tableCols = [];
            data.forEach(function (item) {
                for (var key in item)
                    if (headers.indexOf(key) < 0) {
                        headers.push(key);
                        tableCols.push({ title: key, defaultContent: "", width: "15%" });
                    }
            });
            if (hasColumn) {
                tableCols = tableCols.filter(function (col) {
                    return columns.includes(col.title);
                });
            }

            var lines = [];
            data.forEach(function (item) {
                var line = [];
                headers.forEach(function (column) {
                    if (!hasColumn) {
                        line.push(item[column] || "");
                    } else {
                        if (columns.includes(column)) {
                            line.push(item[column] || "");
                        }
                    }
                });
                lines.push(line);
            });

            Export.showDataTable("smallDialogDiv", tableCols, lines);
            return;
        }

        if (self.currentConfig.currentDataSource.sampleData) {
            showTable(self.currentConfig.currentDataSource.sampleData);
        } else if (self.currentConfig.currentDataSource.type == "databaseSource") {
            if (!node || !node.data) return alert("not implemented yet for databases");
            var size = 200;
            var sqlQuery = "select top  " + size + "* from " + node.data.id;
            if (self.currentConfig.currentDataSource.sqlType == "postgres") {
                sqlQuery = "select   " + "* from public." + node.data.id + " LIMIT " + size;
            }
            const params = new URLSearchParams({
                type: self.currentConfig.currentDataSource.sqlType,
                dbName: self.currentConfig.currentDataSource.name,
                sqlQuery: sqlQuery,
            });

            $.ajax({
                type: "GET",
                url: Config.apiUrl + "/kg/data?" + params.toString(),
                dataType: "json",

                success: function (data, _textStatus, _jqXHR) {
                    showTable(data.rows);
                },
                error(err) {
                    return alert(err.responseText);
                },
            });
        } else if (self.currentConfig.currentDataSource.type == "csvSource") {
            alert("Comming Soon...");
        }
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

    self.deleteCsvFile = function (node) {
        return alert("coming soon");
    };
    self.deleteMappings = function (node) {
        var table = node.data.id;
        if (confirm("delete mappings of table " + table)) {
            delete self.currentConfig.currentMappings[table];
            self.saveDataSourceMappings();
        }
    };

    self.getTextSelection = function () {
        var t;
        if (window.getSelection) {
            t = window.getSelection().toString();
        } else if (document.getSelection) {
            t = document.getSelection().toString();
        } else if (document.selection) {
            t = document.selection.createRange().text;
        }
        return t;
    };
    self.ResetRunMappingTabWidth = function () {
        var LateralPanelWidth = $("#lateralPanelDiv").width();
        var KGcreator_runmappingsTabWidth = $(window).width() - LateralPanelWidth;
        var KGcreator_GraphEditorWidth = KGcreator_runmappingsTabWidth / 2 - 5;

        $("#KGcreator_run_mappingsGraphEditorContainer").css("width", KGcreator_GraphEditorWidth);
    };
    /*self.initRunTab = function () {
        if (self.currentTab != "Run") {
            self.currentTab = "Run";
            $("#KGcreator_centralPanelTabs").load("./modules/tools/KGcreator/html/runTab.html", function () {
                $("#KGcreator_topButtons").load("./modules/tools/KGcreator/html/runButtons.html", function () {
                
                    if (self.currentTreeNode) {
                        //KGcreator_run.createTriples(true);
                        KGcreator_run.getTableAndShowMappings();
                    }
                   
                    self.ResetRunMappingTabWidth();
                    $("#KGcreator_centralPanelTabs").redraw();
                });
            });
        }
    };*/
    self.initLinkTab = function () {
        if (self.currentTab != "Map") {
            self.currentTab = "Map";
            $("#KGcreator_centralPanelTabs").load("./modules/tools/KGcreator/html/linkTab.html", function () {
                $("#KGcreator_topButtons").load("./modules/tools/KGcreator/html/runButtons.html", function () {
                    if (self.currentTreeNode != undefined) {
                        $(document.getElementById(self.currentTreeNode.id + "_anchor")).click();
                    }
                });
            });
        }
    };

    return self;
})();

export default KGcreator;
window.KGcreator = KGcreator;
