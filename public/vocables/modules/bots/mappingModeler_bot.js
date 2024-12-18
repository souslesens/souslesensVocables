import _botEngine from "./_botEngine.js";
import CommonBotFunctions from "./_commonBotFunctions.js";
import CreateResource_bot from "./createResource_bot.js";
import MappingsDetails from "../tools/mappingModeler/mappingsDetails.js";

var MappingModeler_bot = (function () {
    var self = {};

    self.start = function (workflow, _params, callbackFn) {
        self.title = _params.title || "Create Resource";
        _botEngine.startParams = _botEngine.fillStartParams(arguments);
        self.callbackFn = callbackFn;
        if (!workflow) {
            workflow = self.workflow;
        }
        _botEngine.init(MappingModeler_bot, workflow, null, function () {
            self.params = {};
            if (_params) {
                for (var key in _params) {
                    self.params[key] = _params[key];
                }
            }
            _botEngine.nextStep();
        });
    };
    self.workflowColumnmMappingOther = {
        startFn: {
            _OR: {
                "add rdf:Type": {
                    rdfTypeFn: {}
                },
                "add transform": {
                    addTransformFn: {}
                },
                "add other predicate": {
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
                "set column as datatypeProperty": {
                    listTableColumnsFn: { listDatatypePropertyRangeFn: { labelFn: {} } },
                },
                "create  datatypeProperty": {
                    createDatatypePropertyFn: {},
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

        URItypeFn: "select UriType for Node",
        labelFn: "select a column for node label",
        otherFn: "choose next operation",

        listNonObjectPropertiesVocabsFn: " Choose annnotation property vocabulary",
        listNonObjectPropertiesFn: " Choose annnotation property ",
        promptTargetColumnVocabularyFn: "Choose ontology for predicate column",
        predicateObjectColumnClassFn: " Choose  class of  predicate column",
        listLitteralFormatFn: "choose date format",
        createSubPropertyFn: "Enter subProperty label",
        listTableColumnsFn: "Choose a  a column for predicate object ",

        addTransformFn:""

        /*  listVocabsFn: "Choose a source",
        listResourceTypesFn: "Choose a resource type",
        listListDataSourceType: " Choose a data source type",
        listDatabaseSourcesFn: "choose a database source",
        listCSVsourcesFn: "choose a CSV source",*/
    };

    self.functions = {
        startFn: function () {
            _botEngine.nextStep();
        },
        URItypeFn: function () {
            var choices = ["fromColumnTitle", "blankNode", "randomIdentifier"];
            _botEngine.showList(choices, "URItype");
        },
        rdfTypeFn: function () {
            var choices = ["owl:NamedIndividual", "rdf:Bag", "owl:Class"];
            _botEngine.showList(choices, "rdfType");
        },
        addTransformFn:function(){
            MappingsDetails.showTansformDialog()
        },

        labelFn: function () {
            var choices = self.params.columns;
            choices.splice(0, 0, "");
            _botEngine.showList(choices, "rdfsLabel");
        },
        promptLabelFn:function(){
            _botEngine.promptValue("enter resource label", "rdfsLabel");
        },

        listNonObjectPropertiesVocabsFn: function () {
            CommonBotFunctions.listVocabsFn(self.params.source, "nonObjectPropertyVocab", true);
        },

        listNonObjectPropertiesFn: function () {
            // filter properties compatible with
            var columnRdfType = null; //self.getColumnClass(self.params.tripleModels, self.params.column);

            CommonBotFunctions.listNonObjectPropertiesFn(self.params.nonObjectPropertyVocab, "nonObjectPropertyId", columnRdfType);
        },
        choosedateTypeFn: function () {
            var datatypePropertyRange = _botEngine.currentBot.params.datatypePropertyRange;
            if (datatypePropertyRange != "xsd:dateTime") {
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
            }
            /*
            var range = Config.ontologiesVocabularyModels[self.params.nonObjectPropertyVocab].nonObjectProperties[self.params.nonObjectPropertyId].range;
            if (!range) {
                return _botEngine.nextStep();
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
            _botEngine.showList(choices, "predicateObjectColumn");
        },

        createDatatypePropertyFn: function () {
            var classId = self.params.columnClass;
            CreateResource_bot.start(CreateResource_bot.workFlowDatatypeProperty, { source: self.params.source, datatypePropertyDomain: classId }, function (err, result) {
                MappingModeler.mappingColumnInfo.startOtherPredicatesBot();
            });
        },
        listDatatypePropertyRangeFn: function () {
            var choices = ["", "xsd:string", "xsd:int", "xsd:float", "xsd:dateTime"];
            _botEngine.showList(choices, "datatypePropertyRange");
        },
    };

    return self;
})();

export default MappingModeler_bot;
window.MappingModeler_bot = MappingModeler_bot;
