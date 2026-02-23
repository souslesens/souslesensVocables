import Sparql_common from "../sparqlProxies/sparql_common.js";
import BotEngineClass from "./_botEngineClass.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";
import Lineage_whiteboard from "../tools/lineage/lineage_whiteboard.js";
import CommonBotFunctions from "./_commonBotFunctions.js";
import Lineage_createRelation from "../tools/lineage/lineage_createRelation.js";
import common from "../shared/common.js";
import Sparql_generic from "../sparqlProxies/sparql_generic.js";
import OntologyModels from "../shared/ontologyModels.js";
import Lineage_createResource from "../tools/lineage/lineage_createResource.js";
import NodeInfosAxioms from "../tools/axioms/nodeInfosAxioms.js";
import AxiomExtractor from "../tools/axioms/axiomExtractor.js";

var CreateResource_bot = (function () {
    var self = {};
    self.myBotEngine = new BotEngineClass();
    self.title = "Create Resource";

    self.start = function (workflow, _params, callback) {
        var startParams = self.myBotEngine.fillStartParams(arguments);
        self.callback = callback;
        if (!workflow) workflow = self.workflow;
        self.myBotEngine.init(CreateResource_bot, workflow, null, function () {
            self.myBotEngine.startParams = startParams;
            self.params = { source: self.source || Lineage_sources.activeSource, resourceType: "", resourceLabel: "", currentVocab: "" };
            if (_params)
                for (var key in _params) {
                    self.params[key] = _params[key];
                }
            self.source = self.params.source || Lineage_sources.activeSource;
            self.myBotEngine.nextStep();
        });
    };

    self.workflow_end = {
        _OR: {
            "New Resource": { newResourceFn: {} },
            End: {},
        },
    };
    (self.workflow_saveResource = {
        _OR: {
            Edit: { saveResourceFn: { editResourceFn: {} } },
            Draw: { saveResourceFn: { drawResourceFn: self.workflow_end } },
            Axiom: { saveResourceFn: { drawAxiomFn: {} } },
        },
    }),
        (self.workflow = {
            listResourceTypesFn: {
                _OR: {
                    "owl:Class": { promptResourceLabelFn: { listVocabsFn: { listSuperClassesFn: self.workflow_saveResource } } },
                    // "owl:ObjectProperty": { promptResourceLabelFn: { listVocabsFn: { listObjectPropertiesfn: self.workflow_saveResource } } },

                    "owl:NamedIndividual": { promptResourceLabelFn: { listVocabsFn: { listClassTypesFn: self.workflow_saveResource } } },
                    DatatypeProperty: { promptDatatypePropertyLabelFn: { listDatatypePropertyDomainFn: { listDatatypePropertyRangeFn: { createDataTypePropertyFn: { drawDataTypePropertFn: {} } } } } },
                    ImportClass: { listVocabsFn: { listSuperClassesFn: self.workflow_saveResource } },
                    ImportSource: { listImportsFn: { saveImportSource: self.workflow_end } },
                },
            },
        });

    self.workFlowDatatypeProperty = {
        promptDatatypePropertyLabelFn: { listDatatypePropertyDomainFn: { listDatatypePropertyRangeFn: { createDataTypePropertyFn: { drawDataTypePropertFn: {} } } } },
    };

    self.functionTitles = {
        _OR: "Select an option",
        listResourceTypesFn: "Choose a resource type",
        promptResourceLabelFn: " Enter resource label (rdfs:label)",
        listVocabsFn: "Choose a reference ontology",
        listSuperClassesFn: "Choose a  class as superClass ",
        listClassTypesFn: "Choose a  a class type ",
        saveResourceFn: " Save resource",
        listImportsFn: "Add import to source",
        promptDatatypePropertyLabelFn: "enter datatypeProperty label",
        listDatatypePropertyDomainFn: "enter datatypeProperty domain",
        listDatatypePropertyRangeFn: "enter datatypeProperty domain",
    };

    self.functions = {
        listResourceTypesFn: function (queryParams, varName) {
            var choices = [{ id: "owl:Class", label: "Class" }];
            if (Config.sources[self.source] && Config.sources[self.source].allowIndividuals) {
                choices.push({ id: "owl:NamedIndividual", label: "Individual" });
            }
            // { id: "owl:ObjectProperty", label: "ObjectProperty" },
            choices.push({ id: "DatatypeProperty", label: "DatatypeProperty" });
            //   { id: "ImportClass", label: "Import Class" },
            //  { id: "ImportSource", label: "Add import source " },
            self.myBotEngine.showList(choices, "resourceType");
        },

        listVocabsFn: function () {
            CommonBotFunctions.listVocabsFn(self.source, false, function (err, vocabs) {
                if (err) {
                    return self.myBotEngine.abort(err);
                }
                if (vocabs.length == 0) {
                    return self.myBotEngine.previousStep("no values found, try another option");
                }
                self.myBotEngine.showList(vocabs, "currentVocab");
            });
        },

        promptResourceLabelFn: function () {
            self.myBotEngine.promptValue("resource label ", "resourceLabel");
            /*  self.params.resourceLabel = prompt("resource label ");
            _botEngine.insertBotMessage(self.params.resourceLabel);
            _botEngine.nextStep();*/
        },

        listSuperClassesFn: function () {
            CommonBotFunctions.listVocabClasses(self.params.currentVocab, true, null, function (err, classes) {
                if (err) {
                    return self.myBotEngine.abort(err);
                }
                self.myBotEngine.showList(classes, "resourceId");
            });
        },
        listClassTypesFn: function () {
            self.functions.listSuperClassesFn();
        },
        axiomaticDefinitionFn: function () {
            /*   AxiomsEditor.init(self.params.resourceId, function (err, manchesterText) {
                self.params.manchesterText = manchesterText;
                _botEngine.nextStep();
            });*/
        },

        listImportsFn: function () {
            var choices = Object.keys(Config.sources);
            choices.sort();
            self.myBotEngine.showList(choices, "importSource");
        },
        saveImportSource: function () {
            var importSource = self.params.importSource;
            if (!importSource) {
                alert("no source selected for import");
                return self.myBotEngine.reset();
            }
            Lineage_createRelation.setNewImport(self.params.source, importSource, function (err, result) {
                self.myBotEngine.nextStep();
            });
        },

        saveResourceFn: function () {
            if (self.params.resourceType == "ImportClass") {
                Sparql_OWL.copyUriTriplesFromSourceToSource(self.params.currentVocab, self.params.source, self.params.resourceId, function (err, result) {});
            } else {
                self.params.superClassId = self.params.resourceId;
                var triples = Lineage_createResource.getResourceTriples(self.params.source, self.params.resourceType, null, self.params.resourceLabel, self.params.resourceId);

                Lineage_createResource.addAnnotationTriples(triples, function (err, result) {
                    Lineage_createResource.writeResource(self.params.source, triples, function (err, resourceId) {
                        if (err) {
                            self.myBotEngine.abort(err.responseText);
                        }
                        self.params.resourceId = resourceId;
                        self.myBotEngine.nextStep();
                    });
                });
            }
        },

        editResourceFn: function () {
            NodeInfosWidget.showNodeInfos(self.params.source, self.params.resourceId, "mainDialogDiv");
            self.myBotEngine.end();
            //  _botEngine.nextStep();
        },
        drawResourceFn: function () {
            var conceptType = "Class";
            if (self.params.resourceType === "owl:NamedIndividual") {
                conceptType = "NamedIndividual";
            }
            var nodeData = {
                id: self.params.resourceId,
                type: conceptType,
                data: {
                    id: self.params.resourceId,
                    label: self.params.resourceLabel,
                    source: self.params.source,
                    type: conceptType,
                },
            };
            var existingIds = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
            var depth = 1;
            if (self.params.superClassId && existingIds[self.params.superClassId]) {
                depth = 2;
            }
            Lineage_whiteboard.drawNodesAndParents(nodeData, depth);
            self.myBotEngine.nextStep();
        },
        drawAxiomFn: function () {
            var resource = {
                data: {
                    id: self.params.resourceId,
                    label: self.params.resourceLabel,
                    source: self.params.source,
                },
            };
            var subclassTriple = {
                subject: self.params.resourceId,
                predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                object: self.params.superClassId,
            };
            AxiomExtractor.addTriplesToBasicAxioms(self.params.source, [subclassTriple], function (err, result) {
                if (err) {
                    return self.myBotEngine.abort(err);
                }

                NodeInfosAxioms.init(self.params.source, resource, "mainDialogDiv");
                self.myBotEngine.end();
            });
        },
        newResourceFn: function () {
            self.start();
        },

        promptDatatypePropertyLabelFn: function () {
            self.myBotEngine.promptValue("DatatypePropertyLabel", "datatypePropertyLabel");
        },

        listDatatypePropertyDomainFn: function () {
            if (self.params.datatypePropertyDomain) return self.myBotEngine.nextStep();
            CommonBotFunctions.listVocabClasses(self.params.source, false, [{ id: "", label: "none" }], function (err, classes) {
                if (err) {
                    return self.myBotEngine.abort(err);
                }
                self.myBotEngine.showList(classes, "datatypePropertyDomain");
            });
        },
        listDatatypePropertyRangeFn: function () {
            var choices = ["", "xsd:string", "xsd:int", "xsd:float", "xsd:dateTime"];
            self.myBotEngine.showList(choices, "datatypePropertyRange");
        },

        createDataTypePropertyFn: function (source, propLabel, domain, range, callback) {
            var source = self.params.source;
            var propLabel = self.params.datatypePropertyLabel;
            var domain = self.params.datatypePropertyDomain;
            var range = self.params.datatypePropertyRange;

            propLabel = Sparql_common.formatString(propLabel);
            var propId = common.getURI(propLabel, source, "fromLabel");
            //  var subPropId = Config.sources[source].graphUri + common.getRandomHexaId(10);
            var triples = [
                {
                    subject: propId,
                    predicate: "rdf:type",
                    object: "owl:DatatypeProperty",
                },
                {
                    subject: propId,
                    predicate: "rdfs:label",
                    object: propLabel,
                },
            ];
            if (range) {
                triples.push({
                    subject: propId,
                    predicate: "rdfs:range",
                    object: range,
                });
            }
            if (domain) {
                triples.push({
                    subject: propId,
                    predicate: "rdfs:domain",
                    object: domain,
                });
            }

            Sparql_generic.insertTriples(source, triples, null, function (err, _result) {
                var modelData = {
                    nonObjectProperties: {
                        [propId]: {
                            id: propId,
                            label: propLabel,
                            range: range,
                            domain: domain,
                        },
                    },
                };
                OntologyModels.updateModel(source, modelData, {}, function (err, result) {
                    console.log(err || "ontologyModelCache updated");

                    if (self.callback) {
                        return self.callback();
                    }
                    self.myBotEngine.nextStep();
                });
            });
        },
        drawDataTypePropertFn: function () {
            if (self.params && self.params.datatypePropertyDomain) {
                Lineage_whiteboard.drawDataTypeProperties(null, self.params.datatypePropertyDomain, null, function () {
                    self.myBotEngine.nextStep();
                });
            }
        },
    };

    return self;
})();

export default CreateResource_bot;
window.CreateResource_bot = CreateResource_bot;
