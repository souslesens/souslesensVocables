import common from "../shared/common.js";
import KGcreator from "../tools/KGcreator.js";
import PromptedSelectWidget from "./promptedSelectWidget.js";

var PredicatesSelectorWidget = (function () {
    var self = {};

    self.predicatesIdsMap = {};

    self.init = function (source, configureFn,addPredicate) {
        $("#sourceBrowser_addPropertyDiv").css("display", "flex");

        $("#editPredicate_currentVocabPredicateSelect").prop("disabled", false);
        $("#editPredicate_vocabularySelect").prop("disabled", false);
        $("#editPredicate_propertyValue").prop("disabled", false);

        self.setVocabulariesSelect(source,null,addPredicate);
        self.setCurrentVocabClassesSelect("usual", "editPredicate_objectSelect",addPredicate);
        self.setCurrentVocabPropertiesSelect("usual", "editPredicate_currentVocabPredicateSelect",addPredicate);

        // var properties = Config.Lineage.basicObjectProperties;

        self.configure(configureFn);
    };

    self.configure = function (configureFn) {
        self.onSelectPropertyFn = null;
        self.onSelectObjectFn = null;
        $("#editPredicate_vocabularySelect").val("usual");
        $("#editPredicate_vocabularySelect2").val("usual");
        if (configureFn) {
            configureFn();
        }
    };

    self.setVocabulariesSelect = function (source, filter,addPredicate) {
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
        common.fillSelectOptions("editPredicate_vocabularySelect", vocabularies, true,null,null,null,addPredicate);
        common.fillSelectOptions("editPredicate_vocabularySelect2", vocabularies, true,null,null,null,addPredicate);
    };

    self.setCurrentVocabPropertiesSelect = function (vocabulary, selectId,addPredicate) {
        var properties = [];

        if (vocabulary == "usual") {
            KGcreator.usualProperties.forEach(function (item) {
                properties.push({ label: item, id: item });
            });
            properties.push({ label: "-------", id: "" });
            common.fillSelectOptions(selectId, properties, true, "label", "id",null,addPredicate);
        } else if (Config.ontologiesVocabularyModels[vocabulary]) {
            properties = Config.ontologiesVocabularyModels[vocabulary].properties;
            common.fillSelectOptions(selectId, properties, true, "label", "id",null,addPredicate);
        } else {
            return PromptedSelectWidget.prompt("owl:ObjectProperty", "editPredicate_currentVocabPredicateSelect", vocabulary,null,addPredicate);
        }
    };

    self.onSelectPredicateProperty = function (value,addPredicate) {
        if(addPredicate){
            var balise=$("#sourceBrowser_addPropertyDiv").find("#editPredicate_propertyValue")
        }
        else if(addPredicate==false){
            var balise=$("#LineageBlend_creatingNodeClassParamsDiv").find("#editPredicate_propertyValue")
        }
        else{
            var balise=$("#editPredicate_propertyValue")
        }
       
        balise.val(value);
        if (self.onSelectPropertyFn) {
            self.onSelectPropertyFn(value);
        }
    };

    self.onSelectCurrentVocabObject = function (value,addPredicate) {
        if (value == "_search") {
            Config.selectListsCache[Lineage_sources.activeSource + "_" + null]=undefined;
            return PromptedSelectWidget.prompt(null, "editPredicate_objectSelect", self.currentVocabulary,null,addPredicate);
        }
        if(addPredicate){
            var balise=$("#sourceBrowser_addPropertyDiv").find("#editPredicate_objectValue")
        }
        else if(addPredicate==false){
            var balise=$("#LineageBlend_creatingNodeClassParamsDiv").find("#editPredicate_objectValue")
        }
        else{
            var balise=$("#editPredicate_objectValue")
        }
        balise.val(value);
        if (self.onSelectObjectFn) {
            self.onSelectObjectFn(value);
        }
    };

    self.setCurrentVocabClassesSelect = function (vocabulary, selectId,addPredicate) {
        self.currentVocabulary = vocabulary;
        var classes = [];

        if (vocabulary == "usual") {
            KGcreator.usualObjectClasses.forEach(function (item) {
                classes.push({
                    id: item,
                    label: item,
                });
            });
            common.fillSelectOptions(selectId, classes, true, "label", "id",null,addPredicate);
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
            common.fillSelectOptions(selectId, classes, true, "label", "id",null,addPredicate);
        } else {
            return PromptedSelectWidget.prompt("owl:Class", "editPredicate_objectSelect", vocabulary,null,addPredicate);
        }
    };

    return self;
})();

export default PredicatesSelectorWidget;
window.PredicatesSelectorWidget = PredicatesSelectorWidget;
