import Lineage_sources from "../tools/lineage/lineage_sources.js";
import Lineage_classes from "../tools/lineage/lineage_classes.js";

var LegendWidget = (function () {
    var self = {};
    self.currentLegendDJstreedata = {};
    self.clearLegend = function () {
        $("#Lineage_classes_graphDecoration_legendDiv").html("");
        self.legendMap = {};
    };

    self.drawLegend = function (legendDivId, jstreeData) {
        self.currentLegendDJstreedata[legendDivId] = jstreeData;
        var options = {
            openAll: true,
            withCheckboxes: true,
            onCheckNodeFn: Lineage_decoration.onLegendCheckBoxes,
            onUncheckNodeFn: Lineage_decoration.onLegendCheckBoxes,
            tie_selection: false,
        };
        $("#Lineage_classes_graphDecoration_legendDiv").jstree("destroy").empty();
        $("#Lineage_classes_graphDecoration_legendDiv").html("<div  class='jstreeContainer' style='height: 350px;width:90%'>" + "<div id=legendDivId style='height: 25px;width:100%'></div></div>");
        JstreeWidget.loadJsTree(legendDivId, jstreeData, options, function () {
            $("#" + legendDivId)
                .jstree(true)
                .check_all();
        });
    };

    self.onLegendCheckBoxes = function () {
        var checkdeTopClassesIds = $("#" + legendDivId)
            .jstree(true)
            .get_checked();

        var allNodes = Lineage_classes.lineageVisjsGraph.data.nodes.get();
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
        Lineage_classes.lineageVisjsGraph.data.nodes.update(newNodes);
    };

    self.onlegendTypeDivClick = function (div, type) {
        self.currentLegendObject = { type: type, div: div };
        self.setGraphPopupMenus();
        var point = div.position();
        point.x = point.left;
        point.y = point.top;
        MainController.UI.showPopup(point, "graphPopupDiv", true);
    };

    self.hideShowLegendType = function (hide, only) {
        if (hide) {
            self.currentLegendObject.div.addClass("Lineage_legendTypeDivHidden");
        } else {
            self.currentLegendObject.div.removeClass("Lineage_legendTypeDivHidden");
        }
        var allNodes = Lineage_classes.lineageVisjsGraph.data.nodes.get();
        var newNodes = [];
        var hidden = hide ? true : false;
        allNodes.forEach(function (node) {
            if (only) {
                if (only == "all" || (node && node.legendType == self.currentLegendObject.type)) {
                    newNodes.push({
                        id: node.id,
                        hidden: false,
                    });
                } else {
                    newNodes.push({ id: node.id, hidden: true });
                }
            } else {
                if (node && node.legendType == self.currentLegendObject.type) {
                    newNodes.push({
                        id: node.id,
                        hidden: hidden,
                    });
                }
            }
        });
        Lineage_classes.lineageVisjsGraph.data.nodes.update(newNodes);
    };

    return self;
})();

export default LegendWidget;
window.LegendWidget = LegendWidget;
