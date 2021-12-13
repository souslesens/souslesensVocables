/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var ExternalReferences = (function () {
    var self = {}
    self.getJstreeConceptsContextMenu = function (treeNode) {
        var menuItems = {}
        if (!treeNode || !treeNode.data)
            return menuItems
        menuItems.showExternalReferenceNodeInfos = {

            label: "view node properties",
            action: function (obj, sss, cc) {
                ExternalReferences.showExternalReferenceNodeInfos()
            }
        },

        menuItems.showExternalReferenceChildren = {




            label: "show external nodes ",
            action: function (obj, sss, cc) {
                ExternalReferences.showExternalReferenceChildren()
            }
        },
            menuItems.deleteExternalReferenceTreeNode = {

                label: "delete external reference",
                action: function (obj, sss, cc) {
                    ExternalReferences.deleteReference()
                }
            }
        /*   menuItems.importReference = {

                label: "import external reference",
                "action": false,
                "submenu": {
                    importReferenceNodeOnly: {
                        label: "import node reference",
                        action: function () {
                            self.importReferenceNode()

                        }
                    },
                    importReferenceDescendants: {
                        label: "node and descendants references",
                        action: function () {
                            self.importReferenceDescendants()

                        }
                    }

                }

            }*/
        return menuItems;
    }

    /**
     *
     *
     * adds nodes to tree comining from another scheme
     * using narrowMatch property : its values concats <nodeUri>@<saprqlServerUrl>:<graphUri



     */
    self.openNarrowMatchNodes = function (sourceLabel, node) {
        if (node.children.length > 0)
            return

        Sparql_generic.getNodeInfos(sourceLabel, node.id, {propertyFilter: ["http://www.w3.org/2004/02/skos/core#narrowMatch"]}, function (err, result) {
            if (err) {
                return MainController.UI.message(err);
            }
            var newTreeNodes = []
            result.forEach(function (item) {
                newTreeNodes.push({
                    id: item.value.value,
                    text: "<span class='treeType_externalReference'>@" + item.value.value + "</span>",
                    parent: node.id,
                    data: {type: "externalReferenceTopConcept"}

                })

            })
            if (newTreeNodes.length > 0)
                common.jstree.addNodesToJstree("Blender_conceptTreeDiv", node.id, newTreeNodes)


        })


    },


        /**
         *
         *adds a "narrowMatch property to node with uri value : id + "@" + fromSparql_url + ":" + fromGraphUri
         *show it as child node
         *
         *
         *
         */
        self.pasteAsReference = function () {
            var dataArray = Clipboard.getContent();
            if (!dataArray)
                return;
            var newTreeNodes = []

            async.eachSeries(dataArray, function (data, callbackEach) {

                    var existingNodeIds = common.jstree.getjsTreeNodes("Blender_conceptTreeDiv", true)
                    var fromSource = data.source;
                    var fromGraphUri = Config.sources[fromSource].graphUri
                    var fromSparql_url = Config.sources[fromSource].sparql_server.url
                    var id = data.id;

                    var objectUri = self.generateExternalUrl(id, fromSparql_url, fromGraphUri, data.label)
                    newTreeNodes.push(
                        {
                            id: objectUri,
                            text: "@" + fromSource + "/" + data.label,
                            parent: Blender.currentTreeNode,
                            data: {type: "externalReference", source: Blender.currentSource}
                        }
                    )

                    var triple = {subject: Blender.currentTreeNode.data.id, predicate: "http://www.w3.org/2004/02/skos/core#narrowMatch", object: objectUri, valueType: "uri"};
                    Sparql_generic.insertTriples(Blender.currentSource, [triple],null, function (err, result) {
                        callbackEach(err);
                    })

                }, function (err) {
                    if (err)
                        return MainController.UI.message(err);
                    var jsTreeOptions = {type: "externalReference", labelClass: "treeType_externalReference"}
                    common.jstree.addNodesToJstree("Blender_conceptTreeDiv", Blender.currentTreeNode.data.id, newTreeNodes)
                    Clipboard.clear();
                }
            )
        }

    self.showExternalReferenceChildren = function () {
        if (Blender.currentTreeNode.children.length > 0)
            return
        var url = Blender.currentTreeNode.data.id;
        var params = self.parseExternalUrl(url)

        if (!params.sourceLabel)
            return MainController.UI.message("no sourceLabel found from node id url params")
        Sparql_generic.getNodeChildren(params.sourceLabel, null, params.id, 0, {}, function (err, result) {
            if (err)
                return MainController.UI.message(err);

            var jsTreeOptions = {type: "externalReference", source: params.sourceLabel, labelClass: "treeType_externalReference"}
            TreeController.drawOrUpdateTree("Blender_conceptTreeDiv", result, Blender.currentTreeNode.data.id, "child1", jsTreeOptions)

        })


    },

        self.showExternalReferenceNodeInfos = function () {
            var url = Blender.currentTreeNode.data.id;
            var params = self.parseExternalUrl(url)

            if (!params.sourceLabel)
                return MainController.UI.message("no sourceLabel found from node id url params")
            var sourceLabel = Blender.currentTreeNode.data.source
            SourceBrowser.showNodeInfos(params.sourceLabel, params.id,"mainDialogDiv")
          /*  Sparql_generic.getNodeInfos(params.sourceLabel, params.id, null, function (err, result) {
                if (err) {
                    return MainController.UI.message(err);
                }
                $("#Blender_PopupEditDiv").dialog("open")

                //   $(".ui-dialog-titlebar-close").css("display", "block")
                $("#Blender_PopupEditButtonsDiv").css("display", "none")
                SourceEditor.showNodeInfos("Blender_PopupEditDiv", "en", Blender.currentTreeNode.data.id, result);
            })*/
        }
        ,

        self.parseExternalUrl = function (url) {

            var p = url.indexOf("?")
            if (p < 0)
                return null;
            var id = url.substring(0, p);
            var params = decodeURIComponent(url.substring(p + 1)).split("&");
            var obj = {id: id}
            params.forEach(function (str) {
                var array = str.split("=")
                obj[array[0]] = array[1]

            })
            var sourceLabel = null;
            for (var key in Config.sources) {
                if (Config.sources[key].sparql_server.url == obj.sparql_url && Config.sources[key].graphUri == obj.graphUri)
                    obj.sourceLabel = key
            }
            return obj
        }


    self.generateExternalUrl = function (id, sparql_url, graphUri, label) {
        return "" + id + "?" + encodeURIComponent("sparql_url=" + sparql_url + "&graphUri=" + graphUri + "&label=" + label);
    }


    self.importReferenceNode = function (withDescendants) {
        var url = Blender.currentTreeNode.data.id;
        var params = self.parseExternalUrl(url)

            Clipboard.copy({
                type: "node",
                id: params.id,
                label: params.label,
                source: params.sourceLabel
            }, {}, {})
        if (withDescendants)
            Blender.menuActions.pasteClipboardNodeDescendants()
        else
            Blender.menuActions.pasteClipboardNodeOnly()


    }
    self.importReferenceDescendants = function () {
        self.importReferenceNode(true)

    }

    self.deleteReference=function(){
            if(confirm (" delete reference ")) {
                var parentId = Blender.currentTreeNode.parent;
                Sparql_generic.deleteTriples(Blender.currentSource, parentId, "http://www.w3.org/2004/02/skos/core#narrowMatch",  Blender.currentTreeNode.data.id, function (err, result) {

                    if (err) {
                        Blender.currentTreeNode=null;
                        return MainController.UI.message(err);
                    }
                    $('#Blender_conceptTreeDiv').jstree(true).delete_node( Blender.currentTreeNode.data.id)
                    Blender.currentTreeNode=null;



                })
            }

    }


    return self;


})()
