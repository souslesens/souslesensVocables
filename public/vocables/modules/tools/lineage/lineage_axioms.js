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


var Lineage_axioms = (function() {
  var self = {};
  self.currentSource = null;
  self.defaultGraphDiv = "axiomsGraphDiv";


  self.getNodeAxiomsTree = function(sourceLabel, nodeId, depth, callback) {
    var fromStr = Sparql_common.getFromStr(sourceLabel);

    var filterStr = "";

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
      depth = 3;
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
      if (result.length == 0) {

        return self.drawNodeWithoutAxioms(sourceLabel, nodeId);
      }


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


            var options = { level: level, type: item.sType ? item.sType.value : null };
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
            }
            else {
              options.color = Lineage_classes.getSourceColor(sourceLabel);
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
            if (false) {
              var symbol = Config.Lineage.logicalOperatorsMap["http://www.w3.org/1999/02/22-rdf-syntax-ns#nil"];

              var id = "_nil" + common.getRandomHexaId(5);
              var node = VisjsUtil.getVisjsNode(sourceLabel, id, "", null, { level: level + 1, color: "#eee", shape: "text", label: "" });

              visjsData.nodes.push(node);
              targetItem = { s: { value: id } };
            }

          }
          else {
            if (!existingNodes[targetItem.s.value]) {
              var options = { level: level + 1, type: targetItem.sType ? targetItem.sType.value : null };
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


      self.drawGraph(visjsData);


    });


  };

  self.drawGraph = function(visjsData) {

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
          blockShifting: true,

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


    var graphDivContainer = "axiomsGraphDivContainer";
    $("#" + graphDivContainer).html("<div id='axiomsGraphDiv' style='width:100%;height:100%'></div>");
    var axiomsVisjsGraph = new VisjsGraphClass("axiomsGraphDiv", visjsData, options);
    axiomsVisjsGraph.draw(function() {

    });
  };

  self.onNodeClick = function(node, point, options) {
    /*  $("#nodeInfosWidget_tabsDiv").tabs("option", "active", 0);
      NodeInfosWidget.drawAllInfos(node.data.source, node.data.id);*/

    self.currentGraphNode = node;
    if (!node) {
      return $("#nodeInfosWidget_HoverDiv").css("display", "none");
    }else{self.currentGraphNode = node;}

    self.showNodeInfos(node, point, options);

  };
  self.showGraphPopupMenu = function(node, point, options) {

    if(node)
      self.currentGraphNode = node
    $("#axioms_predicatesDiv").dialog("open");
    var html = " <span class=\"popupMenuItem\" onclick=\"Lineage_axioms.addAxiomDialog();\"> Add Axiom</span>";
    $("#axioms_predicatesDiv").html(html);


  };

  self.selectNodesOnHover = function(node, point, options) {


  };


  self.showNodeInfos = function(node, point, options) {
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

  self.showCreateEntityDialog = function() {

    $("#axioms_predicatesDiv").dialog("open");
    var html = "rdfs:label <input style='width:200px' id='axioms_newPredicateLabel'/>" +
      "<br></br>" +
      "rdf:type <select id='axioms_newPredicateSelect'></select>" +
      "<button onclick='Lineage_axioms.onCreateEntityOK()'>OK</button>";


    $("#axioms_predicatesDiv").html(html);
    var declarations = self.owl2Vocabulary.Declarations;
    common.fillSelectOptions("axioms_newPredicateSelect", declarations, true);


  };

  self.onCreateEntityOK = function() {
    var label = $("#axioms_newPredicateLabel").val();
    var object = $("#axioms_newPredicateSelect").val();
    if (!object) {
      return alert(" rdf:type missing");
    }
    var id = label;
    if (!id) {
      id = common.getRandomHexaId(5);
    }
    var proposedUri = Config.sources[self.currentSource].graphUri + id;
    proposedUri = prompt("Confirm or modify node uri and create entity", proposedUri);
    if (!proposedUri) {
      return;
    }
    var triples = [];
    triples.push({
      subject: proposedUri,
      predicate: "rdf:type",
      object: object
    });
    if (label) {
      triples.push({
        subject: proposedUri,
        predicate: "rdfs:label",
        object: label
      });
    }


    Sparql_generic.insertTriples(self.currentSource, triples, {}, function(err, result) {
      if (err) {
        alert(err.responseText);
      }
      self.drawNodeWithoutAxioms(self.currentSource, proposedUri, label);
      self.context = {
        sourceLabel: self.currentSource,
        nodeId: proposedUri,
        divId: "axiomsGraphDivContainer",
        depth: 1
      };
      $("#axioms_predicatesDiv").dialog("close");

    });

  };

  self.addAxiomDialog = function() {
    var types = self.currentGraphNode.data.type;
    if(!Array.isArray(types))
      types=[types]


    var owlConstraints = Config.ontologiesVocabularyModels["owl"].constraints;
    var rdfsConstraints = Config.ontologiesVocabularyModels["rdfs"].constraints;


    Sparql_OWL.getNodesAncestors("owl", types, {}, function(err, result) {
      if (err) {
        return alert(err.responseText);
      }
      result.forEach(function(item){
        if(types.indexOf(item.superClass.value)<0)
          types.push(item.superClass.value)
      })

      self.possiblePredicates = {};
      for (var key in owlConstraints) {
        if (types.indexOf(owlConstraints[key].domain) > -1) {
          self.possiblePredicates[key] = owlConstraints[key];
        }
      }
      for (var key in rdfsConstraints) {
        if (types.indexOf(rdfsConstraints[key].domain) > -1) {
          self.possiblePredicates[key] = rdfsConstraints[key];
        }
      }

      var html = "Predicate <br></br><select id='axioms_predicateTypeSelect' onchange='Lineage_axioms.onSelectPredicate($(this).val())'></select><br></br>" +
    "Object rdf:type<select id='axioms_objectTypeSelect'></select><br>" +
        "<div id='axioms_objectsDiv'></div>"
        "<button onclick='Lineage_axioms.onCreatePredicateOK()'>OK</button>";


      $("#axioms_predicatesDiv").html(html);
      common.fillSelectOptions("axioms_predicateTypeSelect", Object.keys( self.possiblePredicates), true);
    });

  };

  self.onSelectPredicate=function(predicateId){
    var source=self.currentGraphNode.data.source
    var constraint=self.possiblePredicates[predicateId];
    var range=constraint.range
    common.fillSelectOptions("axioms_objectTypeSelect", [range], true);
    var html="";


    if(range=="http://www.w3.org/1999/02/22-rdf-syntax-ns#List"){
      html+="rdf:first Type <select id='axioms_listFirstTypeSelect' onchange='Lineage_axioms.onSelectListFirstType($(this).val())'>" +
        "<option></option>"+
        "<option value='currentSourceClass'> Class from "+source+" </option>"+
        "<option  value='currentSourceNew'>New Class from "+source+" </option>"+
        "<option  value='axiom'>Axiom</option>"+
        "</select>" +
        "<br><br>"+
        "<div id='axioms_conditionalPredicatesDiv'></div>"+
        "<button onclick='Lineage_axioms.createListEntities()'>OK</button>"


      $("#axioms_objectsDiv").append(html);


    }




  }

  self.onSelectListFirstType=function(type){
    $("#axioms_conditionalPredicatesDiv").html("")
    var source=self.currentGraphNode.data.source
    if(type=='currentSourceClass')
    {
      var html="Class <select id='axioms_predicateList_first'></select><br>"
      $("#axioms_conditionalPredicatesDiv").append(html);
      PromptedSelectWidget.prompt("owl:Class","axioms_predicateList_first",source)

    }
    else   if(type=='currentSourceNew')
    {
      var html="Entity <select id='axioms_predicateList_first'></select>"
      $("#axioms_conditionalPredicatesDiv").append(html);
      var declarations = self.owl2Vocabulary.Declarations;
      common.fillSelectOptions("axioms_predicateList_first", declarations, true);
      var label =prompt("New entity label(optional)");

      var id = label;
      if (!id) {
        id = common.getRandomHexaId(5);
      }
      var proposedUri = Config.sources[source].graphUri + id;
      proposedUri = prompt("Confirm or modify node uri and create entity", proposedUri);
      var html="<input id='axioms_predicateList_first' value='"+proposedUri+" (+"+label+")'>"
      $("#axioms_conditionalPredicatesDiv").append(html);
    }
    else   if(type=='axiom'){
      var html="Axiom <select id='axioms_predicateList_first'></select>"
      $("#axioms_conditionalPredicatesDiv").append(html);
      var owlClasses=Config.ontologiesVocabularyModels["owl"].classes
      common.fillSelectOptions("axioms_predicateList_first", Object.keys( owlClasses), true);
    }
  }


  self.createListEntities=function(){

  }




  self.onCreatePredicateOK=function(){
    var predicateType=$("#axioms_predicateTypeSelect").val();
    var label = $("#axioms_objectLabel").val();
    var objectType = $("#axioms_objectTypeSelect").val();
    if (!predicateType || !objectType) {
      return alert(" objectType or predicateType  missing");
    }
    var id = label;
    if (!id) {
      id = common.getRandomHexaId(5);
    }
    var proposedUri = Config.sources[self.currentGraphNode.data.source].graphUri + id;
    proposedUri = prompt("Confirm or modify node uri and create entity", proposedUri);
    if (!proposedUri) {
      return;
    }
    var triples = [];
    triples.push({
      subject: proposedUri,
      predicate: "rdf:type",
      object: objectType
    });
    if (label) {
      triples.push({
        subject: proposedUri,
        predicate: "rdfs:label",
        object: label
      });
    }

      triples.push({
        subject: self.currentGraphNode.data.id,
        predicate: predicateType,
        object: proposedUri
      });



    Sparql_generic.insertTriples(self.currentGraphNode.data.source, triples, {}, function(err, result) {
      if (err) {
        alert(err.responseText);
      }
    self.drawNodeAxioms(self.currentGraphNode.data.source, self.currentGraphNode.data.id,self.context.divId, self.currentGraphNode.level+1)
      $("#axioms_predicatesDiv").dialog("close");

    });
  }

  self.owl2Vocabulary =
    {
      Declarations: ["rdfs:Datatype",
        "owl:Class",
        "owl:ObjectProperty",
        "owl:DatatypeProperty",
        "owl:AnnotationProperty",
        "owl:NamedIndividual"],
      Boolean_Connectives: [
        "owl:intersectionOf",
        "owl:unionOf",
        "owl:complementOf",
        "owl:enumeration"
      ],


      Object_Property_Restrictions: [
        "owl:allValues",
        "owl:someValuesFrom",
        "owl:hasValue"
      ],
      Class_Expressions: [
        "rdfs:subClassOf",
        "owl:equivalentClass",
        "owl:disjointWith",
        "owl:disjointUnionOf"
      ]
    };


  return self;
})();

export default Lineage_axioms;
window.Lineage_axioms = Lineage_axioms;
