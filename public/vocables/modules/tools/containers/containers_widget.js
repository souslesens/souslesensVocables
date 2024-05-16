import Lineage_sources from "../lineage/lineage_sources.js";
import Containers_graph from "./containers_graph.js";
import common from "../../shared/common.js";
import Lineage_containers from "../lineage/lineage_containers.js";

var Containers_widget = (function () {
    var self = {};
    self.jstreeDivId = "containerWidget_treeDiv";
    self.showDialog = function (source, options, validateFn) {
        self.validateFn = validateFn;
        // $("#mainDialogDiv") .parent().show("fast", function () {
        $("#mainDialogDiv").dialog("open");

        $("#mainDialogDiv").load("modules/tools/containers/containers_widget.html", function () {
            $("#mainDialogDiv").addClass("zIndexTop-10");
            Containers_tree.search(self.jstreeDivId, options);
        });
        // });
    };

    self.validateDialog = function () {
        var selectedMembers = $("#containerWidget_treeDiv").jstree().get_selected(true);
        var depth = $("#containerWidget_depthInput").val();
        //  $("#mainDialogDiv") .parent() .hide("fast", function () { });
        $("#mainDialogDiv").dialog("close");

        if (!selectedMembers || selectedMembers.length == 0) {
            alert("no node selected");
            return self.validateFn("no top node selected");
        }

        var payload = {
            topMember: selectedMembers[0].data,
            depth: depth,
        };

        self.validateFn(null, payload);
    };

    self.showParentContainersDialog = function (source) {
        if (!source) {
            source = Lineage_sources.activeSource;
        }
        self.currentSource = source;
        Containers_graph.getContainerTypes(source, null, function (err, types) {
            if (err) {
                return alert(err.responseText);
            }

            types.splice(0, 0, { id: "all", label: "all" });
            $("#containerSearchWidget_typesSelect").css("display", "block");
            common.fillSelectOptions("containerSearchWidget_typesSelect", types, true, "label", "id");
            //  PopupMenuWidget.initAndShow(html)
        });
    };

    self.execParentContainersSearch = function () {
        var type = $("#containerSearchWidget_typesSelect").val();
        $("#containerSearchWidget_typesSelect").val("");
        var filter = "";
        if (type != "all") {
            filter = " ?container rdf:type <" + type + ">. ";
        }
        Containers_graph.graphParentContainers(self.currentSource, null, { filter: filter });
    };

    return self;
})();

export default Containers_widget;
window.Containers_widget = Containers_widget;
