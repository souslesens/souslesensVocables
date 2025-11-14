import Sparql_common from "../sparqlProxies/sparql_common.js";
import BotEngineClass from "./_botEngineClass.js";
import CommonBotFunctions_class from "./_commonBotFunctions_class.js";
import Lineage_createRelation from "../tools/lineage/lineage_createRelation.js";
import common from "../shared/common.js";
import Lineage_createResource from "../tools/lineage/lineage_createResource.js";

var CreateAxiomResource_bot = (function () {
    var self = {};
    self.myBotEngine = new BotEngineClass();
    self.title = "Create Resource";

    self.start = function (workflow, _params, callbackFn) {
        var startParams = self.myBotEngine.fillStartParams(arguments);

        self.callbackFn = callbackFn;
        if (!workflow) {
            workflow = self.workflow;
        }
        self.myBotEngine.init(CreateAxiomResource_bot, workflow, null, function () {
            self.myBotEngine.startParams = startParams;
            self.params = {}; // { source:self._params.source, resourceType: "", resourceLabel: "", currentVocab: "" };
            if (_params) {
                for (var key in _params) {
                    self.params[key] = _params[key];
                }
            }
            self.source = self.params.source;

            self.myBotEngine.nextStep();
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
                self.myBotEngine.nextStep();
            } else {
                CommonBotFunctions_class.listVocabsFn(self.myBotEngine, self.source, "currentVocab");
            }
        },

        promptClassLabelFn: function () {
            self.myBotEngine.promptValue("Class label ", "resourceLabel");
        },
        promptObjectPropertyLabelFn: function () {
            self.myBotEngine.promptValue("ObjectProperty label ", "resourceLabel");
        },

        listSuperClassesFn: function () {
            if (self.params.filteredUris && self.params.filteredUris.length > 0) {
                self.myBotEngine.showList(self.params.filteredUris, "superResourceId");
            } else {
                CommonBotFunctions_class.listVocabClasses(self.myBotEngine, self.params.currentVocab, "superResourceId", true);
            }
        },

        listSuperObjectPropertiesFn: function () {
            if (self.params.filteredUris && self.params.filteredUris.length > 0) {
                self.myBotEngine.showList(self.params.filteredUris, "superResourceId");
            } else {
                CommonBotFunctions_class.listVocabPropertiesFn(self.myBotEngine, self.params.currentVocab, "superResourceId");
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
                    self.myBotEngine.abort(err.responseText);
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
                self.myBotEngine.nextStep();
            });
        },

        workflow_saveObjectPropertyFn: function () {
            var propLabel = self.params.resourceLabel;
            var domain = self.params.domain;
            var range = self.params.range;

            propLabel = Sparql_common.formatString(propLabel);

            Lineage_createRelation.createSubProperty(self.params.source, self.params.superResourceId, propLabel, true, function (err, result) {
                if (err) {
                    self.myBotEngine.abort(err.responseText);
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

                self.myBotEngine.nextStep();
            });
        },
    };

    return self;
})();

export default CreateAxiomResource_bot;
window.CreateAxiomResource_bot = CreateAxiomResource_bot;
