import KGcreator from "../../modules/tools/KGcreator/KGcreator.js";
import KGcreator_mappings from "../../modules/tools/KGcreator/KGcreator_mappings.js";
import KGcreator_run from "../../modules/tools/KGcreator/KGcreator_run.js";
import ResponsiveUI from "../../responsive/responsiveUI.js";
import NodesInfosWidget from "../../modules/uiWidgets/nodeInfosWidget.js";
import NodeInfosWidgetResponsive from "../../responsive/widget/nodeInfosWidgetResponsive.js";

import PredicatesSelectorWidget from "../../modules/uiWidgets/predicatesSelectorWidget.js";
import Lineage_r from "../lineage/lineage_r.js";
var KGcreator_r = (function () {
    var self = {};
    //changed files and functions
    self.oldshowHideEditButtons = Lineage_sources.showHideEditButtons;
    self.oldshowDialog = SavedQueriesComponent.showDialog;

    //self.oldshowMappingDialog=KGcreator_mappings.showMappingDialog;
    self.init = function () {
        PredicatesSelectorWidget.load = Lineage_r.loadPredicateSelectorWidgetResponsive;
        ResponsiveUI.initMenuBar(self.loadSource);
        ResponsiveUI.replaceFile(NodesInfosWidget, NodeInfosWidgetResponsive);
        $("#Lineage_graphEditionButtons").show();
        $("#Lineage_graphEditionButtons").empty();
        $("#Lineage_graphEditionButtons").attr("id", "KGcreator_topButtons");
        //KGcreator_mappings.showMappingDialog=self.showMappingDialogResponsive;
    };
    self.quit = function () {
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
                $("#lateralPanelDiv").load("./responsive/KGcreator/html/leftPanel.html", function () {
                    KGcreator.currentSlsvSource = ResponsiveUI.source;
                    ResponsiveUI.openTab("lineage-tab", "KGcreator_source_tab", KGcreator_r.initLinkTab, "#MapButton");
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
    self.showMenuButtons = function () {};
    self.initRunTab = function () {
        $("#KGcreator_centralPanelTabs").load("./responsive/KGcreator/html/runTab.html", function () {
            $("#KGcreator_topButtons").load("./responsive/KGcreator/html/runButtons.html", function () {
                $("#KGcreator_topButtons").css("padding", "4px");
                $("#MenuBar").css("height", "");
                $("#MenuBarFooter").css("display", "flex");
                $("#KGcreator_topButtons").css("flex-direction", "column");
                if (KGcreator.currentTreeNode) {
                    KGcreator_run.createTriples(true);
                }
            });
        });
    };
    self.initLinkTab = function () {
        $("#KGcreator_centralPanelTabs").load("./responsive/KGcreator/html/LinkTab.html", function () {
            KGcreator.initSource();
            $("#");
            $("#KGcreator_topButtons").load("./responsive/KGcreator/html/linkButtons.html", function () {
                $("#KGcreator_topButtons").css("padding", "4px");
                $("#MenuBar").css("height", "90px");
                $("#KGcreator_topButtons").css("flex-direction", "row");
                $("#MenuBarFooter").css("display", "block");
            });
        });
    };
    /*
    self.showMappingDialogResponsive=function(addColumnClassType, options, callback){
        if(callback){
            var oldCallback=callback;
            callback=function(){
                $('#LinkColumn_botPanel').hide();
                oldCallback();
            }
        }
        
        
        self.oldshowMappingDialog(addColumnClassType, options, callback)
    }
    */

    return self;
})();
export default KGcreator_r;
window.KGcreator_r = KGcreator_r;
