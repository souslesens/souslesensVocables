import botEngine from "./botEngine.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import KGquery from "../tools/KGquery/KGquery.js";
import SparqlQuery_bot from "./sparqlQuery_bot.js";
import BotEngine from "./botEngine.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";


var KGcreator_bot = (function() {
  var self = {};
  self.title = "Create Resource";

  self.start = function() {
    BotEngine.init(KGcreator_bot, function() {
      self.source = Lineage_sources.activeSource;
      self.params = { source: self.source, resourceType: "", resourceLabel: "", currentVocab: "" };
      BotEngine.currentObj = self.workflow;
      BotEngine.nextStep(self.workflow);

    });
  };


  self.workflow = {
    "listResourceTypes": {
      "_OR":
        {
          "Class": { "promptResourceLabel": { listVocabsFn: { listSuperClasses: { _OR: { editResource: {}, drawResource: {} } } } } },
          "ObjectProperty": { "promptResourceLabel": { listVocabsFn: { listSuperObjectProperties: { _OR: { editResource: {}, drawResource: {} } } } } },
          "AnnotationProperty": { "promptResourceLabel": { listDatatypeProperties: {} } },
          "Individual": { "promptResourceLabel": { listVocabsFn: { listSuperClasses: { _OR: { editResource: {}, drawResource: {} } } } } }

        }

    }
  };


  self.functions = {

    listResourceTypes: function(queryParams, varName) {
      var choices = [
        { id: "Class", label: "Class" },
        { id: "Individual", label: "Individual" },
        { id: "ObjectProperty", label: "ObjectProperty" },
        { id: "AnnotationProperty", label: "AnnotationProperty" }
      ];
      BotEngine.showList(choices, "resourceType");
    },


    listVocabsFn: function() {
      var sourceLabel = self.source;
      var vocabs = [{ id: sourceLabel, label: sourceLabel }];
      var imports = Config.sources[sourceLabel].imports;
      imports.forEach(function(importSource) {
        vocabs.push({ id: importSource, label: importSource });
      });
      BotEngine.showList(vocabs, "currentVocab");
    },

    promptResourceLabel: function() {
      self.params.resourceLabel = prompt("resource label ");
      BotEngine.writeCompletedHtml(self.params.resourceLabel);
      BotEngine.nextStep();
    },

    listSuperClasses: function(queryParams, varName) {
        var vocab = self.params.currentVocab;
        var classes = [{ id: "owl:Thing", label: "owl:Thing" }];
        for (var key in Config.ontologiesVocabularyModels[vocab].classes) {
          var classId = Config.ontologiesVocabularyModels[vocab].classes[key];
          classes.push({ id: classId.id, label: classId.label });
        }
        BotEngine.showList(classes, "superClass");
    },
    listSuperObjectProperties: function(queryParams, varName) {
      var vocab = self.params.currentVocab;
      var classes = [{ id: "owl:Thing", label: "owl:Thing" }];
      for (var key in Config.ontologiesVocabularyModels[vocab].classes) {
        var classId = Config.ontologiesVocabularyModels[vocab].classes[key];
        classes.push({ id: classId.id, label: classId.label });
      }
      BotEngine.showList(classes, "superClass");
    },

    listDatatypeProperties: function(queryParams, varName) {


    },

    editResource: function(queryParams, varName) {

    },

    editResource: function(queryParams, varName) {

    }
  };


  return self;


})();

export default KGcreator_bot;
window.KGcreator_bot = KGcreator_bot;