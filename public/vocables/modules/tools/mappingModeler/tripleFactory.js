import KGcreator_run from "../KGcreator/KGcreator_run.js";
import MappingsDetails from "./mappingsDetails.js";

import MappingTransform from "./mappingTransform.js";
import MappingModeler from "./mappingModeler.js";
import Export from "../../shared/export.js";
import UIcontroller from "./uiController.js";
import DataSourceManager from "./dataSourcesManager.js";
import OntologyModels from "../../shared/ontologyModels.js";
import MappingColumnsGraph from "./mappingColumnsGraph.js";

/**
 * The TripleFactory module handles the creation, filtering, and writing of RDF triples.
 * It includes functions for generating sample triples, creating all mappings triples, and indexing the graph.
 * @module TripleFactory
 * @see [Tutorial: Overview]{@tutorial overview}
 */
var TripleFactory = (function () {
    var self = {};

    /**
     * Indexes the RDF graph using the KGcreator_run module.
     * @function
     * @name indexGraph
     * @memberof module:TripleFactory
     */
    self.indexGraph = function () {
        KGcreator_run.indexGraph();
    };

    /**
     * Displays a dialog for filtering mappings, allowing the user to choose between sample and actual triples.
     * The dialog is populated with a tree view of detailed mappings that can be filtered by the user.
     * @function
     * @name initFilterMappingDialog
     * @memberof module:TripleFactory
     * @param {boolean} isSample - If true, the dialog is for displaying sample mappings; if false, for writing actual triples.
     */
    self.initFilterMappingDialog = function (isSample, isDelete) {
        self.filterMappingIsSample = isSample;
        self.filterMappingIsDelete = isDelete;
        UIcontroller.activateRightPanel("generic");
        // save current mappings before opening the dialog
        MappingColumnsGraph.saveVisjsGraph(function () {
            var htmlToLoad = "./modules/tools/mappingModeler/html/filterMappingDialog.html";
            if (isDelete) {
                htmlToLoad = "./modules/tools/mappingModeler/html/specificMappingDelete.html";
            }
            $("#mappingModeler_genericPanel").load(htmlToLoad, function () {
                self.showFilterMappingsDialog("detailedMappings_filterMappingsTree", MappingModeler.currentTable.name);
            });
        });
    };

    /**
     * Runs the filtered mappings for the SLS (Semantic Linked Set) based on the selected nodes in the tree view.
     * It filters and creates unique mappings by checking the selected attributes and mapping nodes.
     * @function
     * @name runSlsFilteredMappings
     * @memberof module:TripleFactory
     */
    self.runSlsFilteredMappings = function (isSample) {
        var checkedNodes = JstreeWidget.getjsTreeCheckedNodes("detailedMappings_filterMappingsTree");
        if (checkedNodes.length == 0) {
            return alert(" no mappings selected");
        }
        var filterMappingIds = [];
        checkedNodes.forEach(function (item) {
            filterMappingIds.push(item.id);
        });
        try {
            var offset = parseInt($("#mappingTripleFactory_offset").val());
        } catch (err) {
            return MainController.errorAlert(err);
        }

        TripleFactory.createTriples(
            isSample,
            MappingModeler.currentTable.name,
            {
                filterMappingIds: filterMappingIds,
                offset: offset,
            },
            function (err, result) {
                if (err) {
                    MainController.errorAlert(err);
                } else {
                    // UI.message("Done", true);
                    var indexAuto = $("#MappingModeler_indexAutoCBX").prop("checked");

                    if (!self.filterMappingIsSample && indexAuto) {
                        SearchUtil.generateElasticIndex(
                            MappingModeler.currentSLSsource,
                            {
                                indexProperties: 1,
                                indexNamedIndividuals: 1,
                            },
                            () => {
                                $.ajax({
                                    type: "DELETE",
                                    url: `${Config.apiUrl}/ontologyModels?source=${MappingModeler.currentSLSsource}`,

                                    dataType: "json",
                                    success: function (result, _textStatus, _jqXHR) {
                                        delete Config.ontologiesVocabularyModels[MappingModeler.currentSLSsource];

                                        //    UI.message("ALL DONE");
                                    },
                                    error: function (err) {
                                        if (callback) {
                                            return callback(err);
                                        }
                                        UI.message(err.responseText);
                                    },
                                });
                            },
                        );
                    }
                }
            },
        );
    };

    /**
     * Checks if the current table is valid and if its mappings details are loaded.
     * Prompts the user to select a table or load the mappings details if they are not available.
     * @function
     * @name checkCurrentTable
     * @memberof module:TripleFactory
     * @returns {boolean} - Returns true if the current table is valid and its mappings details are loaded, otherwise false.
     */
    self.checkCurrentTable = function () {
        //obsolete avec le systeme des definedInColumn
        return true;

        var check = false;
        if (!MappingModeler.currentTable) {
            alert("select a table or a csv source");
        }
        var mappingsDetailsIsLoaded = false;
        MappingColumnsGraph.visjsGraph.data.nodes.get().forEach(function (node) {
            if (node?.data?.dataTable === MappingModeler.currentTable.name) {
                if (node.data.uriType) {
                    mappingsDetailsIsLoaded = true;
                }
            }
        });
        if (mappingsDetailsIsLoaded) {
            check = true;
        } else {
            alert("Mappings details are not loaded for this table. Please load mappings details first");
            MappingsDetails.showDetailsDialog();
        }
        return check;
    };

    /**
     * Deletes triples created by KGCreator from the datasource.
     * Confirms with the user before deleting triples, and sends a DELETE request to the API.
     * @function
     * @name deleteTriples
     * @memberof module:TripleFactory
     * @param {boolean} all - Indicates whether to delete all triples or just for the current table.
     * @param {function} [callback] - A callback function to be executed after the deletion process.
     */
    self.deleteTriples = function (all, callback) {
        var tables = [];
        if (!all) {
            if (!self.checkCurrentTable) {
                return;
            }
            if (!confirm("Do you really want to delete  triples created with KGCreator in datasource " + DataSourceManager.currentConfig.currentDataSource.name)) {
                return;
            }

            tables.push(MappingModeler.currentTable.name);
        } else {
            if (!confirm("Do you really want to delete  triples created with KGCreator in SLS source " + DataSourceManager.currentSlsvSource)) {
                return;
            }
        }

        var payload = {
            source: DataSourceManager.currentSlsvSource,
            tables: JSON.stringify(tables),
        };
        if (Config.clientSocketId) {
            payload.options = JSON.stringify({ clientSocketId: Config.clientSocketId });
        }
        UI.message("deleting KGcreator  triples...");
        $.ajax({
            type: "DELETE",
            url: `${Config.apiUrl}/kg/triples`,
            data: payload,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                MappingModeler.clearSourceClasses(DataSourceManager.currentSlsvSource);
                if (callback) {
                    return callback();
                } else {
                    alert(result.result);
                }
                MappingModeler.socketMessage({
                    operation: "finished",
                });
                UI.message(result.result);
                self.refreshTabStat();

                // JstreeWidget.loadJsTree(jstreeDiv, jstreeData, options, function () {
                //     $("#MappingModeler_dataSourcesTab").css("margin-top", "0px");
                // });
            },
            error: function (err) {
                if (callback) {
                    return callback(err);
                } else {
                    MainController.errorAlert(err);
                }
                UI.message(err.responseText);
            },
        });
    };
    self.refreshTabStat = function (callback) {
        var tableStatsMap = {};

        DataSourceManager.getTriplesStats(DataSourceManager.currentSlsvSource, function (err, result) {
            tableStatsMap = result || {};
            DataSourceManager.loaDataSourcesJstree(MappingModeler.jstreeDivId, tableStatsMap, function (err) {
                return callback;
            });
        });
    };

    /**
     * Creates triples for a given table using the selected mappings.
     * Confirms with the user before creating triples, and sends a POST request to the API.
     * @function
     * @name createTriples
     * @memberof module:TripleFactory
     * @param {boolean} sampleData - Indicates whether to create sample data triples or full triples.
     * @param {string} table - The table for which to create triples.
     * @param {Object} [options] - Options for creating triples, such as sample size and filter options.
     * @param {boolean} [options.deleteOldGraph=false] - If true, deletes the existing graph before creating new triples.
     * @param {number} [options.sampleSize=500] - The number of sample triples to create if `sampleData` is true.
     * @param {string} [options.clientSocketId] - The client socket ID for real-time updates.
     * @param {Object} [options.mappingsFilter] - Filters for selecting specific mappings.
     * @param {Object} [options.filteredMappings] - Alternative mapping filter.
     * @param {boolean} [options.deleteTriples=false] - If true, deletes existing triples before creation.
     * @param {function} callback - A callback function to be executed after the triples creation process.
     */
    self.createTriples = function (sampleData, table, options, callback) {
        if (!options) {
            options = {};
        }
        if (!sampleData && table !== "*") {
            if (!confirm("create triples for " + DataSourceManager.currentConfig.currentDataSource.name + " " + table || "")) {
                return;
            }
        }

        if (sampleData) {
            options.deleteOldGraph = false;
            options.sampleSize = 500;
        } else {
            options.deleteOldGraph = false;
        }

        if (Config.clientSocketId) {
            options.clientSocketId = Config.clientSocketId;
        }
        if (table === "*") {
            options = {};
            table = null;
        }

        if (options.filteredMappings) {
            options.mappingsFilter = options.filteredMappings;
        }
        var payload = {
            source: DataSourceManager.currentSlsvSource,
            datasource: DataSourceManager.currentConfig.currentDataSource.id,
            table: table,
            options: JSON.stringify(options),
        };

        UI.message("creating triples...");
        $.ajax({
            type: "POST",
            url: `${Config.apiUrl}/kg/triples`,
            data: payload,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                if (sampleData) {
                    UIcontroller.activateRightPanel("generic");
                    self.showTriplesInDataTable(result, "mappingModeler_genericPanel");
                    //   UI.message("", true);
                } else {
                    if (options.deleteTriples) {
                        $("#KGcreator_infosDiv").val(result.result);
                        UI.message(result.result, true);
                    } else {
                        var message = result.totalTriplesCount[MappingModeler.currentTable.name] + " triples created in graph " + DataSourceManager.currentConfig.graphUri;
                        TripleFactory.refreshTabStat();
                        alert(message);
                        //  UI.message(message, true);
                    }
                }
                if (callback) {
                    return callback();
                }
            },
            error(err) {
                if (callback) {
                    return callback(err.responseText);
                }
                return MainController.errorAlert(err);
            },
        });
    };

    function getCurrentSource() {
        if (DataSourceManager && DataSourceManager.currentSlsvSource) {
            return DataSourceManager.currentSlsvSource;
        }
        return null;
    }

    function getDbTables() {
        try {
            if (DataSourceManager && DataSourceManager.currentConfig && DataSourceManager.currentConfig.currentDataSource && DataSourceManager.currentConfig.currentDataSource.tables) {
                return Object.keys(DataSourceManager.currentConfig.currentDataSource.tables);
            }
        } catch (e) {}
        return [];
    }

    function getCsvTables() {
        try {
            if (DataSourceManager && DataSourceManager.currentConfig && DataSourceManager.currentConfig.csvSources) {
                return Object.keys(DataSourceManager.currentConfig.csvSources);
            }
        } catch (e) {}
        return [];
    }

    function getStatsMap() {
        if (DataSourceManager && DataSourceManager.statsMap) {
            return DataSourceManager.statsMap;
        }
        return {};
    }

    function buildOptions() {
        var options = {};
        if (typeof Config !== "undefined" && Config && Config.clientSocketId) {
            options.clientSocketId = Config.clientSocketId;
        }
        return options;
    }

    function ajaxRecreate(payload, onSuccess, onError) {
        $.ajax({
            type: "POST",
            url: "/api/v1/kg/mappings/recreateTriples",
            data: JSON.stringify(payload),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function (data) {
                if (onSuccess) onSuccess(data);
            },
            error: function (xhr) {
                var msg = "Internal Server Error";
                try {
                    if (xhr && xhr.responseJSON && xhr.responseJSON.error) {
                        msg = xhr.responseJSON.error;
                    } else if (xhr && xhr.responseText) {
                        msg = xhr.responseText;
                    }
                } catch (e) {}
                if (onError) onError(xhr, msg);
            },
        });
    }

    function attachRecreateDeleteProgressListener() {
        if (!window.SocketManager || !SocketManager.socket) {
            return null;
        }

        var handler = function (msg) {
            // msg = {tableTotalRecords, operation:'deleteTriples', totalSize}
            if (!msg || msg.operation !== "deleteTriples") {
                return;
            }

            UI.message("Delete progress: " + msg.totalSize + " / " + msg.tableTotalRecords);
        };

        SocketManager.socket.on("KGbuilder", handler);

        return function detach() {
            try {
                SocketManager.socket.off("KGbuilder", handler);
            } catch (e) {
                try {
                    SocketManager.socket.removeListener("KGbuilder", handler);
                } catch (e2) {}
            }
        };
    }

    self.recreateAllTablesTriples = function (source, optionsObj) {
        var payload = {
            source: source,
            options: JSON.stringify(optionsObj || {}),
        };
        var detach = attachRecreateDeleteProgressListener();
        ajaxRecreate(
            payload,
            function (data) {},
            function (xhr, msg) {
                console.error("Recreate ALL ERROR", xhr);
                alert(msg);
            },
        );
    };

    self.recreateOneTableTriples = function (source, table, optionsObj, doneCb) {
        var payload = {
            source: source,
            table: table,
            options: JSON.stringify(optionsObj || {}),
        };
        var detach = attachRecreateDeleteProgressListener();
        ajaxRecreate(
            payload,
            function (data) {
                if (doneCb) doneCb(null, data);
            },
            function (xhr, msg) {
                console.error("Recreate table ERROR:", table, xhr);
                alert("Error recreating table " + table + "\n\n" + msg);
                if (doneCb) doneCb(new Error(msg));
            },
        );
    };

    self.recreateSelectedTablesTriples = function (source, tables, optionsObj) {
        if (!Array.isArray(tables) || tables.length === 0) {
            return alert("No table selected");
        }

        var i = 0;

        function next() {
            if (i >= tables.length) {
                console.log("Recreate selected finished");
                return;
            }

            var t = tables[i];
            i++;

            self.recreateOneTableTriples(source, t, optionsObj, function (err) {
                if (err) return;
                next();
            });
        }

        next();
    };

    /**
     * Generates KGcreator triples for the entire datasource, deleting any previous triples before creating new ones.
     * It proceeds with a series of steps: deleting old triples, creating new triples, and reindexing the graph.
     *
     * @function
     * @name recreateGraphSelectTables
     * @memberof module:TripleFactory
     */

    function getCurrentSource() {
        if (DataSourceManager && DataSourceManager.currentSlsvSource) {
            return DataSourceManager.currentSlsvSource;
        }
        return null;
    }

    function getDbTables() {
        try {
            if (DataSourceManager && DataSourceManager.currentConfig && DataSourceManager.currentConfig.currentDataSource && DataSourceManager.currentConfig.currentDataSource.tables) {
                return Object.keys(DataSourceManager.currentConfig.currentDataSource.tables);
            }
        } catch (e) {}
        return [];
    }

    function getCsvTables() {
        try {
            if (DataSourceManager && DataSourceManager.currentConfig && DataSourceManager.currentConfig.csvSources) {
                return Object.keys(DataSourceManager.currentConfig.csvSources);
            }
        } catch (e) {}
        return [];
    }

    function getStatsMap() {
        if (DataSourceManager && DataSourceManager.statsMap) {
            return DataSourceManager.statsMap;
        }
        return {};
    }

    function buildOptions() {
        var options = {};
        if (typeof Config !== "undefined" && Config && Config.clientSocketId) {
            options.clientSocketId = Config.clientSocketId;
        }
        return options;
    }

    function getTablesWithMappingsMap() {
        var map = {};
        try {
            if (!MappingColumnsGraph || !MappingColumnsGraph.visjsGraph || !MappingColumnsGraph.visjsGraph.data || !MappingColumnsGraph.visjsGraph.data.nodes) {
                return map;
            }

            var nodes = MappingColumnsGraph.visjsGraph.data.nodes.get();
            if (!Array.isArray(nodes)) {
                return map;
            }

            var allowedTypes = [];
            if (MappingModeler && Array.isArray(MappingModeler.columnsMappingsObjects)) {
                allowedTypes = MappingModeler.columnsMappingsObjects;
            }

            nodes.forEach(function (n) {
                if (!n || !n.data) return;

                if (allowedTypes.length > 0) {
                    if (allowedTypes.indexOf(n.data.type) < 0) return;
                }

                if (n.data.dataTable) {
                    map[n.data.dataTable] = true;
                }
            });
        } catch (e) {}
        return map;
    }

    function filterTablesHavingMappings(allTables) {
        var tablesWithMappings = getTablesWithMappingsMap();
        var out = [];

        allTables.forEach(function (t) {
            if (tablesWithMappings[t]) {
                out.push(t);
            }
        });

        return out;
    }

    self.recreateGraphSelectTables = function () {
        try {
            var source = getCurrentSource();
            if (!source) {
                return alert("Missing DataSourceManager.currentSlsvSource");
            }

            var dbTables = getDbTables();
            var csvTables = getCsvTables();

            var merged = mergeUniqueTables(dbTables, csvTables);
            var allTables = merged.tables;

            if (!allTables || allTables.length === 0) {
                return alert("No tables found for this source");
            }

            var filteredTables = filterTablesHavingMappings(allTables);

            if (!filteredTables || filteredTables.length === 0) {
                return alert("Aucune table avec mappings trouvée (le graphe de mappings n'est peut-être pas chargé).");
            }

            var statsMap = getStatsMap();

            var jstreeData = [];

            // Root = source
            jstreeData.push({
                id: source,
                parent: "#",
                text: source,
                type: "Source",
            });

            var tablesDisplayed = filteredTables.slice();

            tablesDisplayed.forEach(function (t) {
                var count = null;
                if (statsMap && typeof statsMap === "object" && statsMap[t]) {
                    count = statsMap[t];
                }

                var label = t;
                if (count) {
                    label = t + " " + count + " Triples";
                }

                var isCsv = csvTables.indexOf(t) > -1;

                jstreeData.push({
                    id: t,
                    parent: source,
                    text: label,
                    type: isCsv ? "CSV" : "Table",
                    data: {
                        tableName: t,
                        isCsv: isCsv,
                    },
                });
            });

            var optionsObj = buildOptions();

            var options = {
                withCheckboxes: true,
                openAll: true,
                selectDescendants: true,
                tie_selection: false,

                validateFn: function (selected) {
                    try {
                        var selectedIds = [];
                        if (Array.isArray(selected)) {
                            selected.forEach(function (node) {
                                if (node && node.id) {
                                    selectedIds.push(node.id);
                                }
                            });
                        }

                        selectedIds = selectedIds.filter(function (id) {
                            return id !== source;
                        });

                        if (!selectedIds || selectedIds.length === 0) {
                            return alert("Select at least one table");
                        }

                        // all selected ?
                        var allSelected = selectedIds.length === tablesDisplayed.length;

                        if (allSelected) {
                            return self.recreateAllTablesTriples(source, optionsObj);
                        } else {
                            return self.recreateSelectedTablesTriples(source, selectedIds, optionsObj);
                        }
                    } catch (e) {
                        console.error(e);
                        alert(e.message || String(e));
                    }
                },
            };

            JstreeWidget.loadJsTree(null, jstreeData, options, function () {
                setTimeout(function () {
                    try {
                        $("#jstreeWidget_okButton").html("Recreate");
                    } catch (e) {}
                }, 50);
            });
        } catch (e) {
            console.error(e);
            alert(e.message || String(e));
        }
    };

    function normalizeTableName(name) {
        if (!name) return "";
        return String(name).trim();
    }

    function mergeUniqueTables(dbTables, csvTables) {
        var csvMap = {};
        var dbMap = {};
        var seen = {};
        var out = [];

        (csvTables || []).forEach(function (t) {
            var n = normalizeTableName(t);
            if (n) csvMap[n] = true;
        });

        (dbTables || []).forEach(function (t) {
            var n = normalizeTableName(t);
            if (n) dbMap[n] = true;
        });

        (dbTables || []).forEach(function (t) {
            var n = normalizeTableName(t);
            if (!n) return;
            if (!seen[n]) {
                seen[n] = true;
                out.push(n);
            }
        });

        (csvTables || []).forEach(function (t) {
            var n = normalizeTableName(t);
            if (!n) return;
            if (!seen[n]) {
                seen[n] = true;
                out.push(n);
            }
        });

        return {
            tables: out,
            isCsv: function (tableName) {
                var n = normalizeTableName(tableName);
                return !!csvMap[n];
            },
        };
    }

    /**
     * Displays the triples data in a table format within the specified div element.
     * The table includes columns for subject, predicate, and object, and the data is escaped to prevent HTML injection.
     *
     * @function
     * @name showTriplesInDataTable
     * @param {Array} data - The triples data to display, each item should contain 's', 'p', and 'o' properties.
     * @param {string} div - The ID of the div element where the table should be displayed.
     * @memberof module:TripleFactory
     */
    self.showTriplesInDataTable = function (data, div) {
        var escapeMarkup = function (str) {
            if (!str) {
                return "";
            }
            var str2 = str.replace(/</g, "&lt;");
            var str2 = str2.replace(/>/g, "&gt;");
            return str2;
        };

        var tableCols = [];
        var hearders = ["subject", "predicate", "object"];
        hearders.forEach(function (item) {
            tableCols.push({ title: item, defaultContent: "", width: "30%" });
        });

        var tableData = [];
        var regex = /<([^>]*)> <*([^ >]*)>* <*([^>]*)>*/;
        data.sampleTriples.forEach(function (item, index) {
            var array = regex.exec(item);
            //tableData.push([array[1], array[2], array[3]]);
            tableData.push([escapeMarkup(array[1]), escapeMarkup(array[2]), escapeMarkup(array[3])]);
            //  tableData.push([escapeMarkup(item.s), escapeMarkup(item.p), escapeMarkup(item.o)]);
        });
        /*
        var str = "<table><tr><td>subject</td><td>predicate</td><td>object</td></tr>";
        data.sampleTriples.forEach(function (item, index) {
            str += "<tr><td>" + escapeMarkup(item.s) + "</td><td>" + escapeMarkup(item.p) + "</td><td>" + escapeMarkup(item.o) + "</td></tr>";
        });
        str += "</table>";

 */

        /*  $("#KGcreator_triplesDataTableDiv").html(str)
          return;*/
        Export.showDataTable(div, tableCols, tableData, null, { paging: true, divId: div }, function (err, datatable) {});
    };

    self.showFilterMappingsDialog = function (divId, table) {
        if (!divId) divId = "detailedMappings_filterMappingsTree";
        if (!table) table = MappingModeler.currentTable.name;
        var nodes = MappingColumnsGraph.visjsGraph.data.nodes.get();
        var edges = MappingColumnsGraph.visjsGraph.data.edges.get();

        var treeData = [
            {
                id: "root",
                text: table,
                parent: "#",
            },
            {
                id: "Columns",
                text: "Columns",
                parent: "root",
            },
            {
                id: "Relations",
                text: "Relations",
                parent: "root",
            },
        ];

        self.columnsMap = {};
        nodes.forEach(function (node) {
            if (node.data && MappingModeler.columnsMappingsObjects.includes(node.data.type) && node.data.dataTable == table) {
                self.columnsMap[node.id] = node;
                // add node to treeData only if node master or if he adding a new other predicate compared to the master node
                if (!node.data.definedInColumn || (node.data.otherPredicates && node.data.otherPredicates.length > 0)) {
                    treeData.push({
                        id: node.id,
                        text: node.label,
                        parent: "Columns",
                        data: node.data,
                    });
                }
            }
        });

        edges.forEach(function (edge) {
            if (self.columnsMap[edge.from] && self.columnsMap[edge.to]) {
                var label = self.columnsMap[edge.from].label + "-" + edge.label + "->" + self.columnsMap[edge.to].label;
                treeData.push({
                    id: edge.id,
                    text: label,
                    parent: "Relations",
                });
            }
        });
        var options = {
            withCheckboxes: true,
            openAll: true,
            selectTreeNodeFn: function (event, obj) {
                // add otherpredicates onclick
                if (obj.node.parent == "Columns") {
                    var jstreeData = [];
                    var otherPredicates = obj.node.data.otherPredicates;
                    if (otherPredicates) {
                        otherPredicates.forEach(function (item) {
                            jstreeData.push({
                                id: item.property,
                                text: item.property,
                                parent: obj.node.id,
                                data: { type: "otherPredicate" },
                            });
                        });
                    }
                    if (obj.node.data.rdfsLabel) {
                        //separate with > because he can't be used on uri
                        jstreeData.push({
                            id: obj.node.id + ">" + "rdfs:label",
                            text: "rdfs:label",
                            parent: obj.node.id,
                            data: { type: "rdfsLabel" },
                        });
                    }
                    if (obj.node.data.rdfType) {
                        jstreeData.push({
                            id: obj.node.id + ">" + "rdf:type",
                            text: "rdf:type",
                            parent: obj.node.id,
                            data: { type: "rdfType" },
                        });
                    }
                    JstreeWidget.addNodesToJstree(divId, obj.node.id, jstreeData);
                }
            },
        };
        JstreeWidget.loadJsTree(divId, treeData, options, function () {
            $("#detailedMappings_treeContainer").css("overflow", "unset");
        });
    };

    self.deleteSpecificTriples = function () {
        self.initFilterMappingDialog(false, true);
    };
    self.runDeleteSpecificTriples = function (isSampleData, callback) {
        var confirm = true;
        if (!isSampleData) {
            confirm = window.confirm("Are you sure you want to delete these triples?");
        }
        if (!confirm) {
            return;
        }
        var checkedNodes = JstreeWidget.getjsTreeCheckedNodes("detailedMappings_filterMappingsTree");
        if (checkedNodes.length == 0) {
            return alert(" no mappings selected");
        }
        var filterMappingIds = [];
        //don't select parent node when datatype property is selected
        var nodeIdsToFilter = {};
        var mappingNodes = MappingColumnsGraph.getNodesMap();
        checkedNodes.forEach(function (item) {
            if (item.parent == "Relations") {
                var edge = MappingColumnsGraph.getEdgesMap("id")[item.id];
                if (!edge) {
                    return;
                }
                edge = edge[0];
                var startingClass;
                if (edge.from && mappingNodes[edge.from]) {
                    startingClass = MappingColumnsGraph.getColumnClass(mappingNodes[edge.from]);
                }
                var endingClass;
                if (edge.to && mappingNodes[edge.to]) {
                    endingClass = MappingColumnsGraph.getColumnClass(mappingNodes[edge.to]);
                }
                if (startingClass && endingClass) {
                    filterMappingIds.push({ id: item.id, type: "Relation", startingClass: startingClass, endingClass: endingClass, propertyUri: edge.data.id });
                }
            }

            if (!item.data || !item.data.type) {
                return;
            }
            if (item.data.type == "otherPredicate" || item.data.type == "rdfsLabel" || item.data.type == "rdfType") {
                var parentNode = $("#detailedMappings_filterMappingsTree").jstree("get_node", item.parent);
                var columnClassPredicate = MappingColumnsGraph.getColumnClass(parentNode);
                if (columnClassPredicate) {
                    // Pour rdfsLabel et rdfType, l'id contient "parentId>predicate", donc on prend la partie après ">"
                    var predicateId = item.id;
                    if (item.data.type == "rdfsLabel" || item.data.type == "rdfType") {
                        predicateId = item.id.split(">")[1];
                    }
                    filterMappingIds.push({ id: predicateId, type: "otherPredicate", classUri: columnClassPredicate });
                    nodeIdsToFilter[item.parent] = true;
                }
            }
            if (MappingModeler.columnsMappingsObjects.includes(item.data.type)) {
                var columnClass = MappingColumnsGraph.getColumnClass(item);
                if (columnClass) {
                    filterMappingIds.push({ id: item.id, type: "Class", classUri: columnClass });
                }
            }
        });
        var filterMappingsIds = filterMappingIds.filter(function (item) {
            return !nodeIdsToFilter[item.id];
        });
        var options = { isSample: isSampleData, filterMappingIds: filterMappingsIds, clientSocketId: Config.clientSocketId };

        var payload = {
            options: JSON.stringify(options),
            source: MappingModeler.currentSLSsource,
            tables: JSON.stringify([MappingModeler.currentTable.name]),
        };
        $.ajax({
            type: "DELETE",
            url: `${Config.apiUrl}/kg/triples`,
            data: payload,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                if (isSampleData) {
                    UIcontroller.activateRightPanel("generic");
                    self.showTriplesInDataTable(result, "mappingModeler_genericPanel");
                    //   UI.message("", true);
                } else {
                    alert("triples deleted: " + result.triplesDeleted);
                }
            },
            error: function (err) {
                if (callback) {
                    return callback(err);
                } else {
                    MainController.errorAlert(err);
                }
                UI.message(err.responseText);
            },
        });
    };

    /* self.showFilterMappingsDialog=function(){
        TripleFactory.initFilterMappingDialog()
    }*/

    return self;
})();

export default TripleFactory;
window.TripleFactory = TripleFactory;
