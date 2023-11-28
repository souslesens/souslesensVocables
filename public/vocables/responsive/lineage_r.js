import Lineage_whiteboard from "../modules/tools/lineage/lineage_whiteboard.js";
import Lineage_sources from "../modules/tools/lineage/lineage_sources.js";
import ResponsiveUI from "./responsiveUI.js";
var Lineage_r = (function () {
    var self = {};

    self.init = function () {
        Lineage_sources.loadSources(MainController.currentSource);

        $("#lateralPanelDiv").load("./responsive/html/lineage/controlPanel.html", function (s) {
            ResponsiveUI.openTab("lineage-tab", "tabs_Whiteboard");
            var controller = Config.tools[MainController.currentTool].controller;
        });
        $("#index_topContolPanel").load("./responsive/html/lineage/topMenu.html", function () {
            Lineage_r.showHideEditButtons(Lineage_sources.activeSource);
        });
        return;
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
