var TE_14224_browser = (function () {
    var self = {};
    var source;
    var assetTreeDistinctNodes = {};

    self.currentTable_14224Field;

    self.asset_iso14224Map = {};
    self.iso_14224AssetMap = {};

    self.currentAssetLevel = 0;
    self.iso_14224CodesMap = {};
    self.iso_14224InverseCodesMap = {};
    //self.graphUri = Config.sources[self.referenceOntologySource]
    self.onSourceSelect = function () {
        // Pass
    };
    self.onLoaded = function () {
        $("#actionDiv").html("");
        $("#actionDivContolPanelDiv").load("customPlugins/TotalEnergies/snippets/leftPanel.html");
        MainController.UI.toogleRightPanel(true);
        $("#rightPanelDiv").html("");
        $("#rightPanelDiv").load("customPlugins/TotalEnergies/snippets/rightPanel.html", function () {
            // Pass
        });

        $("#graphDiv").html("");
        // $("#graphDiv").load("snippets/standardizer/standardizer_central.html")
        $("#accordion").accordion("option", { active: 2 });

        $("#sourcesTreeDiv").html("");
        source = "TSF_GS_EP-EXP_207_11";
        source = "TSF_maintenance_ROMAIN_14224";
        self.referenceOntologySource = source;
        Lineage_classes.mainSource = source;
        Lineage_common.currentSource = source;
    };

    self.loadAsset = function (asset) {
        if (asset == "") return;
        self.currenTable = asset;

        if (self.currenTable == "girassol") {
            self.currentTable_14224Field = "RDLRelation";
        } else if (self.currenTable == "absheron") {
            self.currentTable_14224Field = "RDLRelation";
        } else {
            self.currentTable_14224Field = null;
        }

        visjsGraph.clearGraph();
        $("#graphDiv").html("");
        self.loadAssetIso14224Maps(asset);
        self.getFunctionalLocations(asset);
    };

    self.loadAssetIso14224Maps = function (asset) {
        self.asset_iso14224Map = {};
        self.iso_14224AssetMap = {};
        Sparql_OWL.getItems("TSF_ASSET_14224_MAPPINGS", null, function (err, result) {
            if (err) return alert(err);
            var pAsset;
            result.forEach(function (item) {
                pAsset = item.o.value.lastIndexOf("#") + 1;
                if (item.o.value.indexOf(asset) > -1) {
                    var assetId = item.o.value.substring(pAsset);
                    var iso14224Code = item.concept.value; //;.substring(pIso)
                    if (!self.asset_iso14224Map[assetId]) self.asset_iso14224Map[assetId] = [];
                    self.asset_iso14224Map[assetId].push(iso14224Code);

                    if (!self.iso_14224AssetMap[iso14224Code]) self.iso_14224AssetMap[iso14224Code] = [];
                    self.iso_14224AssetMap[iso14224Code].push(assetId);
                }
            });

            self.ontology.loadOntologytree();
            self.ontology.loadIso14224CodesMap();
        });
    };

    self.clearGraph = function () {
        visjsGraph.clearGraph();
        $("#graphDiv").html("");
    };

    self.getFunctionalLocations = function (table) {
        var sqlQuery = " select distinct concat('A_',id) as id,location1,location2 from " + table + " where (location4 is null or location4='')";
        (""); // " where (location3 is null or location3='') and (location2 is not null and location2 !='')";

        self.querySQLserver(sqlQuery, function (err, data) {
            if (err) return MainController.UI.message(err);
            var jstreeData = [];
            assetTreeDistinctNodes = {};
            data.forEach(function (item) {
                if (!assetTreeDistinctNodes[item.location1]) {
                    assetTreeDistinctNodes[item.location1] = 1;
                    jstreeData.push({
                        id: item.location1,
                        text: item.location1,
                        parent: "#",
                        data: {
                            FunctionalLocationCode: item.location1,
                            id: item.location1,
                            label: item.location1,
                            type: "location",
                        },
                    });
                }
                if (!assetTreeDistinctNodes[item.location2]) {
                    assetTreeDistinctNodes[item.location2] = 1;

                    jstreeData.push({
                        //  id: item.location1 + "/" + item.location2,
                        id: item.id,
                        text: item.location2,
                        parent: item.location1,
                        data: {
                            FunctionalLocationCode: item.location1 + "/" + item.location2,
                            // id: item.location1 + "/" + item.location2,
                            id: item.id,
                            label: item.location2,
                            type: "location",
                        },
                    });
                }
            });

            var options = {
                openAll: true,
                selectTreeNodeFn: function (event, obj) {
                    self.currentTreeNode = obj.node;
                    var level = self.currentTreeNode.parents.length + 1;
                    self.openAssetTreeNode(self.currentTreeNode, level);
                },

                contextMenu: TE_14224_browser.getAssetJstreeContextMenu(),
            };
            common.jstree.loadJsTree("TE_114224_browser_assetPanelTreeDiv", jstreeData, options);
        });
    };

    self.openAssetTreeNode = function (node, level, callback) {
        var parentData = node.data;
        var sqlQuery =
            " select id," +
            "FunctionalLocationCode,functionalLocationDescription," +
            self.currentTable_14224Field +
            " as mapping_14224 " +
            " from " +
            TE_14224_browser.currenTable +
            " where  parentFunctionalLocation ='" +
            parentData.FunctionalLocationCode +
            "' order by className";
        //   var sqlQuery = " select distinct tag," + self.currentTable_14224Field + " as mapping_14224 from " + self.currenTable + " where  id='"+node.data.id+"' order by tag";

        self.querySQLserver(sqlQuery, function (err, result) {
            if (err) return MainController.UI.message(err);
            if (callback) return callback(null, result);
            var jstreeData = [];
            result.forEach(function (item) {
                if (item.id == node.id) return;

                var data = item;
                data.level = level;
                //  var childId = nodeId + "/" + common.formatUriToJqueryId(item.functionalLocationDescription)
                if (!assetTreeDistinctNodes[item.id]) {
                    assetTreeDistinctNodes[item.id] = 1;
                    jstreeData.push({
                        id: "A_" + item.id,
                        text: item.functionalLocationDescription,
                        parent: node.id,
                        type: "owl:Class",
                        data: data,
                    });
                }
            });
            common.jstree.addNodesToJstree("TE_114224_browser_assetPanelTreeDiv", node.id, jstreeData);
        });
    };

    self.querySQLserver = function (sqlQuery, callback) {
        const params = new URLSearchParams({
            type: "sql.sqlserver",
            dbName: "data14224",
            sqlQuery: sqlQuery,
        });

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/kg/data?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                callback(null, data);
            },
            error(err) {
                return callback(err);
            },
        });
    };

    self.showAssetNodeInfos = function (node, callee) {
        if (!node) {
            if (callee == "Graph") node = self.currentGraphNode;
            else node = self.currentTreeNode;
        }
        if (!node) return;

        var sqlQuery = " select distinct * from " + self.currenTable + " where  id=" + node.data.id;

        self.querySQLserver(sqlQuery, function (err, data) {
            if (err) return MainController.UI.message(err);
            var nodeId = node.id;
            if (data.length == 0) return;
            var headers = Object.keys(data[0]);

            nodeId = data[0].tag;
            var str = "<div style='max-height:800px;overflow: auto'>" + "<table class='infosTable'>";
            str += "<tr><td class='detailsCellName'>UUID</td><td><a target='_blank' href='" + nodeId + "'>" + nodeId + "</a></td></tr>";
            str += "<tr><td>&nbsp;</td><td>&nbsp;</td></tr>";

            data.forEach(function (item) {
                headers.forEach(function (key) {
                    str += "<tr class='infos_table'>";

                    str += "<td class='detailsCellName'>" + key + "</td>";

                    str += "<td class='detailsCellValue'>" + item[key] + "</td>";
                    str += "</tr>";
                });
                str += "</table>";
            });
            $("#mainDialogDiv").html(str);
            $("#mainDialogDiv").dialog("open");
        });
    };

    self.mapClassesTo14224 = function (node) {
        var childrenMap = {};
        //   childrenMap[node.data.id] = node.data
        var visjsData = { nodes: [], edges: [] };
        var nodeData14224;
        var allGraphIds = {};
        var Iso14224AssetMap = {};
        var iso14224CodeIdMap = {};
        async.series(
            [
                function (callbackSeries) {
                    MainController.UI.message("looking for " + node.label + " children");
                    var sqlQuery =
                        " select distinct id,location1,location2,location3,location4,functionalLocationDescription as className," +
                        "FunctionalLocationCode, parentFunctionalLocation, " +
                        "" +
                        self.currentTable_14224Field +
                        " as mapping_14224  from " +
                        self.currenTable +
                        "" +
                        " where  FunctionalLocationCode like'" +
                        node.data.FunctionalLocationCode +
                        "%' order by className";

                    self.querySQLserver(sqlQuery, function (err, data) {
                        if (err) return callbackSeries(err);
                        data.forEach(function (item) {
                            childrenMap[item.id] = item;

                            if (!Iso14224AssetMap[item.mapping_14224]) Iso14224AssetMap[item.mapping_14224] = [];
                            Iso14224AssetMap[item.mapping_14224].push(item);
                        });
                        callbackSeries();
                    });
                },

                function (callbackSeries) {
                    var words = [];
                    for (var key in childrenMap) {
                        var word = childrenMap[key].mapping_14224;
                        var word2 = word; // word.replace(/[0-9]/g, "")
                        if (word2 && words.indexOf(word2) < 0) words.push(word2);
                    }
                    if (words.length == 0) {
                        MainController.UI.message("No matching ISO_14424 classes", true);
                        return callbackSeries("No matching ISO_14424 classes");
                    }

                    MainController.UI.message("looking for ISO_14424 classes");
                    SearchUtil.getSimilarLabelsInSources(null, [self.referenceOntologySource.toLowerCase()], words, null, "exactMatch", { parentlabels: true }, function (err, result) {
                        if (err) return alert(err);

                        var ids = [];
                        result.forEach(function (item) {
                            for (var source in item.matches) {
                                item.matches[source].forEach(function (match) {
                                    ids.push(match.id);

                                    iso14224CodeIdMap[item.id] = match.id;
                                    var assetObjs = Iso14224AssetMap[item.id];
                                    assetObjs.forEach(function (assetObj) {
                                        var edgeId = assetObj.id + "_" + match.id;

                                        var edge = {
                                            id: edgeId,
                                            from: "A_" + assetObj.id,
                                            to: match.id,
                                        };
                                        edge.color = "blue";

                                        visjsData.edges.push(edge);
                                    });
                                });
                            }
                        });

                        MainController.UI.message("drawing ISO_14424 classes");
                        async.eachSeries(
                            ids,
                            function (id, callbackEach) {
                                if (allGraphIds[id]) return callbackEach();
                                allGraphIds[id] = 1;
                                nodeData14224 = {
                                    id: id,
                                    source: self.referenceOntologySource,
                                };
                                Lineage_classes.drawNodeAndParents(nodeData14224, function (err, result) {
                                    if (err) return callbackSeries(err);

                                    visjsData.nodes = common.concatArraysWithoutDuplicate(visjsData.nodes, result.nodes, "id");
                                    visjsData.edges = common.concatArraysWithoutDuplicate(visjsData.edges, result.edges, "id");

                                    callbackEach();
                                });
                            },
                            function (_err) {
                                callbackSeries();
                            }
                        );
                    });
                },

                function (callbackSeries) {
                    //   return   callbackSeries();
                    var assetObjs = [];

                    for (var key in Iso14224AssetMap) {
                        var objs = Iso14224AssetMap[key];
                        objs.forEach(function (assetObj) {
                            if (!allGraphIds[assetObj.id]) {
                                allGraphIds[assetObj.id] = 1;

                                assetObjs.push(assetObj);
                            }
                        });
                    }

                    MainController.UI.message("drawing asset nodes ");
                    self.graphAssetNodeAndParents(assetObjs, { withoutParents: true }, function (err, result) {
                        if (err) return callbackSeries(err);

                        visjsData.nodes = common.concatArraysWithoutDuplicate(visjsData.nodes, result.nodes, "id");
                        visjsData.edges = common.concatArraysWithoutDuplicate(visjsData.edges, result.edges, "id");

                        callbackSeries();
                    });
                },

                // make edges with fuzz matches assetNodes and iso14224
                function (callbackSeries) {
                    return callbackSeries();
                    for (var keyAsset in Iso14224AssetMap) {
                        for (var keyIso in iso14224CodeIdMap) {
                            if (keyAsset != keyIso && keyAsset.indexOf(keyIso) == 0) {
                                Iso14224AssetMap[keyAsset].forEach(function (itemAsset) {
                                    var from = "A_" + itemAsset.id;
                                    var to = iso14224CodeIdMap[keyIso];
                                    var edgeId = from + "_" + to;
                                    var edge = {
                                        id: edgeId,
                                        from: from,
                                        to: to,
                                    };
                                    edge.color = "green";

                                    visjsData.edges.push(edge);
                                });
                            }
                        }
                    }
                    callbackSeries();
                },
            ],

            function (err) {
                if (err) alert(err);
                visjsData.nodes = common.array.unduplicateArray(visjsData.nodes, "id");
                visjsData.edges = common.array.unduplicateArray(visjsData.edges, "id");

                if (visjsGraph.isGraphNotEmpty()) {
                    visjsGraph.data.nodes.add(visjsData.nodes);
                    visjsGraph.data.edges.add(visjsData.edges);
                } else {
                    self.drawNewGraph(visjsData);
                }
            }
        );
    };

    self.graphAssetNodeAndParents = function (nodes, options, callback) {
        if (!options) options = {};
        var startLevel = 8;

        if (!Array.isArray(nodes)) {
            nodes = [nodes];
        }
        var visjsData = { nodes: [], edges: [] };
        var visjsExistingNodes = visjsGraph.getExistingIdsMap();

        nodes.forEach(function (item) {
            var data = item;
            data.source = "TE_14224_browser";
            data.level = i;
            data.type = "assetNode";
            if (!visjsExistingNodes[item.id]) {
                visjsExistingNodes[item.id] = 1;
                var node = {
                    id: "A_" + item.id,
                    label: item.className,
                    shape: "square",
                    size: Lineage_classes.defaultShapeSize,
                    color: Lineage_classes.getSourceColor(self.currenTable),
                    data: data,
                    level: startLevel + 5 - i,
                };
                visjsData.nodes.push(node);
            }

            if (!options.withoutParents) {
                var previousId = "A_" + item.id;
                for (var i = 5; i > 0; i--) {
                    if (item["location" + i]) {
                        var id = item["location" + i];

                        if (!visjsExistingNodes[id]) {
                            visjsExistingNodes[id] = 1;
                            node = {
                                id: id,
                                label: id,
                                shape: "square",
                                size: Lineage_classes.defaultShapeSize,
                                color: Lineage_classes.getSourceColor(self.currenTable),
                                data: {
                                    source: "TE_14224_browser",
                                    level: i,
                                    type: "assetNode",
                                    id: id,
                                    label: id,
                                },
                                level: startLevel + 5 - i,
                            };
                            visjsData.nodes.push(node);
                        }

                        var edgeId = previousId + "_" + id;
                        if (!visjsExistingNodes[edgeId]) {
                            visjsExistingNodes[edgeId] = 1;
                            visjsData.edges.push({
                                id: edgeId,
                                from: previousId,
                                to: id,
                            });
                        }
                        previousId = id;
                    }
                }
            }
        });

        if (callback) return callback(null, visjsData);

        if (visjsGraph.isGraphNotEmpty()) {
            visjsGraph.data.nodes.add(visjsData.nodes);
            visjsGraph.data.edges.add(visjsData.edges);
        } else {
            self.drawNewGraph(visjsData);
        }
    };

    /**********************************************************************************************************************************/

    self.drawNewGraph = function (visjsData, layout) {
        var options = {
            keepNodePositionOnDrag: true,
            onclickFn: self.graphActions.onNodeClick,
            onRightClickFn: self.graphActions.showGraphPopupMenu,

            edges: {
                smooth: {
                    type: "cubicBezier",
                    forceDirection: "horizontal",

                    roundness: 0.4,
                },
            },
            /*  configure:{
                    enabled	:true,
                    filter	:	true,
              //  container	:'visjsConfigure',
                showButton:true
                }*/
        };
        if (layout == "hierarchical") {
            // onHoverNodeFn:Lineage_classes.graphActions.onHoverNodeFn
            options.layoutHierarchical = {
                direction: "LR",
                sortMethod: "directed",
                levelSeparation: 200,
                nodeSpacing: 20,
                parentCentralization: true,
                edgeMinimization: true,
            };
        } else {
            options.physics = {
                barnesHut: {
                    springLength: 0,
                    damping: 0.15,
                },
                minVelocity: 0.75,
            };
        }

        visjsGraph.draw("graphDiv", visjsData, options);
        $("#waitImg").css("display", "none");
    };

    self.getAssetJstreeContextMenu = function () {
        var items = {};

        items.nodeInfos = {
            label: "Node Infos",
            action: function (_e) {
                // pb avec source
                //  if (self.currentTreeNode.data.type == "tag")
                self.showAssetNodeInfos(self.currentTreeNode, "tree");
            },
        };
        items.graphAssetNodeAndParents = {
            label: "Graph Node",
            action: function (_e) {
                // pb avec source
                TE_14224_browser.graphAssetNodeAndParents(self.currentTreeNode.data);
            },
        };
        items.mapClassesTo14224 = {
            label: "mapClassesTo14224",
            action: function (_e) {
                // pb avec source
                TE_14224_browser.mapClassesTo14224(self.currentTreeNode);
            },
        };

        return items;
    };

    self.getOntologyJstreeContextMenu = function () {
        var items = {};

        items.nodeInfos = {
            label: "Node Infos",
            action: function (_e) {
                SourceBrowser.showNodeInfos(self.referenceOntologySource, self.currentOntologyTreeNode.id, "mainDialogDiv");
            },
        };

        items.ShowAssetData = {
            label: "Show Asset Data",
            action: function (_e) {
                TE_14224_browser.ontology.showAssetData(self.currentOntologyTreeNode);
            },
        };

        return items;
    };

    self.drawAssetNodesParents = function (assetNodesIds, startLevel) {
        if (!startLevel) startLevel = 0;
        if (!assetNodesIds) {
            var nodes = visjsGraph.data.nodes.get();
            self.currentAssetLevel += 1;
            assetNodesIds = [];

            nodes.forEach(function (node) {
                if (node.data.type == "assetNode") if (assetNodesIds.indexOf(node.data.id) < 0) assetNodesIds.push(node.data.id);
            });
        } else {
            // Pass
        }
        var filterStr = "";
        assetNodesIds.forEach(function (item) {
            if (filterStr != "") filterStr += ",";
            filterStr += item;
        });

        /* var sqlQuery = " select distinct id,location1,location2,location3,location4,functionalLocationDescription as className,FunctionalLocationCode," + self.currentTable_14224Field + " as mapping_14224  from " + self.currenTable + "" +
                 " where  FunctionalLocationCode in (" + filterStr + ") ";*/

        var sqlQuery =
            " select distinct parentTable.id,parentTable.location1,parentTable.location2,parentTable.location3,parentTable.location4,parentTable.functionalLocationDescription \n" +
            " as className,parentTable.FunctionalLocationCode,parentTable.RDLRelation as mapping_14224 ,\n" +
            " childTable.id as childId,\n" +
            " childTable.FunctionalLocationCode as childFunctionalLocationCode\n" +
            " \n" +
            " from " +
            self.currenTable +
            " as parentTable , " +
            self.currenTable +
            " as childTable" +
            " where   childTable.id in (" +
            filterStr +
            ") \n" +
            "\n" +
            " and childTable.parentFunctionalLocation=parentTable.functionalLocationCode";

        self.querySQLserver(sqlQuery, function (err, result) {
            if (err) return callbackSeries(err);
            var visjsData = { nodes: [], edges: [] };
            var visjsExistingNodes = visjsGraph.getExistingIdsMap();
            result.forEach(function (item) {
                var level = self.currentAssetLevel; // item.childFun
                var data = item;
                data.type = "assetNode";
                data.level = level;

                //  var level = item.FunctionalLocationCode.split(/[\/\-]/).length
                //  ctionalLocationCode.split(/[\/\-]/).length+1
                var id = "A_" + item.id;

                if (!visjsExistingNodes[id]) {
                    visjsExistingNodes[id] = 1;
                    var node = {
                        id: id,
                        label: item.className,
                        shape: "diamond",
                        size: Lineage_classes.defaultShapeSize,
                        color: Lineage_classes.getSourceColor(self.currenTable),
                        data: data,
                        level: level,
                    };
                    visjsData.nodes.push(node);
                }

                if (visjsExistingNodes["A_" + item.childId]) {
                    var edgeId = "A_" + item.childId + "_" + id;
                    if (!visjsExistingNodes[edgeId]) {
                        visjsExistingNodes[edgeId] = 1;
                        visjsData.edges.push({
                            id: edgeId,
                            from: "A_" + item.childId,
                            to: id,
                            color: "grey",
                            // physics:false
                            // length: 500
                        });
                    }
                }
            });

            if (visjsGraph.isGraphNotEmpty()) {
                visjsGraph.data.nodes.add(visjsData.nodes);
                visjsGraph.data.edges.add(visjsData.edges);
            } else {
                self.drawNewGraph(visjsData, "hierarchical");
            }

            MainController.UI.message("Done");
        });
    };

    self.graphActions = {
        onNodeClick: function (node, point, options) {
            if (!node) return;
            self.currentGraphNode = node;
            return;
            if (node.data.type == "assetNode") {
                self.showAssetNodeInfos(self.currentGraphNode);
            } else {
                Lineage_classes.currentGraphNode = node;
                Lineage_classes.onGraphOrTreeNodeClick(node, options, { callee: "Graph" });
            }
        },
        showGraphPopupMenu: function (node, point, options) {
            if (node.data.type == "assetNode") {
                if (!node) return;

                var html = '    <span  class="popupMenuItem"onclick="TE_14224_browser.showAssetNodeInfos(null,\'Graph\');"> Node infos</span>';
                html += '    <span  class="popupMenuItem"onclick="TE_14224_browser.graphActions.showAssetNodeChildren();"> expand</span>';

                $("#graphPopupDiv").html(html);
                self.currentGraphNode = node;
                MainController.UI.showPopup(point, "graphPopupDiv");
            } else {
                Lineage_classes.graphActions.showGraphPopupMenu(node, point, options);
            }
        },

        showAssetNodeChildren: function () {
            self.openAssetTreeNode(self.currentGraphNode, null, function (err, result) {
                if (err) return;
                var visjsData = { nodes: [], edges: [] };

                var level = self.currentGraphNode.data.level - 1;
                result.forEach(function (item) {
                    var data = item;
                    data.type = "assetNode";
                    data.level = level;
                    var existingNodes = visjsGraph.getExistingIdsMap();
                    if (!existingNodes[item.id]) {
                        existingNodes[item.id] = 1;
                        visjsData.nodes.push({
                            id: "A_" + item.id,
                            label: item.functionalLocationDescription,
                            type: "owl:Class",
                            data: data,
                            size: Lineage_classes.defaultShapeSize,
                            shape: "square",
                            color: Lineage_classes.getSourceColor(self.currenTable),
                            level: level,
                        });

                        var edgeId = item.id + "_" + self.currentGraphNode.id;
                        var edge = {
                            id: edgeId,
                            from: "A_" + item.id,
                            to: self.currentGraphNode.id,
                        };
                        edge.color = "green";

                        visjsData.edges.push(edge);
                    }
                });
                visjsGraph.data.nodes.update(visjsData.nodes);
                visjsGraph.data.edges.update(visjsData.edges);
            });
        },
    };

    self.ontology = {
        countIso14224_to_AssetNodes: function (id) {
            var count = 0;
            if (!id) return 0;
            for (var key in self.iso_14224AssetMap) {
                if (key.indexOf(id) > -1) count += self.iso_14224AssetMap[key].length;
            }
            return count;
        },

        loadOntologytree: function () {
            //   var source = "TSF_GS_EP-EXP_207_11"
            var topClasses = [
                {
                    id: "http://data.total.com/resource/tsf/maintenance/romain_14224/bad731c1e7",
                    label: "Failure",
                    type: "http://standards.iso.org/iso/15926/part14/Event",
                },
                {
                    id: "http://data.total.com/resource/tsf/maintenance/romain_14224/6fcb03c2dd",
                    label: "maintenance",
                    type: "http://standards.iso.org/iso/15926/part14/Activity",
                },
                {
                    id: "http://data.total.com/resource/tsf/maintenance/romain_14224/08e53090d3",
                    label: "O&G systems",
                    type: "http://standards.iso.org/iso/15926/part14/PhysicalObject",
                },
            ];

            var jstreeData = [];
            var existingNodes = {};

            async.eachSeries(
                topClasses,
                function (topClass, callbackEach) {
                    jstreeData.push({
                        id: topClass.id,
                        text: topClass.label,
                        parent: "#",
                        data: {
                            id: topClass.id,
                            label: topClass.label,
                            type: topClass.type,
                        },
                    });

                    Sparql_OWL.getNodeChildren(source, null, topClass.id, 2, null, function (err, result) {
                        if (err) return callbackEach(err);

                        result.forEach(function (item) {
                            if (!existingNodes[item.concept.value]) {
                                existingNodes[item.concept.value] = 1;
                                jstreeData.push({
                                    id: item.concept.value,
                                    text: item.conceptLabel.value,
                                    parent: topClass.id,
                                    data: {
                                        id: item.concept.value,
                                        label: item.conceptLabel.value,
                                        type: topClass.type,
                                    },
                                });
                            }

                            if (!existingNodes[item.child1.value]) {
                                existingNodes[item.child1.value] = 1;
                                jstreeData.push({
                                    id: item.child1.value,
                                    text: item.child1Label.value,
                                    parent: item.concept.value,
                                    data: {
                                        id: item.child1.value,
                                        label: item.child1Label.value,
                                        path: item.child1.value + "/",
                                        source: source,
                                        type: topClass.type,
                                    },
                                });
                            }

                            /*  var count=0
                                  if( item.child2 )
                                      count=self.ontology.countIso14224_to_AssetNodes( item.child2.value)*/

                            if (item.child2 && !existingNodes[item.child2.value]) {
                                existingNodes[item.child2.value] = 1;
                                jstreeData.push({
                                    id: item.child2.value,
                                    text: item.child2Label.value,
                                    parent: item.child1.value,
                                    data: {
                                        id: item.child2.value,
                                        label: item.child2Label.value,
                                        source: source,
                                        path: item.child2.value + "/" + item.child2.value + "/",
                                        type: topClass.type,
                                    },
                                });
                            }
                        });
                        callbackEach();
                    });
                },

                function (err) {
                    if (err) return MainController.UI.message(err);
                    var options = {
                        selectTreeNodeFn: function (event, obj) {
                            self.currentOntologyTreeNode = obj.node;

                            SourceBrowser.openTreeNode("TE_14224_browser_ontologyPanelDiv", obj.node.data.source, obj.node, {
                                ctrlKey: obj.event.ctrlKey,
                                beforeDrawingFn: function (sparqlResult) {
                                    sparqlResult.forEach(function (item) {
                                        if (item.child1) {
                                            var count = self.ontology.countIso14224_to_AssetNodes(item.child1);
                                            item.child1Label.value += " (" + count + ")";
                                        }
                                    });
                                },
                            });
                        },
                        contextMenu: TE_14224_browser.getOntologyJstreeContextMenu(),
                    };

                    jstreeData.forEach(function (node) {
                        var count = 0;
                        if (node.data && node.data.id) {
                            count = self.ontology.countIso14224_to_AssetNodes(node.data.id);
                            node.text += " (" + count + ")";
                            node.data.countAssetNodes = count;
                        }
                    });
                    common.jstree.loadJsTree("TE_14224_browser_ontologyPanelDiv", jstreeData, options);
                }
            );
        },

        loadIso14224CodesMap: function () {
            var query =
                "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
                "PREFIX iso14224: <http://data.total.com/resource/tsf/iso_14224#>\n" +
                "SELECT * from <http://data.total.com/resource/tsf/maintenance/romain_14224/> WHERE {\n" +
                " ?s iso14224:hasCode ?code . ?s rdfs:label  ?label .\n" +
                "} ";

            var url = Config.sources[source].sparql_server.url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
                if (err) return MainController.UI.message(err, true);
                self.iso_14224CodesMap = {};
                self.iso_14224InverseCodesMap = {};
                result.results.bindings.forEach(function (item) {
                    self.iso_14224CodesMap[item.s.value] = {
                        uri: item.s.value,
                        code: item.code.value,
                        label: item.label.value,
                    };
                    self.iso_14224InverseCodesMap[item.code.value] = {
                        uri: item.s.value,
                        code: item.code.value,
                        label: item.label.value,
                    };
                });
            });
        },

        showAssetFailures: function (_failureNode) {
            // Pass
        },

        showAssetAspects: function (params) {
            var assetIdsFilterStr = "";
            var existingNodesArray = [];
            if (visjsGraph.data) existingNodesArray = visjsGraph.data.nodes.get();

            existingNodesArray.forEach(function (item) {
                if (item.data.level == 0) {
                    if (assetIdsFilterStr != "") assetIdsFilterStr += ",";
                    assetIdsFilterStr += item.data.id;
                }
            });
            if (assetIdsFilterStr !== "") assetIdsFilterStr = "  and system.id  in (" + assetIdsFilterStr + ") ";

            /*     var maintenanceCode = self.iso_14224CodesMap[maintenanceNode.data.id].code;
                if (params.codeFilter)
                    return MainController.UI.message("no maintenance code")
                var iso14224CodesStr = " and  ActivityCode ='" + params.codeFilter + "'"


                var workOrdersTable = "Wordorder_girassol"*/
            /*  var sqlQuery = "SELECT TOP (1000)maintenance.*, system.id as assetId ,maintenance.id as maintenanceId" +
                      " FROM [data14224].[dbo].[Wordorder_girassol] as maintenance, [data14224].[dbo].[girassol] as system where " +
                      " system.functionalLocationCode=maintenance.PosteTechnique " + assetIdsFilterStr + iso14224CodesStr*/

            var sqlQuery = params.sql + " " + params.iso14224CodeFilterStr + assetIdsFilterStr;

            self.querySQLserver(sqlQuery, function (err, result) {
                if (err) return callbackSeries(err);
                var visjsData = { nodes: [], edges: [] };
                var visjsExistingNodes = visjsGraph.getExistingIdsMap();

                async.series(
                    [
                        // draw assetNodesIds
                        function (callbackSeries) {
                            var assetIds = [];
                            result.forEach(function (item) {
                                assetIds.push(item.assetId);
                            });
                            self.ontology.showAssetSystemData(null, assetIds, function (err, result) {
                                if (err) return callbackSeries();
                                visjsData.nodes = visjsData.nodes.concat(result.nodes);
                                visjsData.edges = visjsData.edges.concat(result.edges);
                                callbackSeries();
                            });
                        },
                        function (_callbackSeries) {
                            var level = -1;
                            result.forEach(function (item) {
                                var label = item[params.labelColumn]; //item.Designation ;// self.iso_14224InverseCodesMap[item.ActivityCode].label
                                var id = "C_" + item[params.idColumn];

                                var data = item;
                                data.type = params.type;
                                data.level = level;

                                if (!visjsExistingNodes[id]) {
                                    visjsExistingNodes[id] = 1;
                                    var node = {
                                        id: id,
                                        label: label,

                                        size: 10,
                                        shape: "text",
                                        //size: Lineage_classes.defaultShapeSize,
                                        color: "blue",
                                        data: data,
                                        level: level,
                                    };
                                    visjsData.nodes.push(node);
                                }

                                var edgeId = "A_" + item.assetId + "_" + id;
                                if (!visjsExistingNodes[edgeId]) {
                                    visjsExistingNodes[edgeId] = 1;
                                    visjsData.edges.push({
                                        id: edgeId,
                                        to: "A_" + item.assetId,
                                        from: id,
                                        color: "grey",
                                        // physics:false
                                        // length: 500
                                    });
                                }
                            });

                            if (visjsGraph.isGraphNotEmpty()) {
                                visjsGraph.data.nodes.add(visjsData.nodes);
                                visjsGraph.data.edges.add(visjsData.edges);
                            } else {
                                // self.drawNewGraph(visjsData, )
                                self.drawNewGraph(visjsData, "hierarchical");
                            }
                        },
                    ],
                    function (err) {
                        if (err) MainController.UI.message(err, true);

                        MainController.UI.message("Done", true);
                    }
                );
            });
        },
        showAssetData: function () {
            /*          id: "http://data.total.com/resource/tsf/maintenance/romain_14224/bad731c1e7",
                              label: "Failure",
                              type: "http://standards.iso.org/iso/15926/part14/Event"
                      },
              {
                  id: "http://data.total.com/resource/tsf/maintenance/romain_14224/6fcb03c2dd",
                      label: "maintenance",
                  type: "http://standards.iso.org/iso/15926/part14/Activity"
              },
              {
                  id: "http://data.total.com/resource/tsf/maintenance/romain_14224/08e53090d3",
                      label: "O&G systems",
                  type: "http://standards.iso.org/iso/15926/part14/PhysicalObject"
              }]*/
            if (self.currentOntologyTreeNode.parents.indexOf("http://data.total.com/resource/tsf/maintenance/romain_14224/08e53090d3") > -1) {
                TE_14224_browser.ontology.showAssetSystemData(self.currentOntologyTreeNode);
            } else {
                var params;
                var iso14224Code = self.iso_14224CodesMap[self.currentOntologyTreeNode.data.id].code;
                if (self.currentOntologyTreeNode.parents.indexOf("http://data.total.com/resource/tsf/maintenance/romain_14224/b34865b133") > -1) {
                    params = {
                        type: "MaintenanceCode",
                        iso14224CodeFilterStr: iso14224Code ? " and  [MaintenanceCode] ='" + iso14224Code + "'" : "",
                        sql:
                            "SELECT TOP (1000)maintenance.*, system.id as assetId ,maintenance.id as maintenanceId" +
                            " FROM [data14224].[dbo].[Wordorder_girassol] as maintenance, [data14224].[dbo].[girassol] as system where " +
                            " system.functionalLocationCode=maintenance.PosteTechnique ",
                        labelColumn: "Designation",
                        idColumn: "maintenanceId",
                    };
                } else if (self.currentOntologyTreeNode.parents.indexOf("http://data.total.com/resource/tsf/maintenance/romain_14224/1970fa62bc") > -1) {
                    params = {
                        type: "MaintenanceActivity",
                        iso14224CodeFilterStr: iso14224Code ? " and  ActivityCode ='" + iso14224Code + "'" : "",
                        sql:
                            "SELECT TOP (1000)maintenance.*, system.id as assetId ,maintenance.id as maintenanceId" +
                            " FROM [data14224].[dbo].[Wordorder_girassol] as maintenance, [data14224].[dbo].[girassol] as system where " +
                            " system.functionalLocationCode=maintenance.PosteTechnique ",
                        labelColumn: "Designation",
                        idColumn: "maintenanceId",
                    };
                }

                if (params) TE_14224_browser.ontology.showAssetAspects(params);
            }
        },

        showAssetSystemData: function (node, assetIds, callback) {
            if (!self.currenTable) return alert("select an asset ");
            var mappings_14224FilterStr = "";
            var mappings_14224ids = [];
            var visjsData = { nodes: [], edges: [] };
            async.series(
                [
                    function (callbackSeries) {
                        if (assetIds) {
                            assetIds.forEach(function (item) {
                                if (mappings_14224FilterStr != "") mappings_14224FilterStr += ",";
                                mappings_14224FilterStr += item;
                            });
                        } else {
                            for (var key in self.iso_14224AssetMap) {
                                // if (key.indexOf(node.data.id) > -1)
                                if (key.indexOf(node.data.id) > -1) {
                                    mappings_14224ids = mappings_14224ids.concat(self.iso_14224AssetMap[key]);
                                    self.iso_14224AssetMap[key].forEach(function (item) {
                                        if (mappings_14224FilterStr != "") mappings_14224FilterStr += ",";
                                        mappings_14224FilterStr += item;
                                    });
                                }
                            }
                        }

                        if (!mappings_14224FilterStr) return callbackSeries();

                        return callbackSeries("no data");
                    },
                    function (callbackSeries) {
                        var sqlQuery =
                            " select distinct id,location1,location2,location3,location4,functionalLocationDescription\n" +
                            " as className,FunctionalLocationCode,RDLRelation as mapping_14224,parentFunctionalLocation  \n" +
                            " from " +
                            self.currenTable +
                            " " +
                            " where   id in (" +
                            mappings_14224FilterStr +
                            ")";

                        self.querySQLserver(sqlQuery, function (err, result) {
                            if (err) return callbackSeries(err);
                            if (result.length == 0) {
                                return callbackSeries(" no result ");
                            }
                            if (result.length > 500) {
                                return callbackSeries(" too many result : " + result.length + " select a more precise item");
                            }

                            var visjsExistingNodes = visjsGraph.getExistingIdsMap();
                            self.currentAssetLevel = 0;

                            result.forEach(function (item) {
                                var level = self.currentAssetLevel; // item.childFunctionalLocationCode.split(/[\/\-]/).length+1
                                var id = "A_" + item.id;
                                var data = item;
                                data.type = "assetNode";
                                data.level = self.currentAssetLevel;
                                if (!visjsExistingNodes[id]) {
                                    visjsExistingNodes[id] = 1;
                                    var node = {
                                        id: id,
                                        label: item.className,

                                        size: 20,
                                        shape: "square",
                                        size: Lineage_classes.defaultShapeSize,
                                        color: Lineage_classes.getSourceColor(self.currenTable),
                                        data: data,
                                        level: level,
                                    };
                                    visjsData.nodes.push(node);
                                }
                            });
                            if (!callback) {
                                if (visjsGraph.isGraphNotEmpty()) {
                                    visjsGraph.data.nodes.add(visjsData.nodes);
                                    visjsGraph.data.edges.add(visjsData.edges);
                                } else {
                                    self.currentAssetLevel += 1;
                                    self.drawNewGraph(visjsData, "hierarchical");
                                }
                            }
                            return callbackSeries();
                        });
                    },
                ],

                function (err) {
                    if (err) {
                        if (callback) {
                            return callback(err);
                        }
                        return MainController.UI.message(err);
                    }
                    if (callback) return callback(null, visjsData);
                }
            );
        },
    };
    return self;
})();
