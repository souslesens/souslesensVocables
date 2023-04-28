import common from "../../common.js";
import SearchUtil from "../../search/searchUtil.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import visjsGraph from "../../graph/visjsGraph2.js";
import Lineage_classes from "./lineage_classes.js";

var Lineage_reasoner = (function () {
    var self = {};
    self.inferenceTriples = [];

    self.showReasonerDialog = function () {
        $("#smallDialogDiv").dialog("open");
        $("#smallDialogDiv").load("snippets/lineage/lineage_reasoner.html", function () {});
    };

    self.runOperation = function () {
        $("#lineage_reasoner_outputDiv").css("display", "none");
        var operation = $("#lineage_reasoner_operationSelect").val();
        self.inferenceTriples = [];

        const params = new URLSearchParams({
            operation: "inference",
            type: "internalGraphUri",
            url: Config.sources[Lineage_sources.activeSource].graphUri,
        });

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/jowl/reasoner?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                $("#lineage_reasoner_outputDiv").css("display", "block");
                if (operation == "Inference") {
                    self.inferenceTriples = data;
                    $("#lineage_reasoner_infosDiv").html(data.length + "triples inferred");
                    self.displayResult();
                }
                if (operation == "Consistency") {
                    $("#lineage_reasoner_infosDiv").html("");
                }
                if (operation == "Unsatisfiable") {
                    $("#lineage_reasoner_infosDiv").html("");
                }
            },
            error(err) {
                return alert(err.responseText);
                if (callback) {
                    return callback(err);
                }
            },
        });
    };

    self.displayResult = function (output) {
        var operation = $("#lineage_reasoner_operationSelect").val();
        if (operation == "Inference") {
            if (output == "Table") {
                $("#lineage_reasoner_infosDiv").html(JSON.stringify(self.inferenceTriples));
            } else if (output == "Graph") {
                var urisMap = {};

                function getUri(str) {
                    if (!str) {
                        return null;
                    }
                    return str.replace(/[<>]/g, "");
                }
                self.inferenceTriples.forEach(function (item) {
                    var uri = getUri(item.subject);
                    if (!urisMap[uri]) {
                        urisMap[uri] = 1;
                    }
                    var uri = getUri(item.object);
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
                    self.inferenceTriples.forEach(function (item) {
                        var uri = getUri(item.subject);
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

                        var uri2 = getUri(item.object);
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
                                color: "red",
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
        }
    };

    return self;
})();

export default Lineage_reasoner;
window.Lineage_reasoner = Lineage_reasoner;
