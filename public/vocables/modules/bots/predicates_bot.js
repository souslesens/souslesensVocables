import BotEngineClass from "./_botEngineClass.js";
import OntologyModels from "../shared/ontologyModels.js";
import NodeInfosWidget from "../uiWidgets/nodeInfosWidget.js";
import PredicatesSelectorWidget from "../uiWidgets/predicatesSelectorWidget.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";

var Predicates_bot = (function () {
    var self = {};
    self.myBotEngine = new BotEngineClass();

    self.title = "Add Predicate";

    self.workflow = {
        propertyStepFn: {
            propertyVocabFn: {
                choosePropertyFn: {
                    objectStepFn: {
                        objectVocabFn: {
                            chooseObjectFn: {
                                saveStepFn: {},
                            },
                        },
                    },
                },
            },
        },
    };

    self.functionTitles = {
        propertyStepFn: "Add Predicate",
        propertyVocabFn: "vocabulary",
        choosePropertyFn: "choose",
        objectStepFn: "Add Predicate",
        objectVocabFn: "vocabulary",
        chooseObjectFn: "choose",
        saveStepFn: "Add Predicate",
    };

    /**
     * @function start
     * @name start
     * @memberof Predicates_bot
     * Opens the bot to add a predicate on the currently selected node.
     * @param {string} source - Active source label.
     */
    self.start = function (source) {
        self.myBotEngine.init(Predicates_bot, self.workflow, null, function () {
            self.params = {
                source: source,
                propertyVocab: null,
                selectedProperty: null,
                objectVocab: null,
                selectedObject: null,
            };
            self.myBotEngine.nextStep();
        });
    };

    function setDialogTitle(title) {
        $("#botPanel").dialog("option", "title", title);
    }

    function buildVocabJstree() {
        var vocabs = [{ id: "usual", label: "usual" }];
        Object.keys(Config.ontologiesVocabularyModels).forEach(function (key) {
            vocabs.push({ id: key, label: key });
        });
        return vocabs.map(function (v) {
            return { id: v.id, text: v.label, parent: "#", data: v };
        });
    }

    function buildItemJstree(items) {
        return items
            .filter(function (item) { return item && item.id; })
            .map(function (item) {
                return { id: item.id, text: item.label || item.id, parent: "#", data: item };
            });
    }

    function isLiteralProperty(property) {
        if (!property) {
            return false;
        }
        if (property.indexOf("xsd:") === 0) {
            return true;
        }
        return Sparql_common.isTripleObjectString(property);
    }

    function formatProperty(value) {
        if (!value) {
            return value;
        }
        if (value.indexOf("xsd:") === 0) {
            return "owl:hasValue";
        }
        if (value.indexOf("http") === 0) {
            return "<" + value + ">";
        }
        return value;
    }

    function formatObject(property, value) {
        if (!value) {
            return value;
        }
        if (isLiteralProperty(property)) {
            if (property.indexOf("xsd:") === 0 && property !== "xsd:string") {
                return "'" + value + "'^^" + property;
            }
            return "'" + value + "'";
        }
        if (value.indexOf("http") === 0) {
            return "<" + value + ">";
        }
        return value;
    }

    function getPropertiesForVocab(vocab, callback) {
        if (vocab === "usual") {
            var props = PredicatesSelectorWidget.usualProperties
                .filter(function (p) { return p !== ""; })
                .map(function (p) { return { id: p, label: p }; });
            return callback(null, props);
        }
        OntologyModels.registerSourcesModel([vocab], null, function (err) {
            if (err) {
                return callback(err);
            }
            var model = Config.ontologiesVocabularyModels[vocab];
            var props = [];
            if (model) {
                for (var key in model.properties) {
                    var p = model.properties[key];
                    props.push({ id: p.id, label: p.label || p.id });
                }
                for (var key2 in model.nonObjectProperties) {
                    var p2 = model.nonObjectProperties[key2];
                    props.push({ id: p2.id, label: p2.label || p2.id });
                }
                props.sort(function (a, b) { return a.label.localeCompare(b.label); });
            }
            return callback(null, props);
        });
    }

    function getObjectsForVocab(vocab, callback) {
        if (vocab === "usual") {
            var items = PredicatesSelectorWidget.usualObjectClasses
                .filter(function (o) { return o !== ""; })
                .map(function (o) { return { id: o, label: o }; });
            return callback(null, items);
        }
        OntologyModels.registerSourcesModel([vocab], null, function (err) {
            if (err) {
                return callback(err);
            }
            var model = Config.ontologiesVocabularyModels[vocab];
            var items = [];
            if (model) {
                for (var classId in model.classes) {
                    var c = model.classes[classId];
                    if (c && c.id && c.id.indexOf("http") === 0) {
                        items.push({ id: c.id, label: c.label || c.id });
                    }
                }
                items.sort(function (a, b) { return a.label.localeCompare(b.label); });
            }
            return callback(null, items);
        });
    }

    self.functions = {
        propertyStepFn: function () {
            setDialogTitle("Add Predicate");
            self.myBotEngine.showList([{ id: "property", label: "Property" }], null, null, false, function () {
                self.myBotEngine.nextStep();
            });
        },

        propertyVocabFn: function () {
            setDialogTitle("vocabulary");
            self.myBotEngine.showTree(buildVocabJstree(), "propertyVocab", { withCheckboxes: false }, null, function (selectedId) {
                self.params.propertyVocab = selectedId;
                self.myBotEngine.nextStep();
            });
        },

        choosePropertyFn: function () {
            setDialogTitle("choose");
            getPropertiesForVocab(self.params.propertyVocab, function (err, props) {
                if (err) {
                    return MainController.errorAlert(err);
                }
                self.myBotEngine.showTree(buildItemJstree(props), null, { withCheckboxes: false }, null, function (selectedId) {
                    self.myBotEngine.promptValue("choose", "selectedProperty", selectedId, null, function (value) {
                        if (!value) {
                            return self.myBotEngine.previousStep();
                        }
                        self.params.selectedProperty = value;
                        self.myBotEngine.nextStep();
                    });
                });
            });
        },

        objectStepFn: function () {
            setDialogTitle("Add Predicate");
            self.myBotEngine.showList([{ id: "object", label: "Object" }], null, null, false, function () {
                self.myBotEngine.nextStep();
            });
        },

        objectVocabFn: function () {
            setDialogTitle("vocabulary");
            self.myBotEngine.showTree(buildVocabJstree(), "objectVocab", { withCheckboxes: false }, null, function (selectedId) {
                self.params.objectVocab = selectedId;
                self.myBotEngine.nextStep();
            });
        },

        chooseObjectFn: function () {
            setDialogTitle("choose");
            getObjectsForVocab(self.params.objectVocab, function (err, items) {
                if (err) {
                    return MainController.errorAlert(err);
                }
                self.myBotEngine.showTree(buildItemJstree(items), null, { withCheckboxes: false }, null, function (selectedId) {
                    self.myBotEngine.promptValue("choose", "selectedObject", selectedId, null, function (value) {
                        if (!value) {
                            return self.myBotEngine.previousStep();
                        }
                        self.params.selectedObject = value;
                        self.myBotEngine.nextStep();
                    });
                });
            });
        },

        saveStepFn: function () {
            setDialogTitle("Add Predicate");
            self.myBotEngine.showList([{ id: "save", label: "Save" }], null, null, false, function () {
                var property = formatProperty(self.params.selectedProperty);
                var objectValue = formatObject(self.params.selectedProperty, self.params.selectedObject);

                if (!property || !objectValue) {
                    return MainController.errorAlert("Missing property or object value");
                }

                NodeInfosWidget.addPredicate(property, objectValue, null, null, function (err) {
                    if (err) {
                        return MainController.errorAlert(err);
                    }
                    self.myBotEngine.nextStep();
                });
            });
        },
    };

    return self;
})();

export default Predicates_bot;
window.Predicates_bot = Predicates_bot;
