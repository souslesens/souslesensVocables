import Lineage_whiteboard from "../lineage/lineage_whiteboard.js";
import Lineage_styles from "../lineage/lineage_styles.js";
import common from "../../shared/common.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import Containers_query from "./containers_query.js";

var Containers_tree = (function () {
    var self = {};

    self.search = function (memberType, callback) {
        if (!callback) {
            callback = function () {};
        }

        var term = $("#Lineage_containers_searchInput").val();
        var source = Lineage_sources.activeSource;

        var filter = "";
        if (term) {
            filter = Sparql_common.setFilter("searchValue", null, term);
            var options = { filter: filter, depth: 10 };
            Containers_query.getContainerAscendants(source, null, options, function (err, result) {});
        } else {
            Containers_query.getTopContainer(source, function (err, result) {
                var options = {};
                self.drawTree(source, source, null, result.results.bindings, options);
            });
        }
    };

    self.drawTree = function (divid, source, rootNode, data, options, callback) {
        var jstreeData = [];
        var existingIds = {};
        var existingNodes = {};

        // set rootnodes
        data.forEach(function (item) {
            var id = item.member.value;
            var label = item.memberLabel ? item.memberLabel.value : Sparql_common.getLabelFromURI(item.member);
            var jstreeId = "_" + common.getRandomHexaId(5);

            var parent;
            //  if()
            if (!existingIds[id]) {
                existingIds[id] = jstreeId;
            }

            if (!existingNodes[jstreeId]) {
                existingNodes[jstreeId] = 1;
            }
            var node = {
                id: existingIds[id],
                text: label,
                parent: "#",
                type: "Container",
                data: {
                    type: "Container",
                    source: source,
                    id: id,
                    label: item.label,
                    parent: "#",
                    //tabId: options.tabId,
                },
            };

            jstreeData.push(node);
        });
    };

    return self;
})();

export default Containers_tree;

window.Containers_tree = Containers_tree;
