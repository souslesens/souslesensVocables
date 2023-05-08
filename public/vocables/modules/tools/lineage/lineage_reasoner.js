import common from "../../shared/common.js";
import SearchUtil from "../../search/searchUtil.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import visjsGraph from "../../graph/visjsGraph2.js";
import Lineage_classes from "./lineage_classes.js";
import Lineage_sources from "./lineage_sources.js";

var Lineage_reasoner = (function () {
    var self = {};
    self.inferenceTriples = [];
    self.loaded = false;
    self.showReasonerDialog = function () {
        $("#smallDialogDiv").dialog("open");

        $("#smallDialogDiv").load("snippets/lineage/lineage_reasoner.html", function () {
            if (!self.loaded) {
                self.loaded = true;
                $("#lineage_reasoner_outputDiv").css("display", "none");
                common.fillSelectWithColorPalette("lineage_reasoner_colorSelect");
            }
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
        if (false) {
            self.inferenceData = {
                EquivalentClasses: [
                    "EquivalentClasses(<http://rds.posccaesar.org/ontology/lis14/rdl/PhysicalArtefact> ObjectIntersectionOf(<http://rds.posccaesar.org/ontology/lis14/rdl/Artefact> <http://rds.posccaesar.org/ontology/lis14/rdl/InanimatePhysicalObject>) )",
                    "EquivalentClasses(<http://rds.posccaesar.org/ontology/lis14/rdl/InstalledObject> ObjectIntersectionOf(<http://rds.posccaesar.org/ontology/lis14/rdl/ActualEntity> <http://rds.posccaesar.org/ontology/lis14/rdl/Object>) )",
                    "EquivalentClasses(<http://rds.posccaesar.org/ontology/lis14/rdl/SoftwareArtefact> ObjectIntersectionOf(<http://rds.posccaesar.org/ontology/lis14/rdl/Artefact> <http://rds.posccaesar.org/ontology/lis14/rdl/InformationObject>) )",
                    "EquivalentClasses(<http://rds.posccaesar.org/ontology/lis14/rdl/SpecificationObject> ObjectIntersectionOf(<http://rds.posccaesar.org/ontology/lis14/rdl/Object> <http://rds.posccaesar.org/ontology/lis14/rdl/SpecificationEntity>) )",
                ],
            };
            var html = "<select id='lineage_reasoner_inferencePredicateSelect' size='15' style='width:250px' multiple='multiple'>";
            for (var key in self.inferenceData) {
                self.inferenceData[key] = self.FunctionalStyleSyntaxToJson(self.inferenceData[key]);
                html += "<option value='" + key + "'>" + key + " : " + self.inferenceData[key].length + "</option>";
            }
            $("#lineage_reasoner_outputDiv").css("display", "block");
            html += "</select>";
            $("#lineage_reasoner_infosDiv").html(html);
            return;
        }
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

                self.inferenceData = {};
                var html = "<select id='lineage_reasoner_inferencePredicateSelect' size='15' style='width:250px' multiple='multiple'>";
                for (var pred in data) {
                    self.inferenceData[pred] = self.FunctionalStyleSyntaxToJson(data[pred]);
                    html += "<option value='" + pred + "'>" + pred + " : " + self.inferenceData[pred].length + "</option>";
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

            for (var pred in self.inferenceData) {
                if (!inferencePredicates || inferencePredicates.indexOf(pred) > -1) {
                    self.inferenceData[pred].forEach(function (item) {
                        filteredData.push(item);
                    });
                }
            }

            var visjsData = { nodes: [], edges: [] };
            var existingNodes = visjsGraph.getExistingIdsMap();
            filteredData.forEach(function (item) {
                var uri = item.subject;
                if (!urisMap[uri]) {
                    urisMap[uri] = "";
                }
                var uri = item.object;
                if (!urisMap[uri]) {
                    urisMap[uri] = "";
                }
            });
            var filter = Sparql_common.setFilter("id", Object.keys(urisMap), null);

            var edgeColor = $("#lineage_reasoner_colorSelect").val();

            Sparql_OWL.getDictionary(Lineage_sources.activeSource, { filter: filter }, null, function (err, result) {
                result.forEach(function (item) {
                    urisMap[item.id.value] = item.label ? item.label.value : Sparql_common.getLabelFromURI(item.id.value);
                });

                filteredData.forEach(function (item) {
                    var uri = item.subject;
                    var label = urisMap[uri] || Sparql_common.getLabelFromURI(uri);

                    if (!existingNodes[uri]) {
                        existingNodes[uri] = 1;
                        visjsData.nodes.push({
                            id: uri,
                            label: label,
                            shape: "square",
                            color: "grey",
                            size: Lineage_classes.defaultShapeSize,
                            data: {
                                id: uri,
                                label: label,
                                source: Lineage_sources.activeSource,
                            },
                        });
                    }

                    var uri2 = item.object;

                    var shape = Config.Lineage.logicalOperatorsMap[item.predicate] || "square";

                    var label2 = urisMap[uri2] || Sparql_common.getLabelFromURI(uri2);
                    if (!existingNodes[uri2]) {
                        existingNodes[uri2] = 1;
                        visjsData.nodes.push({
                            id: uri2,
                            label: label2,
                            shape: shape,
                            color: "grey",
                            size: Lineage_classes.defaultShapeSize,
                            data: {
                                id: uri2,
                                label: label2,
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

    self.FunctionalStyleSyntaxToJson = function (functionalStyleStrArray) {
        function getUri(str) {
            if (!str) {
                return null;
            }
            return str.replace(/[<>]/g, "");
        }

        /*    var regex = /([A-z]+)\(([^\)]+)\)/gm;

   var regexNested = /<([^>]+)> ([^\(]+)\(<([^>]+)> <([^>]+)>/gm;


    //  var regexNested = /([^<]+)\(<([^>]+)> <([^>]+)>\)/*/

        var regex = /([A-z]+)\(([^\)]+)\)/gm;
        var regexNested = /([^\(^"]+)\(<([^>]+)> ([^\(]+)\(<([^>]+)> <([^>]+)>/; //nested expression

        var array = [];
        var json = [];

        functionalStyleStrArray.forEach(function (functionalStyleStr) {
            if ((array = regexNested.exec(functionalStyleStr)) != null) {
                //nested expression
                var subject = array[2];
                var predicate = array[3];
                var object1 = array[4];
                var object2 = array[5];

                var bNode = "_:" + common.getRandomHexaId(8);
                json.push({ subject: subject, predicate: predicate, object: bNode });
                json.push({ subject: bNode, predicate: "owl:first", object: object1 });
                json.push({ subject: bNode, predicate: "owl:rest", object: object2 });
            } else if ((array = regex.exec(functionalStyleStr)) != null) {
                var array2 = array[2].split(" ");
                if (array2.length == 2) {
                    var object = getUri(array2[0]);
                    var subject = getUri(array2[1]);

                    json.push({ subject: subject, predicate: array[1], object: object });
                }
            }
        });
        return json;
    };

    return self;
})();

export default Lineage_reasoner;
window.Lineage_reasoner = Lineage_reasoner;
