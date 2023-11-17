import SourceSelectorWidget from "../../uiWidgets/sourceSelectorWidget.js";
import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import PopupMenuWidget from "../../uiWidgets/popupMenuWidget.js";
import Lineage_sources from "../lineage/lineage_sources.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";

import KGcreator_graph from "./KGcreator_graph.js";
import KGcreator_mappings from "./KGcreator_mappings.js";
import KGcreator_run from "./KGcreator_run.js";
import KGcreator_joinTables from "./KGcreator_joinTables.js";

var KGcreator = (function () {
    var self = {};
    self.currentConfig = {};
    self.currentSlsvSource = {};
    self.allTriplesMappings = {};
    var mappingsDir = "mappings";


    self.uploadFormData = {
        displayForm: "", // can be database, file or ""
        currentSource: "",
        selectedDatabase: "",
        selectedFiles: [],
    };

    self.displayUploadApp = function (displayForm) {
        self.uploadFormData.displayForm = displayForm;
   //   return   $.getScript("/kg_upload_app.js");
        if(!displayForm)
          return;
        var html=" <div id=\"mount-kg-upload-app-here\"></div>";
        $("#smallDialogDiv").html(html)
        $("#smallDialogDiv").dialog({"open": function( event, ui ) {
                self.uploadFormData.currentSource = self.currentSlsvSource;
               import ("/assets/kg_upload_app.js");
        }})
        $("#smallDialogDiv").dialog("open")

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

                    if (!authentication.currentUser.groupes.indexOf("admin") < 0) {
                        $("#KGcreator_deleteKGcreatorTriplesBtn").css("display", "none");
                    }
                    MainController.UI.showHideRightPanel("hide");
                });
            });
        });
        $("#accordion").accordion("option", { active: 2 });
    };

    self.showSourcesDialog = function (callback) {
        if (Config.tools["KGcreator"].urlParam_source) {
            self.currentSlsvSource = Config.tools["KGcreator"].urlParam_source;
            self.initSource();
            return;
        }

        var options = {
            withCheckboxes: false,
        };
        var selectTreeNodeFn = function () {
            self.currentSlsvSource = SourceSelectorWidget.getSelectedSource()[0];
            $("#KGcreator_slsvSource").html(self.currentSlsvSource);
            $("#mainDialogDiv").dialog("close");
            if (!self.currentSlsvSource) {
                return alert("select a source");
            }
            self.initSource();
            //  self.initCentralPanel();
        };

        SourceSelectorWidget.initWidget(["OWL"], "mainDialogDiv", true, selectTreeNodeFn, null, options);
        if (callback) {
            callback();
        }
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
            KGcreator_graph.drawOntologyModel(self.currentSlsvSource);
        });
        $("#KGcreator_resourceLinkRightPanel").load("./modules/tools/KGcreator/html/graphControlPanel.html", function () {});
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
                self.saveSlsvSourceConfig(function (err, result) {
                    callback(err);
                    if (err) {
                        return callback(err);
                    }
                    return callback(null, newJson);
                });
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

            var jstreeData = [];
            var options = {
                openAll: true,
                selectTreeNodeFn: function (event, obj) {
                    self.currentTreeNode = obj.node;
                    KGcreator.currentTreeNode = obj.node;

                    if (obj.node.data.type == "databaseSource") {
                        self.currentConfig.currentDataSource = {
                            name: obj.node.id,
                            tables: [],
                            type: "databaseSource",
                            sqlType: obj.node.data.sqlType,
                            currentTable: "",
                        };

                        KGcreator.loadDataBaseSource(self.currentSlsvSource, obj.node.id, obj.node.data.sqlType);
                    } else if (obj.node.data.type == "csvSource") {
                        self.currentConfig.currentDataSource = {
                            name: obj.node.id,
                            tables: [],
                            type: "csvSource",
                            sqlType: obj.node.data.sqlType,
                            currentTable: "",
                        };

                        KGcreator.loadCsvSource(self.currentSlsvSource, obj.node.id);
                    } else if (obj.node.data.type == "table") {
                        var mappingObj = self.currentConfig.currentMappings[obj.node.data.id];

                        var columns = self.currentConfig.currentDataSource.tables[obj.node.data.id];
                        var table = obj.node.data.id;
                        self.currentConfig.currentDataSource.currentTable = table;
                        self.showTablesColumnTree(table, columns);
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
                                self.displayUploadApp("database");
                                // KGcreator.createDataBaseSourceMappings();
                            },
                        };
                        return items;
                    } else if (node.id == "csvSources") {
                        items.csvSources = {
                            label: "addCsvSources",
                            action: function (_e) {
                                // pb avec source
                                self.displayUploadApp("file");
                                // KGcreator.createCsvSourceMappings();
                            },
                        };
                        return items;
                    } else if (node.data.type == "databaseSource") {
                        items.showSourceMappings = {
                            label: "showSourceMappings",
                            action: function (_e) {
                                // pb avec source
                                KGcreator_mappings.showSourceMappings(node);
                            },
                        };

                        return items;
                    } else if (node.data.type == "csvSource") {
                        items.showSourceMappings = {
                            label: "showSourceMappings",
                            action: function (_e) {
                                // pb avec source
                                KGcreator_mappings.showSourceMappings(node);
                            },
                        };
                        items.deleteCsvFile = {
                            label: "deleteFile",
                            action: function (_e) {
                                // pb avec source
                                KGcreator.deleteCsvFile(node);
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
                    } else if (node.data.type == "table") {
                        items.showTableMappings = {
                            label: "showTableMappings",
                            action: function (_e) {
                                // pb avec source
                                KGcreator_mappings.showTableMappings(node);
                            },
                        };

                        items.tranforms = {
                            label: "tranforms",
                            action: function (_e) {
                                // pb avec source
                                KGcreator_mappings.showTranformsDialog(node);
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

                        //   return (items = KGcreator.getContextMenu());

                        items.mapColumn = {
                            label: "map Column",
                            action: function (_e) {
                                // pb avec source
                                KGcreator_mappings.showMappingDialog();
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
                    } else if (node.data.type == "csvSource") {
                        items.showTableMappings = {
                            label: "showTableMappings",
                            action: function (_e) {
                                // pb avec source
                                KGcreator_mappings.showTableMappings(node);
                            },
                        };
                        items.lookups = {
                            label: "lookups",
                            action: function (_e) {
                                // pb avec source
                                KGcreator_mappings.showLookupsDialog(node);
                            },
                        };
                        items.tranforms = {
                            label: "tranforms",
                            action: function (_e) {
                                // pb avec source
                                KGcreator_mappings.showTranformsDialog(node);
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
                var sqlType = self.currentConfig.databaseSources[datasource].type;

                jstreeData.push({
                    id: datasource,
                    text: datasource,
                    parent: "databaseSources",
                    data: { id: datasource, type: "databaseSource", sqlType: sqlType },
                });
            }
            for (var datasource in self.currentConfig.csvSources) {
                jstreeData.push({
                    id: datasource,
                    text: datasource,
                    parent: "csvSources",
                    data: { id: datasource, type: "csvSource" },
                });
            }
            JstreeWidget.loadJsTree("KGcreator_csvTreeDiv", jstreeData, options);
            if (callback) {
                return callback();
            }
        });
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
                MainController.UI.message(mappingsDir + "/" + source + "config saved");
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
                MainController.UI.message(mappingsDir + "/" + source + "config saved");
            },
            error: function (err) {
                alert(err);
            },
        });
    };

    self.loadDataBaseSource = function (slsvSource, dataSource, sqlType) {
        async.series(
            [
                function (callbackSeries) {
                    KGcreator.listDatabaseTables(dataSource, sqlType, function (err, tables) {
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
            ],
            function (err) {
                if (err) {
                    return alert(err);
                }
            }
        );
    };

    self.loadCsvSource = function (slsvSource, fileName, callback) {
        var columns = [];
        async.series(
            [
                function (callbackSeries) {
                    var payload = {
                        fileName: fileName,
                        dir: "CSV/" + slsvSource,
                        lines: 200,
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
                    var jstreeData = [];

                    columns.forEach(function (column) {
                        var label = column;

                        var columnMappings = self.getColumnsMappings(fileName, null, "s");

                        if (columnMappings[column]) {
                            label = "<span class='KGcreator_fileWithMappings'>" + column + "</span>";
                        }
                        jstreeData.push({
                            id: fileName + "_" + column,
                            text: label,
                            parent: fileName,
                            data: { id: column, table: fileName, label: column, type: "tableColumn" },
                        });
                    });

                    JstreeWidget.addNodesToJstree("KGcreator_csvTreeDiv", fileName, jstreeData);
                    KGcreator_graph.graphColumnToClassPredicates([fileName]);
                    callbackSeries();
                },
                function (callbackSeries) {
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
        JstreeWidget.addNodesToJstree("KGcreator_csvTreeDiv", datasourceConfig.name, jstreeData);
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

    self.removeColumnMappings = function (node) {
        if (!confirm(" remove mappings for column " + node.text)) {
            return;
        }

        var tableTriples = self.currentConfig.currentMappings[node.data.table].tripleModels;
        tableTriples.forEach(function (triple, index) {
            if (triple.s == node.data.id) {
                tableTriples.splice(index, 1);
                JstreeWidget.setSelectedNodeStyle({ color: "black" });
                KGcreator_graph.deleteColumnNode(node);
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
        // hide uploadApp
        self.displayUploadApp("");
        $("#smallDialogDiv").dialog("close")

        var datasourceName = self.uploadFormData.selectedDatabase;
        if (!datasourceName) {
            return;
        }
        var sqlType = "sql.sqlserver";
        var json = {
            type: sqlType,
            connection: "_default",
            tableJoins: [],
        };
        self.currentConfig.databaseSources[datasourceName] = json;
        self.rawConfig.databaseSources[datasourceName] = json;
        self.saveSlsvSourceConfig(function (err, result) {
            if (err) return alert(err);
            self.addDataSourceToJstree("databaseSource", datasourceName, sqlType);
        });
    };

    self.createCsvSourceMappings = function () {
        // hide uploadApp
        self.displayUploadApp("");
        $("#smallDialogDiv").dialog("close")
        var datasourceName = self.uploadFormData.selectedFiles[0];
        if (!datasourceName) {
            return;
        }

        self.currentConfig.csvSources[datasourceName] = {};
        self.rawConfig.csvSources[datasourceName] = {};

        self.saveSlsvSourceConfig(function (err, result) {
            if (err) return alert(err);
            self.addDataSourceToJstree("csvSource", datasourceName);
            self.loadCsvSource(self.currentSlsvSource, datasourceName, function (err, result) {
                if (err) return alert(err.responseText);
            });
        });
    };

    self.addDataSourceToJstree = function (type, datasourceName, sqlType) {
        var jstreeData = [
            {
                id: datasourceName,
                text: datasourceName,
                parent: type + "s",
                data: { id: datasourceName, type: type, sqlType: sqlType },
            },
        ];

        JstreeWidget.addNodesToJstree("KGcreator_csvTreeDiv", type + "s", jstreeData);
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

    self.showSampleData = function (node, column, callback) {
        alert("coming soon");
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
    return self;
})();

export default KGcreator;
window.KGcreator = KGcreator;
