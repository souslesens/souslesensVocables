/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var Blender = (function () {

        var self = {}
        var isLoaded = false
        self.modifiedNodes = []
        self.tempGraph;

        self.currentSource;
        self.currentTab = 0;
        self.backupSource = false// using  a clone of source graph
        self.displayMode = "leftPanel"
        self.onLoaded = function () {

            MainController.UI.message("");

            MainController.UI.openRightPanel()
            //    $("#accordion").accordion("option", {active: 2});
            // $("#actionDivContolPanelDiv").load("snippets/lineage/lineage.html")
            //  MainController.UI.toogleRightPanel("open");
            $("#rightPanelDiv").load("snippets/blender/blender.html")

            if (!MainController.currentTool)
                $("#graphDiv").html("")
            setTimeout(function () {
                    var editableSources = [];
                    for (var key in Config.sources) {

                        if (!Config.sources[key].controllerName) {
                            Config.sources[key].controllerName = "" + Config.sources[key].controller
                            Config.sources[key].controller = eval(Config.sources[key].controller)
                        }
                        if (Config.sources[key].editable)
                            editableSources.push(key)
                    }

                    common.fillSelectOptions("Blender_SourcesSelect", editableSources.sort(), true)
                    $("#Blender_PopupEditDiv").dialog({
                        autoOpen: false,
                        height: 600,
                        width: 600,
                        modal: true,
                    });
                    $("#Blender_tabs").tabs({
                        activate: function (event, ui) {
                            self.currentTab = $("#Blender_tabs").tabs('option', 'active')
                        }

                    })

                    //   $("#Blender_searchDiv").load("snippets/searchAll.html")
                    //   SourceBrowser.currentTargetDiv = "Blender_conceptTreeDiv"


                }, 200
            )

        }


        self.onSourceSelect = function (source) {

            $("#Blender_conceptTreeDiv").html("");
            self.currentTreeNode = null;
            self.currentSource = null;
            $("#Blender_collectionTreeDiv").html("");
            Collection.removeTaxonomyFilter();
            $("#Blender_tabs").tabs("option", "active", 0);
            Collection.currentTreeNode = null;
            if (source == "") {
                return
            }


            self.currentSource = source
            MainController.searchedSource = self.currentSource

            async.series([
                    function (callbackSeries) {
                        OwlSchema.initSourceSchema(source, function (err, result) {
                            callbackSeries(err);
                        })
                    }

                    , function (callbackSeries) {
                        if (!self.backupSource) {
                            Config.sources[source].controller = eval(Config.sources[source].controller)
                            return callbackSeries();
                        }
                        self.currentSource = "_blenderTempSource"
                        Config.sources[self.currentSource] = {
                            "controller": Sparql_generic,
                            "sparql_url": Config.sources[source].sparql_server.url,// on the same server !!!
                            "graphUri": "http://souslesens/_backup/" + source,
                            "schema": "SKOS",
                            "predicates": {
                                "lang": "en"
                            },
                        };

                        Sparql_generic.copyGraph(source, Config.sources[self.currentSource].graphUri, function (err, result) {
                            callbackSeries(err);
                        })
                    },

                    function (callbackSeries) {
                        if (Blender.currentSource)
                            if(Config.Blender.openTaxonomyTreeOnLoad && Config.sources[self.currentSource].schemaType.indexOf("SKOS")>-1) {
                                self.showFilteredTaxonomyTree(function (err, result) {
                                    callbackSeries(err);
                                })
                            }else{
                           self.showTopConcepts(null, function (err, result) {
                                callbackSeries(err);
                            })

                            }

                    }
                    ,
                    function (callbackSeries) {
                        Collection.Sparql.getCollections(source, null, function (err, result) {
                            var jsTreeOptions = {};
                            jsTreeOptions.contextMenu = Collection.getJstreeContextMenu()
                            jsTreeOptions.selectTreeNodeFn = Collection.selectTreeNodeFn;
                            jsTreeOptions.source = source
                            jsTreeOptions.dnd = Blender.dnd
                            TreeController.drawOrUpdateTree("Blender_collectionTreeDiv", result, "#", "collection", jsTreeOptions, function () {
                                var firstNodeId = $("#Blender_collectionTreeDiv").jstree(true).get_node("#").children[0];
                                var firstNode = $("#Blender_collectionTreeDiv").jstree(true).get_node(firstNodeId);

                                Collection.openTreeNode("Blender_collectionTreeDiv", Blender.currentSource, firstNode)

                                callbackSeries(err);
                            })


                        })
                    }
                ],
                function (err) {
                    if (err)
                        return MainController.UI.message(err);
                })
        }

        self.copyGraph = function () {
            if (!self.currentSource) {
                return MainController.UI.message("select a source")
            }

            var newGraphUri = prompt("newGraphUri")
            if (newGraphUri && newGraphUri != "")
                Sparql_generic.copyGraph(self.currentSource, newGraphUri, function (err, result) {
                    if (err)
                        return MainController.UI.message(err)
                    MainController.UI.message("graph Copied");
                })
        }

        self.showTopConcepts = function (collectionIds, callback) {
            var options = {};
            if (collectionIds)
                options.filterCollections = collectionIds
            Sparql_generic.getTopConcepts(self.currentSource, options, function (err, result) {
                if (err) {
                    MainController.UI.message(err);
                    return callback(err)
                }
                var jsTreeOptions = self.getConceptJstreeOptions(true)
                TreeController.drawOrUpdateTree("Blender_conceptTreeDiv", result, "#", "topConcept", jsTreeOptions)
                return callback()
            })

        }
        self.getConceptJstreeOptions = function (withDnd) {
            var jsTreeOptions = {};
            jsTreeOptions.source = self.currentSource
            jsTreeOptions.contextMenu = Blender.getJstreeConceptsContextMenu()
            jsTreeOptions.selectTreeNodeFn = Blender.selectTreeNodeFn
            if (withDnd) {

                jsTreeOptions.dropAllowedFn = Blender.dnd.dropAllowed
                jsTreeOptions.dnd = self.dnd
            }

            return jsTreeOptions;

        }

        self.dnd = {

            "drag_start": function (data, element, helper, event) {


                // Blender.currentDNDstartNodeParentId=Blender.currentTreeNode.parent
                Blender.currentDNDstartNodeId = element.data.nodes[0];

                Blender.currentDNDstartNode = common.jstree.getjsTreeNodeObj("Blender_conceptTreeDiv", Blender.currentDNDstartNodeId)
                Blender.currentDNDstartNodeParentId = Blender.currentDNDstartNode.parent


                return true;
            },
            "drag_move": function (data, element, helper, event) {
                return false;
            },
            "drag_stop": function (data, element, helper, event) {
                if (!Blender.currentDNDoperation)
                    return false;
                var currentNodeLevel = Blender.currentDNDoperation.parent.parents.length;
                var allowedLevels = Config.currentProfile.blender.contextMenuActionStartLevel
                if (currentNodeLevel < allowedLevels)
                    return false;

                Blender.menuActions.dropNode(function (err, result) {
                    return true;
                })
                return true;


            },
            dropAllowed: function (operation, node, parent, position, more) {
                var currentNodeLevel = Blender.currentDNDstartNode.parents.length
                var allowedLevels = Config.currentProfile.blender.contextMenuActionStartLevel
                if (currentNodeLevel < allowedLevels)
                    return false;
                console.log(operation)
                Blender.currentDNDoperation = {operation: operation, node: node, parent: parent, position: position, more, more}

                return true;
            },

        },


            self.selectTreeNodeFn = function (event, propertiesMap) {
                if (propertiesMap) {
                    self.currentTreeNode = propertiesMap.node
                    $("#Blender_conceptTreeDiv").jstree(true).settings.contextmenu.items = self.getJstreeConceptsContextMenu()

                    var source = self.currentTreeNode.data.source || self.currentSource;
                    var type = self.currentTreeNode.data.type

                    var options = {source: source, labelClass: "treeType_" + type}
                    if (Collection.currentCollectionFilter)
                        options.filterCollections = Collection.currentCollectionFilter;
                    SourceBrowser.openTreeNode("Blender_conceptTreeDiv", source, propertiesMap.node, options);

                    if (type == "externalReferenceTopConcept")
                        return;
                    if (propertiesMap.event.ctrlKey) {
                        if (Blender.displayMode == "centralPanelDiv") {
                            self.nodeEdition.editNode("concept")
                        }
                        Clipboard.copy({
                            type: "node",
                            id: self.currentTreeNode.data.id,
                            label: self.currentTreeNode.text,
                            source: self.currentSource
                        }, self.currentTreeNode.data.id + "_anchor", propertiesMap.event)
                    }

                    if (false && self.currentTreeNode.children.length == 0)
                        ExternalReferences.openNarrowMatchNodes(self.currentSource, self.currentTreeNode)

                }
                //  $.jstree.defaults.contextmenu.items = self.getJstreeConceptsContextMenu();


            }


        self.getJstreeConceptsContextMenu = function () {
            var menuItems = {}
            $(".vakata-context jstree-contextmenu").css("z-index","6")


            if (!self.currentTreeNode || !self.currentTreeNode.data)
                return menuItems

            var currentNodeLevel = self.currentTreeNode.parents.length
            var allowedLevels = Config.currentProfile.blender.contextMenuActionStartLevel

            /*   if (self.currentTreeNode.data.type == "externalReferenceTopConcept") {
                   return ExternalReferences.getJstreeConceptsContextMenu(self.currentTreeNode)

               }


               if (self.currentTreeNode.data.type == "externalReference") {

                   menuItems.showExternalReferenceNodeInfos = {

                       label: "view node properties",
                       action: function (obj, sss, cc) {
                           ExternalReferences.showExternalReferenceNodeInfos()
                       }
                   }

                   return menuItems;
               }*/

            if (currentNodeLevel < allowedLevels) {
                menuItems.forbidden = {
                    label: "!...",
                    action: function (obj, sss, cc) {
                        alert("Modifications not allowed at this level")
                    },
                }
                menuItems.nodeInfos = {
                    label: "Show Node infos",
                    action: function (obj, sss, cc) {
                        MainController.UI.showNodeInfos(self.currentTreeNode.data.source, self.currentTreeNode.id, "mainDialogDiv")
                    },


                }
                return menuItems;
            } else {
                var clipboard = Clipboard.getContent()
                if(clipboard.length==0) {
                    menuItems.toCollection = {
                        label: "<span class='blender_assignCollection'>to Collection</span>",
                        action: function (e) {// pb avec source
                            Blender.menuActions.toCollection(e)
                        }

                    }
                }


                if (clipboard.length > 0 && clipboard[0].type == "node") {
                    menuItems.pasteNode = {
                        "label": "<span class='blender_pasteNode'>Paste...</span>",
                        "separator_before": false,
                        "separator_after": true,

                        "action": false,
                        "submenu": {
                            pasteNode: {
                                label: "<span class='blender_pasteNode'>node</span>",
                                action: function () {
                                    self.menuActions.pasteClipboardNodeOnly();
                                }
                            },
                            /*   pasteProperties: {
                                   label: "some properties...",
                                   action: function () {
                                       self.menuActions.pasteClipboardNodeProperties()
                                       ;
                                   },
                               }
                               ,*/
                            pasteDescendants: {
                                label: "<span class='blender_pasteNode'>descendants</span>",
                                action: function (obj, sss, cc) {
                                    self.menuActions.pasteClipboardNodeDescendants()
                                    ;
                                },
                            },
                            /*  pasteAsReference: {
                                  label: " reference",
                                  action: function (obj, sss, cc) {
                                      ExternalReferences.pasteAsReference()
                                      ;
                                  },
                              },*/

                            /*   pasteAscendants: {
                                   label: "ascendants",
                                   action: function (obj, sss, cc) {
                                       self.menuActions.pasteClipboardNodeAscendants()
                                       ;
                                   },
                               }*/
                        }

                    }

                } else if (clipboard.length > 0 && clipboard[0].type == "word") {
                    menuItems.pasteDescendants = {
                        label: " create concept " + Clipboard.getContent()[0].text,
                        action: function (obj, sss, cc) {
                            self.menuActions.createConceptFromWord()
                            ;
                        }

                    }
                }

                menuItems.editNode = {
                    label: "Edit node",
                    action: function (obj, sss, cc) {
                        self.nodeEdition.editNode("concept")
                    }
                }

                menuItems.deleteNode = {
                    label: "Delete node",
                    action: function (obj, sss, cc) {
                        self.menuActions.deleteNode("concept");
                    },


                }
                menuItems.addChildNodeNode = {
                    label: "Create child",
                    action: function (obj, sss, cc) {
                        self.nodeEdition.createChildNode(null, "concept");
                        ;
                    },
                }
                /*    menuItems.importChildren = {
                        label: "Import child nodes",
                        action: function (obj, sss, cc) {
                            Import.showImportNodesDialog("concept");
                            ;
                        },
                    }*/
                return menuItems;

            }


        }


        self.menuActions = {
            toCollection: function (event) {
                Collection.currentCandidateNode = self.currentTreeNode
                $("#Blender_tabs").tabs("option", "active", 1);
            },


            dropNode: function (callback) {
                var date = new Date();// sinon exécuté plusieurs fois!!!
                if (Blender.startDNDtime && date - Blender.startDNDtime < 2000)
                    return true;
                Blender.startDNDtime = date;
                if (!Blender.currentDNDoperation)
                    return;


                var newParentData = Blender.currentDNDoperation.parent.data;
                var nodeData = Blender.currentDNDoperation.node.data
                var oldParentData = common.jstree.getjsTreeNodeObj("Blender_conceptTreeDiv", Blender.currentDNDstartNodeParentId).data;
                //   var oldParentData = Blender.currentTreeNode.data;
                var broaderPredicate;


                if (!confirm("Confirm : move concept node and descendants :" + nodeData.label + "?")) {
                    return false
                }

                function execMoveQuery(subject, broaderPredicate, oldParentId, newParentId, callback) {
                    Sparql_generic.deleteTriples(self.currentSource, subject, broaderPredicate, oldParentId, function (err, result) {
                        if (err) {
                            return callback(err)
                        }
                        var triple = {subject: subject, predicate: broaderPredicate, object: newParentId, valueType: "uri"}
                        Sparql_generic.insertTriples(self.currentSource, [triple], function (err, result) {
                            if (err) {
                                callback(err)
                            }
                            callback()

                        })
                    })


                }

                function processCallBack(err, result) {
                    if (err) {
                        MainController.UI.message(err)
                        return false;
                    }
                    MainController.UI.message("node moved")
                    return true;
                }


                if (Config.sources[nodeData.source].schemaType.indexOf("SKOS")>-1) {

                    var broaderPredicate = "http://www.w3.org/2000/01/rdf-schema#subClassOf"
                    execMoveQuery(nodeData.id, broaderPredicate, oldParentData.id, newParentData.id, function (err, result) {
                        return processCallBack(err, result)
                    })
                } else if (Config.sources[nodeData.source].schemaType == "SKOS") {
                    if (nodeData.type == "http://www.w3.org/2004/02/skos/core#Collection") {
                        broaderPredicate = "http://www.w3.org/2004/02/skos/core#member"
                        Sparql_generic.deleteTriples(self.currentSource, oldParentData.id, broaderPredicate, nodeData.id, function (err, result) {
                            if (err) {
                                return processCallBack(err, result)
                            }
                            var triple = {subject: newParentData.id, predicate: broaderPredicate, object: nodeData.id, valueType: "uri"}
                            Sparql_generic.insertTriples(self.currentSource, [triple], function (err, result) {
                                if (err) {
                                    callback(err)
                                }
                                callback()

                            })
                            return processCallBack(err, result)
                        })
                    } else {
                        broaderPredicate = "http://www.w3.org/2004/02/skos/core#broader"
                        execMoveQuery(nodeData.id, broaderPredicate, oldParentData.id, newParentData.id, function (err, result) {
                            return processCallBack(err, result)
                        })
                    }
                } else {
                    return false;
                }


            },


           deleteNode: function (type) {
                if (!type)
                    alert(" no type")

                var node;
                var treeDivId;
                if (type == "concept") {
                    node = self.currentTreeNode
                    treeDivId = "Blender_conceptTreeDiv"
                } else if (type == "collection") {
                    node = Collection.currentTreeNode
                    treeDivId = "Blender_collectionTreeDiv"
                }
                var str = ""
                if (node.children.length > 0)
                    str = " and all its descendants"
                if (true || confirm("delete node " + node.data.label + str)) {

                    var nodeIdsToDelete = [node.data.id]
                    async.series([

                            function (callbackSeries) {// descendants of type concept
                                if (node.children.length == 0)
                                    return callbackSeries();
                                if (type != "concept")
                                    return callbackSeries();

                                Sparql_generic.getSingleNodeAllDescendants(self.currentSource, node.data.id, function (err, result) {
                                    if (err) {
                                        return callbackSeries(err);
                                    }
                                    var subjectsIds =
                                        result.forEach(function (item) {
                                            nodeIdsToDelete.push(item.narrower.value)
                                        })
                                    callbackSeries();
                                })
                            },
                            function (callbackSeries) {// descendants of type collection
                                if (node.children.length == 0)
                                    return callbackSeries();
                                if (type != "collection")
                                    return callbackSeries();


                                Collection.Sparql.getSingleNodeAllDescendants(self.currentSource, node.data.id, {onlyCollectionType: true}, function (err, result) {
                                    if (err) {
                                        return callbackSeries(err);
                                    }
                                    var subjectsIds =
                                        result.forEach(function (item) {
                                            nodeIdsToDelete.push(item.narrower.value)
                                        })
                                    callbackSeries();
                                })

                            },

                            function (callbackSeries) {
                                Sparql_generic.deleteTriples(self.currentSource, nodeIdsToDelete, null, null, function (err, result) {
                                    if (err) {
                                        return callbackSeries(err);
                                    }
                                    callbackSeries();
                                })
                            },
                            function (callbackSeries) {// delete members triple in parentNode
                                if (type == "concept")
                                    return callbackSeries();

                                Sparql_generic.deleteTriples(self.currentSource, node.parent, "http://www.w3.org/2004/02/skos/core#member", node.data.id, function (err, result) {
                                    if (err) {
                                        return callbackSeries(err);
                                    }
                                    callbackSeries();
                                })

                            },
                            function (callbackSeries) {// delete from tree
                                common.jstree.deleteNode(treeDivId, node.id)
                                if (type == "concept") {
                                    self.currentTreeNode = null;
                                } else if (type == "collection") {
                                    Collection.currentTreeNode = null
                                }
                                callbackSeries();
                            }
                        ],

                        function (err) {
                            if (err) {
                                return MainController.UI.message(err)
                            }
                            $("#waitImg").css("display", "none");
                            MainController.UI.message("nodes deleted " + nodeIdsToDelete.length)
                        }
                    )
                }
            },


            pasteClipboardNodeOnly: function (dataArray, options, callback) {
                if (!dataArray)
                    dataArray = Clipboard.getContent();
                if (!dataArray)
                    return;
                if (!options) {
                    options = {}
                }
                var oldId
                var newId
                var label

                var parentNodeId
                if (options.newParentId)
                    parentNodeId = options.newParentId;
                else
                    parentNodeId = self.currentTreeNode.data.id
                async.eachSeries(dataArray, function (data, callbackEach) {


                    if (data.type == "node") {// cf clipboard and annotator
                        var fromSource = data.source;
                        var toGraphUri = Config.sources[self.currentSource].graphUri
                        oldId = data.id;
                        newId = common.getNewUri(self.currentSource)
                        label = data.label;
                        var existingNodes = common.jstree.getjsTreeNodes("Blender_conceptTreeDiv")
                        var ok = true
                        var previousId;
                        existingNodes.forEach(function (item) {
                            if (item.data.label.toLowerCase() == data.label.toLowerCase()) {
                                previousId = item.data.id
                                ok = false;
                            }
                        })
                        if (!ok) {
                            alert("node " + data.label + " already exists")
                            if (callback)
                                return callback(null, previousId)
                        }

                        var additionalTriplesNt = []


                        if (Config.sources[self.currentSource].schemaType.indexOf("SKOS")>-1){
                            additionalTriplesNt.push("<" + newId + "> <http://www.w3.org/2004/02/skos/core#broader> <" + parentNodeId + ">.")
                            additionalTriplesNt.push("<" + newId + "> <http://www.w3.org/2004/02/skos/core#exactMatch> <" + oldId + ">.")
                        } else if (Config.sources[self.currentSource].schemaType == "OWL") {
                            additionalTriplesNt.push("<" + newId + "> <http://www.w3.org/2000/01/rdf-schema#subClassOf> <" + parentNodeId + ">.")
                            additionalTriplesNt.push("<" + newId + "> <http://www.w3.org/2002/07/owl#sameAs> <" + oldId + ">.")
                        } else
                            return alert("no schema")

                        //if source and target have different schma type we only copy minimum info else we copy all node triplets

                        if (Config.sources[self.currentSource].schemaType != Config.sources[fromSource].schemaType) {
                            if (Config.sources[self.currentSource].schemaType == "SKOS") {
                                additionalTriplesNt.push("<" + newId + "> <http://www.w3.org/2004/02/skos/core#prefLabel> '" + data.label + "'@en.")
                                additionalTriplesNt.push("<" + newId + "> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/2004/02/skos/core#Concept>.")
                            } else if (Config.sources[self.currentSource].schemaType == "OWL") {
                                additionalTriplesNt.push("<" + newId + "> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/2000/01/rdf-schema#Class>.")
                                additionalTriplesNt.push("<" + newId + "> <http://www.w3.org/2000/01/rdf-schema#label> '" + data.label + "'@en.")
                            }
                            Sparql_generic.insertTriples(self.currentSource, additionalTriplesNt, function (err, result) {
                                if (!err)
                                    $("#waitImg").css("display", "none");
                                MainController.UI.message(result + "new triples inserted")
                                callbackEach(err, newId)

                            })
                        } else {
                            var options = {
                                skipPredicates: ["http://www.w3.org/2004/02/skos/core#broader", "http://www.w3.org/2004/02/skos/core#narrower"],
                                additionalTriplesNt: additionalTriplesNt,
                                subjectNewUri: newId
                            }

                            Sparql_generic.copyNodes(fromSource, toGraphUri, oldId, options, function (err, result) {
                                if (!err)
                                    $("#waitImg").css("display", "none");
                                MainController.UI.message(result + "new triples inserted")
                                callbackEach(err, newId)

                            })
                        }
                    }
                }, function (err) {
                    $("#waitImg").css("display", "none");
                    if (err)
                        return MainController.UI.message(err);

                    if (options.newParentId)
                        ;
                    else {
                        var parentJstreeId = self.currentTreeNode.id

                        var jstreeData = [
                            {
                                id: newId,
                                text: label,
                                parent: parentJstreeId,
                                data: {
                                    type: "http://www.w3.org/2004/02/skos/core#Concept",
                                    source: self.currentSource,
                                    id: newId,
                                    label: label
                                }
                            }
                        ]
                        common.jstree.addNodesToJstree("Blender_conceptTreeDiv", parentJstreeId, jstreeData)
                    }

                    if (!callback)
                        Clipboard.clear();
                    else
                        return callback(null, newId)

                })


            }

            ,


            pasteClipboardNodeDescendants: function (callback) {
                var dataArray = Clipboard.getContent();
                if (!dataArray)
                    return;
                var totalNodesCount = 0

                async.eachSeries(dataArray, function (data, callbackEach) {

                        self.menuActions.pasteClipboardNodeOnly(null, null, function (err, newId) {

                            Clipboard.clear();

                            var existingNodeIds = common.jstree.getjsTreeNodes("Blender_conceptTreeDiv", true)
                            var fromSource = data.source;
                            var toGraphUri = Config.sources[self.currentSource].graphUri
                            var id = data.id;
                            var label = data.label;
                            var childrenIds = [id]
                            var currentDepth = 1;
                            var newParentId = newId

                            var copiedNodes = {}
                            async.whilst(
                                function test(cb) {
                                    return childrenIds.length > 0
                                },

                                function (callbackWhilst) {//iterate

                                    Sparql_generic.getNodeChildren(fromSource, null, childrenIds, 1, null, function (err, result) {
                                        if (err)
                                            return MainController.UI.message(err);
                                        childrenIds = []
                                        if (result.length == 0)
                                            return callbackWhilst();
                                        totalNodesCount += result.length
                                        var items = {}
                                        var dataArray = []
                                        result.forEach(function (item) {
                                            var childId = item["child" + currentDepth].value
                                            if (!copiedNodes[childId]) {
                                                copiedNodes[childId] = 1
                                                var childLabel = item["child" + currentDepth + "Label"].value
                                                dataArray.push({
                                                    type: "node",
                                                    id: childId,
                                                    label: childLabel,
                                                    newParentId: newParentId,
                                                    source: fromSource,
                                                    data: null
                                                })
                                            }
                                        })
                                        setTimeout(function () {
                                            self.menuActions.pasteClipboardNodeOnly(dataArray, {newParentId: newParentId}, function (err, result) {
                                                newParentId = result;
                                            }, 500)
                                        })

                                        callbackWhilst();

                                    })


                                }
                                , function (err) {
                                    if (err)
                                        callbackEach(err);
                                    callbackEach();
                                })
                        })
                    }, function (err) {
                        if (err)
                            return MainController.UI.message(err)
                        return MainController.UI.message("copied " + totalNodesCount + " nodes")
                    }
                )


            }


            ,
            setCopiedNodeObjectFn: function (item) {
                var newParent = self.currentTreeNode;
                if (item.prop.value == "http://www.w3.org/2004/02/skos/core#broader")
                    item.value.value = newParent.data.id;
                else if (item.prop.value == "http://www.w3.org/2000/01/rdf-schema#subClassOf") {
                    item.prop.value = "http://www.w3.org/2004/02/skos/core#broader"
                    item.value.value = newParent.data.id;
                }

                return item


            }
            ,
            setCopiedNodePredicateFn: function (item) {


                return item
            },

            /**
             *
             *  A FINIR
             *
             *
             * @param callback
             */
            /*    pasteClipboardNodeAscendants: function () {
                    var data = Clipboard.getContent();
                    if (!data)
                        return;

                    self.menuActions.pasteClipboardNodeOnly(function (err, result) {

                        var existingNodeIds = common.jstree.getjsTreeNodes("Blender_conceptTreeDiv", true)
                        var fromSource = data.source;
                        var toGraphUri = Config.sources[self.currentSource].graphUri
                        var id = data.id;
                        var label = data.label;
                        var depth = 8
                        Sparql_generic.getNodeParents(fromSource, null, id, depth, null, function (err, result) {
                            if (err)
                                return MainController.UI.message(err);
                            var childrenIds = []

                            if (result.length > 0) {
                                for (var i = 1; i <= depth; i++) {
                                    var items = {}
                                    result.forEach(function (item) {

                                        var parentId;
                                        if (item["broader" + i]) {
                                            if (i == 1) {
                                                parentId = id
                                            } else {
                                                parentId = item["broader" + (i - 1)].value;

                                            }
                                            var childId = item["broader" + i].value
                                            if (existingNodeIds.indexOf(childId) > -1)
                                                return
                                            childrenIds.push(childId)
                                            if (!items[parentId])
                                                items[parentId] = [];
                                            items[parentId].push(item)


                                        }


                                    })
                                    for (var parentId in items) {
                                        TreeController.drawOrUpdateTree("Blender_conceptTreeDiv", items[parentId], parentId, "broader" + i, null)
                                    }


                                }
                                Sparql_generic.copyNodes(fromSource, toGraphUri, childrenIds, {}, function (err, result) {
                                    if (err)
                                        return MainController.UI.message(err);


                                })


                            }
                            self.modified = true;

                        })


                    })

                }
                ,*/
            pasteClipboardNodeProperties: function () {
                var data = Clipboard.getContent();
                Clipboard.clear();
            }
            ,


            createConceptFromWord: function () {
                var data = Clipboard.getContent()[0];

                var initData = {"http://www.w3.org/2004/02/skos/core#prefLabel": [{"xml:lang": SourceEditor.prefLang, value: data.text, type: "literal"}]}
                self.nodeEdition.createChildNode(initData, "concept")
                Clipboard.clear()
            }
            ,


        }


        self.nodeEdition = {
            createSchemeOrCollection: function (type) {
                var skosType;
                if (type == "Scheme") {
                    skosType = "http://www.w3.org/2004/02/skos/core#ConceptScheme"
                    self.currentTreeNode = $("#Blender_conceptTreeDiv").jstree(true).get_node("#")
                    $("#Blender_tabs").tabs("option", "active", 0);
                } else if (type == "Collection") {

                    skosType = "http://www.w3.org/2004/02/skos/core#Collection"
                    Collection.currentTreeNode = $("#Blender_collectionTreeDiv").jstree(true).get_node("#")
                    $("#Blender_tabs").tabs("option", "active", 1);
                } else
                    return;

                if (!self.currentSource) {
                    return alert("select a source");
                }

                self.nodeEdition.openDialog()
                var initData = {
                    "http://www.w3.org/2004/02/skos/core#prefLabel":
                        [{"xml:lang": Config.sources[self.currentSource].prefLang || "en", value: "", type: "literal"}]
                }

                SourceEditor.editNewObject("Blender_nodeEditionDiv", self.currentSource, skosType, initData);

            }


            ,
           getSourceDefaultRdfType:function(){
                if(Config.sources[ self.currentSource].schemaType.indexOf("SKOS")>-1)
                    return "concept";
               if(Config.sources[ self.currentSource].schemaType.indexOf("OWL")>-1) {
                   return "class";
               }
               return null;

           },
            editNode: function (type) {
               /* if(!type)
                type=self.nodeEdition.getSourceDefaultRdfType();*/

                if (!type)
                    alert(" no type")


                if (type == "concept") {

                    var skosType = "http://www.w3.org/2004/02/skos/core#Concept"
                    if (self.displayMode == "centralPanelDiv") {
                        SourceEditor.editNode("Blender_nodeEditionContainerDiv", self.currentSource, self.currentTreeNode.data.id, skosType, false)
                    } else {
                        self.nodeEdition.openDialog()
                        SourceEditor.editNode("Blender_nodeEditionDiv", self.currentSource, self.currentTreeNode.data.id, skosType, false)
                    }

                } else if (type == "collection") {
                    self.nodeEdition.openDialog()
                    var type = "http://www.w3.org/2004/02/skos/core#Collection"
                    SourceEditor.editNode("Blender_nodeEditionDiv", self.currentSource, Collection.currentTreeNode.data.id, type, false)

                } else if (type == "class") {
                    var owlType = "http://www.w3.org/2000/01/rdf-schema#Class"
                    self.nodeEdition.openDialog()
                    SourceEditor.editNode("Blender_nodeEditionDiv", self.currentSource, self.currentTreeNode.data.id, owlType, false)

                }

                return true;


            }


            , createChildNode: function (initData, type) {
                if (!initData)
                    initData = {}
                var parentNode;
                var parentProperty;
                var mandatoryProps;
                var childClass;
                var treeDivId;


                if (type == "concept") {
                    parentNode = self.currentTreeNode;
                    parentProperty = OwlSchema.currentSourceSchema.newObject.treeParentProperty;
                    mandatoryProps = OwlSchema.currentSourceSchema.newObject.mandatoryProperties;
                    //childClass = OwlSchema.currentSourceSchema.newObject.treeChildrenClasses[parentNode.data.type];
                    treeDivId = 'Blender_conceptTreeDiv';
                    type = "http://www.w3.org/2004/02/skos/core#Concept"
                    if (self.currentTreeNode.data.type == "http://www.w3.org/2004/02/skos/core#ConceptScheme")
                        initData["http://www.w3.org/2004/02/skos/core#topConceptOf"] = [{value: self.currentTreeNode.data.id, type: "uri"}]
                    if (self.currentTreeNode.data.type == "http://www.w3.org/2004/02/skos/core#Concept")
                        initData["http://www.w3.org/2004/02/skos/core#broader"] = [{value: self.currentTreeNode.data.id, type: "uri"}]
                    initData["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"] = [{value: "http://www.w3.org/2004/02/skos/core#Concept", type: "uri"}]

                } else if (type == "collection") {
                    parentNode = Collection.currentTreeNode;
                    var type = "http://www.w3.org/2004/02/skos/core#Collection"
                    parentProperty = "^" + Collection.broaderProperty;
                    mandatoryProps = ["http://www.w3.org/2004/02/skos/core#prefLabel"]
                    childClass = "http://www.w3.org/2004/02/skos/core#Collection";
                    treeDivId = 'Blender_collectionTreeDiv';
                    initData["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"] = [{value: "http://www.w3.org/2004/02/skos/core#Collection", type: "uri"}]
                }

                mandatoryProps.forEach(function (item) {
                    if (!initData[item])
                        initData[item] = [{"xml:lang": SourceEditor.prefLang, value: "", type: "literal"}]
                })
                initData[parentProperty] = [{value: parentNode.data.id, type: "uri"}];


                if (self.displayMode == "centralPanelDiv") {

                    SourceEditor.editNode("Blender_nodeEditionContainerDiv", self.currentSource, type, initData);
                } else {
                    self.nodeEdition.openDialog()
                    SourceEditor.editNewObject("Blender_nodeEditionDiv", self.currentSource, type, initData);


                }

            },


            openDialog: function () {
                $("#Blender_PopupEditDiv").dialog("open")

                /*  $(".ui-dialog-titlebar-close").css("display", "none")*/
                $("#Blender_PopupEditButtonsDiv").css("display", "block")

            },

            saveEditingNode: function () {
                SourceEditor.saveEditingObject(function (err, editingObject) {
                    if (err) {
                        MainController.UI.message(err)
                    }
                    $("#Blender_nodeEditionButtonsDiv").css("display", "none")
                    $("#Blender_nodeEditionContainerDiv").html("")

                    if (editingObject.errors && editingObject.errors.length > 0) {
                        var errorsStr = ""
                        editingObject.errors.forEach(function (item) {
                            errorsStr += item + "."
                        })
                        alert(errorsStr)
                        return false;
                    }


                    var treeDiv, currentNodeId;
                    currentNodeId = "#"

                    if (editingObject.type.indexOf("Concept") > 0) {
                        treeDiv = 'Blender_conceptTreeDiv'
                        if (Blender.currentTreeNode)
                            currentNodeId = Blender.currentTreeNode.data.id

                    }
                    if (editingObject.type.indexOf("Collection") > 0) {
                        treeDiv = 'Blender_collectionTreeDiv'
                        if (Collection.currentTreeNode)
                            currentNodeId = Collection.currentTreeNode.data.id

                    }

                    // var parent = editingObject.parent || "#"
                    var parentNode = $("#" + treeDiv).jstree(true).get_selected(true)[0]
                    if (!parentNode)
                        parentNode = "#"
                    if (editingObject.isNew) {
                        editingObject.isNew = false;
                        var jsTreeData = [{
                            id: editingObject.about,
                            text: editingObject.nodeLabel,
                            parent: parentNode,
                            data: {type: editingObject.type, source: self.currentSource, id: editingObject.about, label: editingObject.nodeLabel}
                        }]


                        common.jstree.addNodesToJstree(treeDiv, parentNode, jsTreeData, {})
                        //  $("#" + treeDiv).jstree(true).open_node(currentNodeId);


                    } else {
                        if (editingObject.nodeLabel) {
                            var nodeJstreeId = $("#" + treeDiv).jstree(true).get_selected()[0]

                            $("#" + treeDiv).jstree(true).rename_node(nodeJstreeId, editingObject.nodeLabel)
                            /*   var parentNodeId = $("#" + treeDiv).jstree(true).get_selected(true)[0]
                               parentNodeId=parentNodeId.parent
                               $("#" + treeDiv).jstree(true).refresh_node(parentNodeId)*/

                            common.jstree.setTreeAppearance();
                        }
                    }
                    $("#Blender_PopupEditDiv").dialog("close")


                })
            }


            , cancelEditingNode: function () {
                $("#Blender_PopupEditDiv").dialog("close")
            }

        }


        self.searchTerm = function () {

            "Blender_conceptTreeDiv"
        }

        self.copyTriples = function () {

        }

        self.copyCsv = function () {
            var collection = Collection.currentCollectionFilter
            Sparql_generic.getCollectionNodes(self.currentSource, collection, {}, function (err, result) {
                if (err) {
                    if (callback)
                        return callback(err)
                    return (MainController.UI.message(err))
                }

                    var predicates=[]
                    var subjects={}
                    result.forEach(function(item){
                        if(!subjects[item.subject.value])
                            subjects[item.subject.value]={}
                        var value=item.object.value;
                        if(item.object["xml:lang"])
                            value=value+"@"+item.object["xml:lang"]
                        if( !subjects[item.subject.value][item.predicate.value])
                            subjects[item.subject.value][item.predicate.value]=[]
                        subjects[item.subject.value][item.predicate.value].push(value)

                        if(predicates.indexOf(item.predicate.value)<0)
                            predicates.push(item.predicate.value)


                    })
                    var line=0;
                    var str=""
                    var sep="\t"

                    predicates.splice(0,0,"uri")
                    predicates.forEach(function(predicate, predicateIndex) {

                        if (predicateIndex > 0)
                            str += sep
                        str += predicate;
                    })
                    str+="\n"

                    for( var key in subjects){
                        str+=key
                        predicates.forEach(function(predicate, predicateIndex) {

                        if (predicateIndex >0)
                            str += sep

                    var object=subjects[key][predicate]
                            if(object) {
                                var valueStr=""
                                object.forEach(function(value,valueIndex) {
                                    if(valueIndex>0)
                                        valueStr+="|"
                                if(subjects[value])
                                    valueStr+= value+"@"+subjects[value]["http://www.w3.org/2004/02/skos/core#prefLabel"]
                                    else
                                    valueStr+=value


                            })
                                str += valueStr
                            }
                            else
                                str+=""

                        })
                        str+="\n"

                    }

                var result = common.copyTextToClipboard(str,function(err,result){
                    if(err)
                        return MainController.UI.message(err);
                    MainController.UI.message(result);
                    alert( "filtered taxonomy CSV copied in clipboard")
                })



            })
        }
        self.showFilteredTaxonomyTree = function (callback) {


            var collection = Collection.currentCollectionFilter

            Sparql_generic.getCollectionNodes(self.currentSource, collection, {filter: {predicates: ["skos:prefLabel", "skos:broader"]}}, function (err, result) {
                if (err) {
                    if(callback)
                        return callback(err)
                    return (MainController.UI.message(err))
                }
                var jstreeData = []

                var dataMap = {}
                result.forEach(function (item) {
                    if (!dataMap[item.subject.value])
                        dataMap[item.subject.value] = {}
                    if (item.predicate.value.indexOf("#broader") > -1) {
                        dataMap[item.subject.value].broader = item.object.value
                    }
                    if (item.predicate.value.indexOf("#prefLabel") > -1) {
                        dataMap[item.subject.value].prefLabel = item.object.value
                    }
                })
                var orphanBroaders = []
                for (var key in dataMap) {
                    var id;
                    var jsTreeId
                    var parent;
                    var item = dataMap[key]
                    if (item.broader) {
                        jsTreeId = key + common.getRandomHexaId(3)
                        id = key
                        parent = item.broader
                        if (!dataMap[parent])
                            orphanBroaders.push(parent)
                    } else {
                        parent = "#"
                        jsTreeId = item.broader + common.getRandomHexaId(3)
                        id = key

                    }
                    jstreeData.push({
                        id: id,
                        text: item.prefLabel || "X",
                        parent: parent,
                        data: {source: self.currentSource, id: id, label: item.prefLabel}
                    })
                }

                 //   console.log(JSON.stringify(jstreeData, null, 2))
                    var jsTreeOptions = self.getConceptJstreeOptions(false)
                    jsTreeOptions.openAll = true;
                    common.jstree.loadJsTree("Blender_conceptTreeDiv", jstreeData, jsTreeOptions)
                $("#Blender_tabs").tabs("option", "active", 0);
                if(callback)
                    callback();
                })





        }

        return self;

    }
    ()
)
