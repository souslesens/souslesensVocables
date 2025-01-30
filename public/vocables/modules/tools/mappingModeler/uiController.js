import MappingsDetails from "./mappingsDetails.js";
import DataSourceManager from "./dataSourcesManager.js";

var UIcontroller=(function(){

    var self={}


    self.onActivateLeftPanelTab=function(tabId){
        $(".mappingModeler_rightPanel").css("display", "none");
     if(tabId=="MappingModeler_dataSourcesTab" ){
         $("#mappingModeler_structuralPanel").css("display", "block");


    }
      else  if(tabId=="MappingModeler_columnsTab" ){
         $("#mappingModeler_structuralPanel").css("display", "block");
         MappingModeler.initActiveLegend(self.legendGraphDivId);
         MappingModeler.loadSuggestionSelectJstree(MappingModeler.currentTable.columns, "Columns");
         $("#MappingModeler_currentDataSource").html(DataSourceManager.currentConfig.currentDataSource.name);
         try {
             MappingModeler.visjsGraph.network.openCluster("cluster_" + MappingModeler.currentTable.name);
         }
         catch(e){

         }


     }
     else  if(tabId=="MappingModeler_technicalDatailTab" ){
         MappingsDetails.showDetailsDialog()

     }
     else  if(tabId=="MappingModeler_tripleFactoryTab" ){

     }


    }



    self.switchLeftPanel = function (target) {
        var tabsArray = ["dataSource", "mappings", "triples"];
        if (target == "Column Mappings") {
            MappingModeler.initActiveLegend(self.legendGraphDivId);
            //MappingModeler.loadVisjsGraph();
        }
        else if (target == "Technical Mappings") {
            MappingsDetails.showDetailsDialog()
        }
        if (target == "triples") {
        }

        $("#MappingModeler_leftTabs").tabs("option", "active", tabsArray.indexOf(target));
    };


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
            MappingsDetails.showDetailsDialog()


        }
        else if (PanelLabel == "Triples") {
            $("#mappingModeler_genericPanel").css("display", "block");
        } else {
            $("#mappingModeler_genericPanel").css("display", "block");
        }
    };






    return self




})()

export default UIcontroller;
window.UIcontroller=UIcontroller