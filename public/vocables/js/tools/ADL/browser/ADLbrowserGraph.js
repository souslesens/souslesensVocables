var ADLbrowserGraph = (function () {


    var self = {}
    self.defaultNodeSize = 10;
    self.setGraphPopupMenus = function (node, event) {

        if (!node)
            return;

        var html =
            "    <span class=\"popupMenuItem\" onclick=\"ADLbrowserGraph.showGraphNodeInfos();\"> node infos</span>" +
            "    <span class=\"popupMenuItem\" onclick=\"ADLbrowserGraph.selectNode()\">selectNode</span>" +
            "    <span  class=\"popupMenuItem\"onclick=\"ADLbrowserGraph.collapseNode();\">collapse </span>" +
            "    <span  class=\"popupMenuItem\"onclick=\"ADLbrowserGraph.expandNode();\">expandNode </span>"

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
                font: "18 arial black",
                color: color,
                borderWidth:3,
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
                length: 5,
                width:10


            })

            visjsGraph.data.nodes.add(visjsData.nodes)
            visjsGraph.data.edges.add(visjsData.edges)


            visjsGraph.data.nodes.update({
                id: ADLbrowserQuery.currentNode.id,
                color: color
            })

            return callback(null, nodeData)

        }


    self.drawGraph = function (graphDiv, data, options, callback) {

        var source = ADLbrowser.currentSource

        var existingNodes = {}
        MainController.UI.message("drawing " + data.length + "nodes...")
        var visjsData = {nodes: [], edges: []}
        var keys = {}
        options.selectVars.forEach(function (varName) {
            var color = ADLbrowserQuery.varNamesMap[varName].color
            var key = varName.substring(1)
            keys[key] = {color: color}
        })

        data.data.forEach(function (item) {
            var previousId = null
            for (var key in keys) {


                var label = "";
                var type = ""
                if (item[key + "Label"])
                    label = item[key + "Label"].value;
                if (item[key + "Type"])
                    type = item[key + "Type"].value;
                var id = item[key].value;


                if (!existingNodes[id]) {
                    existingNodes[id] = 1
                    var color = keys[key].color
                    visjsData.nodes.push({
                        id: id,
                        label: label,
                        shape: "dot",
                        color: color,
                        size: self.defaultNodeSize,
                        data: {
                            type: type,
                            source: ADLbrowser.currentSource,

                            id: id,
                            label: label
                        }

                    })
                }
                if (previousId) {
                    var edgeId = previousId + "_" + id
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1
                        visjsData.edges.push({
                            id: edgeId,
                            from: previousId,
                            to: id,

                        })
                    }
                }
                previousId = id
            }
        })


        MainController.UI.message("drawing...")

        if (true || !visjsGraph.data || !visjsGraph.data.nodes) {
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
        if (callback)
            callback()
    }


    self.expandNode = function (inverse) {

        var classId = self.currentGraphNode.data.type
        var classes = ADLbrowserQuery.classes
        var where = ""





            var predicates = classes[classId]
            var retainedPredicates = []
            for (var predicate in predicates) {
                if (predicate.indexOf("label") > -1)
                    ;
                if (predicate.indexOf("type") > -1)
                    ;
                retainedPredicates.push(predicate)


            }





            var where = ""
            var predicatesInStr = "";
            var selectStr = "";

            retainedPredicates.forEach(function (predicateId, index) {
                if (index > 0)
                    predicatesInStr += ","
                predicatesInStr += "<" + predicateId + ">"


            })
            var filter = " FILTER (?prop in(" + predicatesInStr + ")) "

            var fromStr = Sparql_common.getFromStr(ADLbrowser.currentSource)


            var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX owl:<http://www.w3.org/2002/07/owl#> " +
                "Select  distinct * " + fromStr + " where {" +
                "{ <" + self.currentGraphNode.data.id + "> ?prop ?obj .?obj rdf:type ?objType. optional {?obj rdfs:label ?objLabel} } " +
                " UNION { ?obj  ?prop  <" + self.currentGraphNode.data.id + ">.?obj rdf:type ?objType.  optional {?obj rdfs:label ?objLabel} } " +
                "} LIMIT " + Config.ADL.queryLimit

            var url = Config.sources[ADLbrowser.currentSource].sparql_server.url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, {}, {source: ADLbrowser.currentSource}, function (err, result) {
                if (err)
                    return MainController.UI.message(err);
                if (result.results.bindings.length > Config.ADL.queryLimit)
                    return alert("Too many values found : > " + result.results.bindings.length)
                var visjsData = {nodes:[],edges:[]}
                var existingNodes = visjsGraph.getExistingIdsMap()
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, "obj")

                result.results.bindings.forEach(function (item) {
                    var objId=item.obj.value;
                    if(!existingNodes[objId]) {
                        var color = "#ade"
                        if (ADLbrowserQuery.model[item.objType.value])
                            color = ADLbrowserQuery.model[item.objType.value].color

                        existingNodes[objId] = 1
                        visjsData.nodes.push({
                            id: objId,
                            label: item.objLabel.value,
                            shape: "triangle",
                            color: color,
                            data: {
                                type: item.objType.value,
                                source: ADLbrowser.currentSource,
                                id: objId,
                                label: item.objLabel.value
                            }

                        })
                    }
                        var edgeId=self.currentGraphNode.data.id+"_"+objId;
                    if(!existingNodes[edgeId]){
                        existingNodes[edgeId]=1
                        visjsData.edges.push({
                            id: edgeId,
                            from:self.currentGraphNode.data.id,
                            to:objId

                        })


                    }

                })

                visjsGraph.data.nodes.add(visjsData.nodes)
                visjsGraph.data.edges.add(visjsData.edges)



            })


        }


        return self;


    }
    ()
)
