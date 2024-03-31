import CommonBotFunctions from "../../bots/_commonBotFunctions.js";

const AxiomEditor = (function () {
    var self = {};

    self.init = function (divId) {
        $("#smallDialogDiv").dialog("open");
        $("#smallDialogDiv").load("modules/tools/axioms/axiomEditor.html", function (x, y) {
            $("#axiomsEditor_input").focus();
        });
    };

    self.onInputChar = function (text) {
        var text2 = text.toLowerCase();
        if (text2 == "c") return;
        if (text2.toLowerCase().startsWith("cl")) {
            self.currentObject = "listClass";
            self.onSelectSuggestion("listClass");
            $("#axiomsEditor_textDiv").append("Class");
            return;
        }

        self.getSuggestions(text, function (err, suggestions) {
            if (err) {
                return alert(err.responseText);
            }
            common.fillSelectOptions("axiomsEditor_suggestionsSelect", suggestions);
            if (err) {
                alert(err);
            }
        });

        return;
        if (text.length > 0) {
            var tokens = self.autoComplete(text);
            var token = null;
            if (tokens.length == 1) {
                token = tokens[0];
            } else {
                return;
            }

            self.addSuggestion(token);
            if (token.id == "Class") {
                self.onSelectSuggestion("ClassVocab");
                return;
            }
            if (token.id == "ObjectProperty") {
                self.onSelectSuggestion("ObjectPropertyVocab");
                return;
            }

            self.getSuggestions(token.id, function (err, result) {
                if (err) {
                    return alert(err.responseText);
                }
                var suggestions = result.suggestions;
                common.fillSelectOptions("axiomsEditor_suggestionsSelect", suggestions);
                if (err) {
                    alert(err);
                }
            });
        }
    };

    self.addSuggestion = function (suggestion, cssClass) {
        if (!cssClass) {
            cssClass = "axiom_keyWord";
        }

        if (typeof suggestion == "string") {
            var str = suggestion;
            suggestion = {
                id: str,
                label: str,
            };
        }

        $("#axiomsEditor_input").val("");
        $("#axiomsEditor_input").focus();
        self.onInputChar(suggestion.label);
        $("#axiomsEditor_input").before("<span class='axiom_element " + cssClass + "' id='" + suggestion.id + "'>" + suggestion.label + "</span>");
        $("#axiomsEditor_input").val("");
    };

    self.onSelectSuggestion = function () {
        var suggestionText = $("#axiomsEditor_suggestionsSelect option:selected").text();
        var suggestionId = $("#axiomsEditor_suggestionsSelect").val();
        var suggestionObj = { id: suggestionId, label: suggestionText };

        if (self.currentObject == "listClass") {
            CommonBotFunctions.listVocabClasses(Lineage_sources.activeSource, null, false, [], function (err, choices) {
                self.currentObject = "Class";
                common.fillSelectOptions("axiomsEditor_suggestionsSelect", choices, false, "label", "id");
                return;
            });
        } else if (self.currentObject == "Class") {
            self.currentObject = null;
            self.addSuggestion(suggestionObj, "axiom_Class");
            return;
            self.getSuggestions(suggestionId.id, function (err, result) {
                result.forEach(function (suggestion) {});
            });
            return;
        } else {
            self.addSuggestion(suggestionObj, "axiom_Class");
            self.getSuggestions(suggestionId.id, function (err, result) {
                common.fillSelectOptions("axiomsEditor_suggestionsSelect", result, false);
            });
        }

        return;

        if (suggestionId == "ObjectProperty:") {
            self.addSuggestion(suggestionObj, "axiom_keyWord");
            CommonBotFunctions.listVocabsFn(Lineage_sources.activeSource, null, false, function (err, choices) {
                self.currentObject = "ObjectPropertyVocab";
                common.fillSelectOptions("axiomsEditor_suggestionsSelect", choices, false, "label", "id");
            });
        } else if (self.currentObject == "ObjectPropertyVocab") {
            CommonBotFunctions.listVocabPropertiesFn(Lineage_sources.activeSource, null, false, function (err, choices) {
                self.currentObject = "ObjectProperty";
                common.fillSelectOptions("axiomsEditor_suggestionsSelect", choices, false, "label", "id");
            });
        } else if (self.currentObject == "ObjectProperty") {
            self.currentObject = null;
            return self.addSuggestion(suggestionObj, "axiom_Property");
        } else if (suggestionId == "Class:" || suggestion == "Class") {
            CommonBotFunctions.listVocabsFn(Lineage_sources.activeSource, null, false, function (err, choices) {
                self.currentObject = "ClassVocab";
                common.fillSelectOptions("axiomsEditor_suggestionsSelect", choices, false, "label", "id");
            });
        } else {
            return self.addSuggestion(suggestionObj, "axiom_keyWord");
        }
    };

    self.getSuggestions = function (text, callback) {
        var options = {};
        const params = new URLSearchParams({
            source: Lineage_sources.activeSource,
            lastToken: text,
            options: JSON.stringify(options),
        });

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/axioms/suggestion?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                callback(null, data);
            },
            error(err) {
                callback(err.responseText);
            },
        });
    };
    self.autoComplete = function (text) {
        var tokens = [];
        text = text.toLowerCase();
        for (var key in self.terms) {
            if (key.startsWith(text)) {
                tokens.push({ id: self.terms[key], label: key });
            }
        }
        tokens.forEach(function (token) {
            if (token.label == text) {
                tokens = [token];
            }
        });
        return tokens;
    };

    self.terms = {
        ">": ">",
        "<": "<",
        ">=": ">=",
        "<=": "<=",
        "(": "(",
        ")": ")",
        prefix: "Prefix",
        class: "KW_CLASS",
        individual: "Individual",
        property: "Property",
        objectproperty: "ObjectProperty",
        types: "Types",
        facts: "Facts",
        subclassof: "SubClassOf",
        equivalentto: "EquivalentTo",
        disjointwith: "DisjointWith",
        and: "and",
        or: "or",
        not: "not",
        some: "some",
        only: "only",
        min: "min",
        max: "max",
        exactly: "exactly",
        value: "value",
        domain: "Domain",
        range: "Range",
        /*  "ws": "WS",
                "prefix": "KW_PREFIX",
                "class": "KW_CLASS",
                "individual": "KW_INDIVIDUAL",
                "property": "KW_PROPERTY",
                "objectproperty": "KW_OBJECTPROPERTY",
                "types": "KW_TYPES",
                "facts": "KW_FACTS",
                "subclassof": "KW_SUBCLASSOF",
                "equivalentto": "KW_EQUIVALENTTO",
                "disjointwith": "KW_DISJOINTWITH",
                "and": "KW_AND",
                "or": "KW_OR",
                "not": "KW_NOT",
                "some": "KW_SOME",
                "only": "KW_ONLY",
                "min": "KW_MIN",
                "max": "KW_MAX",
                "exactly": "KW_EXACTLY",
                "value": "KW_VALUE",
                "domain": "KW_DOMAIN",
                "range": "KW_RANGE",
                "string": "STRING",
                "id": "ID",
                "boolean": "BOOLEAN",
                "int": "INT",
                "comparisonoperator": "comparisonOperator",
                "prefixaxiom": "prefixAxiom",
                "classaxiom": "classAxiom",
                "subclassaxiom": "subclassAxiom",
                "equivalentclassaxiom": "equivalentClassAxiom",
                "disjointaxiom": "disjointAxiom",
                "conjunctionaxiom": "conjunctionAxiom",
                "disjunctionaxiom": "disjunctionAxiom",
                "negationaxiom": "negationAxiom",
                "propertyaxiom": "propertyAxiom",
                "objectpropertyaxiom": "objectpropertyaxiom",
                "classexpression": "classExpression",
                "individualaxiom": "individualAxiom",
                "typesection": "typeSection",
                "factssection": "factsSection",
                "propertysection": "propertySection",
                "v": "v",
                "lexererror": "lexerError",
                "parsererror": "parserError",
                "axiom": "axiom"*/
    };

    return self;
})();

export default AxiomEditor;
window.AxiomEditor = AxiomEditor;
