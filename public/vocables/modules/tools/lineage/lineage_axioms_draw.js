import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Lineage_sources from "./lineage_sources.js";
import VisjsUtil from "../../graph/visjsUtil.js";

import Lineage_classes from "./lineage_classes.js";
import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import common from "../../shared/common.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import PromptedSelectWidget from "../../uiWidgets/promptedSelectWidget.js";
import Lineage_axioms_create from "./lineage_axioms_create.js";
import MainController from "../../shared/mainController.js";

var Lineage_axioms_draw = (function() {
  var self = {};
  self.currentSource = null;
  self.defaultGraphDiv = "axiomsDrawGraphDiv";
  self.defaultNodeColor="#ccc"
  self.defaultNodeSize=7;


  var defaultDepth = 3;


  self.getNodeAxioms = function(sourceLabel, nodeId, depth, options, callback) {
    if (!options) {
      options = {};
    }
    var fromStr = Sparql_common.getFromStr(sourceLabel);
    var filterObjTypeStr = "";
    var filterSubTypeStr = "";
    if (options.excludeRestrictions) {
      filterSubTypeStr = " filter (?sType != owl:Restriction) ";
      filterObjTypeStr = " filter (?oType != owl:Restriction) ";

    }

    var graphUris=Config.sources[sourceLabel].imports.concat(sourceLabel)
    var filterGraphStr=Sparql_common.setFilter(("g",graphUris))

   /* var query =
      "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
      "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
      "select  ?s ?p ?o ?sLabel ?oLabel ?pLabel ?sType ?oType" +
      fromStr +
      " where {" +
      " ?s ?p ?o. filter (?p !=rdf:type) " +
      "  optional {?s rdfs:label ?sLabel}\n" +
      "        optional {?o rdfs:label ?oLabel}\n" +
      "   optional {?s rdf:type ?sType" + filterSubTypeStr + "}\n" +
      "   optional {?o rdf:type ?oType" + filterObjTypeStr + "}\n" +
      "      optional {?p rdfs:label ?pLabel} " +
      "  {SELECT distinct ?o " +
      fromStr +
      "  WHERE {" +
      "<" +
      nodeId +
      "> (<>|!<>){1," +
      depth +
      "} ?o filter (isIri(?o) || isBlank(?o))}}}";*/

    var query =
      "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
      "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
      "select ?g ?s ?p ?o ?sLabel ?oLabel ?pLabel ?sType ?oType" +
      fromStr +
      " where {" +
      " ?s ?p ?o. filter (?p !=rdf:type) " +
      "  optional {?s rdfs:label ?sLabel}\n" +
      "        optional {?o rdfs:label ?oLabel}\n" +
      "   optional {?s rdf:type ?sType" + filterSubTypeStr + "}\n" +
      "   optional {?o rdf:type ?oType" + filterObjTypeStr + "}\n" +
      "      optional {?p rdfs:label ?pLabel} " +
      "  {SELECT distinct ?g ?o " +
      fromStr +
     // "  WHERE {GRAPH ?g {" +
      "  WHERE { {" +
      "<" +
      nodeId +
      "> (<>|!<>){1," +
      depth +
      "} ?o filter (isIri(?o) || isBlank(?o))" +
    //  filterGraphStr +
      "}}}}";


    var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function(err, result) {
      if (err) {
        return callback(err);
      }

      return callback(null, result.results.bindings);
    });
  };

  self.drawNodeAxioms = function(sourceLabel, nodeId, divId, depth, options) {





    if (!options) {
      options = {};
    }
    if (!depth) {
      depth = defaultDepth;
    }
    $("#axiomsDraw_depthSpan").html("" + depth);
    var excludeRestrictions = !$("#axiomsDraw_restrictionsCBX").prop("checked");

    options.excludeRestrictions = excludeRestrictions;

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

    self.getNodeAxioms(sourceLabel, nodeId, depth, options, function(err, result) {

      if (result.length==0) {//new resource

        return self.drawNodeWithoutAxioms(sourceLabel, nodeId);
      }


      var axiomsTriples = {};

      var existingNodes = {};
      if (options.addToGraph) {
        existingNodes = self.axiomsVisjsGraph.getExistingIdsMap();
      }
      else {
        existingNodes = {};
      }
      var visjsData = { nodes: [], edges: [] };

      var nodesMap = {};
      var nodesToMap = {};
      var startingNodes = {};

      result.forEach(function(item) {

        if (item.s.value == "35ea6a40-2d87-4e9e-90d9-3e6c8de68d9c") {
          var x = 3;
        }


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
      var nodesToDelete = [];
      if (true) {
        for (var key in nodesMap) {
          var item = nodesMap[key];

          item.parents.forEach(function(parentId) {

            var parent = nodesMap[parentId];
            if (parent && parent.s.value != nodeId && parent.p && (parent.p.value.indexOf("intersectionOf") > -1 || parent.p.value.indexOf("unionOf") > -1)) {
              nodesMap[parentId].children = item.children;
              nodesMap[parentId].symbol = Config.Lineage.logicalOperatorsMap[parent.p.value];
              delete nodesMap[key];
              nodesToDelete.push(key);
            }
          });
        }
      }

      var data = [];
      var uniqueIds = {};

      var edgeStyles = {

        property: {
          color: "#3a773a",
          dashes:  [8, 2]
        },
        default: {
          color: "#888",
          dashes: false
        },

        restriction: {
          color: "#cb6601",
          dashes: [2, 2]
        }

      };

      function recurse(nodeId, level) {

        if (nodeId == "35ea6a40-2d87-4e9e-90d9-3e6c8de68d9c") {
          var x = 3;
        }


        if (uniqueIds[nodeId]) {
          return;
        }
        uniqueIds[nodeId] = 1;
        var item = nodesMap[nodeId];

        if (nodesToDelete.indexOf(nodeId) > -1) {
          return;
        }

        item.children.forEach(function(child) {
          var targetItem = nodesMap[child.obj];

          var edgeStyle = "default";
          if (!existingNodes[item.s.value]) {
            var options = { level: level, type: item.sType ? item.sType.value : null };
            options.size = 10;
            if (item.sType && item.sType.value.indexOf("roperty") > -1) {
              edgeStyle = "property";
              options.shape = "triangle";
              options.size = self.defaultNodeSize;
            }
           else if (item.sType && item.sType.value.indexOf("Restriction") > -1) {
              edgeStyle = "restriction";
              options.shape = "box";
              // options.label="∀"
              options.color = "#cb9801";
              options.label = "R"; //"∀";
              options.size = self.defaultNodeSize;
            }
            else {
              options.color =  self.defaultNodeColor;
              options.size = self.defaultNodeSize;
             // options.color = Lineage_classes.getSourceColor(item.g.value || self.defaultNodeColor);
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
            //for leaves
            targetItem = {
              s: { value: item.o.value },
              sType: item.oType ? ({ value: item.oType.value }) : null,
              sLabel: item.oLabel ? ({ value: item.oLabel.value }) : null

            };
          }

          {
            if (targetItem.s.value == "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil") {

              var symbol = Config.Lineage.logicalOperatorsMap["http://www.w3.org/1999/02/22-rdf-syntax-ns#nil"];

              var id = "_nil" + common.getRandomHexaId(5);
              var node = VisjsUtil.getVisjsNode(sourceLabel, id, "", null, { level: level + 1, color: "#eee", shape: "text", label: "" });

              visjsData.nodes.push(node);
              targetItem = { s: { value: id } };
              // return;
            }
            edgeStyle = "default";
            if (!existingNodes[targetItem.s.value]) {
              var options = { level: level + 1, type: targetItem.sType ? targetItem.sType.value : null };
              options.size = 10;
              options.color = "#00afef";
              if (targetItem.sType && targetItem.sType.value.indexOf("roperty") > -1) {
                edgeStyle = "property";
                options.shape = "triangle";
                options.color = "#70ac47";
                options.size = self.defaultNodeSize;
              }
              else if (targetItem.sType && targetItem.sType.value.indexOf("Restriction") > -1) {
                edgeStyle = "restriction";
                options.shape = "box";
                options.label = "R"; //"∀";
                options.color = "#cb9801";
                options.size = self.defaultNodeSize;
              }
            else {
                options.color =  self.defaultNodeColor;
                options.size = self.defaultNodeSize;
              //  options.color = Lineage_classes.getSourceColor(targetItem.g.value || self.defaultNodeColor);
              }


              options.symbol = Config.Lineage.logicalOperatorsMap[targetItem.s.value];
              var node = VisjsUtil.getVisjsNode(
                sourceLabel,
                targetItem.s.value,
                targetItem.sLabel ? targetItem.sLabel.value : Sparql_common.getLabelFromURI(targetItem.s.value),
                null,
                options
              );

              existingNodes[targetItem.s.value] = node;
              node.data.infos = nodesMap[targetItem.s.value];
              visjsData.nodes.push(node);
            }
            if (targetItem.children) {
              recurse(targetItem.s.value, level + 1);
            }
          }
          var edgeId = item.s.value + "_" + targetItem.s.value;

          var edgeLabel = Config.Lineage.logicalOperatorsMap[child.pred];

          if (!existingNodes[edgeId]) {
            existingNodes[edgeId] = 1;

            var edge = {
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
            };
            for (var key in edgeStyles[edgeStyle]) {
              edge[key] = edgeStyles[edgeStyle][key];
            }
            if(existingNodes[targetItem.s.value].level<= existingNodes[item.s.value].level) {
              edge.color = "#6363f1"
              edge.dashes = "[5,5]"
            }

            visjsData.edges.push(edge);

          }
        });
      }

      recurse(nodeId, options.level || 1);


      //get nodes SourceColor
    var nodes = [];
      visjsData.nodes.forEach(function(item) {
        nodes.push(item.data.id);
      });

      var colorsMap = {};
      var sources = [];
      var otherSources = [];
      Sparql_OWL.getNodesGraphUri(sourceLabel, nodes, null, function(err, result) {
        if (err) {
          return alert(err.repsonseText);
        }
        result.forEach(function(item) {
          var nodeSource = Sparql_common.getSourceFromGraphUri(item.g.value);
          if (nodeSource !=sourceLabel && Config.sources[sourceLabel].imports.indexOf(nodeSource) < 0) {
            if(otherSources.indexOf(nodeSource)<0)
            otherSources.push(nodeSource)
            return;
          }
          if (nodeSource && sources.indexOf(nodeSource) < 0) {
            sources.push(nodeSource);
          }
          var color = Lineage_classes.getSourceColor(nodeSource);
          colorsMap[item.s.value] = color ;
        });

        visjsData.nodes.forEach(function(item, index) {
          var color = colorsMap[item.data.id] || "#ddd";

            visjsData.nodes[index].color = color;


        });


        if (options.addToGraph && self.axiomsVisjsGraph) {
          self.axiomsVisjsGraph.data.nodes.add(visjsData.nodes);
          self.axiomsVisjsGraph.data.edges.add(visjsData.edges);

        }
        else {
          self.drawGraph(visjsData);
        }

        //draw Sources legend
        var html = "";
        sources.forEach(function(source) {
          html += "<div  id='S_" + source + "' style='color: " + Lineage_classes.getSourceColor(source) +
            "' class='Lineage_sourceLabelDiv'>" + source + "</div>";
        });
     /*   html+="other sources <select id='axiomsDraw_otherSourcesSelect'></select>"
        common.fillSelectOptions("axiomsDraw_otherSourcesSelect",otherSources)*/
        $("#axiomsGraphLegendDiv").html(html);

      });


   });
  };

  self.drawGraph = function(visjsData) {
    var xOffset = 60;
    var yOffset = 130;
    xOffset = parseInt($("#axiomsDraw_xOffset").val());
    yOffset = parseInt($("#axiomsDraw_yOffset").val());
    var options = {
      keepNodePositionOnDrag: true,
      /* physics: {
     enabled:true},*/
      layoutHierarchical: {
        direction: "LR",
        sortMethod: "hubsize",
        //  sortMethod:"directed",
        //    shakeTowards:"roots",
        //  sortMethod:"directed",
        levelSeparation: xOffset,
        parentCentralization: true,
        shakeTowards: true,
        blockShifting: true,

        nodeSpacing: yOffset
      },
      edges: {
        smooth: {
          // type: "cubicBezier",
          type: "diagonalCross",
          forceDirection: "horizontal",

          roundness: 0.4
        }
      },
      onclickFn: Lineage_axioms_draw.onNodeClick,
      onRightClickFn: Lineage_axioms_draw.showGraphPopupMenu,
      onHoverNodeFn: Lineage_axioms_draw.selectNodesOnHover
    };

    var graphDivContainer = "axiomsGraphDivContainer";
    $("#" + graphDivContainer).html("<div id='axiomsGraphDiv' style='width:100%;height:100%' onclick='MainController.UI.hidePopup(\"axioms_graphPopupDiv\")';></div>");
    self.axiomsVisjsGraph = new VisjsGraphClass("axiomsGraphDiv", visjsData, options);
    self.axiomsVisjsGraph.draw(function() {
    });
  };

  self.onNodeClick = function(node, point, nodeEvent) {
    /*  $("#nodeInfosWidget_tabsDiv").tabs("option", "active", 0);
  NodeInfosWidget.drawAllInfos(node.data.source, node.data.id);*/
    self.currentGraphNode = node;
    if (nodeEvent.ctrlKey && nodeEvent.shiftKey) {
      var options = { addToGraph: 1, level: self.currentGraphNode.level };
      return self.drawNodeAxioms(self.context.sourceLabel, self.currentGraphNode.data.id, self.context.divId, 2, options);
    }


    if (!node) {
      return $("#nodeInfosWidget_HoverDiv").css("display", "none");
    }
    else {
      self.currentGraphNode = node;
    }

    self.showNodeInfos(node, point, options);
  };
  self.showGraphPopupMenu = function(node, point, options) {
    if (node) {
      self.currentGraphNode = node;
    }
    else {
      return $("#axiomsDrawGraphDiv").html("no entity selected");
    }


    var html = "<div style=\"display: flex;flex-direction: column\">";
    html += "  <span class=\"popupMenuItem\" onclick=\"Lineage_axioms_draw.showNodeInfos ();\"> Infos</span>";
    html += "  <span class=\"popupMenuItem\" onclick=\"Lineage_axioms_draw.hideNode ();\"> Hide</span>";

    html += " <span class=\"popupMenuItem\" onclick=\"Lineage_axioms_draw.drawAxiomsFromNode();\"> Draw  from here</span>";
    //  html += ' <span class="popupMenuItem" onclick="Lineage_axioms_draw.showBranchOnly();"> ShowBranchOnly</span>'
    if (Lineage_sources.isSourceEditableForUser(self.currentGraphNode.data.source)) {
      html += "  <span class=\"popupMenuItem\" onclick=\"Lineage_axioms_create.showAdAxiomDialog ('axioms_dialogDiv');\"> <b>Add Axiom</b></span>";
      html += " <span class=\"popupMenuItem\" onclick=\"Lineage_axioms_create.deleteGraphSelectedAxiom();\"> Delete </span>";
    }

    html += "</div>";

    //  MainController.UI.showPopup(point, "axioms_graphPopupDiv");
    var popupDiv = "axioms_graphPopupDiv";

    $("#" + popupDiv).css("display", "flex");
    $("#" + popupDiv).css("left", point.x);
    $("#" + popupDiv).css("top", point.y);
    $("#" + popupDiv).html(html);

  };


  /*  self.showBranchOnly=function(){
        var nodeId=self.currentGraphNode.data.id
        var edges=self.axiomsVisjsGraph.data.edges.get();

        var nodesToShow=[]
       function recurse(nodeId) {
           edges.forEach(function(edge) {
               if (edge.from == nodeId )
                 })
       }

    }*/


  self.drawAxiomsFromNode = function() {
    var options = { addToGraph: 1, level: self.currentGraphNode.level };
    self.drawNodeAxioms(self.context.sourceLabel, self.currentGraphNode.data.id, self.context.divId, 2, options);
  };
  self.selectNodesOnHover = function(node, point, options) {
  };

  self.hideNode=function(){
    var id=self.currentGraphNode.id
    if(!id)
      return;
    self.axiomsVisjsGraph.data.nodes.update({id:id,hidden:true})
  }

  self.showNodeInfos = function(node, point, options) {
    if (!node) {
      node = self.currentGraphNode;
    }
    if (!point) {
      point = { x: 200, y: 200 };
    }
    if (!options) {
      options = {};
    }


    var html = "<table >";

    html += "<tr><td>uri</td><td>" + node.data.id + "</td></tr>";
    if (node.data.label) {
      html += "<tr><td>label</td><td>" + node.data.label + "</td></tr>";
    }
    if (node.data.type) {
      html += "<tr><td>type</td><td>" + node.data.type + "</td></tr>";
    }
    var infos = node.data.infos;
    if (infos) {
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
    }

    html += "</table>";

    $("#nodeInfosWidget_HoverDiv").css("top", point.y);
    $("#nodeInfosWidget_HoverDiv").css("left", point.x);
    $("#nodeInfosWidget_HoverDiv").html(html);
    $("#nodeInfosWidget_HoverDiv").css("display", "block");
  };

  self.changeDepth = function(depth) {
    self.drawNodeAxioms(self.context.sourceLabel, self.context.nodeId, self.context.divId, self.context.depth + depth);
  };

  self.drawNodeWithoutAxioms = function(sourceLabel, nodeId) {
    Sparql_OWL.getAllTriples(sourceLabel, "subject", [nodeId], {}, function(err, result) {
      if (err) {
        return alert(err.responseText);
      }
      var visjsData = { nodes: [], edges: [] };
      var nodeLabel = "";
      var nodeTypes = [];
      result.forEach(function(item) {
        if (item.predicate.value.indexOf("label") > -1) {
          nodeLabel = item.object.value;
        }
        if (item.predicate.value.indexOf("type") > -1) {
          nodeTypes.push(item.object.value);
        }
      });
      var options = {
        level: 1,
        type: nodeTypes
      };
      var node = VisjsUtil.getVisjsNode(sourceLabel, nodeId, nodeLabel || Sparql_common.getLabelFromURI(nodeId), null, options);

      visjsData.nodes.push(node);

      self.drawGraph(visjsData);
    });
  };


  self.exportCSV = function() {
    Export.exportGraphToDataTable(self.axiomsVisjsGraph, "axioms_dialogDiv");
  };

  self.exportSVG = function() {
    self.axiomsVisjsGraph.toSVG();
  };


  return self;
})();

export default Lineage_axioms_draw;
window.Lineage_axioms_draw = Lineage_axioms_draw;
