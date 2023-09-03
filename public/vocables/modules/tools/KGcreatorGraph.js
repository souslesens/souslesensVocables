import common from "../shared/common.js";
import visjsGraphClass from "../graph/VisjsGraphClass.js";

var KGcreatorGraph = (function() {
  var self = {};

  self.groupByClass = function() {
    var nodes=self.mappingVisjsGraph.data.nodes.get();
    var newNodes={}
    var visjsData={nodes:[],edges:[]}
    nodes.forEach(function(node){
      if(!node.data || !node.data.fileName)
        return
      if(!newNodes[node.data.fileName]) {
        newNodes[node.data.fileName] = 1
        visjsData.nodes.push({
          id: node.data.fileName,
          label: node.data.fileName,
          shape: "database",
          color: node.color
        })
      }
        var edgeId=node.data.fileName+"_"+node.id
        visjsData.edges.push({
          id:edgeId,
          from:node.id,
          to :node.data.fileName
        })
    })

    self.mappingVisjsGraph.data.nodes.update(visjsData.nodes)
    self.mappingVisjsGraph.data.edges.update(visjsData.edges)


  };
  self.groupByFile = function() {

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
              color: getColor(item.s),
              data:{
                id: item.s,
                label: item.s,
                fileName:fileName
              }

            });
          }
          if (!existingNodes[item.o]) {
            existingNodes[item.o] = 1;
            visjsData.nodes.push({
              id: item.o,
              label: item.o,
              shape: shape,
              color: getColor(item.o),
              data:{
                id: item.s,
                label: item.s,
                fileName:fileName
              }
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
window.KGcreatorGraph=KGcreatorGraph