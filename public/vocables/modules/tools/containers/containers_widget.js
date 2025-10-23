import Lineage_sources from "../lineage/lineage_sources.js";
import Containers_graph from "./containers_graph.js";
import common from "../../shared/common.js";
import Containers_query from "./containers_query.js";

var Containers_widget = (function () {
    var self = {};
    self.jstreeDivId = "containerWidget_treeDiv";
    self.showDialog = function (source, options, validateFn) {
        self.validateFn = validateFn;

        UI.setDialogTitle("#mainDialogDiv", "Containers widget");
        $("#mainDialogDiv").load("modules/tools/containers/containers_widget.html", function () {
            $("#mainDialogDiv").dialog("open");

            //   $("#mainDialogDiv").addClass("zIndexTop-10");
            Containers_tree.search(self.jstreeDivId, options);
        });
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

        //  self.currentSource = source;

        //  var rootNodes = JstreeWidget.getNodeDescendants("lineage_containers_containersJstree", "#", 1);

        $("#smallDialogDiv").dialog("open");
        UI.setDialogTitle("#smallDialogDiv", "Parent Containers Type");
        $("#smallDialogDiv").load("./modules/tools/lineage/html/parentContainers.html", function () {
            var types = [];
            types.splice(0, 0, { id: "all", label: "all" });

            Containers_query.getTopContainer(source, {}, function (err, result) {
                if (err) return alert(err.responseText || err);
                result.results.bindings.forEach(function (item) {
                    types.push({ id: item.member.value, label: item.memberLabel ? item.memberLabel.value : Sparql_common.getLabelFromURI(item.member.value) });
                });
                common.fillSelectOptions("containerSearchWidget_typesSelect", types, true, "label", "id");
                $("#containerSearchWidget_typesSelect").val("all");
                //$("#containerSearchWidget_typesSelect").hide();
                //self.execParentContainersSearch();
            });
        });
        // });
    };

    self.execParentContainersSearch = function () {
        $("#smallDialogDiv").dialog("close");
        var type = $("#containerSearchWidget_typesSelect").val();

        var filter = "";

        var options = {};
        if (type && type != "all") {
            options["filterAncestorsType"] = type;
            filter = " ?container rdf:type <" + type + ">. ";
        }
        Containers_graph.graphParentContainers(Lineage_sources.activeSource, null, options);
    };
    self.search = function () {
        var term = $("#containerWidget_searchInput").val();
        if (term) {
            Containers_tree.drawContainerAndAncestorsJsTree(Lineage_sources.activeSource, term, {}, function (err, result) {
                if (err) {
                    return alert(err.responseText);
                }
            });
        } else {
            Containers_query.getTopContainer(Lineage_sources.activeSource, {}, function (err, result) {
                Containers_tree.drawTree(self.jstreeDivId, Lineage_sources.activeSource, "#", result.results.bindings, {});
            });
        }
    };
    return self;
})();

export default Containers_widget;
window.Containers_widget = Containers_widget;
