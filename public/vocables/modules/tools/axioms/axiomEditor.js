import CommonBotFunctions from "../../bots/_commonBotFunctions.js";

const AxiomEditor = (function() {
    var self = {};
    self.currentSuggestion=[]
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


        if (false && text.length < 2) {
            return;
        } else if (self.currentSuggestion.length > 0) {
            if (self.currentSuggestion.length == 1) {
                $("axiomsEditor_suggestionsSelect").val(self.currentSuggestion[0])
               self.addSuggestion(self.currentSuggestion[0])
                self.onSelectSuggestion();
            } else {
                self.filterResources(self.currentSuggestion, text);
            }


        } else if (!self.previousTokenType) {
            self.listClassOrProperty(text2);


            return;
        } else {

            self.getSuggestions(text, function(err, suggestions) {
                if (err) {
                    return alert(err.responseText);
                }

                self.currentSuggestion = suggestions;
                common.fillSelectOptions("axiomsEditor_suggestionsSelect", suggestions, false, "label", "id");
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

        $("#axiomsEditor_input").val("");
        $("#axiomsEditor_input").focus();
        //   self.onInputChar(suggestion.label);
        $("#axiomsEditor_input").before("<span class='axiom_element " + cssClass + "' id='" + suggestion.id + "'>" + suggestion.label + "</span>");
        $("#axiomsEditor_input").val("");
    };

    self.onSelectSuggestion = function() {
        var suggestionText = $("#axiomsEditor_suggestionsSelect option:selected").text();
        suggestionText = suggestionText.replace(/ /g, "_");
        //   suggestionText = suggestionText.replace(/ /g, "_");
        var suggestionId = $("#axiomsEditor_suggestionsSelect").val();

        var suggestionObj = { id: suggestionId, label: suggestionText };

        var resource = self.allResources[suggestionId];
        if (resource) {
            self.previousTokenType = resource.resourceType;
            if (resource.resourceType == "ObjectProperty") {
                self.addSuggestion(suggestionObj, "axiom_Property");
                self.getSuggestions(suggestionText + " ", function(err, result) {
                    self.currentSuggestion = result;
                    common.fillSelectOptions("axiomsEditor_suggestionsSelect", result, false, "label", "id");
                });

            } else if (resource.resourceType == "Class") {
                self.addSuggestion(suggestionObj, "axiom_Class");
                self.getSuggestions("_" + suggestionText + " ", function(err, result) {
                    self.currentSuggestion = result;
                    common.fillSelectOptions("axiomsEditor_suggestionsSelect", result, false, "label", "id");
                });
            }


        } else {//keyword
            self.addSuggestion(suggestionObj, "axiom_keyWord");
            var text = self.getAxiomText();
            self.getSuggestions(text + " ", function(err, result) {
                self.currentSuggestion = result;
                common.fillSelectOptions("axiomsEditor_suggestionsSelect", result, false, "label", "id");


            });
        }

        return;


    };

    self.filterResources = function(resources, filterStr) {
        //  var str=$("##axiomsEditor_input").val()
        var resourcesMap = {};
        if (Array.isArray(resources)) {
            resources.forEach(function(item) {
                resourcesMap[item.label] = item;
            });

        } else {
            resourcesMap = resources;
        }
        var choices = [];
        for (var key in resourcesMap) {
            var item = resourcesMap[key];
            if (item.label.toLowerCase().startsWith(filterStr)) {
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
        if(choices.length==0){
            return
        }
        self.currentSuggestion = choices;
        common.fillSelectOptions("axiomsEditor_suggestionsSelect", choices, false, "label", "id");
    };

    self.listClassOrProperty = function(str) {


        if (self.allResources) {
            return self.filterResources(self.allResources, str);
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
                        item.label = item.label.replace(/ /g, "_");
                        item.resourceType = "ObjectProperty";
                        self.allResources[item.id] = item;
                    });

                    classes.forEach(function(item) {
                        item.label = item.label.replace(/ /g, "_");
                        item.resourceType = "Class";
                        self.allResources[item.id] = item;
                    });


                });
                return self.filterResources(self.allResources, str);
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
                var suggestions = [];

                var selectProperties=false
                data.forEach(function(item) {
                    var keywords = [];

                    if (item.match(/^[A-z|_]$/g)) {// remove alphabetic letters and replace bay ObjectPrpertied
                        selectProperties=true
                        return;
                    } else {
                        suggestions.push({ id: item, label: item });
                    }
                });

                if (data.indexOf("_") > -1) {// replace "_" by classes
                    CommonBotFunctions.listSourceAllClasses(Lineage_sources.activeSource, null, false, [], function(err, classes) {
                        if (err) {
                            return callback(err);
                        }

                        suggestions = suggestions.concat(classes);
                        return callback(null, suggestions);
                    });
                } else {
                    callback(null, suggestions);
                }


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
            var cssClass = $(this).attr("class");
            if (cssClass.indexOf("axiom_Class") > -1) {
                text += "_";
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
