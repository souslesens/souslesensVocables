import MainController from "../shared/mainController.js";
import Lineage_combine from "../tools/lineage/lineage_combine.js";
import SearchUtil from "../search/searchUtil.js";
import Sparql_generic from "../sparqlProxies/sparql_generic.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import TreeController from "../shared/treeController.js";
import Lineage_whiteboard from "../tools/lineage/lineage_whiteboard.js";
import common from "../shared/common.js";
import Export from "../shared/export.js";
import PromptedSelectWidget from "./promptedSelectWidget.js";
import NodeInfosAxioms from "../tools/axioms/nodeInfosAxioms.js";

var SearchWidget = (function () {
    var self = {};

    self.init = function () {
        /* if (Config.ontologiesVocabularyModels[Lineage_sources.activeSource] && Config.ontologiesVocabularyModels[Lineage_sources.activeSource].classesCount <= Config.ontologyModelMaxClasses) {
            var classes = [];
            for (var classId in Config.ontologiesVocabularyModels[Lineage_sources.activeSource].classes) {
                var classObj = Config.ontologiesVocabularyModels[Lineage_sources.activeSource].classes[classId];
                classes.push({
                    id: classObj.id,
                    label: classObj.label,
                });
            }
            common.fillSelectOptions("GenericTools_searchAllClassSelect", classes, true, "label", "id");
        }*/
    };

    /**
     *
     * show in jstree hierarchy of terms found in elastic search  from research UI or options if any
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
    self.searchTermInSources = function (options, callback) {
        if (!options) {
            options = {};
        }

        //  var classFilter = $("#GenericTools_searchAllClassSelect").val();

        $("#sourcesSelectionDialogdiv").dialog("close");

        var term;
        if (options.term) {
            term = options.term;
        } else {
            term = $("#searchWidget_searchTermInput").val();
        }
        if (!term) {
            /*  if (false  && !classFilter) {
                return alert("nothing to search");
            }*/
            term = "*";
        }

        if (term.indexOf("*") > -1) {
            $("#GenericTools_allExactMatchSearchCBX").removeProp("checked");
        } else {
            if (!$("#GenericTools_allExactMatchSearchCBX").prop("checked")) {
                term += "*";
            }
        }
        var selectedSources = [];
        if (options.selectedSources) {
            selectedSources = options.selectedSources;
        } else {
            if ($("#searchAll_sourcesTree").jstree().get_checked) {
                selectedSources = $("#searchAll_sourcesTree").jstree(true).get_checked();
            } else {
                selectedSources = [Lineage_sources.activeSource];
            }
        }

        var exactMatch;
        if (options.exactMatch) {
            exactMatch = options.exactMatch;
        } else {
            exactMatch = $("#GenericTools_allExactMatchSearchCBX").prop("checked");
        }

        var searchAllSources;
        if (options.inCurrentSource) {
            searchAllSources = !options.inCurrentSource;
        } else {
            searchAllSources = $("#GenericTools_searchInAllSources").prop("checked");
        }

        var searchAllLabels = true;

        var searchedSources = [];
        term = term.toLowerCase();

        function getUserSources(schemaType) {
            var allowedSources = [];
            for (var sourceLabel in Config.sources) {
                if (Config.currentProfile.allowedSourceSchemas.indexOf(Config.sources[sourceLabel].schemaType) > -1) {
                    if (!schemaType || Config.sources[sourceLabel].schemaType == schemaType) {
                        if (allowedSources.length > 0 && allowedSources.indexOf(sourceLabel) > -1) {
                            allowedSources.push(sourceLabel);
                        }
                    }
                }
            }
            return allowedSources;
        }

        if (options.searchedSources) {
            searchedSources = options.searchedSources;
        } else {
            var sourcesScope = $("#GenericTools_searchScope").val();
            if (sourcesScope == "currentSource") {
                if (!Lineage_sources.activeSource) {
                    return alert("select a source or search in all source");
                }

                searchedSources.push(Lineage_sources.activeSource);
            } else if (sourcesScope == "whiteboardSources") {
                if (Lineage_combine.currentSources.length > 0) {
                    searchedSources = Lineage_combine.currentSources;
                } else {
                    searchedSources = Object.keys(Lineage_sources.loadedSources);
                }
            } else if (sourcesScope == "all_OWLsources") {
                searchedSources = getUserSources("OWL");
            } else if (sourcesScope == "all_SKOSsources") {
                searchedSources = getUserSources("SKOS");
            } else if (sourcesScope == "all_IndividualsSources") {
                searchedSources = getUserSources("INDIVIDUALS");
            } else if (sourcesScope == "all_Sources") {
                searchedSources = getUserSources(null);
            }
        }

        var jstreeData = [];
        var uniqueIds = {};

        var mode = "fuzzyMatch";
        if (exactMatch) {
            mode = "exactMatch";
        }

        if (term.indexOf("*") > 1) {
            mode = "fuzzyMatch";
        }

        options.parentlabels = true;

        /*   if (classFilter) {
            options.classFilter = classFilter;
        }*/
        if (searchAllLabels) {
            options.skosLabels = 1;
        }

        SearchUtil.getSimilarLabelsInSources(null, searchedSources, [term], null, mode, options, function (_err, result) {
            if (_err) {
                if (callback) {
                    return callback(_err.responseText || _err);
                }
                return alert(_err.responseText || _err);
            }

            if (callback) {
                return callback(null, result);
            }
            if (Object.keys(result[0].matches).length == 0) {
                return $("#" + (options.jstreeDiv || self.currentTargetDiv)).html("<b>No matches found</b>");
            }

            self.searchResultToJstree(options.jstreeDiv || self.currentTargetDiv, result, options, function (err, _result) {
                if (err) {
                    return alert(err.responseText || err);
                }
            });
        });
    };

    self.searchResultToJstree = function (targetDiv, result, _options, _callback) {
        var existingNodes = {};
        var jstreeData = [];
        var parentIdsLabelsMap = result.parentIdsLabelsMap;

        result.forEach(function (item) {
            var matches = item.matches;
            for (var source in matches) {
                var items = matches[source];

                items.sort(function (a, b) {
                    if (a.label > b.label) {
                        return 1;
                    }
                    if (b.label > a.label) {
                        return -1;
                    }
                    return 0;
                });

                items.forEach(function (match) {
                    if (match.parents) {
                        var parentId = "";
                        var parents = match.parents; //.split("|")
                        var nodeId = "";
                        if (!parents.forEach) {
                            return;
                        }
                        parents.forEach(function (aClass, indexParent) {
                            if (aClass == "") {
                                return;
                            }

                            var label = parentIdsLabelsMap[aClass];
                            if (typeof label == "object") {
                                label = Sparql_common.getLabelFromURI(aClass);
                            }
                            if (indexParent > 0) {
                                parentId += parents[indexParent - 1];
                            } else {
                                parentId = "#";
                                label = "<span class='searched_conceptSource'>" + source + "</span>";
                            }

                            nodeId = parentId + aClass;

                            if (!existingNodes[nodeId]) {
                                existingNodes[nodeId] = 1;
                                jstreeData.push({
                                    id: nodeId,
                                    text: label,
                                    parent: parentId,
                                    type: "Class",
                                    data: {
                                        id: aClass,
                                        label: label,
                                        source: source,
                                    },
                                });
                            }
                        });
                    } else {
                        nodeId = source;
                    }
                    var leafId = nodeId + match.id;
                    if (match.id.indexOf("Branch") > -1) {
                        console.log("here");
                    }
                    var type = "Class";
                    if (match.type.indexOf("Class") == -1) {
                        type = "Individual";
                    }
                    if (!existingNodes[leafId]) {
                        existingNodes[leafId] = 1;
                        jstreeData.push({
                            id: leafId,
                            text: "<span class='searched_concept'>" + match.label + "</span>",
                            parent: nodeId,
                            type: type,
                            data: {
                                id: match.id,
                                label: match.label,
                                source: source,
                            },
                        });
                    }
                });
            }
        });

        if (targetDiv) {
            var jstreeOptions = {
                openAll: true,
                selectTreeNodeFn: function (event, obj) {
                    SearchWidget.currentTreeNode = obj.node;
                    return;
                    /*  if (_options.selectTreeNodeFn) {
                        return _options.selectTreeNodeFn(event, obj);
                    } else if (Config.userTools[MainController.currentTool].controller.selectTreeNodeFn) {
                        return Config.userTools[MainController.currentTool].controller.selectTreeNodeFn(event, obj);
                    }

                    self.editThesaurusConceptInfos(obj.node.data.source, obj.node);*/
                },
                contextMenu: function () {
                    var contextMenuFn = null;
                    if (_options.contextMenu) {
                        return _options.contextMenu;
                    } else if (_options.contextMenuFn) {
                        return _options.contextMenuFn();
                    } else if (Config.userTools[MainController.currentTool].controller.contextMenuFn) {
                        return Config.userTools[MainController.currentTool].controller.contextMenuFn;
                    } else {
                        return self.getJstreeConceptsContextMenu();
                    }
                },
            };

            JstreeWidget.loadJsTree(targetDiv, jstreeData, jstreeOptions);
            setTimeout(function () {
                UI.message("");
                $("#waitImg").css("display", "none");
                $("#" + targetDiv)
                    .jstree(true)
                    .open_all();
            }, 200);
        }
        if (_callback) {
            return _callback(null, jstreeData);
        }
    };

    self.searchInSourcesTree = function (event, sourcesTreeDiv) {
        if (event.keyCode != 13 && event.keyCode != 9) {
            return;
        }
        var value = $("#Lineage_classes_SearchSourceInput").val();
        if (!sourcesTreeDiv) {
            sourcesTreeDiv = "searchAll_sourcesTree";
        }
        $("#" + sourcesTreeDiv)
            .jstree(true)
            .search(value);
    };

    self.showTopConcepts = function (sourceLabel, options) {
        if (!sourceLabel) {
            sourceLabel = Lineage_sources.activeSource;
        }
        if (!options) {
            options = {withoutImports: false, selectGraph: true};
        }

        if (options.targetDiv) {
            self.currentTargetDiv = options.targetDiv;
        } else if (!self.currentTargetDiv) {
            self.currentTargetDiv = "actionDiv";
        }

        if ($("#" + self.currentTargetDiv).length == 0) {
            var html = "<div id='" + self.currentTargetDiv + "'></div>";
            $("#actionDiv").html(html);
        }

        Sparql_generic.getTopConcepts(sourceLabel, options, function (err, result) {
            if (err) {
                return UI.message(err);
            }

            if (result.length == 0) {
                // Collection.currentCollectionFilter = null;
                $("#waitImg").css("display", "none");

                var html = "<div id='" + self.currentTargetDiv + "'>no data found</div>";
                $("#" + self.currentTargetDiv).html(html);

                return UI.message("");
            }

            if (!options) {
                options = {};
            }
            if (err) {
                return UI.message(err);
            }

            var jsTreeOptions = options;
            if (!options.contextMenu) {
                jsTreeOptions.contextMenu = self.getJstreeConceptsContextMenu();
            }
            if (!options.selectTreeNodeFn) {
                jsTreeOptions.selectTreeNodeFn = Config.userTools[MainController.currentTool].controller.selectTreeNodeFn;
            }

            jsTreeOptions.source = sourceLabel;

            TreeController.drawOrUpdateTree(self.currentTargetDiv, result, "#", "topConcept", jsTreeOptions);

            $("#searchWidget_searchTermInput").val("");
            /* Collection.Sparql.getCollections(sourceLabel, options, function (err, result) {

})*/
        });
    };

    self.getJstreeConceptsContextMenu = function () {
        var items = {};
        if (!self.currentSource && Lineage_sources.activeSource) {
            self.currentSource = Lineage_sources.activeSource;
        }

        items.nodeInfos = {
            label: "Node infos",
            action: function (_e) {
                // pb avec source
                NodeInfosWidget.showNodeInfos(self.currentTreeNode.data.source, self.currentTreeNode, "mainDialogDiv");
            },
        };

        if (MainController.currentTool == "lineage" || MainController.currentTool == "KGmappings") {
            items.graphNode = {
                label: "graph Node",
                action: function (_e) {
                    // pb avec source
                    var selectedNodes = $("#LineageNodesJsTreeDiv").jstree().get_selected(true);
                    if (selectedNodes.length > 1) {
                        Lineage_whiteboard.drawNodesAndParents(selectedNodes, 0);
                    } else {
                        Lineage_whiteboard.drawNodesAndParents(self.currentTreeNode, 0);
                    }
                },
            };
            items.copyNodes = {
                label: "Copy Node(s)",
                action: function (e) {
                    common.copyTextToClipboard(JSON.stringify(self.currentTreeNode));
                },
            };
        }

        items.axioms = {
            label: "Node axioms",
            action: function (e) {
                $("#mainDialogDiv").dialog("option", "title", "Axioms of resource " + self.currentTreeNode.data.label);

                NodeInfosAxioms.init(self.currentTreeNode.data.source, self.currentTreeNode, "mainDialogDiv");
            },
        };


    if ( false && Lineage_sources.isSourceEditableForUser(Lineage_sources.activeSource)) {
            items.axioms = {
                label: "Import Class in source "+Lineage_sources.activeSource,
                action: function (e) {
             alert ("to implement")  // Sparql_OWL.copyUriTriplesFromSourceToSource(Lineage_sources.activeSource, self.currentTreeNode.data.source, self.currentTreeNode.data.id, function (err, result) {});

                },
            };
        }


        /*  items.descendantsAxioms = {
            label: "Descendants axioms",
            action: function (e) {
                $("#mainDialogDiv").dialog("open");
                $("#mainDialogDiv").dialog("option", "title", "Axioms of resource " + self.currentTreeNode.data.label);
                var descendants = JstreeWidget.getNodeDescendants("LineageNodesJsTreeDiv", self.currentTreeNode.id);
                descendants.push(self.currentTreeNode);
                NodeInfosAxioms.showResourceDescendantsAxioms(self.currentTreeNode.data.source, self.currentTreeNode, descendants, "mainDialogDiv");
            },
        };*/

        return items;
    };

    self.exportAllDescendants = function () {
        var parentId = self.currentTreeNode.data.id;
        var indexes = [self.currentTreeNode.data.source.toLowerCase()];
        Export.exportAllDescendants(parentId, {}, indexes);
    };

    self.openTreeNode = function (divId, sourceLabel, node, options) {
        if (!options) {
            options = {};
        }
        if (node.children && node.children.length > 0) {
            if (!options.reopen) {
                return;
            } else {
                JstreeWidget.deleteBranch(divId, node.id);
            }
        }
        var descendantsDepth = 1;
        if (options.depth) {
            descendantsDepth = options.depth;
        }
        // options.filterCollections = Collection.currentCollectionFilter;
        Sparql_generic.getNodeChildren(sourceLabel, null, node.data.id, descendantsDepth, options, function (err, result) {
            if (err) {
                return UI.message(err);
            }
            if (options.beforeDrawingFn) {
                options.beforeDrawingFn(result);
            }
            var jsTreeOptions = {
                source: sourceLabel,
                type: node.data.type,
            };
            if (options.optionalData) {
                jsTreeOptions.optionalData = options.optionalData;
            }
            TreeController.drawOrUpdateTree(divId, result, node.id, "child1", jsTreeOptions);

            $("#waitImg").css("display", "none");
        });
    };

    self.editThesaurusConceptInfos = function (sourceLabel, node, _callback) {
        NodeInfosWidget.showNodeInfos(sourceLabel, node, "graphDiv");
    };

    self.onSearchClass = function () {
        PromptedSelectWidget.prompt("owl:Class", "GenericTools_searchAllClassSelect", self.activeSource);
    };

    return self;
})();

export default SearchWidget;
window.SearchWidget = SearchWidget;
