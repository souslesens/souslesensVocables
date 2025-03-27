import MappingsDetails from "./mappingsDetails.js";
import DataSourceManager from "./dataSourcesManager.js";

/**
 * UIcontroller module manages the display of panels in the mapping modeler interface,
 * handling tab activation and panel visibility for data sources, column mappings, technical mappings, and triples.
 * @module UIcontroller
 * @see [Tutorial: Overview]{@tutorial overview}
 */
var UIcontroller = (function () {
    var self = {};

    /**
     * Handles the activation of left panel tabs in the UI based on the provided tab ID.
     * It shows or hides the corresponding panels based on the selected tab.
     * @function
     * @name onActivateLeftPanelTab
     * @param {string} tabId - The ID of the tab to activate.
     * @memberof module:UIcontroller
     */
    self.onActivateLeftPanelTab = function (tabId) {
        $(".mappingModeler_rightPanel").css("display", "none");
        if (tabId == "MappingModeler_dataSourcesTab") {
            $("#mappingModeler_structuralPanel").css("display", "block");
            $('#rightControlPanelDiv').load("./modules/tools/mappingModeler/html/mappingsGraphButtons.html", function (err) {
               
            });
        } else if (tabId == "MappingModeler_columnsTab") {
            $("#mappingModeler_structuralPanel").css("display", "block");
            MappingModeler.initActiveLegend(self.legendGraphDivId);
            MappingModeler.loadSuggestionSelectJstree(MappingModeler.currentTable.columns, "Columns");
            $("#MappingModeler_currentDataSource").html(DataSourceManager.currentConfig.currentDataSource.name);
            $('#rightControlPanelDiv').load("./modules/tools/mappingModeler/html/mappingsGraphButtons.html", function (err) {
               
            });
        } else if (tabId == "MappingModeler_technicalDetailTab") {
            MappingsDetails.showDetailsDialog();
            $('#rightControlPanelDiv').load("./modules/tools/mappingModeler/html/detailsGraphButtons.html", function (err) {
               
            });
        } else if (tabId == "MappingModeler_tripleFactoryTab") {
        }
    };

    /**
     * Switches the active left panel tab to the target tab.
     * It also performs necessary UI updates based on the target tab, such as loading columns or technical mappings.
     *
     * @function
     * @name switchLeftPanel
     * @param {string} target - The name of the target tab to activate.
     * @memberof module:UIcontroller
     */
    self.switchLeftPanel = function (target) {
        var tabsArray = ["dataSource", "mappings", "triples"];
        if (target == "Column Mappings") {
            MappingModeler.initActiveLegend(self.legendGraphDivId);
        } else if (target == "Technical Mappings") {
            MappingsDetails.showDetailsDialog();
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
     * @memberof module:UIcontroller
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
            MappingsDetails.showDetailsDialog();
        } else if (PanelLabel == "Triples") {
            $("#mappingModeler_genericPanel").css("display", "block");
        } else {
            $("#mappingModeler_genericPanel").css("display", "block");
        }
    };

    return self;
})();

export default UIcontroller;
window.UIcontroller = UIcontroller;
