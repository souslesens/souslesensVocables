import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Lineage_sources from "./lineage_sources.js";
import VisjsUtil from "../../graph/visjsUtil.js";
self.lineageVisjsGraph
import Lineage_classes from "./lineage_classes.js";
import VisjsGraphClass from "../../graph/VisjsGraphClass.js";


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
      "<" + nodeId + "> (<>|!<>){1," + depth + "} ?o filter (isIri(?o) || isBlank(?o))}}}";


    var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function(err, result) {
      if (err) {
        return callback(err);
      }

      return callback(null, result.results.bindings);
    });

  };


  self.drawNodeAxioms = function(sourceLabel, nodeId, divId, depth) {
    if (!depth) {
      depth = 5;
    }
    $("#nodeInfosWidget_depthSpan").html("" + depth);
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


      var existingNodes = {}; // Lineage_classes.lineageVisjsGraph.getExistingIdsMap();
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
          if (nodesMap[child.obj] && nodesMap[child.obj].parents.indexOf(item.s.value) < 0) {
            nodesMap[child.obj].parents.push(item.s.value);
          }
        });
      }


      // * merge the anonymous class node for conjunction and disjunction with the rdf:list node and label it with either conjunction and disjunction.

      if (true) {
        for (var key in nodesMap) {

          var item = nodesMap[key];


          item.parents.forEach(function(parentId) {
            var parent = nodesMap[parentId];
            if (parent && (parent.p.value.indexOf("intersectionOf") > -1 || parent.p.value.indexOf("unionOf") > -1)) {


              nodesMap[parentId].children = item.children;
              nodesMap[parentId].symbol = Config.Lineage.logicalOperatorsMap[parent.p.value];
              delete nodesMap[key];

            }
          });


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


          if (item.s.value == "eb32302a-be06-400c-af64-12175d47b315") {
            var x = 3;
          }

          if (!existingNodes[item.s.value]) {


            var options = { level: level };
            options.size = 10;
            if (item.sType && item.sType.value.indexOf("roperty") > -1) {
              options.shape = "triangle";
              options.size = 5;
            }
            if (item.sType && item.sType.value.indexOf("Restriction") > -1) {
              options.shape = "ellipse";
              // options.label="∀"
              options.color = "#cb9801";
              options.label = "R";//"∀";
              options.size = 5;
            }else{
              options.color=Lineage_classes.getSourceColor(sourceLabel)
            }


            var node = VisjsUtil.getVisjsNode(sourceLabel, item.s.value, item.sLabel ? item.sLabel.value : Sparql_common.getLabelFromURI(item.s.value), null, options);
            existingNodes[item.s.value] = node;
            node.data.infos = nodesMap[item.s.value];
            visjsData.nodes.push(node);
          }
          else {
            var node2 = existingNodes[item.s.value];
            if (node2 != 1) {
              VisjsUtil.setNodeSymbol(node2, item.symbol);
            }
          }
          if (!targetItem) {
            return;
            if(false) {
              var symbol = Config.Lineage.logicalOperatorsMap["http://www.w3.org/1999/02/22-rdf-syntax-ns#nil"];

              var id = "_nil" + common.getRandomHexaId(5);
              var node = VisjsUtil.getVisjsNode(sourceLabel, id, "", null, { level: level + 1, color: "#eee", shape: "text", label: "" });

              visjsData.nodes.push(node);
              targetItem = { s: { value: id } };
            }

          }
          else {
            if (!existingNodes[targetItem.s.value]) {
              var options = { level: level + 1 };
              options.size = 10;
              options.color = "#00afef";
              if (targetItem.sType && targetItem.sType.value.indexOf("roperty") > -1) {
                options.shape = "triangle";
                options.color = "#70ac47";
                options.size = 5;
              }
              if (targetItem.sType && targetItem.sType.value.indexOf("Restriction") > -1) {
                options.shape = "ellipse";
                options.label = "R";//"∀";
                options.color = "#cb9801";
                options.size = 5;
              }
              options.symbol = Config.Lineage.logicalOperatorsMap[targetItem.s.value];

              var node = VisjsUtil.getVisjsNode(sourceLabel, targetItem.s.value, targetItem.sLabel ? targetItem.sLabel.value : Sparql_common.getLabelFromURI(targetItem.s.value), null, options);
              existingNodes[targetItem.s.value] = node;
              node.data.infos = nodesMap[targetItem.s.value];
              visjsData.nodes.push(node);
            }

            recurse(targetItem.s.value, level + 1);
          }
          var edgeId = item.s.value + "_" + targetItem.s.value;

          var edgeLabel = Config.Lineage.logicalOperatorsMap[child.pred];


          if (!existingNodes[edgeId]) {
            existingNodes[edgeId] = 1;
            visjsData.edges.push({
              id: edgeId,
              from: item.s.value,
              to: targetItem.s.value,
              label: edgeLabel,
              arrows: {
                to: {
                  enabled: true,
                  type: "solid",
                  scaleFactor: 0.5
                }
              }
            });
          }


        });
      }


      recurse(nodeId, 1);


      var options =
        {
          keepNodePositionOnDrag: true,
         /* physics: {
            enabled:true},*/
          layoutHierarchical: {
            direction: "LR",
            sortMethod: "hubsize",
            //  sortMethod:"directed",
            //    shakeTowards:"roots",
            //  sortMethod:"directed",
            levelSeparation: 130,
            parentCentralization: true,
            shakeTowards: true,
            blockShifting:true,

            nodeSpacing: 60
          }
          , edges: {
            smooth: {
              // type: "cubicBezier",
              type: "diagonalCross",
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
      //  Lineage_classes.lineageVisjsGraph.clearGraph();
      var axiomsVisjsGraph=new VisjsGraphClass(graphDiv, visjsData, options);
      axiomsVisjsGraph. draw(function () {

      })
   /*   var axiomsVisjsGraph = Object.create(Lineage_classes.lineageVisjsGraph);
      axiomsVisjsGraph.draw(graphDiv, visjsData, options, function() {

      });*/


    });


  };

  self.onNodeClick = function(node, point, options) {
    /*  $("#nodeInfosWidget_tabsDiv").tabs("option", "active", 0);
      NodeInfosWidget.drawAllInfos(node.data.source, node.data.id);*/
    if (!node) {
      return $("#nodeInfosWidget_HoverDiv").css("display", "none");
    }

    self.showNodeInfos(node, point, options);

  };
  self.showGraphPopupMenu = function(node, point, options) {

  };

  self.selectNodesOnHover = function(node, point, options) {


  };


  self.showNodeInfos = function(node, point, options) {
    var html = "<table >";

    var infos = node.data.infos;

    html += "<tr><td>uri</td><td>" + infos.s.value + "</td></tr>";
    if (infos.sLabel) {
      html += "<tr><td>label</td><td>" + infos.sLabel.value + "</td></tr>";
    }
    if (infos.sType) {
      html += "<tr><td>type</td><td>" + infos.sType.value + "</td></tr>";
    }


    html += "<tr style='border: #0e0e0e 1px solid'><td>children</td><td>";
    infos.children.forEach(function(item, index) {
      if (index > 0) {
        html += "<br>";
      }
      html += item.pred + "<b>-></b>" + item.obj;

    });
    html += "</td</tr>";


    html += "<tr style='border: #0e0e0e 1px solid'><td>ancestors</td><td>";
    infos.parents.forEach(function(item, index) {
      if (index > 0) {
        html += "<br>";
      }
      html += item;
    });
    html += "</td</tr>";


    html += "</table>";

    $("#nodeInfosWidget_HoverDiv").css("top", point.y);
    $("#nodeInfosWidget_HoverDiv").css("left", point.x);
    $("#nodeInfosWidget_HoverDiv").html(html);
    $("#nodeInfosWidget_HoverDiv").css("display", "block");
  };


  self.changeDepth = function(depth) {
    self.drawNodeAxioms(self.context.sourceLabel, self.context.nodeId, self.context.divId, self.context.depth + depth);
  };

  return self;
})();

export default Lineage_axioms;
window.Lineage_axioms = Lineage_axioms;
