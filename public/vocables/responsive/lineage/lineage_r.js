import Lineage_whiteboard from "../../modules/tools/lineage/lineage_whiteboard.js";
import Lineage_sources from "../../modules/tools/lineage/lineage_sources.js";
import ResponsiveUI from "../responsiveUI.js";

var Lineage_r = (function () {
    var self = {};

    self.init = function () {
        $("#index_topContolPanel").load("./responsive/lineage/html/topMenu.html", function () {
            Lineage_sources.loadSources(MainController.currentSource, function (err) {
                if (err) {
                    return alert(err.responseText);
                }
                $("#lateralPanelDiv").load("./responsive/lineage/html/index.html", function () {
                    self.initWhiteboardTab();
                });

                Lineage_r.showHideEditButtons(Lineage_sources.activeSource);
            });
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
            $("#lineage_r_addPanel").css("display", "none");
        } else {
            $("#lineage_r_addPanel").css("display", "block");
        }
    };
    return self;
})();
export default Lineage_r;
window.Lineage_r = Lineage_r;
