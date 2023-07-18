import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Lineage_sources from "./lineage_sources.js";
import common from "../../shared/common.js";
import OntologyModels from "../../shared/ontologyModels.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import Lineage_classes from "./lineage_classes.js";

//@typescript-eslint/no-unused-vars
var Lineage_decoration = (function() {
  var self = {};

  self.topOntologiesClassesMap = {};
  self.legendMap = {};
  self.currentVisjGraphNodesMap = {};
  self.currentLegendDJstreedata = {};


  self.colorGraphNodesByType = function(visjsNodes) {
    if (!Config.topLevelOntologies[Config.currentTopLevelOntology]) {
      return $("#lineage_legendWrapper").css("display", "none");
      ;
    }

    var nonTopLevelOntologynodeIds = [];
    var topLevelOntologynodeIds = [];
    var individualNodes = {};
    if (!visjsNodes) {
      visjsNodes = Lineage_classes.lineageVisjsGraph.data.nodes.get();
    }

    if (visjsNodes.length == 0) {
      return;
    }
    var nodeIds = [];
    visjsNodes.forEach(function(node) {
      nodeIds.push(node.id);
    });

    var hierarchies = {};
    var upperOntologiesHierarchy = {};
    var legendJsTreeData = [];
    var legendClassesMap = {};
    var newVisJsNodes = [];

    function getNodeColorInLegend(ancestorNode, parent) {
      var color = legendClassesMap[ancestorNode.superClass.value];
      if (!color) {
        for (var key in Config.topLevelOntologyFixedlegendMap) {
          if (!Config.topLevelOntologyFixedlegendMap[key]) {
            return Lineage_classes.getSourceColor(key);
          }
          color = Config.topLevelOntologyFixedlegendMap[key][ancestorNode.superClass.value];
          if (!color) {
            color = Lineage_classes.getSourceColor(ancestorNode.superClass.value);
          }
        }
        var label = ancestorNode.superClassLabel ? ancestorNode.superClassLabel.value : Sparql_common.getLabelFromURI(ancestorNode.superClass.value);
        legendJsTreeData.push({
          id: ancestorNode.superClass.value,
          text: "<span  style='font-size:10px;background-color:" + color + "'>&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;" + label,
          parent: parent,
          color: color
        });
        legendClassesMap[ancestorNode.superClass.value] = color;
      }
      return color;
    }


    async.series(
      [
        // get nodes Classes
        function(callbackSeries) {

          Sparql_OWL.getNodesAncestors(Lineage_sources.activeSource, nodeIds, { excludeItself: 0 }, function(err, result) {
            if (err) {
              return callbackSeries(err);
            }
            hierarchies = result.hierarchies;
            callbackSeries();
          });
        },
//get each node color in legend
        function(callbackSeries) {
          for (var nodeId in hierarchies) {
            var ancestors = hierarchies[nodeId];
            ancestors.forEach(function(ancestor, index) {
              var parent = "#";
              if (index < ancestors.length - 1) {
                parent = ancestors[index + 1].superClass.value;
              }
              var color = getNodeColorInLegend(ancestor, parent);
              newVisJsNodes.push({ id: ancestor.class.value, color: color });


            });

          }
          callbackSeries();
        },
//change vijsNodes Color
        function(callbackSeries) {
          Lineage_classes.lineageVisjsGraph.data.nodes.update(newVisJsNodes);
          callbackSeries();
        },


        //draw legend
        function(callbackSeries) {

          self.drawLegend(legendJsTreeData);
          callbackSeries();
        }

      ], function(err) {

      });
  };


  self.clearLegend = function() {
    $("#Lineage_classes_graphDecoration_legendDiv").html("");
    self.legendMap = {};
  };


  self.drawLegend = function(jstreeData) {
    if (!Config.currentTopLevelOntology) {
      $("#lineage_legendWrapper").css("display", "none");
      return;
    }
    else {
      $("#lineage_legendWrapper").css("display", "block");
    }

    var str = "<div  class='Lineage_legendTypeTopLevelOntologyDiv' style='display: flex;>";


    self.currentLegendDJstreedata[Lineage_sources.activeSource] = jstreeData;
    var options = {
      openAll: true,
      withCheckboxes: true,
      onCheckNodeFn: Lineage_decoration.onLegendCheckBoxes,
      onUncheckNodeFn: Lineage_decoration.onLegendCheckBoxes,
      tie_selection: false
    };
    $("#Lineage_classes_graphDecoration_legendDiv").jstree("destroy").empty();
    $("#Lineage_classes_graphDecoration_legendDiv").html("<div  class='jstreeContainer' style='height: 350px;width:90%'>" +
      "<div id='Lineage_classes_graphDecoration_legendTreeDiv' style='height: 25px;width:100%'></div></div>");
    JstreeWidget.loadJsTree("Lineage_classes_graphDecoration_legendTreeDiv", jstreeData, options, function() {
      $("#Lineage_classes_graphDecoration_legendTreeDiv").jstree(true).check_all();
    });
  };

  self.onLegendCheckBoxes = function() {
    var checkdeTopClassesIds = $("#Lineage_classes_graphDecoration_legendTreeDiv").jstree(true).get_checked();

    var allNodes = Lineage_classes.lineageVisjsGraph.data.nodes.get();
    var newNodes = [];
    allNodes.forEach(function(node) {
      var hidden = true;
      if (node && checkdeTopClassesIds.indexOf(node.legendType) > -1) {
        hidden = false;
      }

      newNodes.push({
        id: node.id,
        hidden: hidden
      });
    });
    Lineage_classes.lineageVisjsGraph.data.nodes.update(newNodes);
  };

  self.onlegendTypeDivClick = function(div, type) {
    self.currentLegendObject = { type: type, div: div };
    self.setGraphPopupMenus();
    var point = div.position();
    point.x = point.left;
    point.y = point.top;
    MainController.UI.showPopup(point, "graphPopupDiv", true);
  };

  self.setGraphPopupMenus = function() {
    var html =
      "    <span  class=\"popupMenuItem\" onclick=\"Lineage_decoration.hideShowLegendType(true);\"> Hide Type</span>" +
      " <span  class=\"popupMenuItem\" onclick=\"Lineage_decoration.hideShowLegendType();\"> Show Type</span>" +
      " <span  class=\"popupMenuItem\" onclick=\"Lineage_decoration.hideShowLegendType(null,true);\"> Show Only</span>";
    $("#graphPopupDiv").html(html);
  };
  self.hideShowLegendType = function(hide, only) {
    if (hide) {
      self.currentLegendObject.div.addClass("Lineage_legendTypeDivHidden");
    }
    else {
      self.currentLegendObject.div.removeClass("Lineage_legendTypeDivHidden");
    }
    var allNodes = Lineage_classes.lineageVisjsGraph.data.nodes.get();
    var newNodes = [];
    var hidden = hide ? true : false;
    allNodes.forEach(function(node) {
      if (only) {
        if (only == "all" || (node && node.legendType == self.currentLegendObject.type)) {
          newNodes.push({
            id: node.id,
            hidden: false
          });
        }
        else {
          newNodes.push({ id: node.id, hidden: true });
        }
      }
      else {
        if (node && node.legendType == self.currentLegendObject.type) {
          newNodes.push({
            id: node.id,
            hidden: hidden
          });
        }
      }
    });
    Lineage_classes.lineageVisjsGraph.data.nodes.update(newNodes);
  };

  self.refreshLegend = function(source) {
    var newJstreeData = [
      {
        id: source,
        text: source,
        parent: "#"
      }
    ];
    if (self.currentLegendDJstreedata[source]) {
      newJstreeData = self.currentLegendDJstreedata[source];
    }

    self.drawLegend(newJstreeData);
  };

  (self.showDecorateDialog = function() {
    $("#smallDialogDiv").dialog("open");
    $("#smallDialogDiv").load("snippets/lineage/lineage_decorateDialog.html", function() {
      $("#lineage_decorate_applyButton").bind("click", Lineage_decoration.decorateNodes);
      common.fillSelectWithColorPalette("lineage_decorate_colorSelect");
      var shapes = ["dot", "square", "box", "text", "diamond", "star", "triangle", "ellipse", "circle", "database", "triangleDown", "hexagon"];
      common.fillSelectOptions("lineage_decorate_shapeSelect", shapes, true);
    });
  }),
    (self.decorateNodes = function() {
      var selection = $("#lineage_decorate_selectionSelect").val();
      var nodes;
      if (selection == "Last added nodes") {
        nodes = Lineage_classes.lineageVisjsGraph.lastAddedNodes;
      }
      else if (selection == "All nodes") {
        nodes = Lineage_classes.lineageVisjsGraph.lastAddedNodes;
      }
      else if (selection == "Selected nodes") {
        nodes = Lineage_selection.selectedNodes;
      }

      $("#smallDialogDiv").dialog("close");
      var newIds = [];

      var color = $("#lineage_decorate_colorSelect").val();
      var shape = $("#lineage_decorate_shapeSelect").val();
      var size = $("#lineage_decorate_sizeInput").val();
      nodes.forEach(function(node) {
        if (!node.data) {
          return;
        }
        var obj = { id: node.id };
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
    });

  return self;
})();

export default Lineage_decoration;

window.Lineage_decoration = Lineage_decoration;
