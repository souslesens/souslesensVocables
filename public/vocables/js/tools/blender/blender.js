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
            // $("#sourceDivControlPanelDiv").html("")
        }


        self.initPanel = function () {
            if (isLoaded)
                return;


            $("#blenderPanelDiv").load("snippets/blender/blender.html")
            if (!MainController.currentTool)
                $("#graphDiv").html("")
            setTimeout(function () {
                    var editableSources = [];
                    for (var key in Config.sources) {

                        if(! Config.sources[key].controllerName) {
                            Config.sources[key].controllerName = ""+Config.sources[key].controller
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
                if(!MainController.currentTool)
                    self.moveTaxonomyPanel ("leftPanel")
                    isLoaded = true;


                }, 200
            )

        }


        self.onSourceSelect = function (source) {

            $("#Blender_conceptTreeDiv").html("");
            self.currentTreeNode = null;
            self.currentSource = null;
            $("#Blender_collectionTreeDiv").html("");
            $("#Blender_tabs").tabs("option", "active", 1);
            Collection.currentTreeNode = null;
            if (source == "") {
                return
            }


            self.currentSource = source


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
                            "sparql_url": Config.sources[source].sparql_url,// on the same server !!!
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
                        self.showTopConcepts(null, function (err, result) {
                            callbackSeries(err);
                        })


                    }
                    ,
                    function (callbackSeries) {
                        Collection.Sparql.getCollections(source, null, function (err, result) {
                            var jsTreeOptions = {};
                            jsTreeOptions.contextMenu = Collection.getJstreeContextMenu()
                            jsTreeOptions.selectNodeFn = Collection.selectNodeFn;
                            jsTreeOptions.onMoveNodeFn = Blender.dnd.moveNode;
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
            jsTreeOptions.contextMenu = Blender.getJstreeConceptsContextMenu()
            jsTreeOptions.selectNodeFn = Blender.selectNodeFn
            if (withDnd) {
                jsTreeOptions.onMoveNodeFn = Blender.dnd.moveNode
            }
            jsTreeOptions.dnd = self.dnd
            return jsTreeOptions;

        }

        self.dnd = {

            "drag_start": function (data, element, helper, event) {
                return true;
            },
            "drag_move": function (data, element, helper, event) {

                return true;


            },
            "drag_stop": function (data, element, helper, event) {
                if(!Blender.menuActions.movingNode || !Blender.menuActions.movingNode.data)
                    return false;
             var type=Blender.menuActions.movingNode.data.type;
             if(!type)
                 alert("no type")
                if (type == "concept") {
                    Blender.menuActions.dropNode()
                } else if (type == "collection") {
                    Collection.dropNode()
                }
                // return true;


                return false;


            },
            checkTreeOperations: function (operation, node, parent, position, more) {
                Blender.currentOperation = {operation: operation, node: node, parent: parent, position: position, more, more}

                return true;
            },
            moveNode: function (event, obj) {
                Blender.menuActions.movingNode = {id: obj.node.id, newParent: obj.parent, oldParent: obj.old_parent}
            },

        },


            self.selectNodeFn = function (event, propertiesMap) {
                if (propertiesMap) {
                    self.currentTreeNode = propertiesMap.node
                    $("#Blender_conceptTreeDiv").jstree(true).settings.contextmenu.items = self.getJstreeConceptsContextMenu()

                    var source = self.currentTreeNode.data.source || self.currentSource;
                    var type = self.currentTreeNode.data.type

                    var options = {type: type, labelClass: "treeType_" + type}
                    if (Collection.currentCollectionFilter)
                        options.filterCollections = Collection.currentCollectionFilter;
                    ThesaurusBrowser.openTreeNode("Blender_conceptTreeDiv", source, propertiesMap.node, options);

                    if (type == "externalReferenceTopConcept")
                        return;
                    if (propertiesMap.event.ctrlKey) {
                        if (Blender.displayMode == "centralPanel") {
                            self.nodeEdition.editNode("concept")
                        }
                        Clipboard.copy({
                            type: "node",
                            id: self.currentTreeNode.data.id,
                            label: self.currentTreeNode.text,
                            source: self.currentSource
                        }, self.currentTreeNode.data.id + "_anchor", propertiesMap.event)
                    }

                    if (self.currentTreeNode.children.length == 0)
                        ExternalReferences.openNarrowMatchNodes(self.currentSource, self.currentTreeNode)

                }
                //  $.jstree.defaults.contextmenu.items = self.getJstreeConceptsContextMenu();


            }


        self.getJstreeConceptsContextMenu = function () {
            var menuItems = {}
            if (!self.currentTreeNode || !self.currentTreeNode.data)
                return menuItems


            if (self.currentTreeNode.data.type == "externalReferenceTopConcept") {
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
            }

            var clipboard = Clipboard.getContent()
            if (clipboard.length > 0 && clipboard[0].type == "node") {
                menuItems.pasteNode = {
                    "label": "Paste...",
                    "separator_before": false,
                    "separator_after": true,

                    "action": false,
                    "submenu": {
                        pasteNode: {
                            label: "node",
                            action: function () {
                                self.menuActions.pasteClipboardNodeOnly();
                            }
                        },
                        pasteProperties: {
                            label: "some properties...",
                            action: function () {
                                self.menuActions.pasteClipboardNodeProperties()
                                ;
                            },
                        }
                        ,
                        pasteDescendants: {
                            label: " descendants",
                            action: function (obj, sss, cc) {
                                self.menuActions.pasteClipboardNodeDescendants()
                                ;
                            },
                        },
                        pasteAsReference: {
                            label: " reference",
                            action: function (obj, sss, cc) {
                                ExternalReferences.pasteAsReference()
                                ;
                            },
                        },

                        /*   pasteAscendants: {
                               label: "ascendants",
                               action: function (obj, sss, cc) {
                                   self.menuActions.pasteClipboardNodeAscendants()
                                   ;
                               },
                           }*/
                    }

                }

            } else if (clipboard && clipboard.type == "word") {
                menuItems.pasteDescendants = {
                    label: " create concept " + Clipboard.getContent().label,
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
                    self.nodeEdition.createChildNode(null,"concept");
                    ;
                },
            },
                menuItems.importChildren = {
                    label: "Import child nodes",
                    action: function (obj, sss, cc) {
                        Import.showImportNodesDialog("concept");
                        ;
                    },
                }

            return menuItems;

        }


        self.menuActions = {


            dropNode: function () {
                if (!self.menuActions.movingNode)
                    return;

                var newParent = self.menuActions.movingNode.newParent
                var oldParent = self.menuActions.movingNode.oldParent
                var id = self.menuActions.movingNode.id
                if (self.menuActions.lastDroppedNodeId == id)
                    return
                self.menuActions.lastDroppedNodeId = id;

                var node = $("#Blender_conceptTreeDiv").jstree(true).get_node(id)
                $("#Blender_conceptTreeDiv").jstree(true).open_node(newParent)
                if (!confirm("Confirm : move concept node and descendants :" + node.text + "?")) {
                    return
                }

                var broaderPredicate = "http://www.w3.org/2004/02/skos/core#broader"


                Sparql_generic.deleteTriples(self.currentSource, id, broaderPredicate, oldParent, function (err, result) {
                    if (err) {
                        return MainController.UI.message(err)
                    }
                    var triple = {subject: id, predicate: broaderPredicate, object: newParent, valueType: "uri"}
                    Sparql_generic.insertTriples(self.currentSource, [triple], function (err, result) {
                        if (err) {
                            return MainController.UI.message(err)
                        }
                    })
                })

            },


            deleteNode: function (type) {
                if (!type)
                    alert(" no type")

                var node;
                var treeDivId;
                if (  type == "concept") {
                    node = self.currentTreeNode
                    treeDivId = "Blender_conceptTreeDiv"
                } else  if (  type == "collection") {
                    node = Collection.currentTreeNode
                    treeDivId = "Blender_collectionTreeDiv"
                }
                var str = ""
                if (node.children.length > 0)
                    str = " and all its descendants"
                if (confirm("delete node " + node.text + str)) {

                    var nodeIdsToDelete = [node.id]
                    async.series([

                            function (callbackSeries) {// descendants of type concept
                                if (node.children.length == 0)
                                    return callbackSeries();
                               if (  type != "concept")
                                    return callbackSeries();

                                Sparql_generic.getSingleNodeAllDescendants(self.currentSource, node.id, function (err, result) {
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
                                if (  type != "collection")
                                    return callbackSeries();


                                Collection.Sparql.getSingleNodeAllDescendants(self.currentSource, node.id, function (err, result) {
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
                                if (  type == "concept")
                                    return callbackSeries();

                                Sparql_generic.deleteTriples(self.currentSource, node.parent, "http://www.w3.org/2004/02/skos/core#member", node.id, function (err, result) {
                                    if (err) {
                                        return callbackSeries(err);
                                    }
                                    callbackSeries();
                                })

                            },
                            function (callbackSeries) {// delete from tree
                                common.deleteNode(treeDivId, node.id)
                                if(  type == "concept")  {
                                    self.currentTreeNode = null;
                                } else if (  type == "collection")  {
                                    Collection.currentTreeNode = null
                                }
                                callbackSeries();
                            }
                        ],

                        function (err) {
                            if (err) {
                                return MainController.UI.message(err)
                            }
                            MainController.UI.message("nodes deleted " + nodeIdsToDelete.length)
                        }
                    )
                }
            },


            pasteClipboardNodeOnly:

                function (callback) {
                    var dataArray = Clipboard.getContent();
                    if (!dataArray)
                        return;
                    async.eachSeries(dataArray, function (data, callbackEach) {


                        if (data.type == "node") {// cf clipboard and annotator
                            var fromSource = data.source;
                            var toGraphUri = Config.sources[self.currentSource].graphUri
                            var id = data.id;
                            var label = data.label;
                            var existingNodeIds = common.getjsTreeNodes("Blender_conceptTreeDiv", true)
                            if (existingNodeIds.indexOf(id) > -1) {
                                MainController.UI.message("node " + id + " already exists")
                                if (callback)
                                    return callback(null)
                            }
                            Sparql_generic.copyNodes(fromSource, toGraphUri, id, {setObjectFn: Blender.menuActions.setCopiedNodeObjectFn}, function (err, result) {
                                if (err)
                                    return MainController.UI.message(err);
                                var jstreeData = [{id: id, text: label, parent: self.currentTreeNode.data.id, data: {type: "http://www.w3.org/2004/02/skos/core#Concept"}}]
                                common.addNodesToJstree("Blender_conceptTreeDiv", self.currentTreeNode.data.id, jstreeData)
                                callbackEach()

                            })
                        }
                    }, function (err) {
                        if (!callback)
                            Clipboard.clear();
                        else
                            return callback(null)

                    })


                }

            ,
            setCopiedNodeObjectFn: function (item) {
                var newParent = self.currentTreeNode;
                if (item.prop.value == "http://www.w3.org/2004/02/skos/core#broader")
                    item.value.value = newParent.id;
                return item


            }
            ,


            pasteClipboardNodeDescendants: function (callback) {
                var dataArray = Clipboard.getContent();
                if (!dataArray)
                    return;
                var totalNodesCount = 0
                async.eachSeries(dataArray, function (data, callbackEach) {

                    self.menuActions.pasteClipboardNodeOnly(function (err, result) {

                        Clipboard.clear();

                        var existingNodeIds = common.getjsTreeNodes("Blender_conceptTreeDiv", true)
                        var fromSource = data.source;
                        var toGraphUri = Config.sources[self.currentSource].graphUri
                        var id = data.id;
                        var label = data.label;
                        var depth = 3
                        var childrenIds = [id]
                        var currentDepth = 1

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
                                    result.forEach(function (item) {

                                        var parentId;
                                        if (item["child" + currentDepth]) {

                                            parentId = item.concept.value;

                                            var childId = item["child" + currentDepth].value
                                            if (existingNodeIds.indexOf(childId) > -1) {

                                                return MainController.UI.message("node " + id + " already exists")
                                            }

                                            childrenIds.push(childId)
                                            if (!items[parentId])
                                                items[parentId] = [];
                                            items[parentId].push(item)
                                        }

                                    })


                                    Sparql_generic.copyNodes(fromSource, toGraphUri, childrenIds, {}, function (err, result) {
                                        if (err)
                                            return callbackWhilst(err)
                                        for (var parentId in items) {
                                            TreeController.drawOrUpdateTree("Blender_conceptTreeDiv", items[parentId], parentId, "child" + currentDepth, null)
                                        }

                                        callbackWhilst();

                                    })


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
                })


            }


            /**
             *
             *  A FINIR
             *
             *
             * @param callback
             */
            ,
            pasteClipboardNodeAscendants: function () {
                var data = Clipboard.getContent();
                if (!data)
                    return;

                self.menuActions.pasteClipboardNodeOnly(function (err, result) {

                    var existingNodeIds = common.getjsTreeNodes("Blender_conceptTreeDiv", true)
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
            ,
            pasteClipboardNodeProperties: function () {
                var data = Clipboard.getContent();
                Clipboard.clear();
            }
            ,


            createConceptFromWord: function () {
                var data = Clipboard.getContent();
                var initData = {"http://www.w3.org/2004/02/skos/core#prefLabel": [{"xml:lang": SourceEditor.prefLang, value: data.label, type: "literal"}]}
                self.nodeEdition.createChildNode(initData,"concept")
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
            editNode: function (type) {
                if (!type)
                    alert(" no type")


                if (type == "concept") {

                    var skosType = "http://www.w3.org/2004/02/skos/core#Concept"
                    if (self.displayMode == "centralPanel") {
                        SourceEditor.editNode("Blender_nodeEditionContainerDiv", self.currentSource, self.currentTreeNode.data.id, skosType, false)
                    } else {
                        self.nodeEdition.openDialog()
                        SourceEditor.editNode("Blender_nodeEditionDiv", self.currentSource, self.currentTreeNode.data.id, skosType, false)
                    }

                } else if (type == "collection") {
                    self.nodeEdition.openDialog()
                    var type = "http://www.w3.org/2004/02/skos/core#Collection"
                    SourceEditor.editNode("Blender_nodeEditionDiv", self.currentSource, Collection.currentTreeNode.data.id, type, false)
                }

                return true;


            }


            , createChildNode: function (initData,type) {
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
                    childClass = OwlSchema.currentSourceSchema.newObject.treeChildrenClasses[parentNode.data.type];
                    treeDivId = 'Blender_conceptTreeDiv';
                    type = "http://www.w3.org/2004/02/skos/core#Concept"
                    if (self.currentTreeNode.data.type == "http://www.w3.org/2004/02/skos/core#ConceptScheme")
                        initData["http://www.w3.org/2004/02/skos/core#topConceptOf"] = [{value: self.currentTreeNode.data.id, type: "uri"}]

                } else if (type == "collection") {
                    parentNode = Collection.currentTreeNode;
                    var type = "http://www.w3.org/2004/02/skos/core#Collection"
                    parentProperty = "^" + Collection.broaderProperty;
                    mandatoryProps = ["http://www.w3.org/2004/02/skos/core#prefLabel"]
                    childClass = "http://www.w3.org/2004/02/skos/core#Collection";
                    treeDivId = 'Blender_collectionTreeDiv';
                }

                mandatoryProps.forEach(function (item) {
                    if (!initData[item])
                        initData[item] = [{"xml:lang": SourceEditor.prefLang, value: "", type: "literal"}]
                })
                initData[parentProperty] = [{value: parentNode.id, type: "uri"}];


                if (self.displayMode == "centralPanel") {

                    SourceEditor.editNode("Blender_nodeEditionContainerDiv",self.currentSource,type, childClass, initData);
                } else {
                    self.nodeEdition.openDialog()
                    SourceEditor.editNewObject("Blender_nodeEditionDiv", self.currentSource,type, childClass, initData);
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
                    $("#Blender_nodeEditionButtonsDiv").css("display","none")
                    $("#Blender_nodeEditionContainerDiv").html("")
                    if (self.nodeEdition.afterSaveEditingObject(editingObject))
                        $("#Blender_PopupEditDiv").dialog("close")
                })
            }
            ,


            afterSaveEditingObject: function (editingObject) {

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
                if (editingObject.type.indexOf("Concept")>0) {
                    treeDiv = 'Blender_conceptTreeDiv'
                    if (Blender.currentTreeNode)
                        currentNodeId = Blender.data.currentTreeNode.data.id
                }
                    if (editingObject.type.indexOf("Collection")>0) {
                    treeDiv = 'Blender_collectionTreeDiv'
                    if (Collection.currentTreeNode)
                        currentNodeId = Collection.currentTreeNode.data.id
                }

                var parent = editingObject.parent || "#"
                if (editingObject.isNew) {
                    editingObject.isNew = false;
                    var jsTreeData = [{
                        id: editingObject.about,
                        text: editingObject.nodeLabel,
                        parent: currentNodeId,
                        data: {type: editingObject.type}
                    }]


                    var parentNode = $("#" + treeDiv).jstree(true).get_selected("#")
                    if (parentNode)
                        common.addNodesToJstree(treeDiv, currentNodeId, jsTreeData, {})
                    else
                        common.loadJsTree("#" + treeDiv, jsTreeData, null)


                } else {
                    if (editingObject.nodeLabel) {
                        $("#" + treeDiv).jstree(true).rename_node(currentNodeId, editingObject.nodeLabel)
                        common.setTreeAppearance();
                    }
                }
                return true;

            }
            , cancelEditingNode: function () {
                $("#Blender_PopupEditDiv").dialog("close")
            }

        }


        self.moveTaxonomyPanel = function (fromMode) {
            if (fromMode)
                self.displayMode = fromMode
            if (self.displayMode == "leftPanel") {
                self.displayMode = "centralPanel"
                $("#Blender_tabs").tabs("disable", 0);

              MainController.UI.showInCentralPanelDiv("blendDiv")

                setTimeout(function () {
                    var treeElement = $('#Blender_conceptTreeDiv').detach();
                    $('#Blender_conceptTreeContainerDiv').append(treeElement);
                    $('#Blender_conceptTreeDiv').height($(window).height() - 100)
                    if (Collection.currentTreeNode) {
                        var html = ("<div  class='blender_collectionFilter' onclick='Collection.removeTaxonomyFilter()'>" + Collection.currentTreeNode.text + "</div>")
                        $('#Blender_collectionFilterContainerDiv').html("Collection" + Collection.currentTreeNode.text);
                    }

                    500
                })

            } else {
                self.displayMode = "leftPanel"
                $("#Blender_tabs").tabs("enable", 0);
                var treeElement = $('#Blender_conceptTreeDiv').detach();
                   $('#Blender_tabs_concepts').html(treeElement);
                MainController.UI.showInCentralPanelDiv("graphDiv")





                $('#graphDiv').html("")
            }
        }

        self.searchTerm=function(){

            "Blender_conceptTreeDiv"
        }


        return self;

    }
    ()
)
