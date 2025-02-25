import KGcreator_run from "../KGcreator/KGcreator_run.js";
import MappingsDetails from "./mappingsDetails.js";

import MappingTransform from "./mappingTransform.js";
import MappingModeler from "./mappingModeler.js";
import Export from "../../shared/export.js";
import UIcontroller from "./uiController.js";
import DataSourceManager from "./dataSourcesManager.js";


/**
 * The TripleFactory module handles the creation, filtering, and writing of RDF triples.
 * It includes functions for generating sample triples, creating all mappings triples, and indexing the graph.
 * @module TripleFactory
 * @see [Tutorial: Overview]{@tutorial overview}
 */
var TripleFactory = (function () {
    var self = {};

    /**
     * Displays a dialog with sample triples for the current table.
     * It checks if the current table is valid before proceeding to show the sample triples.
     * @function
     * @name showTripleSample
     * @memberof module:TripleFactory
     */
    self.showTripleSample = function () {
        if (!self.checkCurrentTable()) {
            return;
        }

        self.showFilterMappingDialog(true);
    };

    /**
     * Writes the RDF triples for the current table after filtering them based on the user-defined criteria.
     * It checks if the current table is valid before proceeding to write the triples.
     * @function
     * @name writeTriples
     * @memberof module:TripleFactory
     */
    self.writeTriples = function () {
        if (!self.checkCurrentTable()) {
            return;
        }
        self.showFilterMappingDialog(false);
    };

    /**
     * Creates all RDF mappings triples using the KGcreator_run module.
     * @function
     * @name createAllMappingsTriples
     * @memberof module:TripleFactory
     */
    self.createAllMappingsTriples = function () {
        KGcreator_run.createAllMappingsTriples();
    };

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
     * @name showFilterMappingDialog
     * @memberof module:TripleFactory
     * @param {boolean} isSample - If true, the dialog is for displaying sample mappings; if false, for writing actual triples.
     */
    self.showFilterMappingDialog = function (isSample) {
        self.filterMappingIsSample = isSample;
        UIcontroller.activateRightPanel("generic");
        $("#mappingModeler_genericPanel").load("./modules/tools/mappingModeler/html/filterMappingDialog.html", function () {
            //  $("#mainDialogDiv").dialog("option", "title", "Filter mappings : table " + MappingModeler.currentTable.name);
            // $("#mainDialogDiv").dialog("open");
            var options = {withCheckboxes: true, withoutContextMenu: true, openAll: true, check_all: true};
            
            MappingsDetails.showDetailedMappingsTree(null, "detailedMappings_filterMappingsTree", options);
        });
    };

    /**
     * Runs the filtered mappings for the SLS (Semantic Linked Set) based on the selected nodes in the tree view.
     * It filters and creates unique mappings by checking the selected attributes and mapping nodes.
     * @function
     * @name runSlsFilteredMappings
     * @memberof module:TripleFactory
     */
    self.runSlsFilteredMappings = function () {
        var filteredMappings=MappingTransform.getFilteredMappings();
        TripleFactory.createTriples(self.filterMappingIsSample, MappingModeler.currentTable.name, {filteredMappings: filteredMappings}, function (err, result) {
            if (err) {
                alert(err.responseText || err);
            } else {
                UI.message("Done", true);
                if(!self.filterMappingIsSample){
                    //Admin.clearOntologyModelCache();
                    SearchUtil.generateElasticIndex(MappingModeler.currentSLSsource, { indexProperties: 1, indexNamedIndividuals: 1 }, () => {

                        $.ajax({
                            type: "DELETE",
                            url:  `${Config.apiUrl}/ontologyModels?source=${MappingModeler.currentSLSsource}`,
                            
                            dataType: "json",
                            success: function (result, _textStatus, _jqXHR) {
                                delete Config.ontologiesVocabularyModels[MappingModeler.currentSLSsource];

                                UI.message('ALL DONE');
                            },
                            error: function (err) {
                                if (callback) {
                                    return callback(err);
                                }
                                UI.message(err.responseText);
                            },
                        });
                        /*
                        $.ajax(`/api/v1/ontologyModels?source=${MappingModeler.currentSLSsource}`, { method: "DELETE" })
                            .then((_success) => {
                                window.UI.message(`${MappingModeler.currentSLSsource} was updated successfully`, true);
                            })
                            .catch((error) => {
                                alert(error);
                            });*/
                    });
                }
            }
        });
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
        UI.message("deleting KGcreator  triples...");
        $.ajax({
            type: "DELETE",
            url: `${Config.apiUrl}/kg/triples`,
            data: payload,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                if (callback) {
                    return callback();
                }
                UI.message(result.result);
            },
            error: function (err) {
                if (callback) {
                    return callback(err);
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
        var allTableMappings = MappingTransform.getSLSmappingsFromVisjsGraph(table); // self.getSelectedMappingTriplesOption();

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

        if (allTableMappings) {
            options.mappingsFilter = allTableMappings;
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
                    UI.message("", true);
                } else {
                    if (options.deleteTriples) {
                        $("#KGcreator_infosDiv").val(result.result);
                        UI.message(result.result, true);
                    } else {
                        var message = result.result + " triples created in graph " + DataSourceManager.currentConfig.graphUri;
                        alert(message);
                        UI.message(message, true);
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
        if (!confirm("generate KGcreator triples of datasource " + DataSourceManager.currentConfig.currentDataSource.name + ". this  will delete all triples created with KGcreator  ")) {
            return;
        }

        $("#KGcreator_infosDiv").val("generating KGcreator triples form all mappings ");
        async.series(
            [
                //delete previous KG creator triples
                function (callbackSeries) {
                    $("#KGcreator_infosDiv").val("deleting previous KGcreator triples ");
                    self.deleteTriples(true, function (err, result) {
                        return callbackSeries(err);
                    });
                },
                // Create new triples
                function (callbackSeries) {
                    $("#KGcreator_infosDiv").val("creating new triples (can take long...)");
                    self.createTriples(false, null, function (err, result) {
                        return callbackSeries(err);
                    });
                },
                // Reindex graph
                function (callbackSeries) {
                    $("#KGcreator_infosDiv").val("reindexing graph)");
                    self.indexGraph(function (err, result) {
                        return callbackSeries(err);
                    });
                },
            ],
            function (err) {
                if (err) {
                    $("#KGcreator_infosDiv").val("\nALL DONE");
                }
            },
        );
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
            var str2 = str.replace(/</g, "&lt;");
            var str2 = str2.replace(/>/g, "&gt;");
            return str2;
        };

        var tableCols = [];
        var hearders = ["subject", "predicate", "object"];
        hearders.forEach(function (item) {
            tableCols.push({title: item, defaultContent: "", width: "30%"});
           
        });

        var tableData = [];
        data.forEach(function (item, index) {
            tableData.push([escapeMarkup(item.s), escapeMarkup(item.p), escapeMarkup(item.o)]);
        });

        var str = "<table><tr><td>subject</td><td>predicate</td><td>object</td></tr>";
        data.forEach(function (item, index) {
            str += "<tr><td>" + escapeMarkup(item.s) + "</td><td>" + escapeMarkup(item.p) + "</td><td>" + escapeMarkup(item.o) + "</td></tr>";
        });
        str += "</table>";

        /*  $("#KGcreator_triplesDataTableDiv").html(str)
          return;*/
        Export.showDataTable(div, tableCols, tableData, null, {paging: true, divId: div}, function (err, datatable) {
        });
       
    };

    return self;
})
();

export default TripleFactory;
window.TripleFactory = TripleFactory;
