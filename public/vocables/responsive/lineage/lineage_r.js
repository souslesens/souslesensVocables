import Lineage_whiteboard from "../../modules/tools/lineage/lineage_whiteboard.js";
import Lineage_sources from "../../modules/tools/lineage/lineage_sources.js";
import ResponsiveUI from "../responsiveUI.js";
import NodesInfosWidget from "../../modules/uiWidgets/nodeInfosWidget.js";
import SearchWidget from "../../modules/uiWidgets/searchWidget.js";

import PredicatesSelectorWidget from "../../modules/uiWidgets/predicatesSelectorWidget.js";
import Lineage_createResource from "../../modules/tools/lineage/lineage_createResource.js";
import PopupMenuWidget from "../../modules/uiWidgets/popupMenuWidget.js";

var Lineage_r = (function () {
    var self = {};
    self.isResponsiveLoading = false;
    self.oldWhiteboardGraphActions = {};
    self.oldNodeInfosInit = null;
    self.oldAddEdgeDialog = null;
    self.oldExportTable = null;
    self.MoreActionsShow = false;
    self.MoreOptionsShow = true;
    self.onLoaded = function () {
        PredicatesSelectorWidget.load = self.loadPredicateSelectorWidgetResponsive;
        SearchWidget.currentTargetDiv = "LineageNodesJsTreeDiv";
        //To Table
        self.oldExportTable = Export.exportTreeToDataTable;
        Export.exportTreeToDataTable = self.ExportTableDialog;
        //Nodes Infos overcharge
        //ResponsiveUI.replaceFile(NodesInfosWidget, NodeInfosWidgetResponsive);
        //SHowHideButtons overcharge
        Lineage_sources.showHideEditButtons = self.showHideEditButtons;
        //AddEdge overcharge
        self.oldAddEdgeDialog = Lineage_blend.graphModification.showAddEdgeFromGraphDialog;
        Lineage_blend.graphModification.showAddEdgeFromGraphDialog = self.responsiveAddEdgeDialog;
        ResponsiveUI.initMenuBar(self.loadSources);
        $("#Lineage_graphEditionButtons").load("./responsive/lineage/html/AddNodeEdgeButtons.html");
        $("KGquery_messageDiv").attr("id", "messageDiv");
        $("KGquery_waitImg").attr("id", "waitImg");
    };
    self.quit = function () {
        $("#graphDiv").empty();
    };
    self.loadSources = function () {
        Lineage_sources.loadSources(MainController.currentSource, function (err) {
            if (err) {
                return alert(err.responseText);
            }
            $("#lateralPanelDiv").load("./responsive/lineage/html/index.html", function () {
                self.initWhiteboardTab();
                Lineage_whiteboard.initUI();
            });
        });
    };
    self.loadPredicateSelectorWidgetResponsive = function (divId, source, options, configureFn, callback) {
        PredicatesSelectorWidget.options = options || {};
        $("#" + divId).html("");
        $("#" + divId).load("./responsive/widget/html/predicatesSelectorWidgetDialogResponsive.html", function (a, b, c) {
            var x = a + b + c;
            PredicatesSelectorWidget.init(source, configureFn, function (err, result) {
                if (callback) {
                    return callback();
                }
            });
        });
    };
    self.initWhiteboardTab = function () {
        $("#tabs_whiteboard").load("./responsive/lineage/html/whiteboadPanel.html", function (s) {
            $("#WhiteboardTabButton").addClass("slsv-tabButtonSelected");
            $("#WhiteboardTabButton").parent().addClass("slsv-selectedTabDiv");
            Lineage_r.showHideEditButtons(Lineage_sources.activeSource);
            self.hideShowMoreActions("hide");
            ResponsiveUI.PopUpOnHoverButtons();
            $("#lateralPanelDiv").resizable({
                maxWidth: 495,
                minWidth: 150,
                stop: function (event, ui) {
                    ResponsiveUI.resetWindowHeight();
                },
            });
        });
    };

    self.initClassesTab = function () {
        $("#tabs_classes").load("./responsive/lineage/html/classesPanel.html", function (s) {
            SearchWidget.targetDiv = "LineageNodesJsTreeDiv";
            $("#GenericTools_searchAllDiv").load("./snippets/searchAllResponsive.html", function () {
                SearchWidget.init();
                $("#GenericTools_searchInAllSources").prop("checked", false);
                $("#Lineage_MoreClassesOptions").hide();
                SearchWidget.showTopConcepts();
            });
        });
    };
    self.initPropertiesTab = function () {
        $("#tabs_properties").load("./responsive/lineage/html/propertiesPanel.html", function (s) {
            Lineage_r.hideShowMoreOptions("hide", "Lineage_MorePropertiesOptions");
            Lineage_properties.searchTermInSources();
        });
    };
    self.initContainersTab = function () {
        $("#tabs_containers").load("./responsive/lineage/html/containersPanel.html", function (s) {
            Lineage_containers.search();
        });
    };

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
        self.resetCurrentTab();
    };
    self.resetCurrentTab = function () {
        var currentTab = $(".slsv-tabButtonSelected").html();
        if (currentTab == "Classes") {
            SearchWidget.showTopConcepts();
        }
        if (currentTab == "Properties") {
            Lineage_properties.searchTermInSources();
        }
        if (currentTab == "Containers") {
            Lineage_containers.search();
        }
    };
    self.addNode = function () {
        ResponsiveUI.openDialogDiv("LineagePopup");
        Lineage_createResource.showAddNodeGraphDialog(function (err, result) {
            if (err) {
                return callback(err.responseText);
            }
            return null;
        });
    };
    self.addEdge = function () {
        Lineage_whiteboard.lineageVisjsGraph.network.addEdgeMode();
    };
    self.showQueryDialog = function () {
        //ResponsiveUI.openMainDialogDivForDialogs();
        $("#mainDialogDiv").parent().css("top", "10%");
        $("#mainDialogDiv").parent().css("left", "20%");
        $("#mainDialogDiv")
            .parent()
            .show("fast", function () {
                Lineage_relations.showDrawRelationsDialog();
            });
    };
    self.showPathesDialog = function () {
        //ResponsiveUI.openMainDialogDivForDialogs();

        $("#mainDialogDiv")
            .parent()
            .show("fast", function () {
                Lineage_graphTraversal.showShortestPathDialog();
            });
    };

    self.NodesInfosResponsiveDialog = function (sourceLabel, divId, options, callback) {
        ResponsiveUI.openDialogDiv(divId);
        $("#mainDialogDiv").parent().css("top", "5%");
        $("#mainDialogDiv").parent().css("left", "35%");
        $("#" + divId)
            .parent()
            .show("fast", function () {
                self.oldNodeInfosInit(sourceLabel, divId, options, callback);
            });
    };
    self.responsiveAddEdgeDialog = function (edgeData, callback) {
        ResponsiveUI.openDialogDiv("LineagePopup");
        $("#LineagePopup")
            .parent()
            .show("fast", function () {
                self.oldAddEdgeDialog(edgeData, function () {
                    callback();
                    self.showHideEditButtons(Lineage_sources.activeSource);
                });
            });
    };
    self.ExportTableDialog = function (jstreeDiv, nodeId) {
        $("#mainDialogDiv")
            .parent()
            .show("fast", function () {
                self.oldExportTable(jstreeDiv, nodeId);
            });
    };
    self.hideShowMoreActions = function (hideShowParameter) {
        if (hideShowParameter == "hide") {
            self.MoreActionsShow = true;
        }
        if (hideShowParameter == "show") {
            self.MoreActionsShow = false;
        }
        if (!self.MoreActionsShow) {
            $("#Lineage_MoreActionsButtons").show();
            self.MoreActionsShow = true;
            $("#Lineage_MoreActionsDiv").removeClass("TitleBoxLine");
        } else {
            $("#Lineage_MoreActionsButtons").hide();
            self.MoreActionsShow = false;
            $("#Lineage_MoreActionsDiv").addClass("TitleBoxLine");
        }
    };
    self.hideShowMoreOptions = function (hideShowParameter, divId) {
        if (hideShowParameter == "hide") {
            self.MoreOptionsShow = false;
        }
        if (hideShowParameter == "show") {
            self.MoreOptionsShow = true;
        }
        if (self.MoreOptionsShow) {
            $("#" + divId).show();
            self.MoreOptionsShow = false;
        } else {
            $("#" + divId).hide();
            self.MoreOptionsShow = true;
        }
    };
    self.changeIconForPropertiesGraphAction = function (div) {
        var icon = $(div).children().attr("class");
        if (icon == "allPropertyIcon slsv-invisible-button" || icon == "slsv-invisible-button allPropertyIcon") {
            $(div).children().removeClass("allPropertyIcon");
            $(div).children().addClass("currentPropertyIcon");
        } else {
            $(div).children().removeClass("currentPropertyIcon");
            $(div).children().addClass("allPropertyIcon");
        }
    };
    self.checkbox_Lineage_containers = function () {
        if ($("#LineageProperties_searchInAllSources")[0].checked) {
            $("#LineageProperties_searchInAllSources").val("current");
        } else {
            $("#LineageProperties_searchInAllSources").val("all");
        }
    };

    //less.modifyVars({'@button1-color': '#000'})

    return self;
})();
export default Lineage_r;
window.Lineage_r = Lineage_r;
