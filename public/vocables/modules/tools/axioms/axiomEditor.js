import CommonBotFunctions from "../../bots/_commonBotFunctions.js";

const AxiomEditor = (function() {
    var self = {};

    self.init = function(divId) {
        self.previousTokenType = null;
        $("#smallDialogDiv").dialog("open");
        $("#smallDialogDiv").dialog("option", "title", "Axiom Editor");
        $("#smallDialogDiv").load("modules/tools/axioms/axiomEditor.html", function(x, y) {
            $("#axiomsEditor_input").focus();
        });
    };

    self.onInputChar = function(text) {
        var text2 = text.toLowerCase();

        if (text.length < 2) {
            return;
        }

        if (!self.previousTokenType) {
            self.listClassOrProperty(text2);
        }

        return;


        //class
        if (text2.toLowerCase().startsWith("_")) {
            self.currentObject = "listClass";
            self.onSelectSuggestion("listClass");

            return;
        }
        //Objectproperty
        if (text2.toLowerCase().startsWith("-")) {
            self.currentObject = "listObjectProperty";
            self.onSelectSuggestion("listObjectProperty");

            return;
        }

        self.getSuggestions(text, function(err, suggestions) {
            if (err) {
                return alert(err.responseText);
            }
            common.fillSelectOptions("axiomsEditor_suggestionsSelect", suggestions);
            if (err) {
                alert(err);
            }
        });
    };


    self.addSuggestion = function(suggestion, cssClass) {
        if (!cssClass) {
            cssClass = "axiom_keyWord";
        }

        if (typeof suggestion == "string") {
            var str = suggestion;
            suggestion = {
                id: str,
                label: str
            };
        }

        $("#axiomsEditor_input").val("");
        $("#axiomsEditor_input").focus();
        self.onInputChar(suggestion.label);
        $("#axiomsEditor_input").before("<span class='axiom_element " + cssClass + "' id='" + suggestion.id + "'>" + suggestion.label + "</span>");
        $("#axiomsEditor_input").val("");
    };

    self.onSelectSuggestion = function() {
        var suggestionText = $("#axiomsEditor_suggestionsSelect option:selected").text();
        //   suggestionText = suggestionText.replace(/ /g, "_");
        var suggestionId = $("#axiomsEditor_suggestionsSelect").val();
        var suggestionObj = { id: suggestionId, label: suggestionText };

        var resource = self.allResources[suggestionId];
        if (resource) {
            self.previousTokenType = resource.resourceType;
            if (resource.resourceType == "ObjectProperty") {
                self.addSuggestion(suggestionObj, "axiom_Property");
                self.getSuggestions(suggestionText + " ", function(err, result) {
                    common.fillSelectOptions("axiomsEditor_suggestionsSelect", result, false);
                });

            } else if (resource.resourceType == "Class") {
                self.addSuggestion(suggestionObj, "axiom_Class");
                self.getSuggestions("_" + suggestionText + " ", function(err, result) {
                    common.fillSelectOptions("axiomsEditor_suggestionsSelect", result, false);
                });
            }


        } else {//keyword
            self.addSuggestion(suggestionObj, "axiom_keyWord");
            var text = self.getAxiomText();
            self.getSuggestions(text + " ", function(err, result) {
                var resultObjs = [];
                result.forEach(function(item) {
                    resultObjs.push({ label: item, id: item });
                });


                if (result.indexOf("_") > -1) {
                    self.previousTokenType = "Class";
                    CommonBotFunctions.listSourceAllClasses(Lineage_sources.activeSource, null, false, [], function(err, choices) {
                        self.currentObject = "Class";
                        choices = resultObjs.concat(choices);
                        common.fillSelectOptions("axiomsEditor_suggestionsSelect", choices, false, "label", "id");
                    });
                    return;
                } else {
                    var x = 3;
                    common.fillSelectOptions("axiomsEditor_suggestionsSelect", result, false);
                }


            });
        }

        return;

        if (self.currentObject == "listClass") {
            CommonBotFunctions.listSourceAllClasses(Lineage_sources.activeSource, null, false, [], function(err, choices) {
                self.currentObject = "Class";
                common.fillSelectOptions("axiomsEditor_suggestionsSelect", choices, false, "label", "id");
            });
            return;
        } else if (self.currentObject == "Class") {
            self.currentObject = null;
            self.addSuggestion(suggestionObj, "axiom_Class");
            self.getSuggestions("_" + suggestionText + " ", function(err, result) {
                common.fillSelectOptions("axiomsEditor_suggestionsSelect", result.suggestions, false);
            });
            return;
        } else if (self.currentObject == "listObjectProperty") {
            CommonBotFunctions.listSourceAllObjectProperties(Lineage_sources.activeSource, null, null, function(err, choices) {
                self.currentObject = "ObjectProperty";
                common.fillSelectOptions("axiomsEditor_suggestionsSelect", choices, false, "label", "id");
            });
            return;
        } else if (self.currentObject == "ObjectProperty") {
            self.currentObject = null;
            self.addSuggestion(suggestionObj, "axiom_Property");
            self.getSuggestions(suggestionText + " ", function(err, result) {
                common.fillSelectOptions("axiomsEditor_suggestionsSelect", result.suggestions, false);
            });
            return;
        } else {
            self.addSuggestion(suggestionObj, "axiom_keyWord");
            var text = self.getAxiomText();
            self.getSuggestions(text + " ", function(err, result) {
                common.fillSelectOptions("axiomsEditor_suggestionsSelect", result.suggestions, false);
            });
        }
    };

    self.listClassOrProperty = function(str) {

        var filterResources = function() {
            var choices = [];
            for (var key in self.allResources) {
                var item = self.allResources[key];
                if (item.label.toLowerCase().startsWith(str)) {
                    choices.push(item);
                }
            }
            ;

            choices.sort(function(a, b) {
                if (a.label > b.label) {
                    return 1;
                }
                if (a.label < b.label) {
                    return -1;
                }
                return 0;

            });

            common.fillSelectOptions("axiomsEditor_suggestionsSelect", choices, false, "label", "id");
        };

        if (self.allResources) {
            return filterResources();
        } else {

            CommonBotFunctions.listSourceAllObjectProperties(Lineage_sources.activeSource, null, null, function(err, properties) {
                if (err) {
                    return alert(err.responseText);
                }
                CommonBotFunctions.listSourceAllClasses(Lineage_sources.activeSource, null, false, [], function(err2, classes) {
                    if (err2) {
                        return alert(err.responseText);
                    }

                    self.allResources = {};
                    properties.forEach(function(item) {
                        item.resourceType = "ObjectProperty";
                        self.allResources[item.id] = item;
                    });

                    classes.forEach(function(item) {
                        item.resourceType = "Class";
                        self.allResources[item.id] = item;
                    });


                    return filterResources();
                });
            });
        }

    };
    self.getSuggestions = function(text, callback) {
        var options = {};
        const params = new URLSearchParams({
            source: Lineage_sources.activeSource,
            lastToken: text,
            options: JSON.stringify(options)
        });

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/axioms/suggestion?" + params.toString(),
            dataType: "json",

            success: function(data, _textStatus, _jqXHR) {
                callback(null, data);
            },
            error(err) {
                callback(err.responseText);
            }
        });
    };


    self.checkSyntax = function() {
        var axiomText = self.getAxiomText();
        var options = {};

        const params = new URLSearchParams({
            source: Lineage_sources.activeSource,
            axiom: axiomText,
            options: JSON.stringify(options)
        });

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/axioms/validator?" + params.toString(),
            dataType: "json",

            success: function(data, _textStatus, _jqXHR) {
                var message = "";
                if (true) {
                    message = " syntax OK";
                } else {
                    message = " syntax error";
                }
                $("#axiomEditor_messageDiv").html(message);
            },
            error(err) {
            }
        });
    };
    self.saveAxiom = function() {
    };
    self.generateTriples = function() {
        var options = {};
        const params = new URLSearchParams({
            source: Lineage_sources.activeSource,
            lastToken: text,
            options: JSON.stringify(options)
        });

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/jowl/manchesterAxiom2triples?" + params.toString(),
            dataType: "json",

            success: function(data, _textStatus, _jqXHR) {
                callback(null, data);
            },
            error(err) {
                callback(err.responseText);
            }
        });
    };

    self.getAxiomText = function() {
        var text = "";
        $(".axiom_element").each(function() {
            if (text !== "") {
                text += " ";
            }
            text += $(this).html();
        });
        return text;
    };

    self.clear = function() {
        self.init();
        /*   $(".axiom_element").each(function() {
               $(this).remove();
           });
           $("#axiomsEditor_suggestionsSelect").find("option").remove();*/
    };

    return self;
})();

export default AxiomEditor;
window.AxiomEditor = AxiomEditor;
