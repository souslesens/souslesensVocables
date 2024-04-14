import Containers_UI from "../tools/containers/Containers_UI.js";
import common from "../shared/common.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";
import Lineage_containers from "../tools/lineage/lineage_containers.js";

var ContainerSearchWidget = (function() {
    var self = {};

    self.showDialog = function(source) {
        if (!source) {
            source = Lineage_sources.activeSource;
        }
        self.currentSource = source;
        Containers_UI.getContainerTypes(source, null, function(err, types) {
            if (err) {
                return alert(err.responseText);
            }


            types.splice(0, 0, { id: "all", label: "all" });
            $("#containerSearchWidget_typesSelect").css("display", "block");
            common.fillSelectOptions("containerSearchWidget_typesSelect", types, true, "label", "id");
            //  PopupMenuWidget.initAndShow(html)
        });
    };

    self.execSearch = function() {
        var type = $("#containerSearchWidget_typesSelect").val();
        $("#containerSearchWidget_typesSelect").val("");
        var filter = "";
        if (type != "all") {
            filter = " ?container rdf:type <" + type + ">. ";
        }
        Lineage_containers.graphWhiteboardNodesContainers(self.currentSource, null, { filter: filter });
    };

    return self;
})();

export default ContainerSearchWidget;
window.ContainerSearchWidget = ContainerSearchWidget;
