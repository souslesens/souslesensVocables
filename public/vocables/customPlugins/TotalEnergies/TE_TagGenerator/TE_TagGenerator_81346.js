var TE_TagGenerator = (function () {
        var self = {}
        self.currentSource = "TSF-ISO-IEC-81346"
        self.displayedDivsMap = {}
        self.systemsMap = {


            "TE_TagGenerator_L1_SELECT": {
                uri: "http://data.total.com/resource/tsf/IEC_ISO_81346/construction_complexes",
                color: "#d54df3",
                level: 1,
                leafLevel: 1
            },
            "TE_TagGenerator_L2_SELECT": {
                uri: "http://data.total.com/resource/tsf/IEC_ISO_81346/space",
                color: "#d54df3",
                level: 2,
                leafLevel: 2
            },
            "TE_TagGenerator_L3_SELECT": {
                uri: "http://data.total.com/resource/tsf/IEC_ISO_81346/space",
                color: "#d54df3",
                level: 3,
                leafLevel: 2
            },
            "TE_TagGenerator_F1_SELECT": {
                uri: "http://data.total.com/resource/tsf/IEC_ISO_81346/functional_systems",
                color: "#fab70e",
                level: 4,
                leafLevel: 1
            },
            "TE_TagGenerator_F2_SELECT": {
                uri: "http://data.total.com/resource/tsf/IEC_ISO_81346/technical_systems",
                color: "#fab70e",
                level: 5,
                leafLevel: 2
            },
            "TE_TagGenerator_F3_SELECT": {
                uri: "http://data.total.com/resource/tsf/IEC_ISO_81346/object_functions",
                color: "#fab70e",
                level: 6,
                leafLevel: 3
            },


        }

        self.currentSystemType = -1

        self.onLoaded = function () {


            $("#actionDivContolPanelDiv").load("customPlugins/TotalEnergies/TE_TagGenerator/snippets/leftPanel.html", function () {
                $("#TE_TagGenerator_searchAllDiv").load("snippets/searchAll.html", function () {
                    $("#GenericTools_searchInAllSources").prop("checked", false)
                    $("#GenericTools_searchInAllSources").prop("checked", false)
                    $(".GenericTools_searchAllOptional").css("display", "none")

                    MainController.currentSource = "TSF-ISO-IEC-81346"
                    $(".TE_TagGenerator_itemSelect").bind("change", function () {
                        TE_TagGenerator.on81346TypeSelect($(this).val(), $(this).attr("id"));
                        $(this).val("")
                    })
                    //    self.init81346Tree();
                    self.init81346Types()
                    Config.sources[self.currentSource].controller = Sparql_OWL
                })
            })
            //    $("#graphDiv").load("customPlugins/TotalEnergies/TE_TagGenerator/snippets/centralPanel.html")


            MainController.UI.toogleRightPanel(true)
            $("#rightPanelDiv").html("")
            $("#rightPanelDiv").load("customPlugins/TotalEnergies/TE_TagGenerator/snippets/rightPanel.html")

            $("#accordion").accordion("option", {active: 2});

        }
        self.init81346Types = function () {

            function setTypeSelectOptions(selectId, parentClassId) {
                Sparql_generic.getNodeChildren(self.currentSource, null, parentClassId, 1, null, function (err, result) {
                    if (err)
                        return MainController.UI.message(err);
                    var objs = []
                    result.forEach(function (item) {
                        objs.push({
                            id: item.child1.value,
                            label: item.child1Label.value,
                        })
                    })
                    objs.sort(function (a, b) {
                        return a.label - b.label;
                    })
                    common.fillSelectOptions(selectId, objs, true, "label", "id")

                })
            }

            setTypeSelectOptions("TE_TagGenerator_L1_SELECT", "http://data.total.com/resource/tsf/IEC_ISO_81346/construction_complexes")
            setTypeSelectOptions("TE_TagGenerator_L2_SELECT", "http://data.total.com/resource/tsf/IEC_ISO_81346/construction_entities")
            setTypeSelectOptions("TE_TagGenerator_L3_SELECT", "http://data.total.com/resource/tsf/IEC_ISO_81346/space")
            setTypeSelectOptions("TE_TagGenerator_F1_SELECT", "http://data.total.com/resource/tsf/IEC_ISO_81346/functional_systems")
            setTypeSelectOptions("TE_TagGenerator_F2_SELECT", "http://data.total.com/resource/tsf/IEC_ISO_81346/technical_systems")
            setTypeSelectOptions("TE_TagGenerator_F3_SELECT", "http://data.total.com/resource/tsf/IEC_ISO_81346/object_functions")


        }

        self.init81346Tree = function () {

            var options = {
                targetDiv: "TE_TagGenerator_81346TreeDiv",
                selectTreeNodeFn: function (evt, obj) {
                    var node = obj.node
                    self.currentTreeNode = node
                    SourceBrowser.openTreeNode("TE_TagGenerator_81346TreeDiv", self.currentSource, node)
                },

                contextMenu: TE_TagGenerator.get81346ContextMenu

            }
            SourceBrowser.showThesaurusTopConcepts(self.currentSource, options)


        }

        self.get81346ContextMenu = function () {
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

        self.on81346TypeSelect = function (typeId, systemType) {
            self.currentSystemType = self.systemsMap[systemType]

            Sparql_OWL.getNodeChildren(self.currentSource, null, typeId, 3, {}, function (err, result) {
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
                    },
                    contextMenu: TE_TagGenerator.get81346ContextMenu(),
                    optionalData: {systemType: systemType},

                }

                TreeController.drawOrUpdateTree("TE_TagGenerator_81346TreeDiv", result, "#", "child1", options)
            })

        }

        self.addNode = function (node) {
            $("#TagGenerator_treeInfosDiv").html("");
            if (node.parents.length + 1 < self.currentSystemType.leafLevel)
                return $("#TagGenerator_treeInfosDiv").html("not allowed , select a descendant")
            $("#TagGenerator_treeInfosDiv").html("adding " + node.data.label);
            if (true) {
                node.data.level = self.currentSystemType.level


                var existingNodes = visjsGraph.getExistingIdsMap()
                var visjsData = {nodes: [], edges: []}
                var visjsId = common.getRandomHexaId(10);
                var node = {
                    id: visjsId,
                    label: node.data.label,
                    data: node.data,
                    level: self.currentSystemType.level,
                    shape: "square",
                    size: 10,
                    color: self.currentSystemType.color
                }
                visjsData.nodes.push(node)

                if (self.currentGraphNode) {
                    var deltaLevel = Math.abs(self.currentGraphNode.level - self.currentSystemType.level)
                    if (deltaLevel == 1 || deltaLevel == 1) {
                        visjsData.edges.push({
                            id: common.getRandomHexaId(10),
                            from: visjsId,
                            to: self.currentGraphNode.id
                        })
                    }

                }
                self.currentGraphNode = node


                if (visjsGraph.data && visjsGraph.data.nodes) {
                    visjsGraph.data.nodes.add(visjsData.nodes)
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
                                self.createRelation(self.relationObj, function (err) {
                                    self.relationObj = null;
                                })
                            }
                        }
                    }

                    visjsGraph.draw("graphDiv", visjsData, options)
                }
                self.setSystemTypesSelectVisibility(self.currentSystemType.level);
            }

            if (false) {
                var id = node.data.id;
                var label = node.data.label;
                var divId = common.getRandomHexaId(10);
                self.displayedDivsMap[divId] = node.data

                var color = self.systemsMap[node.data.systemType].color

                var html = "<div id='" + divId + "' >" +
                    "<div class='TagGenerator_displayDivTitle' style='color:" + color + "'>" + node.data.label + "</div>" +
                    "<div id='" + divId + "_rect'  class='TagGenerator_displayDiv' style='border-color:" + color + "' ></div>" +
                    "</div>"

                var containerDivId
                if (!self.currentDisplayDivId)
                    containerDivId = "TagGenerator_displayDiv"
                else
                    containerDivId = self.currentDisplayDivId

                $("#" + containerDivId).append(html)


                if (self.currentDisplayDivId) {
                    var curentDivObj = self.displayedDivsMap[self.currentDisplayDivId]
                    var currentDivIdLevel = self.systemsMap[curentDivObj.systemType].level
                    if (currentDivIdLevel > self.systemsMap[node.data.systemType].level) {// include outside


                        $("#" + self.currentDisplayDivId).wrapAll($("#" + divId + "_rect"));


                    }
                }

                //   $("#" + containerDivId).append(html)

                $("#" + divId + "_rect").bind("click", function () {
                    var divId = $(this).attr("id")
                    var divId2 = divId.replace("_rect", "")
                    $("#TagGenerator_infosDiv").html(self.displayedDivsMap[divId2].label);
                    $(".TagGenerator_displayDiv").removeClass("TagGenerator_selectedDisplayDiv")
                    $(this).addClass("TagGenerator_selectedDisplayDiv")
                    self.currentDisplayDivId = divId2;

                    event.stopPropagation();
                })

                document.getElementById(divId + "_rect").click();
                self.setSystemTypesSelectVisibility()


                ;


            }

        }

        self.setSystemTypesSelectVisibility = function (level) {
            var levels
            if (level == -1)
                levels = [1,2,3,4,5,6,7,8]
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
            var currentSystemType = 10
            var currentSystemType = null;
            if (self.currentDisplayDivId)
                currentSystemType = self.displayedDivsMap[self.currentDisplayDivId].systemType
            if (currentSystemType) {
                currentSystemType = self.systemsMap[currentSystemType].level
            }
            for (var key in self.systemsMap) {
                if (self.systemsMap[key].level > currentSystemType + 1)
                    $("#" + key).css("display", "none")
                else
                    $("#" + key).css("display", "block")
            }
        }


        self.deleteSelectedObject = function () {
            if (self.currentDisplayDivId) {
                delete self.displayedDivsMap[self.currentDisplayDivId]
                $("#" + self.currentDisplayDivId).remove();
                self.currentDisplayDivId = null
            }

        }
        self.clearAll = function () {
            visjsGraph.clearGraph()
            self.displayedDivsMap = {}
            $("#TagGenerator_displayDiv").html("");
            self.currentDisplayDivId = null;
            self.setSystemTypesSelectVisibility(-1)
        }


        self.generateTag = function () {

        }


        self.createRelation = function (relationObj, callback) {
            var startLevel = relationObj.start.level;
            var endLevel = relationObj.end.level;
            if (Math.abs(startLevel - endLevel) == 1) {
                var edge = {
                    id: common.getRandomHexaId(10),
                    from: relationObj.start.id,
                    to: relationObj.end.id,
                }
                visjsGraph.data.edges.update([edge])
            } else {
                $("#TagGenerator_infosDiv").html("relation not allowed")
            }


            return callback()
        }


        return self;
    }
)()