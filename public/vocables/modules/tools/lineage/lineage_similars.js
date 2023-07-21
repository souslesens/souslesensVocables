import SourceSelectorWidget from "../../uiWidgets/sourceSelectorWidget.js";
import common from "../../shared/common.js";
import SearchUtil from "../../search/searchUtil.js";

self.lineageVisjsGraph;
import Lineage_classes from "./lineage_classes.js";
import Lineage_sources from "./lineage_sources.js";

var Lineage_similars = (function() {
  var self = {};

  self.showDialog = function() {
    $("#smallDialogDiv").dialog("open");
    $("#smallDialogDiv").dialog("option","title","Similars");
    $("#smallDialogDiv").load("snippets/lineage/lineageSimilarsDialog.html");
  };

  self.onChangeSelection = function(value) {
    if (value == "chooseSource") {
      self.showSourcesTree();
      self.mode = "source";
    }
    else {
    self.mode = "whiteboard";

      /*  self.drawWhiteBoardSimilars("graph");
      $("#lineageSimilars_sourcesTreeDiv").html("");*/
    }

  };

  self.showSourcesTree = function() {
    var options = {
      withCheckboxes: false
    };

    SourceSelectorWidget.initWidget(["OWL"], "lineageSimilars_sourcesTreeDiv", false, Lineage_similars.onSourceSelected, Lineage_similars.onValidateSources, options);
  };

  self.onSourceSelected = function(evt, obj) {
    self.currentSource = obj.node.id;
    // self.drawSourceSimilars(source);
  };
  self.onValidateSources = function() {
  };

  self.drawSimilars = function() {
    if ((self.mode = "source")) {
      if(!self.currentSource)
        return alert( "no source selected")
      self.drawSourceSimilars(self.currentSource);
      $("#smallDialogDiv").dialog("close");
    }
    if ((self.mode = "whiteboard")) {
      self.drawWhiteBoardSimilars();
      $("#smallDialogDiv").dialog("close");
    }

  };

  self.drawSourceSimilars = function(source) {

    Lineage_sources.registerSource(source, function(err, result) {

      var nodes=self.getStartingNodes()
      var whiteboardLabelsMap = {};
      nodes.forEach(function(node) {
        if (node.data.label) {
          whiteboardLabelsMap[node.data.label] = { fromNode: node, similars: [] };
          whiteboardLabelsMap[node.data.label.toLowerCase()] = { fromNode: node, similars: [] };
        }
      });

      var size = 100;
      var nodelabels = Object.keys(whiteboardLabelsMap);
      var slices = common.array.slice(nodelabels, size);
      var elasticIndex = source.toLowerCase();
      var indexes = [elasticIndex];
      var similarNodesArray = [];
      var currentWordsCount = 0;
      var offset = 0;
      async.eachSeries(
        slices,
        function(words, callbackEach) {
          currentWordsCount += words.length;
          SearchUtil.getElasticSearchMatches(words, indexes, "exactMatch", 0, words.length, {}, function(err, result) {
            if (err) {
              return callbackEach(err);
            }

            result.forEach(function(item) {
              if (item.error) {
                return callbackEach(err);
              }
              item.hits.hits.forEach(function(hit) {
                hit._source.index = hit._index;
                whiteboardLabelsMap[hit._source.label].similars.push(hit._source);
              });
            });

            callbackEach();
          });
        },
        function(err) {
          if (err) {
            return alert(err.reason);
          }
          var existingNodes = Lineage_classes.lineageVisjsGraph.getExistingIdsMap();

          var visjsData = { nodes: [], edges: [] };
          for (var label in whiteboardLabelsMap) {
            var whiteboardNode = whiteboardLabelsMap[label];

            whiteboardNode.similars.forEach(function(similar) {
              if (!existingNodes[similar.id]) {
                existingNodes[similar.id] = 1;
                visjsData.nodes.push({
                  id: similar.id,
                  label: similar.label,
                  shape: Lineage_classes.defaultShape,
                  color: Lineage_classes.getSourceColor(source),
                  size: Lineage_classes.defaultShapeSize,
                  data: {
                    id: similar.id,
                    label: similar.label,
                    source: source
                  }
                });
              }
              var edgeId = whiteboardNode.fromNode.id + "_" + similar.id;
              var inverseEdgeId = similar.id + "_" + whiteboardNode.fromNode.id;
              if (!existingNodes[edgeId] && !existingNodes[inverseEdgeId]) {
                existingNodes[edgeId] = 1;

                visjsData.edges.push({
                  id: edgeId,
                  from: whiteboardNode.fromNode.id,
                  to: similar.id,
                  data: {
                    source: Lineage_sources.activeSource,
                    label: "sameLabel"
                  },
                  arrows: {
                    to: {
                      enabled: true,
                      type: "solid",
                      scaleFactor: 0.5
                    },

                    from: {
                      enabled: true,
                      type: "solid",
                      scaleFactor: 0.5
                    }
                  },

                  dashes: true,
                  color: "green",
                  width: 2
                });
              }
            });
          }
          if (visjsData.edges.length == 0) {
            return alert("no similars found in source " + source);
          }
          Lineage_classes.lineageVisjsGraph.data.nodes.update(visjsData.nodes);
          Lineage_classes.lineageVisjsGraph.data.edges.update(visjsData.edges);
        }
      );
    });
  };
self.getStartingNodes=function(){
  var nodes=null;
var selectMode=$("#lineageSimilars_fromSelect").val();
if(selectMode=="AllWhiteboardNodes")
   return Lineage_classes.lineageVisjsGraph.data.nodes.get();


}
  self.drawWhiteBoardSimilars = function(output) {
    var commonNodes = [];
    var existingNodes = Lineage_classes.lineageVisjsGraph.getExistingIdsMap();

    var nodes=self.getStartingNodes()
    if(!nodes)
      return alert ("no nodes to process")
    nodes.forEach(function(node1) {
      if (!node1.data && !node1.data.label) {
        return;
      }
      nodes.forEach(function(node2) {
        if (!node2.data && !node2.data.label) {
          return;
        }
        if (node1.data.id == node2.data.id && node1.data.source == node2.data.source) {
          return;
        }
        if (node1.data.label.toLowerCase().replace(/ /g, "") == node2.data.label.toLowerCase().replace(/ /g, "")) {
          commonNodes.push({ fromNode: node1, toNode: node2 });
        }
        if (node1.label == node2.label) {
          commonNodes.push({ fromNode: node1, toNode: node2 });
        }
      });
    });

    if (output == "graph") {
      var visjsData = { nodes: [], edges: [] };
      commonNodes.forEach(function(item) {
        var edgeId = item.fromNode.id + "_" + item.toNode.id;
        var inverseEdgeId = item.toNode.id + "_" + item.fromNode.id;
        if (!existingNodes[edgeId] && !existingNodes[inverseEdgeId]) {
          existingNodes[edgeId] = 1;

          visjsData.edges.push({
            id: edgeId,
            from: item.fromNode.id,
            to: item.toNode.id,
            data: {
              source: Lineage_sources.activeSource,
              label: "sameLabel"
            },
            arrows: {
              to: {
                enabled: true,
                type: "solid",
                scaleFactor: 0.5
              },

              from: {
                enabled: true,
                type: "solid",
                scaleFactor: 0.5
              }
            },

            dashes: true,
            color: "green",
            width: 2
          });
        }
      });
      Lineage_classes.lineageVisjsGraph.data.edges.update(visjsData.edges);
    }
  };

  return self;
})();

export default Lineage_similars;
window.Lineage_similars = Lineage_similars;
