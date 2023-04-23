import common from "../../common.js";
import TreeController from "../../treeController.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import OwlSchema from "../owlSchema.js";
import Collection from "./collection.js";
import Clipboard from "../../clipboard.js";
import SourceBrowser from "../sourceBrowser.js";

/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var Blender = (function () {
    var self = {};
    /**
     * @type {never[]}
     */
    self.modifiedNodes = [];
    self.tempGraph;
    /**
     * @type {string[]}
     */
    self.availableSources = [];
    self.currentSource;
    self.currentTab = 0;
    self.backupSource = false; // using  a clone of source graph
    self.displayMode = "leftPanel";

    self.onLoaded = function (/** @type {() => void} */ callback) {
        MainController.UI.message("");

        MainController.UI.showHideRightPanel();
        if (!MainController.currentTool) $("#graphDiv").html("");
        $("#rightPanelDiv").load("snippets/blender/blender.html", function () {
            var displayCreateDeleteResourceDiv = "none";
            if (authentication.currentUser.groupes.indexOf("admin") > -1) {
                displayCreateDeleteResourceDiv = "block";
            }
            $("#Blender_createDeleteResourceDiv").css("display", displayCreateDeleteResourceDiv);

            $.ajax({
                type: "GET",
                url: Config.apiUrl + "/blenderSources",
                dataType: "json",
                success: function (data, _textStatus, _jqXHR) {
                    for (var key in data.resources) {
                        Config.sources[key] = data.resources[key];
                    }

                    self.availableSources = [];
                    for (key in Config.sources) {
                        if (Config.sources[key].editable && Config.sources[key].schemaType == "SKOS") {
                            self.availableSources.push(key);
                            if (!Config.sources[key].controllerName) {
                                Config.sources[key].controllerName = "" + Config.sources[key].controller;
                                Config.sources[key].controller = eval(Config.sources[key].controller);
                            }
                            if (Config.sources[key].sparql_server.url == "_default") Config.sources[key].sparql_server.url = Config.default_sparql_url;
                        }
                    }

                    common.fillSelectOptions("Blender_SourcesSelect", self.availableSources.sort(), true);
                    $("#Blender_PopupEditDiv").dialog({
                        autoOpen: false,
                        height: 600,
                        width: 600,
                        modal: true,
                    });
                    $("#Blender_tabs").tabs({
                        activate: function (/** @type {any} */ _event, /** @type {any} */ _ui) {
                            self.currentTab = $("#Blender_tabs").tabs("option", "active");
                        },
                    });
                    if (callback) return callback();
                },
                error: function (err) {
                    alert("cannot load blender Sources");
                    // eslint-disable-next-line no-console
                    console.log(err);
                },
            });
        });
    };

    self.onSourceSelect = function (/** @type {string} */ source, /** @type {(arg0: any) => void} */ callback) {
        $("#Blender_conceptTreeDiv").html("");
        self.currentTreeNode = null;
        self.currentSource = null;
        $("#Blender_collectionTreeDiv").html("");
        Collection.removeTaxonomyFilter();
        $("#Blender_tabs").tabs("option", "active", 0);
        Collection.currentTreeNode = null;
        if (source == "") {
            return;
        }

        self.currentSource = source;

        async.series(
            [
                function (/** @type {(arg0: any) => void} */ callbackSeries) {
                    OwlSchema.initSourceSchema(source, function (/** @type {any} */ err, /** @type {any} */ _result) {
                        callbackSeries(err);
                    });
                },

                function (/** @type {(arg0: undefined) => void} */ callbackSeries) {
                    if (!self.backupSource) {
                        Config.sources[source].controller = eval(Config.sources[source].controller);
                        return callbackSeries();
                    }
                    self.currentSource = "_blenderTempSource";
                    Config.sources[self.currentSource] = {
                        controller: Sparql_generic,
                        sparql_url: Config.sources[source].sparql_server.url, // on the same server !!!
                        graphUri: "http://souslesens/_backup/" + source,
                        schema: "SKOS",
                        predicates: {
                            lang: "en",
                        },
                    };

                    Sparql_generic.copyGraph(source, Config.sources[self.currentSource].graphUri, function (/** @type {any} */ err, /** @type {any} */ _result) {
                        callbackSeries(err);
                    });
                },

                function (/** @type {(arg0: any) => void} */ callbackSeries) {
                    if (Blender.currentSource)
                        if (Config.Blender.openTaxonomyTreeOnLoad && Config.sources[self.currentSource].schemaType.indexOf("SKOS") > -1) {
                            self.showFilteredTaxonomyTree(Config.Blender.openTaxonomyTreeOnLoad, function (/** @type {any} */ err, /** @type {any} */ _result) {
                                callbackSeries(err);
                            });
                        } else {
                            self.showTopConcepts(null, function (/** @type {any} */ err, /** @type {any} */ _result) {
                                callbackSeries(err);
                            });
                        }
                },
                function (/** @type {(arg0: any) => void} */ callbackSeries) {
                    Collection.Sparql.getCollections(source, null, function (/** @type {any} */ err, /** @type {any} */ result) {
                        var jsTreeOptions = {};
                        jsTreeOptions.contextMenu = Collection.getJstreeContextMenu();
                        jsTreeOptions.selectTreeNodeFn = Collection.selectTreeNodeFn;
                        jsTreeOptions.source = source;
                        jsTreeOptions.dnd = Blender.dnd;
                        jsTreeOptions.type = "collection";
                        TreeController.drawOrUpdateTree("Blender_collectionTreeDiv", result, "#", "collection", jsTreeOptions, function () {
                            var firstNodeId = $("#Blender_collectionTreeDiv").jstree(true).get_node("#").children[0];
                            var firstNode = $("#Blender_collectionTreeDiv").jstree(true).get_node(firstNodeId);

                            Collection.openTreeNode("Blender_collectionTreeDiv", Blender.currentSource, firstNode);

                            callbackSeries(err);
                        });
                    });
                },
            ],
            function (/** @type {any} */ err) {
                if (callback) callback(err);
                if (err) return MainController.UI.message(err);
            }
        );
    };

    self.copyGraph = function () {
        if (!self.currentSource) {
            return MainController.UI.message("select a source");
        }

        var newGraphUri = prompt("newGraphUri");
        if (newGraphUri && newGraphUri != "")
            Sparql_generic.copyGraph(self.currentSource, newGraphUri, function (/** @type {any} */ err, /** @type {any} */ _result) {
                if (err) return MainController.UI.message(err);
                MainController.UI.message("graph Copied");
            });
    };

    self.showTopConcepts = function (/** @type {any} */ collectionIds, /** @type {(arg0: undefined) => any} */ callback) {
        var options = {};
        if (collectionIds) options.filterCollections = collectionIds;
        Sparql_generic.getTopConcepts(self.currentSource, options, function (/** @type {any} */ err, /** @type {any} */ result) {
            if (err) {
                MainController.UI.message(err);
                return callback(err);
            }
            var jsTreeOptions = self.getConceptJstreeOptions(true);
            TreeController.drawOrUpdateTree("Blender_conceptTreeDiv", result, "#", "topConcept", jsTreeOptions);
            return callback();
        });
    };
    self.getConceptJstreeOptions = function (/** @type {any} */ withDnd) {
        var jsTreeOptions = {};
        jsTreeOptions.source = self.currentSource;
        jsTreeOptions.contextMenu = Blender.getJstreeConceptsContextMenu();
        jsTreeOptions.selectTreeNodeFn = Blender.selectTreeNodeFn;
        if (withDnd) {
            jsTreeOptions.dropAllowedFn = Blender.dnd.dropAllowed;
            jsTreeOptions.dnd = self.dnd;
        }

        return jsTreeOptions;
    };

    (self.dnd = {
        drag_start: function (/** @type {any} */ _data, /** @type {{ data: { nodes: any[]; }; }} */ element, /** @type {any} */ _helper, /** @type {any} */ _event) {
            // Blender.currentDNDstartNodeParentId=Blender.currentTreeNode.parent
            Blender.currentDNDstartNodeId = element.data.nodes[0];

            Blender.currentDNDstartNode = common.jstree.getjsTreeNodeObj("Blender_conceptTreeDiv", Blender.currentDNDstartNodeId);
            Blender.currentDNDstartNodeParentId = Blender.currentDNDstartNode.parent;

            return true;
        },
        drag_move: function (/** @type {any} */ _data, /** @type {any} */ _element, /** @type {any} */ _helper, /** @type {any} */ _event) {
            return false;
        },
        drag_stop: function (/** @type {any} */ _data, /** @type {any} */ _element, /** @type {any} */ _helper, /** @type {any} */ _event) {
            if (!Blender.currentDNDoperation) return false;
            var currentNodeLevel = Blender.currentDNDoperation.parent.parents.length;
            var allowedLevels = Config.currentProfile.blender.contextMenuActionStartLevel;
            if (currentNodeLevel < allowedLevels) return false;

            Blender.menuActions.dropNode(function (/** @type {any} */ _err, /** @type {any} */ _result) {
                return true;
            });
            return true;
        },
        dropAllowed: function (/** @type {any} */ operation, /** @type {any} */ node, /** @type {any} */ parent, /** @type {any} */ position, /** @type {any} */ more) {
            var currentNodeLevel = Blender.currentDNDstartNode.parents.length;
            var allowedLevels = Config.currentProfile.blender.contextMenuActionStartLevel;
            if (currentNodeLevel < allowedLevels) return false;
            // eslint-disable-next-line no-console
            console.log(operation);
            Blender.currentDNDoperation = {
                operation: operation,
                node: node,
                parent: parent,
                position: position,
                more,
            };

            return true;
        },
    }),
        (self.selectTreeNodeFn = function (/** @type {any} */ _event, /** @type {{ node: any; event: { ctrlKey: any; }; }} */ propertiesMap) {
            if (propertiesMap) {
                self.currentTreeNode = propertiesMap.node;
                $("#Blender_conceptTreeDiv").jstree(true).settings.contextmenu.items = self.getJstreeConceptsContextMenu();

                var source = self.currentTreeNode.data.source || self.currentSource;
                var type = self.currentTreeNode.data.type;

                var options = { source: source, labelClass: "treeType_" + type, reopen: true };
                if (Collection.currentCollectionFilter) options.filterCollections = Collection.currentCollectionFilter;

                SourceBrowser.openTreeNode("Blender_conceptTreeDiv", source, propertiesMap.node, options);

                if (type == "externalReferenceTopConcept") return;
                if (propertiesMap.event.ctrlKey) {
                    if (Blender.displayMode == "centralPanelDiv") {
                        self.nodeEdition.editNode("subject");
                    }
                    Clipboard.copy(
                        {
                            id: self.currentTreeNode.data.id,
                            label: self.currentTreeNode.text,
                            source: self.currentSource,
                            type: "subject",
                        },
                        self.currentTreeNode.data.id + "_anchor",
                        propertiesMap.event
                    );
                }
            }
        });

    self.getJstreeConceptsContextMenu = function () {
        var menuItems = {};
        $(".vakata-context jstree-contextmenu").css("z-index", "6");

        if (!self.currentTreeNode || !self.currentTreeNode.data) return menuItems;

        var currentNodeLevel = self.currentTreeNode.parents.length;
        var allowedLevels = Config.currentProfile.blender.contextMenuActionStartLevel;

        if (currentNodeLevel < allowedLevels) {
            menuItems.forbidden = {
                label: "!...",
                action: function (/** @type {any} */ _obj, /** @type {any} */ _sss, /** @type {any} */ _cc) {
                    alert("Modifications not allowed at this level");
                },
            };
            menuItems.nodeInfos = {
                label: "Show Node infos",
                action: function (/** @type {any} */ _obj, /** @type {any} */ _sss, /** @type {any} */ _cc) {
                    SourceBrowser.showNodeInfos(self.currentTreeNode.data.source, self.currentTreeNode, "mainDialogDiv");
                },
            };
            return menuItems;
        } else {
            var clipboard = Clipboard.getContent();
            //if (true || clipboard.length == 0) {
            menuItems.toCollection = {
                label: "<span class='blender_assignCollection'>to Collection</span>",
                action: function (/** @type {any} */ e) {
                    // pb avec source
                    Blender.menuActions.toCollection(e);
                },
            };
            //}

            if (clipboard.length > 0 && clipboard[0].type == "node") {
                menuItems.pasteNode = {
                    label: "<span class='blender_pasteNode'>Paste...</span>",
                    separator_before: false,
                    separator_after: true,

                    action: false,
                    submenu: {
                        pasteNode: {
                            label: "<span class='blender_pasteNode'>node</span>",
                            action: function () {
                                self.menuActions.pasteClipboardNodes(null, 0);
                            },
                        },
                        pasteDescendants: {
                            label: "<span class='blender_pasteNode'>descendants</span>",
                            action: function (/** @type {any} */ _obj, /** @type {any} */ _sss, /** @type {any} */ _cc) {
                                self.menuActions.pasteClipboardNodes(null, Config.Blender.pasteDescendantsMaxDepth);
                            },
                        },
                    },
                };
            } else if (clipboard.length > 0 && clipboard[0].type == "word") {
                menuItems.pasteDescendants = {
                    label: " create concept " + Clipboard.getContent()[0].text,
                    action: function (/** @type {any} */ _obj, /** @type {any} */ _sss, /** @type {any} */ _cc) {
                        self.menuActions.createConceptFromWord();
                    },
                };
            }

            menuItems.editNode = {
                label: "Edit node",
                action: function (/** @type {any} */ _obj, /** @type {any} */ _sss, /** @type {any} */ _cc) {
                    self.nodeEdition.editNode("subject");
                },
            };

            menuItems.deleteNode = {
                label: "Delete node",
                action: function (/** @type {any} */ _obj, /** @type {any} */ _sss, /** @type {any} */ _cc) {
                    self.menuActions.deleteNode("subject");
                },
            };

            menuItems.copyNode = {
                label: "Copy Node",
                action: function (/** @type {any} */ _obj, /** @type {any} */ _sss, /** @type {any} */ _cc) {
                    self.menuActions.copyNode("subject");
                },
            };

            menuItems.cutNode = {
                label: "Cut Node",
                action: function (/** @type {any} */ _obj, /** @type {any} */ _sss, /** @type {any} */ _cc) {
                    self.menuActions.cutNode("subject");
                },
            };

            menuItems.addChildNodeNode = {
                label: "Create child",
                action: function (/** @type {any} */ _obj, /** @type {any} */ _sss, /** @type {any} */ _cc) {
                    self.nodeEdition.createChildNode(null, "subject");
                },
            };
            /*     menuItems.openBranch = {
                         label: "Open Branch, depth :3",
                         action: function (obj, sss, cc) {
                             SourceBrowser.openTreeNode("Blender_conceptTreeDiv", self.currentSource, self.currentTreeNode, {depth:3,reopen:true});
                             ;
                         },
                     }*/

            $("#Blender_conceptTreeDiv").jstree().deselect_node(self.currentTreeNode);
            return menuItems;
        }
    };

    self.menuActions = {
        toCollection: function (/** @type {any} */ _event) {
            Collection.currentCandidateNode = self.currentTreeNode;
            $("#Blender_tabs").tabs("option", "active", 1);
        },

        dropNode: function (/** @type {(arg0: undefined) => void} */ callback) {
            var date = new Date(); // sinon exécuté plusieurs fois!!!
            if (Blender.startDNDtime && date - Blender.startDNDtime < 2000) return true;
            Blender.startDNDtime = date;
            if (!Blender.currentDNDoperation) return;

            var newParentData = Blender.currentDNDoperation.parent.data;
            var nodeData = Blender.currentDNDoperation.node.data;
            var oldParentData = common.jstree.getjsTreeNodeObj("Blender_conceptTreeDiv", Blender.currentDNDstartNodeParentId).data;
            //   var oldParentData = Blender.currentTreeNode.data;
            /**
             * @type {string}
             */
            var broaderPredicate;

            if (!confirm("Confirm : move concept node and descendants :" + nodeData.label + "?")) {
                return false;
            }

            /**
             * @param {any} subject
             * @param {string} broaderPredicate
             * @param {any} oldParentId
             * @param {any} newParentId
             * @param {{ (err: any, result: any): boolean; (err: any, result: any): boolean; (arg0: undefined): void; }} callback
             */
            function execMoveQuery(subject, broaderPredicate, oldParentId, newParentId, callback) {
                Sparql_generic.deleteTriples(self.currentSource, subject, broaderPredicate, oldParentId, function (/** @type {any} */ err, /** @type {any} */ _result) {
                    if (err) {
                        return callback(err);
                    }
                    var triple = {
                        subject: subject,
                        predicate: broaderPredicate,
                        object: newParentId,
                        valueType: "uri",
                    };
                    Sparql_generic.insertTriples(self.currentSource, [triple], null, function (/** @type {any} */ err, /** @type {any} */ _result) {
                        if (err) {
                            callback(err);
                        }
                        callback();
                    });
                });
            }

            /**
             * @param {any} err
             * @param {any} _result
             */
            function processCallBack(err, _result) {
                if (err) {
                    MainController.UI.message(err);
                    return false;
                }
                MainController.UI.message("node moved");
                return true;
            }

            if (Config.sources[nodeData.source].schemaType.indexOf("SKOS") > -1) {
                broaderPredicate = "http://www.w3.org/2000/01/rdf-schema#subClassOf";
                execMoveQuery(nodeData.id, broaderPredicate, oldParentData.id, newParentData.id, function (/** @type {any} */ err, /** @type {any} */ result) {
                    return processCallBack(err, result);
                });
            } else if (Config.sources[nodeData.source].schemaType == "SKOS") {
                if (nodeData.type == "http://www.w3.org/2004/02/skos/core#Collection") {
                    broaderPredicate = "http://www.w3.org/2004/02/skos/core#member";
                    Sparql_generic.deleteTriples(self.currentSource, oldParentData.id, broaderPredicate, nodeData.id, function (/** @type {any} */ err, /** @type {any} */ result) {
                        if (err) {
                            return processCallBack(err, result);
                        }
                        var triple = {
                            subject: newParentData.id,
                            predicate: broaderPredicate,
                            object: nodeData.id,
                            valueType: "uri",
                        };
                        Sparql_generic.insertTriples(self.currentSource, [triple], null, function (/** @type {any} */ err, /** @type {any} */ _result) {
                            if (err) {
                                callback(err);
                            }
                            callback();
                        });
                        return processCallBack(err, result);
                    });
                } else {
                    broaderPredicate = "http://www.w3.org/2004/02/skos/core#broader";
                    execMoveQuery(nodeData.id, broaderPredicate, oldParentData.id, newParentData.id, function (/** @type {any} */ err, /** @type {any} */ result) {
                        return processCallBack(err, result);
                    });
                }
            } else {
                return false;
            }
        },

        deleteNode: function (/** @type {string} */ type, /** @type {{ children: string | any[]; data: { label: string; id: any; }; parent: any; id: any; }} */ node, /** @type {any} */ silently) {
            if (!type) alert(" no type");

            node;
            /**
             * @type {string}
             */
            var treeDivId;

            if (type == "subject") {
                if (!node) node = self.currentTreeNode;
                treeDivId = "Blender_conceptTreeDiv";
            } else if (type == "collection") {
                if (!node) node = Collection.currentTreeNode;
                treeDivId = "Blender_collectionTreeDiv";
            }
            var str = "";
            if (node.children.length > 0) str = " and all its descendants";
            if (silently || confirm("delete node " + node.data.label + str)) {
                var nodeIdsToDelete = [node.data.id];
                async.series(
                    [
                        function (/** @type {(arg0: undefined) => void} */ callbackSeries) {
                            // descendants of type concept
                            if (node.children.length == 0) return callbackSeries();
                            if (type != "subject") return callbackSeries();

                            Sparql_generic.getSingleNodeAllDescendants(self.currentSource, node.data.id, function (/** @type {any} */ err, /** @type {any[]} */ result) {
                                if (err) {
                                    return callbackSeries(err);
                                }
                                result.forEach(function (/** @type {{ narrower: { value: any; }; }} */ item) {
                                    nodeIdsToDelete.push(item.narrower.value);
                                });
                                callbackSeries();
                            });
                        },
                        function (/** @type {(arg0: undefined) => void} */ callbackSeries) {
                            // descendants of type collection
                            if (node.children.length == 0) return callbackSeries();
                            if (type != "collection") return callbackSeries();

                            Collection.Sparql.getSingleNodeAllDescendants(
                                self.currentSource,
                                node.data.id,
                                { onlyCollectionType: true },
                                function (/** @type {any} */ err, /** @type {any[]} */ result) {
                                    if (err) {
                                        return callbackSeries(err);
                                    }
                                    result.forEach(function (/** @type {{ narrower: { value: any; }; }} */ item) {
                                        nodeIdsToDelete.push(item.narrower.value);
                                    });
                                    callbackSeries();
                                }
                            );
                        },

                        function (/** @type {(arg0: undefined) => void} */ callbackSeries) {
                            Sparql_generic.deleteTriples(self.currentSource, nodeIdsToDelete, null, null, function (/** @type {any} */ err, /** @type {any} */ _result) {
                                if (err) {
                                    return callbackSeries(err);
                                }
                                callbackSeries();
                            });
                        },
                        function (/** @type {(arg0: undefined) => void} */ callbackSeries) {
                            // delete members triple in parentNode
                            if (type == "subject") return callbackSeries();

                            Sparql_generic.deleteTriples(
                                self.currentSource,
                                node.parent,
                                "http://www.w3.org/2004/02/skos/core#member",
                                node.data.id,
                                function (/** @type {any} */ err, /** @type {any} */ _result) {
                                    if (err) {
                                        return callbackSeries(err);
                                    }
                                    callbackSeries();
                                }
                            );
                        },
                        function (/** @type {() => void} */ callbackSeries) {
                            // delete from tree
                            common.jstree.deleteNode(treeDivId, node.id);
                            if (type == "subject") {
                                self.currentTreeNode = null;
                            } else if (type == "collection") {
                                Collection.currentTreeNode = null;
                            }
                            callbackSeries();
                        },
                    ],

                    function (/** @type {any} */ err) {
                        if (err) {
                            return MainController.UI.message(err);
                        }
                        $("#waitImg").css("display", "none");
                        MainController.UI.message("nodes deleted " + nodeIdsToDelete.length);
                    }
                );
            }
        },

        cutNode: function (/** @type {any} */ _type) {
            Clipboard.copy(
                {
                    type: "node",
                    id: self.currentTreeNode.data.id,
                    label: self.currentTreeNode.data.label,
                    source: self.currentTreeNode.data.source,
                    data: self.currentTreeNode.data,
                    cut: true,
                },
                self.currentTreeNode.id + "_anchor",
                event
            );
        },
        copyNode: function (/** @type {any} */ _type) {
            Clipboard.copy(
                {
                    type: "node",
                    id: self.currentTreeNode.data.id,
                    label: self.currentTreeNode.data.label,
                    source: self.currentTreeNode.data.source,
                    data: self.currentTreeNode.data,
                },
                self.currentTreeNode.id + "_anchor",
                event
            );
        },

        pasteClipboardNodes: function (
            /** @type {{ cut: any; }[]} */ fromDataArray,
            /** @type {number} */ depth,
            /** @type {{ newParentId?: any; pasteDescendantsDepth?: any; keepOriginalUris?: boolean; addExactMatchPredicate?: boolean; setParentNode?: { targetUri: any; sourceUri: any; }; prefLang?: string; }} */ options,
            /** @type {(arg0: string | undefined) => any} */ callback
        ) {
            if (!fromDataArray) fromDataArray = Clipboard.getContent();
            if (!fromDataArray) return;
            if (!options) {
                options = {};
            }
            var cancel = false;

            /**
             * @type {{ source: string; id: string; label: string; }}
             */
            var toParentNode;
            if (options.newParentId) toParentNode = options.newParentId;
            else toParentNode = self.currentTreeNode.data;

            if (options.pasteDescendantsDepth) depth = options.pasteDescendantsDepth;

            if (fromDataArray[0].data.source == "_annotate_missing_word") {
                var word = fromDataArray[0].data.label;
                var pasteType = fromDataArray[0].data.pasteType;

                var targetSourceObj = Config.sources[toParentNode.source];
                var uri = "<" + targetSourceObj.graphUri + common.getRandomHexaId(10) + ">";
                var triples = "";
                if (pasteType == "subject") {
                    triples += uri + " <http://www.w3.org/2004/02/skos/core#broader> <" + toParentNode.id + "> .\n";
                    triples += uri + " <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/2004/02/skos/core#Concept>.\n";
                    triples += uri + "  <http://www.w3.org/2004/02/skos/core#prefLabel> '" + word + "'@en .\n";
                } else if (pasteType == "altLabel") {
                    var altLabelLang = fromDataArray[0].data.altLabelLang;
                    triples += "<" + toParentNode.id + "> <http://www.w3.org/2004/02/skos/core#altLabel>  '" + word + "'@" + altLabelLang + " .\n";
                }
                var query = " WITH GRAPH  <" + targetSourceObj.graphUri + ">  INSERT DATA {" + triples + "  }";
                var url = Config.sources[toParentNode.source].sparql_server.url + "?format=json&query=";
                Sparql_proxy.querySPARQL_GET_proxy(url, query, null, { source: toParentNode.source }, function (/** @type {any} */ err, /** @type {any} */ _result) {
                    if (err) {
                        return MainController.UI.message(err);
                    }
                    MainController.UI.message("", true);
                    $("#Evaluate_infosDiv").html("word " + word + " created as " + pasteType);
                    var parentJstreeNode = $("#Blender_conceptTreeDiv").jstree().get_node(toParentNode.id);
                    if (pasteType == "subject") SourceBrowser.openTreeNode("Blender_conceptTreeDiv", toParentNode.source, parentJstreeNode, { reopen: true });
                    else if (pasteType == "altLabel") Blender.nodeEdition.editNode("subject");
                });

                return;
            }

            async.eachSeries(
                fromDataArray,
                function (/** @type {{ label: string; id: string | number; source: string; }} */ fromNodeData, /** @type {() => any} */ callbackEach) {
                    var sourceNodesId = {};
                    var sourceNodesLabels = { [fromNodeData.label.toLowerCase()]: fromNodeData.id };
                    async.series(
                        [
                            function (/** @type {() => void} */ callbackSeries) {
                                if (depth > 0) MainController.UI.message("searching node and its children");
                                Sparql_generic.getNodeChildren(fromNodeData.source, null, [fromNodeData.id], depth, options, function (/** @type {any} */ _err, /** @type {any[]} */ result) {
                                    sourceNodesId[fromNodeData.id] = 1;
                                    result.forEach(function (/** @type {{ [x: string]: { value: string; }; concept: { value: string | number; }; conceptLabel: { value: string; }; }} */ item) {
                                        if (!sourceNodesId[item.subject.value]) {
                                            sourceNodesId[item.subject.value] = 1;
                                            sourceNodesLabels[item.subjectLabel.value.toLowerCase()] = item.subject.value;
                                        }
                                        for (var i = 1; i < depth; i++) {
                                            var child = item["child" + i];
                                            if (child) {
                                                if (!sourceNodesId[child.value]) {
                                                    sourceNodesId[child.value] = 1;
                                                    sourceNodesLabels[item["child" + i + "Label"].value.toLowerCase()] = child.value;
                                                }
                                            }
                                        }
                                    });
                                    Clipboard.clear();
                                    callbackSeries();
                                });
                            },
                            //check nodes with same label in target taxonomy
                            function (/** @type {(arg0: undefined) => any} */ callbackSeries) {
                                if (fromDataArray[0].cut) return callbackSeries();
                                var filterStr = Sparql_common.setFilter("subject", null, Object.keys(sourceNodesLabels), null, { exactMatch: true });
                                Sparql_generic.getItems(toParentNode.source, { filter: filterStr }, function (/** @type {any} */ err, /** @type {any[]} */ result) {
                                    if (err) return callbackSeries(err);
                                    else if (result.length == 0) return callbackSeries();
                                    else {
                                        var choice = prompt(
                                            result.length +
                                                " concepts have same label in target resource.type :" +
                                                " \n C to cancel copy  " +
                                                " \n S to skip duplicate concepts " +
                                                " \n D to copy  concepts (including duplicates)  "
                                        );

                                        if (choice == "S") {
                                            result.forEach(function (/** @type {{ conceptLabel: { value: string; }; concept: { value: string | number; }; }} */ item) {
                                                var targetLabel = sourceNodesLabels[item.subjectLabel.value.toLowerCase()];
                                                if (targetLabel && targetLabel && targetLabel != toParentNode.label.toLowerCase()) {
                                                    delete sourceNodesId[item.subject.value];
                                                } else {
                                                    if (targetLabel) {
                                                        var message = "Cannot copy nodes containing label similar to new parent node label";
                                                        alert(message);
                                                        return callback(message);
                                                    }
                                                }
                                            });
                                            if (Object.keys(sourceNodesId).length == 0) cancel = true;
                                            MainController.UI.message(Object.keys(sourceNodesId).length + " concepts will be copied");
                                            return callbackSeries();
                                        } else if (choice == "D") {
                                            return callbackSeries();
                                        } else {
                                            cancel = true;
                                            MainController.UI.message("Copy concepts cancelled");

                                            return callbackSeries();
                                        }
                                    }
                                });
                            },
                            function (/** @type {() => void} */ callbackSeries) {
                                if (cancel) return callbackSeries();
                                var toGraphUri = Config.sources[toParentNode.source].graphUri;
                                var fromIds = Object.keys(sourceNodesId);
                                options = {
                                    keepOriginalUris: false,
                                    addExactMatchPredicate: true,
                                    setParentNode: {
                                        targetUri: toParentNode.id,
                                        sourceUri: fromNodeData.id,
                                    },
                                    prefLang: "en",
                                };

                                MainController.UI.message("copying " + fromIds.length + " nodes from source " + fromNodeData.source + " in source " + toParentNode.source);
                                Sparql_generic.copyNodes(fromNodeData.source, toGraphUri, fromIds, options, function (/** @type {any} */ err, /** @type {any} */ _result) {
                                    if (err) {
                                        alert(err);
                                        return callbackSeries();
                                    }
                                    var parentJstreeNode = $("#Blender_conceptTreeDiv").jstree().get_node(toParentNode.id);
                                    SourceBrowser.openTreeNode("Blender_conceptTreeDiv", toParentNode.source, parentJstreeNode, { reopen: true });
                                    if (fromDataArray[0].cut) {
                                        var cutJstreeNode = $("#Blender_conceptTreeDiv").jstree().get_node(fromNodeData.id);
                                        self.menuActions.deleteNode("subject", cutJstreeNode, true);
                                    }
                                    callbackSeries();
                                });
                            },
                        ],
                        function (/** @type {any} */ _err) {
                            return callbackEach();
                        }
                    );
                },
                function (/** @type {any} */ _err) {
                    if (callback) return callback();
                    else {
                        if (!cancel) MainController.UI.message("nodes copied");
                        $("#waitImg").css("display", "none");
                        $("#Evaluate_infosDiv").html("");
                    }
                }
            );
        },

        setCopiedNodeObjectFn: function (/** @type {{ prop: { value: string; }; value: { value: any; }; }} */ item) {
            var newParent = self.currentTreeNode;
            if (item.prop.value == "http://www.w3.org/2004/02/skos/core#broader") item.value.value = newParent.data.id;
            else if (item.prop.value == "http://www.w3.org/2000/01/rdf-schema#subClassOf") {
                item.prop.value = "http://www.w3.org/2004/02/skos/core#broader";
                item.value.value = newParent.data.id;
            }

            return item;
        },
        setCopiedNodePredicateFn: function (/** @type {any} */ item) {
            return item;
        },

        createConceptFromWord: function () {
            var data = Clipboard.getContent()[0];

            var initData = {
                "http://www.w3.org/2004/02/skos/core#prefLabel": [
                    {
                        "xml:lang": SourceEditor.prefLang,
                        value: data.text,
                        type: "literal",
                    },
                ],
            };
            self.nodeEdition.createChildNode(initData, "subject");
            Clipboard.clear();
        },
    };

    self.nodeEdition = {
        createSchemeOrCollection: function (/** @type {string} */ type) {
            var skosType;
            if (type == "Scheme") {
                skosType = "http://www.w3.org/2004/02/skos/core#ConceptScheme";
                self.currentTreeNode = $("#Blender_conceptTreeDiv").jstree(true).get_node("#");
                $("#Blender_tabs").tabs("option", "active", 0);
            } else if (type == "Collection") {
                skosType = "http://www.w3.org/2004/02/skos/core#Collection";
                Collection.currentTreeNode = $("#Blender_collectionTreeDiv").jstree(true).get_node("#");
                $("#Blender_tabs").tabs("option", "active", 1);
            } else return;

            if (!self.currentSource) {
                return alert("select a source");
            }

            self.nodeEdition.openDialog();
            var initData = {
                "http://www.w3.org/2004/02/skos/core#prefLabel": [{ "xml:lang": Config.sources[self.currentSource].prefLang || "en", value: "", type: "literal" }],
            };

            SourceEditor.editNewObject("Blender_nodeEditionDiv", self.currentSource, skosType, initData);
        },

        getSourceDefaultRdfType: function () {
            if (Config.sources[self.currentSource].schemaType.indexOf("SKOS") > -1) return "subject";
            if (Config.sources[self.currentSource].schemaType.indexOf("OWL") > -1) {
                return "class";
            }
            return null;
        },
        editNode: function (/** @type {string} */ type) {
            /* if(!type)
                 type=self.nodeEdition.getSourceDefaultRdfType();*/

            if (!type) alert(" no type");

            if (type == "subject") {
                var conceptType;

                if (Config.sources[self.currentSource].schemaType == "SKOS") conceptType = "http://www.w3.org/2004/02/skos/core#Concept";
                else if (Config.sources[self.currentSource].schemaType == "OWL") conceptType = "http://www.w3.org/2002/07/owl#Class";
                else return alert(" no supported schemaType " + Config.sources[self.currentSource].schemaType);
                if (self.displayMode == "centralPanelDiv") {
                    SourceEditor.editNode("Blender_nodeEditionContainerDiv", self.currentSource, self.currentTreeNode.data.id, conceptType, false);
                } else {
                    self.nodeEdition.openDialog();
                    SourceEditor.editNode("Blender_nodeEditionDiv", self.currentSource, self.currentTreeNode.data.id, conceptType, false);
                }
            } else if (type == "collection") {
                self.nodeEdition.openDialog();
                type = "http://www.w3.org/2004/02/skos/core#Collection";
                SourceEditor.editNode("Blender_nodeEditionDiv", self.currentSource, Collection.currentTreeNode.data.id, type, false);
            } else if (type == "class") {
                var owlType = "http://www.w3.org/2000/01/rdf-schema#Class";
                self.nodeEdition.openDialog();
                SourceEditor.editNode("Blender_nodeEditionDiv", self.currentSource, self.currentTreeNode.data.id, owlType, false);
            }

            return true;
        },

        createChildNode: function (/** @type {{ [x: string]: { value: any; type: string; }[]; }} */ initData, /** @type {string} */ type) {
            if (!initData) initData = {};
            var parentNode;
            var parentProperty;
            var mandatoryProps;

            if (type == "subject") {
                parentNode = self.currentTreeNode;
                parentProperty = OwlSchema.currentSourceSchema.newObject.treeParentProperty;
                mandatoryProps = OwlSchema.currentSourceSchema.newObject.mandatoryProperties;
                //childClass = OwlSchema.currentSourceSchema.newObject.treeChildrenClasses[parentNode.data.type];
                type = "http://www.w3.org/2004/02/skos/core#Concept";
                if (self.currentTreeNode.data.type == "http://www.w3.org/2004/02/skos/core#ConceptScheme")
                    initData["http://www.w3.org/2004/02/skos/core#topConceptOf"] = [
                        {
                            value: self.currentTreeNode.data.id,
                            type: "uri",
                        },
                    ];
                if (self.currentTreeNode.data.type == "http://www.w3.org/2004/02/skos/core#Concept")
                    initData["http://www.w3.org/2004/02/skos/core#broader"] = [
                        {
                            value: self.currentTreeNode.data.id,
                            type: "uri",
                        },
                    ];
                initData["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"] = [
                    {
                        value: "http://www.w3.org/2004/02/skos/core#Concept",
                        type: "uri",
                    },
                ];
            } else if (type == "collection") {
                parentNode = Collection.currentTreeNode;
                type = "http://www.w3.org/2004/02/skos/core#Collection";
                parentProperty = "^" + Collection.broaderProperty;
                mandatoryProps = ["http://www.w3.org/2004/02/skos/core#prefLabel"];
                initData["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"] = [
                    {
                        value: "http://www.w3.org/2004/02/skos/core#Collection",
                        type: "uri",
                    },
                ];
            }

            mandatoryProps.forEach(function (/** @type {string | number} */ item) {
                if (!initData[item]) initData[item] = [{ "xml:lang": SourceEditor.prefLang, value: "", type: "literal" }];
            });
            initData[parentProperty] = [{ value: parentNode.data.id, type: "uri" }];

            if (self.displayMode == "centralPanelDiv") {
                SourceEditor.editNode("Blender_nodeEditionContainerDiv", self.currentSource, type, initData);
            } else {
                self.nodeEdition.openDialog();
                SourceEditor.editNewObject("Blender_nodeEditionDiv", self.currentSource, type, initData);
            }
        },

        openDialog: function () {
            $("#Blender_PopupEditDiv").dialog("open");

            $("#Blender_PopupEditButtonsDiv").css("display", "block");
        },

        saveEditingNode: function () {
            SourceEditor.saveEditingObject(function (/** @type {any} */ err, /** @type {{ errors: any[]; type: string | string[]; isNew: boolean; about: any; nodeLabel: any; }} */ editingObject) {
                if (err) {
                    MainController.UI.message(err);
                }
                $("#Blender_nodeEditionButtonsDiv").css("display", "none");
                $("#Blender_nodeEditionContainerDiv").html("");

                if (editingObject.errors && editingObject.errors.length > 0) {
                    var errorsStr = "";
                    editingObject.errors.forEach(function (/** @type {string} */ item) {
                        errorsStr += item + ".";
                    });
                    alert(errorsStr);
                    return false;
                }

                var treeDiv;

                if (editingObject.type.indexOf("subject") > 0) {
                    treeDiv = "Blender_conceptTreeDiv";
                }
                if (editingObject.type.indexOf("Collection") > 0) {
                    treeDiv = "Blender_collectionTreeDiv";
                }

                var parentNode = $("#" + treeDiv)
                    .jstree(true)
                    .get_selected(true)[0];
                if (!parentNode) parentNode = "#";
                if (editingObject.isNew) {
                    editingObject.isNew = false;
                    var jsTreeData = [
                        {
                            id: editingObject.about,
                            text: editingObject.nodeLabel,
                            parent: parentNode,
                            data: {
                                type: editingObject.type,
                                source: self.currentSource,
                                id: editingObject.about,
                                label: editingObject.nodeLabel,
                            },
                        },
                    ];

                    common.jstree.addNodesToJstree(treeDiv, parentNode, jsTreeData, {});
                } else {
                    if (editingObject.nodeLabel) {
                        var nodeJstreeId = $("#" + treeDiv)
                            .jstree(true)
                            .get_selected()[0];

                        $("#" + treeDiv)
                            .jstree(true)
                            .rename_node(nodeJstreeId, editingObject.nodeLabel);

                        common.jstree.setTreeAppearance();
                    }
                }
                $("#Blender_PopupEditDiv").dialog("close");
            });
        },

        cancelEditingNode: function () {
            $("#Blender_PopupEditDiv").dialog("close");
        },
    };

    self.searchTerm = function () {
        "Blender_conceptTreeDiv";
    };

    self.copyTriples = function () {
        // Pass
    };

    self.export = function () {
        Export.showExportDatDialog(self.currentSource, "BLENDER", {});
        return;
        /*   var collection = Collection.currentCollectionFilter


               Sparql_generic.getCollectionNodes(self.currentSource, collection, {}, function (err, result) {



                   if (err) {
                       if (callback)
                           return callback(err)
                       return (MainController.UI.message(err))
                   }

                   var predicates = []
                   var subjects = {}
                   result.forEach(function (item) {
                       if (!subjects[item.subject.value])
                           subjects[item.subject.value] = {}
                       var value = item.object.value;
                       if (item.object["xml:lang"])
                           value = value + "@" + item.object["xml:lang"]
                       if (!subjects[item.subject.value][item.predicate.value])
                           subjects[item.subject.value][item.predicate.value] = []
                       subjects[item.subject.value][item.predicate.value].push(value)

                       if (predicates.indexOf(item.predicate.value) < 0)
                           predicates.push(item.predicate.value)


                   })
                   var line = 0;
                   var str = ""
                   var sep = "\t"

                   predicates.splice(0, 0, "uri")
                   predicates.forEach(function (predicate, predicateIndex) {

                       if (predicateIndex > 0)
                           str += sep
                       str += predicate;
                   })
                   str += "\n"

                   for (var key in subjects) {
                       str += key
                       predicates.forEach(function (predicate, predicateIndex) {

                           if (predicateIndex > 0)
                               str += sep

                           var object = subjects[key][predicate]
                           if (object) {
                               var valueStr = ""
                               object.forEach(function (value, valueIndex) {
                                   if (valueIndex > 0)
                                       valueStr += "|"
                                   if (subjects[value])
                                       valueStr += value + "@" + subjects[value]["http://www.w3.org/2004/02/skos/core#prefLabel"]
                                   else
                                       valueStr += value


                               })
                               str += valueStr
                           } else
                               str += ""

                       })
                       str += "\n"

                   }

                   var result = common.copyTextToClipboard(str, function (err, result) {
                       if (err)
                           return MainController.UI.message(err);
                       MainController.UI.message(result);
                       alert("filtered taxonomy CSV copied in clipboard")
                   })


               })*/
    };
    self.showFilteredTaxonomyTree = function (/** @type {{ depth: any; }} */ options, /** @type {(arg0: undefined) => void} */ callback) {
        var collection = Collection.currentCollectionFilter;

        Sparql_generic.getCollectionNodes(
            self.currentSource,
            collection,
            {
                depth: options.depth,
                filter: { predicates: ["skos:prefLabel", "skos:broader"] },
            },
            function (/** @type {any} */ err, /** @type {any[]} */ result) {
                if (err) {
                    if (callback) return callback(err);
                    return MainController.UI.message(err);
                }
                var jstreeData = [];
                var source = Config.sources[self.currentSource];

                var dataMap = {};
                result.forEach(function (/** @type {{ subject: { value: string | number; }; predicate: { value: string | string[]; }; object: { [x: string]: string; value: any; }; }} */ item) {
                    if (!dataMap[item.subject.value]) dataMap[item.subject.value] = {};
                    if (item.predicate.value.indexOf("#broader") > -1) {
                        dataMap[item.subject.value].broader = item.object.value;
                    }
                    if (item.predicate.value.indexOf("#prefLabel") > -1) {
                        if (source.predicates && source.predicates.lang) {
                            if (!item.object["xml:lang"] || item.object["xml:lang"] == source.predicates.lang || item.object["xml:lang"] == "null") {
                                dataMap[item.subject.value].prefLabel = item.object.value;
                            }
                        } else dataMap[item.subject.value].prefLabel = item.object.value;
                    }
                });
                var orphanBroaders = [];
                for (var key in dataMap) {
                    var id;
                    var parent;
                    var item = dataMap[key];
                    if (item.broader) {
                        id = key;
                        parent = item.broader;
                        if (!dataMap[parent]) orphanBroaders.push(parent);
                    } else {
                        parent = "#";
                        id = key;
                    }
                    jstreeData.push({
                        id: id,
                        text: item.prefLabel || "X",
                        parent: parent,
                        type: "subject",
                        data: { source: self.currentSource, id: id, label: item.prefLabel, type: "subject" },
                    });
                }

                //   console.log(JSON.stringify(jstreeData, null, 2))
                var jsTreeOptions = self.getConceptJstreeOptions(false);
                jsTreeOptions.openAll = true;
                common.jstree.loadJsTree("Blender_conceptTreeDiv", jstreeData, jsTreeOptions, function () {
                    if (jstreeData.length < 5000) $("#Blender_conceptTreeDiv").jstree().open_all();
                });
                $("#Blender_tabs").tabs("option", "active", 0);
                if (callback) callback();
            }
        );
    };

    self.sourcesManager = {
        setSourceUriPrefixValue: function () {
            var name = $("#blenderNewSource_resourceNameInput").val();
            name = Sparql_common.formatStringForTriple(name, true);
            var uri = Config.defaultNewUriRoot + name + "/";

            $("#blenderNewSource_resourceGraphUriInput").val(uri);
        },
        cancelNewResourceDialog: function () {
            $("#mainDialogDiv").dialog("close");
        },

        showCreateSourceDialog: function () {
            $("#mainDialogDiv").load("snippets/blender/newSourceDialog.html", function () {
                $("#mainDialogDiv").dialog("open");
                /**
                 * @type {any[]}
                 */
                var templatSources = [];
                self.availableSources.forEach(function (source) {
                    if (Config.sources[source].isBlenderTemplate) templatSources.push(source);
                });
                common.fillSelectOptions("blenderNewSource_referenceSourceSelect", templatSources.sort(), true);
            });
        },

        createNewResource: function () {
            var graphUri = $("#blenderNewSource_resourceGraphUriInput").val();
            var referenceSource = $("#blenderNewSource_referenceSourceSelect").val();
            var keepOriginalUris = $("#blenderNewSource_keepOriginalUrisCBX").prop("checked");
            var type = $("#blenderNewSource_typeSelect").val();

            var lang = $("#blenderNewSource_defaultLangInput").val();
            if (!lang || lang == "") lang = null;
            if ((type == "SKOS" && !referenceSource) || referenceSource == "") return alert("select a reference graph");
            var name = $("#blenderNewSource_resourceNameInput").val();

            if (graphUri == "" || name == "") return alert("set resource name and graph URI");

            if (Config.sources[name]) return alert("this source name is already used");

            delete Config.sources[referenceSource].controller;

            var options = {
                referenceSource: Config.sources[referenceSource],
                keepOriginalUris: keepOriginalUris,
                type: type,
                lang: lang,
                addExactMatchPredicate: true,
            };

            var payload = {
                sourceName: name,
                graphUri: graphUri,
                targetSparqlServerUrl: Config.default_sparql_url,
                options: JSON.stringify(options),
            };
            $.ajax({
                type: "POST",
                url: `${Config.apiUrl}/blenderSources`,
                data: payload,
                dataType: "json",
                success: function (_data, _textStatus, _jqXHR) {
                    self.onLoaded(function (/** @type {any} */ _err) {
                        self.onSourceSelect(name);
                        $("#Blender_SourcesSelect").val(name);
                    });
                },
                error: function (err) {
                    alert("cannot create source");
                    // eslint-disable-next-line no-console
                    console.log(err);
                },
            });
        },
        deleteSource: function () {
            var source = $("#Blender_SourcesSelect").val();
            if (!source || source == "") return alert("select a source");
            var sourceObj = Config.sources[source];
            if (sourceObj.protected) return alert("source " + source + " is protected and cannot be removed");

            if (confirm("delete  resource " + source + " ?")) {
                if (confirm("Do you really want to delete resource " + source + " ?")) {
                    var payload = {
                        sourceName: source,
                        graphUri: sourceObj.graphUri,
                        sparqlServerUrl: Config.default_sparql_url,
                    };
                    $.ajax({
                        type: "DELETE",
                        url: `${Config.apiUrl}/blenderSources`,
                        data: payload,
                        dataType: "json",
                        success: function (_data, _textStatus, _jqXHR) {
                            $('#Blender_SourcesSelect option[value="' + source + '"]').remove();

                            common.jstree.clear("Blender_conceptTreeDiv");
                        },
                        error: function (err) {
                            alert("cannot delete source");
                            console.error(err);
                        },
                    });
                }
            }
        },
    };

    return self;
})();

export default Blender;

window.Blender = Blender;
