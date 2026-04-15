import BotEngineClass from "./_botEngineClass.js";
import OntologyModels from "../shared/ontologyModels.js";
import NodeInfosWidget from "../uiWidgets/nodeInfosWidget.js";
import PredicatesSelectorWidget from "../uiWidgets/predicatesSelectorWidget.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import DateWidget from "../uiWidgets/dateWidget.js";

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
     * @param {Object} [editItem] - If provided, the bot runs in edit mode: {predicateId, property, object, objectType}
     */
    self.start = function (source, editItem) {
        self.myBotEngine.init(Predicates_bot, self.workflow, null, function () {
            self.params = {
                source: source,
                selectedProperty: editItem ? editItem.property : null,
                selectedObject: editItem ? editItem.object : null,
                editItem: editItem || null,
            };
            self.myBotEngine.nextStep();
        });
    };

    function loadRecents() {
        var stored = localStorage.getItem("recentPredicatesBot");
        if (!stored) {
            return [];
        }
        try {
            return JSON.parse(stored);
        } catch (e) {
            return [];
        }
    }

    function storeRecent(property, object) {
        var recents = loadRecents();
        var entry = { property: property, object: object };
        recents = recents.filter(function (r) {
            return !(r.property === property && r.object === object);
        });
        recents.unshift(entry);
        if (recents.length > 5) {
            recents = recents.slice(0, 5);
        }
        localStorage.setItem("recentPredicatesBot", JSON.stringify(recents));
    }

    function setDialogTitle(title) {
        $("#botPanel").dialog("option", "title", title);
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

    function escapeLiteralForSparql(value) {
        return value.replace(/'/g, "\\'");
    }

    function formatObject(property, value) {
        if (!value) {
            return value;
        }
        if (property && property.indexOf("xsd:") === 0) {
            return "'" + escapeLiteralForSparql(value) + "'^^" + property;
        }
        if (Sparql_common.isTripleObjectString(property)) {
            return "'" + escapeLiteralForSparql(value) + "'";
        }
        if (value.indexOf("http") === 0) {
            return "<" + value + ">";
        }
        return value;
    }

    /**
     * Builds a hierarchical jstree: optional "recents" group + "usual" group + one group per vocab source.
     * Properties are leaf children under their source group.
     * @param {Function} callback - callback(err, jstreeNodes, parentNodeIds)
     */
    function buildPropertyJstreeData(callback) {
        var nodes = [
            { id: "__src__usual", text: "usual", parent: "#", data: { id: "__src__usual" } },
        ];
        var parentNodeIds = ["__src__usual"];
        var recents = loadRecents();
        if (recents.length > 0) {
            nodes.unshift({ id: "__src__recents", text: "recents", parent: "#", data: { id: "__src__recents" } });
            parentNodeIds.push("__src__recents");
            recents.forEach(function (r) {
                var nodeId = "__recent__" + r.property + "__" + r.object;
                nodes.push({ id: nodeId, text: r.property + " → " + r.object, parent: "__src__recents", data: { id: nodeId, recentProperty: r.property, recentObject: r.object } });
            });
        }
        var seen = {};

        PredicatesSelectorWidget.usualProperties
            .filter(function (p) { return p !== ""; })
            .forEach(function (p) {
                if (!seen[p]) {
                    seen[p] = true;
                    nodes.push({ id: p, text: p, parent: "__src__usual", data: { id: p } });
                }
            });

        var vocabs = Object.keys(Config.ontologiesVocabularyModels);
        vocabs.forEach(function (vocab) {
            nodes.push({ id: "__src__" + vocab, text: vocab, parent: "#", data: { id: "__src__" + vocab } });
            parentNodeIds.push("__src__" + vocab);
        });

        async.eachSeries(vocabs, function (vocab, callbackEach) {
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
                            nodes.push({ id: p.id, text: p.label || p.id, parent: "__src__" + vocab, data: { id: p.id } });
                        }
                    }
                    for (var key2 in model.nonObjectProperties) {
                        var p2 = model.nonObjectProperties[key2];
                        if (!seen[p2.id]) {
                            seen[p2.id] = true;
                            nodes.push({ id: p2.id, text: p2.label || p2.id, parent: "__src__" + vocab, data: { id: p2.id } });
                        }
                    }
                }
                callbackEach();
            });
        }, function () {
            callback(null, nodes, parentNodeIds);
        });
    }

    /**
     * Builds a hierarchical jstree: "usual" group + one group per vocab source.
     * Classes are leaf children under their source group.
     * @param {Function} callback - callback(err, jstreeNodes, parentNodeIds)
     */
    function buildObjectJstreeData(callback) {
        var nodes = [
            { id: "__src__usual", text: "usual", parent: "#", data: { id: "__src__usual" } },
        ];
        var parentNodeIds = ["__src__usual"];
        var seen = {};

        PredicatesSelectorWidget.usualObjectClasses
            .filter(function (o) { return o !== ""; })
            .forEach(function (o) {
                if (!seen[o]) {
                    seen[o] = true;
                    nodes.push({ id: o, text: o, parent: "__src__usual", data: { id: o } });
                }
            });

        var vocabs = Object.keys(Config.ontologiesVocabularyModels);
        vocabs.forEach(function (vocab) {
            nodes.push({ id: "__src__" + vocab, text: vocab, parent: "#", data: { id: "__src__" + vocab } });
            parentNodeIds.push("__src__" + vocab);
        });

        async.eachSeries(vocabs, function (vocab, callbackEach) {
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
                            nodes.push({ id: c.id, text: c.label || c.id, parent: "__src__" + vocab, data: { id: c.id } });
                        }
                    }
                }
                callbackEach();
            });
        }, function () {
            callback(null, nodes, parentNodeIds);
        });
    }

    self.functions = {
        choosePropertyFn: function () {
            if (self.params.editItem) {
                self.myBotEngine.nextStep();
                return;
            }
            setDialogTitle("choose property");
            $("#botPanel").parent().find("#previousButtonBot").hide();
            buildPropertyJstreeData(function (err, jstreeData, parentNodeIds) {
                if (err) {
                    return MainController.errorAlert(err);
                }
                self.myBotEngine.showTree(
                    jstreeData,
                    null,
                    { withCheckboxes: false, openAll: false, parentNodeIds: parentNodeIds },
                    null,
                    function (selectedId, node) {
                        if (node && node.data && node.data.recentProperty) {
                            self.params.selectedProperty = node.data.recentProperty;
                            self.params.selectedObject = node.data.recentObject;
                            self.params.skipObject = true;
                        } else {
                            self.params.selectedProperty = selectedId;
                            self.params.skipObject = false;
                        }
                        self.myBotEngine.nextStep();
                    }
                );
            });
        },

        chooseObjectFn: function () {
            setDialogTitle("choose Object");
            $("#botPanel").parent().find("#previousButtonBot").show();

            if (self.params.skipObject) {
                self.params.skipObject = false;
                self.myBotEngine.nextStep();
                return;
            }

            if (isLiteralProperty(self.params.selectedProperty)) {
                if (self.params.selectedProperty === "xsd:dateTime") {
                    self.myBotEngine.promptValue("select date", "selectedObject", self.params.selectedObject || "", null, function (value) {
                        if (!value) {
                            return self.myBotEngine.previousStep();
                        }
                        self.params.selectedObject = value;
                        self.myBotEngine.nextStep();
                    });
                    DateWidget.setDatePickerOnInput("botPromptInput", null, null);
                } else {
                    self.myBotEngine.promptTextarea("enter value", "selectedObject", self.params.selectedObject || "", function (valueSafe) {
                        self.params.selectedObject = valueSafe;
                    });
                }
                return;
            }

            buildObjectJstreeData(function (err, jstreeData, parentNodeIds) {
                if (err) {
                    return MainController.errorAlert(err);
                }
                self.myBotEngine.showTree(
                    jstreeData,
                    null,
                    { withCheckboxes: false, openAll: false, parentNodeIds: parentNodeIds },
                    null,
                    function (selectedId) {
                        self.params.selectedObject = selectedId;
                        self.myBotEngine.nextStep();
                    }
                );
            });
        },

        saveStepFn: function () {
            setDialogTitle("Add Predicate");
            $("#botPanel").parent().find("#previousButtonBot").show();
            self.myBotEngine.showList([{ id: "save", label: "Save" }], null, null, false, function () {
                var property = formatProperty(self.params.selectedProperty);
                var objectValue = formatObject(self.params.selectedProperty, self.params.selectedObject);

                if (!property || !objectValue) {
                    return MainController.errorAlert("Missing property or object value");
                }

                function doSave() {
                    NodeInfosWidget.addPredicate(property, objectValue, null, null, function (err) {
                        if (err) {
                            return MainController.errorAlert(err);
                        }
                        storeRecent(self.params.selectedProperty, self.params.selectedObject);
                        self.myBotEngine.nextStep();
                    });
                }

                if (self.params.editItem) {
                    var oldObject = self.params.editItem.object;
                    var oldObjectArg = self.params.editItem.objectType === "literal"
                        ? { isString: true, value: oldObject }
                        : oldObject;
                    Sparql_generic.deleteTriples(
                        self.params.source,
                        NodeInfosWidget.currentNodeId,
                        self.params.editItem.property,
                        oldObjectArg,
                        function (err) {
                            if (err) {
                                return MainController.errorAlert(err);
                            }
                            doSave();
                        }
                    );
                } else {
                    doSave();
                }
            });
        },
    };

    return self;
})();

export default Predicates_bot;
window.Predicates_bot = Predicates_bot;
