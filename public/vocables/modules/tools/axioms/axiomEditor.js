import CommonBotFunctions from "../../bots/_commonBotFunctions.js";

const AxiomEditor = (function() {
        var self = {};

        self.init = function(divId) {
            $("#smallDialogDiv").dialog("open");
            $("#smallDialogDiv").load("modules/tools/axioms/axiomEditor.html", function(x, y) {
                $("#axiomsEditor_input").focus();

            });


        };

        self.onInputChar = function(text) {
            if (text.length > 0) {
                self.getSuggestions(text, function(err, result) {
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

            $("#axiomsEditor_input").val(suggestion);
            $("#axiomsEditor_input").focus()
            self.onInputChar(suggestion);
            $("#axiomsEditor_input").before("<span class='axiom_element " + cssClass + "' id='" + suggestion.id + "'>" + suggestion.label + "</span>");
            $("#axiomsEditor_input").val("");

        };


        self.onSelectSuggestion = function(option) {
            var suggestion=$("#axiomsEditor_suggestionsSelect option:selected").text()
            var suggestionObj = { id: option.val(), label: suggestion };
            if (suggestion == "ObjectProperty:") {
                self.addSuggestion(suggestionObj, "axiom_keyWord");
                CommonBotFunctions.listVocabsFn(Lineage_sources.activeSource, null, false, function(err, choices) {
                    self.currentObject = "ObjectPropertyVocab";
                    common.fillSelectOptions("axiomsEditor_suggestionsSelect", choices, false, "label", "id");
                });

            } else if (self.currentObject == "ObjectPropertyVocab") {

                CommonBotFunctions.listVocabPropertiesFn(Lineage_sources.activeSource, null, false, function(err, choices) {
                    self.currentObject = "ObjectProperty";
                    common.fillSelectOptions("axiomsEditor_suggestionsSelect", choices, false, "label", "id");
                });

            } else if (self.currentObject == "ObjectProperty") {
                self.currentObject = null;
                return self.addSuggestion(suggestionObj, "axiom_Property");

            } else if (suggestion == "Class:") {

                CommonBotFunctions.listVocabsFn(Lineage_sources.activeSource, null, false, function(err, choices) {
                    self.currentObject = "ClassVocab";
                    common.fillSelectOptions("axiomsEditor_suggestionsSelect", choices, false, "label", "id");
                });

            } else if (self.currentObject == "ClassVocab") {

                CommonBotFunctions.listVocabClasses(Lineage_sources.activeSource, null, false, function(err, choices) {
                    self.currentObject = "Class";
                    common.fillSelectOptions("axiomsEditor_suggestionsSelect", choices, false, "label", "id");
                });

            } else if (self.currentObject == "Class") {
                self.currentObject = null;
                return self.addSuggestion(suggestionObj, "axiom_Class");
            } else {
                return self.addSuggestion(suggestionObj, "axiom_keyWord");
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


        return self;
    }
)();

export default AxiomEditor;
window.AxiomEditor = AxiomEditor;