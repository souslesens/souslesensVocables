var Pyramid = (function () {
        var self = {}
        var bottomIds = [];
        orphanShape="dot"
        self.onSourceSelect = function (thesaurusLabel) {


            ThesaurusBrowser.showThesaurusTopConcepts(thesaurusLabel)
            $("#actionDivContolPanelDiv").load("snippets/pyramid.html")

            setTimeout(function () {
                var sourceLabels = Object.keys(Config.sources).sort();
                common.fillSelectOptions("Pyramid_toSource", sourceLabels, true)


            }, 200)

        }

        self.drawTopConcepts = function () {
            bottomIds = [];
            var depth = parseInt($("#Pyramid_topDepth").val())
            Sparql_generic.getTopConcepts(MainController.currentSource, null, function (err, result) {
                if (err)
                    return MainController.UI.message(err);
                var ids = []
                result.forEach(function (item) {
                    ids.push(item.topConcept.value)
                })
                bottomIds.push(ids);


                var visjsData = GraphController.toVisjsData(null, result, null, "#", "topConcept",
                    {
                        from: {
                            shape: "box",
                            color: "#ddd"
                        },
                        to: {
                            shape: "box",
                            color: "#ddd"
                        }
                    })

                var options = {
                    nodes: {
                        shape: "box",
                        color: "#ddd"
                    },
                    onclickFn: Pyramid.graphActions.onNodeClick,
                    onRightClickFn: Pyramid.graphActions.showGraphPopupMenu,
                    layoutHierarchical: {direction: "LR", sortMethod: "directed"}

                }
                visjsGraph.draw("graphDiv", visjsData, options)


            })

        }

        self.addChildrenToGraph = function (nodeId) {
            var ids
            if (nodeId) {
                ids = nodeId
            } else {
                ids = bottomIds[bottomIds.length - 1];
            }

            Sparql_generic.getNodeChildren(MainController.currentSource, null, ids, 1, null, function (err, result) {


                if (err)
                    return MainController.UI.message(err);
                var map = [];
                var ids = []


                result.forEach(function (item) {
                    if (!map[item.concept.value])
                        map[item.concept.value] = []
                    map[item.concept.value].push(item)
                    ids.push(item.child1.value)
                })
                if (!nodeId && result.length > 0)// si on est dans touts les cousins et non pas sur un noeud particulier
                    bottomIds.push(ids);


                for (var key in map) {

                    if (map[key].length > 50) {
                        var node = {
                            id: key + "_children",
                            label: map[key].length + "children",
                            shape: "database"
                        }
                        var edge = {
                            from: key,
                            to: key + "_children",
                        }
                        visjsGraph.data.nodes.add(node)
                        visjsGraph.data.edges.add(edge)


                    }


                    var visjsData = GraphController.toVisjsData(null, map[key], key, "concept", "child1", {
                        from: {
                            shape: "box",
                            color: "#ddd"
                        },
                        to: {
                            shape: "box",
                            color: "#ddd"
                        }
                    })
                    visjsGraph.data.nodes.add(visjsData.nodes)
                    visjsGraph.data.edges.add(visjsData.edges)
                }
                var keys=Object.keys(map)
                var orphans=[]
                ids.forEach(function(id){
                    if(keys.indexOf(id)<0){
                        orphans.push({id:id,shape:orphanShape})
                    }
                })
                visjsGraph.data.nodes.update(orphans)


            })
        }

        self.drawSimilarsNodes=function(node){
            var sourceSchematype=Config.sources[MainController.currentSource].schemaType;
            var similars=[];
            var sources=Object.keys(Config.sources)
            async.eachSeries(sources,function(source,callbackEach) {
                if (source == MainController.currentSource)
                    return callbackEach();
                if (sourceSchematype != Config.sources[source].schemaType)
                    return callbackEach();

                var options = {filter: "filter (  regex(?conceptLabel,'^" + node.label + "$','i'))"}
console.log(source)
                Sparql_generic.getItems(source, options, function (err, result) {
                    if (err) {
                        return callbackEach(err);
                    }
                    result.forEach(function (item) {
                        similars.push({
                            id: item.concept.value,
                            label: item.conceptLabel.value,
                            source: source
                        });
                    })

                    callbackEach();
                })
            },function(err){
                if(err)
                    return MainController.UI.message(err);

            })



        }


        self.removeLastChildrenFromGraph = function (nodeId) {

            if(nodeId){
               var children= visjsGraph.network.getConnectedNodes(nodeId,"to");
                visjsGraph.data.nodes.remove(children)



            }else {
                if (bottomIds.length > 0)
                    visjsGraph.data.nodes.remove(bottomIds[bottomIds.length - 1])
                bottomIds.splice(bottomIds.length - 1, 1)
            }

        }

        self.setGraphPopupMenus = function (node) {
            if (!node)
                return;

            var html = "    <span class=\"popupMenuItem\" onclick=\"Pyramid.graphActions.drawChildren();\"> Object properties</span>\n" +
                "    <span class=\"popupMenuItem\" onclick=\"Pyramid.graphActions.drawSimilars();\"> draw similars</span>\n" +
                "    <span  class=\"popupMenuItem\"onclick=\"Pyramid.graphActions.hideChildren();\">hide children</span>"

            $("#graphPopupDiv").html(html);

        }


        self.graphActions = {

            showGraphPopupMenu: function (node, point, event) {
                self.setGraphPopupMenus(node)
                self.currentJstreeNode = node;
                MainController.UI.showPopup(point, "graphPopupDiv")

            },

            onNodeClick: function (node, point, options) {
                return MainController.UI.hidePopup("graphPopupDiv")

            },
            drawChildren: function () {

                Pyramid.addChildrenToGraph(self.currentJstreeNode.id)
            },

            drawSimilars: function () {
                Pyramid.drawSimilarsNodes(self.currentJstreeNode)
            },
            hideChildren: function () {
                Pyramid.removeLastChildrenFromGraph(self.currentJstreeNode.id)
            }
        }


        return self;


    }
)()
