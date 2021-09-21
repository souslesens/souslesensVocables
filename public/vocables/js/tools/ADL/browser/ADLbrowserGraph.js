var ADLbrowserGraph = (function () {


        var self = {}
        self.defaultNodeSize = 14;
        self.zeroCountIds = []
        self.setGraphPopupMenus = function (node, event) {

            if (!node || !node.data)
                return;

            var html =
                "<span class=\"popupMenuItem\" style='font-weight: bold;color:" + ADLbrowserQuery.model[node.data.type].color + "'> " + ADLbrowserQuery.model[node.data.type].label + "</span>" +
                "    <span class=\"popupMenuItem\" style='font-weight: bold'> " + node.label + "</span>" +
                "    <span class=\"popupMenuItem\" onclick=\"ADLbrowserGraph.showgraphNodeNeighborhood();\"> node infos</span>" +
                "    <span class=\"popupMenuItem\" onclick=\"ADLbrowserGraph.selectNode()\">selectNode</span>" +
                "    <span  class=\"popupMenuItem\" onclick=\"ADLbrowserGraph.collapseNode();\">collapse </span>" +
                "<div   id='ADLbrowser_customGraphPopupMenuDiv'></div>"

            html += " expand :<br><select size='4' id='ADLbrowser_graphMenuPredicateSelect' onchange='ADLbrowserGraph.showExpandNodeFilterDiv($(this).val())'></select>" +
                "<div id='ADLbrowser_expandNodeFilterDiv'></div>"


            $("#graphPopupDiv").html(html)

            setTimeout(function () {
                ADLbrowserCustom.setAdditionalGraphPopupMenuDiv()
                self.setGraphPopupMenuAllowedExpandsSelect();

            }, 500)
        },


            self.setGraphPopupMenuAllowedExpandsSelect = function () {

                var classId = self.currentGraphNode.data.type;
                var retainedPredicates = ADLbrowserQuery.getClassesPredicates(classId)
                var array = []
                retainedPredicates.forEach(function (item) {
                    array.push({
                        id: item.predicate + "|" + item.object + "|" + item.inverse,
                        label: "" + (item.inverse ? "^" : "") + ADLbrowserQuery.model[item.predicate].label + " : " + ADLbrowserQuery.model[item.object].label
                    })


                })

                common.fillSelectOptions("ADLbrowser_graphMenuPredicateSelect", array, false, "label", "id")


            }
        self.showgraphNodeNeighborhood = function () {
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

            self.addCountNodeToModelGraph = function (node, data, options, callback) {


                var visJsNode = visjsGraph.data.nodes.get(node.id)
                var nodePosition = {
                    x: visJsNode.x,
                    y: visJsNode.y
                }

                var nodeId = options.varName.substring(1) + "_filter"
                var count = data.data[0].count.value
                if (count == "0")
                    self.zeroCountIds.push(nodeId)


                var nodeLabel = node.data.label
                nodeLabel = node.data.label + " : " + count

                visjsGraph.data.nodes.update({
                    id: node.id,
                    label: nodeLabel,
                    font: {
                        color: "white",
                        background: node.color,
                        margin: 5
                    }
                })


                var visjsData = {nodes: [], edges: []}


                var color = "#ddd"
                if (false && ADLbrowserQuery.currentNode) {
                    var color = Lineage_classes.getPropertyColor(ADLbrowserQuery.currentNode.id)
                    var color = ADLbrowserQuery.model[nodeId]
                }


                visjsGraph.data.nodes.remove(nodeId)

                //   var color = "#ffe0aa"


                visjsData.nodes.push({
                    id: nodeId,
                    label: count,
                    shape: "circle",
                    font: "18 arial black",
                    color: color,
                    borderWidth: 3,
                    data: nodeData,
                    /*    fixed:true,
                       x:nodePosition.x,
                       y:nodePosition.y -30*/


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
                var superClassGroup = ADLbrowserCustom.superClassesMap[ADLbrowserQuery.varNamesMap[varName].id].group

                var key = varName.substring(1)
                keys[key] = {color: color, superClassGroup: superClassGroup}
            })


            data.data.forEach(function (item) {
                var previousId = null
                var itemIds = []
                var edgeNode;
                var edgeId
                for (var key in keys) {
                    edgeNode = null;

                    var label = "";
                    var type = ""
                    if (item[key + "Label"])
                        label = item[key + "Label"].value;
                    if (item[key + "Type"])
                        type = item[key + "Type"].value;
                    var id = item[key].value;

                    itemIds.push(id)
                    if (!existingNodes[id]) {
                        existingNodes[id] = 1

                        var color = keys[key].color
                        var imageType = keys[key].superClassGroup
                        visjsData.nodes.push({
                            id: id,
                            label: label,
                             shape: "dot",
                            image: ADLbrowserCustom.iconsDir + imageType + ".png",
                          //  shape: "circularImage",
                            color: color,
                            size: self.defaultNodeSize,
                            data: {
                                type: type,
                                source: ADLbrowser.currentSource,

                                id: id,
                                label: label,
                                varName: key
                            }

                        })
                    }
                    ADLbrowserQuery.queryFilterNodes.forEach(function (filter) {


                        if (filter.predicate && filter.predicate.object == type) {
                            var target = item[filter.varName.substring(1)]
                            if (target && target.value != id) {
                                target = target.value


                                edgeId = id + "_" + target
                                if(!existingNodes[edgeId]) {
                                    existingNodes[edgeId]=1
                                    edgeNode = {
                                        id: edgeId,
                                        to: id,
                                        from: target,
                                        property: filter.predicate

                                    }
                                }
                            }
                        } else if (filter.predicate && filter.predicate.subject == type) {
                            var target = item[filter.varName.substring(1)]
                            if (target && target.value != id) {
                                target = target.value
                                edgeId = target + "_" + id
                                if(!existingNodes[edgeId]) {
                                    existingNodes[edgeId] = 1
                                    edgeNode = {
                                        id: edgeId,
                                        from: target,
                                        to: id,
                                        property: filter.predicate
                                    }
                                }
                            }
                        }

                        else if(!filter.predicate){//transitive query(GraphTraversal)

                        }

                        if (edgeNode && !existingNodes[edgeId]) {
                            existingNodes[edgeId] = 1
                            visjsData.edges.push(edgeNode)
                        }

                        /*   if (previousId) {
                       var edgeId = previousId + "_" + id
                       if (!existingNodes[edgeId]) {
                           existingNodes[edgeId] = 1
                           visjsData.edges.push({
                               id: edgeId,
                               from: previousId,
                               to: id,


                           })

                   }}
                   previousId = id*/
                    })
                }
                if (!edgeNode) {// transitive query
                    itemIds.forEach(function (id, index) {
                        if (index > 0) {
                            var edgeId = (itemIds[index - 1]) + "_" + id
                            if (!existingNodes[edgeId]) {
                                existingNodes[edgeId]=1
                                var edgeNode2 = {
                                    id: edgeId,
                                    from: (itemIds[index - 1]),
                                    to: id,
                                    property: "transitive",
                                    arrows: {}
                                }
                                visjsData.edges.push(edgeNode2)

                            }
                        }
                    })
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
                        if (!node)
                            return MainController.UI.hidePopup("graphPopupDiv")
                        ADLbrowser.currentJstreeNode = node
                        if (event.ctrlKey)
                            ;


                    },
                    onRightClickFn: function (node, point, event) {
                        if (!node || node.length == 0)
                            return;
                        ADLbrowser.currentJstreeNode = node

                        MainController.UI.showPopup(point, "graphPopupDiv")
                        ADLbrowserGraph.currentGraphNode = node;
                        ADLbrowserGraph.setGraphPopupMenus(node, event)
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
                    keepNodePositionOnDrag: true,

                }
                visjsGraph.draw(graphDiv, visjsData, visjsOptions)
                self.storeGraph()
                $("#ADLbrowser_accordion").accordion("option", {active: 1});
                self.dataTree.setGraphNodesTree()
            }
            if (callback)
                callback()
        }


        self.showExpandNodeFilterDiv = function (predicateStr) {
            MainController.UI.blockHidePopup = true;
            // to not close popup (see hidePopupDiv in index.html)
            if (predicateStr == "")
                return
            var array = predicateStr.split("|")
            var targetClass = array[1]
            self.currentExpandingNode = {

                "data": {
                    "id": targetClass,
                    "type": "subject",
                    "label": ADLbrowserQuery.model[targetClass].label,

                    "predicate": array[0],
                    "objectClass": array[1],
                    "inverse": array[2]
                }

            }


            var predicate = self.currentExpandingNode.data.predicate
            var objectClass = self.currentExpandingNode.data.objectClass
            var inverse = self.currentExpandingNode.data.inverse
            var fromStr = Sparql_common.getFromStr(ADLbrowser.currentSource)

            var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX owl:<http://www.w3.org/2002/07/owl#> " +
                "Select  distinct * " + fromStr + " where {"
            if (inverse == "false")
                query += " <" + self.currentGraphNode.data.id + "> <" + predicate + "> ?obj .?obj rdf:type ?objType."// filter (?objType=<" + objectClass + ">)"
            else
                query += " ?obj <" + predicate + "> <" + self.currentGraphNode.data.id + "> .?obj rdf:type ?objType. "//filter (?objType=<" + objectClass + ">)"
            query += " optional {?obj rdfs:label ?objLabel}  " +

                "} ORDER by ?objLabel LIMIT " + Config.ADL.queryLimit


            var url = Config.sources[ADLbrowser.currentSource].sparql_server.url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, {}, {source: ADLbrowser.currentSource}, function (err, result) {
                if (err)
                    return MainController.UI.message(err);
                if (result.results.bindings.length > Config.ADL.queryLimit)
                    return alert("Too many values found : > " + result.results.bindings.length)

                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, "obj")

                ADLbrowserQuery.queryMode = "expandGraphNode"
                //ADLbrowserQuery.showQueryParamsDialog({x:300,y:300}, self.currentExpandingNode)


                var targetNodes = []
                self.currentExpandingNode.targeNodes = {}
                result.results.bindings.forEach(function (item) {
                    self.currentExpandingNode.targeNodes[item.obj.value] = item
                    targetNodes.push({id: item.obj.value, label: item.objLabel.value})
                })
                var html = "<button onclick='ADLbrowserGraph.expandNode(\"all\")'>all</button> " +
                    "&nbsp;or filter <select id='ADLbrowserGraph_filterTargetNodesSelect' onchange='ADLbrowserGraph.expandNode($(this).val())'></select>"
                $("#ADLbrowser_expandNodeFilterDiv").html(html)

                $("#ADLbrowser_expandNodeFilterDiv").html(html)
                MainController.UI.blockHidePopup = true;
                setTimeout(function () {
                    common.fillSelectOptions("ADLbrowserGraph_filterTargetNodesSelect", targetNodes, true, "label", "id")


                }, 200)
            })
        }


        self.expandNode = function (selectedNodeId) {
            MainController.UI.blockHidePopup = false;
            if (!selectedNodeId)
                selectedNodeId = $("#ADLbrowserGraph_filterTargetNodesSelect").val()
            var data = []
            for (var id in self.currentExpandingNode.targeNodes) {
                if (selectedNodeId == "all" || selectedNodeId == id)
                    data.push(self.currentExpandingNode.targeNodes[id])
            }

            var visjsData = {nodes: [], edges: []}
            var existingNodes = visjsGraph.getExistingIdsMap()


            data.forEach(function (item) {
                var objId = item.obj.value;
                if (!existingNodes[objId]) {
                    var color = "#ade"
                  /*  if (ADLbrowserQuery.model[item.objType.value])
                        color = ADLbrowserQuery.model[item.objType.value].color*/

                    var imageType = ADLbrowserCustom.superClassesMap[item.objType.value].group
                    color= ADLbrowserCustom.superClassesMap[item.objType.value].color


                    existingNodes[objId] = 1
                    visjsData.nodes.push({
                        id: objId,
                        label: item.objLabel.value,
                        shape: "dot",
                        image: ADLbrowserCustom.iconsDir + imageType + ".png",
                      //  shape: "circularImage",
                        color: color,
                        data: {
                            type: item.objType.value,
                            source: ADLbrowser.currentSource,
                            id: objId,
                            label: item.objLabel.value,
                            source: ADLbrowser.currentSource,
                            varName: item.objType.value,
                        },
                     size: self.defaultNodeSize,

                    })
                }
                var from = objId
                var to = self.currentGraphNode.data.id;
                if (self.currentExpandingNode.data.inverse == "true") {
                    var from = self.currentGraphNode.data.id;
                    var to = objId

                }
                var edgeId = from + "_" + to;

                if (!existingNodes[edgeId]) {
                    existingNodes[edgeId] = 1
                    visjsData.edges.push({
                        id: edgeId,
                        from: from,
                        to: to,
                        property: self.currentExpandingNode.data.predicate


                    })


                }

            })

            visjsGraph.data.nodes.add(visjsData.nodes)
            visjsGraph.data.edges.add(visjsData.edges)


        }
        self.storeGraph = function () {
            if (visjsGraph.data) {//save modelGraph before drawing quryGraph
                self.currentGraph = {nodes: [], edges: [], params: {}}
                self.currentGraph.nodes = visjsGraph.data.nodes.get()
                self.currentGraph.edges = visjsGraph.data.edges.get()
                self.currentGraph.params = visjsGraph.currentContext
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

        self.initGraphTab = function () {
            var classes = []
            ADLbrowserQuery.queryFilterNodes.forEach(function (filter) {
                classes.push(filter.class)
            })
            var retainedPredicates = ADLbrowserQuery.getClassesPredicates(classes,)


            common.fillSelectOptions("ADLbrowserGraph_expandSelect", retainedPredicates, true, "label", "id")

        }

        self.expandGraph = function (predicateId) {
            var array = predicateId.split("|");
            var subject = array[0]
            var predicate = array[1]
            var object = array[2]
            var inverse = array.length > 3


            var ids = []
            var idsStr = "";
            var nodes = visjsGraph.data.nodes.get();
            var existingClasses = {}
            nodes.forEach(function (item, index) {
                if (!existingClasses[item.data.type])
                    existingClasses[item.data.type] = []
                existingClasses[item.data.type].push({id: item.data.id, label: item.data.label})

                if (item.data.type == subject)
                    ids.push(item.data.id)
                if (index > 0)
                    idsStr += ","
                idsStr += "<" + item.data.id + ">"

            })
            var idStr = ids.toString()
            var where = "{?sub <" + predicate + "> ?obj. filter(?sub in(" + idsStr + ")) .?obj rdf:type <" + object + ">. optional {?obj rdfs:label ?objLabel}}"
            where += "UNION {?sub ^<" + predicate + "> ?obj. filter(?sub in(" + idsStr + ")) .?obj rdf:type <" + object + ">. optional {?obj rdfs:label ?objLabel}}"


            var source = ADLbrowser.currentSource
            var fromStr = Sparql_common.getFromStr(source)
            var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
                "select distinct ?sub ?subLabel ?obj ?objLabel " +
                fromStr +
                "WHERE {" + where + "} LIMIT 1000"


            var url = Config.sources[source].sparql_server.url + "?format=json&query=";
            MainController.UI.message("searching...")
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: source}, function (err, result) {
                // $("#waitImg").css("display", "none");
                if (err) {
                    return MainController.UI.message(err)
                }

                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, "obj")
                var visjsData = {nodes: [], edges: []}
                var existingNodes = visjsGraph.getExistingIdsMap()
                result.results.bindings.forEach(function (item) {
                    var id = item.obj.value;
                    if (!existingNodes[id]) {
                        existingNodes[id] = 1;
                        var data = {
                            id: id,
                            label: item.objLabel.value,
                            type: object,
                            source: ADLbrowser.currentSource

                        }
                        if (!existingClasses[object])
                            existingClasses[object] = []
                        existingClasses[object].push(data)
                        visjsData.nodes.push({
                            id: id,
                            label: item.objLabel.value,
                            shape: "square",
                            size: self.defaultNodeSize,
                            color: Lineage_classes.getPropertyColor(object),
                            data: data


                        })
                    }
                    var edgeId = item.sub.value + "_" + id;
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1;

                        visjsData.edges.push({
                            id: edgeId,
                            from: item.sub.value,
                            to: id
                        })


                    }

                })
                visjsGraph.data.nodes.add(visjsData.nodes)
                visjsGraph.data.edges.add(visjsData.edges)
                // update Eapnd Select
                var classes = []
                for (var classId in existingClasses) {
                    classes.push(classId)
                }
                var retainedPredicates = ADLbrowserQuery.getClassesPredicates(classes)
                common.fillSelectOptions("ADLbrowserGraph_expandSelect", retainedPredicates, true, "label", "id")

                self.dataTree.setGraphNodesTree(existingClasses)


            })


        }

        self.dataTree = {
            setGraphNodesTree: function (classesMap) {

                if (!classesMap) {
                    var nodes = visjsGraph.data.nodes.get();
                    var classesMap = {}
                    nodes.forEach(function (item, index) {
                        if (!classesMap[item.data.type])
                            classesMap[item.data.type] = []
                        classesMap[item.data.type].push({id: item.data.id, label: item.data.label})

                    })
                }

                var jstreedata = []

                for (var classId in classesMap) {
                    var label = ADLbrowserQuery.model[classId].label
                    var color = ADLbrowserQuery.model[classId].color
                    jstreedata.push({
                        id: "Graph" + classId,
                        text: "<span style='color:" + color + "'>" + ADLbrowserQuery.model[classId].label + "</span>",
                        parent: "#",
                        data: {
                            id: classId,
                            label: label,
                            type: classId,
                        }

                    })
                    classesMap[classId].forEach(function (item) {
                        jstreedata.push({
                            id: item.id,
                            text: item.label,
                            parent: "Graph" + classId,
                            data: {
                                id: item.id,
                                label: item.label,
                                type: item.type
                            }

                        })
                    })
                }
                var options = {
                    contextMenu: self.dataTree.getJstreeContextMenu(),
                    selectTreeNodeFn: self.dataTree.selectTreeNodeFn
                }


                common.jstree.loadJsTree("ADLbrowserGraph_nodesJstree", jstreedata, options)


            }
            , selectTreeNodeFn: function (event, obj) {
                self.dataTree.currentTreeNode = obj.node
                if (obj.node.parent == "#")
                    ;
                else
                    visjsGraph.focusOnNode(self.dataTree.currentTreeNode.id)

            }

            , getJstreeContextMenu: function () {
                var items = {}

                items.hideNodes = {
                    label: "hide nodes",
                    action: function (e, xx) {// pb avec source
                        if (ADLbrowserGraph.dataTree.currentTreeNode.parent == "#")
                            visjsGraph.hideShowNodes({type: ADLbrowserGraph.dataTree.currentTreeNode.data.type}, true)

                    }
                }
                items.showNodes = {
                    label: "show nodes",
                    action: function (e, xx) {// pb avec source
                        if (ADLbrowserGraph.dataTree.currentTreeNode.parent == "#")
                            visjsGraph.hideShowNodes({type: ADLbrowserGraph.dataTree.currentTreeNode.data.type}, false)

                    }
                }
                return items

            }
        }


        return self;


    }
    ()
)
