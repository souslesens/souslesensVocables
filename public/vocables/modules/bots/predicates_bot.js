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
            chooseObjectFn: {},
        },
    };

    self.functionTitles = {
        choosePropertyFn: "choose property",
        chooseObjectFn: "choose Object",
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
                enteredUri: false,
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

    function sanitizeUri(uri) {
        if (!uri) {
            return uri;
        }
        return uri
            .trim()
            .replace(/\\/g, "")
            .replace(/\r/g, "")
            .replace(/\n/g, "")
            .replace(/\t/g, "")
            .replace(/\\xa0/g, "_")
            .replace(/\xa0/g, "_")
            .replace(/@/g, "_")
            .replace(/\$/g, "")
            .replace(/"/g, "")
            .replace(/'/g, "")
            .replace(/[<>{}|^`]/g, "")
            .replace(/\s+/g, "_");
    }

    function isMatchProperty(property) {
        if (!property) {
            return false;
        }
        return property.toLowerCase().indexOf("match") > -1;
    }

    function isLiteralRange(range) {
        if (!range) {
            return true;
        }
        if (range.startsWith("http://www.w3.org/2001/XMLSchema#")) {
            return true;
        }
        if (range === "http://www.w3.org/2000/01/rdf-schema#Literal") {
            return true;
        }
        if (range.indexOf("xsd:") === 0) {
            return true;
        }
        return false;
    }

    function isLiteralProperty(property) {
        if (!property) {
            return false;
        }
        if (property.indexOf("xsd:") === 0) {
            return true;
        }
        for (var vocab in Config.ontologiesVocabularyModels) {
            var model = Config.ontologiesVocabularyModels[vocab];
            if (model && model.nonObjectProperties && model.nonObjectProperties[property]) {
                var range = model.nonObjectProperties[property].range;
                if (isLiteralRange(range)) {
                    return true;
                }
            }
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

    function isValidObjectUri(value) {
        if (!value) {
            return false;
        }
        if (value.indexOf("http://") === 0 || value.indexOf("https://") === 0) {
            return true;
        }
        if (/^[a-zA-Z][a-zA-Z0-9_]*:[^\s]+$/.test(value)) {
            return true;
        }
        return false;
    }

    function getNonObjectPropertyRange(property) {
        for (var vocab in Config.ontologiesVocabularyModels) {
            var model = Config.ontologiesVocabularyModels[vocab];
            if (model && model.nonObjectProperties && model.nonObjectProperties[property]) {
                return model.nonObjectProperties[property].range || null;
            }
        }
        return null;
    }

    function formatObject(property, value) {
        if (!value) {
            return value;
        }
        if (property && property.indexOf("xsd:") === 0) {
            return "'" + Sparql_common.formatStringForTriple(value) + "'^^" + property;
        }
        if (value.indexOf("http") === 0) {
            return "<" + value + ">";
        }
        if (Sparql_common.isTripleObjectString(property)) {
            return Sparql_common.formatStringForTriple(value);
        }
        var range = getNonObjectPropertyRange(property);
        if (range) {
            if (range.indexOf("xsd:") === 0 || range.startsWith("http://www.w3.org/2001/XMLSchema#")) {
                var xsdType = range.startsWith("http://www.w3.org/2001/XMLSchema#") ? "xsd:" + range.split("#")[1] : range;
                return "'" + Sparql_common.formatStringForTriple(value) + "'^^" + xsdType;
            }
        }
        return Sparql_common.formatStringForTriple(value);
    }

    /**
     * Builds a hierarchical jstree: optional "recents" group + "usual" group + one group per vocab source.
     * Properties are leaf children under their source group.
     * @param {Function} callback - callback(err, jstreeNodes, parentNodeIds)
     */
    function buildPropertyJstreeData(callback) {
        var nodes = [{ id: "__src__usual", text: "usual", parent: "#", data: { id: "__src__usual" } }];
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
            .filter(function (p) {
                return p !== "";
            })
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
                                nodes.push({ id: p.id, text: p.label || p.id, parent: "__src__" + vocab, data: { id: p.id, isObjectProperty: true } });
                            }
                        }
                        for (var key2 in model.nonObjectProperties) {
                            var p2 = model.nonObjectProperties[key2];
                            if (!seen[p2.id]) {
                                seen[p2.id] = true;
                                nodes.push({ id: p2.id, text: p2.label || p2.id, parent: "__src__" + vocab, data: { id: p2.id, isObjectProperty: false } });
                            }
                        }
                    }
                    callbackEach();
                });
            },
            function () {
                callback(null, nodes, parentNodeIds);
            },
        );
    }

    /**
     * Builds a hierarchical jstree: "usual" group + one group per vocab source.
     * Classes are leaf children under their source group.
     * @param {Function} callback - callback(err, jstreeNodes, parentNodeIds)
     */
    function buildObjectJstreeData(showEnterUri, callback) {
        var nodes = [];
        if (showEnterUri) {
            nodes.push({ id: "__enter_uri__", text: "enter URI", parent: "#", data: { id: "__enter_uri__" } });
        }
        nodes.push({ id: "__src__usual", text: "usual", parent: "#", data: { id: "__src__usual" } });
        var parentNodeIds = ["__src__usual"];
        var seen = {};

        PredicatesSelectorWidget.usualObjectClasses
            .filter(function (o) {
                return o !== "";
            })
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
                                nodes.push({ id: c.id, text: c.label || c.id, parent: "__src__" + vocab, data: { id: c.id } });
                            }
                        }
                    }
                    callbackEach();
                });
            },
            function () {
                callback(null, nodes, parentNodeIds);
            },
        );
    }

    function executeSave() {
        var property = formatProperty(self.params.selectedProperty);
        var objectValue = formatObject(self.params.selectedProperty, self.params.selectedObject);

        if (!property || !objectValue) {
            return MainController.errorAlert("Missing property or object value");
        }

        if (!PredicatesSelectorWidget.validateLiteralValue(self.params.selectedProperty, self.params.selectedObject)) {
            return;
        }

        if ((self.params.isObjectProperty === true || self.params.enteredUri) && !isLiteralProperty(self.params.selectedProperty) && !isValidObjectUri(self.params.selectedObject)) {
            return MainController.errorAlert("Invalid URI: '" + self.params.selectedObject + "'. Expected http://... or prefix:localName");
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
            var oldObjectArg = self.params.editItem.objectType === "literal" ? { isString: true, value: oldObject } : oldObject;
            Sparql_generic.deleteTriples(self.params.source, NodeInfosWidget.currentNodeId, self.params.editItem.property, oldObjectArg, function (err) {
                if (err) {
                    return MainController.errorAlert(err);
                }
                doSave();
            });
        } else {
            doSave();
        }
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
                self.myBotEngine.showTree(jstreeData, null, { withCheckboxes: false, openAll: false, parentNodeIds: parentNodeIds }, null, function (selectedId, node) {
                    if (node && node.data && node.data.recentProperty) {
                        self.params.selectedProperty = node.data.recentProperty;
                        self.params.selectedObject = node.data.recentObject;
                        self.params.isObjectProperty = null;
                        self.params.skipObject = true;
                    } else {
                        self.params.selectedProperty = selectedId;
                        self.params.isObjectProperty = node && node.data && node.data.isObjectProperty !== undefined ? node.data.isObjectProperty : null;
                        self.params.skipObject = false;
                    }
                    self.myBotEngine.nextStep();
                });
            });
        },

        chooseObjectFn: function () {
            setDialogTitle("choose Object");
            $("#botPanel").parent().find("#previousButtonBot").show();

            if (self.params.skipObject) {
                self.params.skipObject = false;
                executeSave();
                return;
            }

            var literalProp = isLiteralProperty(self.params.selectedProperty);
            if (!literalProp && self.params.isObjectProperty !== null && self.params.isObjectProperty !== undefined) {
                literalProp = !self.params.isObjectProperty;
            }

            if (literalProp) {
                var propRange = getNonObjectPropertyRange(self.params.selectedProperty);
                var isDateTime = self.params.selectedProperty === "xsd:dateTime" || propRange === "xsd:dateTime" || propRange === "http://www.w3.org/2001/XMLSchema#dateTime";
                if (isDateTime) {
                    self.myBotEngine.promptValue("select date", "selectedObject", self.params.selectedObject || "", null, function (value) {
                        self.params.selectedObject = value;
                        executeSave();
                    });
                    DateWidget.setDatePickerOnInput("botPromptInput", null, null);
                } else {
                    self.myBotEngine.promptTextarea("enter value", "selectedObject", self.params.selectedObject || "", function (valueSafe, rawValue) {
                        var raw = rawValue !== undefined ? rawValue : valueSafe;
                        self.params.selectedObject = raw.replace(/[\r\n]+/g, " ");
                        executeSave();
                    });
                }
                return;
            }

            buildObjectJstreeData(!isLiteralProperty(self.params.selectedProperty), function (err, jstreeData, parentNodeIds) {
                if (err) {
                    return MainController.errorAlert(err);
                }
                self.myBotEngine.showTree(jstreeData, null, { withCheckboxes: false, openAll: false, parentNodeIds: parentNodeIds }, null, function (selectedId) {
                    if (selectedId === "__enter_uri__") {
                        self.myBotEngine.promptValue("enter URI", "selectedObject", "", null, function (value) {
                            self.params.selectedObject = sanitizeUri(value);
                            self.params.enteredUri = true;
                            executeSave();
                        });
                        return;
                    }
                    self.params.enteredUri = false;
                    self.params.selectedObject = selectedId;
                    executeSave();
                });
            });
        },
    };

    return self;
})();

export default Predicates_bot;
window.Predicates_bot = Predicates_bot;
