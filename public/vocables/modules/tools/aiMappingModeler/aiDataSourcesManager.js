import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import AIMappingModeler from "./aiMappingModeler.js";
import AIUIcontroller from "./aiUiController.js";
import AIMappingColumnsGraph from "./aiMappingColumnsGraph.js";
import AIDatabaseSchemaGraph from "./aiDatabaseSchemaGraph.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";

/**
 * AIDataSourceManager module
 * Responsible for managing data source configurations and operations.
 * @module AIDataSourceManager
 * @see [Tutorial: Overview]{@tutorial overview}
 */
var AIDataSourceManager = (function () {
    var self = {};
    self.currentConfig = {};
    self.currentSlsvSource = {};
    self.statsMap = {};
    // in-memory cache of triple stats per source: instant paint on reopen, always refreshed in background
    self.statsMapBySource = {};
    self.allDataSourcesNodeId = "allDataSources";
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
     * @memberof module:AIDataSourceManager
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

                AIMappingColumnsGraph.saveVisjsGraphWithConfig();

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
     * @memberof module:AIDataSourceManager
     * @param {string} source - The source name.
     * @param {Function} callback - The callback function to be executed after the initialization.
     * @returns {void}
     */
    self.initNewSlsvSource = function (source, callback) {
        AIMappingColumnsGraph.saveVisjsGraphWithConfig(function () {
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
     * @memberof module:AIDataSourceManager
     * @param {string} jstreeDiv - The DOM element where the tree should be loaded.
     * @param {string} tableStatsMap map where key is a table and value the number of triples created from this table
     * @param {Function} callback - The callback function to be executed after loading the data sources.
     * @returns {void}
     */
    self.loaDataSourcesJstree = function (jstreeDiv, tableStatsMap, callback) {
        var options = {
            openAll: true,
            selectTreeNodeFn: self.onDataSourcesJstreeSelect,
            contextMenu: function (node, x) {
                self.currentDataSourceTreeNode = node;
                var items = {};
                if (node.id == self.allDataSourcesNodeId) {
                    return items;
                } else if (node.id == "databaseSources") {
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
                                AIMappingModeler.showSampleData(node);
                            },
                        };
                        items.deleteTableMappings = {
                            label: "delete tableMappings",
                            action: function (_e) {
                                AIDataSourceManager.deleteTableMappings();
                            },
                        };
                    }
                    if (node.data.type != "table") {
                        items.deleteDataSource = {
                            label: "delete DataSource",
                            action: function (_e) {
                                AIDataSourceManager.deleteDataSource(node);
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
            id: self.allDataSourcesNodeId,
            text: "All data sources",
            parent: "#",
            data: {
                type: self.allDataSourcesNodeId,
            },
        });
        jstreeData.push({
            id: "databaseSources",
            text: "databaseSources",
            parent: self.allDataSourcesNodeId,
            type: "databaseSources",
            data: {
                type: "sourceType",
            },
        });
        jstreeData.push({
            id: "csvSources",
            text: "csvSources",
            parent: self.allDataSourcesNodeId,
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
                var dataTables = AIMappingColumnsGraph.getDatasourceTablesFromVisjsGraph();
                for (var datasource in self.currentConfig.csvSources) {
                    var jstreeNode = {
                        id: datasource,
                        text: datasource,
                        parent: "csvSources",
                        type: "CSV",
                        data: { id: datasource, type: "csvSource" },
                    };
                    var nTriples = tableStatsMap[jstreeNode.id];
                    var strStats = "";
                    if (nTriples) {
                        strStats = "<b>" + nTriples + "Triples</b>";
                    }
                    if (dataTables.includes(datasource)) {
                        jstreeNode.text = "<span style='color:blue'>" + datasource + strStats + "</span>";
                    }
                    jstreeData.push(jstreeNode);
                }

                //underline CSV with mappings
                if (self?.visjsGraph?.data?.nodes?.length == 0) {
                    var dataSources = AIMappingColumnsGraph.visjsGraph.data.nodes.get().map(function (node) {
                        return node?.data?.datasource;
                    });
                    if (dataSources.length > 0) {
                        dataSources = common.array.distinctValues(dataSources);
                        dataSources = dataSources.filter(function (item) {
                            return item != undefined;
                        });
                    }
                    for (var node in jstreeData) {
                        var nTriples = tableStatsMap[node.id];
                        var strStats = "";
                        if (nTriples) {
                            strStats = "<b>" + nTriples + "Triples</b>";
                        }
                        if (dataSources.includes(jstreeData[node].id)) {
                            jstreeData[node].text = "<span style='color:blue'>" + jstreeData[node].text + strStats + "</span>";
                        }
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
     * @memberof module:AIDataSourceManager
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
     * @memberof module:AIDataSourceManager
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
                        options: JSON.stringify({ lines: 100 }),
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
                    return MainController.errorAlert(err);
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
     * @memberof module:AIDataSourceManager
     * @param {string} slsvSource - The name of the source.
     * @param {string} dataSource - The name of the database source to load.
     * @param {string} sqlType - The SQL type of the database source.
     * @param {Function} callback - A callback function to be executed after the source is loaded.
     * @returns {void}
     */
    self.loadDataBaseSource = function (slsvSource, dataSource, sqlType, callback) {
        fetch(`${Config.apiUrl}/databases/${dataSource}`).then((response) => {
            response.json().then((data) => {
                // Store connection info so RML export can build the JDBC DSN automatically
                if (self.currentConfig.currentDataSource) {
                    self.currentConfig.currentDataSource.host = data.host || null;
                    self.currentConfig.currentDataSource.port = data.port || null;
                    self.currentConfig.currentDataSource.database = data.database || null;
                }
                var mappingDatabaseName = self.currentConfig.databaseSources[dataSource].name;
                var isIdKnown = response.ok;
                // a mapping copied from another server or edited by hand keeps a stale id
                if (!mappingDatabaseName || (isIdKnown && self.isDatabaseNamed(data, mappingDatabaseName))) {
                    return self.loadDataBaseSourceTables(dataSource, sqlType, callback);
                }
                self.relinkDatabaseSource(dataSource, mappingDatabaseName, function (err, isRelinked) {
                    if (err) {
                        return MainController.errorAlert(err);
                    }
                    // a relink reloads the whole mapping
                    if (isRelinked) {
                        return;
                    }
                    if (!isIdKnown) {
                        return MainController.errorAlert("The database id " + dataSource + " of the mapping is unknown in ConfigEditor > Databases.");
                    }
                    self.loadDataBaseSourceTables(dataSource, sqlType, callback);
                });
            });
        });
    };

    // between two readings of the keys while the AI detects the ones the schema does not declare
    self.aiKeysPollDelay = 15000;

    // the keys the AI found in the data for this column: { primaryKey, foreignKey }, each null when it found none
    self.getColumnAiKeys = function (table, column) {
        var tableKeys = self.currentConfig.currentDataSource ? self.currentConfig.currentDataSource.tableKeys : null;
        var aiKeys = tableKeys ? tableKeys.aiKeys : null;
        if (!aiKeys) {
            return { primaryKey: null, foreignKey: null };
        }
        var primaryKey = aiKeys.primaryKeys.find(function (aiPrimaryKey) {
            return aiPrimaryKey.table == table && aiPrimaryKey.columns.indexOf(column) > -1;
        });
        var foreignKey = aiKeys.foreignKeys.find(function (aiForeignKey) {
            return aiForeignKey.table == table && aiForeignKey.column == column;
        });
        var columnAiKeys = { primaryKey: primaryKey || null, foreignKey: foreignKey || null };
        return columnAiKeys;
    };

    // "PK", "FK", "AI PK", "AI FK" and their combinations, or "" for a column outside every key, a csv column, or keys not read
    self.getColumnKeyText = function (table, column) {
        var tableKeys = self.currentConfig.currentDataSource ? self.currentConfig.currentDataSource.tableKeys : null;
        if (!tableKeys) {
            return "";
        }
        var isColumnKey = function (keyColumn) {
            return keyColumn.table_name == table && keyColumn.column_name == column;
        };
        var columnAiKeys = self.getColumnAiKeys(table, column);
        var keyKinds = [];
        if (tableKeys.primaryKeys.some(isColumnKey)) {
            keyKinds.push("PK");
        } else if (columnAiKeys.primaryKey) {
            keyKinds.push("AI PK");
        }
        if (tableKeys.foreignKeys.some(isColumnKey)) {
            keyKinds.push("FK");
        } else if (columnAiKeys.foreignKey) {
            keyKinds.push("AI FK");
        }
        var columnKeyText = keyKinds.join(" ");
        return columnKeyText;
    };

    // why the AI holds the column a key, shown on hover; "" when it found no key on it
    self.getColumnAiKeyReason = function (table, column) {
        var columnAiKeys = self.getColumnAiKeys(table, column);
        var reasonTexts = [];
        if (columnAiKeys.primaryKey) {
            reasonTexts.push("AI PK: " + columnAiKeys.primaryKey.reason);
        }
        if (columnAiKeys.foreignKey) {
            reasonTexts.push("AI FK -> " + columnAiKeys.foreignKey.referencedTable + "." + columnAiKeys.foreignKey.referencedColumn + ": " + columnAiKeys.foreignKey.reason);
        }
        var columnAiKeyReason = reasonTexts.join("\n");
        return columnAiKeyReason;
    };

    // the pairs the AI did not keep as a foreign key of the column, for a column holding no foreign key, declared or found by
    // the AI; keys detected before the rejected pairs named their columns hold none
    self.getColumnRejectedPairs = function (table, column) {
        var tableKeys = self.currentConfig.currentDataSource ? self.currentConfig.currentDataSource.tableKeys : null;
        if (!tableKeys || !tableKeys.aiKeys) {
            return [];
        }
        var isDeclaredForeignKey = tableKeys.foreignKeys.some(function (keyColumn) {
            return keyColumn.table_name == table && keyColumn.column_name == column;
        });
        if (isDeclaredForeignKey || self.getColumnAiKeys(table, column).foreignKey) {
            return [];
        }
        var rejectedPairs = tableKeys.aiKeys.rejectedPairs || [];
        var columnRejectedPairs = rejectedPairs.filter(function (rejectedPair) {
            return rejectedPair.table == table && rejectedPair.column == column;
        });
        return columnRejectedPairs;
    };

    // { table, columns, reason } when the AI found no column identifying the object of the table, null otherwise; keys detected
    // before the tables without identifier were told apart hold none
    self.getTableWithoutIdentifier = function (table) {
        var tableKeys = self.currentConfig.currentDataSource ? self.currentConfig.currentDataSource.tableKeys : null;
        var tablesWithoutIdentifier = tableKeys && tableKeys.aiKeys ? tableKeys.aiKeys.tablesWithoutIdentifier || [] : [];
        var tableWithoutIdentifier = tablesWithoutIdentifier.find(function (aiTable) {
            return aiTable.table == table;
        });
        return tableWithoutIdentifier || null;
    };

    // a table declaring no primary key that the AI left without decision, even asked twice
    self.isTableUndecided = function (table) {
        var tableKeys = self.currentConfig.currentDataSource ? self.currentConfig.currentDataSource.tableKeys : null;
        var undecidedTables = tableKeys && tableKeys.aiKeys ? tableKeys.aiKeys.undecidedTables || [] : [];
        var isUndecided = undecidedTables.indexOf(table) > -1;
        return isUndecided;
    };

    // one reading of the keys waits at a time, whatever the data sources opened meanwhile
    self.aiKeysPollTimer = null;

    // tableKeys: { primaryKeys, foreignKeys, aiKeys, aiKeysStatus, aiKeysError }; the AI keys go in the config the mapping save
    // writes, so that the save keeps them
    self.setTableKeys = function (dataSource, tableKeys) {
        if (!self.currentConfig.currentDataSource || self.currentConfig.currentDataSource.id != dataSource) {
            return;
        }
        self.currentConfig.currentDataSource.tableKeys = tableKeys;
        if (tableKeys.aiKeys && self.rawConfig.databaseSources && self.rawConfig.databaseSources[dataSource]) {
            self.rawConfig.databaseSources[dataSource].aiKeys = tableKeys.aiKeys;
        }
        if (tableKeys.aiKeysStatus == "failed") {
            UI.message("keys of the database not found by the AI: " + tableKeys.aiKeysError);
        }
        clearTimeout(self.aiKeysPollTimer);
        if (tableKeys.aiKeysStatus == "running") {
            self.aiKeysPollTimer = setTimeout(function () {
                self.readAiKeysAgain(dataSource);
            }, self.aiKeysPollDelay);
        }
    };

    // the socket of the page follows the steps of a running detection
    self.getTableKeysUrl = function (dataSource) {
        var tableKeysParams = new URLSearchParams({ databaseId: dataSource, source: AIMappingModeler.currentSLSsource, clientSocketId: Config.clientSocketId || "" });
        var tableKeysUrl = Config.apiUrl + "/ai/aiMappingModeler/tableKeys?" + tableKeysParams.toString();
        return tableKeysUrl;
    };

    // keyDetectionStep: { databaseId, message }
    self.showKeyDetectionStep = function (keyDetectionStep) {
        if (MainController.currentTool != "AIMappingModeler" || !self.currentConfig.currentDataSource || self.currentConfig.currentDataSource.id != keyDetectionStep.databaseId) {
            return;
        }
        UI.message(keyDetectionStep.message);
    };

    // the column tree is updated where it stands, no page or tree is reloaded
    self.readAiKeysAgain = function (dataSource) {
        if (!self.currentConfig.currentDataSource || self.currentConfig.currentDataSource.id != dataSource) {
            return;
        }
        $.ajax({
            type: "GET",
            url: self.getTableKeysUrl(dataSource),
            dataType: "json",
            success: function (tableKeys) {
                self.setTableKeys(dataSource, tableKeys);
                if (tableKeys.aiKeysStatus == "done") {
                    AIMappingModeler.updateColumnNodeTexts();
                    if ($("#" + AIDatabaseSchemaGraph.graphDiv).css("display") != "none") {
                        AIDatabaseSchemaGraph.drawDatabaseSchema();
                    }
                }
            },
            error: function (err) {
                UI.message("keys found by the AI not read: " + (err.responseJSON ? err.responseJSON.error : err.statusText));
            },
        });
    };

    /**
     * Loads the tables of a database source into the current configuration and adds them to the Jstree.
     * @function
     * @name loadDataBaseSourceTables
     * @memberof module:AIDataSourceManager
     * @param {string} dataSource - The id of the database source.
     * @param {string} sqlType - The SQL type of the database source.
     * @param {Function} [callback] - A callback function to be executed after the tables are loaded.
     * @returns {void}
     */
    self.loadDataBaseSourceTables = function (dataSource, sqlType, callback) {
        async.series(
            [
                function (callbackSeries) {
                    const params = new URLSearchParams({
                        name: dataSource,
                        type: sqlType,
                        withTypes: "true",
                    });
                    $.ajax({
                        type: "GET",
                        url: Config.apiUrl + "/kg/model?" + params.toString(),
                        dataType: "json",
                        success: function (columnTypesByTable, _textStatus, _jqXHR) {
                            var tables = {};
                            for (var table in columnTypesByTable) {
                                tables[table] = Object.keys(columnTypesByTable[table]);
                            }
                            self.currentDataSourceModel = tables;
                            self.currentSource = self.dataSource;
                            self.currentdabase = { type: sqlType, dbName: self.dataSource };
                            self.currentConfig.currentDataSource.tables = tables;
                            self.currentConfig.currentDataSource.columnTypes = columnTypesByTable;
                            callbackSeries();
                        },
                        error: function (err) {
                            return callbackSeries(err);
                        },
                    });
                },

                // the column tree shows the keys of each column; without them it lists the columns alone
                function (callbackSeries) {
                    self.currentConfig.currentDataSource.tableKeys = null;
                    $.ajax({
                        type: "GET",
                        url: self.getTableKeysUrl(dataSource),
                        dataType: "json",
                        success: function (tableKeys) {
                            self.setTableKeys(dataSource, tableKeys);
                            callbackSeries();
                        },
                        error: function (err) {
                            UI.message("keys of the database not read: " + (err.responseJSON ? err.responseJSON.error : err.statusText));
                            callbackSeries();
                        },
                    });
                },

                function (callbackSeries) {
                    var jstreeData = [];
                    var dataTables = AIMappingColumnsGraph.getDatasourceTablesFromVisjsGraph();
                    for (var table in self.currentConfig.currentDataSource.tables) {
                        var label = table;
                        var color = "blue";
                        if (dataTables.includes(table)) {
                            var nTriples = self.statsMap[table];
                            var strStats = "";
                            if (nTriples) {
                                color = "green";
                                strStats = "<b> " + nTriples + " Triples</b>";
                            }

                            label = "<span style='color:blue'>" + table + strStats + "</span>";
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
                    return MainController.errorAlert(err);
                }
                if (callback) {
                    callback();
                }
            },
        );
    };

    /**
     * Tells whether a configured database carries the name written in a mapping file.
     * Mapping files store either the ConfigEditor name or the database name, depending on their age.
     * @function
     * @name isDatabaseNamed
     * @memberof module:AIDataSourceManager
     * @param {Object} database - A database descriptor with its name and database fields.
     * @param {string} mappingDatabaseName - The name written in options.config.databaseSources of the mapping.
     * @returns {boolean} true if one of the two fields matches.
     */
    self.isDatabaseNamed = function (database, mappingDatabaseName) {
        return database.name == mappingDatabaseName || database.database == mappingDatabaseName;
    };

    /**
     * Replaces a stale database id of the mapping by the id of the configured database carrying the same name.
     * The user confirms the replacement, or picks the id when several databases carry that name.
     * The id is replaced in options.config.databaseSources and in the datasource of every node and edge,
     * then the mapping is saved and reloaded.
     * @function
     * @name relinkDatabaseSource
     * @memberof module:AIDataSourceManager
     * @param {string} staleDatabaseId - The database id written in the mapping file.
     * @param {string} mappingDatabaseName - The database name written in the mapping file.
     * @param {Function} callback - Called with (err, isRelinked), isRelinked is false when no database matches or the user declines.
     * @returns {void}
     */
    self.relinkDatabaseSource = function (staleDatabaseId, mappingDatabaseName, callback) {
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/databases",
            dataType: "json",
            success: function (result) {
                var homonymDatabases = result.resources.filter(function (database) {
                    return self.isDatabaseNamed(database, mappingDatabaseName);
                });
                if (homonymDatabases.length == 0) {
                    return callback(null, false);
                }

                var staleIdMessage = "The database id " + staleDatabaseId + " of the mapping does not match a database named " + mappingDatabaseName + " in ConfigEditor > Databases.";
                var newDatabase = null;
                if (homonymDatabases.length == 1) {
                    if (confirm(staleIdMessage + "\nReplace it with " + homonymDatabases[0].id + " (" + homonymDatabases[0].name + ")?")) {
                        newDatabase = homonymDatabases[0];
                    }
                } else {
                    var choiceLines = homonymDatabases.map(function (database, index) {
                        return index + 1 + ": " + database.id + " (" + database.name + ")";
                    });
                    var choiceList = choiceLines.join("\n");
                    var choice = prompt(staleIdMessage + "\nSeveral databases are named " + mappingDatabaseName + ", enter the number of the one to use:\n" + choiceList);
                    newDatabase = homonymDatabases[parseInt(choice) - 1] || null;
                }
                if (!newDatabase) {
                    return callback(null, false);
                }

                self.rawConfig.databaseSources[newDatabase.id] = self.rawConfig.databaseSources[staleDatabaseId];
                delete self.rawConfig.databaseSources[staleDatabaseId];
                // older mappings spell the field dataSource
                var carriesStaleId = function (item) {
                    return item.data && (item.data.datasource == staleDatabaseId || item.data.dataSource == staleDatabaseId);
                };
                var visjsData = AIMappingColumnsGraph.visjsGraph.data;
                var staleNodes = visjsData.nodes.get({ filter: carriesStaleId });
                var staleEdges = visjsData.edges.get({ filter: carriesStaleId });
                var staleItems = staleNodes.concat(staleEdges);
                staleItems.forEach(function (item) {
                    if (item.data.datasource == staleDatabaseId) {
                        item.data.datasource = newDatabase.id;
                    }
                    if (item.data.dataSource == staleDatabaseId) {
                        item.data.dataSource = newDatabase.id;
                    }
                });
                visjsData.nodes.update(staleNodes);
                visjsData.edges.update(staleEdges);

                self.saveSlsvSourceConfig(function (err) {
                    if (err) {
                        return callback(err);
                    }
                    UI.message("Database id replaced with " + newDatabase.id + ", select the data source again", true);
                    AIMappingModeler.onLoaded();
                    callback(null, true);
                });
            },
            error: function (err) {
                callback(err);
            },
        });
    };

    /**
     * Handles the selection of a node in the Jstree, which represents different types of data sources, including databases, CSVs, and tables.
     * It updates the configuration and loads the corresponding data source or table based on the selection.
     * Also handles UI updates for the mapping modeler and left panel tabs.
     * @function
     * @name onDataSourcesJstreeSelect
     * @memberof module:AIDataSourceManager
     * @param {Object} event - The event object triggered by the selection.
     * @param {Object} obj - The Jstree node object containing details about the selected node.
     * @returns {void}
     */
    self.onDataSourcesJstreeSelect = function (event, obj, callback) {
        AIMappingModeler.currentTreeNode = obj.node;
        if (obj.event && obj.event.button == 2) {
            return;
        }
        AIDatabaseSchemaGraph.showMappingGraph();

        // above every data source: the current table stays the one columns are added to
        if (obj.node.data.type == self.allDataSourcesNodeId) {
            return AIMappingColumnsGraph.showAllNodes();
        }
        // "databaseSources" and "csvSources" group the data sources of the tree
        if (obj.node.data.type == "sourceType") {
            return AIMappingColumnsGraph.showDataSourcesTables(obj.node.children);
        }

        // the branches below reassign it, except a database source which has no table yet
        AIMappingModeler.currentTable = null;

        if (obj.node.data.type == "databaseSource") {
            AIMappingColumnsGraph.showDataSourcesTables([obj.node.id]);
            AIDataSourceManager.initNewDataSource(obj.node.id, "databaseSource", obj.node.data.sqlType, obj.node.data.table);

            AIDataSourceManager.loadDataBaseSource(AIDataSourceManager.currentSlsvSource, obj.node.id, obj.node.data.sqlType, function () {
                AIDatabaseSchemaGraph.drawDatabaseSchema();
                if (callback) {
                    callback();
                }
            });
        } else if (obj.node.data.type == "csvSource") {
            AIDataSourceManager.initNewDataSource(obj.node.id, "csvSource", obj.node.data.sqlType, obj.node.id);
            var fileName = AIDataSourceManager.currentSlsvSource;
            AIDataSourceManager.loadCsvSource(AIDataSourceManager.currentSlsvSource, obj.node.id, false, function (err, columns) {
                if (err) {
                    return alert(err.responseText || err);
                    //  return alert("file not found");
                }

                AIMappingModeler.currentResourceType = "Column";
                AIMappingModeler.currentTable = {
                    name: obj.node.id,
                    columns: columns,
                };
                $("#MappingModeler_leftTabs").tabs("option", "active", 1);

                AIUIcontroller.onActivateLeftPanelTab("MappingModeler_columnsTab", callback);
            });
        } else if (obj.node.data.type == "table") {
            AIMappingModeler.currentTable = {
                name: obj.node.data.label,
                columns: AIDataSourceManager.currentConfig.currentDataSource.tables[obj.node.data.id],
            };
            var table = obj.node.data.id;
            AIDataSourceManager.currentConfig.currentDataSource.currentTable = table;

            //self.hideForbiddenResources("Table");
            AIMappingModeler.currentResourceType = "Column";
            $("#MappingModeler_leftTabs").tabs("option", "active", 1);
            AIUIcontroller.onActivateLeftPanelTab("MappingModeler_columnsTab", callback);
        }

        var dataSourceLabel = obj.node.data.id;
        if (obj.node.type == "Table") {
            var parentDataSourceName = $("#" + self.dataSourcejstreeDivId)
                .jstree()
                .get_node(obj.node.parent).text;
            dataSourceLabel = parentDataSourceName + " : " + obj.node.data.id;
        }
        $("#MappingModeler_currentDataSource").html(dataSourceLabel);

        if (obj.node.data.type == "table" || obj.node.data.type == "csvSource") {
            var table = obj.node.data.id;
            AIMappingColumnsGraph.zoomOnTable(table);
            if (!AIMappingColumnsGraph.visjsGraph.data.nodes.get(table)) {
                var tableNode = AIMappingColumnsGraph.getVisjsTableNode(table);
                AIMappingColumnsGraph.drawResource(tableNode);
            }
        }
        /*if (callback) {
            callback();
        }*/
    };

    /**
     * Saves the current configuration of the SlsvSource by using the AIMappingColumnsGraph save function.
     * Calls the provided callback once the saving operation is complete.
     * @function
     * @name saveSlsvSourceConfig
     * @memberof module:AIDataSourceManager
     * @param {Function} callback - The callback to invoke after saving the configuration.
     * @returns {void}
     */
    self.saveSlsvSourceConfig = function (callback) {
        AIMappingColumnsGraph.saveVisjsGraphWithConfig(callback);
    };

    /*********************************************************************************/
    /***functions linked to REACT**/
    // see assets/aiMappingModeler_upload_app.js
    /***********************************************************************************/
    // imports React app
    import("/assets/aiMappingModeler_upload_app.js");

    /**
     * Displays the upload form app for uploading database or CSV sources.
     * Depending on the form type, it loads the appropriate form and handles initialization of the React app.
     * @function
     * @name displayUploadApp
     * @memberof module:AIDataSourceManager
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
        var html = ' <div style="width:500px;height: 400px" id="mount-aiMappingModeler-upload-app-here"></div>';
        $("#smallDialogDiv").html(html);

        $("#smallDialogDiv").dialog({
            open: function (event, ui) {
                if (self.createApp === null) {
                    throw new Error("React app is not initialized see assets/aiMappingModeler_upload_app.js");
                }

                self.uploadFormData.currentSource = AIMappingModeler.currentSLSsource;

                self.umountKGUploadApp = self.createApp(self.uploadFormData);
            },
            beforeClose: function () {
                //Unmont app and free smallDialogDiv from events else react will take control of dialog
                self.umountKGUploadApp();
                $("#smallDialogDiv").dialog({
                    open: function (event, ui) {},
                    beforeClose: function () {},
                });

                AIDataSourceManager.currentSlsvSource = AIMappingModeler.currentSLSsource;

                AIDataSourceManager.getSlsvSourceConfig(AIMappingModeler.currentSLSsource, function (err, result) {
                    if (err) {
                        return err;
                    }

                    AIDataSourceManager.currentConfig = result;
                });
            },
        });

        UI.openDialog("smallDialogDiv", { title: "Add DataBase" });
        UI.clampAndCenterDialog("smallDialogDiv");
    };

    /**
     * Creates mappings for a selected database source.
     * Closes the upload app dialog, adds the selected database source to the current configuration,
     * and saves the updated configuration. Calls the provided callback once the operation is complete.
     * @function
     * @name createDataBaseSourceMappings
     * @memberof module:AIDataSourceManager
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
        AIDataSourceManager.currentConfig.databaseSources[datasource.id] = { name: datasource.name };
        AIDataSourceManager.rawConfig.databaseSources[datasource.id] = { name: datasource.name };
        AIDataSourceManager.saveSlsvSourceConfig(function (err, result) {
            if (err) {
                return MainController.errorAlert(err);
            }
            AIMappingModeler.onLoaded();
            // self.addDataSourceToJstree("databaseSource", datasource, "sql.sqlserver");
        });
    };

    /**
     * Creates mappings for a selected CSV source.
     * Closes the upload app dialog, adds the selected CSV source to the current configuration,
     * and saves the updated configuration. Calls the provided callback once the operation is complete.
     * @function
     * @name createCsvSourceMappings
     * @memberof module:AIDataSourceManager
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

        AIDataSourceManager.currentConfig.csvSources[datasourceName] = {};
        AIDataSourceManager.rawConfig = AIDataSourceManager.currentConfig;

        AIDataSourceManager.saveSlsvSourceConfig(function (err, result) {
            if (err) {
                return MainController.errorAlert(err);
            }
            AIMappingModeler.onLoaded();
        });
    };

    /**
     * Deletes a data source (either database or CSV) from the configuration.
     * Removes the data source from the raw configuration, updates the JSTree,
     * and removes related nodes and edges from the graph. The updated configuration
     * is then saved. If the source is a CSV, additional steps would be taken to remove the file.
     * @function
     * @name deleteDataSource
     * @memberof module:AIDataSourceManager
     * @param {Object} jstreeNode - The JSTree node representing the data source to be deleted.
     * @returns {void}
     */
    self.deleteDataSource = function (jstreeNode) {
        var datasourceName = jstreeNode.id;
        var isCsv = jstreeNode.data.type == "csvSource";

        if (jstreeNode.data.type == "databaseSource") {
            if (AIDataSourceManager.rawConfig.databaseSources[datasourceName]) {
                delete AIDataSourceManager.rawConfig.databaseSources[datasourceName];
                JstreeWidget.deleteNode("mappingModeler_dataSourcesJstreeDiv", jstreeNode.id);
            }
        } else if (isCsv) {
            if (AIDataSourceManager.rawConfig.csvSources[datasourceName]) {
                delete AIDataSourceManager.rawConfig.csvSources[datasourceName];
                JstreeWidget.deleteNode("mappingModeler_dataSourcesJstreeDiv", jstreeNode.id);
            }
        } else {
            return;
        }

        AIDataSourceManager.saveSlsvSourceConfig(function (err, result) {
            if (err) {
                return MainController.errorAlert(err);
            }

            var newNodes = [];
            AIMappingColumnsGraph.visjsGraph.data.nodes.get().forEach(function (node) {
                if (node.data.datasource != datasourceName) {
                    newNodes.push(node);
                } else {
                    AIMappingColumnsGraph.visjsGraph.data.nodes.remove(node);
                }
            });
            var newNodesIds = newNodes.map(function (node) {
                return node.id;
            });
            AIMappingColumnsGraph.visjsGraph.data.edges.get().forEach(function (edge) {
                if (newNodesIds.includes(edge.from) && newNodesIds.includes(edge.to)) {
                    // node to keep
                } else {
                    AIMappingColumnsGraph.visjsGraph.data.edges.remove(edge);
                }
            });
            AIMappingColumnsGraph.saveVisjsGraphWithConfig(function () {
                if (isCsv) {
                    var csvDir = "CSV/" + AIMappingModeler.currentSLSsource;
                    $.ajax({
                        type: "DELETE",
                        url:
                            Config.apiUrl +
                            "/data/file?dir=" +
                            encodeURIComponent(csvDir) +
                            "&fileName=" +
                            encodeURIComponent(datasourceName) +
                            "&source=" +
                            encodeURIComponent(AIMappingModeler.currentSLSsource),
                        dataType: "json",
                        success: function (_result) {
                            AIMappingModeler.onLoaded();
                        },
                        error: function (jqXHR) {
                            if (jqXHR.status === 403) {
                                alert("You don't have right to delete");
                            }
                            AIMappingModeler.onLoaded();
                        },
                    });
                } else {
                    AIMappingModeler.onLoaded();
                }
            });
        });
    };

    self.deleteTableMappings = function () {
        var tableNode = AIMappingModeler.currentTreeNode;
        var table = tableNode.data.id;
        if (!confirm("delete all mappings for table" + table)) {
            return;
        } else if (!confirm("are you sure ? this table mappings will be lost")) {
            return;
        }
        var nodesToRemove = [];
        var edgesToRemove = [];
        AIMappingColumnsGraph.visjsGraph.data.nodes.forEach(function (node) {
            if (node.data && node.data.dataTable == table) {
                nodesToRemove.push(node.id);
                edgesToRemove = edgesToRemove.concat(AIMappingColumnsGraph.visjsGraph.network.getConnectedEdges(node.id));
            }
        });
        AIMappingColumnsGraph.visjsGraph.data.nodes.remove(nodesToRemove);
        AIMappingColumnsGraph.visjsGraph.data.edges.remove(edgesToRemove);
        AIMappingColumnsGraph.saveVisjsGraph();
        // reload table
        //   self.onDataSourcesJstreeSelect(null, {node: tableNode})

        var text = AIMappingModeler.currentTreeNode.text.replace("style='color:blue'", "");
        $("#" + self.dataSourcejstreeDivId).jstree("rename_node", AIMappingModeler.currentTreeNode, text);
    };
    /**
     *  retreives stats about each table
     *
     * @param source
     */
    self.getTriplesStats = function (source, callback) {
        var fromStr = Sparql_common.getFromStr(source);
        var query =
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
            "SELECT (count(?sub) as ?triples) ?table  " +
            fromStr +
            " WHERE {\n" +
            "  ?sub ?pred ?obj . ?sub <http://souslesens.org/KGcreator#mappingFile> ?table\n" +
            "} group by ?table";

        var url = Config.sources[source].sparql_server.url + "?format=json&query=";
        UI.message("getting table triples stat...");
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: source }, function (err, result) {
            UI.message("");
            if (err) {
                return callback(err);
            }
            var statsMap = {};
            result.results.bindings.forEach(function (item) {
                statsMap[item.table.value] = item.triples.value;
            });
            self.statsMap = statsMap;
            self.statsMapBySource[source] = statsMap;
            return callback(null, statsMap);
        });
    };

    /**
     * Patches CSV datasource labels in the tree with fresh triple counts, without rebuilding the tree.
     * Database table labels read self.statsMap lazily on expand, so they need no patching here.
     * @param {object} statsMap map: datasource/table name -> triples count
     */
    self.updateTreeStats = function (statsMap) {
        if (!statsMap || !self.dataSourcejstreeDivId) {
            return;
        }
        var tree = $("#" + self.dataSourcejstreeDivId).jstree(true);
        if (!tree) {
            return;
        }
        for (var tableName in statsMap) {
            var node = tree.get_node(tableName);
            if (!node) {
                continue;
            }
            var nTriples = statsMap[tableName];
            var strStats = nTriples ? "<b> " + nTriples + " Triples</b>" : "";
            var label = "<span style='color:blue'>" + tableName + strStats + "</span>";
            tree.rename_node(node, label);
        }
    };
    return self;
})();

export default AIDataSourceManager;
window.AIDataSourceManager = AIDataSourceManager;
