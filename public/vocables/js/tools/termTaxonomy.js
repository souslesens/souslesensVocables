var TermTaxonomy = (function () {
    var self = {context: {}}

    var colorsMap = {}
    var conceptsMap = {};
    var sourceLabels = [];




    self.onSourceSelect = function () {
        var html = "<button onclick='TermTaxonomy.showActionPanel()'>OK</button>"
        html+=  "&nbsp;<input type='checkbox' id='allConceptsCbx' onchange=\"common.onAllTreeCbxChange($(this),'sourcesTreeDiv')\"> All"
        $("#sourceDivControlPanelDiv").html(html)

    }




    self.showActionPanel = function () {
        self.initsourceLabels();
        $("#actionDivContolPanelDiv").html("")
        $("#actionDiv").load("snippets/termTaxonomy.html")
        $("#accordion").accordion("option", {active: 2});

    }


    self.initsourceLabels = function () {

        var jsTreesourceLabels = $("#sourcesTreeDiv").jstree(true).get_checked();
        sourceLabels = []
        jsTreesourceLabels.forEach(function (sourceId) {
            if(!Config.sources[sourceId])
                return
            if (!Config.sources[sourceId].color)
                Config.sources[sourceId].color = common.palette[Object.keys(sourceLabels).length];
            sourceLabels.push(sourceId)
        })
    }


    self.searchConcepts = function (word) {


        self.context.currentWord = word
        conceptsMap = {}


        var exactMatch = $("#exactMatchCBX").prop("checked")

        var bindings = {}
        var sourceNodes = [];

        sourceLabels.forEach(function (sourceId) {

            sourceNodes.push({id: sourceId, text: "<span class='tree_level_1' style='background-color: " + Config.sources[sourceId].color + "'>" + sourceId + "</span>", children: [], parent: "#"})


        })
        if ($('#conceptsJstreeDiv').jstree)
            $('#conceptsJstreeDiv').jstree("destroy")
        $("#conceptsJstreeDiv").jstree({

            "checkbox": {
                "keep_selected_style": false
            },
            "plugins": ["checkbox"],
            "core": {
                'check_callback': true,
                'data': sourceNodes
            }


        });
        var selectedIds = [];
        //  sourceLabels.forEach(function (source) {
        async.eachSeries(sourceLabels, function (sourceId, callbackEach) {


            Sparql_generic.getNodeParents(sourceId, word, null, 1, {exactMatch: exactMatch}, function (err, result) {
                // sparql_abstract.list(source.name, word, {exactMatch: exactMatch}, function (err, result) {

                if (err) {
                    return console.log(err);
                }

                result.forEach(function (item) {
                    var conceptId = item.concept.value
                    if (!conceptsMap[conceptId]) {
                        /*  if (result.length == 1)
                              selectedIds.push(item.id)*/
                        conceptsMap[conceptId] = item;
                        item.sourceId = sourceId;
                        item.title = item.conceptLabel.value + " / " + (item.description || item.broader1Label.value)

                        var newNode = {id: conceptId, text: "<span class='tree_level_2'>" + item.title + "</span>", data: item}
                        // setTimeout(function () {
                        $("#conceptsJstreeDiv").jstree(true).create_node(sourceId, newNode, "first", function () {
                            $("#conceptsJstreeDiv").jstree(true)._open_to(newNode.id);


                        }, false);

                        //  }, 1000)
                    }

                })
                callbackEach()


            })


        }, function (err) {


            if (err)
                return $("#messageDiv").html(err)
        })
        return;


        setTimeout(function () {

            $("#conceptsJstreeDiv").jstree(true).select_node(selectedIds);
            $("#messageDiv").html("done")
            $("#waitImg").css("display", "none");

        }, 1000)


    }

    self.displayGraph = function (direction) {
        $("#TermTaxonomy_nodeInfosDialogDiv").html("")
        visjsGraph.clearGraph()
        var maxDepth = 5

        drawRootNode = function (word) {
            var rootNodeColor = "#dda";
            var rootNodeSize = 20
         /*   $("#graphDiv").width($(window).width() - 20)
            $("#graphDiv").height($(window).height() - 20)*/
            self.rootNode = {
                label: word,
                id: word,
                color: rootNodeColor,
                size: rootNodeSize
            }
            var visjsData = {nodes: [], edges: []}
            visjsData.nodes.push(self.rootNode);
            visjsGraph.draw("graphDiv", visjsData, {
                onclickFn: TermTaxonomy.onGraphNodeClick,
                edges:{arrows:"to"},
                //  onHoverNodeFn: multiSkosGraph3.onNodeClick,
                afterDrawing: function () {
                    $("#waitImg").css("display", "none")
                }
            })


        }


        var selectedConcepts = []
        var jstreeNodes = $("#conceptsJstreeDiv").jstree(true).get_bottom_checked(false)
        jstreeNodes.forEach(function (nodeId) {
            if (conceptsMap[nodeId])
                selectedConcepts.push(conceptsMap[nodeId]);
        });


        drawRootNode(self.context.currentWord)
        setTimeout(function () {
            selectedConcepts.forEach(function (item) {
                var conceptId = item.concept.value
                item.color = Config.sources[item.sourceId].color

                if (direction == "ancestors") {
                    //  sparql_abstract.getAncestors(concept.source.id, concept.id, {exactMatch: true}, function (err, result) {
                    Sparql_generic.getNodeParents(item.sourceId, null, conceptId, maxDepth, {exactMatch: true}, function (err, result) {
                        if (err)
                            return console.log(err)
                        if (!result || !result.forEach)
                            return;
                        self.addAncestorsGraph(item.sourceId,self.context.currentWord, result, maxDepth)
                    })
                } else if (direction == "children") {

                    self.drawSourceRootNode(self.context.currentWord, item);
                    sparql_abstract.getChildren(item.source, item.id, {}, function (err, result) {
                        if (err)
                            return console.log(err);
                        self.addChildrenNodesToGraph(item, result)
                    })
                }


            })
                , self.multisearchTimeout
        })


    }

    self.addAncestorsGraph = function (sourceId,rootNodeId, bindings, depth) {
        var visjsData = {nodes: [], edges: []}

        var existingIds=visjsGraph.getExistingIdsMap()
       // edge beetwen word and concept
        var conceptId = bindings[0].concept.value;
       var id= rootNodeId + "_" + conceptId
        if(!existingIds[id]) {
            existingIds[id]=1

            visjsData.edges.push({
                id: id,
                from: rootNodeId,
                to: conceptId,
                label: sourceId
            })
        }


        for (var i = 1; i < depth; i++) {
            var fromVar = "";
            if (i == 1)
                fromVar = "concept"
            else
                fromVar = "broader" + (i - 1)

            var toVar = "broader" + i;

            var color=Config.sources[sourceId].color
            var options={
                from:{shape:"box",color:color},
                to:{shape:"box",color:color},
                data:{source:sourceId},
               // arrows:{to:1},
            }



           visjsData = GraphController.toVisjsData(visjsData, bindings, null, fromVar, toVar, options)
        }

        visjsGraph.data.nodes.add(visjsData.nodes)
        visjsGraph.data.edges.add(visjsData.edges)
        $("#waitImg").css("display", "none");

    }


    self.onGraphNodeClick = function ( node,point, options) {


            if(options && options.ctrlKey){
               return  Clipboard.copy({type: "node", source: node.data.source, id: node.id, label:node.label}, "_visjsNode", options)
            }


        $("#TermTaxonomy_nodeInfosDialogDiv").html("")
        if (node) {
            self.graphActions.currentNode = node;

            self.graphActions.showPopup(point)
        }
    }
    self.graphActions = {

        showPopup: function (point) {
            $("#graphPopupDiv").css("left", point.x+leftPanelWidth)
            $("#graphPopupDiv").css("top", point.y)
            $("#graphPopupDiv").css("display", "flex")
        },
        hidePopup: function () {
            $("#graphPopupDiv").css("display", "none")
        },


        drawChildren: function () {
            self.graphActions.hidePopup();
            Sparql_generic.getNodeChildren (self.graphActions.currentNode.data.source, null, self.graphActions.currentNode.id, 2, {},function (err, result) {
                if (err)
                    return console.log(err);
                self.currentChildren={};
                result.forEach(function(item){
                    self.currentChildren[item.child1.value]= {children2:(item.child2?1:null)}
                })

              var visjsData= GraphController.toVisjsData  (null, result, self.graphActions.currentNode.id,"concept","child1",
                  {from:{},to:{shape:TermTaxonomy.graphActions.getVisjsGraphColor,color:self.graphActions.currentNode.color},  data:self.graphActions.currentNode.data } )
                visjsGraph.data.nodes.add(visjsData.nodes)
                visjsGraph.data.edges.add(visjsData.edges)
              //  self.addChildrenNodesToGraph(self.graphActions.currentNode, children)
            })
        },
        getVisjsGraphColor:function(nodeId){

            if( self.currentChildren[nodeId]==1)
                return "triangle"
            else
                return "dot"

        }
        ,
        showDetails: function (defaultLang) {
            MainController.UI.showNodeInfos(self.graphActions.currentNode.data.source, self.graphActions.currentNode.id,"TermTaxonomy_nodeInfosDialogDiv")
         /*   Sparql_generic.getNodeInfos(self.graphActions.currentNode.data.source, self.graphActions.currentNode.id, null, function (err, result) {
                if (err) {
                    return MainController.UI.message(err);
                }
                $("#TermTaxonomy_nodeInfosDialogDiv").dialog("open");
                SourceEditor.showNodeInfos("TermTaxonomy_nodeInfosDialogDiv", "en", self.graphActions.currentNode.id, result)

            })*/
        }
        ,
        setAsRootNode: function () {
            self.graphActions.hidePopup();
            var word = self.graphActions.currentNode.label
            $('#searchWordInput').val(word)
            $('#dialogDiv').dialog('open')
            self.searchConcepts(word);


        }


    }


    return self;


})()
