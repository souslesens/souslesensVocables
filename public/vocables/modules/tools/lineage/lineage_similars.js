import SourceSelectorWidget from "../../uiWidgets/sourceSelectorWidget.js";
import common from "../../shared/common.js";
import SearchUtil from "../../search/searchUtil.js";
import Lineage_whiteboard from "./lineage_whiteboard.js";
import Lineage_sources from "./lineage_sources.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";


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
        self.parentClassJstreeLoaded=false;
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
        $('#lineageSimilars_chooseParentClassButton').show();
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
        var  options = {};
        if(self.parentClassJstreeLoaded){
            var parentClasses = $("#lineageSimilars_sourcesTreeDiv").jstree(true).get_selected();
            if(parentClasses && parentClasses.length>0){
                var parentClass=$("#lineageSimilars_sourcesTreeDiv").jstree(true).get_node(parentClasses[0]);
                if(parentClass.data.id ){
                    options.classFilter = parentClass.data.id;
                }
            }

        }

        async.eachSeries(
            slices,
            function (words, callbackEach) {
                currentWordsCount += words.length;
                SearchUtil.getElasticSearchMatches(words, indexes, mode, 0, 10000, options, function (err, result) {
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
    self.drawClassTaxonomy = function () {
        if (!self.currentSource) {
            return alert("no source selected");
        }
        var options={'jstreeDiv':'lineageSimilars_sourcesTreeDiv'};
        SearchWidget.showTopConcepts(self.currentSource,options);
        self.parentClassJstreeLoaded = true;
    }
    self.save={
        showDialog: function () {
            $("#smallDialogDiv").dialog("option", "title", "Save Similars");
            self.parentClassJstreeLoaded=false;
            $("#smallDialogDiv").load("modules/tools/lineage/html/lineageSimilarsSaveDialog.html", function () {
                $("#smallDialogDiv").dialog("open");
                self.save.drawWhiteboardSimilarsTaxonomy(function () {
                  
                });
                
            });
        },
        contextMenuSimilars : function (node) {
                   var items = {};
                   items.nodeInfos = {
                        label: "Node infos",
                        action: function (_e) {
                            // pb avec source
                            if (!node.data || !node.data.source) {
                                return alert("no source for this node");
                            }
                            NodeInfosWidget.showNodeInfos(node.data.source, node, "mainDialogDiv");
                        },
                    };  
                    return items;
        },
        drawWhiteboardSimilarsTaxonomy: function (callback) {
            if(!Lineage_whiteboard.lineageVisjsGraph.data && !Lineage_whiteboard.lineageVisjsGraph.data.nodes){ 
                return alert("no nodes on whiteboard");
            }
            var whiteboard_nodes=Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
            if(whiteboard_nodes.length==0){
                return alert("no nodes on whiteboard");
            }
             if(!Lineage_whiteboard.lineageVisjsGraph.data && !Lineage_whiteboard.lineageVisjsGraph.data.edges){ 
                return alert("no edges on whiteboard");
            }
            var edges = Lineage_whiteboard.lineageVisjsGraph.data.edges.get();
            if(edges.length==0){
                return alert("no edges on whiteboard");
            }
            var similarsEdges= Lineage_whiteboard.lineageVisjsGraph.data.edges.get().filter(function(edge){return edge?.data?.label=='sameLabel'})
            if(similarsEdges.length==0){
                return alert("no similars edges on whiteboard");
            }
            var similarsTaxonomy= {};
            similarsEdges.forEach(function(edge){
                if(!edge.from || !edge.to){
                    return;
                }
                if(!similarsTaxonomy[edge.from]){
                    similarsTaxonomy[edge.from]=[edge.to];
                }
                else{
                    if(!similarsTaxonomy[edge.from].includes(edge.to)){
                        similarsTaxonomy[edge.from].push(edge.to);
                    }
                    
                }
               
            });
            var jstreeData = [];
            var sources = {};
            for (var nodeId in similarsTaxonomy) {
                var node = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get(nodeId);
                if (node) {
                    
                
                    var source = node.data.source;
                    if(source){
                        
                    
                        if (!sources[source]) {
                            jstreeData.push({
                                id: source,
                                text: source,
                                parent: "#",
                                data: { id: source, label: source,type: "source" },
                            });
                            sources[source] = true;
                        }
                        
                        jstreeData.push({
                            id: node.id,
                            text: node.data.label,
                            parent: source,
                            data: { id: nodeId, label: node.data.label, type: "node",source: source },
                        });
                        var similars = similarsTaxonomy[nodeId];
                        if (similars && similars.length > 0) {
                            similars.forEach(function (similarId) {
                                var similarNode = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get(similarId);
                                if (similarNode) {
                                    jstreeData.push({
                                        id: similarNode.id,
                                        text: similarNode.data.label,
                                        parent: node.id,
                                        data: { id: similarNode.id, label: similarNode.data.label, type: "similars",source:similarNode.data.source },
                                    });
                                }
                            });
                        }
                    }
                }
            }
          

        
            
            var options={withCheckboxes:true,'contextMenu':self.save.contextMenuSimilars};
            JstreeWidget.loadJsTree('lineageSimilars_similarsTreeDiv', jstreeData,options, function(){
                $("#lineageSimilars_similarsTreeDiv").jstree(true).open_all();
                if(callback){
                    callback();
                }
            });

        },
        saveSimilars: function (mode) {
            if(!Lineage_sources.activeSource){
               
                return alert("no active source to save similars");
            }
            var source = null;
            if(Array.isArray(Lineage_sources.activeSource) ){
                if(Lineage_sources.activeSource.length==1){
                    source=Lineage_sources.activeSource[0];
                }else{
                    return alert("you can only save similars for one source at a time");
                }
                
            }else{
                source = Lineage_sources.activeSource;
            }
            if (!Lineage_sources.isSourceEditableForUser(source)) {
                return alert("No permission to save similars in " + source);
            }
           
            var similarPredicate = "http://souslesens.org/resource/hasSimilarLabel";
            if(mode =='exact'){
                similarPredicate = "http://souslesens.org/resource/hasExactSimilarLabel";
            }
            var selectedNodes = $("#lineageSimilars_similarsTreeDiv").jstree(true).get_checked();  
            if (!selectedNodes || selectedNodes.length == 0) {
                return alert("no nodes selected");
            }
            var selectedSimilars = selectedNodes.filter(function (nodeId) {
                var node = $("#lineageSimilars_similarsTreeDiv").jstree(true).get_node(nodeId);
                return node.data && node.data.type == "similars";
            });
            if (selectedSimilars.length == 0) {
                return alert("no similars selected");
            }
            
            var triples = [];
            selectedSimilars.forEach(function (nodeId) {
                var node = $("#lineageSimilars_similarsTreeDiv").jstree(true).get_node(nodeId);
                if (node && node.data && node.data.id) {
                    var sourceNode = $("#lineageSimilars_similarsTreeDiv").jstree(true).get_node(node.parent);
                    if (sourceNode && sourceNode.data && sourceNode.data.id) {
                        triples.push({
                            subject: sourceNode.data.id,
                            predicate: similarPredicate,
                            object: node.data.id,
                        });
                    }
                }
            });
            if (triples.length == 0) {
                return alert("no similars to save");
            }
           
            Sparql_generic.insertTriples(source,triples, null,function (err, result) {
                if (err) {
                    return alert(err);
                }
                UI.message('Successfully saved similars' );
                $("#smallDialogDiv").dialog("close");
            });

        }
    }
    return self;
})();

export default Lineage_similars;
window.Lineage_similars = Lineage_similars;
