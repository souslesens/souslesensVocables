import Lineage_whiteboard from "./lineage_whiteboard.js";
self.lineageVisjsGraph;
import common from "../../shared/common.js";
import Lineage_selection from "./lineage_selection.js";
import SearchUtil from "../../search/searchUtil.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import MainController from "../../shared/mainController.js";

var Lineage_combine = (function () {
    var self = {};
    self.currentSources = [];

    /**
     * Displays a dialog for selecting ontology sources to add to the graph.
     * Supports OWL and SKOS sources.
     * @function
     * @name showSourcesDialog
     * @memberof module:Lineage_combine
     * @returns {void}
     */
    self.showSourcesDialog = function () {
        SourceSelectorWidget.showDialog(["OWL", "SKOS"], null, Lineage_combine.addSelectedSourcesToGraph);
    };

    /**
     * Initializes the Lineage_combine module by resetting selected sources
     * and hiding action-related UI elements.
     * @function
     * @name init
     * @memberof module:Lineage_combine
     * @returns {void}
     */
    self.init = function () {
        self.currentSources = [];
        $("#Lineage_combine_actiosDiv").css("display", "none");
        $("#Lineage_combine_mergeNodesDialogButton").css("display", "none");
    };

    /**
     * Adds selected ontology sources to the graph and updates the UI accordingly.
     * Registers the selected sources, draws their top concepts, and updates menu actions.
     * @function
     * @name addSelectedSourcesToGraph
     * @memberof module:Lineage_combine
     * @returns {void}
     */
    self.addSelectedSourcesToGraph = function () {
        $("#sourcesSelectionDialogdiv").dialog("close");

        var term = $("#searchWidget_searchTermInput").val();
        var selectedSources = [];
        if ($("#searchAll_sourcesTree").jstree(true)) {
            selectedSources = $("#searchAll_sourcesTree").jstree(true).get_checked();
        }
        if (selectedSources.length == 0) return;

        async.eachSeries(
            selectedSources,
            function (source, callbackEach) {
                if (!Config.sources[source]) callbackEach();
                Lineage_sources.registerSource(source);
                self.currentSources.push(source);
                Lineage_whiteboard.drawTopConcepts(source, {}, null, function (err) {
                    if (err) return callbackEach();
                    self.menuActions.groupSource(source);

                    callbackEach();

                    //  SearchWidget.showTopConcepts(sourceLabel, { targetDiv: "LineageNodesJsTreeDiv" });
                });
            },
            function (err) {
                if (err) return UI.message(err);
                if (self.currentSources.length > 0) {
                    $("#GenericTools_searchScope").val("whiteboardSources");
                    $("#Lineage_combine_actiosDiv").css("display", "block");
                }
                Lineage_sources.setCurrentSource(Lineage_sources.activeSource);
            }
        );
    };

    /**
     * Sets the popup menu options for the graph, including actions to hide, show,
     * group, and ungroup sources.
     * @function
     * @name setGraphPopupMenus
     * @memberof module:Lineage_combine
     * @returns {void}
     */
    self.setGraphPopupMenus = function () {
        var html =
            '    <span  class="popupMenuItem" onclick="Lineage_combine.menuActions.hideSource();"> Hide Source</span>' +
            ' <span  class="popupMenuItem" onclick="Lineage_combine.menuActions.showSource();"> Show Source</span>' +
            ' <span  class="popupMenuItem" onclick="Lineage_combine.menuActions.groupSource();"> Group Source</span>' +
            ' <span  class="popupMenuItem" onclick="Lineage_combine.menuActions.ungroupSource();"> ungroup Source</span>';
        $("#popupMenuWidgetDiv").html(html);
    };

    /**
     * Displays a dialog for merging selected ontology nodes. Allows users to specify
     * the target source and node, select merge options, and choose nodes for merging.
     * @function
     * @name showMergeNodesDialog
     * @memberof module:Lineage_combine
     * @param {Object} [fromNode] - The node from which the merge is initiated.
     * @param {Object} [toNode] - The target node for the merge.
     * @returns {void}
     */
    self.showMergeNodesDialog = function (fromNode, toNode) {
        if (fromNode) {
            Lineage_selection.clearNodesSelection();
            Lineage_selection.addNodeToSelection(fromNode);
        }
        if (Lineage_selection.selectedNodes.length == 0) return alert("no nodes selected");
        $("#mainDialogDiv").load("snippets/lineage/lineageAggregateMergeNodesDialog.html", function () {
            common.fillSelectOptions("LineageMerge_targetSourceSelect", [Lineage_sources.activeSource]);
            if (toNode) {
                $("#LineageMerge_targetNodeUriSelect").val(toNode.data.id);
            }

            var jstreeData = Lineage_selection.getSelectedNodesTree();

            var options = {
                withCheckboxes: true,
                openAll: true,
            };
            JstreeWidget.loadJsTree("LineageMerge_nodesJsTreeDiv", jstreeData, options, function (err, result) {
                $("#LineageMerge_nodesJsTreeDiv").jstree().check_all();
            });
        });
        //  $("#mainDialogDiv").dialog("open");
    };

    /**
     * Handles the UI logic for merging ontology nodes. Gathers user input such as
     * target source, merge mode, and selected nodes before triggering the merge process.
     * @function
     * @name mergeNodesUI
     * @memberof module:Lineage_combine
     * @param {Object} [testObj] - Optional test object for debugging.
     * @returns {void}
     */
    self.mergeNodesUI = function (testObj) {
        var targetNode = null;
        var targetSource = $("#LineageMerge_targetSourceSelect").val();
        var mergeMode = $("#LineageMerge_aggregateModeSelect").val();
        var mergeDepth = $("#LineageMerge_aggregateDepthSelect").val();
        var mergeRestrictions = $("#LineageMerge_aggregateRelationsCBX").prop("checked");
        var targetNode = $("#LineageMerge_targetNodeUriSelect").val();
        var mergedNodesType = $("#LineageMerge_mergedNodesTypeSelect").val();
        var jstreeNodes = $("#LineageMerge_nodesJsTreeDiv").jstree(true).get_checked(true);

        if (!mergedNodesType) if (!confirm("confirm that no Type is added to merged nodes")) return;

        self.mergeNodes(jstreeNodes, mergeMode, mergeDepth, mergeRestrictions, mergedNodesType, targetSource, targetNode);
    };

    /**
     * Merges multiple ontology nodes into a target source, preserving hierarchy and restrictions.
     * This function retrieves node descendants, applies restrictions, and inserts the merged data into the target source.
     * @function
     * @name mergeNodes
     * @memberof module:Lineage_combine
     * @param {Object[]} jstreeNodes - The nodes selected for merging, represented as jstree objects.
     * @param {string} mergeMode - The merging mode, e.g., "keepUri".
     * @param {string} mergeDepth - Defines the depth of the merge operation ("nodeOnly", "nodeAndDirectChildren", "nodeDescendantsOnly").
     * @param {boolean} mergeRestrictions - Whether to include ontology restrictions in the merge.
     * @param {string} mergedNodesType - The RDF type of the merged nodes (e.g., "owl:NamedIndividual", "owl:Class").
     * @param {string} targetSource - The target source where merged nodes will be inserted.
     * @param {string} [targetNode] - The optional parent node under which merged nodes will be placed.
     * @param {Function} callback - A callback function executed after the merge process completes.
     * @returns {void}
     */
    self.mergeNodes = function (jstreeNodes, mergeMode, mergeDepth, mergeRestrictions, mergedNodesType, targetSource, targetNode, callback) {
        var maxDepth = 10;

        var nodesToMerge = {};
        var descendantsMap = {};
        var newTriples = [];
        var message = "";
        jstreeNodes.forEach(function (node) {
            if (node.parent == "#") return;
            if (!nodesToMerge[node.parent]) nodesToMerge[node.parent] = {};
            nodesToMerge[node.parent][node.data.id] = [];
        });

        var sources = Object.keys(nodesToMerge);

        async.eachSeries(sources, function (source, callbackEachSource) {
            var selectedNodeIds = Object.keys(nodesToMerge[source]);
            var sourceGraphUri = Config.sources[source].graphUri;
            var targetGraphUri = Config.sources[targetSource].graphUri;
            var editable = Config.sources[targetSource].editable;
            if (!targetGraphUri || !editable) alert("targetSource must have  graphUri and must be editable");
            callbackEachSource();

            var sourceMessage = "";

            async.eachSeries(
                selectedNodeIds,
                function (selectedNodeId, callbackEachNodeToMerge) {
                    var nodesToCopy = [selectedNodeId];
                    async.series(
                        [
                            //getNodes descendants by depth and add them to ids
                            function (callbackSeries) {
                                if (mergeDepth == "nodeOnly") {
                                    return callbackSeries();
                                } else {
                                    var depth;
                                    if (mergeDepth == "nodeAndDirectChildren") depth = 1;
                                    else depth = maxDepth;
                                    Sparql_generic.getNodeChildren(source, null, selectedNodeId, depth, { selectGraph: false }, function (err, result) {
                                        if (err) return callbackSeries(err);

                                        result.forEach(function (item, index) {
                                            for (var i = 1; i <= maxDepth; i++) {
                                                if (item["child" + i]) {
                                                    var parent;
                                                    if (i == 1) {
                                                        var parent = item.subject.value;
                                                        if (mergeDepth == "nodeDescendantsOnly") parent = targetNode;
                                                        item["child" + i].parent = parent;
                                                    } else item["child" + i].parent = item["child" + (i - 1)].value;

                                                    descendantsMap[item["child" + i].value] = item["child" + i];
                                                }
                                            }
                                        });

                                        var descendantIds = Object.keys(descendantsMap);
                                        nodesToCopy = nodesToCopy.concat(descendantIds);
                                        return callbackSeries();
                                    });
                                }
                            },

                            //create hierarchy if needed (when targetNode  and mergedNodesType)
                            function (callbackSeries) {
                                if (!targetNode) return callbackSeries();

                                var mergedNodesParentProperty = null;
                                if (mergedNodesType == "owl:NamedIndividual") mergedNodesParentProperty = "rdf:type";
                                else if (mergedNodesType == "owl:Class") mergedNodesParentProperty = "rdfs:subClassOf";
                                else return callbackSeries();

                                if (mergeDepth != "nodeDescendantsOnly") {
                                    newTriples.push({
                                        subject: selectedNodeId,
                                        predicate: "rdf:type",
                                        object: mergedNodesType,
                                    });

                                    newTriples.push({
                                        subject: selectedNodeId,
                                        predicate: mergedNodesParentProperty,
                                        object: targetNode,
                                    });
                                }

                                var descendantIds = Object.keys(descendantsMap);
                                descendantIds.forEach(function (item) {
                                    newTriples.push({
                                        subject: item,
                                        predicate: "rdf:type",
                                        object: mergedNodesType,
                                    });
                                    newTriples.push({
                                        subject: item,
                                        predicate: mergedNodesParentProperty,
                                        object: descendantsMap[item].parent,
                                    });
                                });

                                callbackSeries();
                            },

                            //get all node ids subject triple including descendants
                            function (callbackSeries) {
                                Sparql_OWL.getAllTriples(source, "subject", nodesToCopy, { removeBlankNodesObjects: true }, function (err, result) {
                                    if (err) return callbackSeries(err);
                                    result.forEach(function (item) {
                                        if (nodesToMerge[source][selectedNodeId]) nodesToMerge[source][selectedNodeId].push(item);
                                    });
                                    callbackSeries();
                                });
                            },

                            //get restrictions triple including descendants
                            function (callbackSeries) {
                                if (!mergeRestrictions) return callbackSeries();

                                var ids = Object.keys(nodesToMerge[source]);

                                var fromStr = sourceGraphUri ? " FROM " + sourceGraphUri : "";
                                var filterStr = Sparql_common.setFilter("class", ids);
                                var query =
                                    "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
                                    "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                                    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>";
                                query +=
                                    "SELECT   ?s ?p ?o from <http://data.total.com/resource/tsf/ontology/gaia-test/> WHERE {?s ?p ?o." +
                                    "filter (exists {?class rdfs:subClassOf ?s.  ?s rdf:type owl:Restriction." +
                                    filterStr +
                                    "})} LIMIT 10000";
                                var sparql_url = Config.sources[source].sparql_server.url;
                                if ((sparql_url = "_default")) sparql_url = Config.sparql_server.url;
                                var url = sparql_url + "?format=json&query=";
                                Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
                                    if (err) return callbackSeries(err);

                                    result.results.bindings.forEach(function (item) {
                                        var value = item.o.value;
                                        if (item.o.datatype == "http://www.w3.org/2001/XMLSchema#dateTime") value += "^^xsd:dateTime";
                                        if (item.o.type == "literal") value = common.formatStringForTriple(value);

                                        newTriples.push({
                                            subject: item.s.value,
                                            predicate: item.p.value,
                                            object: value,
                                        });
                                    });
                                    return callbackSeries();
                                });
                            },

                            //create newTriples
                            function (callbackSeries) {
                                if (true || mergeMode == "keepUri") {
                                    nodesToMerge[source][selectedNodeId].forEach(function (item) {
                                        var value = item.object.value;
                                        if (item.object.datatype == "http://www.w3.org/2001/XMLSchema#dateTime") value += "^^xsd:dateTime";
                                        if (item.object.type == "literal") value = common.formatStringForTriple(value);

                                        newTriples.push({
                                            subject: item.subject.value,
                                            predicate: item.predicate.value,
                                            object: value,
                                        });
                                    });

                                    // return callbackSeries();
                                    Sparql_generic.insertTriples(targetSource, newTriples, {}, function (err, result) {
                                        if (err) return callbackSeries(err);
                                        sourceMessage = result + " inserted from source " + source + "  to source " + targetSource;

                                        message += sourceMessage + "\n";
                                        return callbackSeries();
                                    });
                                }

                                /* /NOT IMPLEMENTED YET too much complexity
else if(mergeMode=="newUri") {
// set new subjectUri
var newTriples = [];


nodesToMerge[source].subjectTriples.forEach(function(item) {
if (!oldToNewUrisMap[item.id.value]) {
var newUri = targetGraphUri + common.getRandomHexaId(10);
oldToNewUrisMap[item.id.value] = newUri;
}
})

for (var oldUri in oldToNewUrisMap[item.id.value]) {
nodesToMerge[source].subjectTriples.forEach(function(item) {
if (item.id.value == oldUri) {

}
triples.push({})
})
}
}*/
                            },
                        ],
                        function (err) {
                            if (err) return callbackEachNodeToMerge(err);

                            UI.message(sourceMessage + " indexing data ...  ");
                            SearchUtil.generateElasticIndex(targetSource, { ids: nodesToCopy }, function (err, _result) {
                                UI.message("DONE " + source, true);
                                callbackEachNodeToMerge();
                            });
                        },
                        function (err) {
                            callbackEachSource(err);
                        }
                    );
                },
                function (err) {
                    if (callback) return callback(err, sourceMessage);
                    if (err) return alert(err.responseText);
                    alert(message);
                    return UI.message("ALL DONE", true);
                }
            );
        });
    };

    self.testMerge = function () {
        var jstreeNodes = [
            {
                id: "http://resource.geosciml.org/classifierScheme/cgi/2016.01/simplelithology",
                text: "Simple Lithology",
                icon: "../icons/oldIcons/default.png",
                parent: "GEOSCMIL",
                parents: ["GEOSCMIL", "#"],
                children: [],
                children_d: [],
                data: {
                    source: "GEOSCMIL",
                    label: "Simple Lithology",
                    id: "http://resource.geosciml.org/classifierScheme/cgi/2016.01/simplelithology",
                },
                state: {
                    loaded: true,
                    opened: false,
                    selected: true,
                    disabled: false,
                },
                li_attr: {
                    id: "http://resource.geosciml.org/classifierScheme/cgi/2016.01/simplelithology",
                },
                a_attr: {
                    href: "#",
                    id: "http://resource.geosciml.org/classifierScheme/cgi/2016.01/simplelithology_anchor",
                },
                original: {
                    id: "http://resource.geosciml.org/classifierScheme/cgi/2016.01/simplelithology",
                    text: "Simple Lithology",
                    parent: "GEOSCMIL",
                    state: {},
                },
                type: "default",
            },
            {
                id: "GEOSCMIL",
                text: "GEOSCMIL",
                icon: "../icons/oldIcons/default.png",
                parent: "#",
                parents: ["#"],
                children: ["http://resource.geosciml.org/classifierScheme/cgi/2016.01/simplelithology"],
                children_d: ["http://resource.geosciml.org/classifierScheme/cgi/2016.01/simplelithology"],
                state: {
                    loaded: true,
                    opened: true,
                    selected: true,
                    disabled: false,
                },
                li_attr: {
                    id: "GEOSCMIL",
                },
                a_attr: {
                    href: "#",
                    id: "GEOSCMIL_anchor",
                },
                original: {
                    id: "GEOSCMIL",
                    text: "GEOSCMIL",
                    parent: "#",
                    state: {},
                },
                type: "default",
            },
        ];
        var obj = {
            mergeDepth: "nodeDescendantsOnly",
            mergeMode: "keepUri",
            mergeRestrictions: true,
            jstreeNodes: jstreeNodes,
            targetNode: "http://data.total.com/resource/tsf/ontology/gaia-test/738e98d5f8",
            mergedNodesType: "owl:NamedIndividual",
            targetSource: "TSF_GAIA_TEST",
        };

        MainController.initControllers();

        if (testObj) {
            targetSource = testObj.targetSource;
            mergeMode = testObj.mergeMode;
            mergeDepth = testObj.mergeDepth;
            mergeRestrictions = testObj.mergeRestrictions;
            jstreeNodes = testObj.jstreeNodes;
            targetNode = testObj.targetNode;
            mergedNodesType = testObj.mergedNodesType;
        }
        self.mergeNodes(obj.targetNode, obj.targetSource, obj.mergeMode, obj.mergeDepth, obj.mergeRestrictions, objtargetNode, obj.mergedNodesType, obj.jstreeNodes);
        self.mergeNodes(obj);
    };
    return self;
})();

export default Lineage_combine;

window.Lineage_combine = Lineage_combine;
