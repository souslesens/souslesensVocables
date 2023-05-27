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
    self.currentGraphNode = Lineage_axioms_draw.currentGraphNode;
    if (!self.currentGraphNode || !self.currentGraphNode.data) {
      return;
    }

    $("#" + divId).load("snippets/lineage/lineage_axiomsCreateDialog.html", function() {


      /* var declarations = self.owl2Vocabulary.Declarations;
       common.fillSelectOptions("axiomsCreate_declarationsSelect", declarations, true);*/

      var types = self.currentGraphNode.data.type;
      if (!Array.isArray(types)) {
        types = [types];
      }


      var owlConstraints = Config.ontologiesVocabularyModels["owl"].constraints;
      var rdfsConstraints = Config.ontologiesVocabularyModels["rdfs"].constraints;


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


        common.fillSelectOptions("axioms_axiomTypeSelect", Object.keys(self.possiblePredicates), true);

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

      common.fillSelectOptions("axioms_axiomRangeSelect", [], true);
      common.fillSelectOptions("axioms_create_entityTypeSelect", [], true);
     common.fillSelectOptions("axioms_create_rangePropertySelect", [], true);
    common.fillSelectOptions("axiomsCreate_entityValueSelect", [], true);







    var source = self.currentGraphNode.data.source;
    var constraint = self.possiblePredicates[axiomTypeId];
    var range = constraint.range;
    var ranges = [range];
    var options={specificPredicates:["rdfs:subClassOf", "rdf:type"]}
    Sparql_OWL.getNodeChildren("owl", null, ranges, 1, options, function(err, result) {
      if (err) {
        return alert(err.responseText);
      }
      result.forEach(function(item) {

          if (ranges.indexOf(item.child1.value) < 0)
            ranges.push(item.child1.value);

      });

      ranges.sort()
      common.fillSelectOptions("axioms_axiomRangeSelect", ranges, true);

    });

  };

  self.onAxiomRangeSelect = function(range) {
    common.fillSelectOptions("axioms_create_entityTypeSelect", [], true);
    common.fillSelectOptions("axioms_create_rangePropertySelect", [], true);
    common.fillSelectOptions("axiomsCreate_entityValueSelect", [], true);



    if(range=="https://www.w3.org/2002/07/owl#Class"){
     return  common.fillSelectOptions("axioms_create_entityTypeSelect", [range], true);
    }

    var owlConstraints = Config.ontologiesVocabularyModels["owl"].constraints;

    var rdfsConstraints = Config.ontologiesVocabularyModels["rdfs"].constraints;
    self.rangePossibleProperties = {};
    for (var key in owlConstraints) {
      if (owlConstraints[key].domain==range) {
        self.rangePossibleProperties[key] = owlConstraints[key];
      }
    }
    for (var key in rdfsConstraints) {

        if (rdfsConstraints[key].domain == range) {
          if(!self.possiblePredicates[rdfsConstraints[key].domain]) {
          self.rangePossibleProperties[key] = rdfsConstraints[key];
        }
      }
    }


    common.fillSelectOptions("axioms_create_rangePropertySelect", Object.keys(self.rangePossibleProperties), true, );




  };

  self.onSelectRangeProperty=function(rangeProperty){

    common.fillSelectOptions("axiomsCreate_entityValueSelect", [], true);
    if(!rangeProperty)
      return rangeProperty;

    var rangePropertyRanges=[self.rangePossibleProperties[rangeProperty].range]


    var options={specificPredicates:["rdfs:subClassOf"]}
    Sparql_OWL.getNodeChildren("owl", null, rangePropertyRanges, 1, options, function(err, result) {
      if (err) {
        return alert(err.responseText);
      }
      result.forEach(function(item) {
        if (rangePropertyRanges.indexOf(item.child1.value) < 0)
          rangePropertyRanges.push(item.child1.value);
      });

      rangePropertyRanges.sort()
      common.fillSelectOptions("axioms_create_entityTypeSelect", rangePropertyRanges, true);

    })
  }




  self.onSelectEntityOrigin = function(origin) {


    common.fillSelectOptions("axiomsCreate_entityValueSelect", [], true);
    var source = self.currentGraphNode.data.source;


    if (origin == "") {
      return;
    }

var type=$("#axioms_create_entityTypeSelect").val()

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
      var proposedUri = Config.sources[source].graphUri + id;
      proposedUri = prompt("Confirm or modify node uri and create entity", proposedUri);
      common.fillSelectOptions("axiomsCreate_entityValueSelect", [proposedUri]);


    }

    else {

      PromptedSelectWidget.prompt(type, "axiomsCreate_entityValueSelect", origin, { noCache: 1 });

    }


  };


  self.createPredicates = function() {

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
