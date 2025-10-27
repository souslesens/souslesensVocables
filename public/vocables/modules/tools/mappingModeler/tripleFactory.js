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
    self.initFilterMappingDialog = function (isSample) {
        self.filterMappingIsSample = isSample;
        UIcontroller.activateRightPanel("generic");
        // save current mappings before opening the dialog
        MappingColumnsGraph.saveVisjsGraph(function () {
            $("#mappingModeler_genericPanel").load("./modules/tools/mappingModeler/html/filterMappingDialog.html", function () {
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
            return alert(err);
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
                    alert(err.responseText || err);
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
                UI.message(result.result);
            },
            error: function (err) {
                if (callback) {
                    return callback(err);
                } else {
                    alert(err.responseText);
                }
                UI.message(err.responseText);
            },
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
                return alert(err.responseText);
            },
        });
    };

    /**
     * Generates KGcreator triples for the entire datasource, deleting any previous triples before creating new ones.
     * It proceeds with a series of steps: deleting old triples, creating new triples, and reindexing the graph.
     *
     * @function
     * @name createAllMappingsTriples
     * @memberof module:TripleFactory
     */
    self.createAllMappingsTriples = function () {
        alert("under construction");
    };

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
        if(!divId)
            divId="detailedMappings_filterMappingsTree"
        if(!table)
            table=MappingModeler.currentTable.name
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
                if(!node.data.definedInColumn) {

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
                    var otherPredicates = obj.node.data.otherPredicates;
                    if (otherPredicates) {
                        var jstreeData = [];
                        otherPredicates.forEach(function (item) {
                            jstreeData.push({
                                id: item.property,
                                text: item.property,
                                parent: obj.node.id,
                                data: { type: "otherPredicate" },
                            });
                        });
                        JstreeWidget.addNodesToJstree(divId, obj.node.id, jstreeData);
                    }
                }
            },
        };
        JstreeWidget.loadJsTree(divId, treeData, options, function () {
            $("#detailedMappings_treeContainer").css("overflow", "unset");
        });
    };

   /* self.showFilterMappingsDialog=function(){
        TripleFactory.initFilterMappingDialog()
    }*/

    return self;
})();

export default TripleFactory;
window.TripleFactory = TripleFactory;
