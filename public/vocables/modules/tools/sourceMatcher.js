import common from "./../common.js";
import SourceBrowser from "./sourceBrowser.js";
import visjsGraph from "./../graph/visjsGraph2.js";
import Sparql_common from "./../sparqlProxies/sparql_common.js";
import Sparql_generic from "./../sparqlProxies/sparql_generic.js";
import Sparql_proxy from "./../sparqlProxies/sparql_proxy.js";
import Clipboard from "./../clipboard.js";

/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

//inclure altLabel

var SourceMatcher = (function () {
    var self = {};
    self.maxSourceDescendants = 500;
    self.onSourceSelect = function (sourceLabel) {
        //  $("#actionDivContolPanelDiv").html("<button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='SourceMatcher.showcompareWithDialog()'>Compare with...</button>")
        // $("#actionDivContolPanelDiv").html("<input id='GenericTools_searchTermInput'> <button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='SourceBrowser.searchTerm()'>Search</button>")
        $("#accordion").accordion("option", { active: 2 });
        SourceBrowser.showThesaurusTopConcepts(sourceLabel);

        $("#actionDivContolPanelDiv").load(
            "snippets/sourceMatcher.html",
            function () {
                var sourceLabels = Object.keys(Config.sources).sort();
                common.fillSelectOptions("SourceMatcher_targetGraphUriSelect", sourceLabels, true);
                $("#accordion").accordion("option", { active: 2 });
            },
            200
        );
    };
    self.selectTreeNodeFn = function (event, propertiesMap) {
        $("#SourceMatcher_actionDiv").css("display", "block");
        SourceBrowser.openTreeNode(SourceBrowser.currentTargetDiv, propertiesMap.node.data.source, propertiesMap.node);
        SourceBrowser.currentTreeNode = propertiesMap.node;
    };

    self.compareConcepts = function (compareAll, output, rdfType, fromSourceId, toSourceId, callback) {
        var sourceNodeId;

        if (!fromSourceId) fromSourceId = MainController.currentSource;

        if (!toSourceId) toSourceId = $("#SourceMatcher_targetGraphUriSelect").val();
        if (!fromSourceId) return MainController.UI.message("choose a target resource");

        if (!output) output = $("#SourceMatcher_outputTypeSelect").val();

        if (!rdfType) rdfType = $("#SourceMatcher_rdfTypeSelect").val();

        if (!compareAll) compareAll = $("#SourceMatcher_compareAllCBX").prop("checked");

        if (!SourceBrowser.currentTreeNode) {
            if (!compareAll) {
                if (confirm("compare all  items")) {
                    $("#showOlderGenealogyOnlyCBX").prop("checked", "checked");
                    compareAll = true;
                } else {
                    $("#waitImg").css("display", "none");
                    return;
                }
            }
        } else {
            sourceNodeId = SourceBrowser.currentTreeNode.data.id;

            if (!sourceNodeId || sourceNodeId.length == 0) {
                $("#waitImg").css("display", "none");
                return alert(" no data.id field");
            }
        }

        var showAllSourceNodes = $("#showAllSourceNodesCBX").prop("checked");
        // var showOlderGenealogyOnly = $("#showOlderGenealogyOnlyCBX").prop("checked");
        var maxDescendantsDepth = parseInt($("#SourceMatcher_maxDescendantsDepth").val());
        // var lang = "en"

        var sourceConceptAggrDepth = maxDescendantsDepth;
        var targetConceptAggrDepth = maxDescendantsDepth;
        var sliceSize = 30;

        var sourceConceptsCount = 0;
        var sourceConceptsProcessed = 0;
        var targetConceptsCount = 0;
        var allSourceConcepts = [];
        var commonConceptsMap = {};
        $("#dialogDiv").dialog("close");

        var targetSparql_url = Config.sources[toSourceId].sparql_server.url;
        var targetGraphURI = Config.sources[toSourceId].graphUri;

        var matchResult = "";
        async.series(
            [
                //get source source Descendants
                function (callbackSeries) {
                    if (compareAll) return callbackSeries();

                    Sparql_generic.getNodeChildren(fromSourceId, null, sourceNodeId, sourceConceptAggrDepth, null, function (err, result) {
                        //                       Concepts.getConceptDescendants({depth: sourceConceptAggrDepth, selectLabels: true}, function (err, conceptsSets) {
                        if (err) return callbackSeries(err);
                        result.forEach(function (item) {
                            sourceConceptsCount += 1;
                            for (var i = 0; i <= sourceConceptAggrDepth; i++) {
                                var child = item["child" + i];

                                if (child) {
                                    var childLabel = item["child" + i + "Label"].value;
                                    allSourceConcepts.push({
                                        id: child.value,
                                        label: childLabel,
                                    });
                                    commonConceptsMap[childLabel.toLowerCase()] = { source: { id: child.value, label: childLabel, broaders: [] } };
                                }
                            }
                        });
                        if (sourceConceptsCount > self.maxSourceDescendants && output == "graph") {
                            var ok = confirm("too many nodes  to draw graph: " + sourceConceptsCount + " continue ?");
                            if (!ok) return callbackSeries("too many nodes");
                            ok = confirm("Generate same as triples");
                            if (!ok) {
                                return callbackSeries("too many nodes");
                            }
                            output = "triples";

                            return callbackSeries();
                        }
                        MainController.UI.message(sourceConceptsCount + " found in " + fromSourceId);
                        callbackSeries();
                    });
                },

                // compare all
                function (callbackSeries) {
                    if (!compareAll) return callbackSeries();
                    var options = {};
                    if (rdfType && rdfType != "") options = { filter: "?subject rdf:type " + rdfType };
                    Sparql_generic.getItems(fromSourceId, options, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        sourceConceptsCount = result.length;
                        result.forEach(function (item) {
                            allSourceConcepts.push({
                                id: item.subject.value,
                                label: item.subjectLabel.value,
                            });
                            commonConceptsMap[item.subjectLabel.value.toLowerCase()] = { source: { id: item.subject.value, label: item.subjectLabel.value, broaders: [] } };
                        });
                        callbackSeries();
                    });
                },

                //search selected concepts  and descendants in targetThesaurus
                function (callbackSeries) {
                    // Should we remove this line or the false in the test condition ? It always evaluates to false
                    // if (false && output == "stats") return callbackSeries();

                    var sourceConceptsSlices = common.array.slice(allSourceConcepts, sliceSize);
                    async.eachSeries(
                        sourceConceptsSlices,
                        function (sourceConcepts, callbackEach) {
                            sourceConceptsProcessed = sourceConcepts.length;
                            var words = sourceConcepts.map((concept) => concept.label.replace(/[-"]/g, ""));

                            Sparql_generic.getNodeParents(toSourceId, words, null, targetConceptAggrDepth, { exactMatch: true }, function (err, result) {
                                if (err) {
                                    return callbackEach(err);
                                }
                                targetConceptsCount += result.length;

                                result.forEach(function (item) {
                                    var targetObj = {
                                        id: item.subject.value,
                                        label: item.subjectLabel.value,
                                    };
                                    var targetBroaders = [];
                                    for (var i = 1; i < targetConceptAggrDepth; i++) {
                                        var broaderId = item["broader" + i];
                                        if (typeof broaderId !== "undefined") {
                                            if (targetBroaders.indexOf(broaderId.value) < 0) {
                                                var broaderLabel = item["broader" + i + "Label"];
                                                if (typeof broaderLabel !== "undefined") broaderLabel = item["broader" + i + "Label"].value;
                                                else broaderLabel = broaderId.value;
                                                targetBroaders.push({ level: i, id: broaderId.value, label: broaderLabel });
                                            }
                                        } else {
                                            //   targetBroaders.push({level: j, id:null, label: ""})
                                        }
                                    }
                                    targetObj.broaders = targetBroaders;
                                    if (commonConceptsMap[item.subjectLabel.value.toLowerCase()]) {
                                        commonConceptsMap[item.subjectLabel.value.toLowerCase()].target = targetObj;
                                    }
                                });
                                MainController.UI.message(targetConceptsCount + " processed" + sourceConceptsProcessed + "/" + sourceConceptsCount);
                                return callbackEach();
                            });
                        },
                        function (err) {
                            if (Object.keys(commonConceptsMap).length == 0) {
                                //  alert(("no matching concepts"))
                            }
                            MainController.UI.message("drawing" + targetConceptsCount + "/" + sourceConceptsCount + " concepts");
                            return callbackSeries(err);
                        }
                    );
                },
                //get source broaders
                function (callbackSeries) {
                    if (output == "stats" || output == "triples") return callbackSeries();
                    var conceptIds = [];

                    for (var key in commonConceptsMap) {
                        var fromSourceId = commonConceptsMap[key].source.id;
                        if (conceptIds.indexOf(fromSourceId) < 0) conceptIds.push(fromSourceId);
                    }
                    if (conceptIds.length == 0) return callbackSeries();

                    var conceptIdsSlices = common.array.slice(conceptIds, sliceSize);
                    async.eachSeries(
                        conceptIdsSlices,
                        function (conceptIds, callbackSeriesSourceBroaders) {
                            Sparql_generic.getNodeParents(toSourceId, null, conceptIds, maxDescendantsDepth, null, function (err, result) {
                                if (err) {
                                    return callbackSeriesSourceBroaders(err);
                                }
                                result.forEach(function (item) {
                                    var sourceBroaders = [];
                                    for (var i = 1; i < 8; i++) {
                                        var broaderId = item["broader" + i];
                                        if (typeof broaderId !== "undefined") {
                                            if (sourceBroaders.indexOf(broaderId.value) < 0) {
                                                sourceBroaders.push({ level: i, id: broaderId.value, label: item["broader" + i + "Label"].value });
                                            }
                                        }
                                    }
                                    if (item.subjectLabel && item.subjectLabel.value && commonConceptsMap[item.subjectLabel.value.toLowerCase()]) {
                                        commonConceptsMap[item.subjectLabel.value.toLowerCase()].source.broaders = sourceBroaders;
                                    }
                                });

                                callbackSeriesSourceBroaders();
                            });
                        },
                        function (_err) {
                            return callbackSeries();
                        }
                    );
                },

                //draw commonConcepts
                function (callbackSeries) {
                    if (output != "graph") return callbackSeries();
                    var visjsData = { nodes: [], edges: [] };
                    var uniqueNodes = [];
                    var uniqueEdges = [];
                    var currentX = 0;
                    var currentY = 50;
                    var xOffset = 150;
                    var yOffset = 30;

                    function addBroaderNodes(broaders, childId, startOffest, direction, color, source) {
                        broaders.forEach(function (itemBroader, index) {
                            if (uniqueNodes.indexOf(itemBroader.id) < 0) {
                                uniqueNodes.push(itemBroader.id);

                                var broaderSourceNode = {
                                    id: itemBroader.id,
                                    label: itemBroader.label,
                                    color: color,
                                    data: { source: source },
                                    shape: "box",
                                    fixed: { x: true, y: false },
                                    x: direction * (startOffest + xOffset * (index + 1)),
                                };
                                visjsData.nodes.push(broaderSourceNode);
                            } else {
                                visjsData.nodes.forEach(function (node) {
                                    if (node.id == itemBroader.id) {
                                        node.x = direction * (startOffest + xOffset * (index + 1));
                                    }
                                });
                            }
                            var edgeFromId;
                            if (index == 0) edgeFromId = childId;
                            else edgeFromId = broaders[index - 1].id;
                            var edgeId = edgeFromId + "_" + itemBroader.id;

                            if (uniqueEdges.indexOf(edgeId) < 0) {
                                uniqueEdges.push(edgeId);
                                visjsData.edges.push({
                                    id: edgeId,
                                    from: edgeFromId,
                                    to: itemBroader.id,
                                });
                            }
                        });
                    }

                    for (var key in commonConceptsMap) {
                        var item = commonConceptsMap[key];

                        if (showAllSourceNodes || (!showAllSourceNodes && item.target)) {
                            if (uniqueNodes.indexOf(item.source.id) < 0) {
                                uniqueNodes.push(item.source.id);
                                var sourceNode = {
                                    id: item.source.id,
                                    label: item.source.label,
                                    color: "#add",
                                    shape: "box",
                                    data: { source: fromSourceId },
                                    fixed: { x: true, y: true },
                                    x: currentX,
                                    y: currentY,
                                };
                                visjsData.nodes.push(sourceNode);
                                if (item.target) {
                                    if (uniqueNodes.indexOf(item.target.id) < 0) {
                                        uniqueNodes.push(item.target.id);
                                        var targetNode = {
                                            id: item.target.id,
                                            label: item.target.label,
                                            color: "#dda",
                                            shape: "box",
                                            data: { source: fromSourceId },
                                            fixed: { x: true, y: true },
                                            x: currentX + xOffset,
                                            y: currentY,
                                        };
                                        visjsData.nodes.push(targetNode);
                                    }
                                    var edgeId = item.source.id + "_" + item.target.id;
                                    if (uniqueEdges.indexOf(edgeId) < 0) {
                                        uniqueEdges.push(edgeId);
                                        visjsData.edges.push({
                                            id: edgeId,
                                            from: item.source.id,
                                            to: item.target.id,
                                        });
                                    }
                                }
                                addBroaderNodes(item.source.broaders, item.source.id, currentX, -1, "#add", fromSourceId);
                                if (item.target && item.target.broaders) addBroaderNodes(item.target.broaders, item.target.id, currentX + xOffset, +1, "#dda", fromSourceId);
                            }
                            currentY += yOffset;
                        }
                    }

                    visjsGraph.draw("graphDiv", visjsData, { onclickFn: SourceMatcher.onGraphClickNode });
                    return callbackSeries();
                },

                //draw table
                function (callbackSeries) {
                    if (output != "table") return callbackSeries();

                    var nSourceBroaders = 0;
                    var nTargetBroaders = 0;
                    for (var key in commonConceptsMap) {
                        var item = commonConceptsMap[key];
                        nSourceBroaders = Math.max(nSourceBroaders, item.source.broaders.length);
                        if (item.target) nTargetBroaders = Math.max(nTargetBroaders, item.target.broaders.length);
                    }

                    var csv = "";
                    for (key in commonConceptsMap) {
                        item = commonConceptsMap[key];
                        if (showAllSourceNodes || (!showAllSourceNodes && item.target)) {
                            var sourceBroadersStr = "";
                            for (var i = 0; i < nSourceBroaders; i++) {
                                if (i >= item.source.broaders.length) sourceBroadersStr += "\t";
                                else sourceBroadersStr = item.source.broaders[i].label + "\t" + sourceBroadersStr;
                                // csv += item.source.broaders[i].label+ "\t";
                            }
                            csv += sourceBroadersStr;
                            csv += item.source.label + "\t";

                            if (item.target) {
                                csv += item.target.label + "\t";
                                if (showOlderGenealogyOnly) {
                                    if (item.target.broaders.length > 0) {
                                        if (item.target.broaders.length > 1) csv += item.target.broaders[item.target.broaders.length - 2].label + "\t";
                                        csv += item.target.broaders[item.target.broaders.length - 1].label;
                                    }
                                } else {
                                    for (i = nTargetBroaders; i > 0; i--) {
                                        if (item.target.broaders.length <= nTargetBroaders - i) {
                                            csv += "\t";
                                            //   if (i <item.target.broaders.length)
                                        } else {
                                            csv += item.target.broaders[nTargetBroaders - i].label + "\t";
                                        }
                                    }
                                }
                            }

                            csv += "\n";
                        }
                    }
                    var maxCols = 0;
                    var dataSet = [];
                    var lines = csv.split("\n");
                    lines.forEach(function (line) {
                        var lineArray = [];
                        var cols = line.split("\t");
                        maxCols = Math.max(maxCols, cols.length);
                        cols.forEach(function (col) {
                            lineArray.push(col);
                        });
                        dataSet.push(lineArray);
                    });
                    var colnames = [];
                    for (i = 0; i < maxCols; i++) {
                        colnames.push({ title: "col" + i });
                    }

                    dataSet.forEach(function (line) {
                        for (var i = line.length; i < maxCols; i++) {
                            line.push("");
                        }
                    });

                    $("#graphDiv").html("<table id='dataTableDiv'></table>");
                    setTimeout(function () {
                        $("#dataTableDiv").DataTable({
                            data: dataSet,
                            columns: colnames,
                            // async: false,
                            dom: "Bfrtip",
                            buttons: ["copy", "csv", "excel", "pdf", "print"],
                        });
                        //     console.log(csv);
                    }, 1000);
                }, //draw triples

                function (callbackSeries) {
                    if (output != "triples") return callbackSeries();
                    var str = "";
                    for (var key in commonConceptsMap) {
                        var item = commonConceptsMap[key];
                        if (item.target) {
                            str += "<" + item.target.id + "> <http://www.w3.org/2002/07/owl#sameAs> <" + item.source.id + ">.\n";
                        }
                    }
                    var html = "<textarea cols='80' rows='30'>" + str + "</textarea>";
                    $("#graphDiv").html(html);
                    callbackSeries();
                },

                //draw stats
                function (callbackSeries) {
                    if (output != "stats") return callbackSeries();

                    // count total individuals in target
                    var query = "";
                    var schemaType = Config.sources[toSourceId].schemaType;
                    if (schemaType == "SKOS") {
                        query = "PREFIX skos: <http://www.w3.org/2004/02/skos/core#> ";
                        "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " + " SELECT (count(distinct ?id)  as ?countItems) ";

                        if (targetGraphURI && targetGraphURI != "") query += Sparql_common.getFromStr(toSourceId);

                        query += " WHERE {" + "?id skos:prefLabel ?prefLabel ." + "?id rdf:type skos:concept." + "} limit 10000";
                    } else if (schemaType == "OWL") {
                        query =
                            " PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
                            " PREFIX  owl: <http://www.w3.org/2002/07/owl#> " +
                            " PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
                            " SELECT (count(distinct ?id)  as ?countItems) ";

                        if (targetGraphURI && targetGraphURI != "") query += Sparql_common.getFromStr(toSourceId);

                        query += " WHERE {" + "?id rdfs:label ?prefLabel .";
                        if (rdfType && rdfType != "") query += "?id rdf:type " + rdfType + ".";
                        query += "} limit 10000";
                    } else return alert("incorrect schema type  for target source");

                    var url = targetSparql_url + "?format=json&query="; // + query + queryOptions
                    Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: toSourceId }, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        var countTargetItems = 0;
                        if (result.results.bindings.length > 0) countTargetItems = result.results.bindings[0].countItems.value;
                        var countSourceItems = 0;
                        var countMatchingItems = 0;
                        for (var key in commonConceptsMap) {
                            var item = commonConceptsMap[key];
                            countSourceItems += 1;
                            if (item.target) {
                                countMatchingItems += 1;
                            }
                        }
                        var html =
                            "<BR>" +
                            rdfType +
                            "<br> <table border='1'>" +
                            "<tr><td>" +
                            fromSourceId +
                            "</td><td>" +
                            toSourceId +
                            "</td><td>Matching items</td></tr>" +
                            "<tr><td>" +
                            countSourceItems +
                            "</td><td>" +
                            countTargetItems +
                            "</td><td>" +
                            countMatchingItems +
                            "</td></tr>";
                        if (callback) $("#graphDiv").append(html);
                        else {
                            $("#graphDiv").html(html);
                        }

                        matchResult = { rdfType: rdfType, from: fromSourceId, to: toSourceId, matchingCount: countMatchingItems, fromCount: countSourceItems, toCount: countTargetItems };
                        return callbackSeries(null);
                    });
                },
            ],

            function (err) {
                $("#waitImg").css("display", "none");
                if (err) {
                    MainController.UI.message(err);
                }
                MainController.UI.message("");
                if (err) {
                    matchResult = { rdfType: rdfType, from: fromSourceId, to: toSourceId, error: err };
                }
                if (callback) callback(null, matchResult);
            }
        );
    };

    self.onGraphClickNode = function (node, point, event) {
        if (!node) return;
        if (event && event.ctrlKey) {
            Clipboard.copy({ type: "node", source: node.data.source, id: node.id, label: node.label }, "_visjsNode", event);
        } else {
            SourceBrowser.showNodeInfos(node.data.source, node, "mainDialogDiv");
        }
    };

    return self;
})();

export default SourceMatcher;

window.SourceMatcher = SourceMatcher;
