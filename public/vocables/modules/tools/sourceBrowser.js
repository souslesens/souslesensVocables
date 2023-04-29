
import Clipboard from "../shared/clipboard.js";
import TreeController from "../shared/treeController.js";
import Sparql_generic from "../sparqlProxies/sparql_generic.js";
import common from "../shared/common.js";
import Lineage_classes from "./lineage/lineage_classes.js";
import Lineage_combine from "./lineage/lineage_combine.js";
import Export from "../shared/export.js";
import SearchUtil from "../search/searchUtil.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import Sparql_OWL from "../sparqlProxies/sparql_OWL.js";
import Sparql_proxy from "../sparqlProxies/sparql_proxy.js";
import ElasticSearchProxy from "../search/elasticSearchProxy.js";
import MainController from "../shared/mainController.js";

/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var SourceBrowser = (function () {
    var self = {};
    self.currentTargetDiv = "currentSourceTreeDiv";

    self.onLoaded = function () {
        $("#sourceDivControlPanelDiv").load("./snippets/searchAll.html", function () {
            $("#GenericTools_searchInAllSources").prop("checked", true);
            $("#GenericTools_searchSchemaType").val(Config.currentProfile.allowedSourceSchemas[0]);
        });
    };

    self.onSourceSelect = function (sourceLabel) {
        MainController.currentSource = sourceLabel;
        OwlSchema.currentSourceSchema = null;
        self.currentTargetDiv = "currentSourceTreeDiv";
        $("#GenericTools_searchSchemaType").val(Config.sources[sourceLabel].schemaType);
        $("#accordion").accordion("option", { active: 2 });
        self.showThesaurusTopConcepts(sourceLabel);
        $("#actionDivContolPanelDiv").html(
            "<input id='GenericTools_searchTermInput'> " +
                "<button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='SourceBrowser.searchTerm()' >Search</button>" +
                "<button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='SourceBrowser.showThesaurusTopConcepts(MainController.currentSource);" +
                '$("#GenericTools_searchTermInput").val("");\'>reset</button>' +
                "<br><input type='checkbox' checked='checked' id= 'GenericTools_exactMatchSearchCBX'>Exact Match" +
                "<script>" +
                " $('#GenericTools_searchTermInput').keypress(function (e) {" +
                "if (e.which == 13) { SourceBrowser.searchTerm(); }})" +
                "</script>"


        );


    };

    self.selectTreeNodeFn = function (event, obj) {
        var source;
        if (obj.node.data && obj.node.data.source) {
            source = obj.node.data && obj.node.data.source;
        } // coming from search all sources
        else {
            source = MainController.currentSource;
        } // coming from  specific tool current surce
        self.currentTreeNode = obj.node;
        if (obj.event.ctrlKey) {
            self.copyNode(self.currentTreeNode);
        }

        self.editThesaurusConceptInfos(source, obj.node);
    };

    self.copyNode = function (event, node) {
        if (!node) {
            node = self.currentTreeNode;
        }
        if (!node) {
            node = self.currentGraphNode;
        }
        if (!node) {
            return;
        }

        self.currentCopiedNode = node;
        Clipboard.copy(
            {
                type: "node",
                id: node.data.id,
                label: node.data.label,
                source: node.data.source,
                data: node.data,
            },
            self.currentTreeNode.id + "_anchor",
            event
        );
    };

    self.showThesaurusTopConcepts = function (sourceLabel, options) {
        if (!sourceLabel) {
            sourceLabel = Lineage_sources.activeSource;
        }
        if (!options) {
            options = { withoutImports: false, selectGraph: true };
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

        options.filterCollections = Collection.currentCollectionFilter;
        Sparql_generic.getTopConcepts(sourceLabel, options, function (err, result) {
            if (err) {
                return MainController.UI.message(err);
            }

            if (result.length == 0) {
                Collection.currentCollectionFilter = null;
                $("#waitImg").css("display", "none");

                var html = "<div id='" + self.currentTargetDiv + "'>no data found</div>";
                $("#" + self.currentTargetDiv).html(html);

                return MainController.UI.message("");
            }

            if (!options) {
                options = {};
            }
            if (err) {
                return MainController.UI.message(err);
            }

            var jsTreeOptions = options;
            if (!options.contextMenu) {
                jsTreeOptions.contextMenu = self.getJstreeConceptsContextMenu();
            }
            if (!options.selectTreeNodeFn) {
                jsTreeOptions.selectTreeNodeFn = Config.tools[MainController.currentTool].controller.selectTreeNodeFn;
            }

            jsTreeOptions.source = sourceLabel;

            TreeController.drawOrUpdateTree(self.currentTargetDiv, result, "#", "topConcept", jsTreeOptions);

            $("#GenericTools_searchAllSourcesTermInput").val("");
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
                        Lineage_classes.drawNodesAndParents(selectedNodes, 0);
                    } else {
                        Lineage_classes.drawNodesAndParents(self.currentTreeNode, 0);
                    }
                },
            };

            items.graphNamedIndividuals = {
                label: "LinkedData",
                action: function () {
                    Lineage_linkedData.showLinkedDataPanel(self.currentTreeNode);
                    // Lineage_classes.drawNamedIndividuals(self.currentTreeNode.data.id);
                },
            };

            items.relations = {
                label: "Relations...",
                action: function (e) {
                    Lineage_relations.showDrawRelationsDialog("Tree");
                },
            };

            items.copyNode = {
                label: "Copy Node",
                action: function (e) {
                    // pb avec source
                    SourceBrowser.copyNode(e);

                    Lineage_common.copyNodeToClipboard(self.currentTreeNode);
                },
            };

            if (self.currentSource && Config.sources[self.currentSource].editable) {
                items.pasteNode = {
                    label: "paste Node",
                    action: function (_e) {
                        if (self.currentCopiedNode) {
                            return Lineage_combine.showMergeNodesDialog(self.currentCopiedNode);
                        }

                        common.pasteTextFromClipboard(function (text) {
                            if (!text) {
                                return MainController.UI.message("no node copied");
                            }
                            try {
                                var node = JSON.parse(text);
                                Lineage_combine.showMergeNodesDialog(node, self.currentTreeNode);
                            } catch (e) {
                                console.log("wrong clipboard content");
                            }
                            return;
                        });
                    },
                };
            }
        }

        items.exportAllDescendants = {
            label: "Export all descendants",
            action: function (_e) {
                // pb avec source
                SourceBrowser.exportAllDescendants();
            },
        };

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
        options.filterCollections = Collection.currentCollectionFilter;
        Sparql_generic.getNodeChildren(sourceLabel, null, node.data.id, descendantsDepth, options, function (err, result) {
            if (err) {
                return MainController.UI.message(err);
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

        /*  Sparql_generic.getNodeInfos(sourceLabel, node.data.id, null, function (err, result) {
if (err) {
return MainController.UI.message(err);
}
//    SkosConceptEditor.editConcept("graphDiv",result)
SourceEditor.showNodeInfos("graphDiv", "en", node.data.id, result)


})*/
    };

    self.onNodeDetailsLangChange = function (property, lang) {
        try {
            $(".detailsLangDiv_" + property).css("display", "none");
            if (!lang) {
                lang = $("#detailsLangSelect_" + property).val();
            }
            if ($("#detailsLangDiv_" + property + "_" + lang).html()) {
                $("#detailsLangDiv_" + property + "_" + lang).css("display", "block");
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log(err);
        }
    };

    self.searchTerm = function (sourceLabel, term, rootId, callback) {
        if (!term) {
            term = $("#GenericTools_searchTermInput").val();
        }

        var exactMatch = $("#GenericTools_exactMatchSearchCBX").prop("checked");
        if (!term || term == "") {
            return alert(" enter a word ");
        }
        if (term.indexOf("*") > -1) {
            $("#GenericTools_exactMatchSearchCBX").removeProp("checked");
        }
        if (!term || term == "") {
            return;
        }
        var options = {
            term: term,
            rootId: rootId,
            exactMatch: exactMatch,
            limit: Config.searchLimit,
        };
        SourceBrowser.getFilteredNodesJstreeData(sourceLabel, options, function (err, jstreeData) {
            if (callback) {
                return err, jstreeData;
            }
            MainController.UI.message("");
            if (jstreeData.length == 0) {
                $("#waitImg").css("display", "none");
                return $("#" + self.currentTargetDiv).html("No data found");
            }
            JstreeWidget.loadJsTree(self.currentTargetDiv, jstreeData, {
                openAll: true,
                selectTreeNodeFn: function (event, obj) {
                    if (Config.tools[MainController.currentTool].controller.selectTreeNodeFn) {
                        return Config.tools[MainController.currentTool].controller.selectTreeNodeFn(event, obj);
                    }
                    self.editThesaurusConceptInfos(MainController.currentSource);
                },
                contextMenu: self.getJstreeConceptsContextMenu(),
            });
        });
    };

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
    self.searchAllSourcesTerm = function (options) {
        if (!options) {
            options = {};
        }

        var classFilter = $("#GenericTools_searchAllClassSelect").val();

        $("#sourcesSelectionDialogdiv").dialog("close");

        var term;
        if (options.term) {
            term = options.term;
        } else {
            term = $("#GenericTools_searchAllSourcesTermInput").val();
        }
        if (!term) {
            if (!classFilter) {
                return alert("nothing to search");
            }
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
                selectedSources = [Lineage_sources.currentSource];
            }
        }

        var exactMatch;
        if (options.exactMatch) {
            exactMatch = options.exactMatch;
        } else {
            exactMatch = $("#GenericTools_allExactMatchSearchCBX").prop("checked");
        }

        var searchAllSources;
        if (options.searchAllSources) {
            searchAllSources = options.searchAllSources;
        } else {
            searchAllSources = $("#GenericTools_searchInAllSources").prop("checked");
        }

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
                    /*   var mainSource = Lineage_sources.activeSource;
searchedSources.push(mainSource);
var importedSources = Config.sources[mainSource].imports;
searchedSources = searchedSources.concat(importedSources);*/
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
        // PROBLEM
        // eslint-disable-next-line no-constant-condition

        if (classFilter) {
            options.classFilter = classFilter;
        }

        if (true || schemaType == "OWL") {
            SearchUtil.getSimilarLabelsInSources(null, searchedSources, [term], null, mode, options, function (_err, result) {
                if (_err) {
                    return alert(_err.responseText);
                }
                if (Object.keys(result[0].matches).length == 0) return $("#" + (options.jstreeDiv || self.currentTargetDiv)).html("<b>No matches found</b>");

                self.searchResultToJstree(options.jstreeDiv || self.currentTargetDiv, result, options, function (err, _result) {
                    if (err) {
                        return alert(err.responseText);
                    }
                });
            });
        } else if (schemaType == "SKOS") {
            async.eachSeries(
                searchedSources,
                function (sourceLabel, callbackEach) {
                    // setTimeout(function () {
                    MainController.UI.message("searching in " + sourceLabel);
                    // }, 100)
                    if (!term) {
                        term = $("#GenericTools_searchTermInput").val();
                    }

                    if (!term || term == "") {
                        return;
                    }
                    var options2 = {
                        term: term,
                        rootId: sourceLabel,
                        exactMatch: exactMatch,
                        limit: Config.searchLimit,
                    };
                    var type = Config.sources[sourceLabel].schemaType;

                    SourceBrowser.getFilteredNodesJstreeData(sourceLabel, options2, function (err, result) {
                        if (err) {
                            MainController.UI.message(err.responseText);
                            var text = "<span class='searched_conceptSource'>" + sourceLabel + " Error !!!" + "</span>";
                            jstreeData.push({
                                id: sourceLabel,
                                text: text,
                                parent: "#",
                                data: { source: sourceLabel, id: sourceLabel, label: text },
                            });
                        } else {
                            text = "<span class='searched_conceptSource'>" + sourceLabel + "</span>";

                            jstreeData.push({
                                id: sourceLabel,
                                text: text,
                                parent: "#",
                                type: type,
                                data: { source: sourceLabel, id: sourceLabel, label: text },
                            });
                            result.forEach(function (item) {
                                if (!uniqueIds[item.id]) {
                                    uniqueIds[item.id] = 1;
                                    jstreeData.push(item);
                                }
                            });
                        }
                        callbackEach();
                    });
                },
                function (_err) {
                    $("#accordion").accordion("option", { active: 2 });
                    var html = "<div id='" + self.currentTargetDiv + "'></div>";

                    if ($("#" + self.currentTargetDiv).length == 0) {
                        html = "<div id='" + self.currentTargetDiv + "'></div>";
                        $("#actionDiv").html(html);
                    }
                    $("#" + self.currentTargetDiv).html(html);

                    MainController.UI.message("Search Done");

                    var jstreeOptions = {
                        openAll: true,
                        selectTreeNodeFn: function (event, obj) {
                            SourceBrowser.currentTreeNode = obj.node;

                            if (Config.tools[MainController.currentTool].controller.selectTreeNodeFn) {
                                return Config.tools[MainController.currentTool].controller.selectTreeNodeFn(event, obj);
                            }

                            self.editThesaurusConceptInfos(obj.node.data.source, obj.node);
                        },
                        contextMenu: function () {
                            if (Config.tools[MainController.currentTool].controller.contextMenuFn) {
                                return Config.tools[MainController.currentTool].controller.contextMenuFn();
                            } else {
                                return self.getJstreeConceptsContextMenu();
                            }
                        },
                    };

                    var jstreeDiv = options.jstreeDiv || self.currentTargetDiv;
                    JstreeWidget.loadJsTree(jstreeDiv, jstreeData, jstreeOptions);
                    setTimeout(function () {
                        MainController.UI.updateActionDivLabel("Multi source search :" + term);
                        MainController.UI.message("");
                        $("#waitImg").css("display", "none");
                    }, 200);
                }
            );
        }
    };

    self.getFilteredNodesJstreeData = function (sourceLabel, options, callback) {
        self.currentFoundIds = [];
        if (!options.term) {
            options.term = $("#GenericTools_searchTermInput").val();
        }

        if (!options.rootId) {
            options.rootId = "#";
        }
        if (!sourceLabel) {
            sourceLabel = MainController.currentSource;
        }
        var depth = Config.searchDepth;
        Sparql_generic.getNodeParents(sourceLabel, options.term, options.ids, depth, options, function (err, result) {
            if (err) {
                MainController.UI.message(err);
                return callback(err);
            }

            var existingNodes = {};
            var jstreeData = [];

            if (result.length == 0) {
                if (callback) {
                    return callback(null, []);
                } else {
                    $("#waitImg").css("display", "none");
                }
                return $("#" + self.currentTargetDiv).html("No data found");
            }

            result.forEach(function (item, _index) {
                for (var i = 20; i > 0; i--) {
                    if (item["broader" + i]) {
                        //   item["broader" + i].jstreeId = sourceLabel+"_"+item["broader" + i].value + "_" + index
                        item["broader" + i].jstreeId = sourceLabel + "_" + item["broader" + i].value;
                    }
                }
                item.subject.jstreeId = sourceLabel + "_" + item.subject.value;
            });

            var type = Config.sources[sourceLabel].schemaType;
            if (type == "SKOS") {
                type = "subject";
            } else if (type == "OWL") {
                type = "class";
            }
            result.forEach(function (item, _index) {
                for (var i = 20; i > 0; i--) {
                    if (item["broader" + i]) {
                        var id = item["broader" + i].value;
                        //if (false && id.indexOf("nodeID://") > -1)
                        //skip anonym nodes
                        //  return;
                        var jstreeId = item["broader" + i].jstreeId;
                        if (!existingNodes[jstreeId]) {
                            existingNodes[jstreeId] = 1;
                            var label = item["broader" + i + "Label"].value;
                            var parentId = options.rootId;
                            if (item["broader" + (i + 1)]) {
                                parentId = item["broader" + (i + 1)].jstreeId;
                            }

                            jstreeData.push({
                                id: jstreeId,
                                text: label,
                                parent: parentId,
                                type: type,
                                data: {
                                    type: "http://www.w3.org/2002/07/owl#Class",
                                    source: sourceLabel,
                                    id: id,
                                    label: item["broader" + i + "Label"].value,
                                },
                            });
                        }
                    }
                }

                jstreeId = item.subject.jstreeId;
                if (!existingNodes[jstreeId]) {
                    existingNodes[jstreeId] = 1;
                    var text = "<span class='searched_concept'>" + item.subjectLabel.value + "</span>";
                    id = item.subject.value;
                    self.currentFoundIds.push(id);

                    var broader1 = item["broader1"];
                    var parent;
                    if (!broader1) {
                        parent = options.rootId;
                    } else {
                        parent = item["broader1"].jstreeId;
                    }

                    jstreeData.push({
                        id: jstreeId,
                        text: text,
                        parent: parent,
                        type: type,
                        data: {
                            type: "http://www.w3.org/2002/07/owl#Class",
                            source: sourceLabel,
                            id: id,
                            label: item.subjectLabel.value,
                        },
                    });
                }
            });
            //console.log(JSON.stringify(jstreeData))
            return callback(null, jstreeData);
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
                    /*   if(match.label.toLowerCase().indexOf(term)<0 )
return*/

                    if (match.parents) {
                        //} && match.parents.split) {

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
                    if (!existingNodes[leafId]) {
                        existingNodes[leafId] = 1;
                        jstreeData.push({
                            id: leafId,
                            text: "<span class='searched_concept'>" + match.label + "</span>",
                            parent: nodeId,
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
                    SourceBrowser.currentTreeNode = obj.node;

                    if (_options.selectTreeNodeFn) {
                        return _options.selectTreeNodeFn(event, obj);
                    } else if (Config.tools[MainController.currentTool].controller.selectTreeNodeFn) {
                        return Config.tools[MainController.currentTool].controller.selectTreeNodeFn(event, obj);
                    }

                    self.editThesaurusConceptInfos(obj.node.data.source, obj.node);
                },
                contextMenu: function () {
                    var contextMenuFn = null;
                    if (_options.contextMenu) {
                        return _options.contextMenu;
                    } else if (_options.contextMenuFn) {
                        return _options.contextMenuFn;
                    } else if (Config.tools[MainController.currentTool].controller.contextMenuFn) {
                        return Config.tools[MainController.currentTool].controller.contextMenuFn;
                    } else {
                        return self.getJstreeConceptsContextMenu();
                    }
                },
            };

            JstreeWidget.loadJsTree(targetDiv, jstreeData, jstreeOptions);
            setTimeout(function () {
                //  MainController.UI.updateActionDivLabel("Multi source search :" + term)
                MainController.UI.message("");
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

    self.exportSearchResult = function () {
        if (!self.currentFoundIds || self.currentFoundIds.length == 0) {
            return;
        }
        Sparql_common.setFilter("id", self.currentFoundIds);
    };




    self.showWikiPage = function (sourceLabel) {
        var wikiUrl = Config.wiki.url + "Source " + sourceLabel;
        window.open(wikiUrl, "_slsvWiki");
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

    self.showSearchableSourcesTreeDialog = function (types, options, validateFn, okButtonValidateFn) {
        if (!options) {
            options = {};
        }
        if (!self.searchableSourcesTreeIsInitialized) {
            function doDialog(sources) {
                var jstreeOptions = {
                    selectTreeNodeFn: validateFn,
                    searchPlugin: {
                        case_insensitive: true,
                        fuzzy: false,
                        show_only_matches: true,
                    },
                };
                if (options.withCheckboxes) {
                    jstreeOptions.withCheckboxes = true;
                    //   jstreeOptions.onCheckNodeFn=options.onCheckNodeFn
                }
                self.searchableSourcesTreeIsInitialized = false;
                if (!types) {
                    types = ["OWL"];
                }
                var sourcesSelectionDialogdiv = "sourcesSelectionDialogdiv";
                if (options.sourcesSelectionDialogdiv) {
                    sourcesSelectionDialogdiv = options.sourcesSelectionDialogdiv;
                }

                $("#" + sourcesSelectionDialogdiv).on("dialogopen", function (event, ui) {
                    $("#Lineage_classes_SearchSourceInput").val("");
                    MainController.UI.showSources("searchAll_sourcesTree", false, sources, types, jstreeOptions);
                });

                $("#" + sourcesSelectionDialogdiv).dialog("open");
                $("#Lineage_classes_SearchSourceInput").focus();
                if (okButtonValidateFn) {
                    $("#searchAllValidateButton").bind("click", okButtonValidateFn);
                } else {
                    $("#searchAllValidateButton").css("display", "none");
                }

                $("#Lineage_classes_SearchSourceInput").bind("keydown", null, SourceBrowser.searchInSourcesTree);
            }

            if (options.includeSourcesWithoutSearchIndex) {
                setTimeout(function () {
                    doDialog(null);
                }, 500);
            } else {
                SearchUtil.initSourcesIndexesList(null, function (err, sources) {
                    if (err) {
                        return MainController.UI.message(err);
                    }
                    doDialog(sources);
                });
            }
        } else {
            $("#" + sourcesSelectionDialogdiv).dialog("open");
            $("#Lineage_classes_SearchSourceInput").focus();
            /*  if ($("#searchAll_sourcesTree").jstree())
      $("#searchAll_sourcesTree").jstree().uncheck_all();*/
        }
    };


    return self;
})();

export default SourceBrowser;
window.SourceBrowser = SourceBrowser;
window.SourceBrowser = SourceBrowser;
