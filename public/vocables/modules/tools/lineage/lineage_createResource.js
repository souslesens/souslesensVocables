import common from "../../shared/common.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import Lineage_whiteboard from "./lineage_whiteboard.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import OntologyModels from "../../shared/ontologyModels.js";
import Lineage_blend from "./lineage_blend.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Lineage_axioms_draw from "./lineage_axioms_draw.js";
import AxiomsEditor from "./axiomsEditor.js";
import CreateResource_bot from "../../bots/CreateResource_bot.js";



var Lineage_createResource = (function() {
  var self = {};

  self.showAddNodeGraphDialog = function() {

    self.currentResourceTriples = [];
    self.currentResourceUri = null;
    self.selectedNode = Lineage_whiteboard.currentGraphNode;
    $("#LineagePopup").dialog("open");
    $("#LineagePopup").dialog("option", "title", "Create resource in source " + Lineage_sources.activeSource);

    $("#LineagePopup").load("modules/tools/lineage/html/createResourceDialog.html", function() {
      $("#editPredicate_mainDiv").remove();
    AxiomEditor.init(Lineage_sources.activeSource)
     // $("#lineageCreateResource_labelInput").focus();

      PredicatesSelectorWidget.load("lineageCreateResource_objectDiv", Lineage_sources.activeSource, {}, function() {
        $("#editPredicate_propertyDiv").css("display", "none");
        $("#editPredicate_controlsDiv").css("display", "none");


        self.onSelectResourceType("owl:Class");
        self.init();
      });
    });
  };
  self.init = function() {
    self.currentResourceTriples = [];
    self.currentResourceUri = null;
    $("#lineageCreateResource_triplesDiv").css("display", "none");
    $("#lineageCreateResource_mainDiv").css("display", "block");
    $("#lineageCreateResource_additionalTripleBtn").css("display", "none");
    $("#lineageCreateResource_basicTripleBtn").css("display", "block");
    $("#editPredicate_propertyDiv").css("display", "none");

    $("#editPredicate_objectValue").val("");
    $("#lineageCreateResource_labelInput").val("");
  };

  self.onSelectResourceType = function(type) {
    //  $("#editPredicate_propertyValue").val(type)
    self.currentResourceType = type;
    if (type == "owl:Class") {
      self.currentPredicate = "rdfs:subClassOf";
      $("#lineageCreateResource_predicateDiv").html("owl:subClassOf");
      PredicatesSelectorWidget.setVocabulariesSelect(Lineage_sources.activeSource, "_all");
      $("#editPredicate_vocabularySelect2").val(Lineage_sources.activeSource);
      PredicatesSelectorWidget.setCurrentVocabClassesSelect(Lineage_sources.activeSource);
      if(self.selectedNode){
        $("#editPredicate_objectValue").val(self.selectedNode.id)
      }
    }
    else if (type == "owl:NamedIndividual") {
      self.currentPredicate = "rdf:type";
      $("#lineageCreateResource_predicateDiv").html("rdf:type");
      PredicatesSelectorWidget.setVocabulariesSelect(Lineage_sources.activeSource, "_curentSourceAndImports");
      $("#editPredicate_vocabularySelect2").val(Lineage_sources.activeSource);
      PredicatesSelectorWidget.setCurrentVocabClassesSelect(Lineage_sources.activeSource);
      if(self.selectedNode){
        $("#editPredicate_objectValue").val(self.selectedNode.id)
      }
    }
  };

  self.setResourceUri = function() {
    var uriType = $("#lineageCreateResource_creatingNodeUriType").val();
    var specificUri = $("#lineageCreateResource_specificUri").val();
    var label = $("#lineageCreateResource_labelInput").val();
    if (specificUri) {
      uriType = "specific";
    }

    var uri = common.getURI(label, Lineage_sources.activeSource, uriType, specificUri);
    self.currentResourceUri = uri;
  };

  self.getPossibleNamedIndividuals = function(callback) {
    var individuals = {};
    //   return callback(null, individuals);
    Sparql_OWL.getNamedIndividuals(Lineage_sources.activeSource, null, null, function(err, result) {
      if (err) {
        return callback(err);
      }

      result.forEach(function(item) {
        individuals[item.subjectLabel.value] = item.subject.value;
      });
      return callback(null, individuals);
    });
  };

  self.setResourceTriples = function() {
    var label = $("#lineageCreateResource_labelInput").val();

    var predicate = $("#lineageCreateResource_predicateDiv").html() || $("#editPredicate_propertyValue").val();
    var object = $("#editPredicate_objectValue").val();

    if (!predicate) {
      return alert("no value for predicate");
    }
    if (!object) {
      return alert("no value for object");
    }
    if (self.currentResourceUri) {
      // additional triple
      self.addTriple(predicate, object);
    }
    else {
      self.setResourceUri();
      self.addTriple("rdfs:label", Sparql_common.formatStringForTriple(label));
      if (self.currentResourceType == "owl:Class") {
        var superClass = $("#editPredicate_objectSelect").val();
        if (!superClass) {
          return alert("owl:Class is mandatory");
        }
        self.addTriple("rdf:type", "owl:Class");
        self.addTriple("rdfs:subClassOf", superClass);
      }
      else if (self.currentResourceType == "owl:NamedIndividual") {
        var individualTypeClass = $("#editPredicate_objectSelect").val();
        if (!individualTypeClass) {
          return alert("owl:Class is mandatory");
        }
        self.addTriple("rdf:type", "owl:NamedIndividual");
        self.addTriple("rdf:type", individualTypeClass);
      }

      var origin = "Lineage_addNode";
      var status = "draft";
      var metaDataTriples = Lineage_blend.getCommonMetaDataTriples(self.currentResourceUri, origin, status, null);
      metaDataTriples.forEach(function(triple) {
        self.addTriple(triple.predicate, triple.object);
      });
      //  $("#lineageCreateResource_basicTripleBtn").css("display", "none");
      self.basicDone = true;
    }
    self.showResourceTriples();
    $("#lineageCreateResource_additionalTripleBtn").css("display", "block");
  };

  self.addTriple = function(predicate, object) {
    if (!self.currentResourceUri) {
    }
    var triple = {
      subject: self.currentResourceUri,
      predicate: predicate,
      object: object
    };
    self.currentResourceTriples.push(triple);
  };

  self.showResourceTriples = function() {
    var num = 0;
    var html = "<b>" + self.currentResourceUri + "</b>";
    self.currentResourceTriples.forEach(function(triple) {
      html +=
        "<div id='triple_" +
        num +
        "' class='blendCreateNode_triplesDiv' >" +
        "&nbsp;&nbsp;<b>" +
        triple.predicate +
        " </b>&nbsp;&nbsp;   " +
        triple.object +
        "&nbsp;<button  style='font-size: 8px;' onclick='Lineage_createResource.removeTriple(" +
        num +
        ")'>X</button></div>";
      num++;
    });
    //  $("#lineageCreateResource_mainDiv").css("display", "none");
    $("#lineageCreateResource_triplesDiv").css("display", "block");
    $("#lineageCreateResource_newResourceTiplesDiv").html(html);
  };

  self.writeResource = function() {
    if (!self.currentResourceTriples) {
      return alert("no predicates for node");
    }
    var str = JSON.stringify(self.currentResourceTriples);

    /*    if (str.indexOf("rdf:type") < 0) {
      return alert("a type must be declared");
    }
    if (str.indexOf("owl:Class") > -1 && str.indexOf("rdfs:subClassOf") < 0) {
      return alert("a class must be a rdfs:subClassOf anotherClass");
    }
    if (str.indexOf("owl:Class") > -1 && str.indexOf("rdfs:label") < 0) {
      return alert("a class must have a rdfs:label");
    }*/

    Sparql_OWL.getNodeInfos(Lineage_sources.activeSource, self.currentResourceUri, {}, function(err, result) {
      if (err) {
        return alert(err.responseText);
      }
      if (result.length > 0) {
        self.currentResourceUri = null;
        $("#lineageCreateResource_creatingNodeUriType").val();
        return alert("this uri already exists, choose a new one");
      }

      Sparql_generic.insertTriples(Lineage_sources.activeSource, self.currentResourceTriples, {}, function(err, _result) {
        if (err) {
          return alert(err.responseText);
        }
        //  $("#LineagePopup").dialog("close");
        MainController.UI.message("resource Created");
        var nodeData = {
          id: self.currentResourceUri,
          data: {
            id: self.currentResourceUri,
            source: Lineage_sources.activeSource
          }
        };
        Lineage_whiteboard.drawNodesAndParents(nodeData, 2);
        SearchUtil.generateElasticIndex(Lineage_sources.activeSource, { ids: [self.currentResourceUri] }, function(err, result) {
          if (err) {
            return alert(err.responseText);
          }
          MainController.UI.message("node Created and Indexed");
        });

        var modelData = {};
        self.currentResourceTriples.forEach(function(item) {
          if (item.predicate == "rdfs:label") {
            modelData.label = item.object;
            modelData.id = item.subject;
          }
        });
        var modelData = {
          classes: { [modelData.id]: modelData }
        };
        OntologyModels.updateModel(Lineage_sources.activeSource, modelData, {}, function(err, result) {
          console.log(err || "ontologyModelCache updated");
        });

        self.init();
      });
    });
  };

  self.closeDialog = function() {
    $("#LineagePopup").dialog("close");
  };

  self.removeTriple = function(index) {
    self.currentResourceTriples.splice(index, 1);
    $("#triple_" + index).remove();
  };

  self.onselectNodeUriType = function(uryType) {
    var display = uriType == "specific" ? "block" : "none";
    $("#lineageCreateResource_specificUri").css("display", display);
  };

  self.addNewPredicate = function() {
    $("#editPredicate_propertyDiv").css("display", "block");
    $("#editPredicate_controlsDiv").css("display", "block");
    $("#editPredicate_savePredicateButton").css("display", "none");

    $("#editPredicate_objectSelect").val("");
    $("#editPredicate_objectInput").val("");
    $("#lineageCreateResource_predicateDiv").html("");

  };
  self.drawNodeAxioms = function() {
    Lineage_axioms_draw.drawNodeAxioms(Lineage_sources.activeSource, self.currentResourceUri, divId, depth, options, function(err, result) {
    });
  };

  return self;
})();

export default Lineage_createResource;
window.Lineage_createResource = Lineage_createResource;
