import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";

import common from "../../shared/common.js";
self.lineageVisjsGraph;
import Lineage_whiteboard from "./lineage_whiteboard.js";
import SearchWidget from "../../uiWidgets/searchWidget.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
var Lineage_graphTraversal = (function () {
    var self = {};

    /**
     *
     * get nodes shortest path from server
     *
     * @param source
     * @param fromNodeId
     * @param toNodeId
     * @param callback return shortestPath nodes array
     */
    self.getShortestpathUris = function (source, fromNodeId, toNodeId, options, callback) {
        var body = {
            sparqlServerUrl: Config.sources[source].sparql_server.url,
            graphUri: Config.sources[source].graphUri,
            fromNodeUri: fromNodeId,
            toNodeUri: toNodeId,
            numberOfPathes: options.numberOfPathes || 1,
        };

        var payload = {
            body: body,
        };
        $.ajax({
            type: "POST",
            url: `${Config.apiUrl}/shortestPath`,
            data: payload,
            dataType: "json",
            success: function (data, _textStatus, _jqXHR) {
                return callback(null, data);
            },
            error: function (err) {
                return callback(err);
            },
        });
    };

    self.getShortestPathObjects = function (source, fromNodeId, toNodeId, options, callback) {
        var path = [];
        var relations = [];
        var labelsMap = {};
        if (!options) {
            options = {};
        }

        async.series(
            [
                //get shortestPath nodes array
                function (callbackSeries) {
                    self.getShortestpathUris(source, fromNodeId, toNodeId, options, function (err, result) {
                        if (err) return callbackSeries(err);
                        path = result;

                        if (path.length == 0) return alert("no path found ");

                        callbackSeries();
                    });
                },
                //get labels
                function (callbackSeries) {
                    var ids = [];
                    path.forEach(function (item) {
                        item.forEach(function (item2) {
                            ids.push(item2);
                        });
                    });

                    var fitlerStr = Sparql_common.setFilter("s", ids);

                    var fromStr = Sparql_common.getFromStr(source, true);
                    var query =
                        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                        "SELECT distinct * " +
                        fromStr +
                        " WHERE { GRAPH ?g {" +
                        // "?s rdf:type ?type "+ Sparql_common.getVariableLangLabel("s", true)+"" +
                        Sparql_common.getVariableLangLabel("s", false) +
                        "" +
                        fitlerStr +
                        "}" +
                        "} limit 10000";

                    var url = Config.sources[source].sparql_server.url;
                    +"?format=json&query=";
                    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
                        result.results.bindings.forEach(function (item) {
                            labelsMap[item.s.value] = item.sLabel ? item.sLabel.value : Sparql_common.getLabelFromURI("s");
                        });
                        callbackSeries();
                    });
                },
                // setRelations
                function (callbackSeries) {
                    path.forEach(function (item) {
                        var relation = {
                            from: item[0],
                            fromLabel: labelsMap[item[0] || Sparql_common.getLabelFromURI(item[0])],

                            prop: item[2],
                            propLabel: labelsMap[item[2] || Sparql_common.getLabelFromURI(item[2])],

                            to: item[1],
                            toLabel: labelsMap[item[1] || Sparql_common.getLabelFromURI(item[1])],
                        };
                        relations.push(relation);
                    });
                    return callbackSeries();
                },
            ],
            function (err) {
                return callback(err, relations);
            },
        );
    };

    self.showShortestPathDialog = function () {
        self.pathFromUri = null;
        self.pathToUri = null;

        $("#mainDialogDiv").load("modules/tools/lineage/html/lineage_shortestPathDialog.html", function () {
            $("#mainDialogDiv").dialog("open");
            $("#lineage_shorterstPath_searchInput").bind("keydown", null, Lineage_graphTraversal.onSearchKeyDown);
            $("#lineage_DrawAllPaths").prop("disabled", true);
            $("#Lineage_graphTraversal_numberOfPathes").prop("disabled", true);
        });
    };

    self.initVisjsPathMode = function () {
        self.inPathMode = true;
        Lineage_whiteboard.lineageVisjsGraph.network.addEdgeMode();
        $("#mainDialogDiv").dialog("close");
    };

    self.showPathNodesList = function (source, path) {
        var filter = Sparql_common.setFilter("subject", path, null);
        Sparql_OWL.getItems(source, { filter: filter }, function (err, result) {});
    };

    self.onSearchKeyDown = function (event) {
        if (event.keyCode != 13 && event.keyCode != 9) return;
        var term = $("#lineage_shorterstPath_searchInput").val();
        var exactMatch = $("#lineage_shorterstPath_exactMatchCBX").prop("checked");
        if (!exactMatch && term.indexOf("*") < 0) term += "*";
        self.searchConcept(term, exactMatch);
    };

    self.searchConcept = function (term, exactMatch) {
        /**
         *
         * show in jstree hierarchy of terms found in elestic search  from research UI or options if any
         *
         * @param options
         *  -term searched term
         *  -selectedSources array od sources to search
         *  -exactMatch boolean
         *  -searchAllSources
         *  -jstreeDiv
         *  -parentlabels searched in Elastic
         *  -selectTreeNodeFn
         *  -contextMenufn
         *
         */

        var options = {
            term: term,
            selectedSources: [Lineage_sources.activeSource],
            exactMatch: exactMatch,
            jstreeDiv: "lineage_shorterstPath_searchJsTreeDiv",
            selectTreeNodeFn: Lineage_graphTraversal.selectTreeNodeFn,
            contextMenu: Lineage_graphTraversal.contextMenufn,
        };

        SearchWidget.searchTermInSources(options);
    };

    self.contextMenufn = function () {
        var items = {};

        items.setFromNode = {
            label: "from node",
            action: function (_e, _xx) {
                self.pathFromUri = self.currentTreeNode.data.id;
                $("#lineage_shorterstPathFromUri").html(self.currentTreeNode.data.label);
                self.clearPathList();
            },
        };
        items.seToNode = {
            label: "to node",
            action: function (_e, _xx) {
                self.pathToUri = self.currentTreeNode.data.id;
                $("#lineage_shorterstPathToUri").html(self.currentTreeNode.data.label);
                self.clearPathList();
            },
        };

        return items;
    };
    self.selectTreeNodeFn = function (event, obj) {
        self.currentTreeNode = obj.node;
        if (!self.pathFromUri) {
            self.pathFromUri = self.currentTreeNode.data.id;
            $("#lineage_shorterstPathFromUri").html(self.currentTreeNode.data.label);
            self.clearPathList();
        } else if (!self.pathToUri) {
            self.pathToUri = self.currentTreeNode.data.id;
            $("#lineage_shorterstPathToUri").html(self.currentTreeNode.data.label);
            self.clearPathList();
        }
    };

    self.listShortestPath = function (source, fromUri, toUri) {
        if (!source) source = Lineage_sources.activeSource;
        if (!fromUri) fromUri = self.pathFromUri;
        if (!toUri) toUri = self.pathToUri;
        if (fromUri == toUri) return alert(" from node and to node must be different");

        self.getShortestPathObjects(source, fromUri, toUri, {}, function (err, relations) {
            if (err) return alert(err.responseText);

            var html = "";
            var previousTo = null;
            relations.forEach(function (relation, index) {
                var from = relation.fromLabel;
                var prop = relation.propLabel != undefined ? relation.propLabel : relation.prop + "->";
                var to = relation.toLabel;
                if (index > 0) {
                    if (from != previousTo) {
                        var to = relation.fromLabel;
                        var prop = "<-" + (relation.propLabel != undefined ? relation.propLabel : relation.prop);
                        var from = relation.toLabel;
                    }
                }
                html += "<div class='lineage_shorterstPath_predicate' id='PATH_" + index + "' onClick='' >";
                html += "<div class=lineage_shorterstPath_object>" + from + "</div>";
                html += "<div class=lineage_shorterstPath_property>" + prop + "</div>";
                html += "<div class=lineage_shorterstPath_object>" + to + "</div>";
                html += "</div>";
                previousTo = to;
            });

            $("#lineage_shorterstPathListDiv").html(html);
        });
    };

    self.drawPathesOnWhiteboard = function draw(relations) {
        var visjsData = { nodes: [], edges: [] };
        var existingIdsMap = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();

        var shape = Lineage_whiteboard.defaultShape;
        var source = Lineage_sources.activeSource;
        var color = Lineage_whiteboard.getSourceColor(Lineage_sources.activeSource);
        relations.forEach(function (relation, index) {
            if (!existingIdsMap[relation.from]) {
                existingIdsMap[relation.from] = 1;
                var node = {
                    id: relation.from,
                    label: relation.fromLabel,
                    shadow: Lineage_whiteboard.nodeShadow,
                    shape: shape,
                    color: color,
                    size: Lineage_whiteboard.defaultShapeSize,
                    data: {
                        source: source,
                        id: relation.from,
                        label: relation.fromLabel,
                    },
                };
                visjsData.nodes.push(node);
            }
            if (!existingIdsMap[relation.to]) {
                existingIdsMap[relation.to] = 1;
                var node = {
                    id: relation.to,
                    label: relation.toLabel,
                    shadow: Lineage_whiteboard.nodeShadow,
                    shape: shape,
                    color: color,
                    size: Lineage_whiteboard.defaultShapeSize,
                    data: {
                        source: source,
                        id: relation.to,
                        label: relation.toLabel,
                    },
                };
                visjsData.nodes.push(node);
            }

            var edgeId = "P_" + common.getRandomHexaId(6);
            if (!existingIdsMap[edgeId]) {
                existingIdsMap[edgeId] = 1;

                visjsData.edges.push({
                    id: edgeId,
                    from: relation.from,
                    to: relation.to,
                    label: relation.propLabel != undefined ? relation.propLabel : relation.prop,
                    color: "red",
                    size: 3,
                    // arrows: arrows,
                    type: "path",
                    data: {
                        source: source,
                        type: "path",
                        id: edgeId,
                        from: relation.from,
                        to: relation.to,
                        label: relation.propLabel,
                    },
                });
            }
        });
        if (Lineage_whiteboard.lineageVisjsGraph.data) {
            var oldEdges = Lineage_whiteboard.lineageVisjsGraph.data.edges.get();
            var toDelete = [];
            oldEdges.forEach(function (edge) {
                if (edge.type == "path") toDelete.push(edge.id);
            });
            Lineage_whiteboard.lineageVisjsGraph.data.edges.remove(toDelete);
        }

        if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
            Lineage_whiteboard.lineageVisjsGraph.data.nodes.add(visjsData.nodes);
            Lineage_whiteboard.lineageVisjsGraph.data.edges.add(visjsData.edges);
        } else {
            Lineage_whiteboard.drawNewGraph(visjsData);
        }
    };

    self.drawAllShortestPathes = function (source, fromUri, toUri, numberOfPathes) {
        if (!source) source = Lineage_sources.activeSource;
        if (!fromUri) fromUri = self.pathFromUri;
        if (!toUri) toUri = self.pathToUri;
        if (!numberOfPathes) numberOfPathes = parseInt($("#Lineage_graphTraversal_numberOfPathes").val());

        self.getShortestPathObjects(source, fromUri, toUri, { numberOfPathes: numberOfPathes }, function (err, relations) {
            if (err) return alert(err.responseText);
            self.drawPathesOnWhiteboard(relations);
            $("#mainDialogDiv").dialog("close");
        });
    };

    self.drawShortestPath = function (source, fromUri, toUri) {
        if (!source) source = Lineage_sources.activeSource;
        if (!fromUri) fromUri = self.pathFromUri;
        if (!toUri) toUri = self.pathToUri;

        if (fromUri == toUri) return alert(" from node and to node must be different");

        self.getShortestPathObjects(source, fromUri, toUri, {}, function (err, relations) {
            if (err) return alert(err.responseText);
            self.drawPathesOnWhiteboard(relations);
            $("#mainDialogDiv").dialog("close");
        });
    };

    self.clearPathList = function () {
        $("#lineage_shorterstPathListDiv").html("");
    };

    self.clearNodes = function () {
        self.pathFromUri = null;
        $("#lineage_shorterstPathFromUri").html("");

        self.pathToUri = null;
        $("#lineage_shorterstPathToUri").html("");
        self.clearPathList();
    };

    return self;
})();

/*

edges=[];



edges.push(["A", "B"]);
edges.push(["B", "C"])
edges.push(["B", "E"])
edges.push(["C", "D"])
edges.push(["C", "E"])
edges.push(["C", "G"])
edges.push(["D", "E"])
edges.push(["E", "F"]);
var path=GraphTraversal.getShortestPath(edges,"G","A")
console.log(path.toString());

 */

export default Lineage_graphTraversal;

window.Lineage_graphTraversal = Lineage_graphTraversal;
