var TE_AssetDataManager = (function () {
    var self = {};
    var coloredNodesMap;
    self.loadAsset = function (asset) {
        if (asset == "") return;

        if (asset == "girassol") {
            self.currentTable_14224Field = "RDLRelation";
            self.workOrdersTable = "Wordorder_girassol";
            self.failuresTable = "";
            self.currentDbName = "data14224";
            self.currentFLcolumn = "functionalLocationDescription";
            self.currenTable = girassol;
        } else if (asset == "absheron") {
            self.currentTable_14224Field = "RDLRelation";
            self.currentDbName = "data14224";
            self.currenTable = absheron;
        } else if (asset == "Moho_N") {
            self.currentTable_14224Field = "RDScode";
            self.currentDbName = "evolen";
            self.currentOpenNodeQuery = " select *  from Moho_N where  location2 =";
            self.currentFLcolumn = "location3";
            self.currenTable = null;
        } else {
            self.currentTable_14224Field = null;
        }
        var allJstreeData = [
            {
                id: "Equipments",
                text: "Equipments",
                parent: "#",
            },
            {
                id: "Instruments",
                text: "Instruments",
                parent: "#",
            },
            {
                id: "Lines",
                text: "Lines",
                parent: "#",
            },
        ];

        coloredNodesMap = TE_AssetConfigurator.asset.getLinkedAssetNodesMap();
        async.series(
            [
                function (callback) {
                    TE_SqlTojstreeConnectors.getJsTreeData_moho_equipments("Equipments", coloredNodesMap, function (err, jstreeData) {
                        if (err) return callback(err);
                        allJstreeData = allJstreeData.concat(jstreeData);
                        callback();
                    });
                },

                function (callback) {
                    TE_SqlTojstreeConnectors.getJsTreeData_moho_lines("Lines", coloredNodesMap, function (err, jstreeData) {
                        if (err) return callback(err);
                        allJstreeData = allJstreeData.concat(jstreeData);
                        callback();
                    });
                },
                function (callback) {
                    TE_SqlTojstreeConnectors.getJsTreeData_moho_instruments("Instruments", coloredNodesMap, function (err, jstreeData) {
                        if (err) return callback(err);
                        allJstreeData = allJstreeData.concat(jstreeData);
                        callback();
                    });
                },
            ],
            function (err) {
                if (err) return MainController.UI.message(err);
                var options = {
                    openAll: false,
                    selectTreeNodeFn: function (event, obj) {
                        self.currentTreeNode = obj.node;
                        var level = self.currentTreeNode.parents.length + 1;
                        self.openAssetTreeNode(self.currentTreeNode, level);
                    },

                    contextMenu: TE_AssetDataManager.getAssetJstreeContextMenu(),
                };
                common.jstree.loadJsTree("TE_AssetConfigurator_assetPanelTreeDiv", allJstreeData, options);
            }
        );
    };

    self.getAssetJstreeContextMenu = function () {
        var items = {};

        items.nodeInfos = {
            label: "Node infos",
            action: function (_e) {
                // pb avec source

                TE_SqlTojstreeConnectors.showAssetNodeInfos(self.currentDbName, self.currentTreeNode);
            },
        };

        items.associateToRDSnode = {
            label: "Associate to RDS node",
            action: function (_e) {
                // pb avec source
                TE_AssetConfigurator.asset.associateAssetNode(self.currentTreeNode.data);
            },
        };
        items.showOnGraph = {
            label: "ShowOnGraph",
            action: function (_e) {
                // pb avec source
                TE_AssetConfigurator.asset.focus(self.currentTreeNode.data.id);
            },
        };
        items.addToPID = {
            label: "addToPID",
            action: function (_e) {
                // pb avec source
                TE_AssetDataManager.addToPID(self.currentTreeNode);
            },
        };
        return items;
    };
    self.getAssetNodeLabel = function (assetNode) {
        if (assetNode.FullTag) return assetNode.FullTag + " ";
        if (assetNode.location3) return assetNode.location3 + " ";
        if (assetNode.location2) return assetNode.location2 + " ";
        if (assetNode.location1) return assetNode.location1 + " ";
        else return assetNode.FunctionalLocationCode;

        label = node.label = assetNode.location1 + "/" + assetNode.location2 + "/" + assetNode.location3;
    };

    self.openAssetTreeNode = function (node, _level, _callback) {
        TE_SqlTojstreeConnectors.getChildrenNodesJsTreeData(self.currentDbName, node, coloredNodesMap, function (err, jstreeData) {
            if (err) return alert(err);
            if (jstreeData.length > 0) common.jstree.addNodesToJstree("TE_AssetConfigurator_assetPanelTreeDiv", node.id, jstreeData);
        });
    };

    self.loadPIDgraph = function () {
        var options = {};
        options.onclickFn = function (node, point, _options) {
            MainController.UI.hidePopup("graphPopupDiv");
            self.currentGraphNode = node;
            MainController.UI.message(JSON.stringify(point));
        };
        options.onClusterClickFn = function (clusterId, _point, _options) {
            visjsGraph.network.openCluster(clusterId);
        };
        options.onHoverNodeFn = function (_node, _point, _options) {};
        options.onRightClickFn = TE_AssetConfigurator.showGraphPopupMenus;
        options.manipulation = {
            enabled: true,
        };
        /* options.nodes = {
             fixed: {x: true, y: true}
         }*/
        options.interaction = {
            zoomView: false,
            dragNodes: true,
            dragView: false,
        };
        // options.noFit=true
        /*   options.manipulation= {
               enabled: {edges: true}
           }*/

        /*{ addNode: function(nodeData,callback) {
   if(!TE_AssetDataManager.currentTreeNode)
       return select("an asset node first");

   nodeData.label = TE_AssetDataManager.getAssetNodeLabel(TE_AssetDataManager.currentTreeNode);
   nodeData.id ="A_"+TE_AssetDataManager.currentTreeNode.id;
   nodeData.shape="box"
   nodeData.color="#09a4f3";
   nodeData.data={id:TE_AssetDataManager.currentTreeNode.id}
   callback(nodeData);
}}
}
}*/
        var visjsData = { nodes: [], edges: [] };

        var assetDataLabel = $("#TE_AssetDataManager_assetDataSelect").val();
        if (!assetDataLabel) {
            visjsGraph.draw("graphDiv", visjsData, options, function () {
                setTimeout(function () {
                    $("div.vis-network").addClass("canvasBG");
                }, 5);
            });
        } else {
            visjsGraph.loadGraph("PID_" + assetDataLabel + ".json", false, function (err, visjsData) {
                visjsGraph.draw("graphDiv", visjsData, options, function () {
                    setTimeout(function () {
                        $("div.vis-network").addClass("canvasBG");
                        visjsGraph.network.focus("CenterNode");
                        //  visjsGraph.network.setScale(1)
                        /*  var p=visjsGraph.network.getViewPosition()
                          var scale=visjsGraph.network.getScale()
                      visjsGraph.network.moveTo(
                          {
                              offset: {x:-p.x, y:-p.y},
                              scale: 1,

                          })
                        //  visjsGraph.network.fit()
                     //var xx=visjsGraph.network.getViewPosition()
                       /*   var newNodes = []
                          visjsData.nodes.forEach(function (item) {
                              newNodes.push({
                                  id: item.id,
                                  x: item.x,
                                  y: item.y,
                                  fixed:{x:true,y:true}
                              })

                          })
                          visjsGraph.data.nodes.update(newNodes)*/
                    }, 50);
                });
            });
        }
    };

    self.addToPID = function (node) {
        //   var positions = visjsGraph.network.getPositions(["PP"])
        var visjsData = { nodes: [], edges: [] };
        var shape;
        var color;
        var size = 10;
        if (node.parents.indexOf("Equipments") > -1) {
            shape = "box";
            color = "#09a4f3";
        } else if (node.parents.indexOf("Lines") > -1) {
            shape = "hexagon";
            color = "#09f320";
        } else if (node.parents.indexOf("Instruments") > -1) {
            shape = "dot";
            color = "#f38209";
        }

        visjsData.nodes.push({
            label: TE_AssetDataManager.getAssetNodeLabel(TE_AssetDataManager.currentTreeNode.data),
            id: "A_" + TE_AssetDataManager.currentTreeNode.id,
            shape: shape,
            color: color,
            size: size,
            data: { id: TE_AssetDataManager.currentTreeNode.id },
            // fixed: {x: true, y: true},
            x: 100,
            y: 100,
        });

        visjsGraph.data.nodes.update(visjsData.nodes);
    };
    self.savePIDgraph = function (_node) {
        if (!visjsGraph.data.nodes.get("CenterNode"))
            visjsGraph.data.nodes.add({
                id: "CenterNode",
                shape: "dot",
                size: "1px",
            });

        if (visjsGraph.isGraphNotEmpty()) {
            var assetDataLabel = $("#TE_AssetDataManager_assetDataSelect").val();

            if (assetDataLabel) {
                visjsGraph.saveGraph("PID_" + assetDataLabel, true);
            }
        }
    };

    return self;
})();
