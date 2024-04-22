import CommonBotFunctions from "../../bots/_commonBotFunctions.js";

const AxiomEditor = (function () {
    var self = {};

    self.init = function (divId) {
        $("#smallDialogDiv").dialog("open");
        $("#smallDialogDiv").dialog("option", "title", "Axiom Editor");
        $("#smallDialogDiv").load("modules/tools/axioms/axiomEditor.html", function (x, y) {
            $("#axiomsEditor_input").focus();
        });
    };

    self.onInputChar = function (text) {
        var text2 = text.toLowerCase();

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

        self.getSuggestions(text, function (err, suggestions) {
            if (err) {
                return alert(err.responseText);
            }
            common.fillSelectOptions("axiomsEditor_suggestionsSelect", suggestions);
            if (err) {
                alert(err);
            }
        });
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
        suggestionText = suggestionText.replace(/ /g, "_");
        var suggestionId = $("#axiomsEditor_suggestionsSelect").val();
        var suggestionObj = { id: suggestionId, label: suggestionText };

        if (self.currentObject == "listClass") {
            CommonBotFunctions.listSourceAllClasses(Lineage_sources.activeSource, null, false, [], function (err, choices) {
                self.currentObject = "Class";
                common.fillSelectOptions("axiomsEditor_suggestionsSelect", choices, false, "label", "id");
            });
            return;
        } else if (self.currentObject == "Class") {
            self.currentObject = null;
            self.addSuggestion(suggestionObj, "axiom_Class");
            self.getSuggestions("_" + suggestionText, function (err, result) {
                common.fillSelectOptions("axiomsEditor_suggestionsSelect", result.suggestions, false);
            });
            return;
        } else if (self.currentObject == "listObjectProperty") {
            CommonBotFunctions.listSourceAllObjectProperties(Lineage_sources.activeSource, null, null, function (err, choices) {
                self.currentObject = "ObjectProperty";
                common.fillSelectOptions("axiomsEditor_suggestionsSelect", choices, false, "label", "id");
            });
            return;
        } else if (self.currentObject == "ObjectProperty") {
            self.currentObject = null;
            self.addSuggestion(suggestionObj, "axiom_Property");
            self.getSuggestions(suggestionText + " ", function (err, result) {
                common.fillSelectOptions("axiomsEditor_suggestionsSelect", result.suggestions, false);
            });
            return;
        } else {
            self.addSuggestion(suggestionObj, "axiom_keyWord");
            var text = self.getAxiomText();
            self.getSuggestions(text, function (err, result) {
                common.fillSelectOptions("axiomsEditor_suggestionsSelect", result.suggestions, false);
            });
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

    self.checkSyntax = function () {
        var axiomText = self.getAxiomText();
        var options = {};

        const params = new URLSearchParams({
            source: Lineage_sources.activeSource,
            axiom: axiomText,
            options: JSON.stringify(options),
        });

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/axioms/validator?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                var message = "";
                if (true) {
                    message = " syntax OK";
                } else {
                    message = " syntax error";
                }
                $("#axiomEditor_messageDiv").html(message);
            },
            error(err) {},
        });
    };
    self.saveAxiom = function () {};
    self.generateTriples = function () {
        var options = {};
        const params = new URLSearchParams({
            source: Lineage_sources.activeSource,
            lastToken: text,
            options: JSON.stringify(options),
        });

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/jowl/manchesterAxiom2triples?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                callback(null, data);
            },
            error(err) {
                callback(err.responseText);
            },
        });
    };

    self.getAxiomText = function () {
        var text = "";
        $(".axiom_element").each(function () {
            if (text !== "") text += " ";
            text += $(this).html();
        });
        return text;
    };

    self.clear = function () {
        $(".axiom_element").each(function () {
            $(this).remove();
        });
        $("#axiomsEditor_suggestionsSelect").find("option").remove();
    };

    return self;
})();

export default AxiomEditor;
window.AxiomEditor = AxiomEditor;
