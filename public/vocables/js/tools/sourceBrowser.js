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

            /*  "<div id='SourceBrowser_collectionDiv'>" +
    "Collection<select id='SourceBrowser_collectionSelect' onchange='Collection.filterBrowserCollection()'></select>" +
    "</div>"*/
        );

        if (Config.enableCollections) {
            setTimeout(function () {
                Collection.initBrowserCollectionSelect();
            }, 200);
        }
    };

    self.selectTreeNodeFn = function (event, obj) {
        var source;
        if (obj.node.data && obj.node.data.source) source = obj.node.data && obj.node.data.source;
        // coming from search all sources
        else source = MainController.currentSource; // coming from  specific tool current surce
        self.currentTreeNode = obj.node;
        if (obj.event.ctrlKey) self.copyNode(self.currentTreeNode);

        self.editThesaurusConceptInfos(source, obj.node);
    };

    self.copyNode = function (event, node) {
        if (!node) node = self.currentTreeNode;
        if (!node) node = self.currentGraphNode;
        if (!node) return;
        // Lineage_blend.addNodeToAssociationNode(node)
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
        if (!options) options = {};

        if (options.targetDiv) self.currentTargetDiv = options.targetDiv;
        else if (!self.currentTargetDiv) self.currentTargetDiv = "actionDiv";

        if ($("#" + self.currentTargetDiv).length == 0) {
            var html = "<div id='" + self.currentTargetDiv + "'></div>";
            $("#actionDiv").html(html);
        }

        options.filterCollections = Collection.currentCollectionFilter;
        Sparql_generic.getTopConcepts(sourceLabel, options, function (err, result) {
            if (err) return MainController.UI.message(err);

            if (result.length == 0) {
                Collection.currentCollectionFilter = null;
                $("#waitImg").css("display", "none");

                var html = "<div id='" + self.currentTargetDiv + "'>no data found</div>";
                $("#" + self.currentTargetDiv).html(html);

                return MainController.UI.message("");
            }

            if (!options) options = {};
            if (err) {
                return MainController.UI.message(err);
            }

            /*  var html = "<div id='"+self.currentTargetDiv+"'></div>"
      $("#actionDiv").html(html);*/

            var jsTreeOptions = options;
            if (!options.contextMenu) jsTreeOptions.contextMenu = self.getJstreeConceptsContextMenu();
            if (!options.selectTreeNodeFn) jsTreeOptions.selectTreeNodeFn = Config.tools[MainController.currentTool].controller.selectTreeNodeFn;

            jsTreeOptions.source = sourceLabel;

            TreeController.drawOrUpdateTree(self.currentTargetDiv, result, "#", "topConcept", jsTreeOptions);

            $("#GenericTools_searchAllSourcesTermInput").val("");
            /* Collection.Sparql.getCollections(sourceLabel, options, function (err, result) {

       })*/
        });
    };

    self.getJstreeConceptsContextMenu = function () {
        // return {}
        var items = {};

        items.nodeInfos = {
            label: "Node infos",
            action: function (_e) {
                // pb avec source
                SourceBrowser.showNodeInfos(self.currentTreeNode.data.source, self.currentTreeNode.data.id, "mainDialogDiv");
            },
        };

        if (MainController.currentTool == "lineage" || MainController.currentTool == "KGmappings") {
            items.graphNode = {
                label: "graph Node",
                action: function (_e) {
                    // pb avec source

                    Lineage_classes.drawNodeAndParents(self.currentTreeNode.data);
                },
            };
            items.copyNodeToClipboard = {
                label: "copy toClipboard",
                action: function (_e) {
                    // pb avec source

                    Lineage_common.copyNodeToClipboard(self.currentTreeNode.data);
                },
            };
            items.graphNamedIndividuals = {
                label: "graph namedIndividuals ",
                action: function () {
                    Lineage_classes.drawNamedIndividuals(self.currentTreeNode.data.id);
                },
            };

            items.graphNodeNeighborhood = {
                label: "graph node neighborhood ",
                action: false,
                submenu: {
                    graphNodeNeighborhood_incoming: {
                        label: "incoming",
                        action: function () {
                            Lineage_classes.graphNodeNeighborhood(self.currentTreeNode.data, "incoming");
                        },
                    },
                    graphNodeNeighborhood_outcoming: {
                        label: "outcoming",
                        action: function () {
                            Lineage_classes.graphNodeNeighborhood(self.currentTreeNode.data, "outcoming");
                        },
                    },
                    graphNodeNeighborhood_ranges: {
                        label: "ranges",
                        action: function () {
                            Lineage_classes.graphNodeNeighborhood(self.currentTreeNode.data, "ranges");
                        },
                    },
                },
            };
            if (Lineage_common.currentSource && Config.sources[Lineage_common.currentSource].editable) {
                items.pasteNodeFromClipboard = {
                    label: "paste from Clipboard",
                    action: function (_e) {
                        // pb avec source

                        Lineage_common.pasteNodeFromClipboard(self.currentTreeNode);
                    },
                };
                items.editNode = {
                    label: "Edit node",
                    action: function (_obj, _sss, _cc) {
                        SourceEditor.editNode("DialogDiv", self.currentSource, self.currentTreeNode.data.id, "OWL", false);
                    },
                };
                items.deleteClass = {
                    label: "delete Class",
                    action: function (_e) {
                        // pb avec source

                        Lineage_common.deleteNode(self.currentTreeNode, self.currentTargetDiv);
                    },
                };
            }

            if (MainController.currentSource && Config.sources[MainController.currentSource].protegeFilePath) {
                items.uploadOntologyFromOwlFile = {
                    label: "upload Ontology FromOwl File",
                    action: function (_e) {
                        SourceBrowser.uploadOntologyFromOwlFile();
                    },
                };
            }
        }
        items.copyNode = {
            label: "Copy Node",
            action: function (e) {
                // pb avec source
                SourceBrowser.copyNode(e);
            },
        };
        /*    items.toDataTable = {
            label: "export to Table",
            action: function (e) {// pb avec source
                Export.exportTeeToDataTable()

            }

        }*/

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
        if (!options) options = {};
        if (node.children && node.children.length > 0)
            if (!options.reopen) return;
            else {
                common.jstree.deleteBranch(divId, node.id);
            }
        var descendantsDepth = 1;
        if (options.depth) descendantsDepth = options.depth;
        options.filterCollections = Collection.currentCollectionFilter;
        Sparql_generic.getNodeChildren(sourceLabel, null, node.data.id, descendantsDepth, options, function (err, result) {
            if (err) {
                return MainController.UI.message(err);
            }
            if (options.beforeDrawingFn) options.beforeDrawingFn(result);
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
        SourceBrowser.showNodeInfos(sourceLabel, node.data.id, "graphDiv");

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
            if (!lang) lang = $("#detailsLangSelect_" + property).val();
            if ($("#detailsLangDiv_" + property + "_" + lang).html()) $("#detailsLangDiv_" + property + "_" + lang).css("display", "block");
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log(err);
        }
    };

    self.searchTerm = function (sourceLabel, term, rootId, callback) {
        if (!term) term = $("#GenericTools_searchTermInput").val();

        var exactMatch = $("#GenericTools_exactMatchSearchCBX").prop("checked");
        if (!term || term == "") return alert(" enter a word ");
        if (term.indexOf("*") > -1) $("#GenericTools_exactMatchSearchCBX").removeProp("checked");
        if (!term || term == "") return;
        var options = {
            term: term,
            rootId: rootId,
            exactMatch: exactMatch,
            limit: Config.searchLimit,
        };
        SourceBrowser.getFilteredNodesJstreeData(sourceLabel, options, function (err, jstreeData) {
            if (callback) return err, jstreeData;
            MainController.UI.message("");
            if (jstreeData.length == 0) {
                $("#waitImg").css("display", "none");
                return $("#" + self.currentTargetDiv).html("No data found");
            }
            common.jstree.loadJsTree(self.currentTargetDiv, jstreeData, {
                openAll: true,
                selectTreeNodeFn: function (event, obj) {
                    if (Config.tools[MainController.currentTool].controller.selectTreeNodeFn) return Config.tools[MainController.currentTool].controller.selectTreeNodeFn(event, obj);
                    self.editThesaurusConceptInfos(MainController.currentSource);
                },
                contextMenu: self.getJstreeConceptsContextMenu(),
            });
        });
    };

    self.searchAllSourcesTerm = function (options) {
        if (!options) {
            options = {};
        }

        $("#searchAllDialogDiv").dialog("close");

        var term = $("#GenericTools_searchAllSourcesTermInput").val();
        var selectedSources = [];
        if ($("#searchAll_sourcesTree").jstree(true)) {
            selectedSources = $("#searchAll_sourcesTree").jstree(true).get_checked();
        }

        if (!term || term == "") return alert(" enter a word ");
        if (term.indexOf("*") > -1) $("#GenericTools_allExactMatchSearchCBX").removeProp("checked");
        term = term.toLowerCase();
        var exactMatch = $("#GenericTools_allExactMatchSearchCBX").prop("checked");
        var searchAllSources = $("#GenericTools_searchInAllSources").prop("checked");

        var searchedSources = [];

        var schemaType = $("#GenericTools_searchSchemaType").val();

        if (searchAllSources || selectedSources.length > 0) {
            for (var sourceLabel in Config.sources) {
                if (
                    (Config.currentProfile.allowedSources != "ALL" && Config.currentProfile.allowedSources.indexOf(sourceLabel) < 0) ||
                    Config.currentProfile.forbiddenSources.indexOf(sourceLabel) > -1
                );
                else {
                    if (Config.currentProfile.allowedSourceSchemas.indexOf(Config.sources[sourceLabel].schemaType) > -1) {
                        if (!Config.sources[sourceLabel].schemaType || Config.sources[sourceLabel].schemaType == schemaType)
                            if (selectedSources.length > 0 && selectedSources.indexOf(sourceLabel) > -1) searchedSources.push(sourceLabel);
                        /*     else
             searchedSources.push(sourceLabel)*/
                    }
                }
            }
        } else {
            if (!Lineage_common.currentSource && !MainController.currentSource) return alert("select a source or search in all source");
            searchedSources.push(Lineage_common.currentSource || MainController.currentSource);
        }
        var jstreeData = [];
        var uniqueIds = {};

        var mode = "fuzzyMatch";
        if (exactMatch) mode = "exactMatch";

        options.parentlabels = true;
        // PROBLEM
        // eslint-disable-next-line no-constant-condition
        if (true || schemaType == "OWL") {
            SearchUtil.getSimilarLabelsInSources(null, searchedSources, [term], null, mode, options, function (_err, result) {
                self.searchResultToJstree(self.currentTargetDiv, result, options, function (err, _result) {
                    if (err) return alert(err);
                });
            });
        } else if (schemaType == "SKOS") {
            async.eachSeries(
                searchedSources,
                function (sourceLabel, callbackEach) {
                    // setTimeout(function () {
                    MainController.UI.message("searching in " + sourceLabel);
                    // }, 100)
                    if (!term) term = $("#GenericTools_searchTermInput").val();

                    if (!term || term == "") return;
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

                            if (Config.tools[MainController.currentTool].controller.selectTreeNodeFn) return Config.tools[MainController.currentTool].controller.selectTreeNodeFn(event, obj);

                            self.editThesaurusConceptInfos(obj.node.data.source, obj.node);
                        },
                        contextMenu: function () {
                            if (Config.tools[MainController.currentTool].controller.contextMenuFn) return Config.tools[MainController.currentTool].controller.contextMenuFn();
                            else return self.getJstreeConceptsContextMenu();
                        },
                    };

                    common.jstree.loadJsTree(self.currentTargetDiv, jstreeData, jstreeOptions);
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
        if (!options.term) options.term = $("#GenericTools_searchTermInput").val();

        if (!options.rootId) options.rootId = "#";
        if (!sourceLabel) sourceLabel = MainController.currentSource;
        var depth = Config.searchDepth;
        Sparql_generic.getNodeParents(sourceLabel, options.term, options.ids, depth, options, function (err, result) {
            if (err) {
                MainController.UI.message(err);
                return callback(err);
            }

            var existingNodes = {};
            var jstreeData = [];

            if (result.length == 0) {
                if (callback) return callback(null, []);
                else $("#waitImg").css("display", "none");
                return $("#" + self.currentTargetDiv).html("No data found");
            }

            result.forEach(function (item, _index) {
                for (var i = 20; i > 0; i--) {
                    if (item["broader" + i]) {
                        //   item["broader" + i].jstreeId = sourceLabel+"_"+item["broader" + i].value + "_" + index
                        item["broader" + i].jstreeId = sourceLabel + "_" + item["broader" + i].value;
                    }
                }
                item.concept.jstreeId = sourceLabel + "_" + item.concept.value;
            });

            var type = Config.sources[sourceLabel].schemaType;
            if (type == "SKOS") type = "concept";
            else if (type == "OWL") type = "class";
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
                            if (item["broader" + (i + 1)]) parentId = item["broader" + (i + 1)].jstreeId;

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

                jstreeId = item.concept.jstreeId;
                if (!existingNodes[jstreeId]) {
                    existingNodes[jstreeId] = 1;
                    var text = "<span class='searched_concept'>" + item.conceptLabel.value + "</span>";
                    id = item.concept.value;
                    self.currentFoundIds.push(id);

                    var broader1 = item["broader1"];
                    var parent;
                    if (!broader1) parent = options.rootId;
                    else parent = item["broader1"].jstreeId;

                    jstreeData.push({
                        id: jstreeId,
                        text: text,
                        parent: parent,
                        type: type,
                        data: {
                            type: "http://www.w3.org/2002/07/owl#Class",
                            source: sourceLabel,
                            id: id,
                            label: item.conceptLabel.value,
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
                    if (a.label > b.label) return 1;
                    if (b.label > a.label) return -1;
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
                        if (!parents.forEach) return;
                        parents.forEach(function (aClass, indexParent) {
                            if (aClass == "") return;

                            var label = parentIdsLabelsMap[aClass];
                            if (typeof label == "object") label = Sparql_common.getLabelFromURI(aClass);
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
        if(_callback){
            return _callback(null,jstreeData)
        }

        var jstreeOptions = {
            openAll: true,
            selectTreeNodeFn: function (event, obj) {
                SourceBrowser.currentTreeNode = obj.node;

                if (Config.tools[MainController.currentTool].controller.selectTreeNodeFn) return Config.tools[MainController.currentTool].controller.selectTreeNodeFn(event, obj);

                self.editThesaurusConceptInfos(obj.node.data.source, obj.node);
            },
            contextMenu: function () {
                if (Config.tools[MainController.currentTool].controller.contextMenuFn) return Config.tools[MainController.currentTool].controller.contextMenuFn();
                else return self.getJstreeConceptsContextMenu();
            },
        };

        common.jstree.loadJsTree(targetDiv, jstreeData, jstreeOptions);
        setTimeout(function () {
            //  MainController.UI.updateActionDivLabel("Multi source search :" + term)
            MainController.UI.message("");
            $("#waitImg").css("display", "none");
            $("#" + targetDiv)
                .jstree(true)
                .open_all();
        }, 200);
    };

    self.uploadOntologyFromOwlFile = function () {
        var graphUri;
        if (Array.isArray(Config.sources[Lineage_common.currentSource].graphUri)) graphUri = Config.sources[Lineage_common.currentSource].graphUri[0];
        else graphUri = Config.sources[Lineage_common.currentSource].graphUri;
        var payload = {
            uploadOntologyFromOwlFile: 1,

            graphUri: graphUri,
            filePath: Config.sources[Lineage_common.currentSource].protegeFilePath,
        };
        $.ajax({
            type: "POST",
            url: Config.serverUrl,
            data: payload,
            dataType: "json",

            success: function (_data, _textStatus, _jqXHR) {
                alert("Ontology updated");
            },
            error: function (err) {
                alert(err);
            },
        });
    };

    self.exportSearchResult = function () {
        if (!self.currentFoundIds || self.currentFoundIds.length == 0) return;
        Sparql_common.setFilter("id", self.currentFoundIds);
    };

    self.showNodeInfos = function (sourceLabel, nodeId, divId, options, callback) {
        self.newProperties = null;
        self.currentNodeId = nodeId;
        if (!sourceLabel) sourceLabel = self.currentSource;
        else self.currentSource = sourceLabel;
        self.divId = divId;
        if (!options) {
            options = {};
        }

        if (!self.visitedNodes || options.resetVisited) {
            self.visitedNodes = [];
            self.visitedNodes.currentIndex = 0;
        }

        var index = self.visitedNodes.indexOf(nodeId);
        if (index < 0) {
            self.visitedNodes.push(nodeId);
            self.visitedNodes.currentIndex = self.visitedNodes.length - 1;
        } else {
            self.visitedNodes.currentIndex = index;
        }

        self.currentNodeIdInfosSource = sourceLabel;
        self.currentNodeIdInfosDivId = divId;

        var type;
        async.series(
            [
                function (callbackSeries) {
                    self.drawCommonInfos(sourceLabel, nodeId, divId, options, function (_err, result) {
                        type = result.type;
                        callbackSeries();
                    });
                },
                function (callbackSeries) {

                    if (authentication.currentUser.groupes.indexOf("admin") > -1 && !options.hideButtons) {
                        var str = "<div>";
                        str += "<button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='SourceBrowser.showAddPropertyDiv()'>  add Property </button>";
                        if (Config.sources[self.currentSource].editable) {
                            //} &&  self.propertiesMap.properties["type"]=="http://www.w3.org/2002/07/owl#Class") {
                            str += "<button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='SourceBrowser.deleteNode()'> Delete </button>";
                        }
                        str +=
                            "<div id='sourceBrowser_addPropertyDiv' style='display:none;margin:5px;'>" +
                            "Property<select id='sourceBrowser_addPropertyName'></select>&nbsp;" +
                            "Value=&nbsp;<input id='sourceBrowser_addPropertyValue' style='width:400px'></input>&nbsp;" +
                            "<button  class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='SourceBrowser.addProperty()'>Add</button>";

                        str += "</div>";


                    if (self.visitedNodes.length > 1) {
                        str +=
                            "<button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='SourceBrowser.showVisitedNode(-1)'> previous </button>" +
                            "<button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='SourceBrowser.showVisitedNode(+1)'>  next </button>";
                    }

                    str += "</div>";
                    $("#" + divId).prepend(str);
                    }
                    callbackSeries();
                },
                function (callbackSeries) {
                    if (type != "http://www.w3.org/2002/07/owl#Class") {
                        return callbackSeries();
                    }
                    self.showNamedIndividualProperties(sourceLabel, nodeId, function (err) {
                        callbackSeries(err);
                    });
                },
                function (callbackSeries) {
                    // if (false && type != "http://www.w3.org/2002/07/owl#Class") {
                    //     return callbackSeries();
                    // }
                    self.showClassRestrictions(sourceLabel, [nodeId], options, function (err) {
                        callbackSeries(err);
                    });
                },

                function (callbackSeries) {
                    if (type != "http://www.w3.org/2002/07/owl#ObjectProperty") {
                        return callbackSeries();
                    }
                    self.showPropertyRestrictions(sourceLabel, nodeId, divId, function (_err, _result) {
                        callbackSeries();
                    });
                },
            ],
            function (err) {
                if (callback) callback(err);
                if (err) return alert(err);
            }
        );
    };

    self.drawCommonInfos = function (sourceLabel, nodeId, divId, _options, callback) {
        var valueLabelsMap = {};
        self.propertiesMap = { label: "", id: "", properties: {} };
        var blankNodes = [];
        Sparql_generic.getNodeInfos(
            sourceLabel,
            nodeId,
            {
                getValuesLabels: true,
                selectGraph: true,
            },
            function (err, data) {
                if (err) {
                    return MainController.UI.message(err);
                }
                if (divId.indexOf("Dialog") > -1) {
                    $("#" + divId).on("dialogbeforeclose", function (_event, _ui) {
                        SourceBrowser.indexObjectIfNew();
                    });
                    $("#" + divId).dialog("open");
                }

                var type = null;
                var graphUri = "";
                data.forEach(function (item) {
                    if (item.g) graphUri = item.g.value;
                    if (item.value.type == "bnode") {
                        return blankNodes.push(item.value.value);
                    }

                    if (item.prop.value == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") type = item.value.value;

                    var propName = item.prop.value;
                    if (item.propLabel) {
                        propName = item.propLabel.value;
                    } else {
                        propName = Sparql_common.getLabelFromURI(item.prop.value);
                    }

                    var value = item.value.value;
                    if (item.valueLabel) {
                        if (!item["xml:lang"]) valueLabelsMap[value] = item.valueLabel.value;
                    }
                    /*   if (item.valueLabel)
       value = item.valueLabel.value;*/

                    if (!self.propertiesMap.properties[propName])
                        self.propertiesMap.properties[propName] = {
                            name: propName,
                            propUri: item.prop.value,
                            langValues: {},
                        };

                    if (item.value && item.value["xml:lang"]) {
                        if (!self.propertiesMap.properties[propName].langValues[item.value["xml:lang"]]) self.propertiesMap.properties[propName].langValues[item.value["xml:lang"]] = [];
                        self.propertiesMap.properties[propName].langValues[item.value["xml:lang"]].push(value);
                    } else {
                        if (!self.propertiesMap.properties[propName].value) self.propertiesMap.properties[propName].value = [];

                        self.propertiesMap.properties[propName].value.push(value);
                    }
                });

                var defaultProps = [
                    "UUID",
                    "http://www.w3.org/2004/02/skos/core#prefLabel",
                    "http://www.w3.org/2004/02/skos/core#definition",
                    "" + "http://www.w3.org/2004/02/skos/core#altLabel",
                    "http://www.w3.org/2004/02/skos/core#broader",
                    "http://www.w3.org/2004/02/skos/core#narrower",
                    "http://www.w3.org/2004/02/skos/core#related",
                    "http://www.w3.org/2004/02/skos/core#exactMatch",
                    "http://www.w3.org/2004/02/skos/core#closeMatch",
                    //  "http://www.w3.org/2004/02/skos/core#sameAs"
                ];

                var defaultLang = Config.default_lang;
                /* if (!defaultLang)
     defaultLang = 'en';*/

                for (var key in self.propertiesMap.properties) {
                    if (defaultProps.indexOf(key) < 0) defaultProps.push(key);
                }
                var str = "<div style='max-height:800px;overflow: auto'>" + "<table class='infosTable'>";
                str += "<tr><td class='detailsCellName'>UUID</td><td><a target='_slsvCallback' href='" + nodeId + "'>" + nodeId + "</a></td></tr>";
                str += "<tr><td class='detailsCellName'>GRAPH</td><td>" + graphUri + "</td></tr>";
                str += "<tr><td>&nbsp;</td><td>&nbsp;</td></tr>";

                defaultProps.forEach(function (key) {
                    if (!self.propertiesMap.properties[key]) return;

                    str += "<tr class='infos_table'>";

                    if (self.propertiesMap.properties[key].value) {
                        var values = self.propertiesMap.properties[key].value;
                        str += "<td class='detailsCellName'>" + self.propertiesMap.properties[key].name + "</td>";
                        var valuesStr = "";
                        values.forEach(function (value, index) {
                            var optionalStr = "";
                            if (authentication.currentUser.groupes.indexOf("admin") > -1 && Config.sources[sourceLabel].editable > -1  && !_options.hideButtons) {
                                var propUri = self.propertiesMap.properties[key].propUri;
                                optionalStr =
                                    "&nbsp;<button class='btn btn-sm my-1 py-0 btn-outline-primary' style='font-size: 10px'" +
                                    " onclick=\"SourceBrowser.deletePropertyValue('" +
                                    propUri +
                                    "','" +
                                    value +
                                    "')\">X</button>";
                            }

                            if (value.indexOf("http") == 0) {
                                if (valueLabelsMap[value]) value = "<a target='_slsvCallback' href='" + value + "'>" + valueLabelsMap[value] + "</a>";
                                else value = "<a target='_slsvCallback' href='" + value + "'>" + value + "</a>";
                            }
                            if (index > 0) valuesStr += "<br>";
                            valuesStr += value + optionalStr;
                        });
                        str += "<td class='detailsCellValue'>" + valuesStr + "</td>";
                        str += "</tr>";
                    } else {
                        var keyName = self.propertiesMap.properties[key].name;
                        var selectId = "detailsLangSelect_" + keyName;
                        var propNameSelect = "<select id='" + selectId + "' onchange=SourceBrowser.onNodeDetailsLangChange('" + keyName + "') >";
                        var langDivs = "";

                        for (var lang in self.propertiesMap.properties[key].langValues) {
                            values = self.propertiesMap.properties[key].langValues[lang];
                            var selected = "";
                            if (lang == defaultLang) selected = "selected";
                            propNameSelect += "<option " + selected + ">" + lang + "</option> ";
                            valuesStr = "";
                            values.forEach(function (value, index) {
                                if (value.indexOf("http") == 0) {
                                    if (valueLabelsMap[value]) value = "<a target='_slsvCallback' href='" + value + "'>" + valueLabelsMap[value] + "</a>";
                                    else value += "<a target='_slsvCallback' href='" + value + "'>" + value + "</a>";
                                }
                                if (index > 0) valuesStr += "<br>";
                                valuesStr += value;
                            });

                            langDivs += "<div class='detailsLangDiv_" + keyName + "' id='detailsLangDiv_" + keyName + "_" + lang + "'>" + valuesStr + "</div>";
                        }

                        propNameSelect += "</select>";

                        str += "<td class='detailsCellName'>" + self.propertiesMap.properties[key].name + " " + propNameSelect + "</td>";
                        str += "<td class='detailsCellValue'>" + langDivs + "</td>";

                        if (self.propertiesMap.properties[key].langValues[defaultLang]) str += "<script>SourceBrowser.onNodeDetailsLangChange('" + keyName + "','" + defaultLang + "') </script>";

                        str += "</tr>";
                    }
                });
                str += "</table></div>";

                str +=
                    " <hr><div id='nodeInfos_listsDiv' style='display:flex;flex-direction: row;';>" +
                    "<div id='nodeInfos_restrictionsDiv'  style='display:flex;flex-direction: column;min-width: 300px'></div>" +
                    "<div id='nodeInfos_individualsDiv'  style='display:flex;flex-direction: column;min-width: 300px'></div>" +
                    "</div>";

                $("#" + divId).html(str);

                return callback(null, { type: type, blankNodes: blankNodes });
            }
        );
    };

    self.showClassRestrictions = function (sourceLabel, nodeId, _options, callback) {
        // blankNodes.

        Sparql_OWL.getObjectRestrictions(sourceLabel, nodeId, { withoutBlankNodes: 1 }, function (err, result) {
            if (err) {
                return callback(err);
            }
            var str = "<b>Restrictions </b> <div style='    background-color: beige;'> <table>";
            result.forEach(function (item) {
                str += "<tr class='infos_table'>";

                var propStr = "<span class='detailsCellName' onclick=' SourceBrowser.onClickLink(\"" + item.prop.value + "\")'>" + item.propLabel.value + "</span>";

                str += "<td class='detailsCellName'>" + propStr + "</td>";

                var targetClassStr = "any";
                if (item.value) {
                    targetClassStr = "<span class='detailsCellName' onclick=' SourceBrowser.onClickLink(\"" + item.value.value + "\")'>" + item.valueLabel.value + "</span>";
                }
                str += "<td class='detailsCellValue'>" + targetClassStr + "</td>";

                str += "</tr>";
            });

            str += "</table> </div>" + "</div>";

            $("#nodeInfos_restrictionsDiv").append(str);
            callback();
        });
    };

    self.showNamedIndividualProperties = function (sourceLabel, nodeId, callback) {
        var sparql_url = Config.sources[sourceLabel].sparql_server.url;
        var fromStr = Sparql_common.getFromStr(sourceLabel);
        var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " + "select distinct * " + fromStr + " where {";

        query += "?value <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <" + nodeId + ">";
        query += "  Optional {?value rdfs:label ?valueLabel}  ";
        query += "} order by ?valueLabel limit 1000 ";
        var url = sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }

            var data = result.results.bindings;

            if (data.length == 0) {
                return callback();
            } else {
                var str = "<b>NamedIndividuals</b><br><table>";

                data.forEach(function (item) {
                    var targetClassStr = "<span class='detailsCellValue' onclick=' SourceBrowser.onClickLink(\"" + item.value.value + "\")'>" + item.valueLabel.value + "</span>";
                    str += "<tr><td>" + targetClassStr + "</td></tr>";
                });
                str += "</table>";
                $("#nodeInfos_individualsDiv").append(str);
            }
            callback();
        });
    };

    self.showPropertyRestrictions = function (sourceLabel, nodeId, divId, _callback) {
        Sparql_OWL.getPropertyClasses(sourceLabel, nodeId, {}, function (err, result) {
            if (err) {
                alert(err.responseText);
                return MainController.UI.message(err.responseText, true);
            }

            var str = "<b>Property restrictions</b><table>";
            result.forEach(function (item) {
                str += "<tr class='infos_table'>";

                str +=
                    "<td class='detailsCellValue' onclick=' SourceBrowser.onClickLink(\"" + item.sourceClass.value + "\")'>" + item.sourceClassLabel
                        ? item.sourceClassLabel.value
                        : Sparql_common.getLabelFromURI(item.sourceClass.value) + "</td>";

                str += "<td class='detailsCellValue' onclick=' SourceBrowser.onClickLink(\"" + item.prop.value + "\")'>" + item.propLabel.value + "</td>";

                str +=
                    "<td class='detailsCellValue' onclick=' SourceBrowser.onClickLink(\"" + item.targetClass.value + "\")'>" + item.targetClassLabel
                        ? item.targetClassLabel.value
                        : Sparql_common.getLabelFromURI(item.targetClass.value) + "</td>";

                str += "</tr>";
            });
            $("#" + divId).append(str);
        });
    };

    self.onClickLink = function (nodeId) {
        self.showNodeInfos(self.currentNodeIdInfosSource, nodeId, self.currentNodeIdInfosDivId, { previousNode: true });
    };

    self.showVisitedNode = function (direction) {
        if (direction > 0 && self.visitedNodes.currentIndex < self.visitedNodes.length - 1) {
            self.visitedNodes.currentIndex += 1;
            self.showNodeInfos(self.currentNodeIdInfosSource, self.visitedNodes[self.visitedNodes.currentIndex], self.currentNodeIdInfosDivId);
        } else if (direction < 0 && self.visitedNodes.currentIndex > 0) {
            self.visitedNodes.currentIndex -= 1;
            self.showNodeInfos(self.currentNodeIdInfosSource, self.visitedNodes[self.visitedNodes.currentIndex], self.currentNodeIdInfosDivId);
        }
    };

    self.showWikiPage = function (sourceLabel) {
        var wikiUrl = Config.wiki.url + "Source " + sourceLabel;
        window.open(wikiUrl, "_slsvWiki");
    };

    self.addProperty = function (property, value, source, createNewNode) {
        if (!property) property = $("#sourceBrowser_addPropertyName").val();
        if (!value) value = $("#sourceBrowser_addPropertyValue").val().trim();

        if (!property || !value) return;

        if (source) self.currentSource = source;
        if (createNewNode || confirm("add property")) {
            var triples = [];
            if (createNewNode) {
                self.currentNodeId = Config.sources[self.currentSource].graphUri + common.getRandomHexaId(10);

                triples.push({
                    subject: self.currentNodeId,
                    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                    object: "http://www.w3.org/2002/07/owl#Class",
                });
            }

            triples.push({
                subject: self.currentNodeId,
                predicate: property,
                object: value,
            });

            Sparql_generic.insertTriples(self.currentSource, triples, {}, function (err, _result) {
                if (err) return alert(err);

                self.isModified = true;
                if (!self.newProperties) self.newProperties = {};
                self.newProperties[property] = value;
                self.showNodeInfos(self.currentSource, self.currentNodeId, "mainDialogDiv");
                if (property == "http://www.w3.org/2000/01/rdf-schema#subClassOf") {
                    visjsGraph.data.nodes.push({
                        id: self.currentNodeId,
                        label: value,
                        shape: Lineage_classes.defaultShape,
                        size: Lineage_classes.defaultShapeSize,
                        color: Lineage_classes.getSourceColor(self.currentSource),
                        data: {
                            id: self.currentNodeId,
                            label: value,
                            source: self.currentSource,
                        },
                    });
                }
            });
        }
    };
    self.showAddPropertyDiv = function () {
        $("#sourceBrowser_addPropertyDiv").css("display", "block");
        var properties = Config.Lineage.basicObjectProperties;
        common.fillSelectOptions("sourceBrowser_addPropertyName", properties, true, "label", "id");
    };

    self.deletePropertyValue = function (property, value) {
        if (confirm("delete property " + property)) {
            Sparql_generic.deleteTriples(self.currentSource, self.currentNodeId, property, value, function (err, _result) {
                if (err) return alert(err);
                self.showNodeInfos(self.currentSource, self.currentNodeId, "mainDialogDiv");
            });
        }
    };

    self.deleteNode = function () {
        if (confirm("delete node " + self.currentNodeId)) {
            Sparql_generic.deleteTriples(self.currentSource, self.currentNodeId, null, null, function (err, _result) {
                if (err) return alert(err);
                Sparql_generic.deleteTriples(null, null, self.currentNodeId, null, function (err, _result) {
                    if (err) return alert(err);

                    $("#" + self.divId).dialog("close");
                    visjsGraph.data.nodes.remove(self.currentNodeId);
                    MainController.UI.message("node deleted");
                });
            });
        }
    };

    self.indexObjectIfNew = function () {
        if (self.newProperties && self.newProperties["http://www.w3.org/2000/01/rdf-schema#label"]) {
            SearchUtil.addObjectsToIndex(self.currentSource, self.currentNodeId, function (err, _result) {
                if (err) return alert(err);
            });
        }
    };

    self.showSearchableSourcesTreeDialog = function () {
        if (!self.searchableSourcesTreeIsInitialized) {
            Standardizer.initSourcesIndexesList(null, function (err, sources) {
                if (err) return MainController.UI.message(err);

                $("#searchAllDialogDiv").dialog("open");
                var options = {
                    selectTreeNodeFn: null,
                };
                self.searchableSourcesTreeIsInitialized = true;
                MainController.UI.showSources("searchAll_sourcesTree", true, sources, ["OWL"], options);
            });
        } else {
            $("#searchAllDialogDiv").dialog("open");
        }
    };

    return self;
})();
