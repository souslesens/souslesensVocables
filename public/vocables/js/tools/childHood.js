/**
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var ChildHood = (function () {
    var self = {context: {}}

    var colorsMap = {}
    var conceptsMap = {};
    var sourceLabels = [];




    self.onSourceSelect = function () {
        var html = "<button onclick='ChildHood.showActionPanel()'>OK</button>"
        $("#sourceDivControlPanelDiv").html(html)

    }




    self.showActionPanel = function () {
        self.initsourceLabels();
        $("#actionDivContolPanelDiv").html("")
        $("#actionDiv").load("snippets/childHood.html")
        $("#accordion").accordion("option", {active: 2});

    }


    self.initsourceLabels = function () {

        var jsTreesourceLabels = $("#sourcesTreeDiv").jstree(true).get_checked();
        sourceLabels = []
        jsTreesourceLabels.forEach(function (sourceId) {
            if (!Config.sources[sourceId].color)
                Config.sources[sourceId].color = common.palette[Object.keys(sourceLabels).length];
            sourceLabels.push(sourceId)
        })
    }




    self.displayGraph = function (direction) {
        var depth = parseInt($("#ChildHood_depth").val())
        self.initsourceLabels()

        var allNodes = {}
        async.eachSeries(sourceLabels, function (sourceLabel, callbackEach) {

            var sourceNodes = []
            allNodes[sourceLabel] = sourceNodes
            async.series([

                //get TopConcepts
                function (callbackSeries) {
                    Sparql_generic.getTopConcepts(sourceLabel, null, function (err, result) {
                        if (err)
                            return callbackSeries(err);
                        result.forEach(function (item) {
                            sourceNodes.push({
                                id: item.topConcept.value,
                                label: item.topConceptLabel.value,
                                level: 0,
                                parent: sourceLabel
                            })

                        })
                        callbackSeries()
                    })

                },

                //get TopConcepts
                function (callbackSeries) {
                    var ids = [];
                    sourceNodes.forEach(function (item) {
                        ids.push(item.id)
                    })
                    Sparql_generic.getNodeChildren(sourceLabel, null, ids, depth, null, function (err, result) {

                        if (err)
                            return callbackSeries(err);
                        result.forEach(function (item) {
                            for (var i = 1; i <= depth; i++) {
                                if (item["child" + i]) {
                                    var parent;
                                    if (i == 1)
                                        parent = item.concept.value;
                                    else
                                        parent = item["child" + (i - 1)].value

                                    sourceNodes.push({
                                        id: item["child" + i].value,
                                        label: item["child" + i + "Label"].value,
                                        level: i,
                                        parent: parent
                                    })
                                }
                            }

                        })
                        callbackSeries()
                    })

                },


            ], function (err) {
                callbackEach(err);
            })


        }, function (err) {
            if (err)
                return MainController.UI.message(err);
            self.drawGraph( allNodes);
        })


    }


    self.drawGraph=function(allNodesMap)   {
        var visjsData={nodes:[],edges:[]};
        var allIds={}

        var colors=[""]
        for(var source in allNodesMap){
            var color=colorsMap[source];
            visjsData.nodes.push({
                id: source,
                label:source,
                shape:"box",
                color:color
            })
            allNodesMap[source].forEach(function(item){
                var label=null;
                if(item.level<2)
                    label=item.label
                if(!allIds[item.id]) {
                    allIds[item.id]=1
                    visjsData.nodes.push({
                        id: item.id,
                       label: label,
                        color:  common.palette[10+item.level]
                    })
                }
                var edgeId=item.id+"_"+item.parent
                if(!allIds[edgeId]) {
                    allIds[edgeId] = 1
                    visjsData.edges.push({
                        id: edgeId,
                        from: item.id,
                        to: item.parent
                    })
                }

            })

        }

        visjsGraph.draw("graphDiv", visjsData)





    }


/*
        var maxDepth = 5

        drawRootNode = function (word) {
            var rootNodeColor = "#dda";
            var rootNodeSize = 20
            $("#graphDiv").width($(window).width() - 20)
            $("#graphDiv").height($(window).height() - 20)
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
                //  onHoverNodeFn: multiSkosGraph3.onNodeClick,
                afterDrawing: function () {
                    $("#waitImg").css("display", "none")
                }
            })


        }





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

       // edge beetwen word and concept
        var conceptId = bindings[0].concept.value;
        visjsData.edges.push({
            id: rootNodeId + "_" + conceptId,
            from: rootNodeId,
            to: conceptId,
            label: sourceId
        })


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
                data:{source:sourceId}
            }



            visjsData = GraphController.toVisjsData(visjsData, bindings, null, fromVar, toVar, options)
        }

        visjsGraph.data.nodes.add(visjsData.nodes)
        visjsGraph.data.edges.add(visjsData.edges)

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
                  {from:{},to:{shape:TermTaxonomy.graphActions.getVisjsGraphColor,color:self.graphActions.currentNode.color},data:self.graphActions.currentNode.data } )
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
            Sparql_generic.getNodeInfos(self.graphActions.currentNode.data.source, self.graphActions.currentNode.id, null, function (err, result) {
                if (err) {
                    return MainController.UI.message(err);
                }

                SourceEditor.showNodeInfos("TermTaxonomy_nodeInfosDialogDiv", "en", self.graphActions.currentNode.id, result)

            })
        }
        ,
        setAsRootNode: function () {
            self.graphActions.hidePopup();
            var word = self.graphActions.currentNode.label
            $('#searchWordInput').val(word)
            $('#dialogDiv').dialog('open')
            self.searchConcepts(word);


        }


    }*/


    return self;


})()
