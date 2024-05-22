import KGquery from "../../modules/tools/KGquery/KGquery.js";
import KGquery_graph from "../../modules/tools/KGquery/KGquery_graph.js";
import SavedQueriesWidget from "../../modules/uiWidgets/savedQueriesWidget.js";
import ResponsiveUI from "../responsiveUI.js";
import KGquery_myQueries from "../../modules/tools/KGquery/KGquery_myQueries.js";

var KGquery_r = (function () {
    var self = {};
    //changed files and functions

    self.onLoaded = function () {
        Lineage_sources.showHideEditButtons = self.showHideEditButtons;
        SavedQueriesWidget.showDialog = self.SavedQueriesComponentShowDialogResponsive;
        //ResponsiveUI.replaceFile(KGquery_controlPanel, KGquery_controlPanelResponsive);
        ResponsiveUI.initMenuBar(self.loadSource);
        KGquery.clearAll()
        if (Config.clientCache.KGquery) {
            KGquery_myQueries.load(null, Config.clientCache.KGquery);
        }
        $("#messageDiv").attr("id", "KGquery_messageDiv");
        $("#waitImg").attr("id", "KGquery_waitImg");
    };
    self.unload = function () {
        self.oldshowHideEditButtons = Lineage_sources.showHideEditButtons;
        self.oldshowDialog = SavedQueriesWidget.showDialog;
        self.oldKGquery_controlPanel = window.KGquery_controlPanel;
        Lineage_sources.showHideEditButtons = self.oldshowHideEditButtons;
        SavedQueriesWidget.showDialog = self.oldshowDialog;
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
                    ResponsiveUI.resetWindowHeight();
                    KGquery.clearAll()
                    if (Config.clientCache.KGquery) {
                        setTimeout(function () {
                            KGquery_myQueries.load(null, Config.clientCache.KGquery);
                        }, 1000);
                    }
                    $("#KGquery_dataTableDialogDiv").dialog({
                        autoOpen: false,
                        close: function (event, ui) {
                            window.scrollTo(0, 0);
                        },
                        drag: function (event, ui) {
                            $("#KGquery_dataTableDialogDiv").parent().css("transform", "unset");
                        },
                        open(event, ui) {
                            $("#KGquery_dataTableDialogDiv").parent().css("transform", "translate(-50%,-50%)");
                            $("#KGquery_dataTableDialogDiv").parent().css("top", "50%");
                            $("#KGquery_dataTableDialogDiv").parent().css("left", "50%");
                        },
                    });
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
        SavedQueriesWidget.showDialog("STORED_KGQUERY_QUERIES", "tabs_myQueries", KGquery.currentSource, null, KGquery_myQueries.save, KGquery_myQueries.load);
    };
    self.initQuery = function () {
        if ($("#tabs_Query").children().length == 0) {
            $("#tabs_Query").load("./responsive/KGquery/html/KGqueryQueryTab.html", function () {
              //  KGquery.addQuerySet();
            });
        }
    };
    self.initGraph = function () {
        if ($("#tabs_Graph").children().length == 0) {
            $("#tabs_Graph").load("./responsive/KGquery/html/KGqueryGraphTab.html", function () {
                KGquery_graph.init();
                //  KGquery_graph.drawVisjsModel("saved");
            });
        }
    };
    self.SavedQueriesComponentShowDialogResponsive = function (CRUDsource, targetDiv, slsvSource, scope, saveQueryFn, loadQueryFn) {
        SavedQueriesWidget.init(CRUDsource);
        SavedQueriesWidget.saveQueryFn = saveQueryFn;
        SavedQueriesWidget.loadQueryFn = loadQueryFn;
        SavedQueriesWidget.slsvSource = slsvSource;
        if (targetDiv.indexOf("Dialog") > -1) {
            $("#" + targetDiv).dialog("open");
        }
        $("#" + targetDiv).load("./responsive/widget/html/savedQueriesWidgetResponsive.html", function () {
            if (slsvSource) {
                SavedQueriesWidget.list(CRUDsource, slsvSource, scope);
            }
        });
    };
    return self;
})();
export default KGquery_r;
window.KGquery_r = KGquery_r;
