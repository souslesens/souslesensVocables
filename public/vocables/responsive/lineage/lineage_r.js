import Lineage_whiteboard from "../../modules/tools/lineage/lineage_whiteboard.js";
import Lineage_sources from "../../modules/tools/lineage/lineage_sources.js";
import ResponsiveUI from "../responsiveUI.js";

var Lineage_r = (function () {
    var self = {};
    self.isResponsiveLoading = false;
    self.init = function () {
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
        Lineage_blend.graphModification.showAddNodeGraphDialog(function (err, result) {
            if (err) {
                return callback(err.responseText);
            }
            return null;
        });
    };
    self.addEdge = function () {};
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
    return self;
})();
export default Lineage_r;
window.Lineage_r = Lineage_r;
