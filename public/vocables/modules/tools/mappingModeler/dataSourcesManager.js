import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import MappingModeler from "./mappingModeler.js";

var DataSourceManager = (function () {
    var self = {};
    self.currentConfig = {};
    self.currentSlsvSource = {};

    var mappingsDir = "mappings";
    self.umountKGUploadApp = null;

    self.uploadFormData = {
        displayForm: "", // can be database, file or ""
        currentSource: "",
        selectedDatabase: "",
        selectedFiles: [],
    };

    self.createApp = null;
    self.getSlsvSourceConfig = function (source, callback) {
        // Transfer Config main.json to visjsgraph for firstTime and if already transfered skip
        if (self?.rawConfig?.isConfigInMappingGraph) {
            return callback(null, self.rawConfig);
        }
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
                self.currentConfig = JSON.parse(result);
                self.currentConfig.isConfigInMappingGraph = true;
                self.rawConfig = self.currentConfig;

                MappingModeler.saveVisjsGraphWithConfig();

                return callback(null, json);
            },
            error: function (err) {
                self.initNewSlsvSource(source, function (err, json) {
                    self.currentConfig = json;
                    if (callback) {
                        callback(null, json);
                    }
                });
                /*
                self.initNewSlsvSource(source, function (err, json) {
                    self.currentConfig=json
                    return callback(null, json);
                });*/
            },
        });
    };

    // create dir and main.json
    // Initialisation of configuration
    self.initNewSlsvSource = function (source, callback) {
        MappingModeler.saveVisjsGraphWithConfig(function () {
            self.currentConfig = self.rawConfig;
            if (callback) {
                callback(null, self.currentConfig);
            }
        });
        /*
        var newJson = {
            sparqlServerUrl: Config.sources[self.currentSlsvSource].sparql_server.url,
            graphUri: Config.sources[self.currentSlsvSource].graphUri,
            prefixes: {},
            lookups: {},
            databaseSources: {},
            csvSources: {},
        };

        // Write Config in source_ALL.json of mappings
        self.rawConfig = newJson;
        */
        // Write in main.json
        /*
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
                self.rawConfig = newJson;
                return callback(null, newJson);
            },
            error: function (err) {
                self.rawConfig = newJson;
                return callback(null, newJson);
            },
        });*/
    };

    self.loaDataSourcesJstree = function (jstreeDiv, callback) {
        var options = {
            openAll: true,
            selectTreeNodeFn: MappingModeler.onDataSourcesJstreeSelect,
            contextMenu: function (node, x) {
                var items = {};
                if (node.id == "databaseSources") {
                    items.addDatabaseSource = {
                        label: "addDatabaseSources",
                        action: function (_e) {
                            self.displayUploadApp("database");
                        },
                    };
                    return items;
                } else if (node.id == "csvSources") {
                    items.csvSources = {
                        label: "add Csv Sources",
                        action: function (_e) {
                            // pb avec source
                            self.displayUploadApp("file");
                        },
                    };
                    return items;
                } else if (true) {
                    if (node.data.type != "databaseSource") {
                        items.showSampleData = {
                            label: "show SampleData",
                            action: function (_e) {
                                MappingModeler.showSampleData();
                            },
                        };
                    }
                    if (node.data.type != "table") {
                        items.deleteDataSource = {
                            label: "delete DataSource",
                            action: function (_e) {
                                DataSourceManager.deleteDataSource(node);
                            },
                        };
                    }

                    return items;
                }
            },
        };
        self.dataSourcejstreeDivId = "mappingModeler_jstreeDiv";
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
                var dataTables = MappingModeler.getDataTablesFromVisjsGraph();
                for (var datasource in self.currentConfig.csvSources) {
                    var jstreeNode = {
                        id: datasource,
                        text: datasource,
                        parent: "csvSources",
                        type: "CSV",
                        data: { id: datasource, type: "csvSource" },
                    };
                    if (dataTables.includes(datasource)) {
                        jstreeNode.text = "<span style='color:blue'>" + datasource + "</span>";
                    }
                    jstreeData.push(jstreeNode);
                }

                //underline CSV with mappings
                var dataSources = MappingModeler.visjsGraph.data.nodes.get().map(function (node) {
                    return node?.data?.datasource;
                });
                if (dataSources.length > 0) {
                    dataSources = common.array.distinctValues(dataSources);
                    dataSources = dataSources.filter(function (item) {
                        return item != undefined;
                    });
                }
                for (var node in jstreeData) {
                    if (dataSources.includes(jstreeData[node].id)) {
                        jstreeData[node].text = "<span style='color:blue'>" + jstreeData[node].text + "</span>";
                    }
                }

                JstreeWidget.loadJsTree(jstreeDiv, jstreeData, options, function () {
                    $("#MappingModeler_dataSourcesTab").css("margin-top", "0px");
                });
                if (callback) {
                    return callback(err, self.currentConfig);
                }
            }
        );
    };

    self.initNewDataSource = function (name, type, sqlType, table) {
        //close Previous DataSource
        var parent_node = $("#" + self.dataSourcejstreeDivId).jstree()._model.data[self.currentConfig?.currentDataSource?.id];
        if (parent_node) {
            $("#" + self.dataSourcejstreeDivId)
                .jstree(true)
                .delete_node(parent_node.children);
        }
        var id;
        if (type != "csvSource") {
            var node = $("#" + self.dataSourcejstreeDivId)
                .jstree(true)
                .get_node(name);
            id = name;
            name = node.text;
        } else {
            id = name;
        }
        self.currentConfig.currentDataSource = {
            name: name,
            id: id,
            tables: [],
            type: type,
            sqlType: sqlType,
            currentTable: table,
        };
    };
    self.loadCsvSource = function (slsvSource, fileName, loadJstree, callback) {
        var columns = [];
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
                    return callback(null, columns);
                }
            }
        );
    };

    self.loadDataBaseSource = function (slsvSource, dataSource, sqlType, callback) {
        fetch(`${Config.apiUrl}/databases/${dataSource}`).then((response) => {
            response.json().then((data) => {
                async.series(
                    [
                        function (callbackSeries) {
                            const params = new URLSearchParams({
                                name: dataSource,
                                type: sqlType,
                            });
                            $.ajax({
                                type: "GET",
                                url: Config.apiUrl + "/kg/model?" + params.toString(),
                                dataType: "json",
                                success: function (data, _textStatus, _jqXHR) {
                                    self.currentDataSourceModel = data;
                                    self.currentSource = self.dataSource;
                                    self.currentdabase = { type: sqlType, dbName: self.dataSource };
                                    self.currentConfig.currentDataSource.tables = data;
                                    callbackSeries();
                                },
                                error: function (err) {
                                    return callback(err);
                                },
                            });
                        },

                        function (callbackSeries) {
                            callbackSeries();
                        },

                        function (callbackSeries) {
                            var jstreeData = [];
                            var dataTables = MappingModeler.getDataTablesFromVisjsGraph();
                            for (var table in self.currentConfig.currentDataSource.tables) {
                                var label = table;
                                if (dataTables.includes(table)) {
                                    label = "<span style='color:blue'>" + table + "</span>";
                                }
                                jstreeData.push({
                                    id: table,
                                    text: label,
                                    type: "Table",
                                    parent: self.currentConfig.dataSource,
                                    data: {
                                        id: table,
                                        label: table,
                                        type: "table",
                                    },
                                });
                            }
                            JstreeWidget.addNodesToJstree(self.dataSourcejstreeDivId, self.currentConfig.currentDataSource.id, jstreeData);
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
                    }
                );
            });
        });
    };

    // Config save made on visjsGraph
    self.saveSlsvSourceConfig = function (callback) {
        MappingModeler.saveVisjsGraphWithConfig(function () {
            if (callback) {
                callback();
            }
        });
        /*var data = DataSourceManager.rawConfig;
        var source = DataSourceManager.currentSlsvSource;

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
        });*/
    };

    /*********************************************************************************/
    /***functions linked to REACT**/
    // see assets/mappingModeler_upload_app.js
    /***********************************************************************************/
    // imports React app
    import("/assets/mappingModeler_upload_app.js");

    self.displayUploadApp = function (displayForm) {
        self.uploadFormData.displayForm = displayForm;
        //   return   $.getScript("/kg_upload_app.js");
        if (!displayForm) {
            return;
        }
        if (displayForm == "database") {
            self.uploadFormData.selectedFiles = null;
        }
        var html = ' <div style="width:500px;height: 400px" id="mount-mappingModeler-upload-app-here"></div>';
        $("#smallDialogDiv").html(html);

        $("#smallDialogDiv").dialog({
            open: function (event, ui) {
                if (self.createApp === null) {
                    throw new Error("React app is not initialized see assets/mappingModeler_upload_app.js");
                }

                self.uploadFormData.currentSource = MappingModeler.currentSource;

                self.umountKGUploadApp = self.createApp(self.uploadFormData);
            },
            beforeClose: function () {
                self.umountKGUploadApp();
                DataSourceManager.currentSlsvSource = MappingModeler.currentSource;
                DataSourceManager.getSlsvSourceConfig(MappingModeler.currentSource, function (err, result) {
                    if (err) {
                        return err;
                    }

                    DataSourceManager.currentConfig = result;
                });
            },
        });
        $("#smallDialogDiv").dialog("open");
    };

    self.createDataBaseSourceMappings = function () {
        // hide uploadApp
        self.displayUploadApp("");
        $("#smallDialogDiv").dialog("close");

        var datasource = self.uploadFormData.selectedDatabase;
        if (!datasource) {
            return;
        }
        if (!datasource.id) {
            datasource = { id: datasource, name: datasource };
        }
        DataSourceManager.currentConfig.databaseSources[datasource.id] = { name: datasource.name };
        DataSourceManager.rawConfig.databaseSources[datasource.id] = { name: datasource.name };
        DataSourceManager.saveSlsvSourceConfig(function (err, result) {
            if (err) {
                return alert(err);
            }
            MappingModeler.onLoaded();
            // self.addDataSourceToJstree("databaseSource", datasource, "sql.sqlserver");
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

        DataSourceManager.currentConfig.csvSources[datasourceName] = {};
        DataSourceManager.rawConfig = DataSourceManager.currentConfig;

        DataSourceManager.saveSlsvSourceConfig(function (err, result) {
            if (err) {
                return alert(err);
            }
            MappingModeler.onLoaded();
        });
    };

    self.deleteDataSource = function (jstreeNode) {
        var datasourceName = jstreeNode.id;
        // Delete from config
        if (jstreeNode.data.type == "databaseSource") {
            if (DataSourceManager.rawConfig.databaseSources[datasourceName]) {
                delete DataSourceManager.rawConfig.databaseSources[datasourceName];
            }
        } else if (jstreeNode.data.type == "csvSource") {
            if (DataSourceManager.rawConfig.csvSources[datasourceName]) {
                delete DataSourceManager.rawConfig.csvSources[datasourceName];
            }
        } else {
            return;
        }

        DataSourceManager.saveSlsvSourceConfig(function (err, result) {
            if (err) {
                return alert(err);
            }
            // Delete all nodes/edges from this DataSource

            var newNodes = [];
            MappingModeler.visjsGraph.data.nodes.get().forEach(function (node) {
                if (node.data.datasource != datasourceName) {
                    newNodes.push(node);
                } else {
                    // to not save n times
                    MappingModeler.visjsGraph.data.nodes.remove(node);
                    //MappingModeler.removeNode(node);
                }
            });
            var newNodesIds = newNodes.map(function (node) {
                return node.id;
            });
            MappingModeler.visjsGraph.data.edges.get().forEach(function (edge) {
                if (newNodesIds.includes(edge.from) && newNodesIds.includes(edge.to)) {
                    // node to keep
                } else {
                    MappingModeler.visjsGraph.data.edges.remove(edge);
                }
            });
            MappingModeler.saveVisjsGraphWithConfig(function () {
                MappingModeler.onLoaded();
            });
            // Delete File from CSV if it's a CSV
            // Not done because road don't exist
        });
    };

    return self;
})();

export default DataSourceManager;
window.DataSourceManager = DataSourceManager;
