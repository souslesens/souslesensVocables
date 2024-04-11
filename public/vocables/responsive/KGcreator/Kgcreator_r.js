import KGcreator from "../../modules/tools/KGcreator/KGcreator.js";
import KGcreator_mappings from "../../modules/tools/KGcreator/KGcreator_mappings.js";
import KGcreator_run from "../../modules/tools/KGcreator/KGcreator_run.js";
import ResponsiveUI from "../../responsive/responsiveUI.js";
import NodesInfosWidget from "../../modules/uiWidgets/nodeInfosWidget.js";
import PredicatesSelectorWidget from "../../modules/uiWidgets/predicatesSelectorWidget.js";
import SavedQueriesWidget from "../../modules/uiWidgets/savedQueriesWidget.js";

var KGcreator_r = (function () {
    var self = {};
    //changed files and functions
    self.oldshowHideEditButtons = Lineage_sources.showHideEditButtons;
    self.oldshowDialog = SavedQueriesWidget.showDialog;
    self.currentTab = "";

    //self.oldshowMappingDialog=KGcreator_mappings.showMappingDialog;
    self.onLoaded = function () {
        self.currentTab = "";
        
        ResponsiveUI.initMenuBar(self.loadSource);
        //ResponsiveUI.replaceFile(NodesInfosWidget, NodeInfosWidgetResponsive);
        $("#Lineage_graphEditionButtons").show();
        $("#Lineage_graphEditionButtons").empty();
        $("#Lineage_graphEditionButtons").attr("id", "KGcreator_topButtons");
        //KGcreator_mappings.showMappingDialog=self.showMappingDialogResponsive;
    };
    self.unload = function () {
        self.currentTab = "";
        Lineage_sources.registerSource = ResponsiveUI.oldRegisterSource;
        $("#KGcreator_topButtons").css("flex-direction", "row");
        $("#KGcreator_topButtons").attr("id", "Lineage_graphEditionButtons");
        $("#MenuBar").css("height", "90px");
        $("#KGcreator_topButtons").css("flex-direction", "row");
        $("#Lineage_graphEditionButtons").empty();
        $("#MenuBarFooter").css("display", "block");
    };
    self.loadSource = function () {
        Lineage_sources.loadSources(MainController.currentSource, function (err) {
            if (err) {
                return alert(err.responseText);
            }
            $("#graphDiv").load("./modules/tools/KGcreator/html/centralPanel.html", function () {
                $("#lateralPanelDiv").load("./modules/tools/KGcreator/html/KGcreator_leftPannel.html", function () {
                    KGcreator.currentSlsvSource = ResponsiveUI.source;
                    ResponsiveUI.openTab("KGcreator-tab", "KGcreator_treeWrapper", KGcreator_r.initMapTab, "#KGcreator_MapTabButton");
                    KGcreator.initSource();
                    ResponsiveUI.resetWindowHeight();
                    $("#KGcreator_dialogDiv").dialog({
                        autoOpen: false,
                        close: function (event, ui) {
                            window.scrollTo(0, 0);
                        },
                        drag: function (event, ui) {
                            $("#KGcreator_dialogDiv").parent().css("transform", "unset");
                        },
                        open(event, ui) {
                            $("#KGcreator_dialogDiv").parent().css("transform", "translate(-50%,-50%)");
                            $("#KGcreator_dialogDiv").parent().css("top", "50%");
                            $("#KGcreator_dialogDiv").parent().css("left", "50%");
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
    self.initRunTab = function () {
        if (self.currentTab != "Run") {
            self.currentTab = "Run";
            $("#KGcreator_centralPanelTabs").load("./modules/tools/KGcreator/html/KGcreator_runTab.html", function () {
                $("#KGcreator_topButtons").load("./modules/tools/KGcreator/html/KGcreator_topButtons.html", function () {
                    /*$("#KGcreator_topButtons").css("padding", "4px");
                    $("#MenuBar").css("height", "");
                    $("#MenuBarFooter").css("display", "flex");
                    $("#KGcreator_topButtons").css("flex-direction", "column");*/
                    if (KGcreator.currentTreeNode) {
                        //KGcreator_run.createTriples(true);
                        KGcreator_run.getTableAndShowMappings();
                    }
                    ResponsiveUI.PopUpOnHoverButtons();
                    self.ResetRunMappingTabWidth();
                    $("#KGcreator_centralPanelTabs").redraw();
                });
            });
        }
    };
    self.initMapTab = function () {
        if (self.currentTab != "Map") {
            self.currentTab = "Map";
            $("#KGcreator_centralPanelTabs").load("./modules/tools/KGcreator/html/KGcreator_mapTab.html", function () {
                $("#KGcreator_topButtons").load("./modules/tools/KGcreator/html/KGcreator_topButtons.html", function () {
                    if (KGcreator.currentTreeNode != undefined) {
                        $(document.getElementById(KGcreator.currentTreeNode.id + "_anchor")).click();
                    }
                });
            });
        }
    };
    self.ResetRunMappingTabWidth = function () {
        var LateralPannelWidth = $("#lateralPanelDiv").width();
        var KGcreator_runTabDivWidth = $(window).width() - LateralPannelWidth;
        var KGcreator_GraphEditorWidth = KGcreator_runTabDivWidth / 2 - 5;

        $("#KGcreator_run_mappingsGraphEditorContainer").css("width", KGcreator_GraphEditorWidth);
    };
 

    return self;
})();
export default KGcreator_r;
window.KGcreator_r = KGcreator_r;
