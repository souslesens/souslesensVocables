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

      SparqlQuery_bot.currentQuery = { source: Lineage_sources.activeSource };
      self.resource = { resourceType: "", resourceLabel: "" };
      BotEngine.currentObj = self.workflow;
      BotEngine.nextStep(self.workflow);

    });
  };


  self.workflow = {

      "listResourceTypes": {
        "_OR":
          {
            "Class": { "promptResourceLabel": { listSuperClasses: {} } },
            "Individual": { "promptResourceLabel": { setSparqlQueryFilter: {} } },
            "ObjectProperty": { "promptResourceLabel": { setSparqlQueryFilter: {} } },
            "AnnotationProperty": { "promptResourceLabel": { setSparqlQueryFilter: {} } }


          }

    }
  };

  self.functions = SparqlQuery_bot.function();
  self.functions.listResourceTypes = function(queryParams, varName) {
    var choices = [
      { id: "Class", label: "Class" },
      { id: "Individual", label: "Individual" },
      { id: "ObjectProperty", label: "ObjectProperty" },
      { id: "AnnotationProperty", label: "AnnotationProperty" }
    ];
    BotEngine.showList(choices, "resourceType");
  };
  self.functions.promptResourceLabel = function() {
    self.resource.resourceLabel = prompt("label contains ");
    BotEngine.writeCompletedHtml(self.resource.resourceLabel);
    BotEngine.nextStep();

  };


  return self;


})();

export default KGquery_bot;
window.KGquery_bot = KGquery_bot;