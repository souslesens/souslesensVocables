var ADLbrowserGraph = (function () {


        var self = {}
        self.defaultNodeSize = 10;
        self.setGraphPopupMenus = function (node, event) {

            if (!node)
                return;

            var html =
                "    <span class=\"popupMenuItem\" onclick=\"ADLbrowserGraph.showGraphNodeInfos();\"> node infos</span>" +
                "    <span class=\"popupMenuItem\" onclick=\"ADLbrowserGraph.selectNode()\">selectNode</span>" +
                "    <span  class=\"popupMenuItem\"onclick=\"ADLbrowserGraph.collapseNode();\">collapse </span>"
            $("#graphPopupDiv").html(html)
        },

            self.showGraphNodeInfos = function () {
                ADLbrowser.showNodeInfos(self.currentGraphNode)
            }

        self.clearGraph = function () {
            ADLbrowser.jstree.load.loadAdl();
            visjsGraph.clearGraph()
            ADLbrowser.queryTypesArray = []
        },
            self.collapseNode = function () {
                visjsGraph.collapseNode(ADLbrowser.currentJstreeNode.id)

            },
            self.selectNode = function () {
                ADLbrowser.currentGraphNodeSelection = self.currentGraphNode
                $("#ADLbrowser_selectionDiv").html(self.currentGraphNode.data.label)
                //    ADLbrowser.query.showQueryParamsDialog(ADLbrowserGraph.lastRightClickPosition,self.currentGraphNode);

            },
            self.cancelGraphNodeSelection = function () {
                ADLbrowser.currentGraphNodeSelection = null
                $("#ADLbrowser_selectionDiv").html("ALL NODES")
                //   ADLbrowser.jstree.load.loadAdl();
            }
            ,

            self.addCountNodesToGraph = function (node, data, options, callback) {


                var count = data.data[0].count.value


                var visjsData = {nodes: [], edges: []}


                var nodeId = options.varName.substring(1) + "_filter"
              var color = Lineage_classes.getPropertyColor(ADLbrowserQuery.currentNode.id)

                visjsGraph.data.nodes.remove(nodeId)
                var nodeData = {
                    type: "count",
                    class: node.id,
                    count: count,
                    filter: options.filter,
                    filterLabel: options.filterLabel,
                    varName: options.varName,
                    color: color,
                    id: nodeId

                }
                //   var color = "#ffe0aa"


                visjsData.nodes.push({
                    id: nodeId,
                    label: count,
                    shape: "circle",
                    font: "14 arial black",
                    color: color,
                    data: nodeData,
                    //   fixed:{y:true},
                    //   y:-300

                })
                var edgeId = node.id + "_countEdge"
                visjsGraph.data.edges.remove(edgeId)
                visjsData.edges.push({
                    id: edgeId,
                    from: node.id,
                    to: nodeId,
                    label: options.filterLabel,
                    font: {color: color},
                    length: 5


                })

                visjsGraph.data.nodes.add(visjsData.nodes)
                visjsGraph.data.edges.add(visjsData.edges)

                ADLbrowserQuery.queryFilterNodes.splice(0, 0, nodeData);


                visjsGraph.data.nodes.update({
                    id: ADLbrowserQuery.currentNode.id,
                    color: color
                })

                return callback(null, nodeData)

            }


        self.drawGraph = function (graphDiv, data,options, callback) {

            var source = ADLbrowser.currentSource

            var existingNodes = visjsGraph.getExistingIdsMap()
            MainController.UI.message("drawing " + data.length + "nodes...")
            var visjsData = {nodes: [], edges: []}
            var keys={}
            options.selectVars.forEach(function(varName) {
                var key = varName.substring(1)
                keys[key] = {color: Lineage_classes.getPropertyColor(varName)}
            })

            data.data.forEach(function (item) {
                var previousId=null
               for(var key in keys){


                       var  label ="";

                       if(item[key+"Label"])
                           label=item[key+"Label"].value;
                      var   id = item[key].value;


                    if (!existingNodes[id]) {
                        existingNodes[id] = 1
                        var color = "#ddd"
                        visjsData.nodes.push({
                            id: id,
                            label: label,
                            shape: "dot",
                            color: color,
                            size: self.defaultNodeSize,
                            data: {

                                source: ADLbrowser.currentSource,

                                id: id,
                                label: label
                            }

                        })
                    }
                    if(previousId) {
                        var edgeId = previousId + "_" + id
                        if (!existingNodes[edgeId]) {
                            existingNodes[edgeId] = 1
                            visjsData.edges.push({
                                id: edgeId,
                                from: previousId,
                                to: id
                            })
                        }
                    }
                   previousId=id
                }
            })


            MainController.UI.message("drawing...")

            if (true  || !visjsGraph.data || !visjsGraph.data.nodes) {
                var visjsOptions = {
                    onclickFn: function (node, point, event) {
                        ADLbrowser.currentJstreeNode = node
                        if (event.ctrlKey)
                            ;


                    },
                    onRightClickFn: function (node, point, event) {
                        if (!node || node.length == 0)
                            return;
                        ADLbrowser.currentJstreeNode = node

                        MainController.UI.showPopup(point, "graphPopupDiv")
                        self.currentGraphNode = node;
                        self.setGraphPopupMenus(node, event)
                        point.x += leftPanelWidth
                        ADLbrowserGraph.lastRightClickPosition = point


                    }

                }
                visjsGraph.draw(graphDiv, visjsData, visjsOptions)
            } else {

                visjsGraph.data.nodes.add(visjsData.nodes)
                visjsGraph.data.edges.add(visjsData.edges)
                visjsGraph.redraw()
                visjsGraph.network.fit()
            }
            if(callback)
            callback()
        }


        return self;


    }
    ()
)
