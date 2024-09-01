import Axiom_activeLegend from "../axioms/axiom_activeLegend.js";

var MappingModeler = (function () {
    var self = {};
    self.currentSource = null;
    self.currentDataSource = null;
    self.init = function (source, resource, divId) {
        async.series([
            function (callbackSeries) {
                SourceSelectorWidget.initWidget(["OWL"], "mainDialogDiv", true, function (source) {

                    self.currentSource = source
                    return callbackSeries()
                })
            },
            function (callbackSeries) {
                var params = {
                    source: self.currentSource
                }

                MappingModeler_bot.start(MappingModeler_bot.workflow, params, function (err, result) {
                    self.currentDataSource = result;
                    return callbackSeries()
                })
            },
            //initDataSource
            function (callbackSeries) {
                return callbackSeries()
            },
            function (callbackSeries) {
                self.initActiveLegend(divId)

                return callbackSeries()

            },

        ])

    }



            self.initActiveLegend=function(divId) {
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
