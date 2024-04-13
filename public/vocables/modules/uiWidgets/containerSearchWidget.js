import Lineage_containers from "../tools/lineage/lineage_containers.js";
import common from "../shared/common.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";

var ContainerSearchWidget = (function () {
    var self = {};

    self.showDialog = function (source) {
        if (!source) {
            source = Lineage_sources.activeSource;
        }
        self.currentSource = source;
        Lineage_containers.getContainerTypes(source, null, function (err, types) {
            if (err) {
                return alert(err.responseText);
            }

       /*     var html = "<div>types <select id='containerSearchWidget_typesSelect' onchange='ContainerSearchWidget.execSearch()' </div>";

            $("#smallDialogDiv").html(html);
            $("#smallDialogDiv").dialog("open");

            //$("#smallDialogDiv").parent().css("left", "30%");*/
            types.splice(0, 0, { id: "all", label: "all" });
$("#containerSearchWidget_typesSelect").css("display","block")
            common.fillSelectOptions("containerSearchWidget_typesSelect", types, true, "label", "id");
            //  PopupMenuWidget.initAndShow(html)
        });
    };

    self.execSearch = function () {
        var type = $("#containerSearchWidget_typesSelect").val();
        $("#containerSearchWidget_typesSelect").val("");
        var filter = "";
        if (type != "all") filter = " ?container rdf:type <" + type + ">. ";
        Lineage_containers.graphWhiteboardNodesContainers(self.currentSource, null, { filter: filter });
    };

    return self;
})();

export default ContainerSearchWidget;
window.ContainerSearchWidget = ContainerSearchWidget;
