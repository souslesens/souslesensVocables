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
            //  controller.onLoaded(function (err, result) {
            Lineage_r.showHideEditButtons(Lineage_sources.activeSource);

            var actionDivHtml =
                ' <div className="lineage_actionDiv">\n' +
                '                        <div id="lineage_drawnSources" className="Lineage_objectDivContainer"  style="display:flex;flex-direction: row">\n' +
                '                            <div className="lineage_actionDiv_title">\n' +
                "                                <span>Sources</span>\n" +
                '                                <button class="slsv-button" onClick="Lineage_sources.resetAll(true)">R</button>\n' +
                '                                <button class="slsv-button" onClick="Lineage_sources.showSourcesDialog(true)">+</button>\n' +
                '                                <button class="slsv-button" id="Lineage_sources.setAllWhiteBoardSources"\n' +
                '                                        onClick="Lineage_sources.setAllWhiteBoardSources()">A\n' +
                "                                </button>\n" +
                "                            </div>\n" +
                "                        </div>\n" +
                "                    </div>";

            $("#index_topContolPanel").html(actionDivHtml);

            /*  if (callback) {
          callback(err, result);
        }
      });*/
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
