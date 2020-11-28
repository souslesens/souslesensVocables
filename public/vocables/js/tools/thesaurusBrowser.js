var ThesaurusBrowser = (function () {
    var self = {}


    self.onLoaded = function () {
        $("#sourceDivControlPanelDiv").html("<input id='SourceEditor_searchAllSourcesTermInput'> <button onclick='ThesaurusBrowser.searchAllSourcesTerm()'>Search</button>")
    }
    self.onSourceSelect = function (thesaurusLabel) {
        MainController.currentSource = thesaurusLabel;
        self.showThesaurusTopConcepts(thesaurusLabel)
        $("#actionDivContolPanelDiv").html("<input id='GenericTools_searchTermInput'> <button onclick='ThesaurusBrowser.searchTerm()'>Search</button>")
    }

    self.selectNodeFn = function (event, propertiesMap) {
        var source;
        if(propertiesMap.node.data && propertiesMap.node.data.source)
            source=propertiesMap.node.data && propertiesMap.node.data.source // coming from search all sources
        else
            source= MainController.currentSource// coming from  specific tool current surce
        self.currentTreeNode = propertiesMap.node;
        if (propertiesMap.event.ctrlKey)
            Clipboard.copy({
                type: "node",
                id: self.currentTreeNode.id,
                label: self.currentTreeNode.text,
                source:  source
            }, self.currentTreeNode.id + "_anchor", propertiesMap.event)


        if (true || propertiesMap.event.ctrlKey) {
            self.editThesaurusConceptInfos(source, propertiesMap.node)
        }
        {
            self.openTreeNode("currentSourceTreeDiv", source, propertiesMap.node,{ctrlKey: propertiesMap.event.ctrlKey})
        }

    }

    self.showThesaurusTopConcepts = function (thesaurusLabel, options) {
        if (!options)
            options = {}

        Sparql_generic.getTopConcepts(thesaurusLabel, options, function (err, result) {
            if (!options)
                options = {}
            if (err) {
                return MainController.UI.message(err);
            }

            if(false){
                var str=""
                result.forEach(function(item){
                 str+=thesaurusLabel+"\t"+item.topConcept.value+"\t"+item.topConceptLabel.value+"\n"
                })
                console.log(str)
            }




            $("#accordion").accordion("option", {active: 2});
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
        return {
            copyNode: {
                label: "Copy Node",
                action: function (e) {// pb avec source
                    Clipboard.copy({type: "node", id: self.currentTreeNode.id, label: self.currentTreeNode.text, source: ThesaurusBrowser.currentTreeNode.data.source}, self.currentTreeNode.id + "_anchor", e)


                },

            },
        }
    }

    self.openTreeNode = function (divId, thesaurusLabel, node, options) {
        var existingNodes = common.getjsTreeNodes(divId, true)
        if (node.children.length > 0)
          if(!options  || !options.ctrlKey)
              return;

        Sparql_generic.getNodeChildren(thesaurusLabel, null, node.id, 1 , options,function (err, result) {
            if (err) {
                return MainController.UI.message(err);
            }
            TreeController.drawOrUpdateTree(divId, result, node.id, "child1",{source:thesaurusLabel,type:node.data.type})

        })

    }






    self.editThesaurusConceptInfos = function (thesaurusLabel, node, callback) {

        Sparql_generic.getNodeInfos(thesaurusLabel, node.id, null, function (err, result) {
            if (err) {
                return MainController.UI.message(err);
            }
            //    SkosConceptEditor.editConcept("graphDiv",result)
            SourceEditor.showNodeInfos("graphDiv", "en", node.id, result)


        })


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

        if (!term || term == "")
            return
        var options = {
            term: term,
            rootId: rootId
        }
        ThesaurusBrowser.getFilteredNodesJstreeData(sourceLabel, options, function (err, jstreeData) {
            if (callback)
                return (err, jstreeData)
            MainController.UI.message("")
            common.loadJsTree("currentSourceTreeDiv", jstreeData, {
                openAll: true, selectNodeFn: function (event, propertiesMap) {
                    if (Config.tools[MainController.currentTool].controller.selectNodeFn)
                        return Config.tools[MainController.currentTool].controller.selectNodeFn(event, propertiesMap);
                    self.editThesaurusConceptInfos(MainController.currentSource, propertiesMap.node)
                }, contextMenu: self.getJstreeConceptsContextMenu()
            })

        })
    }


    self.searchAllSourcesTerm = function () {
        if (!term)
            var term = $("#SourceEditor_searchAllSourcesTermInput").val()
        if (!term || term == "")
            return

        var searchedSources = [];
        for (var sourceLabel in Config.sources) {
            if (Config.sources[sourceLabel].sourceSchema == "SKOS") {
                searchedSources.push(sourceLabel)
            }
        }
        var jstreeData = []
        var uniqueIds={}
        async.eachSeries(searchedSources, function (sourceLabel, callbackEach) {

            setTimeout(function(){
            MainController.UI.message("searching in " + sourceLabel)
            },100)
            if (!term)
                term = $("#GenericTools_searchTermInput").val()

            if (!term || term == "")
                return
            var options = {
                term: term,
                rootId: sourceLabel
            }
            ThesaurusBrowser.getFilteredNodesJstreeData(sourceLabel, options, function (err, result) {
                if (err)
                    return MainController.UI.message(err)

                var text="<span class='searched_conceptSource'>"+sourceLabel+"</span>"
                jstreeData.push({id: sourceLabel, text: text, parent: "#", data: {source: sourceLabel}})
                result.forEach(function(item){
                    if(!uniqueIds[item.id]){
                        uniqueIds[item.id]=1
                        jstreeData.push(item)

                    }
                })

                callbackEach();
            })


        }, function (err) {
            $("#accordion").accordion("option", {active: 2});
            var html = "<div id='currentSourceTreeDiv'></div>"


            $("#actionDiv").html(html);


            common.loadJsTree("currentSourceTreeDiv", jstreeData, {
                openAll: true, selectNodeFn: function (event, propertiesMap) {
                    if (Config.tools[MainController.currentTool].controller.selectNodeFn)
                        return Config.tools[MainController.currentTool].controller.selectNodeFn(event, propertiesMap);
                    self.editThesaurusConceptInfos(propertiesMap.node.data.source, propertiesMap.node)
                }, contextMenu: self.getJstreeConceptsContextMenu()
            })
            setTimeout(function(){
            MainController.UI. updateActionDivLabel("Multi source search :"+term)
                MainController.UI.message("")
            },200)

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

            result.forEach(function (item) {
                for (var i = depth; i > 0; i--) {
                    if (item["broader" + i]) {
                        var id = item["broader" + i].value
                        if (!existingNodes[id]) {
                            existingNodes[id] = 1
                            var label = item["broader" + i + "Label"].value
                            var parentId = options.rootId
                            if (item["broader" + (i + 1)])
                                parentId = item["broader" + (i + 1)].value
                            jstreeData.push({id: id, text: label, parent: parentId, data: {source: sourceLabel}})
                        }
                    }
                }
                var itemId=existingNodes[item.concept.value]
                if (!existingNodes[itemId]) {
                    existingNodes[itemId]=1;
                    var text="<span class='searched_concept'>"+item.conceptLabel.value+"</span>"
                jstreeData.push({id: item.concept.value, text: text, parent: item["broader1"].value, data: {source: sourceLabel}})
                }
            })

            return callback(null, jstreeData)


        })


    }




    return self;


})()
