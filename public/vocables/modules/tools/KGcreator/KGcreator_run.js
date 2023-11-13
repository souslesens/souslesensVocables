import MainController from "../../shared/mainController.js";
import KGcreator from "./KGcreator.js";
import SearchUtil from "../../search/searchUtil.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";

var KGcreator_run = (function () {
    var self = {};

    self.createTriples = function (sampleData, allmappings, callback) {
        var table = null;
        if (KGcreator.currentTreeNode.data.type == "tableColumn") {
            table = KGcreator.currentTreeNode.data.parent;
        } else if (KGcreator.currentTreeNode.data.type == "table") {
            table = KGcreator.currentTreeNode.data.id;
        } else if (KGcreator.currentTreeNode.data.type == "csvSource") {
            table = KGcreator.currentTreeNode.data.id;
        } else if (KGcreator.currentTreeNode.data.type == "databaseSource") {
            table = null;
        } else {
            return alert("select a node");
        }

        if (!sampleData) {
            if (!confirm("create triples for " + KGcreator.currentConfig.currentDataSource.name + " " + table || "")) {
                return;
            }
        }

        var options = {};
        if (sampleData) {
            options = {
                deleteOldGraph: false,
                sampleSize: 500,
            };
        } else {
            options = {
                deleteOldGraph: false,
            };
        }

        if (Config.clientSocketId) {
            options.clientSocketId = Config.clientSocketId;
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
                    var str = JSON.stringify(result, null, 2);

                    $("#KGcreator_infosDiv").val(str);
                    MainController.UI.message("", true);
                } else {
                    if (options.deleteTriples) {
                        $("#KGcreator_infosDiv").val(result.result);
                        MainController.UI.message(result.result, true);
                    } else {
                        $("#KGcreator_infosDiv").val(result + " triples created in graph " + KGcreator.currentConfig.graphUri);
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

    self.indexGraph = function (callback) {
        var graphSource = null;
        for (var source in Config.sources) {
            if (Config.sources[source].graphUri == self.currentGraphUri) {
                graphSource = source;
            }
        }
        if (!source) {
            if (callback) {
                return callback("no source associated to graph " + self.currentGraphUri);
            }
            return alert("no source associated to graph " + self.currentGraphUri);
        }
        if (callback || confirm("index source " + graphSource)) {
            SearchUtil.generateElasticIndex(graphSource, null, function (err, _result) {
                if (err) {
                    if (callback) {
                        return callback(err.responseText);
                    }
                    return alert(err.responseText);
                }
                $("#KGcreator_infosDiv").val("indexed graph " + mappings.graphUri + " in index " + graphSource.toLowerCase());
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
        if (!confirm("Do you really want to delete  triples created with KGCreator in datasource " + KGcreator.currentConfig.currentDataSource.name)) {
            return;
        }
        var tables = [];
        if (!deleteAllKGcreatorTriples) {
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
        if (!mappings) {
            return callback("select any existing  mapping ");
        }
        if (!confirm("generate KGcreator triples form all mappings. this only will delete all previous  KGcreator triples ")) {
            return;
        }
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
                    self.createTriples(false, { allMappings: 1 }, function (err, result) {
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
