import BotEngine from "./botEngine.js";
import KGcreator from "../tools/KGcreator/KGcreator.js";
import CommonBotFunctions from "./commonBotFunctions.js";
import KGcreator_mappings from "../tools/KGcreator/KGcreator_mappings.js";



var KGcreator_bot = (function() {
  var self = {};
  self.title = "Create mappings";

  self.start = function(columnObj) {
    self.currentColumn = columnObj;
    var workflow = null;
    if (columnObj) {

      self.params = {
        source: KGcreator.currentSlsvSource,
        datasource: KGcreator.currentConfig.currentDataSource,
        table: columnObj.data.table,
        column: columnObj.data.id,

        tripleModels: []
      };
      if (KGcreator.currentConfig.currentMappings && KGcreator.currentConfig.currentMappings[columnObj.data.table]) {
        self.params.tripleModels = KGcreator.currentConfig.currentMappings[columnObj.data.table].tripleModels || [];
      }
      else {
        KGcreator.currentConfig.currentMappings[columnObj.data.table] = { tripleModels: [] };
        self.params.tripleModels = [];
      }

      if (self.params.tripleModels.length == 0) {
        workflow = self.workflowColumnMappingType;
        self.params.triplesSubject = null;

      }
      else {
        self.params.tripleModels.predicateSubjectColumnType = CommonBotFunctions.getColumnClass(self.params.tripleModels, self.params.column);
        if (self.params.tripleModels.predicateSubjectColumnType) {
          workflow = self.workflowColumnmMappingOther;
        }
        else {
          workflow = self.workflowColumnMappingType;
        }
        self.params.triplesSubject = self.params.tripleModels[0].s;
      }
    }
    else {
      workflow = self.workflow;
      self.params = { source: self.source, datasource: "", table: "", column: "", tripleModels: [] };
    }
    CommonBotFunctions.loadSourceOntologyModel(self.params.source, true, function(err) {
      if (err) {
        return alert(err.responseText);
      }

      KGcreator_mappings.showMappingDialog(null, null, function() {
        BotEngine.init(KGcreator_bot, { divId: "LinkColumn_botPanel" }, function() {
          BotEngine.currentObj = workflow;
          BotEngine.nextStep(workflow);
        });
      });
    });
  };

  self.callbackFn = function() {
    self.start(self.currentColumn);

  };

  self.workflowColumnmMappingOther = {

    "_OR": {
      "set RDF type": { "listClassVocabsFn": { "listClassesFn": { "addMappingToModel": { "saveFn": {} } } } },
      "set value": { "listValueTypeFn": { "setValueColumnFn": { "addMappingToModel": { "saveFn": {} } } } },
      // "set predicate": { "listPredicateVocabsFn": { "listVocabPropertiesFn": { "listTableColumnsFn": { "addMappingToModel": {} } } } },
      "set predicate": {
        "listTableColumnsFn": {
          "checkColumnTypeFn": {
            "_OR": {
              "KO": { "targetColumnKoFn": {} },
              //  "OK": { "listPredicateVocabsFn": { "listVocabPropertiesFn": { "addMappingToModel": {} } } }
              "OK": { "listFilteredPropertiesFn": { "addMappingToModel": { "saveFn": {} } } }
            }
          }
        }
      },
      "save mapping": { "saveFn": {} },
      "new Mapping": {}


    }
  };


  self.workflowColumnMappingType = {

    "setUriTypeFn": {
      "_OR": {
        "blankNode": { "addMappingToModel": self.workflowColumnmMappingOther },
        "namedIndividual": { "addMappingToModel": self.workflowColumnmMappingOther }
      }
    }

  };


  self.workflowMapping = {
    "chooseSourceFn": {
      "chooseTableFn": { "chooseColumnFn": self.workflowColumnMappingType }
    }
  };

  self.functionTitles = {
    setUriTypeFn: "Choose column URI type",
    setRdfType: "Choose column RDF type",
    listValueTypeFn: "Choose a xsd type",
    setValueColumnFn: "Choose a column containing value",
    listClassVocabsFn: "Choose a reference ontology",
    listPredicateVocabsFn: "Choose a reference ontology",
    listClassesFn: "Choose a class",
    listPropertiesFn: " Choose a property",
    listTableColumnsFn: "Choose a  a column for predicate object "
  };


  self.functions = {
    chooseSourceFn: function() {

    },
    chooseTableFn: function() {

    },
    chooseColumnFn: function() {

    },
    columnMappingFn: function() {
      BotEngine.nextStep();
    },

    setUriTypeFn: function() {
      var choices = [
        "blankNode", "namedIndividual"

      ];
      BotEngine.showList(choices, "uriType");/*,null,false,function(value){
        self.params.uriType=value;
        BotEngine.nextStep()
      });*/

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
    listValueTypeFn: function() {
      var choices = [
        "xsd:string", "xsd:int", "xsd:float", "xsd:datetime"

      ];
      BotEngine.showList(choices, "valueType");
    }
    ,

    setValueColumnFn: function() {
      var columns = KGcreator.currentConfig.currentDataSource.tables[self.params.table];
      BotEngine.showList(columns, "valueColumn");
    },

    listTableColumnsFn: function() {
      var columns = KGcreator.currentConfig.currentDataSource.tables[self.params.table];
      BotEngine.showList(columns, "predicateObjectColumn");
    },


    checkColumnTypeFn: function() {

      //check if source  target column is mapped and has a rdf:type that are classes in source and imports
      var predicateObjectColumnName = self.params.predicateObjectColumn;
      var predicateObjectColumnType = null;
      self.params.predicateSubjectColumnType = CommonBotFunctions.getColumnClass(self.params.tripleModels, self.params.column);
      self.params.predicateObjectColumnType = CommonBotFunctions.getColumnClass(self.params.tripleModels, self.params.predicateObjectColumn);

      var OK = false;
      if (self.params.predicateSubjectColumnType && self.params.predicateObjectColumnType) {
        OK = true;
      }
      return BotEngine.nextStep(OK ? "OK" : "KO");
    },


    targetColumnKoFn: function() {
      alert("target column " + self.params.predicateObjectColumnName + " needs a rdf:type predicate before linking");
      BotEngine.reset();
    },

    listFilteredPropertiesFn: function() {
      OntologyModels.getAllowedPropertiesBetweenNodes(self.params.source, self.params.predicateSubjectColumnType, self.params.predicateObjectColumnType, function(err, result) {
        if (err) {
          return alert(err);
        }
       var properties = [];
        for (var key in result.constraints) {
          for (var propId in result.constraints[key]) {
            var prop = result.constraints[key][propId];
            properties.push({ id: propId, label: prop.source+":"+prop.label });
          }
        }
      //  CommonBotFunctions.sortList(properties)
        BotEngine.showList(properties, "propertyId");
      });

    },

    listVocabPropertiesFn: function() {
      // filter properties compatible with
      CommonBotFunctions.listVocabPropertiesFn(self.params.predicateVocab, "propertyId");
    },


    addMappingToModel: function() {
      var source = self.params.source;
      var datasource = self.params.datasource;
      var table = self.params.table;
      var column = self.params.column;


      var uriType = self.params.uriType;
      var resourceId = self.params.resourceId;
      var propertyId = self.params.propertyId;
      var predicateObjectId = self.params.predicateObjectId;
      var predicateObjectColumn=self.params.predicateObjectColumn

      var valueType = self.params.valueType;
      var valueColumn = self.params.valueColumn;

      var tripleModels = self.params.tripleModels;


      var triple = null;

      if (uriType) {
        var str = "";
        if (uriType == "namedIndividual") {
          self.params.triplesSubject = column;
          triple = {
            s: column, p: "rdf:type", o: "ow:NamedIndividual"
          };
          self.params.tripleModels.push(triple);

        }
        else if (uriType == "blankNode") {
          self.params.triplesSubject = "$_" + column;
        }


      }

      if (resourceId) {
        triple = {
          s: self.params.triplesSubject, p: "rdf:type", o: resourceId
        };
        self.params.tripleModels.push(triple);

      }
      if (valueType && valueColumn) {
        triple = {
          s: self.params.triplesSubject, p: valueType, o: valueColumn
        };
        self.params.tripleModels.push(triple);

      }

      if (propertyId && predicateObjectColumn) {
        triple = {
          s: self.params.triplesSubject, p: propertyId, o: predicateObjectColumn
        };
        self.params.tripleModels.push(triple);
      }

      KGcreator_mappings.updateColumnTriplesEditor( self.params.tripleModels);
      BotEngine.nextStep();


    },

    saveFn: function() {
      KGcreator.currentConfig.currentMappings[self.params.table].tripleModels = self.params.tripleModels;
      KGcreator.saveDataSourceMappings(self.params.source, self.params.datasource.name, KGcreator.currentConfig.currentMappings, function(err, result) {
        if (err) {
          return alert(err);
        }
        BotEngine.message("mapping Saved");
        BotEngine.nextStep();

      });


    }


  };


  return self;


})
();

export default KGcreator_bot;
window.KGcreator_bot = KGcreator_bot;