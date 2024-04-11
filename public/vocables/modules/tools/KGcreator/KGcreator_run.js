import MainController from "../../shared/mainController.js";
import KGcreator from "./KGcreator.js";
import SearchUtil from "../../search/searchUtil.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import KGcreator_mappings from "./KGcreator_mappings.js";
import Export from "../../shared/export.js";

var KGcreator_run = (function () {
    var self = {};
    self.currentTable = null;

    self.testSelectedMappings = function () {
        var table = self.currentTable;
        if (!table) {
            return alert("select a node");
        }

        var selectedText = KGcreator_mappings.currentMappingsSelection;
        if (!selectedText) {
            return;
        }
        selectedText = selectedText.replace(/[\r\n]/g, "");
        selectedText = '{"' + table + '":{"tripleModels":[' + selectedText + '],"transform":{}}}';

        try {
            var json = JSON.parse(selectedText);

            var options = { mappingsFilter: selectedText };
            self.createTriples(true, false, options, function (err, result) {
                if (err) {
                    throw new Exception(err);
                }
            });
        } catch (e) {
            return alert(e);
        }
        //  var triples=selectedText.split(",")
    };

    self.getTableAndShowMappings = function (allmappings) {
        var table = null;

        if (KGcreator.currentTreeNode.data.type == "tableColumn") {
            table = KGcreator.currentTreeNode.data.table;
            KGcreator_mappings.showMappingsInEditor(KGcreator.currentTreeNode.data.table);
        } else if (KGcreator.currentTreeNode.data.type == "table") {
            table = KGcreator.currentTreeNode.data.id;
            KGcreator_mappings.showMappingsInEditor(table);
        } else if (KGcreator.currentTreeNode.data.type == "csvSource") {
            table = KGcreator.currentTreeNode.data.id;
            KGcreator_mappings.showMappingsInEditor(table);
        } else if (KGcreator.currentTreeNode.data.type == "databaseSource" && allmappings) {
            table = null;
        }
        self.currentTable = table;

        return table;
    };

    self.createTriples = function (sampleData, allmappings, options, callback) {
        if (!options) {
            options = {};
        }
        ResponsiveUI.openTab("KGcreator-tab", "KGcreator_treeWrapper", KGcreator_r.initRunTab, "#KGcreator_RunTabButton");
        var table = self.getTableAndShowMappings(allmappings);
        if (!allmappings && !table) {
            return alert("select a node");
        }

        if (!sampleData && !allmappings) {
            if (!confirm("create triples for " + KGcreator.currentConfig.currentDataSource.name + " " + table || "")) {
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
        if (allmappings) {
            options = {};
            table = null;
        }

        var payload = {
            source: KGcreator.currentSlsvSource,
            datasource: KGcreator.currentConfig.currentDataSource.name,
            table: table,
            options: JSON.stringify(options),
        };

        MainController.UI.message("creating triples...");
        $.ajax({
            type: "POST",
            url: `${Config.apiUrl}/kg/triples`,
            data: payload,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                if (sampleData) {
                    // var str = JSON.stringify(result, null, 2);

                    //   $("#KGcreator_infosDiv").val(str);
                    self.showTriplesInDataTable(result);

                    MainController.UI.message("", true);
                } else {
                    if (options.deleteTriples) {
                        $("#KGcreator_infosDiv").val(result.result);
                        MainController.UI.message(result.result, true);
                    } else {
                        $("#KGcreator_infosDiv").val(result.result + " triples created in graph " + KGcreator.currentConfig.graphUri);
                        MainController.UI.message("triples created", true);
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
    self.showTriplesInDataTable = function (data) {
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
        Export.showDataTable("KGcreator_triplesDataTableDiv", tableCols, tableData, null, { paging: true }, function (err, datatable) {});
    };

    self.indexGraph = function (callback) {
        var graphSource = KGcreator.currentSlsvSource;
        if (!graphSource) {
            return alert("no source selected");
        }
        if (!Config.sources[graphSource].graphUri) {
            return alert("no graphUri for source" + KGcreator.currentSlsvSource);
        }

        if (callback || confirm("index source " + graphSource)) {
            ResponsiveUI.openTab("KGcreator-tab", "KGcreator_treeWrapper", KGcreator_r.initRunTab, "#KGcreator_RunTabButton");
            SearchUtil.generateElasticIndex(graphSource, null, function (err, _result) {
                if (err) {
                    if (callback) {
                        return callback(err.responseText);
                    }
                    return alert(err.responseText);
                }
                $("#KGcreator_infosDiv").val("indexed graph " + Config.sources[graphSource].graphUri + " in index " + graphSource.toLowerCase());
                if (callback) {
                    return callback();
                }
            });
        }
    };

    self.clearGraph = function (deleteAllGraph, callback) {
        if (!mappings) {
            if (callback) {
                return callback("node currentJsonObject selected");
            }
            return;
        } //alert("no file mappings selected");
        if (!mappings.graphUri) {
            return alert("no graphUri");
        }

        if (!confirm("Do you really want to clear graph " + mappings.graphUri)) {
            if (callback) {
                return callback("graph deletion aborted");
            }
            return;
        }
        const payload = { graphUri: mappings.graphUri };
        $.ajax({
            type: "POST",
            url: `${Config.apiUrl}/kg/clearGraph`,
            data: payload,
            dataType: "json",
            success: function (_result, _textStatus, _jqXHR) {
                if (callback) {
                    return callback();
                }
                return MainController.UI.message("graph deleted " + mappings.graphUri);
            },
            error(err) {
                if (callback) {
                    return callback(err);
                }
                return MainController.UI.message(err);
            },
        });
    };

    self.deleteKGcreatorTriples = function (deleteAllKGcreatorTriples, callback) {
        var tables = [];
        if (!deleteAllKGcreatorTriples) {
            if (!confirm("Do you really want to delete  triples created with KGCreator in datasource " + KGcreator.currentConfig.currentDataSource.name)) {
                return;
            }
            if (!KGcreator.currentTreeNode && (KGcreator.currentTreeNode.data.type == "table" || KGcreator.currentTreeNode.data.type == "csvSource")) {
                if (callback) {
                    return callback("node currentJsonObject selected");
                }
                return;
            }
            tables.push(KGcreator.currentTreeNode.data.id);
        }

        var payload = {
            source: KGcreator.currentSlsvSource,
            tables: JSON.stringify(tables),
        };
        MainController.UI.message("deleting KGcreator  triples...");
        $.ajax({
            type: "DELETE",
            url: `${Config.apiUrl}/kg/triples`,
            data: payload,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                if (callback) {
                    return callback();
                }
                MainController.UI.message(result.result);
            },
            error: function (err) {
                if (callback) {
                    return callback(err);
                }
                MainController.UI.message(err.responseText);
            },
        });
    };

    self.socketMessage = function (message) {
        //  console.log(message)
        MainController.UI.message(message);
        //  $("#KGcreator_infosDiv").append(message+"\n")
    };

    self.stopCreateTriples = function () {
        socket.emit("KGCreator", "stopCreateTriples");
        MainController.UI.message("import interrupted by user", true);
    };

    self.createAllMappingsTriples = function () {
        if (!KGcreator.currentConfig.currentDataSource) {
            if (!mappings) {
                return alert("select a data source ");
            }
        }
        if (!confirm("generate KGcreator triples of datasource " + KGcreator.currentConfig.currentDataSource.name + ". this  will delete all triples created with KGcreator  ")) {
            return;
        }
        ResponsiveUI.openTab("KGcreator-tab", "KGcreator_treeWrapper", KGcreator_r.initRunTab, "#KGcreator_RunTabButton");
        $("#KGcreator_infosDiv").val("generating KGcreator triples form all mappings ");
        async.series(
            [
                //delete previous KG creator triples
                function (callbackSeries) {
                    $("#KGcreator_infosDiv").val("deleting previous KGcreator triples ");
                    self.deleteKGcreatorTriples(true, function (err, result) {
                        return callbackSeries(err);
                    });
                },
                function (callbackSeries) {
                    $("#KGcreator_infosDiv").val("creating new triples (can take long...)");
                    self.createTriples(false, true, function (err, result) {
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

    return self;
})();

export default KGcreator_run;
window.KGcreator_run = KGcreator_run;
