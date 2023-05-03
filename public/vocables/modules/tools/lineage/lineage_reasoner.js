import common from "../../shared/common.js";
import SearchUtil from "../../search/searchUtil.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import visjsGraph from "../../graph/visjsGraph2.js";
import Lineage_classes from "./lineage_classes.js";
import Lineage_sources from "./lineage_sources.js";

var Lineage_reasoner = (function () {
    var self = {};
    self.inferenceTriples = [];

    self.showReasonerDialog = function () {
        $("#smallDialogDiv").dialog("open");
        $("#smallDialogDiv").load("snippets/lineage/lineage_reasoner.html", function () {
            $("#lineage_reasoner_outputDiv").css("display", "none");
            common.fillSelectWithColorPalette("lineage_reasoner_colorSelect");
        });
    };

    self.runOperation = function (operation) {
        self.currentOperation = operation;
        $("#lineage_reasoner_outputDiv").css("display", "none");
        $("#lineage_reasoner_operationSelect").val("");
        // $("#lineage_reasoner_outputDiv").css("display", "none");

        if (operation == "Inference") {
            self.runInference();
        } else if (operation == "Consistency") {
            self.runConsistency();
        } else if (operation == "Unsatisfiable") {
            self.runUnsatisfiable();
        }
    };

    self.runConsistency = function () {
        var fromStr = Sparql_common.getFromStr(Lineage_sources.activeSource, false, false);
        var describeQuery = "DESCRIBE ?s ?p ?o  " + fromStr + "  WHERE {  ?s ?p ?o    } ";
        const params = new URLSearchParams({
            operation: "consistency",
            type: "internalGraphUri",
            describeSparqlQuery: describeQuery,
        });
        $("#lineage_reasoner_infosDiv").html("Processing " + Lineage_sources.activeSource + "...");
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/jowl/reasoner?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                $("#lineage_reasoner_infosDiv").html(JSON.stringify(data, null, 2));
                $("#lineage_reasoner_outputDiv").css("display", "block");
            },
            error(err) {
                alert(err.responseText);
            },
        });
    };

    self.runUnsatisfiable = function () {
        var fromStr = Sparql_common.getFromStr(Lineage_sources.activeSource, false, false);
        var describeQuery = "DESCRIBE ?s ?p ?o  " + fromStr + "  WHERE {  ?s ?p ?o    } ";
        const params = new URLSearchParams({
            operation: "unsatisfiable",
            type: "internalGraphUri",
            describeSparqlQuery: describeQuery,
        });
        $("#lineage_reasoner_infosDiv").html("Processing " + Lineage_sources.activeSource + "...");
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/jowl/reasoner?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                $("#lineage_reasoner_infosDiv").html(JSON.stringify(data, null, 2));
            },
            error(err) {
                alert(err.responseText);
            },
        });
    };

    self.runInference = function () {
        var operation = $("#lineage_reasoner_operationSelect").val();

        var fromStr = Sparql_common.getFromStr(Lineage_sources.activeSource, false, false);
        var describeQuery = "DESCRIBE ?s ?p ?o  " + fromStr + "  WHERE {  ?s ?p ?o    } ";

        const params = new URLSearchParams({
            operation: "inference",
            type: "internalGraphUri",
            describeSparqlQuery: describeQuery,
        });
        $("#lineage_reasoner_infosDiv").html("Processing " + Lineage_sources.activeSource + "...");
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/jowl/reasoner?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                $("#lineage_reasoner_outputDiv").css("display", "block");

                self.inferenceData = self.FunctionalStyleSyntaxToJson(data.inference);

                var predicatesMap = {};
                self.inferenceData.forEach(function (item) {
                    if (item.object == "owl:Thing") {
                        return;
                    }
                    if (item.subject == "owl:Thing") {
                        return;
                    }
                    if (!predicatesMap[item.predicate]) {
                        predicatesMap[item.predicate] = [];
                    }
                    predicatesMap[item.predicate].push(item);
                });

                var html = "<select id='lineage_reasoner_inferencePredicateSelect' size='15' style='width:250px' multiple='multiple'>";
                for (var pred in predicatesMap) {
                    html += "<option value='" + pred + "'>" + pred + " : " + predicatesMap[pred].length + "</option>";
                }
                html += "</select>";
                $("#lineage_reasoner_infosDiv").html(html);
            },
            error(err) {
                return alert(err.responseText);
                if (callback) {
                    return callback(err);
                }
            },
        });
    };

    self.displayResult = function () {
        if (self.currentOperation == "Inference") {
            self.displayInference();
        } else if (self.currentOperation == "Consistency") {
            self.displayConsistency();
        } else if (self.currentOperation == "Unsatisfiable") {
            self.displayUnsatisfiable();
        }
    };

    self.displayConsistency = function () {};

    self.displayUnsatisfiable = function () {};

    self.displayInference = function () {
        var output = $("#lineage_reasoner_outputSelect").val();

        if (output == "Table") {
            $("#lineage_reasoner_infosDiv").html(JSON.stringify(self.inferenceData));
        } else if (output == "Graph") {
            var urisMap = {};

            var inferencePredicates = $("#lineage_reasoner_inferencePredicateSelect").val();
            var filteredData = [];

            if (!inferencePredicates) {
                filteredData = self.inferenceData;
            } else {
                self.inferenceData.forEach(function (item) {
                    if (inferencePredicates.indexOf(item.predicate) > -1) {
                        filteredData.push(item);
                    }
                });
            }

            filteredData.forEach(function (item) {
                var uri = item.subject;
                if (!urisMap[uri]) {
                    urisMap[uri] = 1;
                }
                var uri = item.object;
                if (!urisMap[uri]) {
                    urisMap[uri] = 1;
                }
            });
            var filter = Sparql_common.setFilter("id", Object.keys(urisMap), null);
            Sparql_OWL.getDictionary(Lineage_sources.activeSource, { filter: filter }, null, function (err, result) {
                result.forEach(function (item) {
                    urisMap[item.id.value] = item.label ? item.label.value : Sparql_common.getLabelFromURI(item.id.value);
                });
                var visjsData = { nodes: [], edges: [] };
                var existingNodes = visjsGraph.getExistingIdsMap();

                var edgeColor = $("#lineage_reasoner_colorSelect").val();

                filteredData.forEach(function (item) {
                    var uri = item.subject;
                    if (urisMap[uri] && !existingNodes[uri]) {
                        existingNodes[uri] = 1;
                        visjsData.nodes.push({
                            id: uri,
                            label: urisMap[uri],
                            shape: "square",
                            color: "grey",
                            size: Lineage_classes.defaultShapeSize,
                            data: {
                                id: uri,
                                label: urisMap[uri],
                                source: Lineage_sources.activeSource,
                            },
                        });
                    }

                    var uri2 = item.object;
                    if (urisMap[uri] && !existingNodes[uri2]) {
                        existingNodes[uri2] = 1;
                        visjsData.nodes.push({
                            id: uri2,
                            label: urisMap[uri2],
                            shape: "square",
                            color: "grey",
                            size: Lineage_classes.defaultShapeSize,
                            data: {
                                id: uri2,
                                label: urisMap[uri2],
                                source: Lineage_sources.activeSource,
                            },
                        });
                    }

                    var edgeId = uri + "_" + uri2;
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;
                        visjsData.edges.push({
                            id: edgeId,
                            from: uri,
                            to: uri2,
                            label: item.predicate,
                            color: edgeColor || "red",
                        });
                    }
                });

                if (!visjsGraph.isGraphNotEmpty()) {
                    Lineage_classes.drawNewGraph(visjsData);
                }
                visjsGraph.data.nodes.add(visjsData.nodes);
                visjsGraph.data.edges.add(visjsData.edges);
                visjsGraph.network.fit();
                $("#waitImg").css("display", "none");
            });
        }
    };

    self.FunctionalStyleSyntaxToJson = function (functionalStyleStr) {
        function getUri(str) {
            if (!str) {
                return null;
            }
            return str.replace(/[<>]/g, "");
        }

        var regex = /([A-z]+)\(([^\)]+)\)/gm;

        var regex2 = /([A-z]+)\(([^ ]+) ([^)]+)/gm;

        var array = [];
        var json = [];
        while ((array = regex.exec(functionalStyleStr)) != null) {
            var predicate = array[1];
            var expr = array[2];
            var array2 = expr.split(" ");
            if (array2.length == 2) {
                var object = getUri(array2[0]);
                var subject = getUri(array2[1]);
            }
            json.push({ subject: subject, predicate: predicate, object: object });
        }

        return json;
    };

    return self;
})();

export default Lineage_reasoner;
window.Lineage_reasoner = Lineage_reasoner;
