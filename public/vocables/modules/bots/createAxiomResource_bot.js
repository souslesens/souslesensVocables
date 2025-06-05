import Sparql_common from "../sparqlProxies/sparql_common.js";
import _botEngine from "./_botEngine.js";
import CommonBotFunctions from "./_commonBotFunctions.js";
import Lineage_createRelation from "../tools/lineage/lineage_createRelation.js";
import common from "../shared/common.js";
import Lineage_createResource from "../tools/lineage/lineage_createResource.js";

var CreateAxiomResource_bot = (function () {
    var self = {};
    self.title = "Create Resource";

    self.start = function (workflow, _params, callbackFn) {
       var startParams = _botEngine.fillStartParams(arguments);

        self.callbackFn = callbackFn;
        if (!workflow) {
            workflow = self.workflow;
        }
        _botEngine.init(CreateAxiomResource_bot, workflow, null, function () {

            _botEngine.startParams = startParams;
            self.params = {}; // { source:self._params.source, resourceType: "", resourceLabel: "", currentVocab: "" };
            if (_params) {
                for (var key in _params) {
                    self.params[key] = _params[key];
                }
            }
            self.source = self.params.source;

            _botEngine.nextStep();
        });
    };

    self.workflowNewClass = {
        promptClassLabelFn: { listVocabsFn: { listSuperClassesFn: { workflow_saveNewClassFn: {} } } },
    };

    self.workflowNewObjectProperty = {
        promptObjectPropertyLabelFn: { listVocabsFn: { listSuperObjectPropertiesFn: { workflow_saveObjectPropertyFn: {} } } },
    };

    self.functionTitles = {
        _OR: "Select an option",
        listResourceTypesFn: "Choose a resource type",

        promptClassLabelFn: " Enter owlClass label (rdfs:label)",
        promptObjectPropertyLabelFn: "enter owl:ObjectProperty label",

        listVocabsFn: "Choose a reference ontology for super ClassOr resource",
        listSuperClassesFn: "Choose a  class as superClass ",
        listSuperObjectPropertiesFn: "Choose a  property as superProperty ",
    };

    self.functions = {
        listVocabsFn: function () {
            if (self.params.filteredUris && self.params.filteredUris.length > 0) {
                _botEngine.nextStep();
            } else {
                CommonBotFunctions.listVocabsFn(self.source, "currentVocab");
            }
        },

        promptClassLabelFn: function () {
            _botEngine.promptValue("Class label ", "resourceLabel");
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
            var resourceId = common.getURI(label, self.source, "fromLabel");
            var triples = Lineage_createResource.getResourceTriples(self.source, self.params.resourceType, null, self.params.resourceLabel, resourceId);
            if (self.params.superResourceId) {
                triples.push({
                    subject: resourceId,
                    predicate: "rdfs:subClassOf",
                    object: self.params.superResourceId,
                });
            }
            triples.push({
                subject: resourceId,
                predicate: "rdf:type",
                object: "owl:Class",
            });
            Lineage_createResource.writeResource(self.source, triples, function (err, resourceId) {
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

export default CreateAxiomResource_bot;
window.CreateAxiomResource_bot = CreateAxiomResource_bot;
