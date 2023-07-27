import common from "../shared/common.js";
import Lineage_classes from "../tools/lineage/lineage_classes.js";


var GraphDecorationWidget = (function() {
  var self = {};

  self.showDecorateDialog = function(nodeSelectorFn) {
    $("#smallDialogDiv").dialog("open");
    $("#smallDialogDiv").load("snippets/lineage/lineage_decorateDialog.html", function() {
      self.currentNodeSelectorFn = null;
      if (nodeSelectorFn) {
        self.currentNodeSelectorFn = nodeSelectorFn;
        $("#lineage_decorate_selectionSelect").css("display", "none");
      }
      $("#lineage_decorate_applyButton").bind("click", GraphDecorationWidget.decorateNodes);
      common.fillSelectWithColorPalette("lineage_decorate_colorSelect");
      var shapes = ["dot", "square", "box", "text", "diamond", "star", "triangle", "ellipse", "circle", "database", "triangleDown", "hexagon"];
      common.fillSelectOptions("lineage_decorate_shapeSelect", shapes, true);
    });
  };
  self.decorateNodes = function() {
    var nodes;
    if (self.currentNodeSelectorFn) {
      nodes = self.currentNodeSelectorFn();
    }
    else {
      var selection = $("#lineage_decorate_selectionSelect").val();

      if (selection == "Last added nodes") {
        nodes = Lineage_classes.lineageVisjsGraph.lastAddedNodes;
      }
      else if (selection == "All nodes") {
        nodes = Lineage_classes.lineageVisjsGraph.lastAddedNodes;
      }
      else if (selection == "Selected nodes") {
        nodes = Lineage_selection.selectedNodes;
      }
    }

    $("#smallDialogDiv").dialog("close");
    var newIds = [];

    var color = $("#lineage_decorate_colorSelect").val();
    var shape = $("#lineage_decorate_shapeSelect").val();
    var size = $("#lineage_decorate_sizeInput").val();
    nodes.forEach(function(node) {
      var id;
      if(typeof node==="object") {
        if (!node.data) {
          return;
        }else
         id= node.id
      }else{
        id=node
      }
      var obj = { id: id};
      if (color) {
        obj.color = color;
      }
      if (shape) {
        obj.shape = shape;
      }
      if (size) {
        obj.size = parseInt(size);
      }
      newIds.push(obj);
    });
    Lineage_classes.lineageVisjsGraph.data.nodes.update(newIds);
  };
  return self;
})();
export default GraphDecorationWidget;
window.GraphDecorationWidget = GraphDecorationWidget;