import BotEngineClass from "./_botEngineClass.js";
import CommonBotFunctions_class from "./_commonBotFunctions_class.js";
import CreateResource_bot from "./createResource_bot.js";
import MappingsDetails from "../tools/mappingModeler/mappingsDetails.js";

var MappingModeler_bot = (function () {
    var self = {};
    self.myBotEngine = new BotEngineClass();

    self.start = function (workflow, _params, callbackFn) {
        self.title = _params.title || "Create Resource";
        var startParams = self.myBotEngine.fillStartParams(arguments);
        self.callbackFn = callbackFn;
        if (!workflow) {
            workflow = self.workflow;
        }
        self.myBotEngine.init(MappingModeler_bot, workflow, null, function () {
            self.myBotEngine.startParams = startParams;
            self.params = {};
            if (_params) {
                for (var key in _params) {
                    self.params[key] = _params[key];
                }
            }
            self.myBotEngine.nextStep();
        });
    };
    self.workflowColumnmMappingOther = {
        startFn: {
            _OR: {
                "add predicate": {
                    listNonObjectPropertiesVocabsFn: {
                        listNonObjectPropertiesFn: {
                            listDatatypePropertyRangeFn: {
                                choosedateTypeFn: {
                                    listTableColumnsFn: {},
                                },
                            },
                        },
                    },
                },
                "add rdf:Type": {
                    rdfTypeFn: {},
                },
                "add rdfs:subClassOf": {
                    listVocabsFn: {
                        listSuperClassesFn: {
                            setSubClassOfFn: {},
                        },
                    },
                },
                "add transform": {
                    addTransformFn: {},
                },

                "set column as datatypeProperty": {
                    listTableColumnsFn: { listDatatypePropertyRangeFn: { labelFn: {} } },
                },
                "create  datatypeProperty": {
                    chooseDatatypeSourceFn: {
                        createDatatypePropertyFn: {},
                    },
                },
                "add LookUp": {
                    addLookUpFn: {},
                },

                end: {},
            },
        },
    };
    self.workflowMappingDetail = {
        startFn: {
            rdfTypeFn: {
                URItypeFn: {
                    labelFn: {},
                },
            },
        },
    };
    self.workflowCreateSpecificResource = {
        startFn: {
            rdfTypeFn: {
                promptLabelFn: {},
            },
        },
    };

    self.functionTitles = {
        _OR: "Select an option",
        startFn: "choose mapping action",
        URItypeFn: "select UriType for Node",
        labelFn: "select a column for node label",
        otherFn: "choose next operation",
        rdfTypeFn: "select type to add",
        listNonObjectPropertiesVocabsFn: " Choose annnotation property vocabulary",
        listNonObjectPropertiesFn: " Choose annnotation property ",
        promptTargetColumnVocabularyFn: "Choose ontology for predicate column",
        predicateObjectColumnClassFn: " Choose  class of  predicate column",
        listLitteralFormatFn: "choose date format",
        createSubPropertyFn: "Enter subProperty label",
        listTableColumnsFn: "Choose a  a column for predicate object ",
        listDatatypePropertyRangeFn: "Choose a datatype",
        choosedateTypeFn: "Choose date format",
        addTransformFn: "add Transformation Function",
        setSubClassOfFn: "add rdfs:subClassOf predicate",
        chooseDatatypeSourceFn: "Choose a source for creating datatypeProperty",
        /*  listVocabsFn: "Choose a source",
        listResourceTypesFn: "Choose a resource type",
        listListDataSourceType: " Choose a data source type",
        listDatabaseSourcesFn: "choose a database source",
        listCSVsourcesFn: "choose a CSV source",*/
    };

    self.functions = {
        startFn: function () {
            self.myBotEngine.nextStep();
        },
        URItypeFn: function () {
            var choices = ["fromLabel", "blankNode", "randomIdentifier"];
            self.myBotEngine.showList(choices, "URItype");
        },
        rdfTypeFn: function () {
            var choices = ["owl:NamedIndividual", "owl:Class"];
            self.params.addingType = true;
            self.myBotEngine.showList(choices, "rdfType");
        },
        addTransformFn: function () {
            MappingsDetails.transform.showTansformDialog();
            self.params.addingTransform = true;
            self.myBotEngine.end();
        },
        labelFn: function () {
            var choices = self.params.columns;
            choices.splice(0, 0, "");
            self.myBotEngine.showList(choices, "rdfsLabel");
        },
        promptLabelFn: function () {
            self.myBotEngine.promptValue("enter resource label", "rdfsLabel");
        },
        listNonObjectPropertiesVocabsFn: function () {
            CommonBotFunctions_class.listVocabsFn(self.myBotEngine, self.params.source, "nonObjectPropertyVocab", true);
        },
        listNonObjectPropertiesFn: function () {
            var columnRdfType = null;
            CommonBotFunctions_class.listNonObjectPropertiesFn(self.myBotEngine, self.params.nonObjectPropertyVocab, "nonObjectPropertyId", columnRdfType);
        },
        choosedateTypeFn: function () {
            var datatypePropertyRange = self.myBotEngine.currentBot.params.datatypePropertyRange;
            if (datatypePropertyRange != "xsd:dateTime") {
                return self.myBotEngine.nextStep();
            } else {
                var choices = [
                    { id: "FR", label: "FR : DD/MM/YYYY hh:mm:ss" },
                    { id: "ISO", label: "ISO : YYYY-MM-DDThh:mm:ssZ" },
                    { id: "USA", label: "USA : MM/DD/YYYY hh:mm:ss" },
                    { id: "EUR", label: "EUR : DD.MM.YYYY hh:mm:ss" },
                    { id: "ISO-time", label: "ISO-time : YYYY-MM-DD hh:mm:ss" },
                    { id: "other", label: "other" },
                ];
                self.myBotEngine.showList(choices, "nonObjectPropertyDateFormat", null, false, function (result) {
                    if (result == "other") {
                        return self.myBotEngine.nextStep();
                    }
                    self.params.nonObjectPropertyDateFormat = result;
                    self.myBotEngine.nextStep();
                });
            }
            /*
            var range = Config.ontologiesVocabularyModels[self.params.nonObjectPropertyVocab].nonObjectProperties[self.params.nonObjectPropertyId].range;
            if (!range) {
                return self.myBotEngine.nextStep();
            }
            if (range != "xsd:dateTime") {
                return _botEngine.nextStep();
            } else {
                var choices = [
                    { id: "FR", label: "FR : DD/MM/YYYY" },
                    { id: "ISO", label: "ISO : YYYY-MM-DD" },
                    { id: "USA", label: "USA : MM/DD/YYYY" },
                    { id: "EUR", label: "EUR : DD. MM. YYYY" },
                    { id: "JIS", label: "JIS : YYYY-MM-DD" },
                    { id: "ISO-time", label: "ISO-time : 2022-09-27 18:00:00.000" },
                    { id: "other", label: "other" },
                ];
                _botEngine.showList(choices, "nonObjectPropertyDateFormat", null, false, function (result) {
                    if (result == "other") {
                        return _botEngine.nextStep();
                    }
                    self.params.nonObjectPropertyDateFormat = result;
                    _botEngine.nextStep();
                });
            }*/
        },

        listTableColumnsFn: function () {
            var choices = self.params.columns;
            self.myBotEngine.showList(choices, "predicateObjectColumn");
        },
        createDatatypePropertyFn: function () {
            var classId = self.params.columnClass;
            if (!self.params.datatypePropertySource) {
                return self.myBotEngine.previousStep("no source choosed for creating datatypeProperty");
            }
            CreateResource_bot.start(
                CreateResource_bot.workFlowDatatypeProperty,
                {
                    source: self.params.datatypePropertySource,
                    datatypePropertyDomain: classId,
                },
                function (err, result) {
                    self.myBotEngine.nextStep();
                },
            );
        },
        listDatatypePropertyRangeFn: function () {
            var choices = ["", "xsd:string", "xsd:int", "xsd:float", "xsd:dateTime"];
            self.myBotEngine.showList(choices, "datatypePropertyRange");
        },
        listVocabsFn: function () {
            if (self.params.filteredUris && self.params.filteredUris.length > 0) {
                self.myBotEngine.nextStep();
            } else {
                CommonBotFunctions_class.listVocabsFn(self.myBotEngine, self.params.source, "currentVocab");
            }
        },
        listSuperClassesFn: function () {
            CommonBotFunctions_class.listVocabClasses(self.myBotEngine, self.params.currentVocab, "superClassId", true);
        },
        setSubClassOfFn: function () {
            self.params.addingSubClassOf = self.params.superClassId;
            self.myBotEngine.nextStep();
        },
        addLookUpFn: function () {
            Lookups_bot.start(Lookups_bot.lookUpWorkflow, {}, function (err, result) {
                if (err) {
                    return MainController.errorAlert(err);
                }
            });
        },
        chooseDatatypeSourceFn: function () {
            CommonBotFunctions_class.listVocabsFn(self.myBotEngine, self.params.source, "datatypePropertySource");
        },
    };

    return self;
})();

export default MappingModeler_bot;
window.MappingModeler_bot = MappingModeler_bot;
