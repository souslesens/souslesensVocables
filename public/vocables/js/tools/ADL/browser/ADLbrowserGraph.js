var ADLbrowserGraph = (function () {


        var self = {}
        self.defaultNodeSize = 5;
        self.setGraphPopupMenus = function (node, event) {

            if (!node)
                return;

            var html =
                "    <span class=\"popupMenuItem\" style='font-weight: bold'> " + node.label + "</span>" +
                "    <span class=\"popupMenuItem\" onclick=\"ADLbrowserGraph.showGraphNodeInfos();\"> node infos</span>" +
                "    <span class=\"popupMenuItem\" onclick=\"ADLbrowserGraph.selectNode()\">selectNode</span>" +
                "    <span  class=\"popupMenuItem\"onclick=\"ADLbrowserGraph.collapseNode();\">collapse </span>" +
                //  "    <span  class=\"popupMenuItem\"onclick=\"ADLbrowserGraph.expandNode();\">expandNode </span>" +

                " expand :<br><select size='4' id='ADLbrowser_graphMenuPredicateSelect' onchange='ADLbrowserGraph.expandNode($(this).val())'>"

            $("#graphPopupDiv").html(html)

            setTimeout(function () {
                self.setGraphPopupMenuAllowedExpandsSelect();

            }, 500)
        },


            self.setGraphPopupMenuAllowedExpandsSelect = function () {
                var classId = self.currentGraphNode.data.type;
                var retainedPredicates = ADLbrowserQuery.getClassPredicates(classId)
                var array = []
                retainedPredicates.forEach(function (item) {
                    array.push({
                        id: item.predicate + "|" + item.object + "|" + item.inverse,
                        label: "" + (item.inverse ? "^" : "") + ADLbrowserQuery.model[item.predicate].label + " : " + ADLbrowserQuery.model[item.object].label
                    })


                })

                common.fillSelectOptions("ADLbrowser_graphMenuPredicateSelect", array, false, "label", "id")


            }
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
                var color = "#adc"
                if (ADLbrowserQuery.currentNode)
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
                    id: nodeId,
                    predicate: options.predicate

                }
                //   var color = "#ffe0aa"


                visjsData.nodes.push({
                    id: nodeId,
                    label: count,
                    shape: "circle",
                    font: "18 arial black",
                    color: color,
                    borderWidth: 3,
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
                    width: 10


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
            if (self.currentGraph) {
                if (options.addToGraph)
                    existingNodes = self.restoreCurrentGraph()
            } else
                self.currentGraph = null;

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

            if (self.currentGraph && options.addToGraph) {
                visjsGraph.data.nodes.add(visjsData.nodes)
                visjsGraph.data.edges.add(visjsData.edges)
                visjsGraph.redraw()
                visjsGraph.network.fit()
                self.storeGraph()

            } else {
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


                    }, edges: {
                        smooth: {
                            type: "cubicBezier",
                            forceDirection: "horizontal",

                            roundness: 0.4,
                        },
                        arrows: {to: true}
                    },

                }
                visjsGraph.draw(graphDiv, visjsData, visjsOptions)
                self.storeGraph()
            }
            if (callback)
                callback()
        }


        self.expandNode = function (predicateStr) {


            if (predicateStr == "")
                return
            var array = predicateStr.split("|")
            var predicate = array[0];
            var objectClass = array[1]
            var inverse = array[2]

            var fromStr = Sparql_common.getFromStr(ADLbrowser.currentSource)

            var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX owl:<http://www.w3.org/2002/07/owl#> " +
                "Select  distinct * " + fromStr + " where {"
            if (inverse == "false")
                query += " <" + self.currentGraphNode.data.id + "> <" + predicate + "> ?obj .?obj rdf:type ?objType."// filter (?objType=<" + objectClass + ">)"
            else
                query += " ?obj <" + predicate + "> <" + self.currentGraphNode.data.id + "> .?obj rdf:type ?objType. "//filter (?objType=<" + objectClass + ">)"
            query += " optional {?obj rdfs:label ?objLabel}  " +

                "} LIMIT " + Config.ADL.queryLimit


            var url = Config.sources[ADLbrowser.currentSource].sparql_server.url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, {}, {source: ADLbrowser.currentSource}, function (err, result) {
                if (err)
                    return MainController.UI.message(err);
                if (result.results.bindings.length > Config.ADL.queryLimit)
                    return alert("Too many values found : > " + result.results.bindings.length)
                var visjsData = {nodes: [], edges: []}
                var existingNodes = visjsGraph.getExistingIdsMap()
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, "obj")

                result.results.bindings.forEach(function (item) {
                    var objId = item.obj.value;
                    if (!existingNodes[objId]) {
                        var color = "#ade"
                        if (ADLbrowserQuery.model[item.objType.value])
                            color = ADLbrowserQuery.model[item.objType.value].color

                        existingNodes[objId] = 1
                        visjsData.nodes.push({
                            id: objId,
                            label: item.objLabel.value,
                            shape: "dot",
                            color: color,
                            data: {
                                type: item.objType.value,
                                source: ADLbrowser.currentSource,
                                id: objId,
                                label: item.objLabel.value
                            },
                            size: self.defaultNodeSize,

                        })
                    }
                    var edgeId = self.currentGraphNode.data.id + "_" + objId;
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1
                        visjsData.edges.push({
                            id: edgeId,
                            from: self.currentGraphNode.data.id,
                            to: objId,


                        })


                    }

                })

                visjsGraph.data.nodes.add(visjsData.nodes)
                visjsGraph.data.edges.add(visjsData.edges)


            })


        }
        self.storeGraph = function () {
            if (visjsGraph.data) {//save modelGraph before drawing quryGraph
                self.currentGraph = {nodes: [], edges: [], params: {}}
                self.currentGraph.nodes = visjsGraph.data.nodes.get()
                self.currentGraph.edges = visjsGraph.data.edges.get()
                self.currentGraph.params = visjsGraph.currentDrawParams
            }
        }

        self.restoreCurrentGraph = function () {
            var visjsData = {
                nodes: self.currentGraph.nodes,
                edges: self.currentGraph.edges,
            }
            var options = self.currentGraph.params.options;
            visjsGraph.draw("graphDiv", visjsData, options)
            var oldIds = self.currentGraph.nodes
            oldIds = oldIds.concat(self.currentGraph.edges)
            var existingNodes = {}
            oldIds.forEach(function (obj) {
                existingNodes[obj.id] = 1;
            })
            return existingNodes;

        }


        return self;


    }
    ()
)
