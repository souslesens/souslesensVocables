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

  self.workflowColumnMappingClass =
    { "setType": { "listVocabsFn": { "listSuperClassesFn": {"setValue":{}} } } };

  self.workflowColumnMappingType = {
    "chooseType": {
      "_OR": {
        "blankNode": { "setBlankNode": self.workflowColumnMappingClass },
        "namedIndividual": { "setBlankNode": self.workflowColumnMappingClass }


      }


    }
  };


  self.workflow = {
    "chooseSource": {
      "chooseTable": { "chooseColumn": self.workflowColumnMapping }

    }
  };


  self.functions = {};


  return self;


})();

export default KGcreator_bot;
window.KGcreator_bot = KGcreator_bot;