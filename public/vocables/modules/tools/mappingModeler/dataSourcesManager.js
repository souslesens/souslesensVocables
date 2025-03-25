import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import MappingModeler from "./mappingModeler.js";
import UIcontroller from "./uiController.js";

/**
 * DataSourceManager module
 * Responsible for managing data source configurations and operations.
 * @module DataSourceManager
 * @see [Tutorial: Overview]{@tutorial overview}
 */
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

    /**
     * Retrieves the configuration for a given data source.
     * Transfers the "main.json" configuration to the Vis.js graph if not already transferred.
     * @function
     * @name getSlsvSourceConfig
     * @memberof module:DataSourceManager
     * @param {string} source - The source name.
     * @param {Function} callback - The callback function to be executed after the operation.
     * @returns {void}
     */
    self.getSlsvSourceConfig = function (source, callback) {
        // Transfer Config main.json to visjsgraph for firstTime and if already transfered skip
        if (self?.rawConfig?.isConfigInMappingGraph) {
            return callback(null, self.rawConfig);
        }

        //obslolete here for old mappings migration
        var payload = {
            dir: mappingsDir + "/" + source,
            fileName: "main.json",
        };
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

                MappingColumnsGraph.saveVisjsGraphWithConfig();

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

    /**
     * Initializes a new data source and sets the current configuration.
     * @function
     * @name initNewSlsvSource
     * @memberof module:DataSourceManager
     * @param {string} source - The source name.
     * @param {Function} callback - The callback function to be executed after the initialization.
     * @returns {void}
     */
    self.initNewSlsvSource = function (source, callback) {
        MappingColumnsGraph.saveVisjsGraphWithConfig(function () {
            self.currentConfig = self.rawConfig;
            if (callback) {
                callback(null, self.currentConfig);
            }
        });
    };

    /**
     * Loads data sources into a Jstree widget for visualization and interaction.
     * @function
     * @name loaDataSourcesJstree
     * @memberof module:DataSourceManager
     * @param {string} jstreeDiv - The DOM element where the tree should be loaded.
     * @param {Function} callback - The callback function to be executed after loading the data sources.
     * @returns {void}
     */
    self.loaDataSourcesJstree = function (jstreeDiv, callback) {
        var options = {
            openAll: true,
            selectTreeNodeFn: self.onDataSourcesJstreeSelect,
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
        self.dataSourcejstreeDivId = "mappingModeler_dataSourcesJstreeDiv";
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
                var dataTables = MappingColumnsGraph.getDatasourceTablesFromVisjsGraph();
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
                var dataSources = MappingColumnsGraph.visjsGraph.data.nodes.get().map(function (node) {
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
            },
        );
    };

    /**
     * Initializes a new data source, updating the current configuration.
     * This function handles both CSV and non-CSV sources by adding them to the Jstree and updating the current data source configuration.
     * @function
     * @name initNewDataSource
     * @memberof module:DataSourceManager
     * @param {string} name - The name of the data source.
     * @param {string} type - The type of the data source (e.g., "csvSource" or other types).
     * @param {string} sqlType - The SQL type of the data source, relevant for non-CSV sources.
     * @param {string} table - The initial table to be set for the data source.
     * @returns {void}
     */
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

    /**
     * Loads a CSV source by fetching data from the server, including headers and sample data.
     * This function updates the current configuration with the columns of the CSV source and its sample data.
     * @function
     * @name loadCsvSource
     * @memberof module:DataSourceManager
     * @param {string} slsvSource - The name of the CSV source.
     * @param {string} fileName - The name of the CSV file to load.
     * @param {boolean} loadJstree - A flag indicating whether to reload the Jstree.
     * @param {Function} callback - A callback function to be executed after loading the CSV source.
     * @returns {void}
     */
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
            },
        );
    };

    /**
     * Loads a database source and its associated model by fetching data from the server.
     * This function retrieves the model for a given data source and updates the configuration with its tables.
     * It also updates the Jstree with the available tables for the data source.
     * @function
     * @name loadDataBaseSource
     * @memberof module:DataSourceManager
     * @param {string} slsvSource - The name of the source.
     * @param {string} dataSource - The name of the database source to load.
     * @param {string} sqlType - The SQL type of the database source.
     * @param {Function} callback - A callback function to be executed after the source is loaded.
     * @returns {void}
     */
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
                            var dataTables = MappingColumnsGraph.getDatasourceTablesFromVisjsGraph();
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
                    },
                );
            });
        });
    };

    /**
     * Handles the selection of a node in the Jstree, which represents different types of data sources, including databases, CSVs, and tables.
     * It updates the configuration and loads the corresponding data source or table based on the selection.
     * Also handles UI updates for the mapping modeler and left panel tabs.
     * @function
     * @name onDataSourcesJstreeSelect
     * @memberof module:DataSourceManager
     * @param {Object} event - The event object triggered by the selection.
     * @param {Object} obj - The Jstree node object containing details about the selected node.
     * @returns {void}
     */
    self.onDataSourcesJstreeSelect = function (event, obj) {
        MappingModeler.currentTreeNode = obj.node;
        var isRightClick = false;
        if (obj.event.which == 3) {
            isRightClick = true;
        }

        if (obj.node.data.type == "databaseSource") {
            DataSourceManager.initNewDataSource(obj.node.id, "databaseSource", obj.node.data.sqlType, obj.node.data.table);
            //UIcontroller.switchLeftPanel("mappings");
            DataSourceManager.loadDataBaseSource(DataSourceManager.currentSlsvSource, obj.node.id, obj.node.data.sqlType);
        } else if (obj.node.data.type == "csvSource") {
            DataSourceManager.initNewDataSource(obj.node.id, "csvSource", obj.node.data.sqlType, obj.node.id);
            var fileName = DataSourceManager.currentSlsvSource;
            DataSourceManager.loadCsvSource(DataSourceManager.currentSlsvSource, obj.node.id, false, function (err, columns) {
                if (err) {
                    return alert("file not found");
                }

                MappingModeler.currentResourceType = "Column";
                MappingModeler.currentTable = {
                    name: obj.node.id,
                    columns: columns,
                };
                $("#MappingModeler_leftTabs").tabs("option", "active", 1);
                UIcontroller.onActivateLeftPanelTab("MappingModeler_columnsTab");
            });
        } else if (obj.node.data.type == "table") {
            MappingModeler.currentTable = {
                name: obj.node.data.label,
                columns: DataSourceManager.currentConfig.currentDataSource.tables[obj.node.data.id],
            };
            var table = obj.node.data.id;
            DataSourceManager.currentConfig.currentDataSource.currentTable = table;

            //self.hideForbiddenResources("Table");
            MappingModeler.currentResourceType = "Column";
            $("#MappingModeler_leftTabs").tabs("option", "active", 1);
            UIcontroller.onActivateLeftPanelTab("MappingModeler_columnsTab");
        }



        if (obj.node.data.type == "table" || obj.node.data.type == "csvSource" ) {
            var table = obj.node.data.id;
            $("#MappingModeler_currentDataSource").html(table);

            MappingColumnsGraph.zoomOnTable(table)
            if(! MappingColumnsGraph.visjsGraph.data.nodes.get(table)){
               var tableNode= MappingColumnsGraph.getVisjsTableNode(table)
                MappingColumnsGraph.drawResource(tableNode)

            }
        }
    };

    /**
     * Saves the current configuration of the SlsvSource by using the MappingColumnsGraph save function.
     * Calls the provided callback once the saving operation is complete.
     * @function
     * @name saveSlsvSourceConfig
     * @memberof module:DataSourceManager
     * @param {Function} callback - The callback to invoke after saving the configuration.
     * @returns {void}
     */
    self.saveSlsvSourceConfig = function (callback) {
        MappingColumnsGraph.saveVisjsGraphWithConfig(callback);
    };

    /*********************************************************************************/
    /***functions linked to REACT**/
    // see assets/mappingModeler_upload_app.js
    /***********************************************************************************/
    // imports React app
    import("/assets/mappingModeler_upload_app.js");

    /**
     * Displays the upload form app for uploading database or CSV sources.
     * Depending on the form type, it loads the appropriate form and handles initialization of the React app.
     * @function
     * @name displayUploadApp
     * @memberof module:DataSourceManager
     * @param {string} displayForm - The type of form to display ("database" or "file").
     * @returns {void}
     */
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

                self.uploadFormData.currentSource = MappingModeler.currentSLSsource;

                self.umountKGUploadApp = self.createApp(self.uploadFormData);
            },
            beforeClose: function () {
                self.umountKGUploadApp();
                DataSourceManager.currentSlsvSource = MappingModeler.currentSLSsource;

                DataSourceManager.getSlsvSourceConfig(MappingModeler.currentSLSsource, function (err, result) {
                    if (err) {
                        return err;
                    }

                    DataSourceManager.currentConfig = result;
                });
            },
        });
        $("#smallDialogDiv").dialog("open");
    };

    /**
     * Creates mappings for a selected database source.
     * Closes the upload app dialog, adds the selected database source to the current configuration,
     * and saves the updated configuration. Calls the provided callback once the operation is complete.
     * @function
     * @name createDataBaseSourceMappings
     * @memberof module:DataSourceManager
     * @returns {void}
     */
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

    /**
     * Creates mappings for a selected CSV source.
     * Closes the upload app dialog, adds the selected CSV source to the current configuration,
     * and saves the updated configuration. Calls the provided callback once the operation is complete.
     * @function
     * @name createCsvSourceMappings
     * @memberof module:DataSourceManager
     * @returns {void}
     */
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

    /**
     * Deletes a data source (either database or CSV) from the configuration.
     * Removes the data source from the raw configuration, updates the JSTree,
     * and removes related nodes and edges from the graph. The updated configuration
     * is then saved. If the source is a CSV, additional steps would be taken to remove the file.
     * @function
     * @name deleteDataSource
     * @memberof module:DataSourceManager
     * @param {Object} jstreeNode - The JSTree node representing the data source to be deleted.
     * @returns {void}
     */
    self.deleteDataSource = function (jstreeNode) {
        var datasourceName = jstreeNode.id;
        // Delete from config
        if (jstreeNode.data.type == "databaseSource") {
            if (DataSourceManager.rawConfig.databaseSources[datasourceName]) {
                delete DataSourceManager.rawConfig.databaseSources[datasourceName];
                JstreeWidget.deleteNode("mappingModeler_dataSourcesJstreeDiv", jstreeNode.id);
            }
        } else if (jstreeNode.data.type == "csvSource") {
            if (DataSourceManager.rawConfig.csvSources[datasourceName]) {
                delete DataSourceManager.rawConfig.csvSources[datasourceName];
                JstreeWidget.deleteNode("mappingModeler_dataSourcesJstreeDiv", jstreeNode.id);
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
            MappingColumnsGraph.visjsGraph.data.nodes.get().forEach(function (node) {
                if (node.data.datasource != datasourceName) {
                    newNodes.push(node);
                } else {
                    // to not save n times
                    MappingColumnsGraph.visjsGraph.data.nodes.remove(node);
                }
            });
            var newNodesIds = newNodes.map(function (node) {
                return node.id;
            });
            MappingColumnsGraph.visjsGraph.data.edges.get().forEach(function (edge) {
                if (newNodesIds.includes(edge.from) && newNodesIds.includes(edge.to)) {
                    // node to keep
                } else {
                    MappingColumnsGraph.visjsGraph.data.edges.remove(edge);
                }
            });
            MappingColumnsGraph.saveVisjsGraphWithConfig(function () {
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
