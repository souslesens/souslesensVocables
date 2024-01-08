import botEngine from "./botEngine.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import KGquery from "../tools/KGquery/KGquery.js";
import SparqlQuery_bot from "./sparqlQuery_bot.js";
import BotEngine from "./botEngine.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";


var CreateSLSVsource_bot = (function() {
  var self = {};
  self.title = "Create Resource";

  self.start = function(currentQuery, validateFn) {
    BotEngine.init(KGquery_bot, function() {

      SparqlQuery_botparams = { source: Lineage_sources.activeSource };
      self.resource = { resourceType: "", resourceLabel: "" };
      BotEngine.currentObj = self.workflow;
      BotEngine.nextStep(self.workflow);

    });
  };


  self.workflow = {

      "listResourceTypes": {
        "_OR":
          {
            "Class": { "promptResourceLabel": { listSuperClasses: {_OR:{editResource:{},drawResource:{}} } },
            "Individual": { "promptResourceLabel": { listSuperClasses: {_OR:{editResource:{},drawResource:{}} } } } },
            "ObjectProperty": { "promptResourceLabel": { listObjectProperties: {_OR:{editResource:{},drawResource:{}} }  } },
            "AnnotationProperty": { "promptResourceLabel": { listDatatypeProperties: {} } }


          }

    }
  };


  self.functions= {
    listResourceTypes: function(queryParams, varName) {
      var choices = [
        { id: "Class", label: "Class" },
        { id: "Individual", label: "Individual" },
        { id: "ObjectProperty", label: "ObjectProperty" },
        { id: "AnnotationProperty", label: "AnnotationProperty" }
      ];
      BotEngine.showList(choices, "resourceType");
    },

    promptResourceLabel: function() {
      self.resource.resourceLabel = prompt("label contains ");
      BotEngine.writeCompletedHtml(self.resource.resourceLabel);
      BotEngine.nextStep();

    },
    listSuperClasses: function(queryParams, varName) {

    },
    listDatatypeProperties: function(queryParams, varName) {

    },
    editResource: function(queryParams, varName) {

    },

  }


  return self;


})();

export default CreateSLSVsource_bot;
window.CreateSLSVsource_bot = CreateSLSVsource_bot;