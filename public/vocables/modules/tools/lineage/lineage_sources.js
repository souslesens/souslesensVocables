import OntologyModels from "../../shared/ontologyModels.js";
import Lineage_whiteboard from "./lineage_whiteboard.js";
import Lineage_decoration from "./lineage_decoration.js";
import common from "../../shared/common.js";

import SearchUtil from "../../search/searchUtil.js";
import Lineage_combine from "./lineage_combine.js";
import Lineage_selection from "./lineage_selection.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";

import authentication from "../../shared/authentification.js";
import PromptedSelectWidget from "../../uiWidgets/promptedSelectWidget.js";
import SourceSelectorWidget from "../../uiWidgets/sourceSelectorWidget.js";
import MainController from "../../shared/mainController.js";
import SearchWidget from "../../uiWidgets/searchWidget.js";
import Authentification from "../../shared/authentification.js";
import UI from "../../../modules/shared/UI.js";

/**
 * @module Lineage_sources
 * @description Module for managing ontology sources in the lineage system.
 * Provides functionality for:
 * - Loading and initializing ontology sources
 * - Managing source selection and activation
 * - Handling source-specific UI elements and themes
 * - Supporting source imports and dependencies
 * - Managing source metadata and configurations
 * - Coordinating source-related operations with other modules
 * - Supporting source validation and persistence
 */

