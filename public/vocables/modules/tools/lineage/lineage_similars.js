import SourceSelectorWidget from "../../uiWidgets/sourceSelectorWidget.js";
import common from "../../shared/common.js";
import SearchUtil from "../../search/searchUtil.js";

self.lineageVisjsGraph;
import Lineage_whiteboard from "./lineage_whiteboard.js";
import Lineage_sources from "./lineage_sources.js";

/**
 * @module Lineage_similars
 * @description Module for finding and visualizing similar nodes across different ontology sources.
 * Provides functionality for:
 * - Finding nodes with similar labels or properties
 * - Comparing nodes across different sources
 * - Visualizing similar nodes in the graph
 * - Supporting exact and fuzzy matching
 * - Managing source-specific similarity searches
 * - Handling node selection and comparison
 * - Supporting interactive similarity exploration
 */

var Lineage_similars = (function () {
    var self = {};

    /**
     * Shows the dialog for finding similar nodes.
     * @function
     * @name showDialog
     * @memberof module:Lineage_similars
     * @param {boolean} selection - Whether to use selected nodes as the source.
     * @returns {void}
     */
    self.showDialog = function (selection) {
        //$("#smallDialogDiv").parent().css("left", "30%");
        $("#smallDialogDiv").dialog("option", "title", "Similars");
        $("#smallDialogDiv").load("modules/tools/lineage/html/lineageSimilarsDialog.html", function () {
            $("#smallDialogDiv").dialog("open");
            self.mode = "whiteboard";
            if (selection) {
                $("#lineageSimilars_fromSelect").val("SelectedNodes");
            }
        });
    };

    /**
     * Handles changes in the selection mode.
     * @function
     * @name onChangeSelection
     * @memberof module:Lineage_similars
     * @param {string} value - The new selection value.
     * @returns {void}
     */
    self.onChangeSelection = function (value) {
        self.mode = $("#lineageSimilars_toModeSelect").val();
        self.showSourcesTree();
    };

    /**
     * Displays the tree of available sources for finding similar nodes.
     * @function
     * @name showSourcesTree
     * @memberof module:Lineage_similars
     * @returns {void}
     */
    self.showSourcesTree = function () {
        var options = {
            withCheckboxes: false,
        };

        SourceSelectorWidget.initWidget(["OWL"], "lineageSimilars_sourcesTreeDiv", false, Lineage_similars.onSourceSelected, Lineage_similars.onValidateSources, options);
    };

    /**
     * Handles the selection of a source from the sources tree.
     * @function
     * @name onSourceSelected
     * @memberof module:Lineage_similars
     * @param {Event} evt - The selection event.
     * @param {Object} obj - Object containing the selected node data.
     * @returns {void}
     */
    self.onSourceSelected = function (evt, obj) {
        self.currentSource = obj.node.id;
        // self.drawSourceSimilars(source);
    };

    /**
     * Callback for source selection validation.
     * @function
     * @name onValidateSources
     * @memberof module:Lineage_similars
     * @returns {void}
     */
    self.onValidateSources = function () {};

    /**
     * Initiates the drawing of similar nodes based on the current mode.
     * @function
     * @name drawSimilars
     * @memberof module:Lineage_similars
     * @returns {void}
     */
    self.drawSimilars = function () {
        if (!Lineage_whiteboard.lineageVisjsGraph.data) {
            return alert("no nodes to compare");
        }

        var source = null;
        if (self.mode == "whiteboard") {
            self.drawWhiteBoardSimilars();
            $("#smallDialogDiv").dialog("close");
        } else if (self.mode == "chooseSource") {
            if (!self.currentSource) {
                return alert("no source selected");
            }
            source = self.currentSource;
        } else if (self.mode == "allSources") {
        }

        self.drawSourceSimilars(source);
        $("#smallDialogDiv").dialog("close");
    };

    /**
     * Draws similar nodes from a specific source.
     * @function
     * @name drawSourceSimilars
     * @memberof module:Lineage_similars
     * @param {string} source - The source to search for similar nodes.
     * @returns {void}
     */
    self.drawSourceSimilars = function (source) {
        var nodes = self.getStartingNodes();
        if (!nodes) {
            return alert("no nodes selected)");
        }
        var whiteboardLabelsMap = {};
        nodes.forEach(function (node) {
            if (node.data.label) {
                whiteboardLabelsMap[node.data.label] = { fromNode: node, similars: [] };
                whiteboardLabelsMap[node.data.label.toLowerCase()] = { fromNode: node, similars: [] };
            }
        });

        var size = 100;
        var nodelabels = Object.keys(whiteboardLabelsMap);
        var slices = common.array.slice(nodelabels, size);

        var indexes = [];
        if (source) {
            indexes = [source.toLowerCase()];
        }

        var similarNodesArray = [];
        var currentWordsCount = 0;
        var offset = 0;
        var similarsSources = [];
        var mode = "";
        if ($("#Similars_Only_exact_match").is(":checked")) {
            mode = "exactMatch";
        } else {
            mode = "fuzzyMatch";
        }
        async.eachSeries(
            slices,
            function (words, callbackEach) {
                currentWordsCount += words.length;
                SearchUtil.getElasticSearchMatches(words, indexes, mode, 0, 10000, {}, function (err, result) {
                    if (err) {
                        return callbackEach(err);
                    }

                    var error = false;
                    result.forEach(function (item, index) {
                        if (item.error) {
                            error = true;
                        }
                        if (error) {
                            return callbackEach(item.error);
                        }

                        var actual_word_label = words[index];
                        item.hits.hits.forEach(function (hit) {
                            hit._source.index = hit._index;

                            if ($("#Similars_Only_exact_match").is(":checked")) {
                                if (hit._source.label.toLowerCase() == actual_word_label.toLowerCase()) {
                                    if (!whiteboardLabelsMap[hit._source.label]) {
                                        whiteboardLabelsMap[hit._source.label] = {
                                            fromNode: whiteboardLabelsMap[actual_word_label].fromNode,
                                            similars: [],
                                        };
                                    }
                                    whiteboardLabelsMap[hit._source.label].similars.push(hit._source);
                                }
                            } else {
                                if (!whiteboardLabelsMap[hit._source.label]) {
                                    whiteboardLabelsMap[hit._source.label] = {
                                        fromNode: whiteboardLabelsMap[actual_word_label].fromNode,
                                        similars: [],
                                    };
                                }
                                whiteboardLabelsMap[hit._source.label].similars.push(hit._source);
                            }
                        });
                    });

                    callbackEach();
                });
            },
            function (err) {
                if (err) {
                    return alert(err.reason);
                }
                var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();

                var visjsData = { nodes: [], edges: [] };

                for (var label in whiteboardLabelsMap) {
                    var whiteboardNode = whiteboardLabelsMap[label];

                    whiteboardNode.similars.forEach(function (similar) {
                        var similarSource;
                        if (!similar.parents || !Config.sources[similar.parents[0]]) {
                            return;
                        }
                        similarSource = similar.parents[0];
                        if (similarsSources.indexOf(similarSource) < 0) similarsSources.push(similarSource);
                        var color = Lineage_whiteboard.getSourceColor(similarSource);
                        var shape = Lineage_whiteboard.defaultShape;
                        if (similar.type == "NamedIndividual") {
                            shape = Lineage_whiteboard.namedIndividualShape;
                        }
                        if (!existingNodes[similar.id]) {
                            existingNodes[similar.id] = 1;
                            visjsData.nodes.push({
                                id: similar.id,
                                label: similar.label,
                                shape: shape,
                                color: color,
                                size: Lineage_whiteboard.defaultShapeSize,
                                data: {
                                    id: similar.id,
                                    label: similar.label,
                                    source: similarSource,
                                },
                            });
                        }

                        var edgeId = whiteboardNode.fromNode.id + "_" + similar.id;
                        var inverseEdgeId = similar.id + "_" + whiteboardNode.fromNode.id;
                        if (!existingNodes[edgeId] && !existingNodes[inverseEdgeId] && whiteboardNode.fromNode.id != similar.id) {
                            existingNodes[edgeId] = 1;

                            visjsData.edges.push({
                                id: edgeId,
                                from: whiteboardNode.fromNode.id,
                                to: similar.id,
                                data: {
                                    source: Lineage_sources.activeSource,
                                    label: "sameLabel",
                                },
                                arrows: {
                                    to: {
                                        enabled: true,
                                        type: "solid",
                                        scaleFactor: 0.5,
                                    },

                                    from: {
                                        enabled: true,
                                        type: "solid",
                                        scaleFactor: 0.5,
                                    },
                                },

                                dashes: true,
                                color: "green",
                                width: 2,
                            });
                        }
                    });
                }
                if (visjsData.edges.length == 0) {
                    return alert("no similars found in source " + source);
                }

                Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(visjsData.nodes);
                Lineage_whiteboard.lineageVisjsGraph.data.edges.update(visjsData.edges);
                similarsSources.forEach(function (_source) {
                    Lineage_sources.menuActions.groupSource(_source);
                });
                if (source) {
                    Lineage_sources.registerSource(source);
                }
            },
        );
    };

    /**
     * Gets the nodes to use as starting points for similarity search.
     * @function
     * @name getStartingNodes
     * @memberof module:Lineage_similars
     * @returns {Array<Object>|null} Array of starting nodes or null if none selected.
     */
    self.getStartingNodes = function () {
        var nodes = null;
        var selectMode = $("#lineageSimilars_fromSelect").val();
        if (selectMode == "AllWhiteboardNodes") {
            return Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
        } else if (selectMode == "SelectedNodes") {
            if (!Lineage_whiteboard.currentGraphNode) {
                return null;
            }
            return [Lineage_whiteboard.currentGraphNode];
        }
    };

    /**
     * Draws similar nodes found within the whiteboard.
     * @function
     * @name drawWhiteBoardSimilars
     * @memberof module:Lineage_similars
     * @param {string} [output] - Optional output format.
     * @returns {void}
     */
    self.drawWhiteBoardSimilars = function (output) {
        var commonNodes = [];
        var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();

        var nodes = self.getStartingNodes();
        if (!nodes) {
            return alert("no nodes to process");
        }
        nodes.forEach(function (node1) {
            if (!node1.data && !node1.data.label) {
                return;
            }
            nodes.forEach(function (node2) {
                if (!node2.data && !node2.data.label) {
                    return;
                }
                if (node1.data.id == node2.data.id && node1.data.source == node2.data.source) {
                    return;
                }
                if (!node2.data.label) {
                    node2.data.label = Sparql_common.getLabelFromURI(node2.data.id);
                }
                if (node1.data.label.toLowerCase().replace(/ /g, "") == node2.data.label.toLowerCase().replace(/ /g, "")) {
                    commonNodes.push({ fromNode: node1, toNode: node2 });
                }
                if (node1.label == node2.label) {
                    commonNodes.push({ fromNode: node1, toNode: node2 });
                }
            });
        });

        if (true || output == "graph") {
            var visjsData = { nodes: [], edges: [] };
            commonNodes.forEach(function (item) {
                var edgeId = item.fromNode.id + "_" + item.toNode.id;
                var inverseEdgeId = item.toNode.id + "_" + item.fromNode.id;
                if (!existingNodes[edgeId] && !existingNodes[inverseEdgeId]) {
                    existingNodes[edgeId] = 1;

                    visjsData.edges.push({
                        id: edgeId,
                        from: item.fromNode.id,
                        to: item.toNode.id,
                        data: {
                            source: Lineage_sources.activeSource,
                            label: "sameLabel",
                        },
                        arrows: {
                            to: {
                                enabled: true,
                                type: "solid",
                                scaleFactor: 0.5,
                            },

                            from: {
                                enabled: true,
                                type: "solid",
                                scaleFactor: 0.5,
                            },
                        },

                        dashes: true,
                        color: "green",
                        width: 2,
                    });
                }
            });
            Lineage_whiteboard.lineageVisjsGraph.data.edges.update(visjsData.edges);
        }
    };

    return self;
})();

export default Lineage_similars;
window.Lineage_similars = Lineage_similars;
