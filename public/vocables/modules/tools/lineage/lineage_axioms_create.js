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
import Lineage_axioms_draw from "./lineage_axioms_draw.js";


var Lineage_axioms_create = (function() {
  var self = {};

  self.showAdAxiomDialog = function(divId) {


    $("#" + divId).load("snippets/lineage/lineage_axiomsCreateDialog.html", function() {
      self.currentGraphNode = Lineage_axioms_draw.currentGraphNode;
      if (!self.currentGraphNode || !self.currentGraphNode.data) {
        return $("#axiomsCreate_infosDiv").html("no entity selected");
      }

      /* var declarations = self.owl2Vocabulary.Declarations;
       common.fillSelectOptions("axiomsCreate_declarationsSelect", declarations, true);*/

      var types = self.currentGraphNode.data.type;
      if (!Array.isArray(types)) {
        types = [types];
      }




      Sparql_OWL.getNodesAncestors("owl", types, {}, function(err, result) {
        if (err) {
          return alert(err.responseText);
        }
        result.forEach(function(item) {
          if (types.indexOf(item.superClass.value) < 0) {
            types.push(item.superClass.value);
          }
        });

        self.possiblePredicates = {};
        types.forEach(function(type) {
         var typePredicates= self.getEntityPossibleProperties(["owl", "rdf", "rdfs"], type, null)
          for(var key in typePredicates) {
            self.possiblePredicates[key] = typePredicates[key]
          }
        })



        common.fillSelectOptions("axioms_axiomTypeSelect", Object.keys(self.possiblePredicates), true);
        self.setSelectMostCommonOptionsColor("axioms_axiomTypeSelect");
        var source = self.currentGraphNode.data.source;
        var predicateOrigin = [
          { id: "_newOwlEntity", label: "New entity" }
          //  { id: "_new", label: "New entity from " + source }
        ];
        if (Config.sources[source].imports) {
          var imports = JSON.parse(JSON.stringify(Config.sources[source].imports));
          imports.push(source);
          imports.forEach(function(importSource) {
            predicateOrigin.push({ id: importSource, label: "Entity from " + importSource });
          });
        }


        common.fillSelectOptions("axioms_create_entityOriginSelect", predicateOrigin, true, "label", "id");

      });

    });


  };


  self.onAxiomTypeSelect = function(axiomTypeId) {
    if(!axiomTypeId)
      return;

    common.fillSelectOptions("axioms_axiomRangeSelect", [], true);
    common.fillSelectOptions("axioms_create_entityTypeSelect", [], true);
    common.fillSelectOptions("axioms_create_rangePropertySelect", [], true);
    common.fillSelectOptions("axiomsCreate_entityValueSelect", [], true);


    var source = self.currentGraphNode.data.source;
    var constraint = self.possiblePredicates[axiomTypeId];
    var range = constraint.range;
    var ranges = [range];
    var options = { specificPredicates: ["rdfs:subClassOf", "rdf:type"] };
    Sparql_OWL.getNodeChildren("owl", null, ranges, 1, options, function(err, result) {
      if (err) {
        return alert(err.responseText);
      }
      result.forEach(function(item) {

        if (ranges.indexOf(item.child1.value) < 0) {
          ranges.push(item.child1.value);
        }

      });

      ranges.sort();
      common.fillSelectOptions("axioms_axiomRangeSelect", ranges, true);
      self.setSelectMostCommonOptionsColor("axioms_axiomRangeSelect");

    });

  };

  self.onAxiomRangeSelect = function(range) {

    common.fillSelectOptions("axioms_create_entityTypeSelect", [], true);
    common.fillSelectOptions("axioms_create_rangePropertySelect", [], true);
    common.fillSelectOptions("axiomsCreate_entityValueSelect", [], true);

    if(!range)
      return;

    if (range == "https://www.w3.org/2002/07/owl#Class") {
      return common.fillSelectOptions("axioms_create_entityTypeSelect", [range], true);
    }




    self.rangePossibleProperties =self.getEntityPossibleProperties(["owl","rdf","rdfs"],range,null)
    var rangePossiblePropertiesArray = Object.keys(self.rangePossibleProperties);


    if (rangePossiblePropertiesArray.length > 0) {
      common.fillSelectOptions("axioms_create_rangePropertySelect", rangePossiblePropertiesArray, true);
    }

     var entityTypes=[range]
      common.fillSelectOptions("axioms_create_entityTypeSelect", entityTypes, );


  };

  self.onSelectRangeProperty = function(rangeProperty) {

    common.fillSelectOptions("axiomsCreate_entityValueSelect", [], true);
    if (!rangeProperty) {
      return rangeProperty;
    }

    var rangePropertyRanges = [self.rangePossibleProperties[rangeProperty].range];


    var options = { specificPredicates: ["rdfs:subClassOf"] };
    Sparql_OWL.getNodeChildren("owl", null, rangePropertyRanges, 1, options, function(err, result) {
      if (err) {
        return alert(err.responseText);
      }
      result.forEach(function(item) {
        if (rangePropertyRanges.indexOf(item.child1.value) < 0) {
          rangePropertyRanges.push(item.child1.value);
        }
      });

      rangePropertyRanges.sort();
      common.fillSelectOptions("axioms_create_entityTypeSelect", rangePropertyRanges, true);

    });
  };

  self.onSelectEntityType = function(origin) {
  };

  self.onSelectEntityOrigin = function(origin) {


    common.fillSelectOptions("axiomsCreate_entityValueSelect", [], true);
    var source = self.currentGraphNode.data.source;


    if (origin == "") {
      return;
    }

    var type = $("#axioms_create_entityTypeSelect").val();

    if (type == "") {
      return;
    }


    if (origin == "_newOwlEntity") {


      var source = self.currentGraphNode.data.source;
      var label = prompt("New entity label(optional)");

      var id = label;
      if (!id) {
        id = common.getRandomHexaId(5);
      }
      $("#axiomsCreate_entityLabelInput").val(label || "");

      var proposedUri = Config.sources[source].graphUri + id;
      proposedUri = prompt("Confirm or modify node uri and create entity", proposedUri);
      common.fillSelectOptions("axiomsCreate_entityValueSelect", [proposedUri]);


    }

    else {

      PromptedSelectWidget.prompt("<"+type+">", "axiomsCreate_entityValueSelect", origin, { noCache: 1 });

    }


  };


  self.showTriples = function() {
    var errorMessage = "";
    var axiomType = $("#axioms_axiomTypeSelect").val();
    var axiomRange = $("#axioms_axiomRangeSelect").val();
    var axiomRangeProperty = $("#axioms_create_rangePropertySelect").val();
    var entityType = $("#axioms_create_entityTypeSelect").val();
    var entityOrigin = $("#axioms_create_entityOriginSelect").val();
    var entityValue = $("#axiomsCreate_entityValueSelect").val();
    var entityLabel = $("#axiomsCreate_entityLabelInput").val();


    if (entityOrigin == "_newOwlEntity" && !entityType) {
      errorMessage += "entity type is mandatory for new entity<br>";
    }


    if (errorMessage) {
      return $("#axiomsCreate_infosDiv").html(errorMessage);
    }



    var triples = [];

    if (axiomRange == "http://www.w3.org/2002/07/owl#Class") {
      triples.push({
        subject: self.currentGraphNode.data.id,
        predicate: axiomType,
        object: entityValue
      });
      if (entityOrigin == "_newOwlEntity") {
        triples.push({
          subject: entityValue,
          predicate: "rdf:type",
          object: entityType
        });
        if (entityLabel) {
          triples.push({
            subject: entityValue,
            predicate: "rdfs:label",
            object: entityLabel
          });
        }
      }
    }





    if (axiomRange == "http://www.w3.org/2002/07/owl#Class") {
      triples.push({
        subject: self.currentGraphNode.data.id,
        predicate: axiomType,
        object: entityValue
      });
      if (entityOrigin == "_newOwlEntity") {
        triples.push({
          subject: entityValue,
          predicate: "rdf:type",
          object: entityType
        });
        if (entityLabel) {
          triples.push({
            subject: entityValue,
            predicate: "rdfs:label",
            object: entityLabel
          });
        }
      }
    }

    else if(axiomRange=="http://www.w3.org/1999/02/22-rdf-syntax-ns#List"){

      var blankNode="<_:"+common.getRandomHexaId(10)+">"
      triples.push({
        subject: self.currentGraphNode.data.id,
        predicate: axiomType,
        object: blankNode
      });
      triples.push({
        subject:  blankNode,
        predicate: axiomRangeProperty,
        object: entityValue
      });



    }






    function triplesToHtml(triples,divId){

      triples.forEach(function(triple,index){
        var html=""
        html += "<div class='axioms_create_triples' id='TRIPLE_" + index + "' onClick='' >";
        html += "<div class='axioms_create_triple'>" + Sparql_common.getLabelFromURI(triple.subject) + "</div>";
        html += "<div class='axioms_create_triple'>" +  Sparql_common.getLabelFromURI(triple.predicate) + "</div>";
        html += "<div class='axioms_create_triple'>" +  Sparql_common.getLabelFromURI(triple.object) + "</div>";
        html += "<button onclick='Lineage_axioms_create.removeEntityTriples(\"TRIPLE_" + index + "\")'>X</button>";
        html += "</div>";
        $("#"+divId).append(html)
      })

    }


    triplesToHtml(triples,"axiomsCreate_triplesDiv")



  };

  self.removeEntityTriples=function(tripleDivId){
    $("#"+tripleDivId).remove()
  }

  self.saveTriples = function() {

  };


  self.onCreatePredicateOK = function() {
    var predicateType = $("#axioms_axiomTypeSelect").val();
    var label = $("#axioms_objectLabel").val();
    var objectType = $("#axiomsCreate_firstEntitySourceSelect").val();
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
      self.drawNodeAxioms(self.currentGraphNode.data.source, self.currentGraphNode.data.id, self.context.divId, self.currentGraphNode.level + 1);
      $("#axioms_predicatesDiv").dialog("close");

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


  self.setSelectMostCommonOptionsColor = function(SelectId) {
    var commonEntities = ["owl#Class,owl#subClassOf", "owl#ObjectProperty"];
    var color = "#ddd";
    $("#" + SelectId).children().each(function(a) {
      var option = $(this)[0];
      commonEntities.forEach(function(str) {
        if (option.label.indexOf(str) > -1) {
          $(this).addClass("axioms_commonOption");
        }
      });

    });


  };

  self.getEntityPossibleProperties=function(vocabularies,domain,range){
   var possibleProperties = {};

    vocabularies.forEach(function(vocab) {
      var constraints=Config.ontologiesVocabularyModels[vocab].constraints;
      for (var key in constraints) {
        if (domain && constraints[key].domain == domain) {
          possibleProperties[key] = constraints[key];
        }
        if (domain && constraints[key].range == range) {
          possibleProperties[key] = constraints[key];
        }
      }
    })
    return possibleProperties;
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

export default Lineage_axioms_create;
window.Lineage_axioms_create = Lineage_axioms_create;
