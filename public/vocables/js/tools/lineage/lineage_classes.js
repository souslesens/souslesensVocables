/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var Lineage_classes = (function () {
    var expandedLevels = {};
    var sourceColors = {};
    var propertyColors = {};

    /**
     * @type {{ showLimit?: any; propertyColors?: any; defaultShape?: any; defaultShapeSize?: any; orphanShape?: any; nodeShadow?: any; objectPropertyColor?: any; defaultEdgeArrowType?: any; defaultEdgeColor?: any; restrictionColor?: any; namedIndividualShape?: any; namedIndividualColor?: any; sourcesGraphUriMap?: any; minChildrenForClusters?: any; soucesLevelMap?: any; mainSource?: any; isLoaded?: any; currentExpandLevel?: any; onLoaded?: any; currentOwlType?: any; onSourceSelect?: any; initUI?: any; registerSourceImports?: any; onGraphOrTreeNodeClick?: any; jstreeContextMenu?: any; selectTreeNodeFn?: any; currentTreeNode?: any; clearLastAddedNodes?: any; drawTopConcepts?: any; getSourceColor?: any; drawNewGraph?: any; getGraphIdsFromSource?: any; addSourceChildrenToGraph?: any; addChildrenToGraph?: any; listClusterToClipboard?: any; listClusterContent?: any; openCluster?: any; drawSimilarsNodes?: any; initIndividualsPropertiesSelect?: any; graphNodeNeighborhood?: any; drawRestrictions?: any; addNodesAndParentsToGraph?: any; showHideCurrentSourceNodes?: any; drawIndividualsProperties?: any; currentIndividualsProperties?: any; getPropertyColor?: any; drawObjectProperties?: any; withoutImports?: any; drawDictionarySameAs?: any; drawNamedIndividuals?: any; collapseNode?: any; setGraphPopupMenus?: any; zoomGraphOnNode?: any; drawNodeAndParents?: any; registerSource?: any; graphActions?: any; currentGraphEdge?: any; currentGraphNode?: any; setCurrentSource?: any; showHideHelp?: any; }}
     */
    var self = {};
    self.showLimit = 200;

    var graphContext = {};
    self.propertyColors = {};
    self.defaultShape = "dot";
    self.defaultShapeSize = 5;
    self.orphanShape = "square";
    self.nodeShadow = true;
    self.objectPropertyColor = "red";
    self.defaultEdgeArrowType = "triangle";
    self.defaultEdgeColor = "#aaa";
    self.restrictionColor = "orange";
    self.namedIndividualShape = "triangle";
    self.namedIndividualColor = "blue";
    self.sourcesGraphUriMap = {};

    self.minChildrenForClusters = 30;
    self.soucesLevelMap = {};
    self.mainSource = null;
    self.isLoaded = false;
    self.currentExpandLevel = 1;

    self.onLoaded = function (/** @type {() => void} */ callback) {
        if (self.isLoaded); // return;
        self.isLoaded = true;

        $("#sourceDivControlPanelDiv").html("");
        Lineage_common.currentSource = null;

        MainController.UI.openRightPanel();

        // @ts-ignore
        $("#actionDivContolPanelDiv").load("snippets/lineage/lineage.html", function () {
            // @ts-ignore
            $("#rightPanelDiv").load("snippets/lineage/lineageRightPanel.html", function () {
                $("#GenericTools_searchSchemaType").val("OWL");

                $("#lineage_controlPanel0Div").css("display", "block");
                $("#lineage_controlPanel1Div").css("display", "none");
                $("#GenericTools_onSearchCurrentSourceInput").css("display", "block");

                //   $("#sourcesTreeDivContainer").height(h2 - h1)
                var sourceLabels = [];
                SourceBrowser.currentTargetDiv = "LineagejsTreeDiv";
                MainController.UI.showSources("sourcesTreeDiv", false);

                for (var key in Config.sources) {
                    if (Config.currentProfile.allowedSourceSchemas.indexOf(Config.sources[key].schemaType) > -1) sourceLabels.push(key);
                }
                sourceLabels.sort();
                //  common.fillSelectOptions("Lineage_toSource", sourceLabels, true)

                $("#LineagePopup").dialog({
                    autoOpen: false,
                    height: 600,
                    width: 600,
                    modal: true,
                });
                $("#Lineage_Tabs").tabs({
                    activate: function (/** @type {any} */ e, /** @type {{ newPanel: { selector: any; }; }} */ ui) {
                        self.currentOwlType = "Class";
                        var divId = ui.newPanel.selector;
                        if (divId == "#LineageTypesTab") {
                            self.currentOwlType = "Type";
                            Lineage_types.init();
                        } else if (divId == "#LineagePropertiesTab") {
                            self.currentOwlType = "ObjectProperty";
                            Lineage_properties.init();
                        }
                    },
                });

                for (var sourceLabel in Config.sources) {
                    var graphUri = Config.sources[sourceLabel].graphUri;
                    if (graphUri && graphUri != "") self.sourcesGraphUriMap[graphUri] = Config.sources[sourceLabel];
                }
                $("#GenericTools_searchSchemaType").val("OWL");

                Lineage_decoration.init();
                if (callback) callback();
            });
        });
    };

    self.onSourceSelect = function (
        /** @type {string | Element | Comment | Document | DocumentFragment | ((this: HTMLElement, index: number, oldhtml: string) => string | JQuery.Node)} */ sourceLabel,
        /** @type {{ button: number; }} */ event
    ) {
        if (!sourceLabel) return;

        Lineage_common.currentSource = null;
        MainController.currentSource = sourceLabel;

        if (event.button == 0) {
            // except context menu
            self.mainSource = sourceLabel;
            self.initUI(true);
            if (authentication.currentUser.groupes.indexOf("admin") > -1 && Config.sources[self.mainSource].editable > -1) {
                $("#lineage_blendButtonsDiv").css("display", "block");
            } else {
                $("#lineage_blendButtonsDiv").css("display", "none");
            }
            $("#accordion").accordion("option", { active: 2 });

            if (!Lineage_common.currentSource) {
                Lineage_classes.drawTopConcepts(sourceLabel, function (/** @type {any} */ err) {
                    if (err) return MainController.UI.message(err);
                    //  SourceBrowser.showThesaurusTopConcepts(sourceLabel, { targetDiv: "LineagejsTreeDiv" });
                });
            }
            $("#Lineage_sourceLabelDiv").html(sourceLabel);

            var schemaType = Config.sources[sourceLabel].schemaType;
            $("#GenericTools_searchSchemaType").val(schemaType);

            $("#lineage_sourceNodeDiv").html("");
            $("#lineage_targetNodeDiv").html("");
            //  self.registerSource(sourceLabel)
            propertyColors = {};

            setTimeout(function () {
                var wikiUrl = Config.wiki.url + "Source " + sourceLabel;
                var str = "<a href='" + wikiUrl + "' target='_blank'>" + "Wiki page..." + "</a>";
                $("#lineage_sourceDescriptionDiv").html(str);
                self.registerSourceImports(sourceLabel);

                if (!self.mainSource) {
                    self.initUI(true);
                }

                Lineage_relations.init(true);
            });
        }
    };

    self.onGraphOrTreeNodeClick = function (
        /** @type {{ data: { source: string | number; id: any; }; from: any; }} */ node,
        /** @type {{ ctrlKey: any; shiftKey: any; altKey: any; }} */ nodeEvent,
        /** @type {{ callee?: any; }} */ options
    ) {
        if (!Config.sources[node.data.source]) return;
        if (!options) options = {};

        if (nodeEvent.ctrlKey && nodeEvent.shiftKey) {
            if (options.callee == "Graph") Lineage_classes.graphActions.graphNodeNeighborhood("all");
            else if (options.callee == "Tree") Lineage_classes.drawNodeAndParents(node.data);
        } else if (nodeEvent.ctrlKey && nodeEvent.altKey) {
            if (node.from) {
                let inSource = Lineage_classes.mainSource;
                Lineage_blend.deleteRestriction(inSource, node);
            } else {
                Lineage_blend.addNodeToAssociationNode(node, "source", true);
            }
        } else if (nodeEvent.shiftKey && nodeEvent.altKey) {
            Lineage_blend.addNodeToAssociationNode(node, "target");
        } else if (nodeEvent.ctrlKey) {
            SourceBrowser.showNodeInfos(node.data.source, node.data.id, "mainDialogDiv", { resetVisited: 1 });
        } else if (nodeEvent.altKey && options.callee == "Tree") {
            SourceBrowser.openTreeNode(SourceBrowser.currentTargetDiv, node.data.source, node, { reopen: true });
        } else return nodeEvent;

        return null;
    };

    self.jstreeContextMenu = function () {
        var items = {};

        items.drawTopConcepts = {
            label: "draw taxonomy",
            action: function (/** @type {any} */ _e) {
                // pb avec source
                $("#Lineage_topClassesRadio").prop("checked", true);
                Lineage_classes.drawTopConcepts(null, function (/** @type {any} */ err, /** @type {any} */ _result) {
                    if (err) return MainController.UI.message(err);
                    SourceBrowser.showThesaurusTopConcepts(Lineage_common.currentSource || Lineage_classes.mainSource, { targetDiv: "LineagejsTreeDiv" });
                    //   self.showThesaurusTopConcepts()
                });
            },
        };
        items.addSimilarlabels = {
            label: "add similars (label)",
            action: function (/** @type {any} */ _e) {
                Lineage_classes.drawSimilarsNodes("sameLabel");
            },
        };

        if (authentication.currentUser.groupes.indexOf("admin") > -1) {
            /*   items.createNewGraph = {
label: "create new graph",
action: function ( _e) {
Lineage_classes.drawSimilarsNodes("sameLabel");
},
};*/
        }

        /*   items.addSameAs = {
label: "add similars (sameAs)",
action: function (e) {
Lineage_classes.drawSimilarsNodes("sameAs")

}
}*/
        items.wikiPage = {
            label: "Wiki page",
            action: function (/** @type {any} */ _e) {
                SourceBrowser.showWikiPage(Lineage_common.currentSource);
            },
        };

        return items;
    };

    self.selectTreeNodeFn = function (/** @type {{ which: number; }} */ event, /** @type {{ node: { data: any; }; event: { ctrlKey: any; }; }} */ propertiesMap) {
        SourceBrowser.currentTreeNode = propertiesMap.node;
        self.currentTreeNode = propertiesMap.node;
        var data = propertiesMap.node.data;
        if (event.which == 3) return;
        if (self.onGraphOrTreeNodeClick(self.currentTreeNode, propertiesMap.event, { callee: "Tree" }) != null) {
            if (Config.sources[data.source].schemaType == "INDIVIDUAL") {
                return KGquery.showJstreeNodeChildren(SourceBrowser.currentTargetDiv, propertiesMap.node);
            } else
                setTimeout(function () {
                    SourceBrowser.openTreeNode(SourceBrowser.currentTargetDiv, data.source, propertiesMap.node, { ctrlKey: propertiesMap.event.ctrlKey });
                }, 200);
            // return SourceBrowser.showNodeInfos(self.currentTreeNode.data.source, self.currentTreeNode.data.id, "mainDialogDiv")
        }
    };

    self.initUI = function (clearTree) {
        MainController.UI.message("");
        visjsGraph.clearGraph();
        expandedLevels = {};

        $("#Lineage_classes_graphDecoration_legendDiv").html("");

        if (clearTree) {
            $("#lineage_drawnSources").html("");
            $("#LineagejsTreeDiv").empty();

            if (self.mainSource) {
                self.registerSourceImports(self.mainSource);
                SourceBrowser.showThesaurusTopConcepts(self.mainSource);
            }
        }
    };

    self.clearLastAddedNodes = function () {
        var nodes = visjsGraph.lastAddedNodes;
        if (nodes && nodes.length > 0) {
            visjsGraph.data.nodes.remove(nodes);
        }

        var xx = visjsGraph.network;
        /*  if (nodes && nodes.length > 0) {
        nodes.forEach(function(node) {
          // remove all ne fonctionne pas
          visjsGraph.data.nodes.remove(node);
        });
      }
    };*/
    };

    self.drawTopConcepts = function (/** @type {string} */ source, /** @type {(arg0: string | undefined) => any} */ callback) {
        self.currentExpandLevel = 1;

        if (!source) source = Lineage_common.currentSource;
        if (!source) source = self.mainSource;
        if (!source) return;

        if (!Config.sources[source]) return;
        //  Lineage_common.currentSource = source;
        self.soucesLevelMap[source] = { visible: true, children: 0 };

        var allSources = [];

        //  self.registerSource(source)

        var visjsData = { nodes: [], edges: [] };
        var existingNodes = visjsGraph.getExistingIdsMap();
        var imports = Config.sources[source].imports;
        var importGraphUrisMap = {};

        if (Config.Lineage.showSourceNodesInGraph) {
            if (!existingNodes[source]) {
                existingNodes[source] = 1;
                var sourceNode = {
                    id: source,
                    label: source,
                    shadow: self.nodeShadow,
                    shape: "box",
                    size: Lineage_classes.defaultShapeSize,
                    color: self.getSourceColor(source),
                    data: { source: source },
                    level: 1,
                };
                visjsData.nodes.push(sourceNode);
            }
        }
        if (imports) {
            imports.forEach(function (/** @type {string} */ importedSource) {
                self.soucesLevelMap[importedSource] = { visible: true, children: 0 };
                var graphUri = Config.sources[importedSource].graphUri;
                var color = self.getSourceColor(importedSource);
                if (!graphUri) return;
                if (Config.Lineage.showSourceNodesInGraph) {
                    if (!existingNodes[importedSource]) {
                        existingNodes[importedSource] = 1;
                        var importedSourceNode = {
                            id: importedSource,
                            label: importedSource,
                            shadow: self.nodeShadow,
                            shape: "box",
                            level: 1,
                            size: Lineage_classes.defaultShapeSize,
                            data: { source: importedSource },
                            color: color,
                        };
                        importGraphUrisMap[graphUri] = importedSource;

                        visjsData.nodes.push(importedSourceNode);
                    }

                    var edgeId = importedSource + "_" + source;
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;
                        var edge = {
                            id: edgeId,
                            from: importedSource,
                            to: source,
                            arrows: " middle",
                            color: color,
                            width: 6,
                        };
                        visjsData.edges.push(edge);
                    }
                }
                //  self.registerSource(importedSource)
            });
        }

        self.currentExpandLevel += 1;
        allSources.push(source);
        async.eachSeries(
            allSources,
            function (/** @type {string} */ source, /** @type {(arg0: undefined) => void} */ callbackEach) {
                MainController.UI.message("loading source " + source);
                var options = { selectGraph: true, withoutImports: Lineage_common.currentSource || false };
                Sparql_generic.getTopConcepts(source, options, function (/** @type {any} */ err, /** @type {any[]} */ result) {
                    if (err) return callbackEach(err);
                    if (result.length == 0) {
                        $("#waitImg").css("display", "none");
                        return callbackEach();
                    }
                    if (result.length > self.showLimit) {
                        //   $("#graphDiv").html("<div style='margin:10px'><span style='font-weight: bold;color:saddlebrown'> too may nodes (" + result.length + ")  .Cannot display the graph, </span><i>select and graph a node or a property to start graph exploration</i></div>")
                        MainController.UI.message("too may nodes (" + result.length + ")  .Cannot display the graph, select and graph a node or a property ");

                        if (callback) return callback("too may nodes");
                        return;
                    }
                    /**
                     * @type {any[]}
                     */
                    var ids = [];
                    result.forEach(function (/** @type {{ topConcept: { value: any; }; }} */ item) {
                        ids.push(item.topConcept.value);
                    });
                    if (!expandedLevels[source]) expandedLevels[source] = [];
                    expandedLevels[source].push(ids);
                    $("#Lineage_levelDepthSpan").html("level :" + expandedLevels[source].length);

                    var shape = self.defaultShape;
                    result.forEach(function (/** @type {{ topConcept: { value: string; }; topConceptLabel: { value: any; }; }} */ item) {
                        var nodeSource = Sparql_common.getSourceFromGraphUri(item.conceptGraph.value);
                        //  var color = self.getSourceColor(nodeSource);
                        var attrs = self.getNodeVisjAttrs(item.topConcept, null, nodeSource);
                        if (!existingNodes[item.topConcept.value]) {
                            existingNodes[item.topConcept.value] = 1;
                            var node = {
                                id: item.topConcept.value,
                                label: item.topConceptLabel.value,
                                shadow: self.nodeShadow,
                                shape: attrs.shape,
                                color: attrs.color,
                                size: Lineage_classes.defaultShapeSize,
                                level: self.currentExpandLevel,
                                data: {
                                    source: nodeSource,
                                    label: item.topConceptLabel.value,
                                    id: item.topConcept.value,
                                },
                            };
                            visjsData.nodes.push(node);

                            //link node to source

                            if (Config.Lineage.showSourceNodesInGraph) {
                                var edgeId = item.topConcept.value + "_" + source;
                                if (!existingNodes[edgeId]) {
                                    existingNodes[edgeId] = 1;
                                    var edge = {
                                        id: edgeId,
                                        from: item.topConcept.value,
                                        to: source,
                                    };
                                    visjsData.edges.push(edge);
                                }
                            }
                        }
                    });

                    callbackEach();
                });
            },
            function (/** @type {any} */ err, /** @type {any} */ _result) {
                if (err) {
                    if (callback) return callback(err);
                    return alert(err);
                }
                //   MainController.UI.message("", true)
                //  self.drawNewGraph(visjsData);
                if (!visjsGraph.data || !visjsGraph.data.nodes) {
                    self.drawNewGraph(visjsData);
                } else {
                    visjsGraph.data.nodes.add(visjsData.nodes);
                    visjsGraph.data.edges.add(visjsData.edges);
                    visjsGraph.network.fit();
                }
                $("#waitImg").css("display", "none");
                if (callback) return callback();
            }
        );
    };

    self.drawNewGraph = function (/** @type {any} */ visjsData) {
        graphContext = {};
        var options = {
            keepNodePositionOnDrag: true,
            onclickFn: Lineage_classes.graphActions.onNodeClick,
            onRightClickFn: Lineage_classes.graphActions.showGraphPopupMenu,
            physics: {
                barnesHut: {
                    springLength: 0,
                    damping: 0.15,
                },
                minVelocity: 0.75,
            },
            onAddNodeToGraph: function (/** @type {any} */ _properties, /** @type {any} */ _senderId) {
                Lineage_decoration.colorGraphNodesByType(_properties.items);
            },
            // onHoverNodeFn:Lineage_classes.graphActions.onHoverNodeFn
            //   layoutHierarchical: {direction: "LR", sortMethod: "directed"}
        };
        if (authentication.currentUser.groupes.indexOf("admin") > -1) {
            options.manipulation = {
                enabled: true,
                initiallyActive: true,

                addEdge: function (edgeData, callback) {
                    Lineage_blend.graphModification.showAddEdgeFromGraphDialog(edgeData, function (err, result) {
                        if (err) return callback(err.responseText);
                        return null;
                    });
                },
                addNode: function (nodeData, callback) {
                    Lineage_blend.graphModification.showAddNodeGraphDialog(function (err, result) {
                        if (err) return callback(err.responseText);
                        return null;
                    });
                },
            };
        }
        visjsGraph.draw("graphDiv", visjsData, options, function () {
            Lineage_decoration.colorGraphNodesByType();
        });

        $("#waitImg").css("display", "none");
    };

    self.getGraphIdsFromSource = function (/** @type {any} */ source) {
        if (!visjsGraph.data || !visjsGraph.data.nodes) return null;
        var existingNodes = visjsGraph.data.nodes.get();
        /**
         * @type {any[]}
         */
        var sourceNodes = [];
        existingNodes.forEach(function (/** @type {{ id: string; data: { source: any; id: any; }; }} */ item) {
            if (item.id != "#" && item.data && item.data.source == source) {
                sourceNodes.push(item.data.id || item.id);
            }
        });
        return sourceNodes;
    };

    self.addSourceChildrenToGraph = function () {
        var source = Lineage_common.currentSource || Lineage_classes.mainSource;
        if (source == "") return alert("select a source");
        var sourceNodes = self.getGraphIdsFromSource(source);
        self.addChildrenToGraph(source, sourceNodes);
    };

    self.listClusterToClipboard = function (/** @type {{ data: { cluster: any[]; }; }} */ clusterNode) {
        var text = "";
        clusterNode.data.cluster.forEach(function (/** @type {{ child: string; childLabel: string; }} */ item, /** @type {any} */ _index) {
            text += item.child + "," + item.childLabel + "\n";
        });

        common.copyTextToClipboard(text, function (/** @type {any} */ err, /** @type {any} */ result) {
            if (err) return MainController.UI.message(err);
            MainController.UI.message(result);
        });
    };

    self.listClusterContent = function (/** @type {{ data: { cluster: any[]; source: any; }; }} */ clusterNode) {
        /**
         * @type {{ id: any; text: any; parent: string; data: { source: any; id: any; label: any; }; }[]}
         */
        var jstreeData = [];
        clusterNode.data.cluster.forEach(function (/** @type {{ child: any; childLabel: any; }} */ item, /** @type {any} */ _index) {
            jstreeData.push({
                id: item.child,
                text: item.childLabel,
                parent: "#",
                data: { source: clusterNode.data.source, id: item.child, label: item.childLabel },
            });
        });

        var jstreeOptions = {
            openAll: true,
            selectTreeNodeFn: function (/** @type {any} */ event, /** @type {any} */ propertiesMap) {
                return Lineage_classes.selectTreeNodeFn(event, propertiesMap);
            },
            contextMenu: SourceBrowser.getJstreeConceptsContextMenu(),
        };

        common.jstree.loadJsTree(SourceBrowser.currentTargetDiv, jstreeData, jstreeOptions);
    };

    self.openCluster = function (/** @type {{ data: { cluster: any[]; source: any; }; id: any; }} */ clusterNode) {
        MainController.UI.message("");
        if (clusterNode.data.cluster.length > self.showLimit) {
            self.listClusterToClipboard(clusterNode);
            return alert("cluster content copied to clipboard( too large to draw)");
        }

        var color = self.getSourceColor(clusterNode.data.source);
        var attrs = self.getNodeVisjAttrs(item.child1.type, item.concept, clusterNode.data.source);
        var visjsData = { nodes: [], edges: [] };
        var existingNodes = visjsGraph.getExistingIdsMap();
        clusterNode.data.cluster.forEach(function (/** @type {{ child1: string; child1Label: any; concept: string; }} */ item) {
            if (!existingNodes[item.child1]) {
                existingNodes[item.child1] = 1;
                visjsData.nodes.push({
                    id: item.child1,
                    label: item.child1Label,
                    shadow: self.nodeShadow,
                    shape: attrs.shape,
                    size: Lineage_classes.defaultShapeSize,
                    color: attrs.color,
                    data: {
                        id: item.child1,
                        label: item.child1Label,
                        source: clusterNode.data.source,
                    },
                });

                var edgeId = item.child1 + "_" + item.concept;
                visjsData.edges.push({
                    id: edgeId,
                    from: item.child1,
                    to: item.concept,
                });
            }
        });

        visjsGraph.data.nodes.add(visjsData.nodes);
        visjsGraph.data.edges.add(visjsData.edges);
        visjsGraph.network.fit();
        visjsGraph.data.nodes.remove(clusterNode.id);
        $("#waitImg").css("display", "none");
        MainController.UI.message("");
    };

    self.drawSimilarsNodes = function (/** @type {any} */ _similarType, /** @type {any} */ _node, /** @type {any} */ _sources, /** @type {any} */ _descendantsAlso) {
        var fromSource = null;
        var toSources = [Lineage_common.currentSource || Lineage_classes.mainSource];
        if (!visjsGraph.data || !visjsGraph.data.nodes) return;
        var nodes = visjsGraph.data.nodes.get();
        /**
         * @type {any[]}
         */
        var labels = [];
        var ids = null;
        var labelsMap = {};
        nodes.forEach(function (/** @type {{ data: { label: string | number; }; }} */ node) {
            if (node.data && node.data.label) labels.push(node.data.label);
            labelsMap[node.data.label] = node;
        });

        SearchUtil.getSimilarLabelsInSources(fromSource, toSources, labels, ids, "exactMatch", null, function (/** @type {any} */ err, /** @type {any[]} */ result) {
            if (err) return alert(err);

            var existingNodes = visjsGraph.getExistingIdsMap();
            var visjsData = { nodes: [], edges: [] };
            result.forEach(function (/** @type {{ label: string | number; matches: { [x: string]: any[]; }; }} */ item) {
                var sourceNode = labelsMap[item.label];
                for (var source in item.matches) {
                    item.matches[source].forEach(function (/** @type {{ id: string; label: any; }} */ match) {
                        if (match.id == sourceNode.id) return;
                        if (!existingNodes[match.id]) {
                            existingNodes[match.id] = 1;
                            var color = self.getSourceColor(source);
                            visjsData.nodes.push({
                                id: match.id,
                                label: match.label,
                                color: color,
                                shadow: self.nodeShadow,
                                shape: "dot",
                                size: Lineage_classes.defaultShapeSize,
                                data: {
                                    id: match.id,
                                    label: match.label,
                                    source: source,
                                },
                            });
                        }

                        var edgeId = match.id + "_" + sourceNode.id + "_sameLabel";
                        if (!existingNodes[edgeId]) {
                            existingNodes[edgeId] = 1;
                            visjsData.edges.push({
                                id: edgeId,
                                from: match.id,
                                to: sourceNode.data.id,
                                color: "green",
                                width: 3,
                                arrows: {
                                    to: {
                                        enabled: true,
                                        type: "curve",
                                    },
                                    from: {
                                        enabled: true,
                                        type: "curve",
                                    },
                                    length: 30,
                                },
                                data: {
                                    type: "sameLabel",
                                    from: match.id,
                                    to: sourceNode.id,
                                    fromSource: source,
                                    toSource: sourceNode.data.source,
                                },
                            });
                        }
                    });
                }
            });
            if (visjsData.edges.length > 0) {
                $("#transformSameLabelsEdgesIntoSameAsRelationsButton").css("display", "block");
                visjsGraph.data.nodes.update(visjsData.nodes);
                visjsGraph.data.edges.update(visjsData.edges);
            }
        });
        MainController.UI.message("", true);
    };

    self.initIndividualsPropertiesSelect = function (/** @type {string | number} */ sourceLabel) {
        var schemaType = Config.sources[sourceLabel].schemaType;
        if (schemaType == "INDIVIDUAL") {
            var preferredProperties = Config.sources[sourceLabel].preferredProperties;
            if (!preferredProperties) return alert("no preferredProperties in source configuration");

            /**
             * @type {{ id: any; text: any; parent: any; }[]}
             */
            var jstreeData = [];
            var uriPrefixes = {};
            preferredProperties.forEach(function (/** @type {string} */ item) {
                var p;
                p = item.lastIndexOf("#");
                if (p < 0) p = item.lastIndexOf("/");
                var graphPrefix = item.substring(0, p);
                var propLabel = item.substring(p + 1);
                if (!uriPrefixes[graphPrefix]) {
                    uriPrefixes[graphPrefix] = 1;
                    jstreeData.push({
                        id: graphPrefix,
                        text: graphPrefix,
                        parent: "#",
                    });
                }
                jstreeData.push({
                    id: item,
                    text: propLabel,
                    parent: graphPrefix,
                });
            });
            common.jstree.loadJsTree("lineage_individualsPropertiesTree", jstreeData, { openAll: true });
        }
    };

    self.graphNodeNeighborhoodRanges = function (/** @type {{ id: string; label: string; }} */ nodeData) {
        var fromSource = Lineage_common.currentSource || Lineage_classes.mainSource;
        Sparql_OWL.getObjectProperties(source, [nodeData.id], {}, function (/** @type {any} */ err, /** @type {any[]} */ result) {
            if (err) {
                return MainController.UI.message(err);
            }
            if (result.length == 0) {
                $("#waitImg").css("display", "none");
                return MainController.UI.message(" no  data found");
            }
            var visjsData = { nodes: [], edges: [] };
            var existingIds = visjsGraph.getExistingIdsMap();
            var hasProperties = false;
            var labelStr = "<b>" + nodeData.label + "</b>\n";
            result.forEach(function (/** @type {{ propLabel: { value: any; }; prop: { value: any; }; rangeLabel: { value: any; }; range: { value: any; }; }} */ item) {
                hasProperties = true;
                var propLabel;
                if (item.propLabel) propLabel = item.propLabel.value;
                else propLabel = Sparql_common.getLabelFromURI(item.prop.value);
                var rangeLabel;
                if (item.rangeLabel) rangeLabel = item.rangeLabel.value;
                else rangeLabel = Sparql_common.getLabelFromURI(item.range.value);
                labelStr += "<i>" + propLabel + " : </i>" + rangeLabel + "\n";
            });
            var color = Lineage_classes.getSourceColor(fromSource);
            if (!existingIds[nodeData.id]) {
                existingIds[nodeData.id] = 1;
                var node = {
                    id: nodeData.id,
                    label: nodeData.label,
                    shadow: self.nodeShadow,
                    shape: Lineage_classes.defaultShape,
                    size: Lineage_classes.defaultShapeSize,
                    color: Lineage_classes.getSourceColor(fromSource, nodeData.id),
                    font: { multi: true, size: 10 },
                    data: {
                        source: fromSource,
                        id: nodeData.id,
                        label: nodeData.label,
                    },
                };

                visjsData.nodes.push(node);
            }
            color = "#ddd";
            var id = nodeData.id + "_range";
            if (hasProperties && !existingIds[id]) {
                existingIds[id] = 1;
                node = {
                    id: id,
                    label: labelStr,
                    shadow: self.nodeShadow,
                    shape: "box",

                    color: color,
                    font: { multi: true, size: 10 },
                    data: {
                        source: fromSource,
                        id: nodeData.id,
                        label: nodeData.label,
                    },
                };
                visjsData.nodes.push(node);

                visjsData.edges.push({
                    id: nodeData.id + "_" + id,
                    from: nodeData.id,
                    to: id,
                    width: 5,
                    data: {
                        from: nodeData.id,
                        to: id,
                        prop: prop,
                        type: "property",
                    },
                });
            }
            visjsGraph.data.nodes.add(visjsData.nodes);
            visjsGraph.data.edges.add(visjsData.edges);
        });
    };
    self.graphNodeNeighborhood = function (/** @type {{ id: string; label: string; }} */ nodeData, /** @type {string} */ propFilter) {
        var fromSource = Lineage_common.currentSource || Lineage_classes.mainSource;
        if (propFilter == "ranges") {
            return graphNodeNeighborhoodRanges(nodeData);
        }

        var ids = [nodeData.id];
        async.series(
            [
                function (callbackSeries) {
                    var sparql_url = Config.sources[nodeData.source].sparql_server.url;
                    var fromStr = Sparql_common.getFromStr(nodeData.source);
                    var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " + "select * " + fromStr + " where {";
                    var filter = Sparql_common.setFilter("ids", ids);

                    var queryOutcoming = "{?ids ?prop ?value.  " + filter + "  Optional {?value rdfs:label ?valueLabel}  Optional {?prop rdfs:label ?propLabel}} ";
                    var queryIncoming = " {?value ?prop ?ids.  " + filter + "  Optional {?value rdfs:label ?valueLabel}  Optional {?prop rdfs:label ?propLabel}} ";

                    if (propFilter == "outcoming") query += queryOutcoming;
                    else if (propFilter == "incoming") query += queryIncoming;
                    else if (propFilter == "all") query += queryOutcoming + " UNION " + queryIncoming;

                    query += "}";
                    var url = sparql_url + "?format=json&query=";
                    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: nodeData.source }, function (/** @type {any} */ err, /** @type {{ results: { bindings: any; }; }} */ result) {
                        if (err) {
                            return MainController.UI.message(err);
                        }
                        result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["prop", "value"]);
                        var data = result.results.bindings;
                        if (data.length == 0) {
                            $("#waitImg").css("display", "none");
                            return MainController.UI.message(" no  data found");
                        }

                        var visjsData = { nodes: [], edges: [] };
                        var existingIds = visjsGraph.getExistingIdsMap();
                        if (!existingIds[nodeData.id]) {
                            existingIds[nodeData.id] = 1;
                            var node = {
                                id: nodeData.id,
                                label: nodeData.label,
                                shadow: self.nodeShadow,
                                shape: Lineage_classes.defaultShape,
                                size: Lineage_classes.defaultShapeSize,
                                color: Lineage_classes.getSourceColor(Lineage_common.currentSource, nodeData.id),
                                font: { multi: true, size: 10 },
                                level: 5,
                                data: {
                                    source: Lineage_common.currentSource,
                                    id: nodeData.id,
                                    label: nodeData.label,
                                },
                            };

                            visjsData.nodes.push(node);
                        }
                        var distinctProps = {};
                        data.forEach(function (/** @type {{ prop: { value: string; }; value: { value: string; }; valueLabel: { value: any; }; propLabel: { value: any; }; }} */ item) {
                            if (true) {
                                if (!distinctProps[item.prop.value]) distinctProps[item.prop.value] = 1;
                                if (item.value.type == "uri" && item.value.value.indexOf("Class") < 0 && item.value.value.indexOf("_:b") < 0) {
                                    // if (!item.prop.value.match(/rdf|owl|skos/) || item.prop.value.indexOf("sameAs") > -1 || item.prop.value.indexOf("partOf") > -1) {
                                    // if (item.prop.value.indexOf("rdf") < 0 && item.prop.value.indexOf("owl") < 0) {
                                    //  if(!graphPropertiesFilterRegex || item.prop.value.match(graphPropertiesFilterRegex)) {
                                    if (!existingIds[item.value.value]) {
                                        existingIds[item.value.value] = 1;
                                        var node = {
                                            id: item.value.value,
                                            label: item.valueLabel.value,
                                            shadow: self.nodeShadow,
                                            shape: "square",
                                            color: Lineage_classes.getSourceColor(Lineage_common.currentSource, item.value.value),
                                            size: Lineage_classes.defaultShapeSize,
                                            font: { multi: true, size: 10 },
                                            level: 5,
                                            data: {
                                                source: Lineage_common.currentSource,
                                                id: item.value.value,
                                                label: item.valueLabel.value,
                                            },
                                        };

                                        visjsData.nodes.push(node);
                                    }
                                    var propLabel;
                                    if (item.propLabel) propLabel = item.propLabel.value;
                                    else propLabel = Sparql_common.getLabelFromURI(item.prop.value);
                                    var edgeId = nodeData.id + "_" + item.value.value;
                                    var inverseEdgeId = item.value.value + "_" + nodeData.id;
                                    var arrows;
                                    if (propFilter == "outcoming" || propFilter == "all")
                                        arrows = {
                                            to: {
                                                enabled: true,
                                                type: Lineage_classes.defaultEdgeArrowType,
                                                scaleFactor: 0.5,
                                            },
                                        };
                                    if (propFilter == "incoming")
                                        arrows = {
                                            to: {
                                                enabled: true,
                                                type: Lineage_classes.defaultEdgeArrowType,
                                                scaleFactor: 0.5,
                                            },
                                        };

                                    if (!existingIds[edgeId] && !existingIds[inverseEdgeId]) {
                                        existingIds[edgeId] = 1;
                                        visjsData.edges.push({
                                            id: edgeId,
                                            from: nodeData.id,
                                            label: propLabel.indexOf("subClassOf") > -1 ? null : propLabel,
                                            font: { multi: true, size: 8 },
                                            color: Lineage_classes.defaultEdgeColor,
                                            to: item.value.value,
                                            arrows: arrows,
                                            data: {
                                                from: nodeData.id,
                                                to: item.value.value,
                                                prop: item.prop.value,
                                                type: "property",
                                            },
                                        });
                                    }
                                }
                            }
                        });

                        if (visjsGraph.isGraphNotEmpty()) {
                            visjsGraph.data.nodes.update(visjsData.nodes);
                            visjsGraph.data.edges.update(visjsData.edges);
                        } else {
                            Lineage_classes.drawNewGraph(visjsData);
                        }
                        callbackSeries();
                    });
                },

                function (callbackSeries) {
                    if (propFilter != "all") return callbackSeries();
                    self.drawRestrictions(nodeData.source, ids, true);
                    callbackSeries();
                },
            ],
            function (err) {}
        );
    };

    self.addNodesAndParentsToGraph = function (/** @type {any} */ source, /** @type {any} */ nodeIds, options, /** @type {(arg0: undefined) => void} */ callback) {
        if (!nodeIds) {
            if (!source) source = Lineage_common.currentSource || Lineage_classes.mainSource;
            if (!source) return alert("select a source");
            nodeIds = self.getGraphIdsFromSource(source);
        }
        MainController.UI.message("");

        var slices = common.array.slice(nodeIds, 100);

        async.eachSeries(
            slices,
            function (/** @type {any} */ slice, /** @type {(arg0: undefined) => void} */ callbackEach) {
                Sparql_generic.getNodeParents(source, null, slice, 1, { selectGraph: 1 }, function (/** @type {any} */ err, /** @type {any[]} */ result) {
                    if (err) return callbackEach(err);

                    if (result.length == 0) {
                        $("#waitImg").css("display", "none");
                        return MainController.UI.message("No data found");
                    }

                    var existingNodes = visjsGraph.getExistingIdsMap();
                    var visjsData = { nodes: [], edges: [] };
                    var shape = self.defaultShape;

                    result.forEach(function (/** @type {{ broader1: { value: string; }; broader1Label: { value: any; }; concept: { value: string; }; }} */ item) {
                        if (item.broader1) {
                            let nodeSource = Sparql_common.getSourceFromGraphUri(item.broader1Graph.value);
                            let nodeColor = self.getSourceColor(nodeSource);

                            if (!existingNodes[item.concept.value]) {
                                existingNodes[item.concept.value] = 1;
                                var node = {
                                    id: item.concept.value,
                                    label: item.conceptLabel.value,
                                    shadow: self.nodeShadow,
                                    shape: shape,
                                    color: nodeColor,
                                    size: Lineage_classes.defaultShapeSize,
                                    data: {
                                        source: source,
                                        label: item.conceptLabel.value,
                                        id: item.concept.value,
                                    },
                                };

                                visjsData.nodes.push(node);
                            }

                            if (!existingNodes[item.broader1.value]) {
                                if (item.broader1 && (item.broader1.type == "bnode" || item.broader1.value.indexOf("_:") == 0))
                                    //skip blank nodes
                                    return;
                                existingNodes[item.broader1.value] = 1;
                                var node = {
                                    id: item.broader1.value,
                                    label: item.broader1Label.value,
                                    shadow: self.nodeShadow,
                                    shape: shape,
                                    color: nodeColor,
                                    size: Lineage_classes.defaultShapeSize,
                                    data: {
                                        source: source,
                                        label: item.broader1Label.value,
                                        id: item.broader1.value,
                                    },
                                };

                                visjsData.nodes.push(node);
                            }
                            //link node to source

                            if (item.broader1.value != source) {
                                var edgeId = item.concept.value + "_" + item.broader1.value;
                                if (!existingNodes[edgeId]) {
                                    existingNodes[edgeId] = 1;
                                    var edge = {
                                        id: edgeId,
                                        from: item.concept.value,
                                        to: item.broader1.value,
                                    };
                                    visjsData.edges.push(edge);
                                }
                            }
                        }
                    });

                    if (visjsGraph.isGraphNotEmpty()) {
                        visjsGraph.data.nodes.add(visjsData.nodes);
                        visjsGraph.data.edges.add(visjsData.edges);
                    } else {
                        Lineage_classes.drawNewGraph(visjsData);
                    }
                    callbackEach();
                });
            },
            function (/** @type {any} */ err) {
                $("#waitImg").css("display", "none");
                if (err) {
                    if (callback) return callback(err);
                    return MainController.UI.message("No data found");
                }
                visjsGraph.network.fit();
                if (callback) callback();
                return MainController.UI.message("", true);
            }
        );
    };
    self.addChildrenToGraph = function (/** @type {string | number} */ source, /** @type {any} */ nodeIds, /** @type {{ owlType?: any; depth?: any; dontClusterNodes?: any; }} */ options) {
        //  self.showHideCurrentSourceNodes(true);
        var parentIds;
        if (!source) {
            source = Lineage_common.currentSource || Lineage_classes.mainSource;
        }
        if (!source) return alert("select a source");

        if (nodeIds) {
            parentIds = nodeIds; // visjsGraph.getNodeDescendantIds(nodeIds, true)
        } else {
            parentIds = [];
            var nodes = visjsGraph.data.nodes.get();
            nodes.forEach(function (/** @type {{ data: { source: any; id: any; }; }} */ node) {
                if ((source == Lineage_common.currentSource || (node.data && node.data.source == source)) && node.data.id && node.data.id != source) {
                    parentIds.push(node.data.id);
                }
            });
        }
        if (parentIds.length == 0) return MainController.UI.message("no parent node selected");

        MainController.UI.message("");
        if (!options) options = {};
        if (self.currentOwlType == "ObjectProperty") options.owlType = "ObjectProperty";
        var depth = 1;
        if (options.depth) depth = options.depth;
        options.skipRestrictions = 1;
        options.selectGraph = 1;

        Sparql_generic.getNodeChildren(source, null, parentIds, depth, options, function (err, result) {
            if (err) return MainController.UI.message(err);
            var parentsMap = [];

            if (result.length == 0) {
                $("#waitImg").css("display", "none");
                return MainController.UI.message("No data found");
            }
            var color = self.getSourceColor(source);

            //get Clusters

            var clusters = [];

            result.forEach(function (item) {
                if (item.concept && (item.concept.type == "bnode" || item.concept.value.indexOf("_:") == 0))
                    //skip blank nodes
                    return;
                if (!parentsMap[item.concept.value]) parentsMap[item.concept.value] = [];
                var obj = {};
                for (var key in item) {
                    obj[key] = item[key] ? item[key].value : null;
                }
                parentsMap[item.concept.value].push(obj);

                var cancelCluster = true;
                if (!cancelCluster && !clusters[item.concept.value] && !options.dontClusterNodes && parentsMap[item.concept.value].length > Lineage_classes.minChildrenForClusters)
                    clusters.push([item.concept.value]);
            });

            var existingNodes = visjsGraph.getExistingIdsMap(true);
            var visjsDataClusters = { nodes: [], edges: [] };
            self.currentExpandLevel += 1;
            var expandedLevel = [];

            //pocess Clusters
            for (var parentConcept in parentsMap) {
                //************* parentsMap entry is a cluster
                if (clusters.indexOf(parentConcept) > -1) {
                    //on enleve les cluster du dernier bootomIds dsiono on cree des orphelins au niveau suivant

                    var nodeId = parentConcept + "_cluster";
                    if (!existingNodes[nodeId]) {
                        existingNodes[nodeId] = 1;
                        visjsDataClusters.nodes.push({
                            id: parentConcept + "_cluster",
                            label: parentsMap[parentConcept].length + "children",
                            shadow: self.nodeShadow,
                            shape: "star",
                            size: Lineage_classes.defaultShapeSize,
                            value: parentsMap[parentConcept].length,
                            color: color,
                            level: self.currentExpandLevel,
                            data: {
                                cluster: parentsMap[parentConcept],
                                id: parentConcept + "_cluster",
                                label: "CLUSTER : " + parentsMap[parentConcept].length + "children",
                                source: source,
                                parent: parentConcept,
                                varName: parentConcept + "_cluster",
                            }, //graphLevel:self.soucesLevelMap[source].children}
                        });
                    }
                    var edgeId = parentConcept + "_" + parentConcept + "_cluster";
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;
                        visjsDataClusters.edges.push({
                            id: edgeId,
                            to: parentConcept,
                            from: parentConcept + "_cluster",
                            color: Lineage_classes.defaultEdgeColor,
                            arrows: {
                                from: {
                                    enabled: true,
                                    type: Lineage_classes.defaultEdgeArrowType,
                                    scaleFactor: 0.5,
                                },
                            },
                            data: { source: source },
                        });
                    }
                }
            }

            //process non cluster nodes
            var existingIds = visjsGraph.getExistingIdsMap();
            var visjsData2 = { nodes: [], edges: [] };

            for (var parentConcept in parentsMap) {
                if (clusters.indexOf(parentConcept) < 0) {
                    var shapeSize = Lineage_classes.defaultShapeSize;

                    // identify namedIndividuals when several rdf:type
                    var namedIndividualsMap = {};
                    parentsMap[parentConcept].forEach(function (item) {
                        for (var i = 1; i < depth + 1; i++) {
                            if (item["child" + i + "Type"] && item["child" + i + "Type"].indexOf("NamedIndividual") > -1) {
                                namedIndividualsMap[item["child" + i]] = 1;
                            }
                        }
                    });

                    parentsMap[parentConcept].forEach(function (item) {
                        expandedLevel.push(item.id);

                        for (var i = 1; i < depth + 1; i++) {
                            if (item["child" + i]) {
                                let childNodeSource = Sparql_common.getSourceFromGraphUri(item["child" + i + "Graph"]);

                                if (!existingIds[item["child" + i]]) {
                                    var attrs = self.getNodeVisjAttrs(item["child" + i + "Type"], item.concept, childNodeSource);
                                    var isIndividualId = namedIndividualsMap[item["child" + i]];

                                    var xxx = item["child" + i + "Label"];
                                    if (item["child" + i] == "http://data.total.com/resource/tsf/ontology/apps-categories/greg/Synergi_S_-_SYNERGI") var x = 3;
                                    if (isIndividualId) attrs.shape = self.namedIndividualShape;

                                    existingIds[item["child" + i]] = 1;

                                    visjsData2.nodes.push({
                                        id: item["child" + i],
                                        label: item["child" + i + "Label"],
                                        shadow: self.nodeShadow,
                                        shape: attrs.shape,
                                        size: shapeSize,
                                        level: self.currentExpandLevel,
                                        color: attrs.color,

                                        data: {
                                            id: item["child" + i],
                                            label: item["child" + i + "Label"],
                                            source: childNodeSource,
                                            rdfType: namedIndividualsMap[item["child" + i]] ? "NamedIndividual" : "Class",
                                        },
                                    });
                                }
                                var parent;
                                if (i == 1) parent = item.concept;
                                else parent = item["child" + (i - 1)];
                                var edgeId = item["child" + i] + "_" + parent;
                                var inverseEdge = parent + "_" + item["child" + i];
                                if (!existingIds[edgeId] && !existingIds[inverseEdge]) {
                                    existingIds[edgeId] = 1;
                                    visjsData2.edges.push({
                                        id: edgeId,
                                        to: parent,
                                        from: item["child" + i],
                                        color: Lineage_classes.defaultEdgeColor,
                                        arrows: {
                                            to: {
                                                enabled: true,
                                                type: Lineage_classes.defaultEdgeArrowType,
                                                scaleFactor: 0.5,
                                            },
                                        },
                                        data: { source: childNodeSource },
                                    });
                                }
                            }
                        }
                    });
                }
            }
            var visjsData = {
                nodes: visjsDataClusters.nodes.concat(visjsData2.nodes),
                edges: visjsDataClusters.edges.concat(visjsData2.edges),
            };

            if (!expandedLevels[source]) expandedLevels[source] = [];
            expandedLevels[source].push(expandedLevel);
            visjsData.nodes = common.removeDuplicatesFromArray(visjsData.nodes, "id");
            visjsGraph.data.nodes.add(visjsData.nodes);
            visjsGraph.data.edges.add(visjsData.edges);
            visjsGraph.network.fit();
            $("#Lineage_levelDepthSpan").html("level :" + expandedLevels[source].length);

            $("#waitImg").css("display", "none");
        });
    };

    self.addChildrenToGraphOld = function (/** @type {string | number} */ source, /** @type {any} */ nodeIds, /** @type {{ owlType?: any; depth?: any; dontClusterNodes?: any; }} */ options) {
        //  self.showHideCurrentSourceNodes(true);
        var parentIds;
        if (!source) {
            source = Lineage_common.currentSource || Lineage_classes.mainSource;
        }
        if (!source) return alert("select a source");

        if (nodeIds) {
            parentIds = nodeIds; // visjsGraph.getNodeDescendantIds(nodeIds, true)
        } else {
            parentIds = [];
            var nodes = visjsGraph.data.nodes.get();
            nodes.forEach(function (/** @type {{ data: { source: any; id: any; }; }} */ node) {
                if ((source == Lineage_common.currentSource || (node.data && node.data.source == source)) && node.data.id && node.data.id != source) {
                    parentIds.push(node.data.id);
                }
            });
        }
        if (parentIds.length == 0) return MainController.UI.message("no parent node selected");

        MainController.UI.message("");
        if (!options) options = {};
        if (self.currentOwlType == "ObjectProperty") options.owlType = "ObjectProperty";
        var depth = 1;
        if (options.depth) depth = options.depth;
        Sparql_generic.getNodeChildren(
            source,
            null,
            parentIds,
            depth,
            {
                skipRestrictions: 1,
                selectGraph: 1,
            },
            function (/** @type {any} */ err, /** @type {any[]} */ result) {
                if (err) return MainController.UI.message(err);
                /**
                 * @type {never[]}
                 */
                var parentsMap = [];

                if (result.length == 0) {
                    $("#waitImg").css("display", "none");
                    return MainController.UI.message("No data found");
                }
                var color = self.getSourceColor(source);

                var namedIndividualsMap = {};

                result.forEach(function (
                    /** @type {{ concept: { value: string | number; }; conceptLabel: { value: any; }; child1: { value: any; }; child1Label: { value: any; }; child2: { value: any; }; child2Label: { value: any; }; child3: { value: any; }; child3Label: { value: any; }; }} */ item
                ) {
                    if (item.concept && (item.concept.type == "bnode" || item.concept.value.indexOf("_:") == 0))
                        //skip blank nodes
                        return;
                    if (!parentsMap[item.concept.value]) parentsMap[item.concept.value] = [];
                    var obj = {};
                    for (var key in item) {
                        obj[key] = item[key] ? item[key].value : null;
                    }
                    /*   if(item.conceptType && item.conceptType.value.indexOf("NamedIndividual">-1)) {
namedIndividualsMap[item.concept.value] = 1
}*/

                    parentsMap[item.concept.value].push(obj);
                    ids.push(item.child1.value);
                });

                var existingNodes = visjsGraph.getExistingIdsMap(true);
                var visjsData = { nodes: [], edges: [] };
                self.currentExpandLevel += 1;

                var expandedLevel = [];
                for (var key in parentsMap) {
                    //check if cluster is already open
                    var cancelCluster = true;

                    parentsMap[key].forEach(function (/** @type {{ child1: string | number; }} */ item) {
                        if (existingNodes[item.child1]) cancelCluster = true;
                    });

                    //************* parentsMap entry is a cluster
                    if (!cancelCluster && parentsMap[key].length > Lineage_classes.minChildrenForClusters && !options.dontClusterNodes) {
                        //on enleve les cluster du dernier bootomIds dsiono on cree des orphelins au niveau suivant

                        var nodeId = key + "_cluster";
                        if (!existingNodes[nodeId]) {
                            existingNodes[nodeId] = 1;
                            visjsData.nodes.push({
                                id: key + "_cluster",
                                label: parentsMap[key].length + "children",
                                shadow: self.nodeShadow,
                                shape: "star",
                                size: Lineage_classes.defaultShapeSize,
                                value: parentsMap[key].length,
                                color: color,
                                level: self.currentExpandLevel,
                                data: {
                                    cluster: parentsMap[key],
                                    id: key + "_cluster",
                                    label: "CLUSTER : " + parentsMap[key].length + "children",
                                    source: source,
                                    parent: key,
                                    varName: key + "_cluster",
                                }, //graphLevel:self.soucesLevelMap[source].children}
                            });
                        }
                        var edgeId = key + "_" + key + "_cluster";
                        if (!existingNodes[edgeId]) {
                            existingNodes[edgeId] = 1;
                            visjsData.edges.push({
                                id: edgeId,
                                to: key,
                                from: key + "_cluster",
                                color: Lineage_classes.defaultEdgeColor,
                                arrows: {
                                    from: {
                                        enabled: true,
                                        type: Lineage_classes.defaultEdgeArrowType,
                                        scaleFactor: 0.5,
                                    },
                                },
                                data: { source: source },
                            });
                        }
                    } //*************parentsMpa entry is not a cluster
                    else {
                        var existingIds = visjsGraph.getExistingIdsMap();
                        var visjsData2 = { nodes: [], edges: [] };
                        parentsMap[key].forEach(function (/** @type {{ [x: string]: any; id: any; concept: any; }} */ item) {
                            var shapeSize = Lineage_classes.defaultShapeSize;

                            expandedLevel.push(item.id);
                            for (var i = 1; i < 4; i++) {
                                if (item["child" + i + "Type"] && item["child" + i + "Type"].indexOf("NamedIndividual") > -1) {
                                    namedIndividualsMap[item["child" + i]] = 1;
                                }
                            }

                            for (var i = 1; i < 4; i++) {
                                if (item["child" + i]) {
                                    let childNodeSource = Sparql_common.getSourceFromGraphUri(item["child" + i + "Graph"]);

                                    if (!existingIds[item["child" + i]]) {
                                        var attrs = self.getNodeVisjAttrs(item["child" + i + "Type"], item.concept, childNodeSource);
                                        if (namedIndividualsMap[item["child" + i]]) attrs.shape = self.namedIndividualShape;

                                        existingIds[item["child" + i]] = 1;

                                        visjsData2.nodes.push({
                                            id: item["child" + i],
                                            label: item["child" + i + "Label"],
                                            shadow: self.nodeShadow,
                                            shape: attrs.shape,
                                            size: shapeSize,
                                            level: self.currentExpandLevel,
                                            color: attrs.color,

                                            data: {
                                                id: item["child" + i],
                                                label: item["child" + i + "Label"],
                                                source: childNodeSource,
                                                rdfType: namedIndividualsMap[item["child" + i]] ? "NamedIndividual" : "Class",
                                            },
                                        });
                                    }
                                    var parent;
                                    if (i == 1) parent = item.concept;
                                    else parent = item["child" + (i - 1)];
                                    var edgeId = item["child" + i] + "_" + parent;
                                    var inverseEdge = parent + "_" + item["child" + i];
                                    if (!existingIds[edgeId] && !existingIds[inverseEdge]) {
                                        existingIds[edgeId] = 1;
                                        visjsData2.edges.push({
                                            id: edgeId,
                                            to: parent,
                                            from: item["child" + i],
                                            color: Lineage_classes.defaultEdgeColor,
                                            arrows: {
                                                to: {
                                                    enabled: true,
                                                    type: Lineage_classes.defaultEdgeArrowType,
                                                    scaleFactor: 0.5,
                                                },
                                            },
                                            data: { source: childNodeSource },
                                        });
                                    }
                                }
                            }
                        });
                    }
                    visjsData.nodes = visjsData.nodes.concat(visjsData2.nodes);
                    visjsData.edges = visjsData.edges.concat(visjsData2.edges);
                }
                if (!expandedLevels[source]) expandedLevels[source] = [];
                expandedLevels[source].push(expandedLevel);
                visjsData.nodes = common.removeDuplicatesFromArray(visjsData.nodes, "id");
                visjsGraph.data.nodes.add(visjsData.nodes);
                visjsGraph.data.edges.add(visjsData.edges);
                visjsGraph.network.fit();
                $("#Lineage_levelDepthSpan").html("level :" + expandedLevels[source].length);

                $("#waitImg").css("display", "none");
            }
        );
    };
    self.drawIndividualsProperties = function (/** @type {any} */ propertyId, /** @type {any} */ classIds, /** @type {{ inverse?: any; }} */ options) {
        if (!options) {
            options = {};
        }
        self.currentExpandLevel += 1;
        if (!propertyId) {
            //  propertyId = $("#lineage_individualsPropertiesSelect").val()
            propertyId = $("#lineage_individualsPropertiesTree").jstree(true).get_selected();
        }
        var source = Lineage_common.currentSource || Lineage_classes.mainSource;
        if (!source) return alert("select a source");
        var subjects = null;
        var objects = null;
        if (!classIds) {
            var filterType = $("#lineage_clearIndividualsPropertiesFilterSelect").val();
            if (filterType == "graph nodes") classIds = self.getGraphIdsFromSource(source);
            else if (filterType == "filter value") {
                return alert("to be developped");
            }
        }
        if (options.inverse) {
            objects = classIds;
        } else {
            subjects = classIds;
        }
        MainController.UI.message("");
        Sparql_OWL.getIndividualProperties(source, subjects, [propertyId], objects, null, function (/** @type {any} */ err, /** @type {any[]} */ result) {
            if ($("#lineage_clearIndividualsPropertiesCBX").prop("checked")) {
                var oldIds = Object.keys(self.currentIndividualsProperties);
                visjsGraph.data.nodes.remove(oldIds);
                visjsGraph.data.edges.remove(oldIds);
            }

            if (err) return MainController.UI.message(err);
            if (result.length == 0) {
                $("#waitImg").css("display", "none");
                Lineage_classes.drawRestrictions(classIds);
                return MainController.UI.message("No data found");
            }
            var visjsData = { nodes: [], edges: [] };
            var existingNodes = visjsGraph.getExistingIdsMap();
            var color = self.getPropertyColor(propertyId);

            result.forEach(function (
                /** @type {{ subject: { value: any; }; property: { value: string; }; subjectLabel: { value: any; }; object: { value: any; }; objectLabel: { value: any; }; propertyLabel: { value: string; }; }} */ item
            ) {
                if (!item.subject) {
                    item.subject = { value: "?_" + item.property.value };
                }
                if (!item.subjectLabel) {
                    item.subjectLabel = { value: "?" };
                }
                if (!existingNodes[item.subject.value]) {
                    existingNodes[item.subject.value] = 1;
                    visjsData.nodes.push({
                        id: item.subject.value,
                        label: item.subjectLabel.value,
                        font: { color: color },
                        shadow: self.nodeShadow,
                        shape: "dot",
                        level: self.currentExpandLevel,
                        size: Lineage_classes.defaultShapeSize,
                        color: "#ddd",
                        data: { source: source },
                    });
                }
                if (!item.object) {
                    item.object = { value: "?_" + item.property.value };
                }
                if (!item.objectLabel) {
                    item.objectLabel = { value: "?" };
                }
                if (!existingNodes[item.object.value]) {
                    existingNodes[item.object.value] = 1;
                    visjsData.nodes.push({
                        id: item.object.value,
                        label: item.objectLabel.value,
                        font: { color: color },
                        shadow: self.nodeShadow,
                        shape: "dot",
                        level: self.currentExpandLevel,
                        size: Lineage_classes.defaultShapeSize,
                        color: "#ddd",
                        data: { source: source },
                    });
                }
                var edgeId = item.subject.value + "_" + item.object.value + "_" + item.property.value;
                if (!existingNodes[edgeId]) {
                    existingNodes[edgeId] = 1;

                    visjsData.edges.push({
                        id: edgeId,
                        from: item.subject.value,
                        to: item.object.value,
                        label: "<i>" + item.propertyLabel.value + "</i>",
                        data: { propertyId: item.property.value, source: source },
                        font: { multi: true, size: 10 },

                        // font: {align: "middle", ital: {color:Lineage_classes.objectPropertyColor, mod: "italic", size: 10}},
                        //   physics:false,
                        arrows: {
                            to: {
                                enabled: true,
                                type: "bar",
                                scaleFactor: 0.5,
                            },
                        },
                        //  dashes: true,
                        color: color,
                    });
                }
            });
            self.currentIndividualsProperties = existingNodes;
            if (!visjsGraph.data || !visjsGraph.data.nodes) {
                self.drawNewGraph(visjsData);
            } else {
                visjsGraph.data.nodes.add(visjsData.nodes);
                visjsGraph.data.edges.add(visjsData.edges);
            }
            visjsGraph.network.fit();
            $("#waitImg").css("display", "none");

            //   $("#lineage_clearIndividualsPropertiesCBX").prop("checked",true)
        });
    };

    self.drawObjectProperties = function (/** @type {any} */ source, /** @type {string | null} */ classIds, /** @type {any} */ _descendantsAlso) {
        if (!classIds) {
            if (!source) source = Lineage_common.currentSource || Lineage_classes.mainSource;
            if (!source) return alert("select a source");
            classIds = self.getGraphIdsFromSource(source);
        }
        if (classIds == "all") classIds = null;

        function drawProperties(result) {
            var visjsData = { nodes: [], edges: [] };
            var existingNodes = visjsGraph.getExistingIdsMap();
            self.currentExpandLevel += 1;
            result.forEach(function (
                /** @type {{ range: { value?: any; range?: string; }; prop: { value: string; }; rangeLabel: { value: any; }; domain: { value: any; }; propLabel: { value: string; }; }} */ item
            ) {
                if (!item.range) {
                    item.range = { value: "?_" + item.prop.value };
                }
                if (!item.range.value.match(/.+:.+|http.+|_:+/)) return;
                if (!item.rangeLabel) {
                    item.rangeLabel = { value: "?" };
                }
                if (!existingNodes[item.range.value]) {
                    existingNodes[item.range.value] = 1;
                    visjsData.nodes.push({
                        id: item.range.value,
                        label: item.rangeLabel.value,
                        shadow: self.nodeShadow,
                        shape: Lineage_classes.defaultShape,
                        size: Lineage_classes.defaultShapeSize,
                        color: self.getSourceColor(source, item.range.value),
                        level: self.currentExpandLevel,
                        data: {
                            source: source,
                            id: item.range.value,
                            label: item.rangeLabel.value,
                            varName: "range",
                        },
                    });
                }
                if (!item.domain) {
                    item.domain = { value: "?" };
                }
                if (!item.range) {
                    item.range = { range: "?" };
                }

                var edgeId = item.domain.value + "_" + item.range.value + "_" + item.prop.value;
                var edgeIdInv = item.range.value + "_" + item.range.value + "_" + item.prop.value;
                if (!existingNodes[edgeId]) {
                    existingNodes[edgeId] = 1;
                    if (!existingNodes[edgeIdInv]) {
                        existingNodes[edgeIdInv] = 1;
                        visjsData.edges.push({
                            id: edgeId,
                            from: item.range.value,
                            to: item.domain.value,
                            label: "<i>" + item.propLabel.value + "</i>",
                            data: { propertyId: item.prop.value, source: source },
                            font: { multi: true, size: 10 },
                            // font: {align: "middle", ital: {color:Lineage_classes.objectPropertyColor, mod: "italic", size: 10}},
                            //   physics:false,
                            arrows: {
                                from: {
                                    enabled: true,
                                    type: "bar",
                                    scaleFactor: 0.5,
                                },
                            },
                            // dashes: true,
                            // color: Lineage_classes.objectPropertyColor
                        });
                    }
                }
            });
            if (!visjsGraph.data || !visjsGraph.data.nodes) {
                self.drawNewGraph(visjsData);
            }
            visjsGraph.data.nodes.add(visjsData.nodes);
            visjsGraph.data.edges.add(visjsData.edges);
            visjsGraph.network.fit();
            $("#waitImg").css("display", "none");
        }

        if (Config.sources[source].schemaType == "OWL") {
            Sparql_OWL.getObjectProperties(
                source,
                classIds,
                {
                    withoutImports: Lineage_common.currentSource || false,
                    addInverseRestrictions: 1,
                },
                function (/** @type {any} */ err, /** @type {any[]} */ result) {
                    if (err) return MainController.UI.message(err);
                    if (result.length == 0) {
                        $("#waitImg").css("display", "none");

                        return MainController.UI.message("No data found");
                    }
                    drawProperties(result);
                }
            );
        }

        if (Config.sources[source].schemaType == "KNOWLEDGE_GRAPH") {
            let options = {};
            Sparql_OWL.getIndividualProperties(source, classIds, null, null, options, function (err, result) {
                if (err) return callback(err);

                result.forEach(function (item) {
                    item.range = { value: item.object.value };
                    item.rangeLabel = { value: item.objectLabel.value };
                    item.domain = { value: item.subject.value };
                    item.domainLabel = { value: item.subjectLabel.value };
                    item.prop = { value: item.property.value };
                    item.propLabel = { value: item.propertyLabel.value };
                });
                drawProperties(result);
            });
        }
    };

    self.drawRestrictions = function (
        /** @type {any} */ source,
        /** @type {string | null} */ classIds,
        /** @type {any} */ descendants,
        /** @type {any} */ withoutImports,
        /** @type {{ processorFn?: any; }} */ options,
        callback
    ) {
        if (!options) options = {};
        if (!source) source = Lineage_common.currentSource || Lineage_classes.mainSource;
        if (!source) return alert("select a source");
        if (!classIds) {
            classIds = self.getGraphIdsFromSource(source);
        }
        if (classIds == "all") classIds = null;

        MainController.UI.message("");

        Sparql_OWL.getObjectRestrictions(
            source,
            classIds,
            {
                withoutImports: Lineage_common.currentSource || false,

                addInverseRestrictions: 1,
            },
            function (/** @type {any} */ err, /** @type {any[]} */ result) {
                if (err) return MainController.UI.message(err);

                if (result.length == 0) {
                    $("#waitImg").css("display", "none");
                    return MainController.UI.message("No data found");
                }
                var visjsData = { nodes: [], edges: [] };
                var existingNodes = visjsGraph.getExistingIdsMap();
                self.currentExpandLevel += 1;

                var restrictionSource = source;
                if (!Config.sources[source].editable) restrictionSource = Config.predicatesSource;

                var shape = Lineage_classes.defaultShape;
                result.forEach(function (
                    /** @type {{ concept: { value: string; }; conceptLabel: { value: any; }; value: { value: any; }; prop: { value: string; }; valueLabel: { value: any; }; propLabel: { value: string; }; node: { value: any; }; }} */ item
                ) {
                    if (!existingNodes[item.concept.value]) {
                        existingNodes[item.concept.value] = 1;
                        var color = self.getSourceColor(source);

                        var size = Lineage_classes.defaultShapeSize;
                        visjsData.nodes.push({
                            id: item.concept.value,
                            label: item.conceptLabel.value,
                            shadow: self.nodeShadow,
                            shape: shape,
                            size: size,

                            color: color,
                            level: self.currentExpandLevel,
                            data: {
                                source: source,
                                id: item.concept.value,
                                label: item.conceptLabel.value,
                                varName: "value",
                            },
                        });
                    }

                    size = self.defaultShapeSize;
                    if (!item.value) {
                        color = "#ddd";
                        item.value = { value: "?_" + item.prop.value };
                        item.valueLabel = { value: "any" };
                        shape = "text";
                        size = 3;
                    } else {
                        color = self.getSourceColor(source, item.value.value);
                    }
                    if (!item.valueLabel) {
                        item.valueLabel = { value: "" };
                        size = 3;
                    }
                    if (!existingNodes[item.value.value]) {
                        existingNodes[item.value.value] = 1;
                        visjsData.nodes.push({
                            id: item.value.value,
                            label: item.valueLabel.value,
                            shadow: self.nodeShadow,
                            shape: shape,
                            size: size,

                            color: color,
                            level: self.currentExpandLevel,
                            data: {
                                source: source,
                                id: item.value.value,
                                label: item.valueLabel.value,
                                varName: "value",
                            },
                        });
                    }
                    var edgeId = item.value.value + "_" + item.concept.value + "_" + item.prop.value;
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;

                        visjsData.edges.push({
                            id: edgeId,
                            from: item.value.value,
                            to: item.concept.value,
                            label: "<i>" + item.propLabel.value + "</i>",
                            data: { propertyId: item.prop.value, bNodeId: item.node.value, source: restrictionSource, propertyLabel: item.propLabel.value },
                            font: { multi: true, size: 10 },
                            // font: {align: "middle", ital: {color:Lineage_classes.objectPropertyColor, mod: "italic", size: 10}},
                            //   physics:false,
                            arrows: {
                                from: {
                                    enabled: true,
                                    type: "solid",
                                    scaleFactor: 0.5,
                                },
                            },
                            dashes: true,
                            color: Lineage_classes.restrictionColor,
                        });
                    }
                });

                if (!visjsGraph.data || !visjsGraph.data.nodes) {
                    self.drawNewGraph(visjsData);
                } else {
                    visjsGraph.data.nodes.add(visjsData.nodes);
                    visjsGraph.data.edges.add(visjsData.edges);
                    visjsGraph.network.fit();
                }
                CustomPluginController.setGraphNodesIcons();
                $("#waitImg").css("display", "none");

                if (options.processorFn) {
                    options.processorFn(result);
                }
                if (callback) return callback(null, result);
            }
        );
    };

    self.drawDictionarySameAs = function () {
        /**
         * @param {any[]} restrictionNodes
         */
        function processMetadata(restrictionNodes) {
            var restrictionIds = [];
            restrictionNodes.forEach(function (/** @type {{ node: { id: any; }; }} */ bNode) {
                restrictionIds.push(bNode.node.id);
            });
        }

        var existingNodes = visjsGraph.data.nodes.getIds();
        var options = {
            processorFn: processMetadata,
            filter: " FILTER (?prop in <http://www.w3.org/2002/07/owl#sameAs>) ",
        };
        self.drawRestrictions(Config.dictionarySource, existingNodes, false, false, options);
    };

    self.drawNamedIndividuals = function (/** @type {any[]} */ classIds) {
        var source = Lineage_common.currentSource || Lineage_classes.mainSource;
        if (!source) return alert("select a source");
        if (!classIds) {
            classIds = self.getGraphIdsFromSource(source);
        }
        MainController.UI.message("");

        Sparql_OWL.getNamedIndividuals(source, classIds, null, function (/** @type {any} */ err, /** @type {any[]} */ result) {
            if (err) return MainController.UI.message(err);
            if (result.length == 0) {
                $("#waitImg").css("display", "none");
                return MainController.UI.message("No data found");
            }
            var visjsData = { nodes: [], edges: [] };
            var existingNodes = visjsGraph.getExistingIdsMap();
            var color = self.getSourceColor(source);
            //  console.log(JSON.stringify(result, null, 2))

            if (!Array.isArray(classIds)) classIds = [classIds];
            result.forEach(function (/** @type {{ node: { value: string; }; nodeLabel: { value: any; }; concept: { value: string; }; conceptLabel: { value: any; }; }} */ item) {
                if (!existingNodes[item.node.value]) {
                    existingNodes[item.node.value] = 1;
                    visjsData.nodes.push({
                        id: item.node.value,
                        label: item.nodeLabel.value,
                        shadow: self.nodeShadow,
                        shape: Lineage_classes.namedIndividualShape,
                        size: Lineage_classes.defaultShapeSize,
                        color: color,
                        data: {
                            source: source,
                            id: item.node.value,
                            label: item.nodeLabel.value,
                            varName: "class",
                        },
                    });
                }

                if (!existingNodes[item.concept.value]) {
                    existingNodes[item.concept.value] = 1;
                    visjsData.nodes.push({
                        id: item.concept.value,
                        label: item.conceptLabel.value,
                        shadow: self.nodeShadow,
                        shape: Lineage_classes.namedIndividualShape,
                        size: Lineage_classes.defaultShapeSize,
                        color: color,
                        data: {
                            source: source,
                            id: item.concept.value,
                            label: item.conceptLabel.value,
                            varName: "value",
                        },
                    });
                }
                var edgeId = item.concept.value + "_" + item.node.value;
                if (!existingNodes[edgeId]) {
                    existingNodes[edgeId] = 1;

                    visjsData.edges.push({
                        id: edgeId,
                        from: item.concept.value,
                        to: item.node.value,
                        arrows: {
                            to: {
                                enabled: true,
                                type: "solid",
                                scaleFactor: 0.5,
                            },
                        },
                        color: Lineage_classes.namedIndividualColor,
                    });
                }
            });

            visjsGraph.data.nodes.add(visjsData.nodes);
            visjsGraph.data.edges.add(visjsData.edges);
            visjsGraph.network.fit();
            $("#waitImg").css("display", "none");
        });
    };

    self.collapseNode = function (/** @type {any} */ nodeId) {
        if (nodeId) {
            var children = visjsGraph.network.getConnectedNodes(nodeId, "from");
            visjsGraph.data.nodes.remove(children);
        } else {
            var source = Lineage_common.currentSource;
            if (expandedLevels[source].length > 0) visjsGraph.data.nodes.remove(expandedLevels[source][expandedLevels[source].length - 1]);
            expandedLevels[source].splice(expandedLevels[source].length - 1, 1);
            $("#Lineage_levelDepthSpan").html("level :" + expandedLevels[source].length);
        }
    };

    self.setGraphPopupMenus = function (/** @type {{ id: string | string[]; data: { cluster: string | any[]; }; }} */ node, /** @type {any} */ event) {
        if (!node) return;
        graphContext.clickOptions = event;
        var html = "";

        if (node.id && node.id.indexOf("_cluster") > 0) {
            html = "";
            if (node.data.cluster.length <= Lineage_classes.showLimit) html = '    <span class="popupMenuItem" onclick="Lineage_classes.graphActions.openCluster();"> Open cluster</span>';
            html += '    <span class="popupMenuItem" onclick="Lineage_classes.graphActions.listClusterContent();"> list cluster content</span>';
            html += '    <span class="popupMenuItem" onclick="Lineage_classes.graphActions.listClusterToClipboard();"> list to clipboard</span>';
        } else if (node.from && node.data.bNodeId) {
            if (authentication.currentUser.groupes.indexOf("admin") > -1 && Config.sources[node.data.source] && Config.sources[node.data.source].editable) {
                html += '    <span class="popupMenuItem" onclick="Lineage_classes.graphActions.deleteRestriction();"> Delete relation</span>';
                html += '    <span class="popupMenuItem" onclick="Lineage_classes.graphActions.createSubPropertyAndreplaceRelation();"> Refine relation</span>';
            }
        } else {
            html =
                '    <span  class="popupMenuItem" onclick="Lineage_classes.graphActions.showNodeInfos();"> Node infos</span>' +
                '   <span  id=\'lineage_graphPopupMenuItem\' class="popupMenuItem" onclick="Lineage_classes.graphActions.expand();"> Expand</span>' +
                '    <span class="popupMenuItem" onclick="Lineage_classes.graphActions.drawParents();"> Parents</span>' +
                '    <span class="popupMenuItem" onclick="Lineage_classes.graphActions.drawSimilars();"> Similars</span>' +
                '    <span  class="popupMenuItem" onclick="Lineage_classes.graphActions.collapse();">Collapse</span>' +
                '    <span  class="popupMenuItem" onclick="Lineage_classes.graphActions.showObjectProperties();">ObjectProperties</span>' +
                '    <span  class="popupMenuItem" onclick="Lineage_classes.graphActions.showRestrictions();">Restrictions</span>' +
                '    <span  class="popupMenuItem" onclick="Lineage_classes.graphActions.showIndividuals();">Individuals</span>' +
                '    <span  class="popupMenuItem" onclick="Lineage_classes.graphActions.graphNodeNeighborhoodUI();">Neighborhood</span>' +
                '    <span  class="popupMenuItem" onclick="Lineage_classes.graphActions.removeFromGraph();">Remove from graph</span>' +
                '    <span  class="popupMenuItem" onclick="Lineage_classes.graphActions.removeOthersFromGraph();">Remove others</span>';
        }

        $("#graphPopupDiv").html(html);
    };

    self.zoomGraphOnNode = function (/** @type {any} */ nodeId, changeSise) {
        var nodes = visjsGraph.data.nodes.getIds();
        if (nodes.indexOf(nodeId) < 0) return;
        visjsGraph.network.focus(nodeId, {
            scale: 1,
            locked: false,
            animation: true,
        });

        /**
         * @type {{ id: any; size: any; shadow: any; shape: any; font: { color: string; }; }[]}
         */
        var newNodes = [];
        nodes = visjsGraph.data.nodes.get();
        nodes.forEach(function (/** @type {{ data: { initialParams: { size: any; shape: any; shadow?: any; }; }; shape: any; size: any; id: any; }} */ node) {
            if (!node.data) return;
            //  if (!node.data.initialParams) {
            node.data.initialParams = {
                shadow: self.nodeShadow,
                shape: node.shape,
                size: node.size,
            };
            //   }
            var size, shape;
            var font = { color: "black" };
            if (node.id == nodeId) {
                size = node.data.initialParams.size * 2;
                //  shape = "hexagon";
                font = { color: "red" };
            } else {
                size = node.data.initialParams.size;
                shape = node.data.initialParams.shape;
            }
            newNodes.push({ id: node.id, size: size, shadow: self.nodeShadow, font: font });
            newNodes.push({ id: node.id, opacity: 1 });
        });
        visjsGraph.data.nodes.update(newNodes);
    };

    self.drawNodeAndParents = function (
        /** @type {{ source: string | number; label: any; text: any; id: string | number; }} */ nodeData,
        ancestorsDepth,
        /** @type {(arg0: string | null, arg1: { nodes: never[]; edges: never[]; } | undefined) => any} */ callback
    ) {
        /**
         * @param {any[]} result
         */
        function drawNodeAndparent(result) {
            var visjsData = { nodes: [], edges: [] };
            var color = self.getSourceColor(nodeData.source);
            var newNodeIds = [];
            if (!nodeData.label && nodeData.text) nodeData.label = nodeData.text;
            var existingNodes = visjsGraph.getExistingIdsMap();

            var conceptType = "Class";
            result.forEach(function (item) {
                if (item.conceptType && item.conceptType.value.indexOf("NamedIndividual") > -1) {
                    conceptType = "NamedIndividual";
                }
            });

            result.forEach(function (/** @type {{ [x: string]: { value: any; }; concept: { value: string | number; }; conceptLabel: { value: any; }; }} */ item) {
                var shape = conceptType == "NamedIndividual" ? self.namedIndividualShape : self.defaultShape;
                if (!existingNodes[item.concept.value]) {
                    existingNodes[item.concept.value] = 1;
                    visjsData.nodes.push({
                        id: item.concept.value,
                        label: item.conceptLabel.value,
                        data: {
                            id: item.concept.value,
                            label: item.conceptLabel.value,
                            source: nodeData.source,
                            type: conceptType,
                        },
                        shadow: self.nodeShadow,
                        level: ancestorsDepth,
                        shape: shape,
                        color: self.getSourceColor(nodeData.source, item.concept.value),
                        size: Lineage_classes.defaultShapeSize,
                    });
                }
                newNodeIds.push(item.concept.value);

                var edgeId;
                for (var i = 1; i < ancestorsDepth; i++) {
                    if (item["broader" + i]) {
                        var broader = item["broader" + i];
                        if (broader && (broader.value.indexOf("_:b") > -1 || broader.value.indexOf("#Class") > -1 || broader.value.indexOf("#NamedIndividual") > -1)) continue;

                        if (!existingNodes[broader.value]) {
                            existingNodes[item["broader" + i].value] = 1;
                            visjsData.nodes.push({
                                id: broader.value,
                                label: item["broader" + i + "Label"].value,
                                data: {
                                    source: nodeData.source,
                                    label: item["broader" + i + "Label"].value,
                                    id: broader.value,
                                },
                                shadow: self.nodeShadow,
                                shape: Lineage_classes.defaultShape,
                                color: color,
                                level: ancestorsDepth - i,
                                size: Lineage_classes.defaultShapeSize,
                            });
                            newNodeIds.push(broader.value);
                            var fromId;
                            if (i == 1) fromId = item.concept.value;
                            else fromId = item["broader" + (i - 1)].value;

                            edgeId = fromId + "_" + broader.value;
                            if (!existingNodes[edgeId]) {
                                existingNodes[edgeId] = 1;

                                visjsData.edges.push({
                                    id: edgeId,
                                    from: broader.value,
                                    to: fromId,
                                    data: { source: nodeData.source },
                                    color: Lineage_classes.defaultEdgeColor,
                                    arrows: {
                                        from: {
                                            enabled: true,
                                            type: Lineage_classes.defaultEdgeArrowType,
                                            scaleFactor: 0.5,
                                        },
                                    },
                                });
                            }
                        } else {
                            //join an existing node
                            if (i == 1) fromId = item.concept.value;
                            else fromId = item["broader" + (i - 1)].value;

                            edgeId = fromId + "_" + item["broader" + i].value;
                            if (!existingNodes[edgeId]) {
                                existingNodes[edgeId] = 1;
                                visjsData.edges.push({
                                    id: edgeId,
                                    from: fromId,
                                    to: item["broader" + i].value,
                                    data: { source: nodeData.source },
                                    color: Lineage_classes.defaultEdgeColor,
                                    arrows: {
                                        to: {
                                            enabled: true,
                                            type: Lineage_classes.defaultEdgeArrowType,
                                            scaleFactor: 0.5,
                                        },
                                    },
                                });
                            }
                            break;
                        }
                    } else {
                        /*    var id=item["broader" + (i-1)].value;
if(upperNodeIds.indexOf(id)<0) {
upperNodeIds.push(id);

}*/
                    }
                }
            });

            existingNodes = visjsGraph.getExistingIdsMap();
            if (!existingNodes[nodeData.source]) {
                visjsData.nodes.forEach(function (_item) {
                    // pass
                });
            }
            if (callback) return callback(null, visjsData);

            self.registerSource(nodeData.source);
            /*  expandedLevels[nodeData.source][expandedLevels[nodeData.source].length ].push(newNodeIds);*/

            if (!visjsGraph.data || !visjsGraph.data.nodes) {
                self.drawNewGraph(visjsData);
            } else {
                visjsGraph.data.nodes.add(visjsData.nodes);
                visjsGraph.data.edges.add(visjsData.edges);
            }

            setTimeout(function () {
                self.zoomGraphOnNode(nodeData.id, false);
            }, 500);
            $("#waitImg").css("display", "none");
            return MainController.UI.message("No data found");
        }

        var existingNodes = visjsGraph.getExistingIdsMap();
        if (existingNodes[nodeData.id]) return self.zoomGraphOnNode(nodeData.id);

        MainController.UI.message("");
        var schemaType = Config.sources[nodeData.source].schemaType;
        if (schemaType == "OWL" || schemaType == "SKOS") {
            if (ancestorsDepth != 0) ancestorsDepth = 7;
            Sparql_generic.getNodeParents(nodeData.source, null, nodeData.id, ancestorsDepth, { skipRestrictions: 1 }, function (/** @type {any} */ err, /** @type {string | any[]} */ result) {
                if (err) {
                    if (callback) return callback(err);
                    return MainController.UI.message(err);
                }

                if (result.length == 0) {
                    if (callback) return callback("No data found");
                    $("#waitImg").css("display", "none");
                    return MainController.UI.message("No data found");
                }
                return drawNodeAndparent(result);
            });
        } else if (schemaType == "KNOWLEDGE_GRAPH") {
            var data = [
                {
                    concept: {
                        value: nodeData.id,
                    },
                    conceptLabel: {
                        value: nodeData.label,
                    },
                },
            ];
            return drawNodeAndparent(data);
        }
    };

    self.graphActions = {
        showGraphPopupMenu: function (/** @type {{ from: any; }} */ node, /** @type {any} */ point, /** @type {any} */ event) {
            if (node.from) {
                self.currentGraphEdge = node;
                if (true) {
                    //   if (!self.currentGraphEdge.data || !self.currentGraphEdge.data.propertyId) return;
                    self.setGraphPopupMenus(node, event);
                    MainController.UI.showPopup(point, "graphPopupDiv");
                }
                // SourceBrowser.showNodeInfos(self.currentGraphEdge.data.source, self.currentGraphEdge.data.propertyId, "mainDialogDiv", { resetVisited: 1 });
            } else {
                self.setGraphPopupMenus(node, event);
                self.currentGraphNode = node;
                MainController.UI.showPopup(point, "graphPopupDiv");
            }
        },

        onNodeClick: function (/** @type {{ data: { cluster: any; }; }} */ node, /** @type {any} */ point, /** @type {{ dbleClick: any; }} */ options) {
            if (!node) {
                MainController.UI.hidePopup("graphPopupDiv");
                Lineage_blend.clearAssociationNodes();
                return;
            }

            self.currentGraphNode = node;

            self.onGraphOrTreeNodeClick(node, options, { callee: "Graph" });

            if (options.dbleClick) {
                if (node.data.cluster) {
                    Lineage_classes.openCluster(self.currentGraphNode);
                } else {
                    Lineage_classes.addChildrenToGraph(self.currentGraphNode.data.source, [self.currentGraphNode.id]);
                }
            }
        },

        expand: function () {
            var dontClusterNodes = false;
            var depth = 1;
            if (graphContext.clickOptions.ctrlKey) {
                depth = 2;
                dontClusterNodes = true;
            }
            if (graphContext.clickOptions.ctrlKey && graphContext.clickOptions.altKey) depth = 3;

            Lineage_classes.addChildrenToGraph(self.currentGraphNode.data.source, [self.currentGraphNode.id], {
                depth: depth,
                dontClusterNodes: dontClusterNodes,
            });
        },
        drawParents: function () {
            Lineage_classes.addNodesAndParentsToGraph(self.currentGraphNode.data.source, [self.currentGraphNode.id]);
        },

        drawSimilars: function () {
            var descendantsAlso = graphContext.clickOptions.ctrlKey && graphContext.clickOptions.shiftKey;
            Lineage_classes.drawSimilarsNodes("label", self.currentGraphNode.data.source, self.currentGraphNode.id, descendantsAlso);
        },
        collapse: function () {
            Lineage_classes.collapseNode(self.currentGraphNode.id);
        },
        openCluster: function () {
            Lineage_classes.openCluster(self.currentGraphNode);
        },
        listClusterToClipboard: function () {
            Lineage_classes.listClusterToClipboard(self.currentGraphNode);
        },
        listClusterContent: function () {
            Lineage_classes.listClusterContent(self.currentGraphNode);
        },

        showNodeInfos: function () {
            SourceBrowser.showNodeInfos(self.currentGraphNode.data.source, self.currentGraphNode.id, "mainDialogDiv");
        },

        graphNodeNeighborhood: function (/** @type {any} */ filter) {
            Lineage_classes.graphNodeNeighborhood(self.currentGraphNode.data, filter);
        },

        graphNodeNeighborhoodUI: function () {
            var html = ' <span  class="popupMenuItem" onclick="Lineage_classes.graphActions.graphNodeNeighborhood(\'incoming\');">incoming</span>';
            html += ' <span  class="popupMenuItem" onclick="Lineage_classes.graphActions.graphNodeNeighborhood(\'outcoming\');">outcoming</span>';
            html += ' <span  class="popupMenuItem" onclick="Lineage_classes.graphActions.graphNodeNeighborhood(\'ranges\');">ranges</span>';

            $("#graphPopupDiv").html(html);
            setTimeout(function () {
                $("#graphPopupDiv").css("display", "flex");
            }, 100);
        },
        removeFromGraph: function () {
            visjsGraph.removeNodes("id", Lineage_classes.currentGraphNode.id, true);
        },

        removeOthersFromGraph: function () {
            if (!Lineage_classes.currentGraphNode.id) return;
            visjsGraph.removeOtherNodesFromGraph(Lineage_classes.currentGraphNode.id);
        },

        showObjectProperties: function () {
            var descendantsAlso = graphContext.clickOptions.ctrlKey && graphContext.clickOptions.shiftKey;
            Lineage_classes.drawObjectProperties(self.currentGraphNode.data.source, [self.currentGraphNode.id], descendantsAlso);
        },
        showRestrictions: function () {
            var descendantsAlso = graphContext.clickOptions.ctrlKey && graphContext.clickOptions.shiftKey;
            Lineage_classes.drawRestrictions(self.currentGraphNode.data.source, self.currentGraphNode.data.id, descendantsAlso);
        },

        deleteRestriction: function () {
            var edge = self.currentGraphEdge;
            if (edge.data.bNodeId) {
                //restriction
                if (confirm("delete selected relation ?")) {
                    Lineage_blend.deleteRestriction(edge.data.source, edge, function (err, result) {
                        if (err) return alert(err.responseText);
                        visjsGraph.data.edges.remove(edge.id);
                    });
                }
            }
        },
        createSubPropertyAndreplaceRelation: function () {
            var edge = self.currentGraphEdge;

            if (edge.data && edge.data.bNodeId) {
                //restriction
                var subPropertyLabel = prompt("enter label for subProperty of property " + edge.data.propertyLabel);
                if (!subPropertyLabel) return;
                Lineage_blend.createSubProperty(Lineage_classes.mainSource, edge.data.propertyId, subPropertyLabel, function (err, result) {
                    if (err) return alert(err);

                    var subPropertyId = result.uri;
                    var sourceVisjsNode = visjsGraph.data.nodes.get(edge.to);
                    var targetVisjsNode = visjsGraph.data.nodes.get(edge.from);
                    var sourceNode = { id: sourceVisjsNode.data.id, source: sourceVisjsNode.data.source };
                    var targetNode = { id: targetVisjsNode.data.id, source: targetVisjsNode.data.source };
                    Lineage_blend.createRelation(Lineage_classes.mainSource, subPropertyId, sourceNode, targetNode, true, true, {}, function (err, _result) {
                        if (err) alert(err);
                        Lineage_blend.deleteRestriction(Lineage_classes.mainSource, self.currentGraphEdge, function (err) {
                            if (err) alert(err);
                        });
                        MainController.UI.message("relation replaced", true);
                        visjsGraph.data.edges.remove(edge.id);
                    });
                });
            } else {
                //simple predicate
                var sourceVisjsNode = visjsGraph.data.nodes.get(edge.from);
                var targetVisjsNode = visjsGraph.data.nodes.get(edge.to);
            }
        },
        showIndividuals: function () {
            Lineage_classes.drawNamedIndividuals([self.currentGraphNode.id]);
        },
    };

    self.getSourceColor = function (/** @type {string | number} */ source, /** @type {string | string[]} */ nodeId, /** @type {string} */ palette) {
        if (!palette) palette = "paletteIntense";

        if (nodeId) {
            for (var graphUri in self.sourcesGraphUriMap) {
                if (nodeId.indexOf(graphUri) == 0) {
                    var color = self.getSourceColor(self.sourcesGraphUriMap[graphUri].name);
                    return color;
                }
            }
        }

        if (source && !sourceColors[source]) {
            sourceColors[source] = common[palette][Object.keys(sourceColors).length];
            self.registerSource(source);
        }
        return sourceColors[source];
    };
    self.getPropertyColor = function (/** @type {string | number} */ propertyName, /** @type {string} */ palette) {
        if (!palette) palette = "paletteIntense";
        if (!propertyColors[propertyName]) propertyColors[propertyName] = common[palette][Object.keys(propertyColors).length];
        return propertyColors[propertyName];
    };

    self.getNodeVisjAttrs = function (type, superClass, source) {
        var attrs = {
            shape: self.defaultShape,
            color: "blue",
        };
        var typeValue = type ? (type.value ? type.value : type) : null;
        var superClassValue = superClass ? (superClass.value ? superClass.value : superClass) : null;
        var sourceValue = source ? (source.value ? source.value : source) : null;

        if (typeValue && typeValue.indexOf("NamedIndividual") > -1) {
            attrs.shape = self.namedIndividualShape;
        }
        /* if(superClassValue){
 attrs.color=self.getSourceColor(superClassValue)
}else */
        if (sourceValue && sourceValue) {
            attrs.color = self.getSourceColor(sourceValue);
        }
        return attrs;
    };

    self.registerSource = function (/** @type {string | number | boolean} */ source) {
        if (expandedLevels[source]) return;
        var id = "Lineage_source_" + encodeURIComponent(source);
        if (document.getElementById(id) !== null) return;
        if (!self.soucesLevelMap[source]) self.soucesLevelMap[source] = {};
        expandedLevels[source] = [];
        var html =
            "<div  id='" +
            id +
            "' style='color: " +
            self.getSourceColor(source) +
            "'" +
            " class='Lineage_sourceLabelDiv' " +
            "onclick='Lineage_classes.setCurrentSource(\"" +
            encodeURIComponent(source) +
            "\")'>" +
            source +
            "</div>";

        $("#lineage_drawnSources").append(html);
        //  self.setCurrentSource(encodeURIComponent(source))
    };

    self.registerSourceImports = function (/** @type {string | number} */ sourceLabel) {
        self.registerSource(sourceLabel);
        var imports = Config.sources[sourceLabel].imports;
        if (!imports) imports = [];

        imports.forEach(function (/** @type {any} */ source) {
            self.registerSource(source);
        });
    };

    self.setCurrentSource = function (/** @type {string | number | boolean} */ sourceId) {
        $(".Lineage_sourceLabelDiv").removeClass("Lineage_selectedSourceDiv");
        $("#Lineage_source_" + sourceId).addClass("Lineage_selectedSourceDiv");
        Lineage_common.currentSource = encodeURIComponent(sourceId);
        if (!self.soucesLevelMap[sourceId].topDone) {
            self.soucesLevelMap[sourceId].topDone = 1;
            self.drawTopConcepts(sourceId);
        }
    };
    self.showHideCurrentSourceNodes = function (/** @type {any} */ show) {
        if (Lineage_common.currentSource == Lineage_classes.mainSource) return;
        /**
         * @type {boolean}
         */
        var visible;
        if (show)
            // force passage à visible
            visible = false;
        else visible = self.soucesLevelMap[Lineage_common.currentSource].visible;
        if (visible) self.soucesLevelMap[Lineage_common.currentSource].visible = false;
        else self.soucesLevelMap[Lineage_common.currentSource].visible = true;

        var allNodes = visjsGraph.data.nodes.get();
        /**
         * @type {{ id: any; hidden: any; }[]}
         */
        var newNodes = [];
        allNodes.forEach(function (node) {
            if (node && node.data && node.data.source == Lineage_common.currentSource)
                newNodes.push({
                    id: node.id,
                    hidden: visible,
                });
        });
        visjsGraph.data.nodes.update(newNodes);

        if (visible) $("#Lineage_source_" + Lineage_common.currentSource).addClass("lineage_hiddenSource");
        else $("#Lineage_source_" + Lineage_common.currentSource).removeClass("lineage_hiddenSource");

        if (!show)
            //
            Lineage_classes.setCurrentSource(Lineage_classes.mainSource);
    };

    self.showHideHelp = function () {
        var display = $("#lineage_actionDiv_Keyslegend").css("display");
        if (display == "none") display = "block";
        else display = "none";
        $("#lineage_actionDiv_Keyslegend").css("display", display);
    };

    return self;
})();
