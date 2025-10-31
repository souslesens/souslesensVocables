import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import Lineage_sources from "../lineage/lineage_sources.js";
import SearchUtil from "../../search/searchUtil.js";
import PopupMenuWidget from "../../uiWidgets/popupMenuWidget.js";
import MainController from "../../shared/mainController.js";

var Browse = (function () {
    var self = {};
    self.onLoaded = function () {
        //  UI.initMenuBar(self.loadSource);
        self.initUI();
    };

    self.initUI = function () {
        UI.showHideRightPanel();
        $("#lateralPanelDiv").load("modules/tools/browse/html/browseLeftPanel.html", function () {
            $("#graphDiv").load("modules/tools/browse/html/browseCentralPanel.html", function () {
                self.init(MainController.currentSource);
                $("#rightControlPanelDiv").hide();
                UI.resetWindowSize();
                var graphDivWidth = $("#graphDiv").css("width");
                $("#Browse_centralPanelDiv").css("width", graphDivWidth);
                $("#Browse_rightPanelTabs").css("width", graphDivWidth);
                $("#Browse_rightPanelTabs").css("width", graphDivWidth);
                $("#Browse_graphDiv").css("width", graphDivWidth);
            });
        });
    };
    /**
     * Loads a source and initializes modules for browsing.
     * @function
     * @name loadSource
     * @memberof module:Browse
     * @returns {void}
     */
    self.loadSource = function () {
        self.currentSource = MainController.currentSource;
        Lineage_sources.loadSources(MainController.currentSource, function (err) {
            if (err) {
                return MainController.errorAlert(err.responseText);
            }
            $("#lateralPanelDiv").load("modules/tools/browse/html/browseLeftPanel.html", function () {
                $("#graphDiv").load("modules/tools/browse/html/browseCentralPanel.html", function () {
                    self.init(MainController.currentSource);
                    $("#rightControlPanelDiv").hide();
                    UI.resetWindowSize();
                    var graphDivWidth = $("#graphDiv").css("width");
                    $("#Browse_centralPanelDiv").css("width", graphDivWidth);
                    $("#Browse_rightPanelTabs").css("width", graphDivWidth);
                    $("#Browse_rightPanelTabs").css("width", graphDivWidth);
                    $("#Browse_graphDiv").css("width", graphDivWidth);
                });
            });
        });
    };
    self.showDialog = function (mainSource) {
        /*   self.loadWhiteboardContent(function (err, result) {
            if (err) {
                return MainController.errorAlert(err)
            }*/
        $("#mainDialogDiv").load("modules/tools/browse/html/browseDialog.html", function () {
            UI.openDialog("mainDialogDiv", { title: "" });
            self.init(mainSource);
        });
        //   })
    };

    self.init = function (mainSource) {
        $("#Browse_rightPanelTabs").tabs({
            activate: function (event, ui) {
                $(".nodeInfosWidget_tabDiv").removeClass("nodesInfos-selectedTab");

                setTimeout(function () {
                    $("[aria-selected='true']").addClass("nodesInfos-selectedTab");
                }, 100);
            },
        });
        self.currentSearchResult = null;
        var currentHit = null;
        $("#Browse_searchAllSourcesTermInput").keypress(function (e) {
            if (e.which == 13) {
                var term = $("#Browse_searchAllSourcesTermInput").val();
                var exactMatch = $("#Browse_exactMatchCBX").prop("checked");
                var mode = "fuzzyMatch";
                if (exactMatch) {
                    mode = "exactMatch";
                }
                var options = {
                    parentlabels: true,
                    skosLabels: true,
                    fields: ["label", "skoslabels"], // "parents.keyword", "parent.keyword", "id.keyword"]
                };
                if (!term || term == "") {
                    return alert(" enter a word ");
                }
                var sources = null;
                var title = "";
                if (mainSource) {
                    sources = [mainSource];
                    title = mainSource;
                    sources = sources.concat(Config.sources[mainSource].imports);
                } else if (Lineage_sources.loadedSources) {
                    title = Lineage_sources.activeSource;
                    sources = Object.keys(Lineage_sources.loadedSources);
                }

                UI.setDialogTitle("#mainDialogDiv", title);
                if (mode == "fuzzyMatch" && !term.endsWith("*")) {
                    term += "*";
                }
                SearchUtil.getSimilarLabelsInSources(null, sources, [term], null, mode, options, function (_err, result) {
                    if (_err) {
                        return MainController.errorAlert(err.responseText);
                    }
                    self.currentSearchResult = result[0].matches;
                    self.currentSearchResult.parentIdsLabelsMap = result.parentIdsLabelsMap;

                    var html = "<ul>";

                    var array = Object.keys(self.currentSearchResult);
                    array.sort(function (a, b) {
                        return self.currentSearchResult[b].length - self.currentSearchResult[a].length;
                    });
                    array.forEach(function (index) {
                        // for (var index in self.currentSearchResult) {
                        if (index != "parentIdsLabelsMap") {
                            html +=
                                '<li  class= "Browse_searchList" id=\'' +
                                index +
                                "' onclick='Browse.listIndexHits(\"" +
                                index +
                                "\")'>" +
                                index +
                                " : " +
                                self.currentSearchResult[index].length +
                                "</li>";
                        }
                    });
                    html += "</ul>";
                    $("#Browse_searchListDiv").html(html);
                    $("#Browse_indexHitsDiv").html("");
                    $("#Browse_hitDetailsDiv").html("");
                });
            }
        });
    };

    self.encodeUriForHtmlId = function (uri) {
        var str = btoa(uri).replace(/=/g, "");
        return str;
    };

    self.listIndexHits = function (index) {
        var html = "<ul>";
        var distinctIds = {};
        $(".Browse_searchList").removeClass("selectedItem");
        $("#" + index).addClass("selectedItem");

        self.currentSearchResult[index].sort(function (a, b) {
            if (a.label > b.label) {
                return 1;
            }
            if (a.label < b.label) {
                return -1;
            }
            return 0;
        });

        self.currentSearchResult[index].forEach(function (hit) {
            if (!distinctIds[hit.id]) {
                distinctIds[hit.id] = 1;

                html += '<li   class="Browse_indexList" id=\'' + self.encodeUriForHtmlId(hit.id) + "' onclick='Browse.showHitDetails(\"" + index + "|" + hit.id + "\")'>" + hit.label + "</li>";
            }
        });
        html += "</ul>";
        $("#Browse_indexHitsDiv").html(html);
        $("#Browse_hitDetailsDiv").html("");
    };
    self.showHitDetails = function (hitKey) {
        var array = hitKey.split("|");
        var hit = null;
        var index = array[0];
        var hitId = array[1];

        self.currentSearchResult[index].forEach(function (item) {
            if (item.id == hitId) {
                hit = JSON.parse(JSON.stringify(item));
            }
        });
        if (!hit) {
            return console.log("no hit");
        }

        var node = { data: { id: hit.id } };
        NodeInfosWidget.showNodeInfos(hit.source, node, "Browse_hitDetailsDiv", {
            hideModifyButtons: true,
            noDialog: true,
        });
        self.showHitGraph(hit);
    };

    self.showHitGraph = function (hit, options) {
        if (!options) {
            options = {};
        }
        var triples = [];
        SubGraph.instantiateSubGraphTriples(hit.source, hit.id, { nonUnique: true }, function (err, result) {
            if (err) {
                return MainController.errorAlert(err);
            }
            triples = result.triples;
            SubGraph.instantiateSubGraphTriples(
                hit.source,
                hit.id,
                {
                    nonUnique: true,
                    inverseRestrictions: true,
                },
                function (err, result2) {
                    result2.triples.forEach(function (item) {
                        // item.isInverse = true
                        triples.push({
                            subject: item.object,
                            predicate: item.predicate,
                            object: item.subject,
                            isInverse: true,
                        });
                    });

                    //  triples = triples.concat(result2.triples)

                    self.getSubGraphHierarchicalVisjsData(triples, hit.id, hit.source, options, function (err, visjsData) {
                        if (visjsData.nodes.length == 0) {
                            UI.message("no data for " + hit.label);
                        }

                        if (options.addToLevel) {
                            self.visjsGraph.data.nodes.update(visjsData.nodes);
                            self.visjsGraph.data.edges.update(visjsData.edges);
                            Lineage_decoration.decorateByUpperOntologyByClass(visjsData.nodes, self.visjsGraph);
                            return;
                        }
                        var options2 = {
                            keepNodePositionOnDrag: true,
                            layoutHierarchical: {
                                direction: "LR",
                                nodeSpacing: 60,
                                levelSeparation: 300,
                            },
                            physics: {
                                enabled: true,
                            },

                            visjsOptions: {
                                edges: {
                                    //  smooth: false,
                                    smooth: {
                                        type: "cubicBezier",
                                        // type: "diagonalCross",
                                        forceDirection: "horizontal",
                                        roundness: 0.4,
                                    },
                                },
                            },
                        };
                        options2.onclickFn = self.graphActions.onVisjsGraphClick;
                        options2.onRightClickFn = self.graphActions.showGraphPopupMenu;

                        self.visjsGraph = new VisjsGraphClass(options.graphDiv || "Browse_graphDiv", visjsData, options2);
                        self.visjsGraph.draw(function () {
                            Lineage_decoration.decorateByUpperOntologyByClass(visjsData.nodes, self.visjsGraph);
                        });
                    });
                },
            );
        });

        self.getSubGraphHierarchicalVisjsData = function (data, rootNodeId, source, options, callback) {
            var visjsData = { nodes: [], edges: [] };
            var uniqueIds = {};
            var edgesMap = {};
            var edgesToMap = {};
            var nodesMap = {};
            var existingNodes = {};

            data.forEach(function (item) {
                if (!nodesMap[item.subject]) {
                    nodesMap[item.subject] = [];
                }
                nodesMap[item.subject].push(item);
                if (!edgesMap[item.predicate]) {
                    edgesMap[item.predicate] = 1;
                }
            });

            var allUris = Object.keys(nodesMap).concat(Object.keys(edgesMap));
            Sparql_OWL.getUrisLabelsMap(source, allUris, function (err, labelsMap) {
                var newNodes = [];
                var newEdges = [];

                function addVisjsNode(nodeId, level) {
                    var label = labelsMap[nodeId] || Sparql_common.getLabelFromURI(nodeId);
                    newNodes.push({
                        id: nodeId,
                        label: label,
                        shape: "dot",
                        level: level,
                        data: {
                            id: nodeId,
                            label: label,
                        },
                        size: 8,
                    });
                }

                function recurse(nodeId, level) {
                    if (!nodesMap[nodeId]) {
                        return;
                    }

                    if (!existingNodes[nodeId]) {
                        existingNodes[nodeId] = 1;

                        addVisjsNode(nodeId, level);

                        nodesMap[nodeId].forEach(function (item) {
                            if (!item.object.startsWith("http")) {
                                return;
                            }

                            var direction = "to";
                            if (item.isInverse) {
                                direction = "from";
                            }

                            if (item.predicate != "rdf:type") {
                                var label = labelsMap[item.predicate] || Sparql_common.getLabelFromURI(item.predicate);

                                newEdges.push({
                                    from: item.subject,
                                    to: item.object,
                                    label: label,
                                    font: { align: "middle" },
                                    arrows: direction,
                                });
                            }

                            if (!existingNodes[item.object]) {
                                existingNodes[item.object] = 1;
                                var nodeLevel = item.isInverse ? level - 1 : level + 1;
                                addVisjsNode(item.object, nodeLevel);
                                recurse(item.object, level + 1);
                            }
                        });
                    }
                }

                recurse(rootNodeId, options.addToLevel || 1);
                var visjsData = { nodes: newNodes, edges: newEdges };
                callback(null, visjsData);
            });
        };

        self.exportPDF = function () {};
    };

    self.showHitDetailsOutsideSearch = function (hitKey) {
        var array = hitKey.split("|");
        var hit = null;
        var index = array[0];
        var hitId = array[1];

        self.currentSearchResult[index].forEach(function (item) {
            if (item.id == hitId) {
                hit = JSON.parse(JSON.stringify(item));
            }
        });
        if (hit) {
            return self.showHitGraph(hit);
        }
        var sources = [index];
        sources = sources.concat(Config.sources[index].imports);

        var options = {
            parentlabels: true,
            fields: ["id.keyword"],
        };
        var term = hitId;
        var mode = "exactMatch";
        SearchUtil.getSimilarLabelsInSources(null, sources, [term], null, mode, options, function (_err, result) {
            if (result && result.length > 0) {
                var matches = result[0].matches;
                if (Object.keys(matches).length == 0) {
                    return UI.message("no data for " + hitId);
                }
                var matchedSource = Object.keys(matches)[0];
                hit = matches[matchedSource][0];
                self.currentSearchResult[matchedSource].push(hit);
                return self.showHitGraph(hit);
            }
        });
    };

    self.graphActions = {
        onVisjsGraphClick: function (node, point, options) {
            if (options.ctrlKey) {
                if (node.data.id && node.data.source) {
                    //var hitKey = node.data.source + "|" + node.data.id;
                    //self.showHitDetailsOutsideSearch(hitKey);
                    Browse.showHitGraph({ source: node.data.source, id: node.data.id });
                }
            } else {
                Browse.showHitGraph({ source: node.data.source, id: node.data.id }, { addToLevel: node.level });
                // NodeInfosWidget.showNodeInfos(node.data.source, node, "smallDialogDiv", {});
            }
        },
        showGraphPopupMenu: function (node, point, event) {
            return;
            self.setGraphPopupMenus(node, event);
            point = {};
            point.x = event.x;
            point.y = event.y;
            //end
            PopupMenuWidget.showPopup(point, "popupMenuWidgetDiv");
        },
    };

    return self;
})();
export default Browse;
window.Browse = Browse;
