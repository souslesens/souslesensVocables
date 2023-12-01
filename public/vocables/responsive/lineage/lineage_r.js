import Lineage_whiteboard from "../../modules/tools/lineage/lineage_whiteboard.js";
import Lineage_sources from "../../modules/tools/lineage/lineage_sources.js";
import ResponsiveUI from "../responsiveUI.js";
import NodesInfosWidget from "../../modules/uiWidgets/nodeInfosWidget.js";

var Lineage_r = (function () {
    var self = {};
    self.isResponsiveLoading = false;
    self.oldWhiteboardGraphActions = {};
    self.oldNodeInfosInit = null;
    self.oldAddEdgeDialog = null;
    self.init = function () {
        //Nodes Infos overcharge
        self.oldNodeInfosInit = NodesInfosWidget.initDialog;
        NodesInfosWidget.initDialog = self.NodesInfosResponsiveDialog;
        //SHowHideButtons overcharge
        Lineage_sources.showHideEditButtons = self.showHideEditButtons;
        //AddEdge overcharge
        self.oldAddEdgeDialog = Lineage_blend.graphModification.showAddEdgeFromGraphDialog;
        Lineage_blend.graphModification.showAddEdgeFromGraphDialog = self.responsiveAddEdgeDialog;
        //Loading
        $("#index_topContolPanel").load("./responsive/lineage/html/topMenu.html", function () {
            self.loadSources();
        });
    };
    self.loadSources = function () {
        Lineage_sources.loadSources(MainController.currentSource, function (err) {
            if (err) {
                return alert(err.responseText);
            }
            $("#lateralPanelDiv").load("./responsive/lineage/html/index.html", function () {
                self.initWhiteboardTab();
            });

            Lineage_r.showHideEditButtons(Lineage_sources.activeSource);
        });
    };
    self.initWhiteboardTab = function () {
        $("#tabs_whiteboard").load("./responsive/lineage/html/whiteboadPanel.html", function (s) {});
    };

    self.initClassesTab = function () {
        $("#tabs_classes").load("./responsive/lineage/html/classesPanel.html", function (s) {
            SearchWidget.targetDiv = "LineageNodesJsTreeDiv";
            $("#GenericTools_searchAllDiv").load("./snippets/searchAll.html", function () {
                $("#GenericTools_searchInAllSources").prop("checked", false);
            });
        });
    };
    self.initPropertiesTab = function () {
        $("#tabs_properties").load("./responsive/lineage/html/propertiesPanel.html", function (s) {});
    };
    self.initContainersTab = function () {
        $("#tabs_containers").load("./responsive/lineage/html/containersPanel.html", function (s) {});
    };

    self.showHideEditButtons = function (source, hide) {
        if (!Lineage_whiteboard.lineageVisjsGraph.network) {
            return;
        }

        Lineage_whiteboard.lineageVisjsGraph.network.disableEditMode();
        $(".vis-edit-mode").css("display", "none");

        var isNodeEditable = Lineage_sources.isSourceEditableForUser(source);
        if (isNodeEditable) {
            $("#lineage_r_addPanel").css("display", "block");
        } else {
            $("#lineage_r_addPanel").css("display", "none");
        }
    };
    self.addNode = function () {
        ResponsiveUI.openDialogDiv("LineagePopup");
        Lineage_blend.graphModification.showAddNodeGraphDialog(function (err, result) {
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

    return self;
})();
export default Lineage_r;
window.Lineage_r = Lineage_r;
