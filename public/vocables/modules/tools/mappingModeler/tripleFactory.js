import KGcreator_run from "../KGcreator/KGcreator_run.js";
import MappingsDetails from "./mappingsDetails.js";

import MappingTransform from "./mappingTransform.js";
import MappingModeler from "./mappingModeler.js";
import Export from "../../shared/export.js";

var TripleFactory = (function () {
    var self = {};

    self.checkCurrentTable = function () {
        var check = false;
        if (!MappingModeler.currentTable) {
            alert("select a table or a csv source");
        }
        var mappingsDetailsIsLoaded = false;
        MappingModeler.visjsGraph.data.nodes.get().forEach(function (node) {
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
    self.showTripleSample = function () {
        if (!self.checkCurrentTable()) return;

        MappingsDetails.showFilterMappingDialog(true);
    };

    self.writeTriples = function () {
        if (!self.checkCurrentTable()) return;

        MappingsDetails.showFilterMappingDialog(false);
        return;

        var mappingsFilter = MappingTransform.getSLSmappingsFromVisjsGraph(MappingModeler.currentTable);
        var options = { table: MappingModeler.currentTable.name, mappingsFilter: mappingsFilter };
        self.createTriples(false, MappingModeler.currentTable.name, options, function (err, result) {});
    };

    self.createAllMappingsTriples = function () {
        KGcreator_run.createAllMappingsTriples();
    };

    self.indexGraph = function () {
        KGcreator_run.indexGraph();
    };

    self.deleteTriples = function (all, callback) {
        var tables = [];
        if (!all) {
            if (!self.checkCurrentTable) return;
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
            options.mappingsFilter[MappingModeler.currentTable.name].tripleModels = options.filteredMappings;
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
                    MappingModeler.activateRightPanel("generic");
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
                function (callbackSeries) {
                    $("#KGcreator_infosDiv").val("creating new triples (can take long...)");
                    self.createTriples(false, null, function (err, result) {
                        return callbackSeries(err);
                    });
                },

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
            }
        );
    };

    self.showTriplesInDataTable = function (data, div) {
        var escapeMarkup = function (str) {
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
        Export.showDataTable(div, tableCols, tableData, null, { paging: true, divId: div }, function (err, datatable) {});
    };

    return self;
})();

export default TripleFactory;
window.TripleFactory = TripleFactory;
