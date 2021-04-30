/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var SourceBrowser = (function () {
    var self = {}
    self.currentTargetDiv = "currentSourceTreeDiv"


    self.onLoaded = function () {
        $("#sourceDivControlPanelDiv").load("./snippets/searchAll.html");

        setTimeout(function () {
            // console.log(Config.currentProfile.allowedSourceSchemas[0])
            $("#GenericTools_searchInAllSources").prop("checked", true)
            $("#GenericTools_searchSchemaType").val(Config.currentProfile.allowedSourceSchemas[0])

        }, 200)

    }
    self.onSourceSelect = function (sourceLabel) {
        MainController.currentSource = sourceLabel;
        OwlSchema.currentSourceSchema = null;
        self.currentTargetDiv = "currentSourceTreeDiv"
        self.showThesaurusTopConcepts(sourceLabel,)
        $("#actionDivContolPanelDiv").html("<input id='GenericTools_searchTermInput'> " +
            "<input type='checkbox' checked='checked' id= 'GenericTools_exactMatchSearchCBX'>Exact Match" +
            "<button onclick='SourceBrowser.searchTerm()'>Search</button>" +
            "<button onclick='SourceBrowser.showThesaurusTopConcepts(MainController.currentSource)'>reset</button>" +
            "<div id='SourceBrowser_collectionDiv'>" +
            "Collection<select id='SourceBrowser_collectionSelect' onchange='Collection.filterBrowserCollection()'></select>" +
            "</div>")

        if (Config.enableCollections) {
            setTimeout(function () {
                Collection.initBrowserCollectionSelect()
            }, 200)
        }

    }

    self.selectTreeNodeFn = function (event, propertiesMap) {


        var source;
        if (propertiesMap.node.data && propertiesMap.node.data.source)
            source = propertiesMap.node.data && propertiesMap.node.data.source // coming from search all sources
        else
            source = MainController.currentSource// coming from  specific tool current surce
        self.currentTreeNode = propertiesMap.node;
        if (propertiesMap.event.ctrlKey)
            self.copyNode(propertiesMap.event);


        if (true || propertiesMap.event.ctrlKey) {
            self.editThesaurusConceptInfos(source, propertiesMap.node)
        }
        {
            self.openTreeNode(self.currentTargetDiv, source, propertiesMap.node, {ctrlKey: propertiesMap.event.ctrlKey})
        }

    }

    self.copyNode = function (event) {
        Clipboard.copy({
                type: "node",
                id: self.currentTreeNode.data.id,
                label: self.currentTreeNode.data.label,
                source: self.currentTreeNode.data.source,
                data: self.currentTreeNode.data
            },
            self.currentTreeNode.id + "_anchor",
            event)
    }

    self.showThesaurusTopConcepts = function (sourceLabel, options) {
        if (!options)
            options = {}

        if (options.targetDiv)
            self.currentTargetDiv = options.targetDiv
        else if (!self.currentTargetDiv)
            self.currentTargetDiv = "actionDiv"

        if ($("#" + self.currentTargetDiv).length == 0) {
            var html = "<div id='" + self.currentTargetDiv + "'></div>"
            $("#actionDiv").html(html);
        }
        $("#accordion").accordion("option", {active: 2});
        options.filterCollections = Collection.currentCollectionFilter
        Sparql_generic.getTopConcepts(sourceLabel, options, function (err, result) {
            if (err)
                return MainController.UI.message(err);

            if (result.length == 0) {
                Collection.currentCollectionFilter = null;
                $("#waitImg").css("display", "none");

                var html = "<div id='" + self.currentTargetDiv + "'>no data found</div>"
                $("#" + self.currentTargetDiv).html(html);

                return MainController.UI.message("")
            }

            if (!options)
                options = {}
            if (err) {
                return MainController.UI.message(err);
            }


            /*  var html = "<div id='"+self.currentTargetDiv+"'></div>"
              $("#actionDiv").html(html);*/


            var jsTreeOptions = options;
            jsTreeOptions.contextMenu = self.getJstreeConceptsContextMenu()
            jsTreeOptions.selectTreeNodeFn = Config.tools[MainController.currentTool].controller.selectTreeNodeFn;
            jsTreeOptions.source = sourceLabel;

            TreeController.drawOrUpdateTree(self.currentTargetDiv, result, "#", "topConcept", jsTreeOptions)


            /* Collection.Sparql.getCollections(sourceLabel, options, function (err, result) {

               })*/


        })


    }


    self.getJstreeConceptsContextMenu = function () {
        // return {}
        var items = {}
        ;
        if (false && MainController.currentSource && Config.sources[MainController.currentSource].schemaType == "OWL") {
            items.showProperties = {
                label: "Show Properties",
                action: function (e) {// pb avec source

                    ADLquery.showProperties()


                }

            }

        }
        if (MainController.currentTool == "lineage") {
            items.graphNode = {
                label: "graph Node",
                action: function (e) {// pb avec source

                    Lineage_classes.addArbitraryNodeToGraph(self.currentTreeNode.data)

                }

            }
            items.copyNodeToClipboard = {
                label: "copy toClipboard",
                action: function (e) {// pb avec source

                    Lineage_common.copyNodeToClipboard(self.currentTreeNode.data)

                }

            }
            if (Lineage_classes.currentSource && Config.sources[Lineage_classes.currentSource].editable) {
                items.pasteNodeFromClipboard = {
                    label: "paste from Clipboard",
                    action: function (e) {// pb avec source

                        Lineage_common.pasteNodeFromClipboard(self.currentTreeNode)

                    }

                }
                items.editNode = {
                    label: "Edit node",
                    action: function (obj, sss, cc) {
                        SourceEditor.editNode("DialogDiv", self.currentSource, self.currentTreeNode.data.id, "OWL", false)

                    }
                }
                items.deleteClass = {
                    label: "delete Class",
                    action: function (e) {// pb avec source

                        Lineage_common.jstree.deleteNode(self.currentTreeNode, self.currentTargetDiv)

                    }

                }

            }


            if (MainController.currentSource && Config.sources[MainController.currentSource].protegeFilePath) {
                items.uploadOntologyFromOwlFile = {
                    label: "upload Ontology FromOwl File",
                    action: function (e) {
                        SourceBrowser.uploadOntologyFromOwlFile()

                    }
                }
            }
        }
        /* if (MainController.currentSource && Config.showAssetQueyMenu && Config.sources[MainController.currentSource].ADLqueryController) {
             items.addToADLquery = {
                 label: "add to Asset Query",
                 action: function (e) {// pb avec source
                     ADLquery.showNodeProperties(self.currentTreeNode.data)
                 }
             }

     }*/
        items.copyNode = {
            label: "Copy Node",
            action: function (e) {// pb avec source
                SourceBrowser.copyNode(e)
            }

        }
            , items.nodeInfos = {
            label: "Node infos",
            action: function (e) {// pb avec source
                MainController.UI.showNodeInfos(self.currentTreeNode.data.source, self.currentTreeNode.data.id, "mainDialogDiv")
            }

        }
        /* , items.toCSV = {
             label: "toCSV",
             action: function () {
                 var node = skosEditor.editSkosMenuNode;
                 skosEditor.toCsv(node)
             }

         }*/
        return items;
    }

    self.openTreeNode = function (divId, sourceLabel, node, options) {
        if (!options)
            options = {}
        var existingNodes = common.jstree.getjsTreeNodes(divId, true)
        if (node.children.length > 0)
            if (!options.ctrlKey)
                return;

        options.filterCollections = Collection.currentCollectionFilter
        Sparql_generic.getNodeChildren(sourceLabel, null, node.data.id, 1, options, function (err, result) {
            if (err) {
                return MainController.UI.message(err);
            }
            TreeController.drawOrUpdateTree(divId, result, node.id, "child1", {
                source: sourceLabel,
                type: node.data.type
            })
            $("#waitImg").css("display", "none");

        })

    }


    self.editThesaurusConceptInfos = function (sourceLabel, node, callback) {
        MainController.UI.showNodeInfos(sourceLabel, node.data.id, "graphDiv")

        /*  Sparql_generic.getNodeInfos(sourceLabel, node.data.id, null, function (err, result) {
              if (err) {
                  return MainController.UI.message(err);
              }
              //    SkosConceptEditor.editConcept("graphDiv",result)
              SourceEditor.showNodeInfos("graphDiv", "en", node.data.id, result)


          })*/


    }


    self.onNodeDetailsLangChange = function (property, lang) {
        $('.detailsLangDiv_' + property).css('display', 'none')
        if (!lang)
            lang = $("#detailsLangSelect_" + property).val();
        if ($("#detailsLangDiv_" + property + "_" + lang).html())
            $("#detailsLangDiv_" + property + "_" + lang).css("display", "block");

    }

    self.searchTerm = function (sourceLabel, term, rootId, callback) {
        if (!term)
            term = $("#GenericTools_searchTermInput").val()
        var exactMatch = $("#GenericTools_exactMatchSearchCBX").prop("checked")
        if (!term || term == "")
            return
        var options = {
            term: term,
            rootId: rootId,
            exactMatch: exactMatch,
            limit: Config.searchLimit
        }
        SourceBrowser.getFilteredNodesJstreeData(sourceLabel, options, function (err, jstreeData) {
            if (callback)
                return (err, jstreeData)
            MainController.UI.message("")
            if (jstreeData.length == 0) {
                $("#waitImg").css("display", "none");
                return $("#" + self.currentTargetDiv).html("No data found")
            }

            common.jstree.loadJsTree(self.currentTargetDiv, jstreeData, {
                openAll: true, selectTreeNodeFn: function (event, propertiesMap) {
                    if (Config.tools[MainController.currentTool].controller.selectTreeNodeFn)
                        return Config.tools[MainController.currentTool].controller.selectTreeNodeFn(event, propertiesMap);
                    self.editThesaurusConceptInfos(MainController.currentSource, propertiesMap.node)
                }, contextMenu: self.getJstreeConceptsContextMenu()
            })

        })
    }


    self.searchAllSourcesTerm = function (options) {
        if (!options) {
            options = {}
        }


        var term = $("#GenericTools_searchAllSourcesTermInput").val()

        if (!term || term == "")
            return
        var exactMatch = $("#GenericTools_allExactMatchSearchCBX").prop("checked")
        var searchAllSources = $("#GenericTools_searchInAllSources").prop("checked")

        var searchedSources = [];

        var schemaType = $("#GenericTools_searchSchemaType").val()

        if (searchAllSources) {
            for (var sourceLabel in Config.sources) {
                if (Config.currentProfile.allowedSourceSchemas.indexOf(Config.sources[sourceLabel].schemaType) > -1) {
                    if (!Config.sources[sourceLabel].schemaType || Config.sources[sourceLabel].schemaType == schemaType)
                        searchedSources.push(sourceLabel)
                }
            }
        } else {
            if (!MainController.searchedSource && !MainController.currentSource)
                return alert("select a source or search in all source")
            searchedSources.push(MainController.searchedSource || MainController.currentSource)
        }
        var jstreeData = []
        var uniqueIds = {}
        async.eachSeries(searchedSources, function (sourceLabel, callbackEach) {

            setTimeout(function () {
                MainController.UI.message("searching in " + sourceLabel)
            }, 100)
            if (!term)
                term = $("#GenericTools_searchTermInput").val()

            if (!term || term == "")
                return
            var options2 = {
                term: term,
                rootId: sourceLabel,
                exactMatch: exactMatch,
                limit: Config.searchLimit,
            }
            SourceBrowser.getFilteredNodesJstreeData(sourceLabel, options2, function (err, result) {
                if (err)
                    return MainController.UI.message(err)

                var text = "<span class='searched_conceptSource'>" + sourceLabel + "</span>"
                jstreeData.push({id: sourceLabel, text: text, parent: "#", data: {source: sourceLabel}})
                result.forEach(function (item) {
                    if (!uniqueIds[item.id]) {
                        uniqueIds[item.id] = 1
                        jstreeData.push(item)

                    }
                })

                callbackEach();
            })


        }, function (err) {
            $("#accordion").accordion("option", {active: 2});
            var html = "<div id='" + self.currentTargetDiv + "'></div>"

            if ($("#" + self.currentTargetDiv).length == 0) {
                var html = "<div id='" + self.currentTargetDiv + "'></div>"
                $("#actionDiv").html(html);
            }
            $("#" + self.currentTargetDiv).html(html)

            MainController.UI.message("Search Done")


            var jstreeOptions = {
                openAll: true, selectTreeNodeFn: function (event, propertiesMap) {
                    SourceBrowser.currentTreeNode = propertiesMap.node;

                    if (Config.tools[MainController.currentTool].controller.selectTreeNodeFn)
                        return Config.tools[MainController.currentTool].controller.selectTreeNodeFn(event, propertiesMap);


                    self.editThesaurusConceptInfos(propertiesMap.node.data.source, propertiesMap.node)
                },
                contextMenu: function () {
                    if (Config.tools[MainController.currentTool].controller.contextMenuFn)
                        return Config.tools[MainController.currentTool].controller.contextMenuFn()
                    else
                        return self.getJstreeConceptsContextMenu()
                }
            }

            common.jstree.loadJsTree(self.currentTargetDiv, jstreeData, jstreeOptions)
            setTimeout(function () {
                MainController.UI.updateActionDivLabel("Multi source search :" + term)
                MainController.UI.message("");
                $("#waitImg").css("display", "none");

            }, 200)

        })


    }

    self.getFilteredNodesJstreeData = function (sourceLabel, options, callback) {
        if (!options.term)
            options.term = $("#GenericTools_searchTermInput").val()


        if (!options.rootId)
            options.rootId = "#"
        if (!sourceLabel)
            sourceLabel = MainController.currentSource
        var depth = Config.searchDepth
        Sparql_generic.getNodeParents(sourceLabel, options.term, options.ids, depth, options, function (err, result) {
            if (err)
                return MainController.UI.message(err)

            var existingNodes = {};
            var jstreeData = []

            if (result.length == 0) {
                if (callback)
                    return callback(null, []);
                else
                    $("#waitImg").css("display", "none");
                return $("#" + self.currentTargetDiv).html("No data found")
            }

            var allJstreeIds = {}
            result.forEach(function (item, index) {
                for (var i = 20; i > 0; i--) {
                    if (item["broader" + i]) {

                        item["broader" + i].jstreeId = sourceLabel+"_"+item["broader" + i].value + "_" + index
                    }

                }
                item.concept.jstreeId = sourceLabel+"_"+item.concept.value + "_" + index;
            })


            result.forEach(function (item, index) {

                for (var i = 20; i > 0; i--) {
                    if (item["broader" + i]) {



                        var id = item["broader" + i].value
                        if(false && id.indexOf("nodeID://")>-1)//skip anonym nodes
                            return
                        var jstreeId = item["broader" + i].jstreeId
                        if (!existingNodes[id]) {
                            existingNodes[id] = 1
                            var label = item["broader" + i + "Label"].value
                            var parentId = options.rootId;
                            if (item["broader" + (i + 1)])
                                parentId = item["broader" + (i + 1)].jstreeId

                            jstreeData.push({
                                id: jstreeId,
                                text: label,
                                parent: parentId,
                                data: {
                                    type: "http://www.w3.org/2002/07/owl#Class",
                                    source: sourceLabel,
                                    id: id,
                                    label: item["broader" + i + "Label"].value
                                }
                            })
                        }
                    }
                }

                var jstreeId = item.concept.jstreeId
                if (!existingNodes[jstreeId]) {
                    existingNodes[jstreeId] = 1;
                    var text = "<span class='searched_concept'>" + item.conceptLabel.value + "</span>"
                    var id = item.concept.value;


                    jstreeData.push({
                        id: jstreeId,
                        text: text,
                        parent: item["broader1"].jstreeId,
                        data: {
                            type: "http://www.w3.org/2002/07/owl#Class",
                            source: sourceLabel,
                            id: id,
                            label: item.conceptLabel.value
                        }
                    })
                } else {
                    /*
                       if (!existingNodes[jstreeId]) {
                           existingNodes[jstreeId] = 1;
                           var text = "<span class='searched_concept'>" + item.conceptLabel.value + "</span>"
                           jstreeData.push({id: jstreeId, text: text, parent: item["broader1"].value, data: {source: sourceLabel, id: itemId}})
                       }*/
                }
            })
//console.log(JSON.stringify(jstreeData))
            return callback(null, jstreeData)


        })


    }


    self.uploadOntologyFromOwlFile = function () {
        var graphUri;
        if (Array.isArray(Config.sources[Lineage_classes.currentSource].graphUri))
            graphUri = Config.sources[Lineage_classes.currentSource].graphUri[0]
        else
            graphUri = Config.sources[Lineage_classes.currentSource].graphUri
        var payload = {
            uploadOntologyFromOwlFile: 1,

            graphUri: graphUri,
            filePath: Config.sources[Lineage_classes.currentSource].protegeFilePath
        }
        $.ajax({
            type: "POST",
            url: Config.serverUrl,
            data: payload,
            dataType: "json",

            success: function (data, textStatus, jqXHR) {
                alert("Ontology updated")
            }
            , error: function (err) {
                alert(err)
            }
        })

    }
    return self;


})()