var Lineage_sources = (function () {
    var self = {};
    self.activeSource = null;
    self.loadedSources = {};
    self.sourceDivsMap = {};

    /**
     * Initializes the lineage sources module, resetting the active source and UI elements.
     * Optionally displays the source selection dialog.
     * @function
     * @name init
     * @memberof module:Lineage_sources
     * @param {boolean} showDialog - Whether to show the source selection dialog.
     * @returns {void}
     */
    self.init = function (showDialog) {
        if (true) {
            Config.Lineage.disabledButtons.forEach(function (buttonId) {
                $("#" + buttonId).prop("disabled", "disabled");
            });
        }

        if (self.loadedSources) {
            for (var source in self.loadedSources) {
                self.menuActions.closeSource(source);
            }
        }
        /*  $("#LineagePopup").dialog({
            autoOpen: false,
            height: 800,
            width: 1000,
            modal: false,

        });*/

        self.activeSource = null;
        self.loadedSources = {};
        self.sourceDivsMap = {};

        // self.clearSource()

        Lineage_selection.selectedNodes = [];
        self.setTheme(Config.defaultGraphTheme);
        if (!Config.userTools["lineage"].noSourceDialogAtInit) {
            Lineage_sources.showSourcesDialog(showDialog);
        }
    };

    /**
     * Resets all loaded sources and unregisters ontology models.
     * Calls the initialization function afterward.
     * @function
     * @name resetAll
     * @memberof module:Lineage_sources
     * @param {boolean} showDialog - Whether to show the source selection dialog.
     * @returns {void}
     */
    self.resetAll = function (showDialog) {
        OntologyModels.unRegisterSourceModel();
        self.init(showDialog);
    };

    /**
     * Displays the source selection dialog, allowing users to choose ontology sources.
     * If a source is provided via URL parameters, it is loaded directly.
     * @function
     * @name showSourcesDialog
     * @memberof module:Lineage_sources
     * @param {boolean} forceDialog - Whether to force the display of the selection dialog.
     * @returns {void}
     */
    self.showSourcesDialog = function (forceDialog) {
        if (!forceDialog && Config.userTools["lineage"].urlParam_source) {
            return self.loadSources(Config.userTools["lineage"].urlParam_source);
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
            self.mainSource = source;
            self.setCurrentSource(source);
            $("#sourcesSelectionDialogdiv").dialog("close");
            $("#lineage_allActions").css("visibility", "visible");
            UI.showHideRightPanel("show");
        };

        var validateButtonFn = function () {
            var sources = SourceSelectorWidget.getCheckedSources();
            self.loadSources(sources);
        };
        UI.showHideRightPanel("hide");
        SourceSelectorWidget.initWidget(["OWL"], "mainDialogDiv", true, selectTreeNodeFn, validateButtonFn, options);

        return;
    };

    /**
     * Loads the specified sources asynchronously, initializing each if not already loaded.
     * After loading, sets the first source as the current active source.
     * @function
     * @name loadSources
     * @memberof module:Lineage_sources
     * @param {string|string[]} sources - The source(s) to be loaded.
     * @param {function} [callback] - Optional callback function executed after loading.
     * @returns {void}
     */
    self.loadSources = function (sources, callback) {
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
                if (self.loadedSources[source]) {
                    return callbackEach();
                }
                self.initSource(source, function (err, result) {
                    if (err) {
                        return callbackEach(err);
                    }
                    if (!firstSource) {
                        firstSource = source;
                    }

                    return callbackEach();
                });
            },
            function (err) {
                if (err) {
                    if (callback) {
                        return callback(err);
                    }
                    return alert(err);
                }
                self.setCurrentSource(firstSource);
                $("#sourcesSelectionDialogdiv").dialog("close");
                UI.showHideRightPanel();
                $("#lineage_allActions").css("visibility", "visible");

                if (callback) {
                    return callback(err);
                }
            },
        );
    };

    /**
     * Sets the specified source as the current active source.
     * Updates the UI accordingly, initializes the whiteboard, and loads source-specific elements.
     * @function
     * @name setCurrentSource
     * @memberof module:Lineage_sources
     * @param {string} source - The source to be set as active.
     * @returns {void}
     */
    self.setCurrentSource = function (source) {
        if (!source) {
            return;
        }

        if (!Config.sources[source]) {
            return alert("source" + source + "not found");
        }

        Config.Lineage.disabledButtons.forEach(function (buttonId) {
            $("#" + buttonId).prop("disabled", "disabled");
        });

        /**
         * Highlights the source div in the UI and updates the active source.
         * @function
         * @name highlightSourceDiv
         * @memberof module:Lineage_sources
         * @param {string} source - The source to highlight.
         * @returns {void}
         * @private
         */
        function highlightSourceDiv(source) {
            $(".Lineage_sourceLabelDiv").removeClass("Lineage_selectedSourceDiv");
            $("#" + self.loadedSources[source].sourceDivId).addClass("Lineage_selectedSourceDiv");
        }

        if (!self.activeSource) {
            self.activeSource = source;
        } else {
            self.activeSource = source;
        }

        var display = "none";
        if (Lineage_sources.isSourceEditableForUser(Lineage_sources.activeSource)) {
            display = "block";
        }
        $("#lineage_createResourceBtn").css("display", display);
        $("#containersTab").html();
        JstreeWidget.clear("lineage_containers_containersJstree");
        var editable = Lineage_sources.isSourceEditableForUser(source);
        var display = editable ? "block" : "none";
        $("#lineage_actionDiv_newAxiom").css("display", display);

        //new source to load
        if (!self.loadedSources[source]) {
            self.initSource(source, function (err, sourceDivId) {
                if (err) {
                    return UI.message(err);
                }

                highlightSourceDiv(source);

                Lineage_whiteboard.initWhiteBoard(false);

                // self.initWhiteboardActions();
                self.showHideLineageLeftPanels();
            });
        } else {
            self.activeSource = source;
            highlightSourceDiv(source);
            self.whiteboard_setGraphOpacity(source);
            self.setAllWhiteBoardSources(true);
            if (MainController.currentTool == "Weaver") {
                Weaver.loadTopClasses();
            }
        }

        $("#LineageNodesJsTreeDiv").empty();
        $("#Lineage_propertiesTree").empty();
        Lineage_selection.selectedNodes = [];
        self.showHideEditButtons(source);
        setTimeout(function () {
            SearchWidget.init();
        }, 500);

        $("#LineageLinkedDataRelationsDiv").load("snippets/lineage/linkedData/lineage_linkedData_relations.html", function () {
            Lineage_linkedData_query.init();
        });

        self.initSourcesSearchSelect();
        SparqlQuery_bot.start({ divId: "queryTabDiv" });
    };

    /**
     * Initializes the source search selection based on the user's selected search scope.
     * Updates available class options for searching within the selected source.
     * @function
     * @name initSourcesSearchSelect
     * @memberof module:Lineage_sources
     * @returns {void}
     */
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

    /**
     * Shows or hides the left panels in the lineage UI based on the current ontology configuration.
     * Adjusts the display of the legend wrapper section accordingly.
     * @function
     * @name showHideLineageLeftPanels
     * @memberof module:Lineage_sources
     * @returns {void}
     */
    self.showHideLineageLeftPanels = function () {
        $("#lineage_allActions").css("visibility", "visible");
        if (!Config.currentTopLevelOntology) {
            $("#lineage_legendWrapperSection").css("display", "block");
            return;
        } else {
            $("#lineage_legendWrapperSection").css("display", "flex");
        }
    };

    /**
     * Shows or hides edit buttons based on the source's editability.
     * Disables edit mode for the graph and updates the UI accordingly.
     * @function
     * @name showHideEditButtons
     * @memberof module:Lineage_sources
     * @param {string} source - The source to check for editability.
     * @param {boolean} [hide] - Optional flag to force hiding the buttons.
     * @returns {void}
     */
    self.showHideEditButtons = function (source, hide) {
        if (!Lineage_whiteboard.lineageVisjsGraph.network) {
            return;
        }

        Lineage_whiteboard.lineageVisjsGraph.network.disableEditMode();
        $(".vis-edit-mode").css("display", "none");

        var isNodeEditable = Lineage_sources.isSourceEditableForUser(source);
        if (isNodeEditable) {
            $("#Lineage_graphEditionButtons").css("display", "block");

            $("#lineage_createResourceBtn").show();
        } else {
            $("#Lineage_graphEditionButtons").css("display", "none");
            $("#lineage_createResourceBtn").hide();
        }
        $("#Title1").text($(".Lineage_selectedSourceDiv").text());
        //Lineage_whiteboard.resetCurrentTab();
    };

    /**
     * Adjusts the opacity of nodes and edges in the whiteboard graph based on the active source.
     * Nodes and edges belonging to the active source remain fully visible, while others become transparent.
     * @function
     * @name whiteboard_setGraphOpacity
     * @memberof module:Lineage_sources
     * @param {string} source - The currently active source.
     * @returns {void}
     */
    self.whiteboard_setGraphOpacity = function (source) {
        var nodesMapSources = {};
        if (!Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
            return;
        }
        var nodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
        var newNodes = [];

        nodes.forEach(function (node) {
            nodesMapSources[node.id] = node.data.source;
            if (node.data && !node.data.fullColor) {
                node.data.fullColor = node.color;
            }

            var color;
            var fontColor;
            if (source && node.data.source != source) {
                color = common.colorToRgba(node.data.fullColor, Lineage_whiteboard.defaultLowOpacity);
                fontColor = common.colorToRgba(Lineage_whiteboard.defaultNodeFontColor, Lineage_whiteboard.defaultLowOpacity);
            } else {
                color = node.data.fullColor;
                fontColor = Lineage_whiteboard.defaultNodeFontColor;
            }
            newNodes.push({
                id: node.id,
                color: color,
                font: { color: fontColor },
            });
        });
        Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(newNodes);

        var edges = Lineage_whiteboard.lineageVisjsGraph.data.edges.get();
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
                color = common.colorToRgba(edge.data.fullColor, Lineage_whiteboard.defaultLowOpacity);
                // width=1
                // fontColor=common.colorToRgba(edge.data.fullColor, Lineage_whiteboard.defaultLowOpacity)
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
        Lineage_whiteboard.lineageVisjsGraph.data.edges.update(newEdges);
    };

    /**
     * Initializes a given source by registering it and setting up ontology imports.
     * Optionally draws top-level concepts if needed.
     * @function
     * @name initSource
     * @memberof module:Lineage_sources
     * @param {string} source - The source to initialize.
     * @param {function} callback - Callback function executed after initialization.
     * @returns {void}
     */
    self.initSource = function (source, callback) {
        if (!source || !Config.sources[source]) {
            return callback(source + " is not a valid source");
        }

        self.registerSource(source, function (err) {
            Lineage_sources.setTopLevelOntologyFromImports(source);
            Lineage_sources.registerSourceImports(source, function (err) {
                if (err) {
                    return callback(err);
                }

                var drawTopConcepts = false;
                if (drawTopConcepts) {
                    Lineage_whiteboard.drawTopConcepts(source, {}, null, function (err) {
                        if (err) {
                            return UI.message(err);
                        }
                    });
                }
                self.indexSourceIfNotIndexed(source);
                callback(null, source);
            });
        });
    };

    /**
     * Checks if a source is indexed in ElasticSearch. If not, it triggers the indexing process.
     * @function
     * @name indexSourceIfNotIndexed
     * @memberof module:Lineage_sources
     * @param {string} source - The source to check and index if necessary.
     * @returns {void}
     */
    self.indexSourceIfNotIndexed = function (source) {
        SearchUtil.initSourcesIndexesList(null, function (err, indexedSources) {
            if (err) {
                return alert(err.responseText);
            }
            if (indexedSources.indexOf(source) < 0) {
                UI.message("indexing source " + source);
                $("#waitImg").css("display", "block");
                SearchUtil.generateElasticIndex(
                    source,
                    {
                        indexProperties: 1,
                        indexNamedIndividuals: 1,
                    },
                    function (err, _result) {
                        if (err) {
                            return UI.message(err, true);
                        }
                        UI.message("ALL DONE", true);
                    },
                );
            }
        });
    };

    /**
     * Registers a source, ensuring it is loaded and displayed in the UI.
     * @function
     * @name registerSource
     * @memberof module:Lineage_sources
     * @param {string} sourceLabel - The label of the source to register.
     * @param {function} [callback] - Optional callback function to execute after registration.
     * @returns {void}
     */
    self.registerSource = function (sourceLabel, callback) {
        if (!callback) {
            callback = function () {};
        }

        if (self.loadedSources[sourceLabel]) {
            return callback();
        }
        if (!Lineage_whiteboard.decorationData[sourceLabel]) {
            Lineage_whiteboard.loadDecorationData(sourceLabel);
        }
        OntologyModels.registerSourcesModel(sourceLabel, null, function (err, result) {
            if (err) {
                return callback(err);
            }
            var sourceDivId = "source_" + common.getRandomHexaId(5);
            if (!self.loadedSources[sourceLabel]) {
                self.loadedSources[sourceLabel] = { sourceDivId: sourceDivId };
                self.sourceDivsMap[sourceDivId] = sourceLabel;
                var html =
                    "<div  id='" +
                    sourceDivId +
                    "' style='color: " +
                    Lineage_whiteboard.getSourceColor(sourceLabel) +
                    ";display:inline-flex;align-items:end;'" +
                    " class='Lineage_sourceLabelDiv'  " +
                    ">" +
                    sourceLabel +
                    "&nbsp;" +
                    /*   "<i class='lineage_sources_menuIcon' onclick='Lineage_sources.showSourceDivPopupMenu(\"" +
    sourceDivId +
    "\")'>[-]</i>";*/
                    "<button class='arrow-icon slsv-invisible-button'  style=' width: 20px;height:20px;}' onclick='Lineage_sources.showSourceDivPopupMenu(\"" +
                    sourceDivId +
                    "\")'/> </button></div>";
                $("#lineage_drawnSources").append(html);

                $("#" + sourceDivId).bind("click", function (e) {
                    var sourceDivId = $(this).attr("id");
                    var source = self.sourceDivsMap[sourceDivId];
                    self.setCurrentSource(source);
                });
            }

            return callback();
        });
    };

    /**
     * Registers a source without displaying its imports, adding it to the UI if it matches the active source.
     * @function
     * @name registerSourceWithoutDisplayingImports
     * @memberof Lineage_sources
     * @description Registers a source without displaying its imports, adding it to the UI if it matches the active source.
     * @param {string} sourceLabel - The label of the source to register.
     * @param {function} [callback] - Optional callback function to execute after registration.
     * @returns {void}
     */
    self.registerSourceWithoutDisplayingImports = function (sourceLabel, callback) {
        if (!callback) {
            callback = function () {};
        }

        if (Lineage_sources.loadedSources[sourceLabel]) {
            return callback();
        }

        OntologyModels.registerSourcesModel(sourceLabel, null, function (err, result) {
            if (err) {
                return callback(err);
            }
            if (sourceLabel == MainController.currentSource) {
                var sourceDivId = "source_" + common.getRandomHexaId(5);
                if (!Lineage_sources.loadedSources[sourceLabel]) {
                    Lineage_sources.loadedSources[sourceLabel] = { sourceDivId: sourceDivId };
                    Lineage_sources.sourceDivsMap[sourceDivId] = sourceLabel;
                    var html =
                        "<div  id='" +
                        sourceDivId +
                        "' style='color: " +
                        Lineage_whiteboard.getSourceColor(sourceLabel) +
                        ";display:inline-flex;align-items:end;'" +
                        " class='Lineage_sourceLabelDiv'  " +
                        ">" +
                        sourceLabel +
                        "&nbsp;" +
                        /*   "<i class='lineage_sources_menuIcon' onclick='Lineage_sources.showSourceDivPopupMenu(\"" +
        sourceDivId +
        "\")'>[-]</i>";*/
                        "<button class='arrow-icon slsv-invisible-button'  style=' width: 20px;height:20px;}' onclick='Lineage_sources.showSourceDivPopupMenu(\"" +
                        sourceDivId +
                        "\")'/> </button></div>";
                    $("#lineage_drawnSources").append(html);
                    $("#lineage_drawnSources").find(".arrow-icon").hide();
                }
                /*
                $("#" + sourceDivId).bind("click", function (e) {
                    var sourceDivId = $(this).attr("id");
                    var source = self.sourceDivsMap[sourceDivId];
                    Lineage_sources.setCurrentSource(source);
                });
                */
                return callback();
            } else {
                return callback();
            }
        });
    };

    /**
     * Displays a contextual popup menu for a source, allowing various actions such as hiding, grouping, or editing.
     * @function
     * @name showSourceDivPopupMenu
     * @memberof module:Lineage_sources
     * @param {string} sourceDivId - The ID of the source's div element.
     * @returns {void}
     */
    self.showSourceDivPopupMenu = function (sourceDivId) {
        event.stopPropagation();
        let source = Lineage_sources.sourceDivsMap[sourceDivId];
        Lineage_sources.setCurrentSource(source);
        let html =
            '<span class="popupMenuItem" onclick="Lineage_sources.menuActions.setSourceOpacity();">Opacity</span>' +
            '<span class="popupMenuItem" onclick="Lineage_sources.menuActions.closeSource();">Close</span>' +
            '<span class="popupMenuItem" onclick="Lineage_sources.menuActions.hideSource();">Hide</span>' +
            '<span class="popupMenuItem" onclick="Lineage_sources.menuActions.showSource();">Show</span>' +
            '<span class="popupMenuItem" onclick="Lineage_sources.menuActions.groupSource();">Group</span>' +
            '<span class="popupMenuItem" onclick="Lineage_sources.menuActions.ungroupSource();">Ungroup</span>' +
            '<span  class="popupMenuItem" onclick="Lineage_sources.menuActions.copyGraphUri();"> copy graph URI </span>' +
            '<span  class="popupMenuItem" onclick="Lineage_sources.menuActions.sourceMetaData();"> MetaData </span>';

        if (source !== "_defaultSource") {
            if (self.isSourceEditableForUser(source)) {
                html += '<span class="popupMenuItem" onclick="Lineage_sources.menuActions.editSource();">Edit</span>';
            }
            html += '<span class="popupMenuItem" onclick="Lineage_sources.menuActions.downloadGraph();">Download</span>';
        }
        PopupMenuWidget.initAndShow(html, "popupMenuWidgetDiv");
    };

    /**
     * Registers all imported sources of a given source.
     * @function
     * @name registerSourceImports
     * @memberof module:Lineage_sources
     * @param {string} sourceLabel - The label of the source whose imports should be registered.
     * @param {function} callback - Callback function executed after all imports are registered.
     * @returns {void}
     */
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
            callback,
        );
    };

    /**
     * Toggles the selection of all whiteboard sources, affecting UI highlighting and opacity settings.
     * @function
     * @name setAllWhiteBoardSources
     * @memberof module:Lineage_sources
     * @param {boolean} remove - If true, sets a flag to remove sources from the whiteboard.
     * @returns {void}
     */
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

    /**
     * Toggles the visibility of nodes belonging to a given source in the lineage graph.
     * @function
     * @name showHideCurrentSourceNodes
     * @memberof module:Lineage_sources
     * @param {string} source - The source whose nodes should be shown or hidden.
     * @param {boolean} hide - Whether to hide (true) or show (false) the nodes.
     * @returns {void}
     */
    self.showHideCurrentSourceNodes = function (source, hide) {
        if (!source) {
            source = Lineage_sources.activeSource;
        }

        var allNodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
        var newNodes = [];
        allNodes.forEach(function (node) {
            if (node && node.data && node.data.source == source) {
                newNodes.push({
                    id: node.id,
                    hidden: hide,
                });
            }
        });
        Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(newNodes);

        if (hide) {
            $("#Lineage_source_" + Lineage_sources.activeSource).addClass("lineage_hiddenSource");
        } else {
            $("#Lineage_source_" + Lineage_sources.activeSource).removeClass("lineage_hiddenSource");
        }
    };

    /**
     * Sets the current top-level ontology based on a source's imports.
     * @function
     * @name setTopLevelOntologyFromImports
     * @memberof module:Lineage_sources
     * @param {string} sourceLabel - The source label to check for imports.
     * @returns {string|null} The selected top-level ontology or null if none found.
     */
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

    /**
     * Sets the current top-level ontology based on a prefix.
     * @function
     * @name setTopLevelOntologyFromPrefix
     * @memberof module:Lineage_sources
     * @param {string} prefix - The prefix to search for in top-level ontologies.
     * @returns {string|null} The selected top-level ontology or null if none found.
     */
    self.setTopLevelOntologyFromPrefix = function (prefix) {
        Config.currentTopLevelOntology = null;
        for (var key in Config.topLevelOntologies) {
            if (Config.topLevelOntologies[key].prefix == prefix) {
                Config.currentTopLevelOntology = key;
            }
        }
        return Config.currentTopLevelOntology;
    };

    /**
     * Collection of menu actions for source management.
     * @namespace
     * @memberof module:Lineage_sources
     */
    self.menuActions = {
        /**
         * Sets the opacity of nodes and edges belonging to a source.
         * @function
         * @name setSourceOpacity
         * @memberof module:Lineage_sources.menuActions
         * @param {string} [source] - The source to modify. If not provided, uses the active source.
         * @returns {void}
         */
        setSourceOpacity: function (source) {
            if (!source) {
                source = Lineage_sources.activeSource;
            }
            var opacity = prompt("opacity %", 100);
            if (!opacity) {
                return;
            }
            if (opacity < 10) {
                opacity = 10;
            }
            opacity = opacity / 100;
            var nodesMapSources = {};
            var nodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
            var newNodes = [];
            nodes.forEach(function (node) {
                nodesMapSources[node.id] = node.data.source;
                if (node.data.source == source) {
                    newNodes.push({
                        id: node.id,
                        color: common.colorToRgba(node.color, opacity),
                        font: { color: common.colorToRgba(Lineage_whiteboard.defaultNodeFontColor, opacity) },
                    });
                }
            });
            Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(newNodes);

            var edges = Lineage_whiteboard.lineageVisjsGraph.data.edges.get();
            var newEdges = [];
            edges.forEach(function (edge) {
                if (nodesMapSources[edge.from] == source) {
                    newEdges.push({
                        id: edge.id,
                        color: common.colorToRgba(edge.color, opacity),
                        font: {
                            color: common.colorToRgba(Lineage_whiteboard.defaultEdgeFontColor, opacity),
                            multi: true,
                            size: 10,
                            strokeWidth: 0,
                            strokeColor: 0,
                            ital: true,
                        },
                    });
                }
            });
            Lineage_whiteboard.lineageVisjsGraph.data.edges.update(newEdges);
        },
        /**
         * Closes a source and removes its nodes from the graph.
         * @function
         * @name closeSource
         * @memberof module:Lineage_sources.menuActions
         * @param {string} [source] - The source to close. If not provided, uses the active source.
         * @returns {void}
         */
        closeSource: function (source) {
            if (source) {
                self.activeSource = source;
            }
            if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                var nodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
                var nodesToRemove = [];
                nodes.forEach(function (node) {
                    if (node.data && node.data.source == self.activeSource) {
                        nodesToRemove.push(node.id);
                    }
                });
                Lineage_whiteboard.lineageVisjsGraph.data.nodes.remove(nodesToRemove);
            }
            var sourceDivId = self.loadedSources[self.activeSource].sourceDivId;
            self.loadedSources[self.activeSource] = null;
            $("#" + sourceDivId).remove();
        },
        /**
         * Hides all nodes belonging to a source.
         * @function
         * @name hideSource
         * @memberof module:Lineage_sources.menuActions
         * @param {string} [source] - The source to hide. If not provided, uses the active source.
         * @returns {void}
         */
        hideSource: function (source) {
            if (!source) {
                source = Lineage_sources.activeSource;
            }
            PopupMenuWidget.hidePopup("popupMenuWidgetDiv");
            Lineage_sources.showHideCurrentSourceNodes(null, true);
        },
        /**
         * Shows all nodes belonging to a source.
         * @function
         * @name showSource
         * @memberof module:Lineage_sources.menuActions
         * @param {string} [source] - The source to show. If not provided, uses the active source.
         * @returns {void}
         */
        showSource: function (source) {
            if (!source) {
                source = Lineage_sources.activeSource;
            }
            PopupMenuWidget.hidePopup("popupMenuWidgetDiv");
            Lineage_sources.showHideCurrentSourceNodes(null, false);
        },
        /**
         * Groups all nodes of a source under a single parent node.
         * @function
         * @name groupSource
         * @memberof module:Lineage_sources.menuActions
         * @param {string} [source] - The source to group. If not provided, uses the active source.
         * @returns {void}
         */
        groupSource: function (source) {
            PopupMenuWidget.hidePopup("popupMenuWidgetDiv");

            if (!source) {
                source = Lineage_sources.activeSource;
            }
            var color = Lineage_whiteboard.getSourceColor(source);
            var color2 = common.colorToRgba(color, 0.6);
            var visjsData = { nodes: [], edges: [] };
            var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();

            for (var nodeId in existingNodes) {
                var node = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get(nodeId);
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
                    shadow: Lineage_whiteboard.nodeShadow,
                    shape: "ellipse",
                    level: 1,
                    size: Lineage_whiteboard.defaultShapeSize,
                    data: { source: source },
                    color: common.colorToRgba(color, 0.5),
                };
                visjsData.nodes.push(sourceNode);
            }
            Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(visjsData.nodes);
            Lineage_whiteboard.lineageVisjsGraph.data.edges.update(visjsData.edges);
        },
        /**
         * Removes the grouping of nodes for a source.
         * @function
         * @name ungroupSource
         * @memberof module:Lineage_sources.menuActions
         * @param {string} [source] - The source to ungroup. If not provided, uses the active source.
         * @returns {void}
         */
        ungroupSource: function (source) {
            if (!source) {
                source = Lineage_sources.activeSource;
            }
            PopupMenuWidget.hidePopup("popupMenuWidgetDiv");
            if (!source) {
                source = Lineage_sources.activeSource;
            }
            Lineage_whiteboard.lineageVisjsGraph.data.nodes.remove(source);
        },
        /**
         * Copies the graph URI of a source to the clipboard.
         * @function
         * @name copyGraphUri
         * @memberof module:Lineage_sources.menuActions
         * @param {string} [source] - The source whose URI to copy. If not provided, uses the active source.
         * @returns {void}
         */
        copyGraphUri: function (source) {
            if (!source) {
                source = Lineage_sources.activeSource;
            }
            var graphUri = Config.sources[source].graphUri;
            common.copyTextToClipboard(graphUri);
        },
        /**
         * Exports a source to OWL format.
         * @function
         * @name exportOWL
         * @memberof module:Lineage_sources.menuActions
         * @param {string} [source] - The source to export. If not provided, uses the active source.
         * @returns {void}
         */
        exportOWL: function (source) {
            if (!source) {
                source = Lineage_sources.activeSource;
            }
            Sparql_OWL.generateOWL(source, {}, function (err, result) {
                if (err) {
                    return console.log(err);
                }
            });
        },
        /**
         * Opens the source editing dialog.
         * @function
         * @name editSource
         * @memberof module:Lineage_sources.menuActions
         * @returns {void}
         */
        editSource: function () {
            window.EditSourceDialog.open(Lineage_sources.activeSource);
        },
        /**
         * Opens the graph download modal.
         * @function
         * @name downloadGraph
         * @memberof module:Lineage_sources.menuActions
         * @returns {void}
         */
        downloadGraph: function () {
            window.DownloadGraphModal.open(Lineage_sources.activeSource);
        },
        /**
         * Opens the graph download modal.
         * @function
         * @name downloadGraph
         * @memberof module:Lineage_sources.menuActions
         * @returns {void}
         */
        sourceMetaData: function () {
            window.MetaDataDialog.open(Lineage_sources.activeSource);
        },
    };

    /**
     * Checks if a source is owned by the current user.
     * @function
     * @name isSourceOwnedByUser
     * @memberof module:Lineage_sources
     * @param {string} sourceName - The name of the source to check.
     * @returns {boolean} True if the source is owned by the current user, false otherwise.
     */
    self.isSourceOwnedByUser = function (sourceName) {
        const source = Config.sources[sourceName];
        if (!source) {
            return false;
        }

        if (authentication.currentUser.login == source.owner) {
            return true;
        }

        return false;
    };

    /**
     * Checks if a source is editable by the current user based on access control settings.
     * @function
     * @name isSourceEditableForUser
     * @memberof module:Lineage_sources
     * @param {string} source - The source to check.
     * @returns {boolean} True if the source is editable by the current user, false otherwise.
     */
    self.isSourceEditableForUser = function (source) {
        if (!Config.sources[source]) {
            return false; // console.log("no source " + source);
        }
        if (!Config.sources[source].editable) {
            return false;
        }

        const groups = authentication.currentUser.groupes;
        if (groups.indexOf("admin") > -1) {
            return true;
        }
        if (Config.sources[source].accessControl == "readwrite") {
            return true;
        }

        // used ???
        const currentAccessControls = groups.map((group) => {
            const defaultAccessControl = Config.profiles[group].defaultSourceAccessControl;
            const sourcesAccessControl = Config.profiles[group].sourcesAccessControl;
            return sourcesAccessControl.hasOwnProperty(source) ? sourcesAccessControl[source] : defaultAccessControl;
        });
    };

    /**
     * Clears all nodes belonging to a source from the graph.
     * @function
     * @name clearSource
     * @memberof module:Lineage_sources
     * @param {string} [source] - The source to clear. If not provided, uses the active source.
     * @returns {void}
     */
    self.clearSource = function (source) {
        if (!source) {
            source = self.activeSource;
        }
        if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty && Lineage_whiteboard.lineageVisjsGraph.data) {
            var nodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
            var newNodes = [];
            nodes.forEach(function (node) {
                if (node.data && node.data.source == source) {
                    newNodes.push({ id: node.id });
                }
            });
            Lineage_whiteboard.lineageVisjsGraph.data.nodes.remove(newNodes);
        }
    };

    /**
     * Sets the theme for the lineage graph, affecting background and text colors.
     * @function
     * @name setTheme
     * @memberof module:Lineage_sources
     * @param {string} theme - The theme to apply ("white" or other).
     * @returns {void}
     */
    self.setTheme = function (theme) {
        var backgroundColor;

        if (theme == "white") {
            backgroundColor = "white";
            Lineage_whiteboard.defaultNodeFontColor = "#343434";
            Lineage_whiteboard.defaultEdgeFontColor = "#343434";
        } else if (theme == "dark") {
            backgroundColor = "#414040FF";
            Lineage_whiteboard.defaultNodeFontColor = "#eee";
            Lineage_whiteboard.defaultEdgeFontColor = "#eee";
        }

        $("#graphDiv").css("background-color", backgroundColor);
        if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty && Lineage_whiteboard.lineageVisjsGraph.data && Lineage_whiteboard.lineageVisjsGraph.data.nodes.get) {
            /* Lineage_whiteboard.lineageVisjsGraph.network.options.nodes.font = { color: Lineage_whiteboard.defaultNodeFontColor };
Lineage_whiteboard.lineageVisjsGraph.network.options.edges.font = { color: self.defaultEdgeFontColor };*/

            var nodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
            var newNodes = [];
            nodes.forEach(function (node) {
                newNodes.push({ id: node.id, font: { color: Lineage_whiteboard.defaultNodeFontColor } });
            });
            Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(newNodes);
            var edges = Lineage_whiteboard.lineageVisjsGraph.data.edges.get();
            var newEdges = [];
            edges.forEach(function (edge) {
                newEdges.push({ id: edge.id, font: { color: Lineage_whiteboard.defaultEdgeFontColor } });
            });
            Lineage_whiteboard.lineageVisjsGraph.data.edges.update(newEdges);
        }
    };
    self.getSourcesClasses = function (source, callback) {
        Sparql_OWL.getDictionary(
            self.activeSource,
            {
                selectGraph: true,
                lang: Config.default_lang,
                type: "owl:Class",
            },
            null,
            function (err, result) {
                if (err) {
                    callback(err);
                }

                var sourceObjects = [];
                var TopLevelOntologyObjects = [];
                result.forEach(function (item) {
                    if (item.label) {
                        var prefix = "";
                        if (item.g && Config.currentTopLevelOntology && item.g.value.indexOf(Config.topLevelOntologies[Config.currentTopLevelOntology].uriPattern) > -1) {
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
            },
        );
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

        var nodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
        var edges = Lineage_whiteboard.lineageVisjsGraph.data.edges.get();
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
                    })),
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
