import Sparql_common from "../sparqlProxies/sparql_common.js";
import Lineage_classes from "../tools/lineage/lineage_classes.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";
import visjsGraph from "../graph/visjsGraph2.js";


var VisjsUtil = (function() {
  var self = {};


  self.getVisjsNode = function(source, id, label, incomingPredicateUri, options) {
    if (!options) {
      options = {};
    }
      var shape, color;
    var str
      if ( str=Config.Lineage.logicalOperatorsMap[incomingPredicateUri]) {
        shape = "circle";
        label = str;
        color = "#eee";
      }
      else {
        shape = options.shape || Lineage_classes.defaultShape;
        color = options.color || Lineage_classes.getSourceColor(source);
      }
      var node={
        id: id,
        label: label,
        shape: shape,
        color: color,
        size: Lineage_classes.defaultShapeSize,
        data: {
          id: id,
          label: label,
          source: source,
          type:options.type
        }
      };
    return node;
  };


  self.getVisjsData = function(source, triples, options) {
    if (!options) {
      options = {};
    }
    var existingNodes = visjsGraph.getExistingIdsMap();
    var visjsData = { nodes: [], edges: [] };

    function addNode(id, label, logicalOperator, color) {
      if (!existingNodes[id]) {
        existingNodes[id] = 1;
        var shape, color;
        if (logicalOperator) {
          shape = "circle";
          label = Config.Lineage.logicalOperatorsMap[logicalOperator];
          color = "#eee";
        }
        else {
          shape = options.subjectShape || Lineage_classes.defaultShape;
          color = color || "grey";
        }
        visjsData.nodes.push({
          id: id,
          label: label,
          shape: shape,
          color: color,
          size: Lineage_classes.defaultShapeSize,
          data: {
            id: id,
            label: label,
            source: source
          }
        });
      }
    }

    triples.forEach(function(item) {
      var label = item.subjectLabel || Sparql_common.getLabelFromURI(item.subject);
      if (!existingNodes[item.subject]) {
        existingNodes[item.subject] = 1;
        visjsData.nodes.push(VisjsUtil.getVisjsNode(source, item.subject, label, item.predicate))
      }
      if (!existingNodes[item.object]) {
        existingNodes[item.object] = 1;
        var label = item.objectLabel || Sparql_common.getLabelFromURI(item.object);
        visjsData.nodes.push(VisjsUtil.getVisjsNode(source, item.object, label))
      }


      var label = item.predicateLabel || Sparql_common.getLabelFromURI(item.predicate);
      var edgeId = item.subject + "_" + item.object;
      if (!existingNodes[edgeId]) {
        existingNodes[edgeId] = 1;
        visjsData.edges.push({
          id: edgeId,
          from: item.subject,
          to: item.object,
          label: label,
          color: options.edgeColor || "red",
          font: { size: 10 },
          arrows: {
            to: {
              enabled: true,
              type: Lineage_classes.defaultEdgeArrowType,
              scaleFactor: 0.5
            }
          }
        });
      }
    });


    return visjsData;


  };

  self.drawTriples = function(source, triples, options) {

    var visjsData = self.getVisjsData(source, triples, options);
    self.drawVisjsData(visjsData);


  };

  self.drawVisjsData = function(visjsData) {
    if (!visjsGraph.isGraphNotEmpty()) {
      Lineage_classes.drawNewGraph(visjsData);
    }
    visjsGraph.data.nodes.add(visjsData.nodes);
    visjsGraph.data.edges.add(visjsData.edges);
    visjsGraph.network.fit();
    $("#waitImg").css("display", "none");
  };

  return self;
})();

export default VisjsUtil;
window.VisjsUtil = VisjsUtil;
