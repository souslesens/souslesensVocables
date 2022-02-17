var TE_TagGenerator = (function () {
        var self = {}
        self.currentSource = "TSF-RDS-OG-81346"
        self.displayedDivsMap = {}
        self.objectsMap = {}
        self.systemsMap = {


            "http://data.total.com/resource/tsf/RDS_OG_81346/Location_aspect/Construction_complexe_1": {
                label: "Construction complex",

                color: "#d54df3",
                level: 1,
                aspect: "Location",
                leafLevel: 1
            },
            "http://data.total.com/resource/tsf/RDS_OG_81346/Location_aspect/Construction_entity_2": {
                label: "Construction entity",

                color: "#d54df3",
                level: 2,
                aspect: "Location",
                leafLevel: 2
            },
            "http://data.total.com/resource/tsf/RDS_OG_81346/Location_aspect/Space_3": {
                label: "Space",

                color: "#d54df3",
                level: 3,
                aspect: "Location",
                leafLevel: 2
            },
            "http://data.total.com/resource/tsf/RDS_OG_81346/Construction_Work_aspect/Functional_system_1": {
                label: "Functional system",
                color: "#619108",
                level: 1,
                aspect: "Construction work",
                leafLevel: 1
            },
            "http://data.total.com/resource/tsf/RDS_OG_81346/Construction_Work_aspect/Technical_system_2": {
                label: "Technical system CW",

                color: "#619108",
                level: 2,
                aspect: "Construction work",
                leafLevel: 2
            },

            "http://data.total.com/resource/tsf/RDS_OG_81346/Function_aspect/Oil_and_gas_system_1": {
                label: "Oil & gas system",
                color: "#fab70e",
                aspect: "Function",
                level: 1,
                leafLevel: 1
            },
            "http://data.total.com/resource/tsf/RDS_OG_81346/Function_aspect/Technical_system_2": {
                label: "Technical system F",

                color: "#fab70e",
                level: 2,
                aspect: "Function",
                leafLevel: 2
            },
            "http://data.total.com/resource/tsf/RDS_OG_81346/Product_aspect/Component_system_3": {
                label: "Component",

                color: "#c7f8ea",
                level: 3,
                aspect: "Component",
                leafLevel: 3
            },


        }

        self.currentSystem = -1

        self.onLoaded = function () {


            $("#actionDivContolPanelDiv").load("customPlugins/TotalEnergies/TE_TagGenerator/snippets/leftPanel.html", function () {
                $("#TE_TagGenerator_searchAllDiv").load("snippets/searchAll.html", function () {
                    $("#GenericTools_searchInAllSources").prop("checked", false)
                    $("#GenericTools_searchInAllSources").prop("checked", false)
                    $(".GenericTools_searchAllOptional").css("display", "none")

                    MainController.currentSource = self.currentSource
                    $(".TE_TagGenerator_itemSelect").bind("change", function () {
                        TE_TagGenerator.on81346TypeSelect($(this).val(), $(this).attr("id"));
                        $(this).val("")
                    })
                    //  self.initSytemsTree();
                    self.initSytemsSelect()
                    Config.sources[self.currentSource].controller = Sparql_OWL
                    visjsGraph.clearGraph()
                    self.listSavedGraphs()
                })
            })
            //    $("#graphDiv").load("customPlugins/TotalEnergies/TE_TagGenerator/snippets/centralPanel.html")


            MainController.UI.toogleRightPanel(true)
            $("#rightPanelDiv").html("")
            $("#rightPanelDiv").load("customPlugins/TotalEnergies/TE_TagGenerator/snippets/rightPanel.html")

            $("#accordion").accordion("option", {active: 2});

        }
        self.initSytemsSelect = function () {


            var htmlAspects = []
            for (var key in self.systemsMap) {
                var obj = self.systemsMap[key]
                var divId = common.getRandomHexaId(10)
                var str = "<div class='TagGenerator_SystemDiv' id='" + divId + "'" +
                    " onclick='TE_TagGenerator.filterSytemTree(\"" + key + "\",\"" + divId + "\")'> " + obj.label + "</div>"

                if (!htmlAspects[obj.aspect])
                    htmlAspects[obj.aspect] = {html: "", color: obj.color};
                htmlAspects[obj.aspect].html += str

            }

            var html = ""
            for (var key in htmlAspects) {
                html += "<b>" + key + "</b>"
                html += "<div id='" + key + "'  class='TagGenerator_AspectDiv'' style='background-color: " + htmlAspects[key].color + " '>" +

                    htmlAspects[key].html +
                    "</div>"

            }
            $("#TE_TagGenerator_allSystemsDiv").append(html)

            return

        }

        self.initSytemsTree = function () {

            var options = {
                targetDiv: "TE_TagGenerator_81346TreeDiv",
                selectTreeNodeFn: function (evt, obj) {
                    var node = obj.node
                    self.currentTreeNode = node
                    SourceBrowser.openTreeNode("TE_TagGenerator_81346TreeDiv", self.currentSource, node)
                },

                contextMenu: TE_TagGenerator.getSystemsTreeContextMenu()

            }
            SourceBrowser.showThesaurusTopConcepts(self.currentSource, options)


        }

        self.getSystemsTreeContextMenu = function () {
            var items = {}


            items.addNode = {
                label: "add Node",
                action: function (e) {// pb avec source
                    TE_TagGenerator.addNode(self.currentTreeNode)
                }
            }

            items.nodeInfos = {
                label: "Node infos",
                action: function (e) {// pb avec source
                    SourceBrowser.showNodeInfos(self.currentTreeNode.data.source, self.currentTreeNode.data.id, "mainDialogDiv")
                }
            }
            return items

        }


        self.filterSytemTree = function (systemUri, sytemDivId) {
            $(".TagGenerator_SystemDiv").removeClass("TagGenerator_SystemDiv_selected")
            $("#" + sytemDivId).addClass("TagGenerator_SystemDiv_selected")
            self.currentSystem = systemUri

            Sparql_OWL.getNodeChildren(self.currentSource, null, systemUri, 3, {}, function (err, result) {
                if (err)
                    return MainController.UI.message(err);


                var options = {
                    selectTreeNodeFn: function (evt, obj) {
                        if (obj.event.ctrlKey) {
                            return self.addNode(obj.node)
                        }
                        var node = obj.node
                        self.currentTreeNode = node
                        var options = {optionalData: {systemType: node.data.systemType}}
                        SourceBrowser.openTreeNode("TE_TagGenerator_81346TreeDiv", self.currentSource, node, options)
                        self.setTreeSystemNodesInfos(obj.node.id)

                    },
                    contextMenu: TE_TagGenerator.getSystemsTreeContextMenu(),
                    optionalData: {system: "concept"},

                }
                TreeController.drawOrUpdateTree("TE_TagGenerator_81346TreeDiv", result, "#", "child1", options)


                self.setTreeSystemNodesInfos()
            })

        }

        self.addNode = function (node) {
            $("#TagGenerator_treeInfosDiv").html("");
            /*  if (node.parents.length + 1 < self.currentSystem.leafLevel)
                        return $("#TagGenerator_treeInfosDiv").html("not allowed , select a descendant")*/
            $("#TagGenerator_treeInfosDiv").html("adding " + node.data.label);
            if (true) {
                var level = self.systemsMap[self.currentSystem].level

                node.data.level = level
                node.data.system = self.currentSystem
                node.data.aspect = self.systemsMap[self.currentSystem].aspect


                if (!self.objectsMap[node.data.id]) {
                    self.objectsMap[node.data.id] = {counter: 0, items: []}
                    var counter = self.objectsMap[node.data.id].counter + 1
                    self.objectsMap[node.data.id].counter = counter;

                }
                node.data.number = counter

                var existingNodes = visjsGraph.getExistingIdsMap()
                var visjsData = {nodes: [], edges: []}
                var visjsId = common.getRandomHexaId(10);
                var code = self.systemsMap[self.currentSystem].items[node.data.id].code
                node.data.definition = self.systemsMap[self.currentSystem].items[node.data.id].definition
                node.data.example = self.systemsMap[self.currentSystem].items[node.data.id].example
                node.data.code = code
                var node = {
                    id: visjsId,
                    label: code,
                    data: node.data,
                    level: level,
                    shape: "square",
                    size: 10,
                    color: self.systemsMap[self.currentSystem].color
                }
                visjsData.nodes.push(node)

                if (self.currentGraphNode)
                    self.createRelation(node, self.currentGraphNode, function (err, result) {
                        if (err)
                            MainController.UI.message(err)
                        else
                            visjsData.edges = visjsData.edges.concat(result.edges)
                    })
                self.currentGraphNode = node

                self.addToGraph(visjsData)


            }

        }
        self.addToGraph = function (visjsData) {
            if (visjsGraph.isGraphNotEmpty()) {
                //  if (Object.keys(visjsGraph.getExistingIdsMap()).length>0) {
                visjsGraph.data.nodes.add(visjsData.nodes)
                if (visjsData.edges.length > 0)
                    visjsGraph.data.edges.add(visjsData.edges)
                $("#graphDiv").focus()
            } else {
                var options = {
                    "layout": {
                        "hierarchical": {
                            "enabled": true,
                            "levelSeparation": 120,
                            "nodeSpacing": 150,
                            "sortMethod": "directed"
                        }
                    },
                    "physics": {
                        "enabled": false,
                        "hierarchicalRepulsion": {
                            "centralGravity": 0,
                            "nodeDistance": 0,
                            "avoidOverlap": 0
                        },
                        "minVelocity": 0.75,
                        "solver": "hierarchicalRepulsion"
                    }
                }
                options.onclickFn = function (node, point, options) {
                    self.currentGraphNode = node
                    if (options.ctrlKey) {
                        if (!self.relationObj)
                            self.relationObj = {start: node}
                        else {
                            self.relationObj.end = node
                            self.createRelation(self.relationObj.start, self.relationObj.end, function (err, visjsData) {
                                if (err)
                                    MainController.UI.message(err)
                                else {
                                    var existingNodes = visjsGraph.getExistingIdsMap()
                                    visjsGraph.data.edges.add(visjsData.edges)
                                    self.relationObj = null;
                                }

                            })
                        }
                    }
                }
                options.onHoverNodeFn = function (node, point, options) {
                    var html = "<table>"

                    html += "<tr><td>Aspect: </td><td>" + self.systemsMap[node.data.system].aspect + "</td></tr>"
                    html += "<tr><td>System: </td><td>" + self.systemsMap[node.data.system].label + "</td></tr>"
                    html += "<tr><td>Label: </td><td>" + node.data.label + "</td></tr>"
                    html += "<tr><td>Location TAG: </td><td><B>" + self.getNodeTag(node).locationTag + "</B></td></tr>"
                    html += "<tr><td>Function TAG: </td><td><B>" + self.getNodeTag(node).functionTag + "</B></td></tr>"
                    html += "</table>"

                    $("#TagGenerator_graphHOverDiv").html(html)
                    //  $("TagGenerator_graphHOverDiv").css("background-color",self.systemsMap[node.data.system].color)

                    // SourceBrowser.drawCommonInfos(self.currentSource, node.data.id, "TagGenerator_NodeInfosDiv")
                }

                visjsGraph.draw("graphDiv", visjsData, options)
            }
            self.setSystemTypesSelectVisibility(self.currentSystem.level);

            setTimeout(function () {
                visjsGraph.network.redraw()
            }, 20)

        }


        self.setSystemTypesSelectVisibility = function (level) {

            return;
            var levels
            if (level == -1)
                levels = [1, 2, 3, 4, 5, 6, 7, 8]
            else
                levels = [level - 1, level, level + 1]
            for (var key in self.systemsMap) {
                if (levels.indexOf(self.systemsMap[key].level) < 0)
                    $("#" + key).css("display", "none")
                else
                    $("#" + key).css("display", "block")
            }
        }


        self.setSystemTypesSelectVisibilityOld = function () {
            var currentSystem = 10
            var currentSystem = null;
            if (self.currentDisplayDivId)
                currentSystem = self.displayedDivsMap[self.currentDisplayDivId].systemType
            if (currentSystem) {
                currentSystem = self.systemsMap[currentSystem].level
            }
            for (var key in self.systemsMap) {
                if (self.systemsMap[key].level > currentSystem + 1)
                    $("#" + key).css("display", "none")
                else
                    $("#" + key).css("display", "block")
            }
        }


        self.deleteSelectedObject = function () {
            visjsGraph.data.nodes.remove(self.currentGraphNode.id)
            /*  if (self.currentDisplayDivId) {
                  delete self.displayedDivsMap[self.currentDisplayDivId]
                  $("#" + self.currentDisplayDivId).remove();
                  self.currentDisplayDivId = null
              }*/

        }
        self.clearAll = function () {
            visjsGraph.clearGraph()
            self.displayedDivsMap = {}
            $("#TagGenerator_displayDiv").html("");
            self.currentDisplayDivId = null;
            self.setSystemTypesSelectVisibility(-1)
            self.currentGraphNode = null;
        }


        self.getNodeTag = function (targetNode) {
            if (!targetNode)
                return;
            var edges = visjsGraph.data.edges.get()
            var nodeIds = []
            if (edges.length < 1)
                return {
                    locationTag: "+" + targetNode.data.code,
                    functionTag: "=" + targetNode.data.code
                }


            edges.forEach(function (edge) {
                if (edge.from == targetNode.id || edge.to == targetNode.id)
                    if (nodeIds.indexOf(edge.from) < 0)
                        nodeIds.push(edge.from)
                if (nodeIds.indexOf(edge.to) < 0)
                    nodeIds.push(edge.to)
            })
            if (nodeIds.length == 0)
                return ""
            var nodes = visjsGraph.data.nodes.get(nodeIds)


            nodes.sort(function (a, b) {
                if (a.data.level > b.data.level)
                    return 1
                if (a.data.level < b.data.level)
                    return -1
                return 0
            })


            var bulQueryStr = ""
            var header = {}
            /*   nodes.forEach(function (node) {
                   var query = {
                       "query": {
                           "term": {
                               "id.keyword": node.data.id,
                           }
                       }
                   }
                   bulQueryStr += JSON.stringify(header) + "\r\n" + JSON.stringify(query) + "\r\n";
               })

               ElasticSearchProxy.executeMsearch(bulQueryStr, function (err, result) {
                   if (err)
                       return MainController.UI.message(err)

                   result.forEach(function (item) {

                   })
               })*/


            var locationTag = "+"
            var functionTag = "="
            nodes.forEach(function (node) {

                if (node.data.level > targetNode.data.level)
                    return;
                if (node.data.aspect == "Component") {
                    locationTag += node.data.code + "."
                    functionTag += node.data.code + "."
                } else {

                    if (node.data.aspect != targetNode.data.aspect && targetNode.data.aspect!="Component")
                        return;

                    if (node.data.aspect == "Location" || node.data.aspect == "Construction work")
                        locationTag += node.data.code + "."
                    if (node.data.aspect == "Function")
                        functionTag += node.data.code + "."
                }
            })


            return {functionTag: functionTag, locationTag: locationTag}

        }


        self.createRelation = function (startNode, endNode, callback) {

            var getEdge = function (relationType) {
                var edgeId = common.getRandomHexaId(10);
                var edge
                if (startNode.data.level < endNode.data.level) {
                    edge = {
                        id: edgeId,
                        from: endNode.id,
                        to: startNode.id,
                        data: {
                            from: endNode.id,
                            to: startNode.id,


                        }
                    }
                } else {
                    edge = {
                        id: edgeId,
                        from: startNode.id,
                        to: endNode.id,
                        data: {
                            from: startNode,
                            to: endNode.id,


                        }
                    }
                }
                edge.arrows = {
                    to: {
                        enabled: true,
                        type: Lineage_classes.defaultEdgeArrowType,
                        scaleFactor: 0.5
                    },
                }

                if (relationType) {
                    edge.label = relationType;
                    edge.dashes = true;
                    edge.data.type = relationType
                }

                return edge;
            }

            var visjsData = {edges: []}
            var globalOK = false
            if (startNode.data.aspect == endNode.data.aspect) {

                var deltaLevel = Math.abs(startNode.data.level - endNode.data.level)
                if (deltaLevel == 1 || deltaLevel == 1) {
                    visjsData.edges.push(getEdge())
                    globalOK = true
                }

            } else {
                var ok1 = startNode.data.aspect == "Location" && endNode.data.aspect == "Component"
                var ok2 = startNode.data.aspect == "Component" && endNode.data.aspect == "Location"
                var ok3 = startNode.data.level == endNode.data.level
                if ((ok1 || ok2)) {

                    visjsData.edges.push(getEdge("part14:hasLocation"))
                    globalOK = true
                } else {
                    var ok1 = startNode.data.aspect == "Function" && endNode.data.aspect == "Component"
                    var ok2 = startNode.data.aspect == "Component" && endNode.data.aspect == "Function"
                    var ok3 = startNode.data.level == endNode.data.level

                    if ((ok1 || ok2)) {

                        visjsData.edges.push(getEdge("part14:implements"))
                        globalOK = true
                    }
                }

            }
            var err = null
            if (!globalOK)
                err = "relation not allowed "

            return callback(err, visjsData)
        }

        self.setTreeSystemNodesInfos = function (topNode) {

            setTimeout(function () {
                if (!topNode)
                    topNode = "#"
                var treeNodes = common.jstree.getjsTreeNodes("TE_TagGenerator_81346TreeDiv", false, "#")
                var ids = []
                treeNodes.forEach(function (item) {
                    ids.push(item.data.id)
                })
                var options = {
                    filter: Sparql_common.setFilter("concept", ids)
                }
                Sparql_OWL.getItems(self.currentSource, options, function (err, result2) {
                    if (err)
                        return MainController.UI.message(err);
                    if (!self.systemsMap[self.currentSystem].items)
                        self.systemsMap[self.currentSystem].items = {}
                    result2.forEach(function (item) {
                        var obj = {id: item.concept.value}
                        obj.code = item.concept.value.substring(item.concept.value.lastIndexOf("/") + 1)
                        /*if (item.p.value == "http://souslesens.org/resource/vocabulary/hasCode")
                            obj.code = item.o.value*/
                        if (item.p.value == "http://www.w3.org/2004/02/skos/core#definition")
                            obj.definition = item.o.value

                        if (item.p.value == "http://www.w3.org/2004/02/skos/core#example")
                            obj.example = item.o.value

                        self.systemsMap[self.currentSystem].items[obj.id] = obj
                    })

                })
            }, 500)
        }


        self.saveGraph = function () {
            var graphName = prompt("graph name")
            if (graphName)
                visjsGraph.saveGraph("RDS_" + graphName, true)
        }
        self.loadGraph = function (graphName) {
            visjsGraph.clearGraph()
            self.addToGraph({nodes: [{id: "graphName", "label": graphName, level: 0,shape:"box"}], edges: []})
            visjsGraph.loadGraph(graphName, true)
        }

        self.listSavedGraphs = function () {
            visjsGraph.listSavedGraphs(function (err, result) {
                if (err)
                    return MainController.UI.message(err)
                var graphs = []
                result.forEach(function (item) {
                    if (item.indexOf("RDS_") == 0)
                        graphs.push(item)
                })
                common.fillSelectOptions("TE_TagGenerator_savedGraphsSelect", graphs, true)
            })
        }


        return self;
    }
)()