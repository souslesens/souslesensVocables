import Sparql_common from "../sparqlProxies/sparql_common.js";
import _botEngine from "./_botEngine.js";
import CommonBotFunctions from "./_commonBotFunctions.js";
import common from "../shared/common.js";
import KGcreator from "../tools/KGcreator/KGcreator.js";

var MappingModeler_bot = (function () {
    var self = {};


    self.start = function (workflow, _params, callbackFn) {
        self.title = _params.title || "Create Resource";
        _botEngine.startParams = [];
        if (workflow) {
            _botEngine.startParams.push(JSON.parse(JSON.stringify(workflow)));
        } else {
            _botEngine.startParams.push(undefined);
        }
        if (_params) {
            _botEngine.startParams.push(JSON.parse(JSON.stringify(_params)));
        } else {
            _botEngine.startParams.push(undefined);
        }
        if (callbackFn) {
            _botEngine.startParams.push(callbackFn);
        } else {
            _botEngine.startParams.push(undefined);
        }
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


    self.workflowMappingDetail={
        startFn: {rdfTypeFn: {
                URItypeFn: {
                    labelFn: {
                        workflowColumnmMappingOther: {}
                    }
                }
            }
        }
    }

    self.workflowColumnmMappingOther = {
        startFn: {
            _OR: {


                "set other predicate": {
                    listNonObjectPropertiesVocabsFn: {
                        listNonObjectPropertiesFn: {
                            listLitteralFormatFn: {
                                listTableColumnsFn: {},
                            },
                        },
                    },
                },
                "create  datatypeProperty": {
                    createDatatypePropertyFn: {},
                },

                end: {},
            },

        },
    };

  /*  self.workflow = {
        initDataSources: {
            listListDataSourceTypeFn: {
                _OR: {
                    Database: { listDatabaseSourcesFn: { listTablesFn: {} }, CSV: { listCSVsourcesFn: { listTablesFn: {} } } },
                },
            },
        },
    };*/

    self.functionTitles = {
        _OR: "Select an option",

        URItypeFn:"select UriType for Node",
        labelFn: "select a column for node label",
        otherFn:"choose next operation",

        listNonObjectPropertiesVocabsFn: " Choose annnotation property vocabulary",
        listNonObjectPropertiesFn: " Choose annnotation property ",
        promptTargetColumnVocabularyFn: "Choose ontology for predicate column",
        predicateObjectColumnClassFn: " Choose  class of  predicate column",
        listLitteralFormatFn: "choose date format",
        createSubPropertyFn: "Enter subProperty label",
        listTableColumnsFn: "Choose a  a column for predicate object ",



      /*  listVocabsFn: "Choose a source",
        listResourceTypesFn: "Choose a resource type",
        listListDataSourceType: " Choose a data source type",
        listDatabaseSourcesFn: "choose a database source",
        listCSVsourcesFn: "choose a CSV source",*/
    };

    self.functions = {
        startFn:function(){_botEngine.nextStep()},
        URItypeFn: function() {
        var choices = ["fromColumnTitle", "blankNode", "randomIdentifier"];
        _botEngine.showList(choices, "URItype");
    },
        rdfTypeFn: function() {
            var choices = ["owl:NamedIndividual", "rdf:Bag", "owl:Class"];
            _botEngine.showList(choices, "rdfType");
        },

        labelFn: function() {
            var choices =self.params.columns;
            choices.splice(0,0,"")
            _botEngine.showList(choices, "rdfsLabel");
        },


        listNonObjectPropertiesVocabsFn: function () {
            CommonBotFunctions.listVocabsFn(self.params.source, "nonObjectPropertyVocab", true);
        },

        listNonObjectPropertiesFn: function () {
            // filter properties compatible with
            var columnRdfType = null;//self.getColumnClass(self.params.tripleModels, self.params.column);

            CommonBotFunctions.listNonObjectPropertiesFn(self.params.nonObjectPropertyVocab, "nonObjectPropertyId", columnRdfType);
        },
        listLitteralFormatFn: function () {
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
            }
        },

        listTableColumnsFn: function () {
            var choices =self.params.columns;
            _botEngine.showList(choices, "predicateObjectColumn");
        }






     /*   initDataSources: function () {
            KGcreator.getSlsvSourceConfig(self.params.source, function (err, result) {
                if (err) {
                    return callback(err);
                }
                self.currentConfig = result;
                self.rawConfig = JSON.parse(JSON.stringify(result));
            });
        },
        listListDataSourceTypeFn: function () {
            var choices = ["Database", "CSV"];
            _botEngine.showList(choices, dataSourceType);
        },

        listDatabaseSourcesFn: function () {
            KGcreator.initSlsvSourceConfig();
        },
        promptObjectPropertyLabelFn: function () {
            _botEngine.promptValue("ObjectProperty label ", "resourceLabel");
        },

        listSuperClassesFn: function () {
            if (self.params.filteredUris && self.params.filteredUris.length > 0) {
                _botEngine.showList(self.params.filteredUris, "superResourceId");
            } else {
                CommonBotFunctions.listVocabClasses(self.params.currentVocab, "superResourceId", true);
            }
        },

        listSuperObjectPropertiesFn: function () {
            if (self.params.filteredUris && self.params.filteredUris.length > 0) {
                _botEngine.showList(self.params.filteredUris, "superResourceId");
            } else {
                CommonBotFunctions.listVocabPropertiesFn(self.params.currentVocab, "superResourceId");
            }
        },

        workflow_saveNewClassFn: function () {
            var label = Sparql_common.formatString(self.params.resourceLabel);
            var resourceId = common.getURI(label, self.params.source, "fromLabel");
            var triples = Lineage_createResource.getResourceTriples(self.params.source, self.params.resourceType, null, self.params.resourceLabel, resourceId);
            if (self.params.superResourceId) {
                triples.push({
                    subject: resourceId,
                    predicate: "rdfs:subClassOf",
                    object: self.params.superResourceId,
                });
            }
            Lineage_createResource.writeResource(self.params.source, triples, function (err, resourceId) {
                if (err) {
                    _botEngine.abort(err.responseText);
                }
                self.params.newObject = {
                    id: resourceId,
                    label: self.params.resourceLabel,
                    resourceType: "Class",
                    data: {
                        id: resourceId,
                        label: self.params.resourceLabel,
                        type: "Class",
                        subType: null,
                    },
                };
                _botEngine.nextStep();
            });
        },

        workflow_saveObjectPropertyFn: function () {
            var propLabel = self.params.resourceLabel;
            var domain = self.params.domain;
            var range = self.params.range;

            propLabel = Sparql_common.formatString(propLabel);

            Lineage_createRelation.createSubProperty(self.params.source, self.params.superResourceId, propLabel, true, function (err, result) {
                if (err) {
                    _botEngine.abort(err.responseText);
                }
                self.params.newObject = {
                    id: result.uri,
                    label: propLabel,
                    resourceType: "ObjectProperty",
                    data: {
                        id: result.uri,
                        label: self.params.resourceLabel,
                        type: "ObjectProperty",
                        subType: null,
                        domain: domain,
                        range: range,
                    },
                };

                _botEngine.nextStep();
            });
        },*/
    };

    return self;
})();

export default MappingModeler_bot;
window.MappingModeler_bot = MappingModeler_bot;
