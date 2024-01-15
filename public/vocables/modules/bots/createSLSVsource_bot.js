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
    BotEngine.init(KGquery_bot, null,function() {

      SparqlQuery_botparams = { source: Lineage_sources.activeSource };
      self.resource = { resourceType: "", resourceLabel: "" };
      BotEngine.currentObj = self.workflow;
      BotEngine.nextStep(self.workflow);

    });
  };


  self.workflow = {


  };


  self.functions= {


  }


  return self;


})();

export default CreateSLSVsource_bot;
window.CreateSLSVsource_bot = CreateSLSVsource_bot;