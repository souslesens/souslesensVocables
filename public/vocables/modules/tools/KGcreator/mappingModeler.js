var MappingModeler = (function () {
    var self = {};
    self.init = function (source, resource, divId) {
        $("#" + divId).load("modules/tools/KGcreator/html/mappingModeler.html", function () {
            $("#" + divId).dialog("open");
            M.drawLegend("nodeInfosAxioms_activeLegendDiv");
        });
    };
    return self;
})();

export default MappingModeler;
window.MappingModeler = MappingModeler;
