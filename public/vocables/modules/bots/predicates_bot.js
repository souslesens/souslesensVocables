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
        choosePropertyFn: {
            chooseObjectFn: {
                saveStepFn: {},
            },
        },
    };

    self.functionTitles = {
        choosePropertyFn: "choose property",
        chooseObjectFn: "choose Object",
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
                selectedProperty: null,
                selectedObject: null,
            };
            self.myBotEngine.nextStep();
        });
    };

    function setDialogTitle(title) {
        $("#botPanel").dialog("option", "title", title);
    }

    /**
     * Builds a jstree array with a "search" node at the top followed by
     * "usual" and all ontologyVocabularyModel sources.
     * @param {string} searchLabel - Label for the special search node.
     * @returns {Array} jstree-compatible node array.
     */
    function buildSourcesJstreeWithSearch(searchLabel) {
        var nodes = [
            {
                id: "__search__",
                text: searchLabel,
                parent: "#",
                data: { id: "__search__" },
                icon: "jstree-icon jstree-themeicon fa fa-search",
            },
            { id: "usual", text: "usual", parent: "#", data: { id: "usual" } },
        ];
        Object.keys(Config.ontologiesVocabularyModels).forEach(function (vocab) {
            nodes.push({ id: vocab, text: vocab, parent: "#", data: { id: vocab } });
        });
        return nodes;
    }

    /**
     * Returns properties (object + non-object) for a single vocab source.
     * @param {string} vocab - Vocab name or "usual".
     * @param {Function} callback - callback(err, [{id, label}])
     */
    function getSourceProperties(vocab, callback) {
        if (vocab === "usual") {
            var usualProps = PredicatesSelectorWidget.usualProperties
                .filter(function (p) {
                    return p !== "";
                })
                .map(function (p) {
                    return { id: p, label: p };
                });
            return callback(null, usualProps);
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
            }
            props.sort(function (a, b) {
                return a.label.localeCompare(b.label);
            });
            return callback(null, props);
        });
    }

    /**
     * Returns all properties from all vocabs, each labeled with "(vocabName)" suffix.
     * Deduplicates by property id.
     * @param {Function} callback - callback(err, [{id, label}])
     */
    function getAllProperties(callback) {
        var props = [];
        var seen = {};

        PredicatesSelectorWidget.usualProperties
            .filter(function (p) {
                return p !== "";
            })
            .forEach(function (p) {
                if (!seen[p]) {
                    seen[p] = true;
                    props.push({ id: p, label: p + " (usual)" });
                }
            });

        var vocabs = Object.keys(Config.ontologiesVocabularyModels);
        async.eachSeries(
            vocabs,
            function (vocab, callbackEach) {
                OntologyModels.registerSourcesModel([vocab], null, function (err) {
                    if (err) {
                        return callbackEach();
                    }
                    var model = Config.ontologiesVocabularyModels[vocab];
                    if (model) {
                        for (var key in model.properties) {
                            var p = model.properties[key];
                            if (!seen[p.id]) {
                                seen[p.id] = true;
                                props.push({ id: p.id, label: (p.label || p.id) + " (" + vocab + ")" });
                            }
                        }
                        for (var key2 in model.nonObjectProperties) {
                            var p2 = model.nonObjectProperties[key2];
                            if (!seen[p2.id]) {
                                seen[p2.id] = true;
                                props.push({ id: p2.id, label: (p2.label || p2.id) + " (" + vocab + ")" });
                            }
                        }
                    }
                    callbackEach();
                });
            },
            function () {
                props.sort(function (a, b) {
                    return a.label.localeCompare(b.label);
                });
                return callback(null, props);
            },
        );
    }

    /**
     * Returns objects (classes) for a single vocab source.
     * @param {string} vocab - Vocab name or "usual".
     * @param {Function} callback - callback(err, [{id, label}])
     */
    function getSourceObjects(vocab, callback) {
        if (vocab === "usual") {
            var usualObjects = PredicatesSelectorWidget.usualObjectClasses
                .filter(function (o) {
                    return o !== "";
                })
                .map(function (o) {
                    return { id: o, label: o };
                });
            return callback(null, usualObjects);
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
                items.sort(function (a, b) {
                    return a.label.localeCompare(b.label);
                });
            }
            return callback(null, items);
        });
    }

    /**
     * Returns all objects from all vocabs, each labeled with "(vocabName)" suffix.
     * Deduplicates by class id.
     * @param {Function} callback - callback(err, [{id, label}])
     */
    function getAllObjects(callback) {
        var items = [];
        var seen = {};

        PredicatesSelectorWidget.usualObjectClasses
            .filter(function (o) {
                return o !== "";
            })
            .forEach(function (o) {
                if (!seen[o]) {
                    seen[o] = true;
                    items.push({ id: o, label: o + " (usual)" });
                }
            });

        var vocabs = Object.keys(Config.ontologiesVocabularyModels);
        async.eachSeries(
            vocabs,
            function (vocab, callbackEach) {
                OntologyModels.registerSourcesModel([vocab], null, function (err) {
                    if (err) {
                        return callbackEach();
                    }
                    var model = Config.ontologiesVocabularyModels[vocab];
                    if (model) {
                        for (var classId in model.classes) {
                            var c = model.classes[classId];
                            if (c && c.id && c.id.indexOf("http") === 0 && !seen[c.id]) {
                                seen[c.id] = true;
                                items.push({ id: c.id, label: (c.label || c.id) + " (" + vocab + ")" });
                            }
                        }
                    }
                    callbackEach();
                });
            },
            function () {
                items.sort(function (a, b) {
                    return a.label.localeCompare(b.label);
                });
                return callback(null, items);
            },
        );
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

    /**
     * Shows a list of items in the bot and then an editable promptValue.
     * On confirmation calls onConfirmed(value).
     * @param {Array} items - [{id, label}]
     * @param {string} varName - param name for the promptValue
     * @param {Function} onConfirmed - callback(confirmedValue)
     */
    function showItemsAndConfirm(items, varName, onConfirmed) {
        self.myBotEngine.showList(items, null, null, false, function (selectedId) {
            $("#" + self.myBotEngine.divId)
                .find("#botFilterProposalDiv")
                .hide();
            self.myBotEngine.promptValue("choose", varName, selectedId, null, function (value) {
                onConfirmed(value);
            });
        });
    }

    self.functions = {
        /**
         * Displays a jstree of vocab sources (+ "search property" node).
         * - Clicking a source shows that source's properties → editable confirm → choose Object step.
         * - Clicking "search property" shows all properties from all sources (with vocab suffix) → editable confirm → choose Object step.
         */
        choosePropertyFn: function () {
            setDialogTitle("choose property");
            var sourceTree = buildSourcesJstreeWithSearch("search property");

            self.myBotEngine.showTree(sourceTree, null, { withCheckboxes: false }, null, function (selectedId) {
                var loadItems =
                    selectedId === "__search__"
                        ? getAllProperties
                        : function (cb) {
                              return getSourceProperties(selectedId, cb);
                          };

                loadItems(function (err, items) {
                    if (err) {
                        return MainController.errorAlert(err);
                    }
                    showItemsAndConfirm(items, "selectedProperty", function (value) {
                        self.params.selectedProperty = value;
                        self.myBotEngine.nextStep();
                    });
                });
            });
        },

        /**
         * Displays a jstree of vocab sources (+ "search object" node).
         * - Clicking a source shows that source's classes → editable confirm → save step.
         * - Clicking "search object" shows all objects from all sources (with vocab suffix) → editable confirm → save step.
         */
        chooseObjectFn: function () {
            setDialogTitle("choose Object");
            var sourceTree = buildSourcesJstreeWithSearch("search object");

            self.myBotEngine.showTree(sourceTree, null, { withCheckboxes: false }, null, function (selectedId) {
                var loadItems =
                    selectedId === "__search__"
                        ? getAllObjects
                        : function (cb) {
                              return getSourceObjects(selectedId, cb);
                          };

                loadItems(function (err, items) {
                    if (err) {
                        return MainController.errorAlert(err);
                    }
                    showItemsAndConfirm(items, "selectedObject", function (value) {
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
