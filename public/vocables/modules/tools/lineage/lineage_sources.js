import OntologyModels from "../../shared/ontologyModels.js";
import Lineage_classes from "./lineage_classes.js";
import Lineage_decoration from "./lineage_decoration.js";
import common from "../../shared/common.js";
import visjsGraph from "../../graph/visjsGraph2.js";
import SearchUtil from "../../search/searchUtil.js";
import Lineage_combine from "./lineage_combine.js";
import Lineage_selection from "./lineage_selection.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import Lineage_3D from "./lineage_3d.js";
import authentication from "../../shared/authentification.js";
import PromptedSelectWidget from "../../uiWidgets/promptedSelectWidget.js";
import SourceSelectorWidget from "../../uiWidgets/sourceSelectorWidget.js";

var Lineage_sources = (function () {
    var self = {};
    self.activeSource = null;
    self.loadedSources = {};
    self.sourceDivsMap = {};

    self.init = function (showDialog) {
        if (self.loadedSources) {
            for (var source in self.loadedSources) {
                self.menuActions.closeSource(source);
            }
        }
        $("#LineagePopup").dialog({
            autoOpen: false,
            height: 800,
            width: 1000,
            modal: false,
            //  position: { my: "left top", at: "left bottom", of: "#leftPanelDiv" },
        });
        $("#QueryDialog").dialog({
            autoOpen: false,
            height: 800,
            width: 700,
            modal: false,
            // position: { my: "left top", at: "left bottom", of: "#leftPanelDiv" },
        });
        self.activeSource = null;
        self.loadedSources = {};
        self.sourceDivsMap = {};

        // self.clearSource()

        self.resetVisjsGraph();
        Lineage_selection.selectedNodes = [];
        self.setTheme(Config.defaultGraphTheme);
        if (!Config.tools["lineage"].noSourceDialogAtInit) {
            Lineage_sources.showSourcesDialog(showDialog);
        }
    };

    self.resetAll = function (showDialog) {
        OntologyModels.unRegisterSourceModel();
        self.init(showDialog);
    };

    self.resetVisjsGraph = function () {
        $("#graphDiv").html("");
        Lineage_classes.drawNewGraph({ nodes: [], edges: [] });
    };

    self.showSourcesDialog = function (forceDialog) {
        if (!forceDialog && Config.tools["lineage"].urlParam_source) {
            return self.loadSources(Config.tools["lineage"].urlParam_source);
        }

        var options = {
            includeSourcesWithoutSearchIndex: true,
            withCheckboxes: true,
        };
        var selectTreeNodeFn = function () {
            $("#mainDialogDiv").dialog("close");
            var checkedSource = SourceSelectorWidget.getCheckedSources();

            if (checkedSource.length > 0) {
                return;
            }
            var source = SourceSelectorWidget.getSelectedSource()[0];

            self.setCurrentSource(source);
            $("#sourcesSelectionDialogdiv").dialog("close");
            $("#lineage_allActions").css("visibility", "visible");
            MainController.UI.showHideRightPanel();
        };

        var validateButtonFn = function () {
            var sources = SourceSelectorWidget.getCheckedSources();
            self.loadSources(sources);
        };

        SourceSelectorWidget.initWidget(["OWL"], "mainDialogDiv", true, selectTreeNodeFn, validateButtonFn, options);

        return;
        SourceSelectorWidget.showDialog(
            ["OWL", "SKOS"],
            {
                includeSourcesWithoutSearchIndex: true,
                withCheckboxes: true,
                targetDiv: null,
                openTargetDialogDiv: true,
                // dontTie_selection: false,
                onOpenNodeFn: function () {
                    $("#Lineage_classes_SearchSourceInput").blur();
                },
            },
            function () {
                var searchSource = $("#Lineage_classes_SearchSourceInput").val();
                if (!searchSource) {
                    return;
                }
                var source = $("#searchAll_sourcesTree").jstree(true).get_selected()[0];
                self.setCurrentSource(source);
                $("#sourcesSelectionDialogdiv").dialog("close");
                $("#lineage_allActions").css("visibility", "visible");
                MainController.UI.showHideRightPanel();
            },
            function () {
                //if checkbox

                var sources = $("#searchAll_sourcesTree").jstree(true).get_checked();

                self.loadSources(sources);
            }
        );
    };

    self.loadSources = function (sources) {
        if (!sources) {
            return alert("no source selected");
        }
        if (!Array.isArray(sources)) {
            sources = [sources];
        }

        var firstSource = null;
        async.eachSeries(
            sources,
            function (source, callbackEach) {
                if (self.loadedSources[source]) return callbackEach();
                self.initSource(source, function (err, result) {
                    if (!err) {
                        firstSource = source;
                    }
                    return callbackEach();
                });
            },
            function (err) {
                if (err) {
                    alert(err);
                }
                self.setCurrentSource(firstSource);
                $("#sourcesSelectionDialogdiv").dialog("close");
                MainController.UI.showHideRightPanel();
                $("#lineage_allActions").css("visibility", "visible");
            },
            function (err) {
                if (err) {
                    return alert(err.responseText);
                }
            }
        );
    };

    self.setCurrentSource = function (source) {
        if (!source) {
            return;
        }

        if (!Config.sources[source]) {
            return alert("source" + source + "not found");
        }

        if (true) {
            // $("#Lineage_Tabs").tabs("disable", 3);
            $("#lineage_classes_showLinkedDataButton").prop("disabled", true);
        }

        function highlightSourceDiv(source) {
            $(".Lineage_sourceLabelDiv").removeClass("Lineage_selectedSourceDiv");
            $("#" + self.loadedSources[source].sourceDivId).addClass("Lineage_selectedSourceDiv");
        }

        self.activeSource = source;
        JstreeWidget.clear("lineage_containers_containersJstree");
        //new source to load
        if (!self.loadedSources[source]) {
            self.initSource(source, function (err, sourceDivId) {
                if (err) {
                    return MainController.UI.message(err);
                }

                highlightSourceDiv(source);

                Lineage_classes.initWhiteBoard(false);

                self.initWhiteboardActions();
                self.showHideLineageLeftPanels();
            });
        } else {
            self.activeSource = source;
            highlightSourceDiv(source);
            self.whiteboard_setGraphOpacity(source);
            Lineage_decoration.refreshLegend(source);
            self.setAllWhiteBoardSources(true);
        }

        $("#LineageNodesJsTreeDiv").empty();
        $("#Lineage_propertiesTree").empty();
        self.showHideEditButtons(source);

        $("#LineageLinkedDataRelationsDiv").load("snippets/lineage/linkedData/lineage_linkedData_relations.html", function () {
            Lineage_linkedData_query.init();
        });

        self.initSourcesSearchSelect();
    };

    self.initSourcesSearchSelect = function () {
        var scope = $("#GenericTools_searchScope").val();
        if (scope == "currentSource") {
            self.fromAllWhiteboardSources = false;
        } else if (scope == "whiteboardSources") {
            self.fromAllWhiteboardSources = false;
        } else {
            //  common.fillSelectOptions("GenericTools_searchAllClassSelect", [], true);
        }

        self.getSourcesClasses(self.activeSource, function (err, result) {
            if (err) {
                return alert(err);
            }

            //  common.fillSelectOptions("GenericTools_searchAllClassSelect", result, true, "label", "id");
        });
    };
    self.onSearchClass = function () {
        PromptedSelectWidget.prompt("owl:Class", "GenericTools_searchAllClassSelect", self.activeSource);
    };

    self.showHideLineageLeftPanels = function () {
        $("#lineage_allActions").css("visibility", "visible");
        if (!Config.currentTopLevelOntology) {
            $("#lineage_legendWrapper").css("display", "block");
            return;
        } else {
            $("#lineage_legendWrapper").css("display", "flex");
        }
    };

    self.showHideEditButtons = function (source, hide) {
        if (!visjsGraph.network) {
            return;
        }
        if (hide) {
            visjsGraph.network.disableEditMode();
            $(".vis-edit-mode").css("display", "none");
        }
        var isNodeEditable = Lineage_sources.isSourceEditableForUser(source);
        if (isNodeEditable) {
            visjsGraph.network.enableEditMode();
            $(".vis-edit-mode").css("display", "block");
        } else {
            visjsGraph.network.disableEditMode();
            $(".vis-edit-mode").css("display", "none");
        }
    };

    self.whiteboard_setGraphOpacity = function (source) {
        var nodesMapSources = {};
        if (!visjsGraph.isGraphNotEmpty()) {
            return;
        }
        var nodes = visjsGraph.data.nodes.get();
        var newNodes = [];

        nodes.forEach(function (node) {
            nodesMapSources[node.id] = node.data.source;
            if (node.data && !node.data.fullColor) {
                node.data.fullColor = node.color;
            }

            var color;
            var fontColor;
            if (source && node.data.source != source) {
                color = common.colorToRgba(node.data.fullColor, Lineage_classes.defaultLowOpacity);
                fontColor = common.colorToRgba(Lineage_classes.defaultNodeFontColor, Lineage_classes.defaultLowOpacity);
            } else {
                color = node.data.fullColor;
                fontColor = Lineage_classes.defaultNodeFontColor;
            }
            newNodes.push({
                id: node.id,
                color: color,
                font: { color: fontColor },
            });
        });
        visjsGraph.data.nodes.update(newNodes);

        var edges = visjsGraph.data.edges.get();
        var newEdges = [];
        edges.forEach(function (edge) {
            if (!edge.data) {
                return;
            }
            if (edge.data && !edge.data.fullColor) {
                edge.data.fullColor = edge.color;
            }

            var color;
            var width;
            // var fontColor;

            if (!source || nodesMapSources[edge.from] == source || nodesMapSources[edge.to] == source) {
                color = edge.data.fullColor;
                // width=2
            } else {
                color = common.colorToRgba(edge.data.fullColor, Lineage_classes.defaultLowOpacity);
                // width=1
                // fontColor=common.colorToRgba(edge.data.fullColor, Lineage_classes.defaultLowOpacity)
            }

            newEdges.push({
                id: edge.id,
                color: color,
                // width:width,
                font: {
                    color: color,
                    //  multi: true,
                    size: 10,
                    strokeWidth: 0,
                    strokeColor: 0,
                    ital: true,
                },
            });
        });
        visjsGraph.data.edges.update(newEdges);
    };

    self.initSource = function (source, callback) {
        if (!source || !Config.sources[source]) {
            return callback("not a source");
        }

        self.registerSource(source, function (err) {
            Lineage_sources.setTopLevelOntologyFromImports(source);
            Lineage_sources.registerSourceImports(source, function (err) {
                if (err) {
                    return callback(err);
                }

                var drawTopConcepts = false;
                if (drawTopConcepts) {
                    Lineage_classes.drawTopConcepts(source, function (err) {
                        if (err) {
                            return MainController.UI.message(err);
                        }
                    });
                }
                self.indexSourceIfNotIndexed(source);
                callback(null, source);
            });
        });
    };

    self.indexSourceIfNotIndexed = function (source) {
        SearchUtil.initSourcesIndexesList(null, function (err, indexedSources) {
            if (err) return alert(err.responseText);
            if (indexedSources.indexOf(source) < 0) {
                MainController.UI.message("indexing source " + source);
                $("#waitImg").css("display", "block");
                SearchUtil.generateElasticIndex(source, { indexProperties: 1, indexNamedIndividuals: 1 }, function (err, _result) {
                    if (err) {
                        return MainController.UI.message(err, true);
                    }
                    MainController.UI.message("ALL DONE", true);
                });
            }
        });
    };

    self.registerSource = function (sourceLabel, callback) {
        if(!callback)
            callback=function(){}

        if (self.loadedSources[sourceLabel]) {
            return callback();
        }

        OntologyModels.registerSourcesModel(sourceLabel, function (err, result) {
            if (err) {
                return callback(err);
            }
            var sourceDivId = "source_" + common.getRandomHexaId(5);
            self.loadedSources[sourceLabel] = { sourceDivId: sourceDivId };
            self.sourceDivsMap[sourceDivId] = sourceLabel;
            var html =
                "<div  id='" +
                sourceDivId +
                "' style='color: " +
                Lineage_classes.getSourceColor(sourceLabel) +
                "'" +
                " class='Lineage_sourceLabelDiv' " +
                ">" +
                sourceLabel +
                "&nbsp;" +
                /*   "<i class='lineage_sources_menuIcon' onclick='Lineage_sources.showSourceDivPopupMenu(\"" +
sourceDivId +
"\")'>[-]</i>";*/
                "<input type='image' src='./icons/caret-right.png'  style='opacity: 0.5; width: 15px;}' onclick='Lineage_sources.showSourceDivPopupMenu(\"" +
                sourceDivId +
                "\")'/> </div>";
            $("#lineage_drawnSources").append(html);

            $("#" + sourceDivId).bind("click", function (e) {
                var sourceDivId = $(this).attr("id");
                var source = self.sourceDivsMap[sourceDivId];
                self.setCurrentSource(source);
            });
            return callback();
        });
    };
    self.showSourceDivPopupMenu = function (sourceDivId) {
        event.stopPropagation();
        var source = Lineage_sources.sourceDivsMap[sourceDivId];
        var html =
            '    <span  class="popupMenuItem" onclick="Lineage_sources.menuActions.setSourceOpacity(\'' +
            source +
            "');\"> Opacity</span>" +
            '    <span  class="popupMenuItem" onclick="Lineage_sources.menuActions.closeSource(\'' +
            source +
            "');\"> Close</span>" +
            '    <span  class="popupMenuItem" onclick="Lineage_sources.menuActions.hideSource(\'' +
            source +
            "');\"> Hide </span>" +
            ' <span  class="popupMenuItem" onclick="Lineage_sources.menuActions.showSource(\'' +
            source +
            "');\"> Show </span>" +
            ' <span  class="popupMenuItem" onclick="Lineage_sources.menuActions.groupSource(\'' +
            source +
            "');\"> Group </span>" +
            ' <span  class="popupMenuItem" onclick="Lineage_sources.menuActions.ungroupSource(\'' +
            source +
            "');\"> ungroup </span>" +
            ' <span  class="popupMenuItem" onclick="Lineage_sources.menuActions.exportOWL(\'' +
            source +
            "');\"> export OWL </span>";
        $("#graphPopupDiv").html(html);
        var e = window.event;
        var point = { x: e.pageX, y: e.pageY };
        //  var point={x:100,y:100}
        MainController.UI.showPopup(point, "graphPopupDiv", true);
        $("#graphPopupDiv").on("mouseleave", function () {
            MainController.UI.hidePopup("graphPopupDiv");
        });
    };

    self.registerSourceImports = function (sourceLabel, callback) {
        var imports = Config.sources[sourceLabel].imports;
        if (!imports) {
            imports = [];
        }
        async.eachSeries(
            imports,
            function (importSource, callbackEach) {
                self.registerSource(importSource, callbackEach);
            },
            callback
        );
    };

    self.setAllWhiteBoardSources = function (remove) {
        self.showHideEditButtons(null, true);
        if (remove) {
            Lineage_sources.fromAllWhiteboardSources = true;
        }

        if (!Lineage_sources.fromAllWhiteboardSources) {
            Lineage_sources.fromAllWhiteboardSources = true;
            if (Lineage_sources.activeSource) {
                $(".Lineage_sourceLabelDiv").addClass("Lineage_allSelectedSourceDiv");
                $(" #Lineage_sources.setAllWhiteBoardSources").addClass("Lineage_allSelectedSourceDiv");
                $("#" + Lineage_sources.activeSource).addClass("Lineage_selectedSourceDiv");

                self.whiteboard_setGraphOpacity(null);
                $("#GenericTools_searchScope").val("whiteboardSources");
            }
        } else {
            Lineage_sources.fromAllWhiteboardSources = false;
            if (Lineage_sources.activeSource) {
                $(".Lineage_sourceLabelDiv").removeClass("Lineage_allSelectedSourceDiv");
                $(" #Lineage_sources.setAllWhiteBoardSources").removeClass("Lineage_allSelectedSourceDiv");
                self.whiteboard_setGraphOpacity(Lineage_sources.activeSource);
                $("#GenericTools_searchScope").val("currentSource");
            }
        }
    };

    self.showHideCurrentSourceNodes = function (source, /** @type {any} */ hide) {
        if (!source) {
            source = Lineage_sources.activeSource;
        }

        var allNodes = visjsGraph.data.nodes.get();
        var newNodes = [];
        allNodes.forEach(function (node) {
            if (node && node.data && node.data.source == source) {
                newNodes.push({
                    id: node.id,
                    hidden: hide,
                });
            }
        });
        visjsGraph.data.nodes.update(newNodes);

        if (hide) {
            $("#Lineage_source_" + Lineage_sources.activeSource).addClass("lineage_hiddenSource");
        } else {
            $("#Lineage_source_" + Lineage_sources.activeSource).removeClass("lineage_hiddenSource");
        }
    };

    self.setTopLevelOntologyFromImports = function (sourceLabel) {
        Config.currentTopLevelOntology = null;
        if (Config.topLevelOntologies[sourceLabel]) {
            return (Config.currentTopLevelOntology = sourceLabel);
        }
        var imports = Config.sources[sourceLabel].imports;
        if (!imports) {
            return (Config.currentTopLevelOntology = Object.keys(Config.topLevelOntologies)[0]);
        }
        if (!Array.isArray(imports)) {
            imports = [imports];
        }
        var ok = false;

        imports.forEach(function (source) {
            if (!ok && Config.topLevelOntologies[source]) {
                ok = true;
                Config.currentTopLevelOntology = source;
            }
        });
        return Config.currentTopLevelOntology;
    };
    self.setTopLevelOntologyFromPrefix = function (prefix) {
        Config.currentTopLevelOntology = null;
        for (var key in Config.topLevelOntologies) {
            if (Config.topLevelOntologies[key].prefix == prefix) {
                Config.currentTopLevelOntology = key;
            }
        }
        return Config.currentTopLevelOntology;
    };

    self.menuActions = {
        setSourceOpacity: function (source) {
            var opacity = prompt("opacity %", 100);
            if (!opacity) {
                return;
            }
            if (opacity < 10) {
                opacity = 10;
            }
            opacity = opacity / 100;
            var nodesMapSources = {};
            var nodes = visjsGraph.data.nodes.get();
            var newNodes = [];
            nodes.forEach(function (node) {
                nodesMapSources[node.id] = node.data.source;
                if (node.data.source == source) {
                    newNodes.push({
                        id: node.id,
                        color: common.colorToRgba(node.color, opacity),
                        font: { color: common.colorToRgba(Lineage_classes.defaultNodeFontColor, opacity) },
                    });
                }
            });
            visjsGraph.data.nodes.update(newNodes);

            var edges = visjsGraph.data.edges.get();
            var newEdges = [];
            edges.forEach(function (edge) {
                if (nodesMapSources[edge.from] == source) {
                    newEdges.push({
                        id: edge.id,
                        color: common.colorToRgba(edge.color, opacity),
                        font: {
                            color: common.colorToRgba(Lineage_classes.defaultEdgeFontColor, opacity),
                            multi: true,
                            size: 10,
                            strokeWidth: 0,
                            strokeColor: 0,
                            ital: true,
                        },
                    });
                }
            });
            visjsGraph.data.edges.update(newEdges);
        },
        closeSource: function (source) {
            if (source) {
                self.activeSource = source;
            }
            if (visjsGraph.isGraphNotEmpty) {
                var nodes = visjsGraph.data.nodes.get();
                var nodesToRemove = [];
                nodes.forEach(function (node) {
                    if (node.data && node.data.source == self.activeSource) {
                        nodesToRemove.push(node.id);
                    }
                });
                visjsGraph.data.nodes.remove(nodesToRemove);
            }
            var sourceDivId = self.loadedSources[self.activeSource].sourceDivId;
            self.loadedSources[self.activeSource] = null;
            $("#" + sourceDivId).remove();
        },
        hideSource: function (source) {
            MainController.UI.hidePopup("graphPopupDiv");
            Lineage_sources.showHideCurrentSourceNodes(null, true);
        },
        showSource: function () {
            MainController.UI.hidePopup("graphPopupDiv");
            Lineage_sources.showHideCurrentSourceNodes(null, false);
        },
        groupSource: function (source) {
            MainController.UI.hidePopup("graphPopupDiv");

            if (!source) {
                source = Lineage_sources.activeSource;
            }
            var color = Lineage_classes.getSourceColor(source);
            var color2 = common.colorToRgba(color, 0.1);
            var visjsData = { nodes: [], edges: [] };
            var existingNodes = visjsGraph.getExistingIdsMap();

            for (var nodeId in existingNodes) {
                var node = visjsGraph.data.nodes.get(nodeId);
                if (node && node.id != source && node.data && node.data.source == source) {
                    var edgeId = nodeId + "_" + source;
                    if (!existingNodes[edgeId]) {
                        existingNodes[nodeId] = 1;
                        var edge = {
                            id: edgeId,
                            from: nodeId,
                            to: source,
                            //  arrows: " middle",
                            color: color2,
                            // physics:false,
                            width: 1,
                            // dashes: true,
                        };
                        visjsData.edges.push(edge);
                    }
                }
            }
            if (!existingNodes[source]) {
                existingNodes[source] = 1;
                var sourceNode = {
                    id: source,
                    label: source,
                    shadow: Lineage_classes.nodeShadow,
                    shape: "ellipse",
                    level: 1,
                    size: Lineage_classes.defaultShapeSize,
                    data: { source: source },
                    color: common.colorToRgba(color, 0.3),
                };
                visjsData.nodes.push(sourceNode);
            }
            visjsGraph.data.nodes.update(visjsData.nodes);
            visjsGraph.data.edges.update(visjsData.edges);
        },
        ungroupSource: function (source) {
            MainController.UI.hidePopup("graphPopupDiv");
            if (!source) {
                source = Lineage_sources.activeSource;
            }
            visjsGraph.data.nodes.remove(source);
        },
        exportOWL: function (source) {
            var payload = {
                graphUri: Config.sources[source].graphUri,
            };
            $.ajax({
                type: "GET",
                url: Config.apiUrl + "/graphStore/graph",
                data: payload,
                dataType: "json",
                success: function (data, _textStatus, _jqXHR) {
                    common.copyTextToClipboard(data);
                },
                error: function (err) {
                    alert(err.responseText);
                },
            });

            /*     Sparql_OWL.generateOWL(source, {}, function (err, result) {
                if (err) {
                    return console.log(err);
                }

                common.copyTextToClipboard(result);
            });*/
        },
    };

    /* self.initWhiteboardActions = function () {
        self.whiteboardActions = {
            "Clear all": Lineage_classes.clearLastAddedNodesAndEdges,
            "Show Last only": Lineage_classes.showLastAddedNodesOnly,
            "Show/Hide individuals": Lineage_classes.showHideIndividuals,
            "Draw similar label nodes": Lineage_combine.getSimilars,
            Selection: "",
            "  Show": Lineage_selection.listNodesSelection,
            "  Clear": Lineage_selection.clearNodesSelection,
        };

        var actions = Object.keys(self.whiteboardActions);
        common.fillSelectOptions("lineage_classes_whiteboardSelect", actions, true);
    };

    self.onSelectWhiteboardAction = function (action) {
        var fn = self.whiteboardActions[action];
        if (fn) {
            fn();
        }
        $("#lineage_classes_whiteboardSelect").val("");
    };*/

    self.isSourceEditableForUser = function (source) {
        if (!Config.sources[source]) {
            return; // console.log("no source " + source);
        }
        const groups = authentication.currentUser.groupes;
        const currentAccessControls = groups.map((group) => {
            const defaultAccessControl = Config.profiles[group].defaultSourceAccessControl;
            const sourcesAccessControl = Config.profiles[group].sourcesAccessControl;
            return sourcesAccessControl.hasOwnProperty(source) ? sourcesAccessControl[source] : defaultAccessControl;
        });
        if (groups.indexOf("admin") > -1) return true;

        self.realAccessControl = currentAccessControls.includes("readwrite") ? "readwrite" : currentAccessControls.includes("read") ? "read" : "forbidden";

        if (self.realAccessControl === "readwrite" && Config.sources[source].editable) {
            return true;
        } else {
            return false;
        }
    };

    self.clearSource = function (source) {
        if (!source) {
            source = self.activeSource;
        }
        if (visjsGraph.isGraphNotEmpty && visjsGraph.data) {
            var nodes = visjsGraph.data.nodes.get();
            var newNodes = [];
            nodes.forEach(function (node) {
                if (node.data && node.data.source == source) {
                    newNodes.push({ id: node.id });
                }
            });
            visjsGraph.data.nodes.remove(newNodes);
        }
    };

    self.setTheme = function (theme) {
        var backgroundColor;

        if (theme == "white") {
            backgroundColor = "white";
            Lineage_classes.defaultNodeFontColor = "#343434";
            Lineage_classes.defaultEdgeFontColor = "#343434";
        } else if (theme == "dark") {
            backgroundColor = "#414040FF";
            Lineage_classes.defaultNodeFontColor = "#eee";
            Lineage_classes.defaultEdgeFontColor = "#eee";
        }

        $("#graphDiv").css("background-color", backgroundColor);
        if (visjsGraph.isGraphNotEmpty && visjsGraph.data) {
            /* visjsGraph.network.options.nodes.font = { color: Lineage_classes.defaultNodeFontColor };
visjsGraph.network.options.edges.font = { color: self.defaultEdgeFontColor };*/

            var nodes = visjsGraph.data.nodes.get();
            var newNodes = [];
            nodes.forEach(function (node) {
                newNodes.push({ id: node.id, font: { color: Lineage_classes.defaultNodeFontColor } });
            });
            visjsGraph.data.nodes.update(newNodes);
            var edges = visjsGraph.data.edges.get();
            var newEdges = [];
            edges.forEach(function (edge) {
                newEdges.push({ id: edge.id, font: { color: Lineage_classes.defaultEdgeFontColor } });
            });
            visjsGraph.data.edges.update(newEdges);
        }
    };
    self.getSourcesClasses = function (source, callback) {
        Sparql_OWL.getDictionary(self.activeSource, { selectGraph: true, lang: Config.default_lang, type: "owl:Class" }, null, function (err, result) {
            if (err) {
                callback(err);
            }

            var sourceObjects = [];
            var TopLevelOntologyObjects = [];
            result.forEach(function (item) {
                if (item.label) {
                    var prefix = "";
                    if (Config.currentTopLevelOntology && item.g.value.indexOf(Config.topLevelOntologies[Config.currentTopLevelOntology].uriPattern) > -1) {
                        prefix = "_" + Config.topLevelOntologies[Config.currentTopLevelOntology].prefix + ":";
                    }
                    sourceObjects.push({ label: prefix + item.label.value, id: item.id.value, type: "Class" });
                }
            });
            sourceObjects.sort(function (a, b) {
                if (!a.label || !b.label) {
                    return 0;
                }
                if (a.label > b.label) {
                    return 1;
                }
                if (a.label < b.label) {
                    return -1;
                }
                return 0;
            });
            callback(null, sourceObjects);
        });
    };

    self.test3D = function () {
        //return Lineage_3D.testThree()
        // Random tree
        const N = 300;
        /*    const gData = {
nodes: [...Array(N).keys()].map(i => ({ id: i })),
links: [...Array(N).keys()]
.filter(id => id)
.map(id => ({
source: id,
target: Math.round(Math.random() * (id-1))
}))
};*/

        var nodes = visjsGraph.data.nodes.get();
        var edges = visjsGraph.data.edges.get();
        var gData2 = { nodes: [], links: [] };
        nodes.forEach(function (node) {
            if (node.id) {
                gData2.nodes.push({ id: node.id, label: node.label, color: node.color, data: node.data });
            }
        });
        edges.forEach(function (edge) {
            if (nodes.indexOf(edge.from) && nodes.indexOf(edge.to)) {
                gData2.links.push({ source: edge.from, target: edge.to, label: edge.label });
            }
        });

        const Graph = ForceGraph3D()(document.getElementById("graphDiv"))
            .graphData(gData2)
            .width($("#graphDiv").width())
            .height($("#graphDiv").height())
            .backgroundColor("#333")
            .showNavInfo(true)
            .linkColor((link) => (link.data && link.data.bNodeId ? "yellow" : "orange"))
            .nodeThreeObject((node) => {
                if (!node) {
                    return null;
                }
                const sprite = new SpriteText(node.label);
                sprite.material.depthWrite = false; // make sprite background transparent
                sprite.color = node.color;

                sprite.textHeight = 8;
                return sprite;
            })
            .linkThreeObjectExtend(true)
            .linkWidth(2)
            .linkThreeObject((link) => {
                // extend link with text sprite
                const sprite = new SpriteText(link.label);
                sprite.color = "#cb6601";
                sprite.textHeight = 1.5;
                return sprite;
            })
            .linkPositionUpdate((sprite, { start, end }) => {
                const middlePos = Object.assign(
                    ...["x", "y", "z"].map((c) => ({
                        [c]: start[c] + (end[c] - start[c]) / 2, // calc middle point
                    }))
                );

                // Position sprite
                Object.assign(sprite.position, middlePos);
            })

            .onNodeClick(function (node, event) {
                NodeInfosWidget.showNodeInfos(node.data.source, node, "mainDialogDiv", { resetVisited: 1 });
            })
            // .nodeAutoColorBy('group')
            .onNodeDragEnd((node) => {
                node.fx = node.x;
                node.fy = node.y;
                node.fz = node.z;
            });

        const linkForce = Graph.d3Force("link").distance((link) => (link.data && link.data.bNodeId ? 400 : 10));
    };

    return self;
})();

export default Lineage_sources;

window.Lineage_sources = Lineage_sources;
