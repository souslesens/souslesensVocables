import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Lineage_sources from "./lineage_sources.js";
import VisjsUtil from "../../graph/visjsUtil.js";
import visjsGraph from "../../graph/visjsGraph2.js";
import Lineage_classes from "./lineage_classes.js";


var Lineage_axioms = (function() {
  var self = {};


  self.getNodeAxiomsTree = function(sourceLabel, nodeId, depth, callback) {
    var fromStr = Sparql_common.getFromStr(sourceLabel);

    var filterStr = "";// Sparql_common.setFilter("x", nodeIds);

    var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
      "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +

      "select  ?s ?p ?o ?sLabel ?oLabel ?pLabel ?sType ?oType" + fromStr + " where {" +
      " ?s ?p ?o. filter (?p !=rdf:type) " +

      "  optional {?s rdfs:label ?sLabel}\n" +
      "        optional {?o rdfs:label ?oLabel}\n" +
      "   optional {?s rdf:type ?sType}\n" +
      "   optional {?o rdf:type ?oType}\n" +
      "      optional {?p rdfs:label ?pLabel}" +
      " {SELECT distinct ?o " + fromStr + "  WHERE {" +
      "<" + nodeId + "> (<>|!<>){1," + depth + "} ?o filter (isIri(?o))}}}";


    var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function(err, result) {
      if (err) {
        return callback(err);
      }

      return callback(null, result.results.bindings);
    });

  };


  self.processAxioms = function(sourceLabel, nodeId, divId, depth) {
    if (!depth) {
      depth = 5;
    }

    self.context = {
      sourceLabel: sourceLabel,
      nodeId: nodeId,
      divId: divId,
      depth: depth
    };

    if (!nodeId) {
      nodeId = "https://purl.industrialontologies.org/ontology/core/Core/BuyingBusinessProcess";
    }

    var sourceLabel = Lineage_sources.activeSource;

    self.getNodeAxiomsTree(sourceLabel, nodeId, depth, function(err, result) {

      var axiomsTriples = {};


      var existingNodes = {}; // visjsGraph.getExistingIdsMap();
      var visjsData = { nodes: [], edges: [] };


      var nodesMap = {};
      var nodesToMap = {};
      var startingNodes = {};
      result.forEach(function(item) {
        if (!nodesMap[item.s.value]) {
          item.children = [];
          item.parents = [];
          nodesMap[item.s.value] = item;

        }


        nodesMap[item.s.value].children.push({ pred: item.p.value, obj: item.o.value });


      });

      for (var key in nodesMap) {
        var item = nodesMap[key];
        item.children.forEach(function(child) {
          if( nodesMap[child.obj])
          nodesMap[child.obj].parents.push(item.s.value)
        })
      }


      // * merge the anonymous class node for conjunction and disjunction with the rdf:list node and label it with either conjunction and disjunction.

      if (true) {
        for (var key in nodesMap) {

          var item = nodesMap[key];


            item.parents.forEach(function(parentId) {
              var parent = nodesMap[parentId];
              if (parent && (parent.p.value.indexOf("intersectionOf") > -1 || parent.p.value.indexOf("unionOf") > -1)) {


              nodesMap[parentId].children=item.children
              nodesMap[parentId].symbol = Config.Lineage.logicalOperatorsMap[parent.p.value];
              delete nodesMap[key];

              }
            });


        }
      }

      if (false) {
        for (var key in nodesMap) {

          var item = nodesMap[key];
          if (item && (item.p.value.indexOf("intersectionOf") > -1 || item.p.value.indexOf("unionOf") > -1)) {
            item.children.forEach(function(childId) {
              var child = nodesMap[childId.obj];
              if(child.children.length!=2)
                var x=3
              item.children = child.children || [];
              delete nodesMap[childId.obj];
              item.symbol = Config.Lineage.logicalOperatorsMap[item.p.value];

            });
          }

        }
      }


      var data = [];
      var uniqueIds = {};

      function recurse(nodeId, level) {
        if (uniqueIds[nodeId]) {
          return;
        }
        uniqueIds[nodeId] = 1;
        var item = nodesMap[nodeId];

        item.children.forEach(function(child) {

          var targetItem = nodesMap[child.obj];
          if (!targetItem) {
            return;
          }


          if (!existingNodes[item.s.value]) {


            var options = { level: level };
            options.size = 10;
            if (item.sType && item.sType.value.indexOf("roperty") > -1) {
              options.shape = "triangle";
            }
            if (item.sType && item.sType.value.indexOf("Restriction") > -1) {
              options.shape = "ellipse";
              // options.label="∀"
              options.color = "#cb9801";
              options.label = "R";//"∀";
            }


            var node = VisjsUtil.getVisjsNode(sourceLabel, item.s.value, item.sLabel ? item.sLabel.value : Sparql_common.getLabelFromURI(item.s.value), null, options);
            existingNodes[item.s.value] = node;
            visjsData.nodes.push(node);
          }
          else {
            var node2 = existingNodes[item.s.value];
            if (node2 != 1) {
              VisjsUtil.setNodeSymbol(node2, item.symbol);
            }
          }
          if (!existingNodes[targetItem.s.value]) {
            var options = { level: level + 1 };
            options.size = 10;
            options.color = "#00afef";
            if (targetItem.sType && targetItem.sType.value.indexOf("roperty") > -1) {
              options.shape = "triangle";
              options.color = "#70ac47";
            }
            if (targetItem.sType && targetItem.sType.value.indexOf("Restriction") > -1) {
              options.shape = "ellipse";
              options.label = "R";//"∀";
              options.color = "#cb9801";
            }

            var node = VisjsUtil.getVisjsNode(sourceLabel, targetItem.s.value, targetItem.sLabel ? targetItem.sLabel.value : Sparql_common.getLabelFromURI(targetItem.s.value), null, options);
            existingNodes[targetItem.s.value] = node;
            visjsData.nodes.push(node);
          }
          var edgeId = item.s.value + "_" + targetItem.s.value;

          if (!existingNodes[edgeId]) {
            existingNodes[edgeId] = 1;
            visjsData.edges.push({
              id: edgeId,
              from: item.s.value,
              to: targetItem.s.value,
              //  label: Sparql_common.getLabelFromURI(child.pred),
              arrows: {
                to: {
                  enabled: true,
                  type: "solid",
                  scaleFactor: 0.5
                }
              }
            });
          }

          recurse(targetItem.s.value, level + 1);

        });
      }


      recurse(nodeId, 1);


      var options =
        {
          layoutHierarchical: {
            direction: "LR",
            sortMethod: "hubsize",
            //  sortMethod:"directed",
            //    shakeTowards:"roots",
            //  sortMethod:"directed",
            levelSeparation: 130,
            parentCentralization: true,
            shakeTowards: true,

            nodeSpacing: 60
          }
          , edges: {
            smooth: {
              type: "cubicBezier",
              forceDirection: "horizontal",

              roundness: 0.4
            }
          },
          onclickFn: Lineage_axioms.onNodeClick,
          onRightClickFn: Lineage_axioms.showGraphPopupMenu,
          onHoverNodeFn: Lineage_axioms.selectNodesOnHover

        };


      var graphDiv = "axiomsGraphDiv";
      $("#divId").html("<div id='" + graphDiv + "' style='width:800px;height:600px'></div>");
      visjsGraph.clearGraph();
      visjsGraph.draw(graphDiv, visjsData, options, function() {

      });


    });


  };

  self.onNodeClick = function(node, point, options) {
    $("#nodeInfosWidget_tabsDiv").tabs("option", "active", 0);
    NodeInfosWidget.drawAllInfos(node.data.source, node.data.id);

  };
  self.showGraphPopupMenu = function(node, point, options) {

  };

  self.changeDepth = function(depth) {
    self.processAxioms(self.context.sourceLabel, self.context.nodeId, self.context.divId, self.context.depth + depth);
  };

  return self;
})();

export default Lineage_axioms;
window.Lineage_axioms = Lineage_axioms;
