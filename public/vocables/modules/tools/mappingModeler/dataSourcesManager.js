import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import MappingModeler from "./mappingModeler.js";







var DataSourceManager = (function () {
    var self = {}
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
                self.currentConfig=JSON.parse(result)
                self.rawConfig= self.currentConfig;
                return callback(null, json);
            },
            error: function (err) {
                self.initNewSlsvSource(source, function (err, json) {
                    self.currentConfig=json
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
                self.rawConfig = newJson;
                return callback(null, newJson);
            },
            error: function (err) {
                self.rawConfig = newJson;
                return callback(null, newJson);
            },
        });
    };

    
    self.loaDataSourcesJstree=function(jstreeDiv,callback){
   

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
                }
             else if (true) {
            items.csvSources = {
                label: "show SampleData",
                action: function (_e) {
                    MappingModeler.showSampleData();

                },
            };
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
                for (var datasource in self.currentConfig.csvSources) {
                    jstreeData.push({
                        id: datasource,
                        text: datasource,
                        parent: "csvSources",
                        type: "CSV",
                        data: { id: datasource, type: "csvSource" },
                    });
                }

                JstreeWidget.loadJsTree(jstreeDiv, jstreeData, options);
                if (callback) {
                    return callback(err, self.currentConfig);
                }
            }
        );


    }


    self.initNewDataSource = function (name, type, sqlType, table) {
        //close Previous DataSource
        var parent_node = $("#" + self.dataSourcejstreeDivId).jstree()._model.data[self.currentConfig?.currentDataSource?.id];
        if (parent_node) {
            $("#" + self.dataSourcejstreeDivId)
                .jstree(true)
                .delete_node(parent_node.children);
        }
        var id;
        if(type!='csvSource'){
            var node = $("#" + self.dataSourcejstreeDivId).jstree(true).get_node(name);
            id=name;
            name=node.text;
        }else{
            id=name;
        }
        self.currentConfig.currentDataSource = {
            name: name,
            id:id,
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

                            for (var table in   self.currentConfig.currentDataSource.tables) {
                                var label = table;
                               /* if (self.currentConfig.currentMappings[table]) {
                                    label = "<span class='KGcreator_fileWithMappings'>" + table + "</span>";
                                }*/
                                jstreeData.push({
                                    id: table,
                                    text: label,
                                    type: "Table",
                                    parent:  self.currentConfig.dataSource,
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
 

    self.saveSlsvSourceConfig = function (callback) {
        var data = DataSourceManager.rawConfig;
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
        });
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
        self.uploadFormData.selectedFiles = null
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
        datasource = {id: datasource, name: datasource}
    }
    DataSourceManager.currentConfig.databaseSources[datasource.id] = {name: datasource.name};
    DataSourceManager.rawConfig.databaseSources[datasource.id] = {name: datasource.name};
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



    return self;

})()

export default DataSourceManager
window.DataSourceManager = DataSourceManager