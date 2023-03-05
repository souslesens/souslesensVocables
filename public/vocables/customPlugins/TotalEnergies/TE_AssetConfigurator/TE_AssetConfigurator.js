var TE_AssetConfigurator = (function () {
    var self = {};
    self.currentSource = "TSF-RDS-OG-81346";
    self.displayedDivsMap = {};
    self.assetNodeShape = "dot";

    self.systemsMap = {
        "http://data.total.com/resource/tsf/RDS_OG_81346/Location_aspect/Construction_complexe_1": {
            label: "Construction complex",

            color: "#d54df3",
            level: 1,
            aspect: "Location",
            leafLevel: 1,
        },
        "http://data.total.com/resource/tsf/RDS_OG_81346/Location_aspect/Construction_entity_2": {
            label: "Construction entity",

            color: "#d54df3",
            level: 2,
            aspect: "Location",
            leafLevel: 2,
        },
        "http://data.total.com/resource/tsf/RDS_OG_81346/Location_aspect/Space_3": {
            label: "Space",

            color: "#d54df3",
            level: 3,
            aspect: "Location",
            leafLevel: 2,
        },
        "http://data.total.com/resource/tsf/RDS_OG_81346/Construction_Work_aspect/Functional_system_1": {
            label: "Functional system",
            color: "#619108",
            level: 1,
            aspect: "Construction work",
            leafLevel: 1,
        },
        "http://data.total.com/resource/tsf/RDS_OG_81346/Construction_Work_aspect/Technical_system_2": {
            label: "Technical system CW",

            color: "#619108",
            level: 2,
            aspect: "Construction work",
            leafLevel: 2,
        },

        "http://data.total.com/resource/tsf/RDS_OG_81346/Function_aspect/Oil_and_gas_system_1": {
            label: "Oil & gas system",
            color: "#fab70e",
            aspect: "Function",
            level: 1,
            leafLevel: 1,
        },
        "http://data.total.com/resource/tsf/RDS_OG_81346/Function_aspect/Technical_system_2": {
            label: "Technical system F",

            color: "#fab70e",
            level: 2,
            aspect: "Function",
            leafLevel: 2,
        },
        "http://data.total.com/resource/tsf/RDS_OG_81346/Product_aspect/Component_system_3": {
            label: "Component",

            color: "#c7f8ea",
            level: 4,
            aspect: "Component",
            leafLevel: 4,
        },
    };

    self.currentSystem = null;

    self.onLoaded = function () {
        $("#actionDivContolPanelDiv").load("customPlugins/TotalEnergies/TE_AssetConfigurator/snippets/leftPanel.html", function () {
            //  $("#TE_AssetConfigurator_searchAllDiv").load("snippets/searchAll.html", function () {
            $("#GenericTools_searchInAllSources").prop("checked", false);
            $("#GenericTools_searchInAllSources").prop("checked", false);
            $(".GenericTools_searchAllOptional").css("display", "none");

            MainController.currentSource = self.currentSource;
            $(".TE_AssetConfigurator_itemSelect").bind("change", function () {
                TE_AssetConfigurator.on81346TypeSelect($(this).val(), $(this).attr("id"));
                $(this).val("");
            });
            //  self.initSytemsTree();
            self.initAllSystemsDiv();

            Config.sources[self.currentSource].controller = Sparql_OWL;
            visjsGraph.clearGraph();
            $("#graphDiv").css("width", "800px");
            self.listSavedGraphs();
            // })
        });
        //    $("#graphDiv").load("customPlugins/TotalEnergies/TE_AssetConfigurator/snippets/centralPanel.html")

        MainController.UI.toogleRightPanel(true);
        $("#rightPanelDiv").html("");
        $("#rightPanelDiv").load("customPlugins/TotalEnergies/TE_AssetConfigurator/snippets/rightPanel.html", function () {
            $("#TE_AssetConfigurator_Tabs").tabs({
                activat_e: function (_e, _ui) {
                    // Pass
                },
            });
        });

        $("#accordion").accordion("option", { active: 2 });
    };
    self.initAllSystemsDiv = function () {
        var htmlAspects = [];
        for (var key in self.systemsMap) {
            var obj = self.systemsMap[key];
            var divId = common.getRandomHexaId(10);
            var str = "<div class='AssetConfigurator_SystemDiv' id='" + divId + "'" + " onclick='TE_AssetConfigurator.filterSytemTree(\"" + key + '","' + divId + "\")'> " + obj.label + "</div>";

            if (!htmlAspects[obj.aspect]) htmlAspects[obj.aspect] = { html: "", color: obj.color };
            htmlAspects[obj.aspect].html += str;
        }

        var html = "";
        for (const key in htmlAspects) {
            var suffix = "";
            if (key == "Location") suffix = " (point)";
            if (key == "Construction work") suffix = " (site)";

            html += "<b>" + key + suffix + "</b>";
            html += "<div id='" + key + "'  class='AssetConfigurator_AspectDiv'' style='background-color: " + htmlAspects[key].color + " '>" + htmlAspects[key].html + "</div>";
        }
        $("#TE_AssetConfigurator_allSystemsDiv").append(html);

        return;
    };

    self.initSytemsTree = function () {
        var options = {
            targetDiv: "TE_AssetConfigurator_81346TreeDiv",
            selectTreeNodeFn: function (evt, obj) {
                var node = obj.node;
                self.currentTreeNode = node;
                SourceBrowser.openTreeNode("TE_AssetConfigurator_81346TreeDiv", self.currentSource, node);
            },

            contextMenu: TE_AssetConfigurator.getSystemsTreeContextMenu(),
        };
        SourceBrowser.showThesaurusTopConcepts(self.currentSource, options);
    };

    self.getSystemsTreeContextMenu = function () {
        var items = {};

        items.addNode = {
            label: "add Node",
            action: function (_e) {
                // pb avec source
                TE_AssetConfigurator.addNode(self.currentTreeNode);
            },
        };

        items.nodeInfos = {
            label: "Node infos",
            action: function (_e) {
                // pb avec source
                SourceBrowser.showNodeInfos(self.currentTreeNode.data.source, self.currentTreeNode, "mainDialogDiv");
            },
        };

        items.sameAsQualities = {
            label: "Same as Qualities",
            action: function (_e) {
                // pb avec source
                TE_AssetConfigurator.showNodeQualities(self.currentTreeNode, "tree");
            },
        };
        return items;
    };

    self.filterSytemTree = function (systemUri, sytemDivId) {
        if (!systemUri) {
            self.currentSystem = null;
            $(".AssetConfigurator_SystemDiv").removeClass("AssetConfigurator_SystemDiv_selected");
            return;
        }

        $(".AssetConfigurator_SystemDiv").removeClass("AssetConfigurator_SystemDiv_selected");
        $("#" + sytemDivId).addClass("AssetConfigurator_SystemDiv_selected");
        $("#TE_AssetConfigurator_searchInSystemInput").focus();

        self.currentSystem = systemUri;
        self.searchInCurrentSystem(null);

        /*   Sparql_OWL.getNodeChildren(self.currentSource, null, systemUri, 3, {}, function (err, result) {
                   if (err)
                       return MainController.UI.message(err);


                   var options = self.getJstreeOptions()
                   TreeController.drawOrUpdateTree("TE_AssetConfigurator_81346TreeDiv", result, "#", "child1", options)


                   self.setTreeSystemNodesInfos()
               })*/
    };
    self.getJstreeOptions = function () {
        var options = {
            selectTreeNodeFn: function (evt, obj) {
                if (obj.event.ctrlKey) {
                    return self.addNode(obj.node);
                }
                var node = obj.node;
                self.currentTreeNode = node;
                var options = {
                    optionalData: { systemType: node.data.systemType },
                    reopen: true,
                };
                SourceBrowser.openTreeNode("TE_AssetConfigurator_81346TreeDiv", self.currentSource, node, options);
                self.setTreeSystemNodesInfos(obj.node.id);
            },
            contextMenu: TE_AssetConfigurator.getSystemsTreeContextMenu(),
            optionalData: { system: "concept" },
        };
        return options;
    };

    self.getNodeNewSequenceNumber = function (systemId, objId) {
        if (!visjsGraph.data || visjsGraph.data.nodes) return 1;
        var nodes = visjsGraph.data.nodes.get();
        var maxNumber = 1;
        nodes.forEach(function (node) {
            if (node.data && node.data.system == systemId && node.data.id == objId) maxNumber = Math.max(maxNumber, node.data.number || 1);
        });
        return maxNumber + 1;
    };

    self.addNode = function (node) {
        $("#AssetConfigurator_treeInfosDiv").html("");
        /*  if (node.parents.length + 1 < self.currentSystem.leafLevel)
                        return $("#AssetConfigurator_treeInfosDiv").html("not allowed , select a descendant")*/
        if (!self.currentGraphNode && node.data.aspect == "Component") return alert("select a node to link  this node with");

        $("#AssetConfigurator_treeInfosDiv").html("adding " + node.data.label);

        if (!self.currentSystem) {
            return alert("select a system");
            // self.currentSystem=node.parents[1]
        }
        var level = self.systemsMap[self.currentSystem].level;
        if (self.currentGraphNode && self.currentGraphNode.data.aspect == "Component") level = self.currentGraphNode.data.level + 1;

        node.data.level = level;
        node.data.system = self.currentSystem;
        node.data.aspect = self.systemsMap[self.currentSystem].aspect;

        var visjsData = { nodes: [], edges: [] };
        var visjsId = common.getRandomHexaId(10);
        var code = node.data.code;
        if (!code || code == "ex") {
            // example
            var parent = common.jstree.getjsTreeNodeObj("TE_AssetConfigurator_81346TreeDiv", node.parent);
            code = parent.data.code;
        }

        // self.systemsMap[self.currentSystem].items[node.data.id].code
        node.data.definition = self.systemsMap[self.currentSystem].items[node.data.id].definition;
        node.data.example = self.systemsMap[self.currentSystem].items[node.data.id].example;
        node.data.code = code;
        node.data.number = self.getNodeNewSequenceNumber(self.currentSystem, node.data.id);
        node = {
            id: visjsId,
            label: code + node.data.number,
            data: node.data,
            level: level,
            color: self.systemsMap[self.currentSystem].color,
        };
        visjsData.nodes.push(node);
        self.addToGraph(visjsData);
        if (self.currentGraphNode)
            self.createRelation(node, self.currentGraphNode, function (err, result) {
                if (err) MainController.UI.message(err);
                else visjsData.edges = visjsData.edges.concat(result.edges);
            });
        //  self.currentGraphNode = node
    };
    self.addToGraph = function (visjsData, _options) {
        $("div.vis-network").removeClass("canvasBG");
        if (visjsGraph.isGraphNotEmpty()) {
            //  if (Object.keys(visjsGraph.getExistingIdsMap()).length>0) {
            visjsGraph.data.nodes.add(visjsData.nodes);
            if (visjsData.edges.length > 0) visjsGraph.data.edges.add(visjsData.edges);
            $("#graphDiv").focus();
        } else {
            _options = {
                layout: {
                    hierarchical: {
                        enabled: true,
                        levelSeparation: 70,
                        nodeSpacing: 100,
                        sortMethod: "directed",
                    },
                },
                physics: {
                    enabled: false,
                    hierarchicalRepulsion: {
                        centralGravity: 0,
                        nodeDistance: 0,
                        avoidOverlap: 0,
                    },
                    minVelocity: 0.75,
                    solver: "hierarchicalRepulsion",
                },
                edges: {
                    smooth: {
                        type: "cubicBezier",
                        forceDirection: "verical",

                        roundness: 0.4,
                    },
                    font: { align: "middle", size: 10 },
                },
                nodes: {
                    chosen: {
                        node: function (values, id, selected, _hovering) {
                            if (selected) values.color = "red";
                        },
                    },
                    size: 5,
                    shape: "square",
                    font: {
                        size: 12,
                    },
                },
            };
            if (_options && _options.manipulation)
                _options.manipulation = {
                    enabled: {
                        addNode: function (nodeData, callback) {
                            if (!TE_AssetDataManager.currentTreeNode) return select("an asset node first");

                            nodeData.label = TE_AssetDataManager.getAssetNodeLabel(TE_AssetDataManager.currentTreeNode);
                            nodeData.id = "A_" + TE_AssetDataManager.currentTreeNode.id;
                            nodeData.shape = "box";
                            nodeData.color = "#09a4f3";
                            nodeData.data = { id: TE_AssetDataManager.currentTreeNode.id };
                            callback(nodeData);
                        },
                    },
                };

            _options.dndCtrlFn = function (startNode, endNode, _point) {
                if (confirm("Create relation between " + startNode.data.label + " and " + endNode.data.label))
                    self.createRelation(startNode, endNode, function (_err, _visjsData) {
                        // Pass
                    });
            };
            _options.onclickFn = function (node, _point, _options) {
                MainController.UI.hidePopup("graphPopupDiv");
                self.currentGraphNode = node;
            };
            _options.onClusterClickFn = function (clusterId, _point, _options) {
                visjsGraph.network.openCluster(clusterId);
            };
            _options.onHoverNodeFn = function (node, _point, _options) {
                self.showGraphNodeInfos(node);
            };
            _options.onRightClickFn = TE_AssetConfigurator.showGraphPopupMenus;

            visjsGraph.draw("graphDiv", visjsData, _options, function () {
                // Pass
            });
        }
        if (self.currentSystem) self.setSystemTypesSelectVisibility(self.currentSystem.level);

        setTimeout(function () {
            visjsGraph.network.redraw();
        }, 20);
    };

    self.showGraphNodeInfos = function (node) {
        self.getNodeClassificationTree(node.data, function (err, parentsMap) {
            if (err) return MainController.UI.message(err);
            var parentsStr = "<ul>";
            var i = 0;
            var sep = "";
            for (var key in parentsMap) {
                parentsStr += "<li style='font-size: 10px;text-indent:" + 10 * i + "px'>" + sep + parentsMap[key] + "</li>";
                i++;
                // sep+="    "
            }
            parentsStr += "<li style='text-indent:" + 10 * i + "px;'>" + sep + node.data.label + "</li>";
            parentsStr += "</ul>";

            var nodeTags = self.getNodeTag(node);
            var html = "<table>";
            html += "<tr><td>Aspect: <b>" + self.systemsMap[node.data.system].aspect + "</td></tr>";
            html += "<tr><td>System:  <b>" + self.systemsMap[node.data.system].label + "</td></tr>";
            html += "<tr><td>Classification:  <b>" + parentsStr + "</td></tr>";
            html += "<tr><td>Label:  <b>" + node.data.label + "</td></tr>";
            html += "<tr><td>Location TAG  <b>:" + nodeTags.locationTag + "</B></td></tr>";
            html += "<tr><td>Function TAG  <b>:" + nodeTags.functionTag + "</B></td></tr>";
            html += "<tr><td>Constr. Work TAG  <b>:" + nodeTags.CWtag + "</B></td></tr>";
            var assetNode = node.data["assetNode"];
            if (assetNode) {
                var assetNodeLabel = TE_AssetDataManager.getAssetNodeLabel(assetNode);
                html += "<tr><td>Current Asset node  <b>:" + assetNodeLabel + "</B></td></tr>";
            }
            html += "</table>";

            $("#AssetConfigurator_graphHOverDiv").html(html);
        });
    };

    self.showGraphPopupMenus = function (node, point, _event) {
        if (!node) return MainController.UI.hidePopup("graphPopupDiv");
        if (node.from) {
            //edge
            var html = '    <span  class="popupMenuItem"onclick="TE_AssetConfigurator.deleteSelectedEdge()();"> Delete</span>';
        } else {
            html =
                '    <span  class="popupMenuItem"onclick="TE_AssetConfigurator.deleteSelectedObject()();"> Delete</span>' +
                '   <span  id=\'lineage_graphPopupMenuItem\' class="popupMenuItem" onclick="TE_AssetConfigurator.graphActions.showInfos();">Node infos</span>' +
                '   <span  id=\'lineage_graphPopupMenuItem\' class="popupMenuItem" onclick="TE_AssetConfigurator.graphActions.rename();">Rename</span>' +
                "   <span  id='lineage_graphPopupMenuItem' class=\"popupMenuItem\" onclick=\" TE_AssetConfigurator.showNodeQualities(null,'graph');\">SameAsQualities</span>";
        }
        $("#graphPopupDiv").html(html);
        self.currentGraphNode = node;
        MainController.UI.showPopup(point, "graphPopupDiv");
    };
    self.setSystemTypesSelectVisibility = function (level) {
        return;
        var levels;
        if (level == -1) levels = [1, 2, 3, 4, 5, 6, 7, 8];
        else levels = [level - 1, level, level + 1];
        for (var key in self.systemsMap) {
            if (levels.indexOf(self.systemsMap[key].level) < 0) $("#" + key).css("display", "none");
            else $("#" + key).css("display", "block");
        }
    };

    self.setSystemTypesSelectVisibilityOld = function () {
        var currentSystem = null;
        if (self.currentDisplayDivId) currentSystem = self.displayedDivsMap[self.currentDisplayDivId].systemType;
        if (currentSystem) {
            currentSystem = self.systemsMap[currentSystem].level;
        }
        for (var key in self.systemsMap) {
            if (self.systemsMap[key].level > currentSystem + 1) $("#" + key).css("display", "none");
            else $("#" + key).css("display", "block");
        }
    };

    self.deleteSelectedObject = function () {
        visjsGraph.data.nodes.remove(self.currentGraphNode.id);
        /*  if (self.currentDisplayDivId) {
                  delete self.displayedDivsMap[self.currentDisplayDivId]
                  $("#" + self.currentDisplayDivId).remove();
                  self.currentDisplayDivId = null
              }*/
    };
    self.deleteSelectedEdge = function () {
        visjsGraph.data.edges.remove(self.currentGraphNode.id);
        /*  if (self.currentDisplayDivId) {
                  delete self.displayedDivsMap[self.currentDisplayDivId]
                  $("#" + self.currentDisplayDivId).remove();
                  self.currentDisplayDivId = null
              }*/
    };

    self.clearAll = function () {
        visjsGraph.clearGraph();
        self.displayedDivsMap = {};
        $("#AssetConfigurator_displayDiv").html("");
        self.currentDisplayDivId = null;
        self.setSystemTypesSelectVisibility(-1);
        self.currentGraphNode = null;
    };

    self.getNodeTag = function (targetNode) {
        if (!targetNode) return;
        var edges = visjsGraph.data.edges.get();
        if (edges.length < 1)
            return {
                locationTag: "-" + targetNode.data.code + targetNode.data.number,
                functionTag: "-" + targetNode.data.code + targetNode.data.number,
                CWtag: "-" + targetNode.data.code + targetNode.data.number,
            };

        var recursePaths = function (nodeId) {
            edges.forEach(function (edge) {
                if (edge.from == nodeId) {
                    nodeAncestors.push(edge.to);
                    recursePaths(edge.to);
                }
            });
        };
        var startNode = targetNode.id;

        var nodeAncestors = [startNode];
        recursePaths(startNode);

        nodeAncestors.reverse();

        var locationTag = "";
        var functionTag = "";
        var CWtag = "";
        nodeAncestors.forEach(function (nodeId) {
            var node = visjsGraph.data.nodes.get(nodeId);
            if (!node || !node.data) return;

            if (node.data.level > targetNode.data.level) return;
            if (node.data.aspect == "Component") {
                locationTag += "-" + node.data.code + node.data.number;
                functionTag += "-" + node.data.code + node.data.number;
                CWtag += "-" + node.data.code + node.data.number;
            } else {
                if (node.data.aspect != targetNode.data.aspect && targetNode.data.aspect != "Component") return;

                if (node.data.aspect == "Location") {
                    // if(locationTag!="")
                    locationTag += "+";
                    locationTag += node.data.code + node.data.number;
                }
                if (node.data.aspect == "Construction work") {
                    // if(locationTag!="")
                    CWtag += "++";
                    CWtag += node.data.code + node.data.number;
                }
                if (node.data.aspect == "Function") {
                    // if(functionTag!="")
                    functionTag += "=";
                    functionTag += node.data.code + node.data.number;
                }
            }
        });

        return { functionTag: functionTag, locationTag: locationTag, CWtag: CWtag };
    };

    self.createRelation = function (startNode, endNode, callback) {
        if (startNode.id == endNode.id) return;
        var getEdge = function (relationType, _drawLabel) {
            var edgeId = common.getRandomHexaId(10);
            var edge;

            var existingEdges = visjsGraph.data.edges.get();
            var from, to;
            existingEdges.forEach(function (edge) {
                if (edge.from == startNode.id) {
                    to = startNode.id;
                    from = endNode.id;
                } else if (edge.from == endNode.id) {
                    to = endNode.id;
                    from = startNode.id;
                }
            });
            edge = {
                id: edgeId,
                from: from,
                to: to,
                data: {
                    from: from,
                    to: to,
                    property: relationType,
                },
            };

            edge.smooth = {
                type: "cubicBezier",
                forceDirection: "verical",

                roundness: 0.4,
            };

            if (relationType) {
                edge.label = relationType;
                edge.dashes = true;
                edge.data.type = relationType;
            }

            return edge;
        };

        var visjsData = { edges: [] };
        var globalOK = false;

        var codesMap = {
            Component: "C",
            Function: "F",
            "Construction work": "W",
            Location: "L",
        };

        var key = codesMap[startNode.data.aspect] + codesMap[endNode.data.aspect];

        var allowedRelationsMap = {
            CC: "part14:partOf",
            LL: "part14:hasLocation",
            FF: "part14:Function",
            LC: "part14:hasLocation",
            CL: "part14:hasLocation",
            CF: "part14:implements",
            FC: "part14:implements",
            CW: "part14:hasLocation",
            WC: "part14:hasLocation",
        };

        if (allowedRelationsMap[key]) {
            visjsData.edges.push(getEdge(allowedRelationsMap[key], true));
            globalOK = true;
        }

        var err = null;
        if (!globalOK) return MainController.UI.message("relation not allowed ", true);
        else {
            visjsGraph.data.edges.add(visjsData.edges);
            self.relationObj = null;
            var edge = visjsData.edges[0];
            var fromNode = visjsGraph.data.nodes.get(edge.from);
            var toNode = visjsGraph.data.nodes.get(edge.to);
            if (fromNode.data.aspect == "Component" && toNode.data.aspect == "Component") {
                var fromNodeData = fromNode.data;
                fromNodeData.level = toNode.level + 1;
                var newNodes = [
                    {
                        id: fromNode.id,
                        level: toNode.level + 1,
                        data: fromNodeData,
                    },
                ];
                visjsGraph.data.nodes.update(newNodes);
            }
        }
        return callback(err, visjsData);
    };

    self.setTreeSystemNodesInfos = function (topNode) {
        setTimeout(function () {
            if (!topNode) topNode = "#";
            var treeNodes = common.jstree.getjsTreeNodes("TE_AssetConfigurator_81346TreeDiv", false, "#");
            var ids = [];
            treeNodes.forEach(function (item) {
                ids.push(item.data.id);
            });
            var options = {
                filter: Sparql_common.setFilter("concept", ids),
            };
            Sparql_OWL.getItems(self.currentSource, options, function (err, result2) {
                if (err) return MainController.UI.message(err);
                if (!self.systemsMap[self.currentSystem].items) self.systemsMap[self.currentSystem].items = {};
                result2.forEach(function (item) {
                    var obj = { id: item.concept.value };
                    obj.code = item.concept.value.substring(item.concept.value.lastIndexOf("/") + 1);
                    if (item.p.value == "http://souslesens.org/resource/vocabulary/hasCode") obj.code = item.o.value;
                    if (item.p.value == "http://www.w3.org/2004/02/skos/core#definition") obj.definition = item.o.value;

                    if (item.p.value == "http://www.w3.org/2004/02/skos/core#example") obj.example = item.o.value;
                    self.systemsMap[self.currentSystem].items[obj.id] = obj;
                });
            });
        }, 500);
    };

    self.saveGraph = function (isNewGraph) {
        self.switchLabelsAndCodesInGraph("codes");
        if (isNewGraph) {
            var graphName = prompt("graph name");
            if (graphName) {
                visjsGraph.saveGraph("RDS_" + graphName, true);
                self.listSavedGraphs();
            }
        } else {
            visjsGraph.saveGraph(self.currentGraphName, true);
            self.listSavedGraphs();
        }
    };
    self.loadGraph = function (graphName) {
        visjsGraph.clearGraph();

        self.currentGraphName = graphName;
        //  var displayMode = $("#TE_AssetConfigurator_displayLabelsMode").val()
        var displayMode = "codes";
        visjsGraph.loadGraph(graphName, false, function (err, visjsData) {
            visjsData.nodes.sort(function (a, b) {
                if (a.label > b.label) return 1;
                if (a.label < b.label) return -1;
                return 0;
            });
            self.addToGraph(visjsData);
            setTimeout(function () {
                self.switchLabelsAndCodesInGraph(displayMode, visjsData.nodes);
            }, 100);
        });
    };

    self.listSavedGraphs = function () {
        visjsGraph.listSavedGraphs(function (err, result) {
            if (err) return MainController.UI.message(err);
            var graphs = [];
            result.forEach(function (item) {
                if (item.indexOf("RDS_") == 0) graphs.push(item);
            });
            common.fillSelectOptions("TE_AssetConfigurator_savedGraphsSelect", graphs, true);
        });
    };

    self.getNodeClassificationTree = function (nodeData, callback) {
        var matchingHits;
        var parentIdsMap = {};
        async.series(
            [
                function (callbackSeries) {
                    var queryObj = {
                        query: {
                            bool: {
                                must: [
                                    {
                                        term: {
                                            "id.keyword": nodeData.id,
                                        },
                                    },

                                    {
                                        term: {
                                            "parents.keyword": nodeData.system,
                                        },
                                    },
                                ],
                            },
                        },
                    };
                    ElasticSearchProxy.queryElastic(queryObj, [self.currentSource.toLowerCase()], function (err, result) {
                        if (err) MainController.UI.message(err);
                        matchingHits = result.hits.hits;
                        if (matchingHits.length == 0) return callbackSeries("no result");
                        return callbackSeries();
                    });
                },
                //get parents
                function (callbackSeries) {
                    var parentIds = [];
                    matchingHits.forEach(function (hit) {
                        hit._source.parents.forEach(function (item, _indexParent) {
                            if (parentIds.indexOf(item) < 0) parentIds.push(item);
                        });
                    });
                    SearchUtil.getSourceLabels(self.currentSource.toLowerCase(), parentIds, null, null, function (err, hits) {
                        if (err) return callbackSeries(err);
                        hits.forEach(function (hit) {
                            var code = "";
                            if (hit._source.skoslabels.length > 0) code = hit._source.skoslabels[0];
                            var label = hit._source.label;
                            if (label.indexOf("http") > -1) label = Sparql_common.getLabelFromURI(label);
                            parentIdsMap[hit._source.id] = code + " " + label;
                        });
                        callbackSeries();
                    });
                },
            ],
            function (err) {
                return callback(err, parentIdsMap);
            }
        );
    };

    self.searchInCurrentSystem = function (word) {
        var matchingHits;
        var parentIdsMap = {};
        var size = 200;
        async.series(
            [
                function (callbackSeries) {
                    var queryObj = {
                        query: {
                            bool: {
                                must: [],
                            },
                        },
                        from: 0,
                        size: size,
                        _source: {
                            excludes: ["attachment.content"],
                        },
                    };
                    if (word) {
                        queryObj.query.bool.must.push({
                            wildcard: {
                                label: {
                                    value: word,
                                    boost: 1.0,
                                    rewrite: "constant_score",
                                },
                            },
                        });
                    }
                    if (self.currentSystem) {
                        queryObj.query.bool.must.push({
                            term: {
                                "parents.keyword": self.currentSystem,
                            },
                        });
                    }
                    ElasticSearchProxy.queryElastic(queryObj, [self.currentSource.toLowerCase()], function (err, result) {
                        if (err) MainController.UI.message(err);
                        matchingHits = result.hits.hits;
                        if (matchingHits.length == 0) return callbackSeries("no result");
                        return callbackSeries();
                    });
                },

                //get parents
                function (callbackSeries) {
                    var parentIds = [];
                    matchingHits.forEach(function (hit) {
                        hit._source.parents.forEach(function (item, _indexParent) {
                            if (parentIds.indexOf(item) < 0) parentIds.push(item);
                        });
                        if (parentIds.indexOf(hit._source.id) < 0) parentIds.push(hit._source.id);
                    });

                    SearchUtil.getSourceLabels(self.currentSource.toLowerCase(), parentIds, null, null, function (err, hits) {
                        if (err) return callbackSeries(err);
                        hits.forEach(function (hit) {
                            var parents = hit._source.parents;
                            var code = hit._source.skoslabels[0];

                            parentIdsMap[hit._source.id] = {
                                label: hit._source.label,
                                code: code,
                                parent: parents[parents.length - 1],
                            };
                        });
                        callbackSeries();
                    });
                },

                function (callbackSeries) {
                    var ids = Object.keys(parentIdsMap);
                    self.setTreeItemSameAs(ids, function (err, result) {
                        if (err) return callbackSeries(err);
                        self.currentSameAsIds = {};
                        result.forEach(function (item) {
                            if (!self.currentSameAsIds[item.concept.value]) self.currentSameAsIds[item.concept.value] = [];
                            self.currentSameAsIds[item.concept.value].push(item.value.value);
                        });
                        callbackSeries();
                    });
                },

                //set tree
                function (_callbackSeries) {
                    var jstreeData = [];
                    var existingNodes = {};

                    var getNodeLabel = function (item) {
                        var label;
                        var prefix = "";
                        if (self.systemsMap[item]) label = "System " + self.systemsMap[item].label;
                        else if (parentIdsMap[item]) {
                            if (self.currentSameAsIds[item]) {
                                prefix += "*";
                            }
                            if (parentIdsMap[item].code) {
                                prefix += parentIdsMap[item].code;
                            }
                            label = prefix + " " + parentIdsMap[item].label;
                        } else {
                            label = Sparql_common.getLabelFromURI(item);
                        }
                        return label;
                    };
                    var getCode = function (item) {
                        if (!parentIdsMap[item]) return null;
                        if (parentIdsMap[item].code) return parentIdsMap[item].code;
                        return "ex";
                    };
                    var getParent = function (item) {
                        if (!parentIdsMap[item]) return "#";
                        if (parentIdsMap[item].parent) return parentIdsMap[item].parent;
                        return "#";
                    };

                    matchingHits.forEach(function (hit) {
                        var parent;
                        hit._source.parents.forEach(function (item, indexParent) {
                            if (indexParent == 0) {
                                return;
                            }

                            if (indexParent == 1) parent = "#";
                            else {
                                parent = getParent(item);
                            }

                            if (!existingNodes[item]) {
                                existingNodes[item] = 1;
                                var code = getCode(item);
                                var label = getNodeLabel(item);

                                jstreeData.push({
                                    id: item,
                                    text: label,
                                    parent: parent,
                                    data: {
                                        id: item,
                                        label: parentIdsMap[item] ? parentIdsMap[item].label : Sparql_common.getLabelFromURI(item),
                                        sameAsIds: self.currentSameAsIds[item],
                                        source: self.currentSource,
                                        code: code,
                                    },
                                });
                            }
                        });

                        var parent2 = getParent(hit._source.id);
                        var code2 = getCode(hit._source.id);
                        var label2 = getNodeLabel(hit._source.id);

                        jstreeData.push({
                            id: hit._source.id,
                            text: label2, // Sparql_common.getLabelFromURI(hit._source.id) + " " + hit._source.label,
                            parent: parent2,
                            data: {
                                id: hit._source.id,
                                label: label2,
                                sameAsIds: self.currentSameAsIds[hit._source.id],
                                source: self.currentSource,
                                code: code2,
                            },
                        });
                    });
                    var options = self.getJstreeOptions();
                    if (word) options.openAll = true;
                    common.jstree.loadJsTree("TE_AssetConfigurator_81346TreeDiv", jstreeData, options);
                },
            ],

            function (err) {
                if (err) return MainController.UI.message(err);
            }
        );
    };

    self.switchLabelsAndCodesInGraph = function (value, nodes) {
        if (!nodes) nodes = visjsGraph.data.nodes.get();
        // var newNodes = []
        var visjsData = { nodes: [], edges: [] };
        var existingNodes = visjsGraph.getExistingIdsMap();
        var assetVisjsData = { nodes: [], edges: [] };
        nodes.forEach(function (node) {
            if (!node.data) return;
            var label;
            if (value == "codes" || value == "individuals") label = node.data.code + node.data.number;
            else if (value == "labels") label = node.data.label;

            visjsData.nodes.push({ id: node.id, label: label });

            if (value == "individuals" && node.data.assetNode) {
                var assetNodeVisJsData = self.geAssetNodeVisjsData(node, existingNodes);
                visjsData.nodes = visjsData.nodes.concat(assetNodeVisJsData.nodes);
                visjsData.edges = visjsData.edges.concat(assetNodeVisJsData.edges);
            } else {
                var allNodes = visjsGraph.data.nodes.get();
                allNodes.forEach(function (node) {
                    if (node.shape == self.assetNodeShape) {
                        if (assetVisjsData.nodes.indexOf(node.id) < 0) assetVisjsData.nodes.push(node.id);
                    }
                });
                var allEdges = visjsGraph.data.edges.get();
                allEdges.forEach(function (edge) {
                    if (assetVisjsData.nodes.indexOf(edge.from) > -1 || assetVisjsData.nodes.indexOf(edge.to) > -1) assetVisjsData.edges.push(edge.id);
                });
            }
        });

        existingNodes = visjsGraph.getExistingIdsMap();
        visjsGraph.data.nodes.update(visjsData.nodes);
        visjsGraph.data.edges.update(visjsData.edges);

        if (assetVisjsData.nodes.length > 0)
            setTimeout(function () {
                visjsGraph.data.nodes.remove(assetVisjsData.nodes);
                visjsGraph.data.edges.remove(assetVisjsData.edges);
            }, 200);
    };
    self.geAssetNodeVisjsData = function (RDSnode, existingNodes, draw) {
        var visjsData = { nodes: [], edges: [] };
        var assetNode = RDSnode.data.assetNode;
        if (!existingNodes) existingNodes = visjsGraph.getExistingIdsMap();
        if (!existingNodes[assetNodeId]) {
            var label = TE_AssetDataManager.getAssetNodeLabel(assetNode);

            var assetNodeId = "I_" + assetNode.id;
            existingNodes[assetNodeId] = 1;
            var data = RDSnode.data;

            visjsData.nodes.push({
                id: assetNodeId,
                label: label,
                level: RDSnode.level + 0.5,
                shape: self.assetNodeShape,
                color: "#09a4f3",
                size: 5,

                data: data,
                font: { size: 10, color: "#09a4f3", background: "#ddd" },
            });
            var edgeId = assetNodeId + "_" + RDSnode.id;
            if (!existingNodes[edgeId]) {
                existingNodes[edgeId] = 1;
                visjsData.edges.push({
                    id: edgeId,
                    to: RDSnode.id,
                    from: assetNodeId,
                });
            }
            if (draw) self.addToGraph(visjsData);
        }
        return visjsData;
    };

    self.clusterComponents = function () {
        var clusterOptionsByData;
        var nodes = visjsGraph.data.nodes.get();
        var clustersMap = {};
        nodes.forEach(function (node) {
            if (node.data.aspect == "Component") {
                var key = node.data.id + "_" + node.data.level;
                if (!clustersMap[key]) {
                    clustersMap[key] = [];
                    clustersMap[key].label = node.data.code;
                    clustersMap[key].level = node.data.level;
                }
                clustersMap[key].push(node.id);
            }
        });
        for (var key in clustersMap) {
            clusterOptionsByData = {
                joinCondition: function (childOptions) {
                    return clustersMap[key].indexOf(childOptions.id) > -1;
                },
                processProperties: function (clusterOptions, childNodes, _childEdges) {
                    clusterOptions.mass = childNodes.length;
                    return clusterOptions;
                },
                clusterNodeProperties: {
                    id: key,
                    borderWidth: 3,
                    shape: "box",
                    color: "#09a4f3",
                    label: clustersMap[key].label,
                    level: clustersMap[key].level,
                },
            };
            visjsGraph.network.cluster(clusterOptionsByData);
        }
    };

    self.showNodeQualities = function (node, origin) {
        $("#TE_AssetConfigurator_ProprertiesDiv").html("");
        if (!node) {
            if (origin == "graph") node = self.currentGraphNode;
            else if (origin == "tree") node = self.currentTreeNode;
        }
        if (node.data.sameAsIds) {
            Sparql_OWL.getObjectRestrictions("CFIHOS_1_5_PLUS", node.data.sameAsIds, {}, function (err, result) {
                if (err) return MainController.UI.message(err.responseText);

                var html = "Properties CFIHOS <br><table>";

                result.forEach(function (item) {
                    html += "<tr><td>" + item.propLabel.value + "</td><td>" + item.valueLabel.value + "</td></tr>";
                });
                html += "</table>";
                $("#TE_AssetConfigurator_ProprertiesDiv").html(html);
            });
        }
    };

    self.setTreeItemSameAs = function (ids, callback) {
        Sparql_OWL.getObjectRestrictions(Config.dictionarySource, ids, { filter: "FILTER (?prop=owl:sameAs) " }, function (err, result) {
            if (err) return callback(err.responseText);
            return callback(null, result);
        });
    };

    self.graphActions = {
        rename: function () {
            if (!self.currentGraphNode) return alert("select a node in the graph");
        },
        showInfos: function () {
            if (!self.currentGraphNode) return alert("select a node in the graph");
            // JSON.stringify(rdsNodeData, null,2).replace("\\n","<br>")

            const headers = Object.keys(self.currentGraphNode.data);

            var nodeId = self.currentGraphNode.data.label;
            var str = "<div style=overflow: auto'>" + "RDS Infos <table class='infosTable'>";
            str += "<tr><td class='detailsCellName'>UUID</td><td><a target='_blank' href='" + nodeId + "'>" + nodeId + "</a></td></tr>";
            str += "<tr><td>&nbsp;</td><td>&nbsp;</td></tr>";

            headers.forEach(function (key) {
                if (key == "assetNode") return;

                str += "<tr class='infos_table'>";

                str += "<td class='detailsCellName'>" + key + "</td>";

                str += "<td class='detailsCellValue'>" + self.currentGraphNode.data[key] + "</td>";
                str += "</tr>";
            });
            str += "</table>";
            str += "<br>";
            str += "Asset Infos <table class='infosTable'>";

            if (self.currentGraphNode.data["assetNode"]) {
                const headers = Object.keys(self.currentGraphNode.data["assetNode"]);

                headers.forEach(function (key) {
                    str += "<tr class='infos_table'>";

                    str += "<td class='detailsCellName'>" + key + "</td>";

                    str += "<td class='detailsCellValue'>" + self.currentGraphNode.data["assetNode"][key] + "</td>";
                    str += "</tr>";
                });
            }
            str += "</table>";

            $("#mainDialogDiv").html(str);
            $("#mainDialogDiv").dialog("open");
        },
    };

    self.asset = {
        associateAssetNode: function (assetNodeData) {
            if (!self.currentGraphNode) return alert("select a node in the graph");
            var rdsNodeData = self.currentGraphNode.data;
            if (!confirm("Associate asset node" + assetNodeData.Description + " to RDS node " + rdsNodeData.code + " " + rdsNodeData.label)) return;

            rdsNodeData.assetNode = assetNodeData;
            visjsGraph.data.nodes.update({
                id: self.currentGraphNode.id,
                data: rdsNodeData,
            });
            var visjsData = self.geAssetNodeVisjsData({ data: rdsNodeData }, null, true);
            self.addToGraph(visjsData);
        },
        getLinkedAssetNodesMap: function () {
            if (!visjsGraph.isGraphNotEmpty())  return {};
            var assetNodesMap = {};
            var nodes = visjsGraph.data.nodes.get();
            nodes.forEach(function (node) {
                if (node.data && node.data.assetNode) assetNodesMap["A_" + node.data.assetNode.id] = node;
            });
            return assetNodesMap;
        },
        focus: function (assetNodeId) {
            var nodes = visjsGraph.data.nodes.get();
            nodes.forEach(function (node) {
                if (node.data.assetNode && node.data.assetNode.id == assetNodeId) {
                    self.currentGraphNode = node;
                    visjsGraph.searchNode(node.id);
                }
            });
        },
    };

    return self;
})();
