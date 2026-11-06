import AIMappingsDetails from "./aiMappingsDetails.js";
import AIDataSourceManager from "./aiDataSourcesManager.js";
import AIColumnClassSuggestion from "./aiColumnClassSuggestion.js";

/**
 * AIUIcontroller module manages the display of panels in the mapping modeler interface,
 * handling tab activation and panel visibility for data sources, column mappings, technical mappings, and triples.
 * @module AIUIcontroller
 * @see [Tutorial: Overview]{@tutorial overview}
 */
var AIUIcontroller = (function () {
    var self = {};

    /**
     * Handles the activation of left panel tabs in the UI based on the provided tab ID.
     * It shows or hides the corresponding panels based on the selected tab.
     * @function
     * @name onActivateLeftPanelTab
     * @param {string} tabId - The ID of the tab to activate.
     * @memberof module:AIUIcontroller
     */
    self.onActivateLeftPanelTab = function (tabId, callback) {
        $("#mappingModeler_relationInfos").html("");
        //  $(".mappingModeler_rightPanel").css("display", "none");
        if (tabId == "MappingModeler_dataSourcesTab") {
            $("#mappingModeler_structuralPanel").css("display", "block");
            $("#rightControlPanelDiv").load("./modules/tools/aiMappingModeler/html/mappingsGraphButtons.html", function (err) {
                if (callback) {
                    callback();
                }
            });
        } else if (!AIMappingModeler.currentTable) {
            $("#MappingModeler_leftTabs").tabs("option", "active", 0);
            return alert("select a table");
        }
        if (tabId == "MappingModeler_columnsTab") {
            AIColumnClassSuggestion.onColumnsListed();
            //$("#MappingModeler_currentDataSource").html(AIDataSourceManager.currentConfig.currentDataSource.name);
            $("#rightControlPanelDiv").load("./modules/tools/aiMappingModeler/html/mappingsGraphButtons.html", function (err) {
                $("#mappingModeler_structuralPanel").css("display", "block");
                AIMappingModeler.initActiveLegend(AIMappingModeler.legendGraphDivId, function () {
                    // the legend can answer up to 30 s later, after the table was left for its data source
                    if (!AIMappingModeler.currentTable) {
                        return;
                    }
                    AIMappingModeler.loadSuggestionSelectJstree(AIMappingModeler.currentTable.columns, "Columns", callback);
                });
            });
        } else if (tabId == "MappingModeler_technicalDetailTab") {
            //  $("#rightControlPanelDiv").load("./modules/tools/aiMappingModeler/html/detailsGraphButtons.html", function (err) {});
            $("#rightControlPanelDiv").load("./modules/tools/aiMappingModeler/html/mappingsGraphButtons.html", function (err) {
                AIMappingsDetails.showDetailsDialog(null, callback);
            });
        } else if (tabId == "MappingModeler_RelationsTab") {
            AIMappingModelerRelations.drawPossibleRelations(callback);
        } else if (tabId == "MappingModeler_tripleFactoryTab") {
        }
        // avoid multiple technical graph
        // mappingModeler_structuralPanel
        if (tabId != "MappingModeler_technicalDetailTab") {
            $("#mappingModeler_genericPanel").empty();
        }
    };

    /**
     * Switches the active left panel tab to the target tab.
     * It also performs necessary UI updates based on the target tab, such as loading columns or technical mappings.
     *
     * @function
     * @name switchLeftPanel
     * @param {string} target - The name of the target tab to activate.
     * @memberof module:AIUIcontroller
     */
    self.switchLeftPanel = function (target) {
        var tabsArray = ["dataSource", "mappings", "triples"];
        if (target == "Column Mappings") {
            AIMappingModeler.initActiveLegend(AIMappingModeler.legendGraphDivId);
        } else if (target == "Technical Mappings") {
            AIMappingsDetails.showDetailsDialog();
        }
        if (target == "triples") {
        }

        $("#MappingModeler_leftTabs").tabs("option", "active", tabsArray.indexOf(target));
    };

    /**
     * Activates the specified right panel based on the provided panel label.
     * It controls the visibility of different right panels like "Data Sources", "Column Mappings", and "Technical Mappings".
     *
     * @function
     * @name activateRightPanel
     * @param {string} PanelLabel - The label of the right panel to activate.
     * @memberof module:AIUIcontroller
     */
    self.activateRightPanel = function (PanelLabel) {
        $(".mappingModeler_rightPanel").css("display", "none");

        if (PanelLabel == "Data Sources") {
            $("#mappingModeler_structuralPanel").css("display", "block");
        } else if (PanelLabel == "Column Mappings") {
            // $("#mappingModeler_mappingsPanel").css("display","block")
            $("#mappingModeler_structuralPanel").css("display", "block");
        } else if (PanelLabel == "Technical Mappings") {
            // $("#mappingModeler_mappingsPanel").css("display","block")
            //   $("#mappingModeler_structuralPanel").css("display", "block");
            AIMappingsDetails.showDetailsDialog();
        } else if (PanelLabel == "Triples") {
            $("#mappingModeler_genericPanel").css("display", "block");
        } else {
            $("#mappingModeler_genericPanel").css("display", "block");
        }
    };

    return self;
})();

export default AIUIcontroller;
window.AIUIcontroller = AIUIcontroller;
