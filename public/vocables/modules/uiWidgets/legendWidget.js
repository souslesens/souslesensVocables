import Lineage_sources from "../tools/lineage/lineage_sources.js";
import Lineage_whiteboard from "../tools/lineage/lineage_whiteboard.js";

var LegendWidget = (function () {
    var self = {};
    self.currentLegendDJstreedata = {};
    self.legendDivsStack = {};

    self.clearLegend = function () {
        self.legendDivsStack = {};
        $("#Lineage_classes_graphDecoration_legendDiv").html("");
        self.legendMap = {};
    };

    self.drawLegend = function (legendDivId, jstreeData) {
        self.currentLegendDJstreedata[legendDivId] = jstreeData;
        var options = {
            openAll: true,
            //withCheckboxes: true, to finish
            withCheckboxes: false,
            onCheckNodeFn: LegendWidget.onLegendCheckBoxes,
            onUncheckNodeFn: LegendWidget.onLegendCheckBoxes,
            selectTreeNodeFn: function (evt, obj) {
                self.currentLegendNode = obj.node;
            },
            tie_selection: false,
            contextMenu: LegendWidget.getLegendJstreeContextMenu(),
            notTypes: true,
        };
        $("#Lineage_classes_graphDecoration_legendDiv").jstree("destroy").empty();
        $("#Lineage_classes_graphDecoration_legendDiv").html(
            "<div  class='jstreeContainer' style='height: 350px;width:90%;max-height:22dvh;'>" + "<div id='legendJstreeDivId' style='height: 25px;width:100%'></div></div>",
        );
        JstreeWidget.loadJsTree(legendDivId, jstreeData, options, function () {
            self.legendDivId = legendDivId;
            /*    $("#" + legendDivId)
                .jstree(true)
                .check_all();*/
        });
    };

    self.onLegendCheckBoxes = function () {
        var checkdeTopClassesIds = $("#" + self.legendDivId)
            .jstree(true)
            .get_checked();

        var allNodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
        var newNodes = [];
        allNodes.forEach(function (node) {
            var hidden = true;
            if (node && checkdeTopClassesIds.indexOf(node.legendType) > -1) {
                hidden = false;
            }

            newNodes.push({
                id: node.id,
                hidden: hidden,
            });
        });
        Lineage_whiteboard.lineageVisjsGraph.data.nodes.update(newNodes);
    };

    self.getLegendJstreeContextMenu = function () {
        var items = {};

        items.groupNodes = {
            label: "Group nodes",
            action: function (_e) {
                var node = self.currentLegendNode;
            },
        };
        return items;
    };

    return self;
})();

export default LegendWidget;
window.LegendWidget = LegendWidget;
