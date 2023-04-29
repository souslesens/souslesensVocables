import common from "../shared/common.js";
import KGcreator from "../tools/KGcreator.js";
import PromptedSelectWidget from "./promptedSelectWidget.js";

var PredicatesSelectorWidget=(function(){
  
  var self={}

  self.predicatesIdsMap= {};

  self.init= function (source, configureFn) {
    $("#sourceBrowser_addPropertyDiv").css("display", "flex");

    $("#editPredicate_currentVocabPredicateSelect").prop("disabled", false);
    $("#editPredicate_vocabularySelect").prop("disabled", false);
    $("#editPredicate_propertyValue").prop("disabled", false);

   self.setVocabulariesSelect(source);
   self.setCurrentVocabClassesSelect("usual", "editPredicate_objectSelect");
   self.setCurrentVocabPropertiesSelect("usual", "editPredicate_currentVocabPredicateSelect");

    // var properties = Config.Lineage.basicObjectProperties;

    self.configure(configureFn);
  }

  self.configure=function (configureFn) {
    self.onSelectPropertyFn = null;
    self.onSelectObjectFn = null;
    $("#editPredicate_vocabularySelect").val("usual");
    $("#editPredicate_vocabularySelect2").val("usual");
    if (configureFn) {
      configureFn();
    }
  }

  self.setVocabulariesSelect= function (source, filter) {
    var vocabularies = [];
    if (!filter || filter == "_all") {
      vocabularies = ["usual", source];
      vocabularies = vocabularies.concat(Config.sources[source].imports);
      vocabularies = vocabularies.concat(Object.keys(Config.ontologiesVocabularyModels));
    } else if (filter == "_loadedSources") {
      vocabularies = Lineage_sources.loadedSources;
      vocabularies = vocabularies.concat(Config.sources[source].imports);
    } else if (filter == "_basicVocabularies") {
      vocabularies = Object.keys(Config.basicVocabularies);
    } else if (filter == "_curentSourceAndImports") {
      vocabularies = [source];
      vocabularies = vocabularies.concat(Config.sources[source].imports);
    } else {
      if (!Array.isArray(filter)) filter = [filter];
      vocabularies = filter;
    }
    common.fillSelectOptions("editPredicate_vocabularySelect", vocabularies, true);
    common.fillSelectOptions("editPredicate_vocabularySelect2", vocabularies, true);
  }
  
  
  self.setCurrentVocabPropertiesSelect= function (vocabulary, selectId) {
    var properties = [];

    if (vocabulary == "usual") {
      KGcreator.usualProperties.forEach(function (item) {
        properties.push({ label: item, id: item });
      });
      properties.push({ label: "-------", id: "" });
      common.fillSelectOptions(selectId, properties, true, "label", "id");
    } else if (Config.ontologiesVocabularyModels[vocabulary]) {
      properties = Config.ontologiesVocabularyModels[vocabulary].properties;
      common.fillSelectOptions(selectId, properties, true, "label", "id");
    } else {
    }
  }
  
  self.onSelectPredicateProperty=function (value) {
    $("#editPredicate_propertyValue").val(value);
    if (self.onSelectPropertyFn) {
      self.onSelectPropertyFn(value);
    }
  }

  self.onSelectCurrentVocabObject= function (value) {
    if (value == "_search") {
      return PromptedSelectWidget.prompt(null, "editPredicate_objectSelect", self.currentVocabulary);
    }
    $("#editPredicate_objectValue").val(value);
    if (self.onSelectObjectFn) {
      self.onSelectObjectFn(value);
    }
  }

  self.setCurrentVocabClassesSelect= function (vocabulary, selectId) {
    self.currentVocabulary = vocabulary;
    var classes = [];

    if (vocabulary == "usual") {
      KGcreator.usualObjectClasses.forEach(function (item) {
        classes.push({
          id: item,
          label: item,
        });
      });
      common.fillSelectOptions(selectId, classes, true, "label", "id");
    } else if (Config.ontologiesVocabularyModels[vocabulary]) {
      var classes = [{ id: "_search", label: "search..." }];

      var uniqueClasses = {};
      for (var key in Config.ontologiesVocabularyModels[vocabulary].classes) {
        if (!uniqueClasses[key]) {
          uniqueClasses[key] = 1;
          classes.push(Config.ontologiesVocabularyModels[vocabulary].classes[key]);
        }
      }

      var restrictionsRanges = [];

      for (var key in Config.ontologiesVocabularyModels[vocabulary].restrictions) {
        var restrictions = Config.ontologiesVocabularyModels[vocabulary].restrictions[key];
        restrictions.forEach(function (restriction) {
          if (!uniqueClasses[restriction.range]) {
            uniqueClasses[restriction.range] = 1;
            restrictionsRanges.push({
              id: restriction.range,
              label: restriction.rangeLabel,
            });
          }
        });
      }

      classes = classes.concat(restrictionsRanges);
      classes = common.array.sort(classes, "label");
      common.fillSelectOptions(selectId, classes, true, "label", "id");
    } else {
      return self.fillObjectTypeOptionsOnPromptFilter(null, "editPredicate_objectSelect", vocabulary);
    }
  }

  
  
  
  
  return self;
  
  
})()


export default PredicatesSelectorWidget;
window.PredicatesSelectorWidget=PredicatesSelectorWidget