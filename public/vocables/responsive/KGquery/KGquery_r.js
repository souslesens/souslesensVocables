import KGquery from "../../modules/tools/KGquery/KGquery.js";
import KGquery_graph from "../../modules/tools/KGquery/KGquery_graph.js";
import SavedQueriesComponent from "../../modules/uiComponents/savedQueriesComponent.js";
import Lineage_r from "../lineage/lineage_r.js";
import ResponsiveUI from "../responsiveUI.js";
import KGquery_controlPanel from "../../modules/tools/KGquery/KGquery_controlPanel.js";
import KGquery_controlPanelResponsive from "./KGquery_controlPanelResponsive.js";
import VisjsGraphClass from "../../modules/graph/VisjsGraphClass.js";

var KGquery_r = (function () {
    var self = {};
    //changed files and functions
    self.oldshowHideEditButtons = Lineage_sources.showHideEditButtons;
    self.oldshowDialog = SavedQueriesComponent.showDialog;
    self.oldKGquery_controlPanel = window.KGquery_controlPanel;
    self.init = function () {
        Lineage_sources.showHideEditButtons = self.showHideEditButtons;
        SavedQueriesComponent.showDialog = self.SavedQueriesComponentShowDialogResponsive;
        ResponsiveUI.replaceFile(KGquery_controlPanel, KGquery_controlPanelResponsive);
        ResponsiveUI.initMenuBar(self.loadSource);
        $("#messageDiv").attr("id", "KGquery_messageDiv");
        $("#waitImg").attr("id", "KGquery_waitImg");
    };
    self.quit = function () {
        //retribute old file and functions
        Lineage_sources.showHideEditButtons = self.oldshowHideEditButtons;
        SavedQueriesComponent.showDialog = self.oldshowDialog;
        window.KGquery_controlPanel = self.oldKGquery_controlPanel;
        Lineage_sources.registerSource = ResponsiveUI.oldRegisterSource;
        //reapply changed DOM

        $("#KGquery_messageDiv").attr("id", "messageDiv");
        $("#KGquery_waitImg").attr("id", "waitImg");
        $("#graphDiv").empty();
        $("#lateralPanelDiv").empty();
    };
    self.loadSource = function () {
        KGquery.currentSource = ResponsiveUI.source;
        Lineage_sources.loadSources(MainController.currentSource, function (err) {
            if (err) {
                return alert(err.responseText);
            }
            $("#graphDiv").load("./modules/tools/KGquery/html/KGquery_centralPanel.html", function () {
                $("#lateralPanelDiv").load("./responsive/KGquery/html/index.html", function () {
                    KGquery_graph.drawVisjsModel("saved");
                    ResponsiveUI.openTab("lineage-tab", "tabs_Query", KGquery_r.initQuery, "#QueryTabButton");
                });
            });
        });
    };
    self.showHideEditButtons = function (source, hide) {
        $("#Lineage_graphEditionButtons").hide();
        if (!Lineage_whiteboard.lineageVisjsGraph.network) {
            return;
        }

        Lineage_whiteboard.lineageVisjsGraph.network.disableEditMode();
        $(".vis-edit-mode").css("display", "none");
    };
    self.initMyQuery = function () {
        SavedQueriesComponent.showDialog("STORED_KGQUERY_QUERIES", "tabs_myQueries", KGquery.currentSource, null, KGquery_myQueries.save, KGquery_myQueries.load);
    };
    self.initQuery = function () {
        $("#tabs_Query").load("./responsive/KGquery/html/KgqueryQueryTab.html", function () {
            KGquery.addQuerySet();
        });
    };
    self.initGraph = function () {
        $("#tabs_Graph").load("./responsive/KGquery/html/KgqueryGraphTab.html", function () {
            KGquery_graph.init();
            KGquery_graph.drawVisjsModel("saved");
        });
    };
    self.SavedQueriesComponentShowDialogResponsive = function (CRUDsource, targetDiv, slsvSource, scope, saveQueryFn, loadQueryFn) {
        SavedQueriesComponent.init(CRUDsource);
        SavedQueriesComponent.saveQueryFn = saveQueryFn;
        SavedQueriesComponent.loadQueryFn = loadQueryFn;
        SavedQueriesComponent.slsvSource = slsvSource;
        if (targetDiv.indexOf("Dialog") > -1) {
            $("#" + targetDiv).dialog("open");
        }
        $("#" + targetDiv).load("./responsive/widget/html/savedQueriesWidgetResponsive.html", function () {
            if (slsvSource) {
                SavedQueriesComponent.list(CRUDsource, slsvSource, scope);
            }
        });
    };
    return self;
})();
export default KGquery_r;
window.KGquery_r = KGquery_r;
