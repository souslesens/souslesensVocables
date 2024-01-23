import KGcreator from "../../modules/tools/KGcreator/KGcreator.js";

var KGcreator_r = (function () {
    var self = {};
    //changed files and functions
    self.oldshowHideEditButtons = Lineage_sources.showHideEditButtons;
    self.oldshowDialog = SavedQueriesComponent.showDialog;
    self.init = function () {
        ResponsiveUI.initMenuBar(self.loadSource);
        $("#Lineage_graphEditionButtons").show();
        $("#Lineage_graphEditionButtons").empty();
    };
    self.quit = function () {
        Lineage_sources.registerSource = ResponsiveUI.oldRegisterSource;
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
        $("#KGcreator_centralPanelTabs").load("./responsive/KGcreator/html/runTab.html", function () {});
    };
    self.initLinkTab = function () {
        $("#KGcreator_centralPanelTabs").load("./responsive/KGcreator/html/LinkTab.html", function () {
            KGcreator.initSource();
        });
    };

    return self;
})();
export default KGcreator_r;
window.KGcreator_r = KGcreator_r;
