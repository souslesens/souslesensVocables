var TE_TagGenerator = (function () {
        var self = {}
        self.currentSource = "TSF-ISO-IEC-81346"

        self.onLoaded = function () {


            $("#actionDivContolPanelDiv").load("customPlugins/TotalEnergies/TE_TagGenerator/snippets/leftPanel.html", function () {
                $("#TE_TagGenerator_searchAllDiv").load("snippets/searchAll.html", function () {
                    $("#GenericTools_searchInAllSources").prop("checked", false)
                    $("#GenericTools_searchInAllSources").prop("checked", false)
                    $(".GenericTools_searchAllOptional").css("display", "none")

                    MainController.currentSource = "TSF-ISO-IEC-81346"
                    $(".TE_TagGenerator_itemSelect").bind("change", function () {
                        TE_TagGenerator.on81346TypeSelect($(this).val())
                    })
                    self.init81346Tree();
                    self.init81346Types()
                    Config.sources[self.currentSource].controller=Sparql_OWL
                })
            })
            //   $("#graphDiv").load("customPlugins/TotalEnergies/TE_TagGenerator/snippets/centralPanel.html")
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
                    var objs=[]
                    result.forEach(function(item){
                        objs.push({
                            id:item.child1.value,
                            label:item.child1Label.value,
                        })
                    })
                    objs.sort(function(a,b){
                        return a.label-b.label;
                    })
                    common.fillSelectOptions(selectId,objs,true,"label","id")

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

        self.on81346TypeSelect = function (typeId) {

            Sparql_OWL.getNodeChildren(self.currentSource,null,typeId,3,{},function(err, result){
                if(err)
                    return MainController.UI.message(err);
                var options = {
                    selectTreeNodeFn: function (evt, obj) {
                        var node = obj.node
                        self.currentTreeNode = node
                        SourceBrowser.openTreeNode("TE_TagGenerator_81346TreeDiv", self.currentSource, node)
                    },
                    contextMenu: TE_TagGenerator.get81346ContextMenu()

                }
                TreeController.drawOrUpdateTree("TE_TagGenerator_81346TreeDiv", result, "#", "child1", options)
            })

        }

        self.addNode = function (node) {

            var existingNodes = visjsGraph.getExistingIdsMap()
            var visjsData = {nodes: [], edges: []}
            visjsData.nodes.push({
                id: node.data.id + "_" + common.getRandomHexaId(5),
                label: node.data.label,
                data: node.data,
                shape: "box",
                //  color:"ced"
            })
            if (visjsGraph.data && visjsGraph.data.nodes) {
                visjsGraph.data.nodes.add(visjsData.nodes)
                visjsGraph.data.edges.add(visjsData.edges)
            } else {
                Lineage_classes.drawNewGraph(visjsData)
            }

        }


        return self;
    }
)()