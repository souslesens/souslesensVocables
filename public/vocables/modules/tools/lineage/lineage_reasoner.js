import common from "../../shared/common.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import VisjsUtil from "../../graph/visjsUtil.js";

import Lineage_whiteboard from "./lineage_whiteboard.js";
import Lineage_sources from "./lineage_sources.js";
import sparql_common from "../../sparqlProxies/sparql_common.js";

/**
 * @module Lineage_reasoner
 * @description Module for performing reasoning operations on ontologies.
 * Provides functionality for:
 * - Running inference operations on ontologies
 * - Checking ontology consistency
 * - Detecting unsatisfiable classes
 * - Managing inference rules and predicates
 * - Visualizing reasoning results
 * - Supporting different reasoning operations
 * - Handling reasoning errors and results
 */

var Lineage_reasoner = (function () {
    var self = {};
    self.inferenceTriples = [];

    // self.ontologyAccessType="internalGraphUri"
    self.ontologyAccessType = "externalUrl";
    self.loaded = false;
    self.currentSource;

    /**
     * Shows the reasoner dialog with options for different reasoning operations.
     * @function
     * @name showReasonerDialog
     * @memberof module:Lineage_reasoner
     * @returns {void}
     */
    self.showReasonerDialog = function () {
        self.currentSource = Lineage_sources.activeSource;
        $("#smallDialogDiv").load("modules/tools/lineage/html/lineage_reasoner.html", function () {
            UI.openDialog("smallDialogDiv", { title: "Reasoner" });
            UI.clampAndCenterDialog("smallDialogDiv");
            if (!self.loaded) {
                self.loaded = true;
                $("#lineage_reasoner_outputDiv").css("display", "none");
            }
        });
    };

    /**
     * Runs a selected reasoning operation (Inference, Consistency, or Unsatisfiable).
     * @function
     * @name runOperation
     * @memberof module:Lineage_reasoner
     * @param {string} operation - The type of reasoning operation to run.
     * @returns {void}
     */
    self.runOperation = function (operation) {
        self.currentOperation = operation;
        //  $("#lineage_reasoner_outputDiv").css("display", "none");
        $("#lineage_reasoner_operationSelect").val("");
        // $("#lineage_reasoner_outputDiv").css("display", "none");
        $("#lineage_reasoner_infosDiv").html("<span style='color:green;font-style:italic'>Processing " + Lineage_sources.activeSource + "...</span>");
        if (operation == "Inference") {
            self.showInferencePredicates();
        } else if (operation == "Consistency") {
            self.runConsistency();
        } else if (operation == "Unsatisfiable") {
            self.runUnsatisfiable();
        }
    };

    /**
     * Runs a consistency check on the current ontology.
     * @function
     * @name runConsistency
     * @memberof module:Lineage_reasoner
     * @returns {void}
     */
    self.runConsistency = function () {
        self.runReasonerReport("consistency");
    };

    /**
     * Runs the consistency or unsatisfiability rules of the SPARQL reasoner on the active source and shows their report.
     * @function
     * @name runReasonerReport
     * @memberof module:Lineage_reasoner
     * @param {string} operation - "consistency" or "unsatisfiable"
     * @returns {void}
     */
    self.runReasonerReport = function (operation) {
        const params = new URLSearchParams({
            operation: operation,
            source: Lineage_sources.activeSource,
        });
        $("#lineage_reasoner_infosDiv").html("<span style='color:green;font-style:italic'>Processing " + Lineage_sources.activeSource + "...</span>");

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/reasoner?" + params.toString(),
            dataType: "json",
            success: function (report, _textStatus, _jqXHR) {
                $("#lineage_reasoner_infosDiv").html($("<pre>").text(JSON.stringify(report, null, 2)));
            },
            error(err) {
                MainController.errorAlert(err);
            },
        });
    };

    /**
     * Runs an unsatisfiability check on the current ontology.
     * @function
     * @name runUnsatisfiable
     * @memberof module:Lineage_reasoner
     * @returns {void}
     */
    self.runUnsatisfiable = function () {
        self.runReasonerReport("unsatisfiable");
    };

    /**
     * Shows available inference predicates in a tree structure.
     * @function
     * @name showInferencePredicates
     * @memberof module:Lineage_reasoner
     * @returns {void}
     */
    self.showInferencePredicates = function () {
        $("#lineage_reasoner_infosDiv").html("getting inference rules ...");

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/reasoner?operation=inferenceRules",
            dataType: "json",

            success: function (inferenceRules, _textStatus, _jqXHR) {
                $("#lineage_reasoner_outputDiv").css("display", "block");
                common.fillSelectWithColorPalette("lineage_reasoner_colorSelect");
                common.fillSelectWithColorPalette("lineage_reasoner_colorSelect");
                var jstreeData = [];
                inferenceRules.forEach(function (inferenceRule) {
                    jstreeData.push({
                        id: inferenceRule.id,
                        text: inferenceRule.id,
                        parent: "#",
                    });
                });
                var options = {
                    openAll: true,
                    withCheckboxes: true,
                };

                $("#lineage_reasoner_infosDiv").html("<div id='reasonerTreeContainerDiv', style=width:300px;height:500px'>");
                JstreeWidget.loadJsTree("reasonerTreeContainerDiv", jstreeData, options);
            },
            error(err) {
                MainController.errorAlert(err);
            },
        });
    };

    /**
     * Runs the selected inference rules of the SPARQL reasoner.
     * @function
     * @name runInference
     * @memberof module:Lineage_reasoner
     * @param {Array<string>} ruleIds - Ids of the inference rules to run.
     * @param {Function} callback - Callback function with signature (error, result).
     * @returns {void}
     */
    self.runInference = function (ruleIds, callback) {
        const params = new URLSearchParams({
            operation: "inference",
            source: self.currentSource,
            ruleIds: JSON.stringify(ruleIds),
        });
        $("#lineage_reasoner_infosDiv").html("<span style='color:green;font-style:italic'>Processing " + self.currentSource + "...</span>");

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/reasoner?" + params.toString(),

            dataType: "json",

            success: function (report, _textStatus, _jqXHR) {
                if (report.failedChecks.length > 0) {
                    var failedRuleIds = report.failedChecks.map(function (failedCheck) {
                        return failedCheck.id;
                    });
                    UI.message("rules not evaluated: " + failedRuleIds.join(", "), true);
                }
                if (report.inferredTriples.length == 0) {
                    return $("#lineage_reasoner_infosDiv").html("<span style='color:blue;font-weigth:bold'>No results</span>");
                }
                var inferredTriplesByRuleId = {};
                report.inferredTriples.forEach(function (inferredTriple) {
                    var triple = { subject: inferredTriple.s.value, predicate: inferredTriple.p.value, object: inferredTriple.o.value };
                    inferredTriple.rules.forEach(function (ruleId) {
                        if (!inferredTriplesByRuleId[ruleId]) {
                            inferredTriplesByRuleId[ruleId] = [];
                        }
                        inferredTriplesByRuleId[ruleId].push(triple);
                    });
                });

                self.setInferenceTripleLabels(self.currentSource, inferredTriplesByRuleId, function (err, result) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, inferredTriplesByRuleId);
                });
            },
            error(err) {
                MainController.errorAlert(err);
                if (callback) {
                    return callback(err);
                }
            },
        });
    };

    /**
     * Executes the selected reasoning operation and displays results.
     * @function
     * @name execute
     * @memberof module:Lineage_reasoner
     * @returns {void}
     */
    self.execute = function () {
        $("#lineage_reasoner_outputDiv").css("display", "block");
        if (self.currentOperation == "Inference") {
            var predicates = $("#reasonerTreeContainerDiv").jstree().get_checked();
            self.currentInferencePredicates = predicates;
            self.runInference(predicates, function (err, result) {
                if (err) {
                    return MainController.errorAlert(err);
                }
                self.inferenceData = result;
                self.listInferenceSubjects();
                // self.displayInference();
            });
        } else if (self.currentOperation == "Consistency") {
            self.displayConsistency();
        } else if (self.currentOperation == "Unsatisfiable") {
            self.displayUnsatisfiable();
        }
    };

    self.displayConsistency = function () {};

    self.displayUnsatisfiable = function () {};

    /**
     * Lists subjects from inference results in a tree structure.
     * @function
     * @name listInferenceSubjects
     * @memberof module:Lineage_reasoner
     * @returns {void}
     */
    self.listInferenceSubjects = function () {
        var uniqueSubjects = {};
        var jstreeData = [
            {
                id: "root",
                text: self.currentInferencePredicates,
                parent: "#",
            },
        ];
        for (var pred in self.inferenceData) {
            self.inferenceData[pred].forEach(function (item) {
                if (!uniqueSubjects[item.subject]) {
                    uniqueSubjects[item.subject] = 1;

                    jstreeData.push({
                        id: item.subject,
                        text: item.subjectLabel || sparql_common.getLabelFromURI(item.subject),
                        parent: "root",
                    });
                }
            });
        }
        var options = {
            openAll: true,
            withCheckboxes: true,
        };

        $("#lineage_reasoner_infosDiv").html("<div id='reasonerSubjectsDiv' style=width:300px;height:500px'>");
        JstreeWidget.loadJsTree("reasonerSubjectsDiv", jstreeData, options);
    };

    /**
     * Displays inference results in either table or graph format.
     * @function
     * @name displayInference
     * @memberof module:Lineage_reasoner
     * @returns {void}
     */
    self.displayInference = function () {
        var output = $("#lineage_reasoner_outputSelect").val();

        if (output == "Table") {
            $("#lineage_reasoner_infosDiv").html(JSON.stringify(self.inferenceData));
        } else if (output == "Graph") {
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
            var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
            var edgeColor = $("#lineage_reasoner_colorSelect").val();
            var nodes = {};
            filteredData.forEach(function (item) {
                var label = item.subjectLabel || Sparql_common.getLabelFromURI(item.subject);
                if (!existingNodes[item.subject]) {
                    existingNodes[item.subject] = 1;
                    var node = VisjsUtil.getVisjsNode(self.currentSource, item.subject, label, item.predicate, { shape: "square" });
                    nodes[item.subject] = node;
                } else {
                    if (nodes[item.subject]) {
                        nodes[item.subject] = VisjsUtil.setVisjsNodeAttributes(self.currentSource, nodes[item.subject], label, { shape: "square" });
                    }
                }

                var label2, shape, color;
                label2 = item.objectLabel || Sparql_common.getLabelFromURI(item.object);
                if (!existingNodes[item.object]) {
                    existingNodes[item.object] = 1;
                    var node = VisjsUtil.getVisjsNode(self.currentSource, item.object, label2, null, { shape: "square" });
                    nodes[item.object] = node;
                }

                if (item.subject && item.object) {
                    var edgeId = item.subject + "_" + item.object;
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;
                        visjsData.edges.push({
                            id: edgeId,
                            from: item.subject,
                            to: item.object,
                            label: item.predicate,
                            color: edgeColor || "red",
                            font: { size: 10 },
                            arrows: {
                                to: {
                                    enabled: true,
                                    type: Lineage_whiteboard.defaultEdgeArrowType,
                                    scaleFactor: 0.5,
                                },
                            },
                        });
                    }
                }
            });

            for (var nodeId in nodes) {
                visjsData.nodes.push(nodes[nodeId]);
            }

            var predicates = $("#reasonerSubjectsDiv").jstree().get_checked();
            if (predicates) {
                visjsData = self.filterVisjsDataPath(predicates, visjsData);
            }

            if (!Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                Lineage_whiteboard.drawNewGraph(visjsData);
            }
            Lineage_whiteboard.addVisDataToGraph(visjsData);

            Lineage_whiteboard.lineageVisjsGraph.network.fit();
            $("#waitImg").css("display", "none");
        }
    };

    self.filterVisjsDataPath = function (nodeIds, visjsData) {
        var path = [];
        var visited = {};
        if (nodeIds.length == 0) {
            return visjsData;
        }

        /**
         * Recursively processes nodes in the inference tree.
         * @function
         * @name recurse
         * @memberof module:Lineage_reasoner
         * @param {string} nodeId - The ID of the node to process.
         * @returns {void}
         * @private
         */
        function recurse(nodeId) {
            if (!visited[nodeId]) {
                visited[nodeId] = 1;
                visjsData.edges.forEach(function (edge) {
                    if (edge.from == nodeId) {
                        path.push(edge);
                        recurse(edge.to);
                    }
                });
            }
        }

        nodeIds.forEach(function (nodeId) {
            recurse(nodeId);
        });

        var visjsData2 = { nodes: [], edges: path };
        var uniqueNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
        path.forEach(function (edge) {
            visjsData.nodes.forEach(function (node) {
                if (edge.from == node.id || edge.to == node.id) {
                    if (!uniqueNodes[node.id]) {
                        uniqueNodes[node.id] = 1;
                        visjsData2.nodes.push(node);
                    }
                }
            });
        });

        return visjsData2;
    };

    self.HermitFunctionalStyleSyntaxToJson = function (functionalStyleStr) {
        var regex = /SubClassOf\(<([^()]*)> ([^()]*)\)/gm;

        var array = [];
        var json = [];

        var subClasses = [];
        while ((array = regex.exec(functionalStyleStr)) != null) {
            var triple = {
                subject: array[1],
                predicate: "rdfs:subClassOf",
                object: array[2].replace("<", "").replace(">", ""),
            };
            subClasses.push(triple);
        }

        return subClasses;
    };

    self.FunctionalStyleSyntaxToJson = function (functionalStyleStrArray) {
        /**
         * Extracts a URI from a string.
         * @function
         * @name getUri
         * @memberof module:Lineage_reasoner
         * @param {string} str - The string containing a URI.
         * @returns {string} The extracted URI.
         * @private
         */
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

        /**
         * Cleans Jena-specific URI formatting.
         * @function
         * @name cleanJenaUris
         * @memberof module:Lineage_reasoner
         * @param {string} uri - The URI to clean.
         * @returns {string} The cleaned URI.
         * @private
         */
        function cleanJenaUris(uri) {
            return uri.replace("file:/", "");
            //  return uri.replace("file:/", "_:");
        }

        self.subjects = [];
        if (!Array.isArray(functionalStyleStrArray)) {
            functionalStyleStrArray = [functionalStyleStrArray];
        }
        functionalStyleStrArray.forEach(function (functionalStyleStr) {
            if ((array = regexNested.exec(functionalStyleStr)) != null) {
                //nested expression
                var subject = cleanJenaUris(array[2]);
                var predicate = array[3];
                var object1 = cleanJenaUris(array[4]);
                var object2 = cleanJenaUris(array[5]);

                var bNode = "_:" + common.getRandomHexaId(8);
                json.push({ subject: subject, predicate: predicate, object: bNode });
                json.push({ subject: bNode, predicate: "owl:first", object: object1 });
                json.push({ subject: bNode, predicate: "owl:rest", object: object2 });
            } else if ((array = regex.exec(functionalStyleStr)) != null) {
                var array2 = array[2].trim().split(" ");
                if (array2.length == 2) {
                    var object = cleanJenaUris(getUri(array2[0]));
                    var subject = cleanJenaUris(getUri(array2[1]));

                    json.push({ subject: subject, predicate: array[1], object: object });
                }
            }
        });
        return json;
    };

    self.setInferenceTripleLabels = function (source, inferencesMap, callback) {
        var urisMap = {};
        for (var pred in inferencesMap) {
            inferencesMap[pred].forEach(function (item) {
                if (!urisMap[item.subject]) {
                    urisMap[item.subject] = "";
                }

                if (!urisMap[item.object]) {
                    urisMap[item.object] = "";
                }
            });
        }
        var filter = Sparql_common.setFilter("id", Object.keys(urisMap), null);

        Sparql_OWL.getDictionary(source, { filter: filter }, null, function (err, result) {
            if (err) {
                return callback(err);
            }
            var nodes = {};
            result.forEach(function (item) {
                if (item.label) {
                    urisMap[item.id.value] = item.label.value;
                }
            });

            for (var pred in inferencesMap) {
                inferencesMap[pred].forEach(function (item, index) {
                    if (urisMap[item.subject]) {
                        item.subjectLabel = urisMap[item.subject];
                    }
                    if (urisMap[item.object]) {
                        item.objectLabel = urisMap[item.object];
                    }
                });
            }
            return callback(null, inferencesMap);
        });
    };

    return self;
})();

export default Lineage_reasoner;
window.Lineage_reasoner = Lineage_reasoner;
