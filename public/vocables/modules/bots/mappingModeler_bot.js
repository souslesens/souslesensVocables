import Sparql_common from "../sparqlProxies/sparql_common.js";
import _botEngine from "./_botEngine.js";
import CommonBotFunctions from "./_commonBotFunctions.js";
import common from "../shared/common.js";
import KGcreator from "../tools/KGcreator/KGcreator.js";

var MappingModeler_bot = (function () {
    var self = {};
    self.title = "Create Resource";

    self.start = function (workflow, _params, callbackFn) {
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
        URItypeFn:{
            labelFn:{
                otherFn:{}
            }
        }
    }



    self.workflow = {
        initDataSources: {
            listListDataSourceTypeFn: {
                _OR: {
                    Database: { listDatabaseSourcesFn: { listTablesFn: {} }, CSV: { listCSVsourcesFn: { listTablesFn: {} } } },
                },
            },
        },
    };

    self.functionTitles = {
        _OR: "Select an option",

        URItypeFn:"select UriType for Node",
        labelFn: "select a column for node label",
        otherFn:"choose next operation",






        listVocabsFn: "Choose a source",
        listResourceTypesFn: "Choose a resource type",
        listListDataSourceType: " Choose a data source type",
        listDatabaseSourcesFn: "choose a database source",
        listCSVsourcesFn: "choose a CSV source",
    };

    self.functions = {

        URItypeFn: function() {
        var choices = ["fromLabel", "blankNode", "randomIdentifier"];
        _botEngine.showList(choices, "URItype");
    },

        labelFn: function() {
            var choices =self.params.columns;
            _botEngine.showList(choices, "rdfsLabel");
        },

        otherFn: function() {
            var choices = ["end", ];
            _botEngine.showList(choices, "otherFn");
        },
        initDataSources: function () {
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
        },
    };

    return self;
})();

export default MappingModeler_bot;
window.MappingModeler_bot = MappingModeler_bot;
