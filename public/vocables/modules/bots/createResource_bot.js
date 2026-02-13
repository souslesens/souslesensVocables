import Sparql_common from "../sparqlProxies/sparql_common.js";
import BotEngineClass from "./_botEngineClass.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";
import Lineage_combine from "../tools/lineage/lineage_combine.js";
import Lineage_whiteboard from "../tools/lineage/lineage_whiteboard.js";
import CommonBotFunctions from "./_commonBotFunctions.js";
import Lineage_createRelation from "../tools/lineage/lineage_createRelation.js";
import common from "../shared/common.js";
import Sparql_generic from "../sparqlProxies/sparql_generic.js";
import OntologyModels from "../shared/ontologyModels.js";
import Lineage_createResource from "../tools/lineage/lineage_createResource.js";
import Sparql_OWL from "../sparqlProxies/sparql_OWL.js";
import SimpleListSelectorWidget from "../uiWidgets/simpleListSelectorWidget.js";

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
            var choices = [
                { id: "owl:Class", label: "Class" },
                { id: "owl:NamedIndividual", label: "Individual" },
                // { id: "owl:ObjectProperty", label: "ObjectProperty" },
                { id: "DatatypeProperty", label: "DatatypeProperty" },
                //   { id: "ImportClass", label: "Import Class" },
                //  { id: "ImportSource", label: "Add import source " },
            ];
            self.myBotEngine.showList(choices, "resourceType");
        },

        listVocabsFn: function () {
            CommonBotFunctions.listVocabsFn(self.source, false, function (err, vocabs) {
                if (err) {
                    return self.myBotEngine.abort(err);
                }
                vocabs.splice(0, 0, { id: "searchClass", label: "Search Class" });
                self.myBotEngine.showList(vocabs, "currentVocab");
            });
        },

        promptResourceLabelFn: function () {
            self.myBotEngine.promptValue("resource label ", "resourceLabel");
            /*  self.params.resourceLabel = prompt("resource label ");
            _botEngine.insertBotMessage(self.params.resourceLabel);
            _botEngine.nextStep();*/
        },

        /**
         * @function
         * @name listSuperClassesFn
         * @memberof CreateResource_bot.functions
         * Displays class selection. When currentVocab is "searchClass", shows a scope dropdown
         * (All Sources + active source + imports) with all classes suffixed by source name, plus
         * an ElasticSearch search bar. Otherwise shows classes from the selected vocab.
         * @returns {void}
         */
        listSuperClassesFn: function () {
            if (self.params.currentVocab === "searchClass") {
                var vocabs = [{ id: "allSources", label: "All Sources" }];
                vocabs.push({ id: self.source, label: self.source });
                var imports = Config.sources[self.source].imports;
                if (imports) {
                    imports.forEach(function (importSource) {
                        vocabs.push({ id: importSource, label: importSource });
                    });
                }

                var loadClassesForScope = function (scopeId, callback) {
                    if (scopeId === "allSources") {
                        var allClasses = [];
                        var sourceVocabs = vocabs.filter(function (v) {
                            return v.id !== "allSources";
                        });
                        async.eachSeries(
                            sourceVocabs,
                            function (vocab, callbackEach) {
                                CommonBotFunctions.listVocabClasses(vocab.id, false, null, function (err, classes) {
                                    if (err) return callbackEach();
                                    classes.forEach(function (cls) {
                                        allClasses.push({
                                            id: cls.id,
                                            label: cls.label + " (" + vocab.id + ")",
                                            source: vocab.id,
                                        });
                                    });
                                    callbackEach();
                                });
                            },
                            function () {
                                CommonBotFunctions.sortList(allClasses);
                                allClasses.splice(0, 0, { id: "owl:Thing", label: "owl:Thing" });
                                callback(allClasses);
                            },
                        );
                    } else {
                        CommonBotFunctions.listVocabClasses(scopeId, true, null, function (err, classes) {
                            if (err) return callback([]);
                            callback(classes);
                        });
                    }
                };

                loadClassesForScope("allSources", function (classes) {
                    self.searchResultsMap = {};
                    self.parentIdsLabelsMap = {};
                    var searchFn = function (term, updateCallback) {
                        var sources;
                        if (Lineage_combine.currentSources && Lineage_combine.currentSources.length > 0) {
                            sources = Lineage_combine.currentSources;
                        } else {
                            sources = Object.keys(Lineage_sources.loadedSources);
                        }
                        CommonBotFunctions.searchClassesInSources(sources, term, function (_err, items) {
                            if (!items) {
                                items = [];
                            }
                            self.searchResultsMap = {};
                            self.parentIdsLabelsMap = items.parentIdsLabelsMap || {};
                            items.forEach(function (item) {
                                self.searchResultsMap[item.id] = item;
                            });
                            updateCallback(items);
                        });
                    };

                    var scopeOptions = {
                        items: vocabs,
                        onScopeChange: function (scopeId, updateListFn) {
                            loadClassesForScope(scopeId, function (newClasses) {
                                updateListFn(newClasses);
                            });
                        },
                    };

                    self.myBotEngine.showListWithSearch(classes, "resourceId", searchFn, null, scopeOptions);

                    var selectEl = $("#bot_resourcesProposalSelect");
                    selectEl.off("contextmenu");
                    selectEl.on("contextmenu", function (evt) {
                        evt.preventDefault();
                        var selectedOption = selectEl.find("option:selected");
                        var classId = selectedOption.val();
                        if (!classId) {
                            return;
                        }
                        var classLabel = selectedOption.text();
                        var popupHtml = "<div style='padding:5px'>";
                        popupHtml += "<div class='popupMenuItem' style='cursor:pointer;padding:4px 8px' ";
                        popupHtml += "onclick='CreateResource_bot.functions.showParentsDialog(\"" + classId.replace(/'/g, "\\'") + "\",\"" + classLabel.replace(/'/g, "\\'") + "\"); PopupMenuWidget.hidePopup(\"popupMenuWidgetDiv\")'>";
                        popupHtml += "Show Parents</div>";
                        popupHtml += "</div>";
                        $("#popupMenuWidgetDiv").html(popupHtml);
                        PopupMenuWidget.showPopup({ x: evt.pageX, y: evt.pageY }, "popupMenuWidgetDiv");
                    });
                });
            } else {
                CommonBotFunctions.listVocabClasses(self.params.currentVocab, true, null, function (err, classes) {
                    if (err) {
                        return self.myBotEngine.abort(err);
                    }
                    self.myBotEngine.showList(classes, "resourceId");
                });
            }
        },
        /**
         * @function
         * @name showParentsDialog
         * @memberof CreateResource_bot.functions
         * Displays the parent classes of a given class in a SimpleListSelectorWidget.
         * Uses ElasticSearch cached data (searchResultsMap) when available,
         * otherwise falls back to Sparql_OWL.getNodeParents.
         * @param {string} classId - The URI of the class to get parents for.
         * @param {string} classLabel - The label of the class.
         * @returns {void}
         */
        showParentsDialog: function (classId, classLabel) {
            var classData = self.searchResultsMap[classId];
            if (classData && classData.parents && classData.parents.length > 0) {
                var parents = [];
                classData.parents.forEach(function (parentId) {
                    var parentLabel = self.parentIdsLabelsMap[parentId];
                    if (!parentLabel) {
                        parentLabel = Sparql_common.getLabelFromURI(parentId);
                    }
                    parents.push({ id: parentId, label: parentLabel });
                });
                SimpleListSelectorWidget.showDialog(
                    { size: 10, multiple: false, title: "Parents of " + classLabel },
                    function (loadCallback) {
                        loadCallback(parents);
                    },
                    function () {}
                );
                return;
            }

            var classSource = null;
            var currentList = self.myBotEngine.currentList || [];
            for (var i = 0; i < currentList.length; i++) {
                if (currentList[i].id === classId) {
                    classSource = currentList[i].source;
                    break;
                }
            }
            if (!classSource) {
                classSource = self.source;
            }
            SimpleListSelectorWidget.showDialog(
                { size: 10, multiple: false, title: "Parents of " + classLabel },
                function (loadCallback) {
                    Sparql_OWL.getNodeParents(classSource, null, [classId], 1, {}, function (err, result) {
                        if (err) {
                            return loadCallback([{ id: "", label: "Error loading parents" }]);
                        }
                        var parents = [];
                        result.forEach(function (item) {
                            if (!item.broader1) {
                                return;
                            }
                            parents.push({ id: item.broader1.value, label: item.broader1Label.value });
                        });
                        if (parents.length === 0) {
                            parents.push({ id: "", label: "No parents found" });
                        }
                        loadCallback(parents);
                    });
                },
                function () {}
            );
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
                Lineage_createResource.writeResource(self.params.source, triples, function (err, resourceId) {
                    if (err) {
                        self.myBotEngine.abort(err.responseText);
                    }
                    self.params.resourceId = resourceId;
                    self.myBotEngine.nextStep();
                });
            }
        },

        editResourceFn: function () {
            NodeInfosWidget.showNodeInfos(self.params.source, self.params.resourceId, "mainDialogDiv");
            self.myBotEngine.end();
            //  _botEngine.nextStep();
        },
        drawResourceFn: function () {
            var conceptType = self.params.resourceType === "owl:NamedIndividual" ? "NamedIndividual" : "Class";
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
            Lineage_whiteboard.drawNodesAndParents(nodeData, 2);
            self.myBotEngine.nextStep();
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
