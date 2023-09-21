import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Lineage_sources from "./lineage_sources.js";
import VisjsUtil from "../../graph/visjsUtil.js";

import Lineage_whiteboard from "./lineage_whiteboard.js";
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
  self.defaultNodeColor = "#ccc";
  self.defaultNodeSize = 7;
  var props = [
    "<http://www.w3.org/2002/07/owl#complementOf>",
    "<http://www.w3.org/2002/07/owl#disjointWith>",
    "<http://www.w3.org/2002/07/owl#disjointUnionOf>",
    "<http://www.w3.org/2002/07/owl#hasKey>",
    "<http://www.w3.org/2002/07/owl#equivalentClass>",
    "<http://www.w3.org/2002/07/owl#unionOf>",
    "<http://www.w3.org/2002/07/owl#intersectionOf>",
    "<http://www.w3.org/2002/07/owl#oneOf>",
    "<http://www.w3.org/2000/01/rdf-schema#subClassOf>",
    "<http://www.w3.org/2002/07/owl#onProperty>",
    "<http://www.w3.org/2002/07/owl#allValuesFrom>",
    "<http://www.w3.org/2002/07/owl#hasValue>",
    "<http://www.w3.org/2002/07/owl#someValuesFrom>",
    "<http://www.w3.org/2002/07/owl#minCardinality>",
    "<http://www.w3.org/2002/07/owl#maxCardinality>",
    "<http://www.w3.org/2002/07/owl#cardinality>",
    "<http://www.w3.org/2002/07/owl#maxQualifiedCardinality>",
    "<http://www.w3.org/2002/07/owl#onDataRange>",
    "<http://www.w3.org/2002/07/owl#onProperties>",
    "<http://www.w3.org/2002/07/owl#onClass>",
    "<http://www.w3.org/2002/07/owl#qualifiedCardinality>",
    "<http://www.w3.org/2002/07/owl#hasSelf>",
    "<http://www.w3.org/2002/07/owl#minQualifiedCardinality>",
    "<http://www.w3.org/1999/02/22-rdf-syntax-ns#first>",
    "<http://www.w3.org/1999/02/22-rdf-syntax-ns#rest>",
    "<http://www.w3.org/1999/02/22-rdf-syntax-ns#List>",
    "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>"
    // "rdfs:member"
  ];
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

    var sources = [sourceLabel];

    if (Config.sources[sourceLabel] && Config.sources[sourceLabel].imports) {
      sources = sources.concat(Config.sources[sourceLabel].imports);
    }
    sources.forEach(function(source) {
      if (Config.sources[sourceLabel].graphUri) {
        sources.push(Config.sources[sourceLabel].graphUri);
      }
    });
    var graphUris = [];
    var filterGraphStr = Sparql_common.setFilter(("g", graphUris));

    var filterTypePropertyStr = ""; // " filter (?p !=rdf:type) ";
    if (options.includeTypeProperty) {
      filterTypePropertyStr = "  ";
    }

    var includeIncomingTriplesStr = "";
    if (options.includeIncomingTriples) {
      includeIncomingTriplesStr = "  UNION  {<" + nodeId + ">  ^(<>|!<>){1," + depth + "} ?o filter (isIri(?o) || isBlank(?o))} ";
    }

    var filterProps = Sparql_common.setFilter("p", props);

    var query =
      "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
      "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
      "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
      "select   ?s ?p ?o  ?sLabel ?oLabel " +
      "(GROUP_CONCAT( distinct ?oType;separator=\",\") as ?oTypes) (GROUP_CONCAT( distinct ?sType;separator=\",\") as ?sTypes) " +
      fromStr +
      " where {{" +
      " ?s ?p ?o." +
      " filter (isIri(?o) || isBlank(?o))  filter (?o not in(<http://www.w3.org/2002/07/owl#NamedIndividual>," +
      " <http://www.w3.org/2002/07/owl#Class>,<http://www.w3.org/2002/07/owl#ObjectProperty>,<http://www.w3.org/2002/07/owl#Restriction>)) " +
      filterTypePropertyStr +
      filterProps +
      "  optional {?s rdfs:label ?sLabel}" +
      "        optional {?o rdfs:label ?oLabel}" +
      "   optional {?o rdf:type ?oType" +
      filterObjTypeStr +
      "}" +
      "   optional {?s rdf:type ?sType" +
      filterSubTypeStr +
      "}" +
      "      optional {?p rdfs:label ?pLabel} " +
      "}" +
      "UNION {" +
      " ?s ?p ?o. filter (?p!= rdf:type)" +
      "?s rdf:type ?sType filter (?sType != owl:Restriction)" +
      "}" +
      "  {SELECT distinct  ?s " +
      fromStr +
      "  WHERE { {" +
      "<" +
      nodeId +
      "> (<>|!<>){0," +
      depth +
      "}" +
      " ?s filter (isIri(?s) || isBlank(?s))" +
      "filter (?s!=<http://purl.obolibrary.org/obo/bfo.owl> ) " +
      filterProps +
      " }" +
      includeIncomingTriplesStr +
      "}}}" +
      " group by  ?s ?p ?o ?sLabel ?oLabel " +
      " limit " +
      Config.queryLimit;

    var filterProps = ""; //Sparql_common.setFilter("p",props)


    var axiomPredicates =
      "<http://www.w3.org/2002/07/owl#complementOf>|" +
      "<http://www.w3.org/2002/07/owl#disjointWith>|" +
      "<http://www.w3.org/2002/07/owl#disjointUnionOf>|" +
      "<http://www.w3.org/2002/07/owl#hasKey>|" +
      "<http://www.w3.org/2002/07/owl#equivalentClass>|" +
      "<http://www.w3.org/2002/07/owl#unionOf>|" +
      "<http://www.w3.org/2002/07/owl#intersectionOf>|" +
      "<http://www.w3.org/2002/07/owl#oneOf>|" +
      "<http://www.w3.org/2000/01/rdf-schema#subClassOf>";

    axiomPredicates +=
      "|<http://www.w3.org/2002/07/owl#Restriction>|" +
      "<http://www.w3.org/2002/07/owl#onProperty>|" +
      "<http://www.w3.org/2002/07/owl#someValuesFrom>|" +
      "<http://www.w3.org/2002/07/owl#allValuesFrom>|" +
      "<http://www.w3.org/2002/07/owl#hasValue>|" +
      "<http://www.w3.org/2002/07/owl#minCardinality>|" +
      "<http://www.w3.org/2002/07/owl#maxCardinality>|" +
      "<http://www.w3.org/2002/07/owl#cardinality>|" +
      "<http://www.w3.org/2002/07/owl#maxQualifiedCardinalit>|" +
      "<http://www.w3.org/1999/02/22-rdf-syntax-ns#first>|" +
      "<http://www.w3.org/1999/02/22-rdf-syntax-ns#rest>|" +
      "<http://www.w3.org/1999/02/22-rdf-syntax-ns#List>";
    //   "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>"
    // "rdfs:member"

    var query =
      "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \n" +
      "         SELECT distinct  ?s ?p  ?o" +
      " ?sType ?oType  ?sLabel ?pLabel  ?oLabel" +
      " ?sIsBlank ?oIsBlank" +
      " " +
      fromStr +
      "          WHERE {?s (" +
      axiomPredicates +
      "){1,1} ?o0. \n" +
      "          ?s ?p ?o." +
      "  optional{ ?s rdf:type ?sType.}\n" +
      "  optional{    ?o rdf:type ?oType.}\n" +
      "  optional{   ?s rdfs:label ?sLabel.}\n" +
      "  optional{   ?o rdfs:label ?oLabel.}\n" +
      "  optional{    ?p rdfs:label ?pLabel.}" +
      //  "   bind( IF (  isBlank(?s),true,false) as ?sIsBlank)\n" +
      // "  bind( IF (  isBlank(?o),true,false) as ?oIsBlank)" +

      " \n" +
      "  filter ( ?p in (" +
      axiomPredicates.replace(/\|/g, ",") +
      "))\n" +
      "        {  SELECT distinct  ?s ?p0 ?o0    \n" +
      "          WHERE {?s (" +
      axiomPredicates +
      ") ?o0. \n" +
      "               \n" +
      "  }}\n" +
      "}\n" +
      "            limit 10000";

    var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function(err, result) {
      if (err) {
        return callback(err);
      }

      return callback(null, result.results.bindings);
    });
  };

  self.firstOrderLogicAxioms = [
    "http://www.w3.org/2000/01/rdf-schema#subClassOf",
    "http://www.w3.org/2002/07/owl#equivalentClass",
    "http://www.w3.org/2002/07/owl#unionOf",
    "http://www.w3.org/2002/07/owl#intersectionOf",

    "http://www.w3.org/2002/07/owl#disjointWith",
    "http://www.w3.org/2002/07/owl#Restriction",
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#first",
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest"


  ];

  self.drawNodeAxioms = function(sourceLabel, nodeId, divId, depth, options, callback) {
    if (!sourceLabel) {
      sourceLabel = Lineage_sources.activeSource;
    }

    if (!options) {
      options = {};
    }

    options.skipRestrictions = false;

    var allBasicAxioms = {};
    var nodeIdTree = {};
    var visjsData = { nodes: [], edges: [] };
    async.series(
      [
        //get all elementary axioms
        function(callbackSeries) {
          self.getNodeAxioms(sourceLabel, nodeId, depth, options, function(err, result) {
            if (err) {
              return callback(err);
            }
            result.forEach(function(item) {
              if (!allBasicAxioms[item.s.value]) {
                allBasicAxioms[item.s.value] = [];
              }

              var sType = item.sType ? item.sType.value : null;
              var oType = item.oType ? item.oType.value : null;
              var sLabel = item.sLabel ? item.sLabel.value : Sparql_common.getLabelFromURI(item.s.value);
              var pLabel = item.pLabel ? item.pLabel.value : Sparql_common.getLabelFromURI(item.p.value);
              var oLabel = item.oLabel ? item.oLabel.value : Sparql_common.getLabelFromURI(item.o.value);
              var sIsBlank = item.s.type == "bnode";
              var oIsBlank = item.o.type == "bnode";
              allBasicAxioms[item.s.value].push({
                p: item.p.value,
                o: item.o.value,
                sType: sType,
                oType: oType,
                sLabel: sLabel,
                pLabel: pLabel,
                oLabel: oLabel,
                sIsBlank: sIsBlank,
                oIsBlank: oIsBlank
              });
            });
            return callbackSeries();
          });
        },


        //jump axioms  blanknodes
        function(callbackSeries) {

          for (var key in allBasicAxioms) {

            var objects = allBasicAxioms[key];
            var escapeProperties = ["http://www.w3.org/2002/07/owl#equivalentClass", "http://www.w3.org/1999/02/22-rdf-syntax-ns#first", "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest"];
            escapeProperties.forEach(function(escapeProperty) {

              objects.forEach(function(object,index){
              if (object.p == escapeProperty) {
                var jumper = allBasicAxioms[object.o];
                if (jumper) {
                  allBasicAxioms[key][index].o=jumper.o;
                  allBasicAxioms[key][index].oLabel=jumper.oLabel;
                  allBasicAxioms[key][index].oType=jumper.oType;
                }
              }
            });

            })
          }
          callbackSeries();
        },


        //buidtree from nodeId
        function(callbackSeries) {
          var existingNodes = {};


          function recurseTree(node, level) {
            if (!allBasicAxioms[node.s]) {
              return;
            }

            if (existingNodes[node.s]) {
              return;
            }

            existingNodes[node.s] = 1;

            if (!node.objects) {
              node.objects = [];
            }

            allBasicAxioms[node.s].forEach(function(object) {



              if (!object) {
                return;
              }


              if (level == 0) {
                var x = 3;
              }

              if (self.firstOrderLogicAxioms.indexOf(node.p) < 0) {
                return;
              }
              if (!object.objects) {
                object.objects = [];
              }


              object.s = object.o;
              object.parent = node;
              object.incomingProperty = node.p;


              if (false && node.parent && !node.sType) {
                // skip null type->disjonction node
                node.sLabel = node.pLabel;
                node.parent.objects.push(object);
              }
              else {
                object.parent = node;
                node.objects.push(object);
              }

              recurseTree(object, level + 1);
            });
          }

          nodeIdTree = allBasicAxioms[nodeId][0];
          nodeIdTree.s = nodeId;
          /* {
               s: nodeId,
               sLabel: "xx",

               type: "http://www.w3.org/2002/07/owl#Class", //allBasicAxioms[nodeId].sLabel
           };*/
          recurseTree(nodeIdTree, 0);
          return callbackSeries();
        },
        //flatten tree to visjsdata
        function(callbackSeries) {
          var geNodeStyle = function(id, type, label, source) {
            var obj = {
              label: label,
              color: "#00afef",
              shape: "box",
              oedgeStyle: null
            };
            if (!type || !label) {
              return obj;
            }

            if (type.indexOf("roperty") > -1) {
              obj.edgeStyle = "property";
              obj.shape = "triangle";
              obj.color = "#70ac47";
              obj.size = self.defaultNodeSize;
            }

            if (type.indexOf("List") > -1) {
              //    options.edgeStyle  = "property";
              obj.shape = "text";
              obj.color = "#00afef";
              obj.label = "L"; //"∀";
              obj.size = self.defaultNodeSize;
            }
            else if (type.indexOf("Restriction") > -1) {
              obj.edgeStyle = "restriction";
              obj.shape = "box";
              obj.label = "R"; //"∀";
              obj.color = "#cb9801";
              obj.size = self.defaultNodeSize;
            }
            else if (type.indexOf("Individual") > -1) {
              obj.edgeStyle = "individual";
              obj.shape = "star";
              // options.label = "R"; //"∀";
              obj.color = "#blue";
              obj.size = self.defaultNodeSize;
            }
            else {
              //  options.color = Lineage_whiteboard.getSourceColor(targetItem.g.value || self.defaultNodeColor);
            }

            return obj;
          };

          var existingNodes = {};
          var stop = false;

          function recurse(node, level) {
            if (stop) {
              return;
            }
            if (node.s == "http://purl.obolibrary.org/obo/BFO_0000001") {
              //  stop = true;
            }

            if (!existingNodes[node.s]) {
              var style = geNodeStyle(node.s, node.sType, node.sLabel);

              if (node.sIsBlank) {
                // style.label = Config.Lineage.logicalOperatorsMap[node.p];
              }

              existingNodes[node.s] = 1;
              visjsData.nodes.push({
                id: node.s,
                label: style.label,
                shape: style.shape,
                color: style.color,
                size: 8,
                level: level,
                data: {
                  id: node.s,
                  label: node.label,
                  type: node.sType
                }
              });
            }

            if (node.objects) {
              node.objects.forEach(function(parentNode) {
                /*   if (node.incomingProperty && node.incomingProperty.indexOf("disjointWith") > -1) return;
                   if (options.skipRestrictions && parentNode.oType && parentNode.oType.indexOf("Restriction") > -1) {
                       return;
                   }*/

                if (!existingNodes[parentNode.o]) {
                  existingNodes[parentNode.o] = 1;
                  var style = geNodeStyle(parentNode.o, parentNode.oType, parentNode.oLabel);

                  if (parentNode.oIsBlank && (!parentNode.oType || parentNode.oType.indexOf("Restriction") < 0)) {
                    style.label = Config.Lineage.logicalOperatorsMap[parentNode.p];
                  }

                  visjsData.nodes.push({
                    id: parentNode.o,
                    label: style.label,
                    shape: style.shape,
                    color: style.color,
                    size: 8,
                    level: level + 1,
                    data: {
                      id: parentNode.o,
                      label: parentNode.oLabel,
                      type: parentNode.oType
                    }
                  });
                }

                var edgeId = node.s + "_" + parentNode.o;
                var symbol = Config.Lineage.logicalOperatorsMap[parentNode.p] || parentNode.pLabel;

                if (!existingNodes[edgeId]) {
                  existingNodes[edgeId] = 1;
                  visjsData.edges.push({
                    id: edgeId,
                    from: node.s,
                    to: parentNode.o,
                    label: symbol,
                    arrows: {
                      to: {
                        enabled: true,
                        type: "solid",
                        scaleFactor: 0.5
                      }
                    },
                    data: {
                      id: edgeId,
                      from: node.s,
                      to: parentNode.o,
                      label: node.pLabel,
                      type: node.sType
                    }
                  });
                  parentNode.s = parentNode.o;

                  //   if(parentNode.oType && parentNode.oType.indexOf("property")<0)
                  recurse(parentNode, level + 1);
                }
              });
            }
          }

          var level = 0;

          recurse(nodeIdTree, level);
          //   console.log(JSON.stringify(visjsData));
          return callbackSeries();
        },
        //draw graph

        function(callbackSeries) {
          if (options.addToGraph && self.axiomsVisjsGraph) {
            self.axiomsVisjsGraph.data.nodes.add(visjsData.nodes);
            self.axiomsVisjsGraph.data.edges.add(visjsData.edges);
          }
          else {
            self.drawGraph(visjsData);
          }
          return callbackSeries();
        }
      ],

      function(err) {
        if (callback) {
          return callback(err);
        }
      }
    );
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
      visjsOptions: {
        edges: {
          smooth: {
            // type: "cubicBezier",
            type: "diagonalCross",
            forceDirection: "horizontal",

            roundness: 0.4
          }
        }
      },
      onclickFn: Lineage_axioms_draw.onNodeClick,
      onRightClickFn: Lineage_axioms_draw.showGraphPopupMenu,
      onHoverNodeFn: Lineage_axioms_draw.selectNodesOnHover
    };

    var graphDivContainer = "axiomsGraphDivContainer";
    $("#" + graphDivContainer).html("<div id='axiomsGraphDiv' style='width:100%;height:100%' onclick='  PopupMenuWidget.hidePopup(\"axioms_popupMenuWidgetDiv\")';></div>");
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

    // popupMenuWidget.showPopup(point, "axioms_popupMenuWidgetDiv");
    var popupDiv = "axioms_popupMenuWidgetDiv";

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

  self.hideNode = function() {
    var id = self.currentGraphNode.id;
    if (!id) {
      return;
    }
    self.axiomsVisjsGraph.data.nodes.update({ id: id, hidden: true });
  };

  self.showNodeInfos = function(node, point, options) {
    if (!node) {
      node = self.currentGraphNode;
    }

    /*  NodeInfosWidget.showNodeInfos(self.currentSource, node,"smallDialogDiv")

return*/

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

    html = JSON.stringify(
      node.data,
      function(key, value) {
        return value; //.replace(/"/g,"").replace(/,/g,"<br>")
      },
      2
    );

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

  var edgeStyles = {
    property: {
      color: "#3a773a",
      dashes: [8, 2]
    },
    default: {
      color: "#888",
      dashes: false
    },

    restriction: {
      color: "#cb6601",
      dashes: [2, 2]
    },
    individualX: {
      color: "blue",
      dashes: [2, 2]
    }
  };

  return self;
})();

export default Lineage_axioms_draw;
window.Lineage_axioms_draw = Lineage_axioms_draw;
