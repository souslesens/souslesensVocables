var ThesaurusBrowser = (function () {
    var self = {}


    self.onLoaded = function () {
        $("#sourceDivControlPanelDiv").html("<input id='SourceEditor_searchAllSourcesTermInput'>" +
            "<input type='checkbox' checked='checked' id= 'ThesaurusBrowser_allExactMatchSearchCBX'>Exact Match" +
            "<button onclick='ThesaurusBrowser.searchAllSourcesTerm()'>Search</button>")
    }
    self.onSourceSelect = function (thesaurusLabel) {
        MainController.currentSource = thesaurusLabel;
        OwlSchema.currentSourceSchema = null;
        self.showThesaurusTopConcepts(thesaurusLabel)
        $("#actionDivContolPanelDiv").html("<input id='GenericTools_searchTermInput'> " +
            "<input type='checkbox' checked='checked' id= 'ThesaurusBrowser_exactMatchSearchCBX'>Exact Match" +
            "<button onclick='ThesaurusBrowser.searchTerm()'>Search</button>" +
            "<button onclick='ThesaurusBrowser.showThesaurusTopConcepts(MainController.currentSource)'>reset</button>" +
            "<div id='ThesaurusBrowser_collectionDiv'>" +
            "Collection<select id='ThesaurusBrowser_collectionSelect' onchange='Collection.filterBrowserCollection()'></select>" +
            "</div>")

        if (Config.enableCollections) {
            setTimeout(function () {
                Collection.initBrowserCollectionSelect()
            }, 200)
        }

    }

    self.selectNodeFn = function (event, propertiesMap) {


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
            self.openTreeNode("currentSourceTreeDiv", source, propertiesMap.node, {ctrlKey: propertiesMap.event.ctrlKey})
        }

    }

    self.copyNode = function (event) {
        Clipboard.copy({
                type: "node",
                id: self.currentTreeNode.data.id,
                label: self.currentTreeNode.text,
                source: self.currentTreeNode.data.source,
                data: self.currentTreeNode.data
            },
            self.currentTreeNode.id + "_anchor",
            event)
    }

    self.showThesaurusTopConcepts = function (thesaurusLabel, options) {
        if (!options)
            options = {}
        options.filterCollections = Collection.currentCollectionFilter
        Sparql_generic.getTopConcepts(thesaurusLabel, options, function (err, result) {
            if (err)
                return MainController.UI.message(err);
            $("#accordion").accordion("option", {active: 2});
            if (result.length == 0) {
                Collection.currentCollectionFilter = null;
                $("#waitImg").css("display", "none");

                var html = "<div id='currentSourceTreeDiv'>no data found</div>"
                $("#actionDiv").html(html);
                return MainController.UI.message("")
            }

            if (!options)
                options = {}
            if (err) {
                return MainController.UI.message(err);
            }

            if (false) {
                var str = ""
                result.forEach(function (item) {
                    str += thesaurusLabel + "\t" + item.topConcept.value + "\t" + item.topConceptLabel.value + "\n"
                })
                console.log(str)
            }


            var html = "<div id='currentSourceTreeDiv'></div>"

            $("#actionDiv").html(html);


            var jsTreeOptions = options;
            jsTreeOptions.contextMenu = self.getJstreeConceptsContextMenu()
            jsTreeOptions.selectNodeFn = Config.tools[MainController.currentTool].controller.selectNodeFn;
            jsTreeOptions.source = thesaurusLabel;
            TreeController.drawOrUpdateTree("currentSourceTreeDiv", result, "#", "topConcept", jsTreeOptions)


            /* Collection.Sparql.getCollections(thesaurusLabel, options, function (err, result) {

               })*/


        })


    }


    self.getJstreeConceptsContextMenu = function () {
        // return {}
        var items = {}
        ;
        if (MainController.currentSource && Config.sources[MainController.currentSource].schemaType == "OWL") {
            items.showProperties = {
                label: "Show Properties",
                action: function (e) {// pb avec source
                    OntologyBrowser.showProperties()


                }

            }

        }
        items.copyNode = {
            label: "Copy Node",
            action: function (e) {// pb avec source
                ThesaurusBrowser.copyNode(e)

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

    self.openTreeNode = function (divId, thesaurusLabel, node, options) {
        if (!options)
            options = {}
        var existingNodes = common.getjsTreeNodes(divId, true)
        if (node.children.length > 0)
            if (!options.ctrlKey)
                return;

        options.filterCollections = Collection.currentCollectionFilter
        Sparql_generic.getNodeChildren(thesaurusLabel, null, node.data.id, 1, options, function (err, result) {
            if (err) {
                return MainController.UI.message(err);
            }
            TreeController.drawOrUpdateTree(divId, result, node.id, "child1", {source: thesaurusLabel, type: node.data.type})
            $("#waitImg").css("display", "none");

        })

    }


    self.editThesaurusConceptInfos = function (thesaurusLabel, node, callback) {
        MainController.UI.showNodeInfos(thesaurusLabel, node.data.id, "graphDiv")

        /*  Sparql_generic.getNodeInfos(thesaurusLabel, node.data.id, null, function (err, result) {
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
        var exactMatch = $("#ThesaurusBrowser_exactMatchSearchCBX").prop("checked")
        if (!term || term == "")
            return
        var options = {
            term: term,
            rootId: rootId,
            exactMatch: exactMatch
        }
        ThesaurusBrowser.getFilteredNodesJstreeData(sourceLabel, options, function (err, jstreeData) {
            if (callback)
                return (err, jstreeData)
            MainController.UI.message("")
            if (jstreeData.length == 0) {
                $("#waitImg").css("display", "none");
                return $("#currentSourceTreeDiv").html("No data found")
            }

            common.loadJsTree("currentSourceTreeDiv", jstreeData, {
                openAll: true, selectNodeFn: function (event, propertiesMap) {
                    if (Config.tools[MainController.currentTool].controller.selectNodeFn)
                        return Config.tools[MainController.currentTool].controller.selectNodeFn(event, propertiesMap);
                    self.editThesaurusConceptInfos(MainController.currentSource, propertiesMap.node)
                }, contextMenu: self.getJstreeConceptsContextMenu()
            })

        })
    }


    self.searchAllSourcesTerm = function (options) {
        if (!options) {
            options = {}
        }
        if (!term)
            var term = $("#SourceEditor_searchAllSourcesTermInput").val()
        if (!term || term == "")
            return
        var exactMatch = $("#ThesaurusBrowser_allExactMatchSearchCBX").prop("checked")
        var searchedSources = [];
        for (var sourceLabel in Config.sources) {
            if (Config.currentProfile.allowedSourceSchemas.indexOf(Config.sources[sourceLabel].schemaType) > -1) {
                if (!Config.sources[sourceLabel].schemaType || Config.sources[sourceLabel].schemaType == MainController.currentSchemaType)
                    searchedSources.push(sourceLabel)
            }
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
                exactMatch: exactMatch
            }
            ThesaurusBrowser.getFilteredNodesJstreeData(sourceLabel, options2, function (err, result) {
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
            var html = "<div id='currentSourceTreeDiv'></div>"


            $("#actionDiv").html(html);

            var jstreeOptions = {
                openAll: true, selectNodeFn: function (event, propertiesMap) {
                    if (Config.tools[MainController.currentTool].controller.selectNodeFn)
                        return Config.tools[MainController.currentTool].controller.selectNodeFn(event, propertiesMap);
                    ThesaurusBrowser.currentTreeNode = propertiesMap.node;
                    self.editThesaurusConceptInfos(propertiesMap.node.data.source, propertiesMap.node)
                }, contextMenu: self.getJstreeConceptsContextMenu()
            }

            common.loadJsTree("currentSourceTreeDiv", jstreeData, jstreeOptions)
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
        var depth = 6
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
                return $("#currentSourceTreeDiv").html("No data found")
            }

            var allJstreeIds = {}
            result.forEach(function (item, index) {
                for (var i = 20; i > 0; i--) {
                    if (item["broader" + i]) {

                        item["broader" + i].jstreeId = item["broader" + i].value + "_" + index
                    }
                }
                item.concept.jstreeId = item.concept.value + "_" + index;
            })


            result.forEach(function (item, index) {
                for (var i = 20; i > 0; i--) {
                    if (item["broader" + i]) {
                        var id = item["broader" + i].value
                        var jstreeId = item["broader" + i].value
                        if (!existingNodes[id]) {
                            existingNodes[id] = 1
                            var label = item["broader" + i + "Label"].value
                            var parentId = options.rootId;
                            if (item["broader" + (i + 1)])
                                parentId = item["broader" + (i + 1)].value

                            jstreeData.push({id: jstreeId, text: label, parent: parentId, data: {source: sourceLabel, id: id, label: item["broader" + i + "Label"].value}})
                        }
                    }
                }
                var itemId = item.concept.value
                var jstreeId = item.concept.value + "_" + item["broader1"].value
                if (!existingNodes[jstreeId]) {
                    existingNodes[jstreeId] = 1;
                    var text = "<span class='searched_concept'>" + item.conceptLabel.value + "</span>"
                    var id = item.concept.value;
                    var jstreeId = itemId
                    jstreeData.push({id: jstreeId, text: text, parent: item["broader1"].value, data: {source: sourceLabel, id: id, label: item.conceptLabel.value}})
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


    return self;


})()
