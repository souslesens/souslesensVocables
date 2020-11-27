var ExternalReferences = (function () {
    var self = {}
    self.getJstreeConceptsContextMenu = function (treeNode) {
        var menuItems = {}
        if (!treeNode || !treeNode.data)
            return menuItems


        menuItems.showExternalReferenceTreeNodes = {

            label: "show external nodes",
            action: function (obj, sss, cc) {
                ExternalReferences.showExternalReferenceTreeNodes()
            }
        },
            menuItems.deleteExternalReferenceTreeNode = {

                label: "delete external reference",
                action: function (obj, sss, cc) {
                    ExternalReferences.showExternalReferenceTreeNodes()
                }
            },
            menuItems.importReference = {

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

            }
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
                common.addNodesToJstree("Blender_conceptTreeDiv", node.id, newTreeNodes)


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

                    var existingNodeIds = common.getjsTreeNodes("Blender_conceptTreeDiv", true)
                    var fromSource = data.source;
                    var fromGraphUri = Config.sources[fromSource].graphUri
                    var fromSparql_url = Config.sources[fromSource].sparql_url
                    var id = data.id;

                    var objectUri = self.generateExternalUrl(id, fromSparql_url, fromGraphUri, data.label)
                    newTreeNodes.push(
                        {
                            id: id,
                            text: "@" + fromSource + "/" + data.label,
                            parent: Blender.currentTreeNode,
                            data: {type: "externalReference", source: Blender.currentSource}
                        }
                    )

                    var triple = {subject: Blender.currentTreeNode.id, predicate: "http://www.w3.org/2004/02/skos/core#narrowMatch", object: objectUri, valueType: "uri"};
                    Sparql_generic.insertTriples(Blender.currentSource, [triple], function (err, result) {
                        callbackEach(err);
                    })

                }, function (err) {
                    if (err)
                        return MainController.UI.message(err);
                    var jsTreeOptions = {type: "externalReference", labelClass: "treeType_externalReference"}
                    common.addNodesToJstree("Blender_conceptTreeDiv", Blender.currentTreeNode.id, newTreeNodes)
                    Clipboard.clear();
                }
            )
        }

    self.showExternalReferenceTreeNodes = function () {
        if (Blender.currentTreeNode.children.length > 0)
            return
        var url = Blender.currentTreeNode.id;
        var params = self.parseExternalUrl(url)

        if (!params.sourceLabel)
            return MainController.UI.message("no sourceLabel found from node id url params")
        Sparql_generic.getNodeChildren(params.sourceLabel, null, params.id, 0, {}, function (err, result) {
            if (err)
                return MainController.UI.message(err);

            var jsTreeOptions = {type: "externalReference", source: params.sourceLabel, labelClass: "treeType_externalReference"}
            TreeController.drawOrUpdateTree("Blender_conceptTreeDiv", result, Blender.currentTreeNode.id, "child1", jsTreeOptions)

        })


    },

        self.showExternalReferenceNodeInfos = function () {

            var sourceLabel = Blender.currentTreeNode.data.source
            Sparql_generic.getNodeInfos(sourceLabel, Blender.currentTreeNode.id, null, function (err, result) {
                if (err) {
                    return MainController.UI.message(err);
                }
                $("#Blender_PopupEditDiv").dialog("open")

                //   $(".ui-dialog-titlebar-close").css("display", "block")
                $("#Blender_PopupEditButtonsDiv").css("display", "none")
                SourceEditor.showNodeInfos("Blender_PopupEditDiv", "en", Blender.currentTreeNode.id, result);
            })
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
                if (Config.sources[key].sparql_url == obj.sparql_url && Config.sources[key].graphUri == obj.graphUri)
                    obj.sourceLabel = key
            }
            return obj
        }


    self.generateExternalUrl = function (id, sparql_url, graphUri, label) {
        return "" + id + "?" + encodeURIComponent("sparql_url=" + sparql_url + "&graphUri=" + graphUri + "&label=" + label);
    }


    self.importReferenceNode = function (withDescendants) {
        var url = Blender.currentTreeNode.id;
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


    return self;


})()
