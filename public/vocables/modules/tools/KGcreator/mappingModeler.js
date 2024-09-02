import Axiom_activeLegend from "../axioms/axiom_activeLegend.js";
import KGcreator from "./KGcreator.js";
import SourceSelectorWidget from "../../uiWidgets/sourceSelectorWidget.js";


var MappingModeler = (function () {
    var self = {};
    self.currentSource = null;
    self.currentDataSource = null;
    self.init = function (source, resource, divId) {
        async.series([

            //init source
            function (callbackSeries) {
                SourceSelectorWidget.initWidget(["OWL"], "mainDialogDiv", true, function (source) {

                            var source = SourceSelectorWidget.getSelectedSource()[0];
                           // $("#KGcreator_dialogDiv").dialog("close");


                    self.currentSource = source
                    return callbackSeries()
                })
            },

            //bot
            function (callbackSeries) {
                /*  var params = {
                      source: self.currentSource
                  }

                  MappingModeler_bot.start(MappingModeler_bot.workflow, params, function (err, result) {
                      self.currentDataSource = result;
                      return callbackSeries()
                  })*/
                KGcreator.currentSlsvSource=self.currentSource
                KGcreator.getSlsvSourceConfig(self.currentSource, function (err, result) {
                    if (err) {
                        return callbackSeries(err);
                    }

                    KGcreator.currentConfig = result;
                    return callbackSeries()
                })
            },
            function (callbackSeries) {
                self.initActiveLegend(divId)

                return callbackSeries()

            },

            // load jstree
            function (callbackSeries) {

               var options = {
                    openAll: true,
                    selectTreeNodeFn: self.onDataSourcesJstreeSelect
                }
                KGcreator.loadDataSourcesJstree("mappingModeler_axiomsJstreeDiv", options, function (err, result) {
                    return callbackSeries(err)

                })

            },
            //initDataSource
            function (callbackSeries) {
                return callbackSeries()
            },


        ])

    }

    self.onDataSourcesJstreeSelect = function (obj, node) {

        self.currentTreeNode = obj.node;

        //  KGcreator_run.getTableAndShowMappings();

        if (obj.node.data.type == "databaseSource") {
            KGcreator.initDataSource(obj.node.id, "databaseSource", obj.node.data.sqlType, obj.node.data.table);

            KGcreator.loadDataBaseSource(self.currentSlsvSource, obj.node.id, obj.node.data.sqlType);
        } else if (obj.node.data.type == "csvSource") {
            self.initDataSource(obj.node.id, "csvSource", obj.node.data.sqlType, obj.node.id);
            KGcreator.loadCsvSource(self.currentSlsvSource, obj.node.id, function (err, result) {
                if (err) {
                    return alert("file not found");
                }

            });
        } else if (obj.node.data.type == "table") {
            var columns = self.currentConfig.currentDataSource.tables[obj.node.data.id];
            var table = obj.node.data.id;
            self.currentConfig.currentDataSource.currentTable = table;

        }

    }

    self.initActiveLegend = function (divId) {
        if (!divId) {
            divId = "mainDialogDiv"

            $("#" + divId).load("modules/tools/KGcreator/html/mappingModeler.html", function () {
                if (divId && divId.indexOf("Dialog") > -1) {
                    $("#" + divId).dialog("open");
                }

                var legendItems = [
                    {label: "Class", color: "#00afef"},
                    {label: "ObjectProperty", color: "#f5ef39"},
                    {label: "Column", color: "#cb9801"},
                    {label: "Connective", color: "#70ac47"}
                ]

                var options = {
                    onLegendNodeClick: self.onLegendNodeClick,
                    showLegendGraphPopupMenu: self.showLegendGraphPopupMenu
                }
                Axiom_activeLegend.drawLegend("nodeInfosAxioms_activeLegendDiv", legendItems, options);
            });
        }
    }


    self.onLegendNodeClick = function () {


    }

    self.showLegendGraphPopupMenu = function () {

    }
    return self;
})();

export default MappingModeler;
window.MappingModeler = MappingModeler;
