import common from "../shared/common";
import visjsGraphClass from "../graph/VisjsGraphClass";

var KGcreatorGraph = (function() {
  var self = {};

  self.groupByClass = function() {

  };
  self.groupByClass = function() {

  };

  self.loadMappingsJstree = function(mappingObjectsMap) {
    for (var fileName in mappingObjectsMap) {
      var mappingObject = mappingObjectsMap[fileName];
      if (mappingObject.tripleModels) {
        mappingObject.tripleModels.forEach(function(item) {
        });
      }
    }
  };


  self.drawMappings = function(mappingObjectsMap) {
    if (!mappingObjectsMap) {
      mappingObjectsMap = { [self.currentJsonObject.fileName]: self.currentJsonObject };
    }
    var visjsData = { nodes: [], edges: [] };
    var existingNodes = {};
    var shape = "box";
    for (var fileName in mappingObjectsMap) {
      var mappingObject = mappingObjectsMap[fileName];
      if (mappingObject.tripleModels) {
        mappingObject.tripleModels.forEach(function(item) {
          function getColor(str) {
            if (str.indexOf("http") > -1) {
              return "#70ac47";
            }
            if (str.indexOf(":") > -1) {
              return "#0067bb";
            }
            else {
              if (mappingObject.fileName) {
                return common.getResourceColor("mappingFileName", mappingObject.fileName);
              }
              return "#fdbf01";
            }
          }

          if (!existingNodes[item.s]) {
            existingNodes[item.s] = 1;
            visjsData.nodes.push({
              id: item.s,
              label: item.s,
              shape: shape,
              color: getColor(item.s)
            });
          }
          if (!existingNodes[item.o]) {
            existingNodes[item.o] = 1;
            visjsData.nodes.push({
              id: item.o,
              label: item.o,
              shape: shape,
              color: getColor(item.o)
            });
          }
          var edgeId = item.s + item.p + item.o;
          if (!existingNodes[edgeId]) {
            existingNodes[edgeId] = 1;
            visjsData.edges.push({
              id: edgeId,
              from: item.s,
              to: item.o,
              label: item.p,
              // color: getColor(item.o),
              arrows: {
                to: {
                  enabled: true,
                  type: Lineage_whiteboard.defaultEdgeArrowType,
                  scaleFactor: 0.5
                }
              }
            });
          }
        });
      }
    }

    //  var html = "<div id='KGcreator_mappingsGraphDiv' style='width:1100px;height:750px'></div>";
    $("#mainDialogDiv").dialog("open");
    //$("#mainDialogDiv").html(html);
    $("#mainDialogDiv").load("snippets/KGcreator/KGcreatorGraph.html", function() {
      self.mappingVisjsGraph = new visjsGraphClass("KGcreator_mappingsGraphDiv", visjsData, {});
      self.mappingVisjsGraph.draw();

      self.loadMappingsJstree();
    });

  };
  return self;
})();

export default KGcreatorGraph;