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
import UserDataWidget from "../uiWidgets/userDataWidget.js";
import ShareUserData_bot from "./shareUserData_bot.js";
import UserDataService from "../shared/userDataService.js";
import authentication from "../shared/authentification.js";

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
            self.params = {
                source: self.source || Lineage_sources.activeSource,
                resourceType: "",
                resourceLabel: "",
                selectedVocabulary: "",
                templatePropertyUris: [],
                selectedTemplatePropertyUri: "",
                templatePropertySelections: [],
                templatePropertyUriToLabelMap: {},
            };
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
            Axioms: { saveResourceFn: { createAxiomsFn: {} } },
            Draw: { saveResourceFn: { drawResourceFn: self.workflow_end } },
        },
    }),
    self.workflowAnnotationTemplateLoop = {
        _OR: {
            "Add another property": {
                listTemplateVocabsFn: {
                    chooseTemplatePropertyFn: { afterChooseTemplatePropertyFn: self.workflowAnnotationTemplateLoop },
                },
            },
            Continue: { showTemplateSaveMenuFn: self.workflowAnnotationTemplateSaveMenu },
        },
    };
    self.workflowAnnotationTemplateSaveMenu = {
        _OR: {
            "Create new template": { saveAnnotationTemplateFn: self.workflow_end },
            "Update existing template": { chooseExistingTemplateFn: { saveAnnotationTemplateFn: self.workflow_end } },
        },
    };
    self.workflowAfterTemplateSavedMenu = {
        _OR: {
            "Share now": { shareTemplateNowFn: {} },
            "Assign now": { assignTemplateNowFn: {} },
            "Show list": { showTemplatesListFn: {} },
            End: {},
        },
    };
    // Entry menu when user chooses "AnnotationPropertiesTemplate"
    self.workflowAnnotationTemplateEntryMenu = {
        _OR: {
            "Show existing templates": {
            listExistingTemplatesFn: {
                afterSelectExistingTemplateFn: self.workflowAfterTemplateSavedMenu,
            },
            },
            "Choose property": {
            listTemplateVocabsFn: {
                chooseTemplatePropertyFn: {
                afterChooseTemplatePropertyFn: self.workflowAnnotationTemplateLoop,
                },
            },
            },
        },
    };
        (self.workflow = {
            listResourceTypesFn: {
                _OR: {
                    "owl:Class": { promptResourceLabelFn: { listVocabsFn: { listSuperClassesFn: self.workflow_saveResource } } },
                    // "owl:ObjectProperty": { promptResourceLabelFn: { listVocabsFn: { listObjectPropertiesfn: self.workflow_saveResource } } },

                    "owl:NamedIndividual": { promptResourceLabelFn: { listVocabsFn: { listClassTypesFn: self.workflow_saveResource } } },
                    DatatypeProperty: { promptDatatypePropertyLabelFn: { listDatatypePropertyDomainFn: { listDatatypePropertyRangeFn: { createDataTypePropertyFn: { drawDataTypePropertFn: {} } } } } },
                    ImportClass: { listVocabsFn: { listSuperClassesFn: self.workflow_saveResource } },
                    ImportSource: { listImportsFn: { saveImportSource: self.workflow_end } },
                    AnnotationPropertiesTemplate: self.workflowAnnotationTemplateEntryMenu,
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
        createAxiomsFn:"createAxioms ",
        chooseTemplatePropertyFn: "Choose a property (template)",
        afterChooseTemplatePropertyFn: "Add property to template",
        saveAnnotationTemplateFn: "Save annotation properties template",
        showTemplateSaveMenuFn: "Save template",
        chooseExistingTemplateFn: "Choose an existing template to update",
        listTemplateVocabsFn: "Choose vocabulary (like Mapping Modeler)",
        shareTemplateNowFn: "Share template (profiles/users)",
        assignTemplateNowFn: "Assign template",
        showTemplatesListFn: "Templates list",
        listExistingTemplatesFn: "Choose an existing template",
        afterSelectExistingTemplateFn: "Template selected",
    };

    /**
     * Normalize a property label for display.
     * Removes the "vocab:" prefix when it exists (ex: "rdf:predicate" -> "predicate").
     * @param {string} vocab
     * @param {string} label
     * @returns {string}
     */
    function normalizePropertyLabel(vocab, label) {
        if (!label) return "";
        var prefix = vocab + ":";
        if (label.indexOf(prefix) === 0) {
            return label.substring(prefix.length);
        }
        return label;
    }

    /**
     * Deduplicate choices by URI (id). Keeps the first label seen.
     * @param {Array<{id:string,label:string}>} items
     * @returns {Array<{id:string,label:string}>}
     */
    function dedupeById(items) {
        var map = {};
        var out = [];
        items.forEach(function (it) {
            if (!it || !it.id) return;
            if (!map[it.id]) {
            map[it.id] = 1;
            out.push(it);
            }
        });
        return out;
    }

    self.functions = {
        listResourceTypesFn: function (queryParams, varName) {
            var choices = [
                { id: "owl:Class", label: "Class" },
                { id: "owl:NamedIndividual", label: "Individual" },
                // { id: "owl:ObjectProperty", label: "ObjectProperty" },
                { id: "DatatypeProperty", label: "DatatypeProperty" },
                //   { id: "ImportClass", label: "Import Class" },
                //  { id: "ImportSource", label: "Add import source " },
                { id: "AnnotationPropertiesTemplate", label: "Annotation properties Template" },
            ];
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
                self.myBotEngine.showList(vocabs, "selectedVocabulary");
            });
        },

        listTemplateVocabsFn: function () {
            // Same behavior as MappingModeler_bot: source + imports + basic vocabularies
            CommonBotFunctions.listVocabsFn(self.params.source || self.source, true, function (err, vocabs) {
                if (err) {
                return self.myBotEngine.abort(err.responseText || err);
                }
                if (!vocabs || vocabs.length === 0) {
                return self.myBotEngine.previousStep("no values found, try another option");
                }
                self.myBotEngine.showList(vocabs, "selectedVocabulary");
            });
        },

        promptResourceLabelFn: function () {
            self.myBotEngine.promptValue("resource label ", "resourceLabel");
            /*  self.params.resourceLabel = prompt("resource label ");
            _botEngine.insertBotMessage(self.params.resourceLabel);
            _botEngine.nextStep();*/
        },

        listSuperClassesFn: function () {
            CommonBotFunctions.listVocabClasses(self.params.selectedVocabulary, true, null, function (err, classes) {
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
                Sparql_OWL.copyUriTriplesFromSourceToSource(self.params.selectedVocabulary, self.params.source, self.params.resourceId, function (err, result) {});
            } else {
                var triples = Lineage_createResource.getResourceTriples(self.params.source, self.params.resourceType, null, self.params.resourceLabel, self.params.resourceId);

                //Lineage_createResource.addAnnotationTriples(triples,function(err, result) {


                   Lineage_createResource.writeResource(self.params.source, triples, function (err, resourceId) {
                       if (err) {
                           self.myBotEngine.abort(err.responseText);
                       }
                       self.params.resourceId = resourceId;
                       self.myBotEngine.nextStep();
                   });
               //})
            }

        },

        editResourceFn: function () {
            NodeInfosWidget.showNodeInfos(self.params.source, self.params.resourceId, "mainDialogDiv");
            self.myBotEngine.end();
            //  _botEngine.nextStep();
        },
        drawResourceFn: function () {
            var nodeData = {
                id: self.params.resourceId,
                data: {
                    id: self.params.resourceId,
                    source: self.params.source,
                },
            };
            Lineage_whiteboard.drawNodesAndParents(nodeData, 1, { legendType: "individualClasses" });
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
        createAxiomsFn:function(){
            if (self.params.resourceId) {
                var node={
                    id: self.params.resourceId,
                    data: {
                        id: self.params.resourceId,
                        source: self.params.source,
                        label:self.params.resourceLabel,
                    }
                }

                Lineage_whiteboard.drawNodesAndParents(node, 1, { legendType: "individualClasses" });
              UI.setDialogTitle("#smallDialogDiv", "Axioms of resource " + self.params.resourceLabel);

                NodeInfosAxioms.init(self.params.source, node, "smallDialogDiv",{newAxiom:true});
                self.myBotEngine.end();
            }
        },
        chooseTemplatePropertyFn: function () {
            // Annotation properties only (no ObjectProperty)
            var vocab = self.params.selectedVocabulary;
            if (!vocab) {
                return self.myBotEngine.previousStep("No vocabulary selected");
            }

            CommonBotFunctions.listNonObjectPropertiesFn([vocab], null, function (err, nonObjProps) {
                if (err) {
                    return self.myBotEngine.abort(err.responseText || err);
                }

                if (!nonObjProps || nonObjProps.length === 0) {
                    return self.myBotEngine.previousStep("No annotation properties found for this vocabulary");
                }

                // Build choices (id=URI) from non-object properties only
                var allProps = nonObjProps.map(function (p) {
                    return { id: p.id, label: normalizePropertyLabel(vocab, p.label) };
                });

                // Deduplicate + sort
                allProps = dedupeById(allProps);
                allProps.sort(function (a, b) {
                    return (a.label || "").localeCompare(b.label || "");
                });

                // Store label map for later usage
                self.params.templatePropertyUriToLabelMap = {};
                allProps.forEach(function (propChoice) {
                self.params.templatePropertyUriToLabelMap[propChoice.id] = propChoice.label;
                });

                self.myBotEngine.showList(allProps, "selectedTemplatePropertyUri");
            });
        }, 

        afterChooseTemplatePropertyFn: function () {
            var propertyUri = self.params.selectedTemplatePropertyUri;
            if (!propertyUri) {
                return self.myBotEngine.previousStep("No property selected, try again");
            }

            var vocab = self.params.selectedVocabulary;
            var propertyLabel = null;
            if (self.params.templatePropertyUriToLabelMap  && self.params.templatePropertyUriToLabelMap[propertyUri]) {
                propertyLabel = self.params.templatePropertyUriToLabelMap[propertyUri];
            }

            // Ensure arrays exist
            if (!self.params.templatePropertyUris) self.params.templatePropertyUris = [];
            if (!self.params.templatePropertySelections) self.params.templatePropertySelections = [];

            // 1) Flat unique URIs
            if (!self.params.templatePropertyUris.includes(propertyUri)) {
                self.params.templatePropertyUris.push(propertyUri);
            }

            // 2) Detailed selections (vocab + uri) dedup
            var exists = self.params.templatePropertySelections.some(function (selection) {
                return selection && selection.vocab === vocab && selection.propertyUri === propertyUri;
            });

            if (!exists) {
                self.params.templatePropertySelections.push({
                vocab: vocab,
                propertyUri: propertyUri,
                propertyLabel: propertyLabel,
                });
            }

            UI.message(self.params.templatePropertySelections.length + " properties selected");

            // Reset and loop menu
            self.params.selectedTemplatePropertyUri = "";
            self.myBotEngine.currentObj = self.workflowAnnotationTemplateLoop;
            self.myBotEngine.nextStep(self.workflowAnnotationTemplateLoop);
        },
        saveAnnotationTemplateFn: function () {
            if (!self.params.templatePropertyUris || self.params.templatePropertyUris.length === 0) {
                return self.myBotEngine.previousStep("No properties selected for template");
            }
            // If updating an existing template, merge existing selections with new ones
            if (UserDataWidget.currentTreeNode && self.params.existingTemplateContent) {
                var existingSelections = self.params.existingTemplateContent.selections || [];
                var newSelections = self.params.templatePropertySelections || [];
                var merged = existingSelections.concat(newSelections);

                var dedupMap = {};
                var mergedDedup = [];
                merged.forEach(function (selection) {
                    if (!selection  || !selection.vocab || !selection.propertyUri) {
                    return;
                    }
                    var selectionKey = selection.vocab + "||" + selection.propertyUri;
                    if (!dedupMap[selectionKey]) {
                    dedupMap[selectionKey] = 1;
                    mergedDedup.push(selection);
                    }
                });

                self.params.templatePropertySelections = mergedDedup;

                // rebuild flat properties list from merged selections
                var urisMap = {};
                self.params.templatePropertyUris = [];
                mergedDedup.forEach(function (selection) {
                    if (!urisMap[selection.propertyUri]) {
                    urisMap[selection.propertyUri] = 1;
                    self.params.templatePropertyUris.push(selection.propertyUri);
                    }
                });

                UI.message("Merged with existing template: " + self.params.templatePropertyUris.length + " properties total");
            }
            var dataContent = {
                templateSource: self.params.source,
                properties: self.params.templatePropertyUris,
                selections: self.params.templatePropertySelections,
            };

            UserDataWidget.showSaveDialog(
                "annotationPropertiesTemplate",
                dataContent, // <-- object, not string
                "smallDialogDiv",
                { title: "Save annotation properties template" },
                function (err, saved) {
                    if (err) {
                        return self.myBotEngine.abort(err.responseText || err);
                    }

                    // Keep reference to saved template for post-save actions
                    self.params.savedTemplate = saved;

                    // Optional: set currentTreeNode so existing UI actions (when visible) are consistent
                    UserDataWidget.currentTreeNode = { id: saved.id, data: saved };

                    UI.message(
                        "Template saved (id=" +
                        saved.id +
                        "). Choose what to do next: share, assign, or open the list."
                    );

                    // Open post-save menu
                    self.myBotEngine.currentObj = self.workflowAfterTemplateSavedMenu;
                    return self.myBotEngine.nextStep(self.workflowAfterTemplateSavedMenu);
                }
                
            );
        },
        showTemplateSaveMenuFn: function () {
            self.myBotEngine.currentObj = self.workflowAnnotationTemplateSaveMenu;
            self.myBotEngine.nextStep(self.workflowAnnotationTemplateSaveMenu);
        },

        chooseExistingTemplateFn: function () {
            // We list templates (user data) of type annotationPropertiesTemplate.
            // The user chooses one, then we update it (PUT) instead of creating a new one (POST).
            UserDataWidget.showListDialog(
                "smallDialogDiv",
                { filter: { data_type: "annotationPropertiesTemplate" } },
                function (err, item) {
                if (err) {
                    return self.myBotEngine.abort(err.responseText || err);
                }
                if (!item || !item.id) {
                    return self.myBotEngine.previousStep("No template selected");
                }

                UserDataWidget.currentTreeNode = { id: item.id, data: item };

                // Keep existing content to merge on save (if needed)
                self.params.existingTemplateContent = item.data_content;
                if (typeof self.params.existingTemplateContent === "string") {
                    try {
                        self.params.existingTemplateContent = JSON.parse(self.params.existingTemplateContent);
                    } catch (e) {
                        // keep as-is
                    }
                }

                self.myBotEngine.nextStep();
                }
            );
        },
        /**
         * Open a post-save action menu for a newly created annotation properties template.
         * The template may not be visible yet in the UserData tree, so actions must rely on saved.id.
         */
        shareTemplateNowFn : function () {
            if (!self.params.savedTemplate || !self.params.savedTemplate.id) {
                UI.message("No saved template found");
                return self.myBotEngine.end();
            }

            ShareUserData_bot.start(
                null,
                {
                title: "Share annotation properties template",
                userData: { id: self.params.savedTemplate.id },
                },
                function (err) {
                if (err) {
                    UI.message(err.responseText || err, true);
                }
                // Return to menu
                self.myBotEngine.currentObj = self.workflowAfterTemplateSavedMenu;
                return self.myBotEngine.nextStep(self.workflowAfterTemplateSavedMenu);
                }
            );
        },

        showTemplatesListFn : function () {
            UserDataWidget.showListDialog(
                "smallDialogDiv",
                { filter: { data_type: "annotationPropertiesTemplate" } },
                function (err, item) {
                if (err) {
                    return self.myBotEngine.abort(err.responseText || err);
                }
                // We don't force a selection here; it's just a "view list" action.
                self.myBotEngine.currentObj = self.workflowAfterTemplateSavedMenu;
                return self.myBotEngine.nextStep(self.workflowAfterTemplateSavedMenu);
                }
            );
        },

        assignTemplateNowFn: function () {
            // Choose a template first (existing UI list)
            UserDataWidget.showListDialog(
                "smallDialogDiv",
                { filter: { data_type: "annotationPropertiesTemplate" } },
                function (err, item) {
                if (err) {
                    return self.myBotEngine.abort(err.responseText || err);
                }
                if (!item || !item.id) {
                    UI.message("No template selected");
                    self.myBotEngine.currentObj = self.workflowAfterTemplateSavedMenu;
                    return self.myBotEngine.nextStep(self.workflowAfterTemplateSavedMenu);
                }

                // Choose assignment scope type
                var scopeChoices = [
                    { id: "source", label: "Assign to source (ontology)" },
                    { id: "group", label: "Assign to group" },
                    { id: "user", label: "Assign to user" },
                ];

                self.myBotEngine.showList(scopeChoices, "assignmentScopeType");

                // Hook next step using a small timeout (BotEngine list is async UI)
                setTimeout(function () {
                    var scopeType = self.params.assignmentScopeType;
                    if (!scopeType) {
                    UI.message("No scope selected");
                    self.myBotEngine.currentObj = self.workflowAfterTemplateSavedMenu;
                    return self.myBotEngine.nextStep(self.workflowAfterTemplateSavedMenu);
                    }

                    // Ask target value
                    var targetValue = null;
                    if (scopeType === "source") {
                    // Option: use active source as default, allow override
                    var defaultSource = self.params.source || Lineage_sources.activeSource;
                    targetValue = prompt("Enter sourceLabel to assign (e.g. testChakib)", defaultSource);
                    } else if (scopeType === "group") {
                    targetValue = prompt("Enter group name to assign (e.g. Annotator)", "");
                    } else if (scopeType === "user") {
                    targetValue = prompt("Enter user login to assign", authentication.currentUser ? authentication.currentUser.login : "");
                    }

                    if (!targetValue) {
                    UI.message("Assignment cancelled");
                    self.myBotEngine.currentObj = self.workflowAfterTemplateSavedMenu;
                    return self.myBotEngine.nextStep(self.workflowAfterTemplateSavedMenu);
                    }

                    // Build assignment payload
                    var content = {
                    templateId: item.id,
                    scope: { source: null, group: null, user: null },
                    resourceTypes: ["owl:Class", "owl:NamedIndividual"], // apply to new creations only
                    createdAt: new Date().toISOString(),
                    createdBy: authentication.currentUser ? authentication.currentUser.login : "",
                    };

                    if (scopeType === "source") content.scope.source = targetValue;
                    if (scopeType === "group") content.scope.group = targetValue;
                    if (scopeType === "user") content.scope.user = targetValue;

                    var payload = {
                    data_path: "",
                    data_type: "annotationPropertiesTemplateAssignment",
                    data_label: "Assignment for template " + item.id,
                    data_comment: "explicit assignment (Option 1: new creations only)",
                    data_group: content.scope.source || "",
                    data_tool: "lineage",
                    data_source: content.scope.source || "",
                    data_content: content,
                    is_shared: false,
                    owned_by: authentication.currentUser ? authentication.currentUser.login : "",
                    shared_profiles: [],
                    shared_users: [],
                    };

                    UserDataService.create(payload, function (err2) {
                    if (err2) {
                        UI.message(err2.responseText || "Assignment creation failed", true);
                    } else {
                        UI.message("Assignment created for template " + item.id);
                    }

                    // Return to menu
                    self.myBotEngine.currentObj = self.workflowAfterTemplateSavedMenu;
                    return self.myBotEngine.nextStep(self.workflowAfterTemplateSavedMenu);
                    });
                }, 300);
                }
            );
        },
        listExistingTemplatesFn: function () {
            var url = Config.apiUrl + "/users/data?data_type=annotationPropertiesTemplate";

            $.ajax({
                url: url,
                type: "GET",
                dataType: "json",
                success: function (data) {
                if (!data || data.length === 0) {
                    UI.message("No templates found");
                    self.myBotEngine.currentObj = self.workflowAnnotationTemplateEntryMenu;
                    return self.myBotEngine.nextStep(self.workflowAnnotationTemplateEntryMenu);
                }

                // Build choices for BotEngine list
                self.params.existingTemplatesMap = {};
                var choices = data.map(function (t) {
                    self.params.existingTemplatesMap[t.id] = t;
                    return { id: String(t.id), label: t.data_label || ("Template " + t.id) };
                });

                // Show list and store selected id
                self.myBotEngine.showList(choices, "selectedExistingTemplateId");
                },
                error: function (xhr, status, error) {
                return self.myBotEngine.abort(xhr.responseText || error);
                },
            });
        },
        afterSelectExistingTemplateFn: function () {
            var id = self.params.selectedExistingTemplateId;
            if (!id) {
                UI.message("No template selected");
                self.myBotEngine.currentObj = self.workflowAnnotationTemplateEntryMenu;
                return self.myBotEngine.nextStep(self.workflowAnnotationTemplateEntryMenu);
            }

            var tpl = self.params.existingTemplatesMap ? self.params.existingTemplatesMap[parseInt(id)] : null;
            if (!tpl) {
                UI.message("Template not found");
                self.myBotEngine.currentObj = self.workflowAnnotationTemplateEntryMenu;
                return self.myBotEngine.nextStep(self.workflowAnnotationTemplateEntryMenu);
            }

            // Reuse post-save menu by setting savedTemplate
            self.params.savedTemplate = { id: tpl.id };
            UserDataWidget.currentTreeNode = { id: tpl.id, data: tpl };

            UI.message("Template selected: " + (tpl.data_label || tpl.id));

            self.myBotEngine.currentObj = self.workflowAfterTemplateSavedMenu;
            return self.myBotEngine.nextStep(self.workflowAfterTemplateSavedMenu);
        },
    };
    return self;
})();

export default CreateResource_bot;
window.CreateResource_bot = CreateResource_bot;
