import BotEngine from "./botEngine.js";
import KGcreator from "../tools/KGcreator/KGcreator.js";
import CommonBotFunctions from "./commonBotFunctions.js";


var KGcreator_bot = (function() {
  var self = {};
  self.title = "Create mappings";

  self.start = function(columnObj) {
self.currentColumn=columnObj;
    var workflow = null;
    if (columnObj) {
      workflow = self.workflowColumnmMappingOther;
      self.params = {
        source: KGcreator.currentSlsvSource,
        datasource: KGcreator.currentConfig.currentDataSource,
        table: columnObj.data.table,
        column: columnObj.data.id,
        triplesModel: []
      };
      if (KGcreator.currentConfig.currentMappings && KGcreator.currentConfig.currentMappings[columnObj.data.table]) {
        self.params.triplesModel = KGcreator.currentConfig.currentMappings[columnObj.data.table][columnObj.data.id];

      }
    }

    else {
      workflow = self.workflow;
      self.params = { source: self.source, datasource: "", table: "", column: "", triplesModel: [] };
    }

    BotEngine.init(KGcreator_bot, function() {
      BotEngine.currentObj = workflow;
      BotEngine.nextStep(workflow);

    });
  };

 self.callbackFn=function() {
  self.start(self.currentColumn)

  }

  self.workflowColumnmMappingOther = {

      "_OR": {
        "setUriTypeFn": {
          "_OR": {
            "blankNode": { "saveFn": {} },
            "namedIndividual": { "saveFn": {} }
          }
        }

        ,
        "setRdfType": { "listClassVocabsFn": { "listClassesFn":{"saveFn":{} } }},
        "setValue": { "setValueFn": { "saveFn":{} } },
        "setPredicate": { "listPredicateVocabsFn": { "listVocabPropertiesFn": { "listTableColumnsFn": { "saveFn": {}} } } },
        "newMappingFn":{},


      }

  };


  self.workflowColumnMappingType = {}
  ;

  self.workflowMapping = {
    "chooseSourceFn": {
      "chooseTableFn": { "chooseColumnFn": self.workflowColumnMappingType }
    }
  };


  self.functions = {
    chooseSourceFn: function() {

    },
    chooseTableFn: function() {

    },
    chooseColumnFn: function() {

    },
    columnMappingFn:function() {
      BotEngine.nextStep()
    },

    setUriTypeFn: function() {
      var choices = [
        "blankNode", "namedIndividual"

      ];
      BotEngine.showList(choices, "uriType");

    },


    listClassVocabsFn: function() {
      CommonBotFunctions.listVocabsFn(self.params.source, "classVocab");
    },
    listPredicateVocabsFn: function() {
      CommonBotFunctions.listVocabsFn(self.params.source, "predicateVocab");
    },
    listClassesFn: function() {
      CommonBotFunctions.listVocabClasses(self.params.classVocab, "resourceId");
    },
    setValueFn: function() {
      var choices = [
        "xsd:string", "xsd:int", "xsd:float", "xsd:datetime"

      ];
      BotEngine.showList(choices, "nodeValue");
    },

    listVocabPropertiesFn: function() {
      CommonBotFunctions.listVocabPropertiesFn(self.params.predicateVocab, "propertyId");
    },

    listTableColumnsFn: function() {
      var columns = KGcreator.currentConfig.currentDataSource.tables[self.params.table];
      BotEngine.showList(columns, "predicateObjectId");
    },

    saveFn: function() {
      var source = self.params.source;
      var datasource = self.params.datasource;
      var table = self.params.table;
      var column = self.params.column;


      var uriType = self.params.uriType;
      var resourceId = self.params.resourceId;
      var propertyId = self.params.propertyId;
      var predicateObjectId = self.params.predicateObjectId;

      var triplesModel = self.params.triplesModel;


      var triple = null;
      if (uriType) {
        var str = "";
        if (uriType == "namedIndividual") {
          str = "owl:NamedIndividual";
        }
        else if (uriType == "blankNode") {
          str = "$_" + column;
        }

        triple = {
          s: column, p: "rdf:type", o: str
        };
      }


      if ( triple) {
        triplesModel.push(triple);
        KGcreator.currentConfig.currentMappings[table][column] = triplesModel;
      }

      BotEngine.nextStep()


    }

  };


  return self;


})
();

export default KGcreator_bot;
window.KGcreator_bot = KGcreator_bot;