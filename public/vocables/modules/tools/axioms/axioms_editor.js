import CommonBotFunctions from "../../bots/_commonBotFunctions.js";

const Axioms_editor = (function () {
    var self = {};

    self.init = function (divId, nodeId, source) {
        self.clearAll();
        self.currentSource = source || Lineage_sources.activeSource;

        if (nodeId) {
            self.currentNode = nodeId;
        } else {
            //  self.currentNode = "https://spec.industrialontologies.org/ontology/core/Core/Buyer";
        }

        $("#smallDialogDiv").dialog("open");
        $("#smallDialogDiv").dialog("option", "title", "Axiom Editor");
        $("#smallDialogDiv").load("modules/tools/axioms/html/axioms_editor.html", function (x, y) {
            $("#axiomsEditor_input").on("keyup", function (evt) {
                if (evt.key == "Backspace") {
                    Axioms_editor.removeLastElement();
                } else {
                    Axioms_editor.onInputChar($("#axiomsEditor_input").val());
                }
            });
            $("#axiomsEditor_input").focus();
            self.getAllClassesOrProperties(function (err, result) {
                var classes = [];
                var properties = [];
                result.forEach(function (item) {
                    if ( item.resourceType == "Class") {
                        classes.push(item);
                    }else{
                        properties.push(item);
                    }
                });
                common.fillSelectOptions("axiomsEditor_allClasses", classes, true, "label", "id");
                common.fillSelectOptions("axiomsEditor_allProperties", properties, true, "label", "id");
            });
        });
    };

    self.clearAll = function () {
        self.textoffset = 0;
        self.axiomContext = {
            properties: [],
            classes: [],
            lastKeyWord: "",
            currentPropertyIndex: -1,
            currentClassIndex: -1,
            lastResourceType: null,
        };
        self.allResourcesArray = null;
        self.currentSuggestions = [];
        self.previousTokenType = null;
        //   $("#axiomsEditor_textDiv").html("");
    };

    self.setCurrentResource = function (node,isProperty) {
        self.clearAll();
        if(isProperty){
            self.currentNode = {
                label: $("#axiomsEditor_allClasses option:selected").text(),
                id: node.val(),
                resourceType: "ObjectProperty",
            };
        }else {
            self.currentNode = {
                label: $("#axiomsEditor_allClasses option:selected").text(),
                id: node.val(),
                resourceType: "Class",
            };
        }

        if (!self.currentNode) {
            return alert("select a resource");
        }
        /*   self.addSuggestion({
                   id: self.currentNode.id,
                   label: self.currentNode.label,
                   resourceType: "Class"
               }
           );*/
        self.axiomContext.classes.push(self.currentNode.id);
        self.axiomContext.currentClassIndex += 1;
        Axioms_suggestions.getManchesterParserSuggestions(self.currentNode, function (err, result) {
            self.filterResources(result, "*");
        });
    };

    self.onInputChar = function (text) {
        var text2 = text.toLowerCase();

        if (self.currentSuggestions.length > 0) {
            if (self.currentSuggestions.length == 1) {
                $("axiomsEditor_suggestionsSelect").val(self.currentSuggestions[0].id);
                //  self.addSuggestion(self.currentSuggestions[0].replace(/ /g,"_"));
                self.onSelectSuggestion();
            } else {
                self.filterResources(self.currentSuggestions, text);
            }
        } else if (!self.previousTokenType) {
            // at the begining of the axiom
        } else {
            Axioms_suggestions.getManchesterParserSuggestions(text, function (err, suggestions) {
                if (err) {
                    return alert(err.responseText);
                }

                self.currentSuggestions = suggestions;
                common.fillSelectOptions("axiomsEditor_suggestionsSelect", suggestions, false, "label", "id");
                if (err) {
                    alert(err);
                }
            });
        }
    };

    self.addSuggestion = function (suggestion) {
        var cssClass = null;
        if (suggestion.resourceType == "ObjectProperty") {
            cssClass = "axiom_Property";

            if (!self.axiomContext.lastKeyword || self.axiomContext.lastKeyword == "(") {
                self.axiomContext.properties.push(suggestion.id || suggestion);
                self.axiomContext.currentPropertyIndex += 1;
            } else if (self.axiomContext.lastKeyword == ")") {
                self.axiomContext.currentPropertyIndex -= 1;
            }
        } else if (suggestion.resourceType == "Class") {
            cssClass = "axiom_Class";
            if (!self.axiomContext.lastKeyword || self.axiomContext.lastKeyword == "(") {
                self.axiomContext.classes.push(suggestion.id || suggestion);
                self.axiomContext.currentClassIndex += 1;
            } else if (self.axiomContext.lastKeyword == ")") {
                self.axiomContext.currentClassIndex -= 1;
            }
        } else {
            cssClass = "axiom_keyWord";
            self.axiomContext.lastKeyWord = suggestion;
        }

        if (typeof suggestion == "string") {
            var str = suggestion;
            suggestion = {
                id: str,
                label: str,
            };
        }

        var separatorStr = "";
        if (suggestion.id == "(") {
            separatorStr = "<br>";
            self.textoffset += 1;
            for (var i = 0; i < self.textoffset; i++) {
                separatorStr += "&nbsp;&nbsp;&nbsp;";
            }
        }

        $("#axiomsEditor_input").val("");
        $("#axiomsEditor_input").focus();
        //   self.onInputChar(suggestion.label);
        $("#axiomsEditor_input").before(separatorStr + "<span class='axiom_element " + cssClass + "' id='" + suggestion.id + "'>" + suggestion.label + "</span>");
        $("#axiomsEditor_input").val("");
    };

    self.onSelectSuggestion = function () {
        var selectedText = $("#axiomsEditor_suggestionsSelect option:selected").text();
        selectedText = selectedText.replace(/ /g, "_");

        var selectedId = $("#axiomsEditor_suggestionsSelect").val();
        var selectedObject = { id: selectedId, label: selectedText };
        var resource = self.allResourcesMap[selectedId];

        if (resource) {
            //class or Property
            self.previousTokenType = resource.resourceType;
            selectedObject.resourceType = resource.resourceType;
        } else {
            //keyword
            selectedObject.resourceType = "keyword";
        }

        Axioms_suggestions.getManchesterParserSuggestions(selectedObject, function (err, result) {
            self.currentSuggestions = result;
            common.fillSelectOptions("axiomsEditor_suggestionsSelect", result, false, "label", "id");
            self.addSuggestion(selectedObject);
        });
    };

    self.filterResources = function (resources, filterStr, resourceType) {
        if (filterStr == " " || filterStr == "*") {
            filterStr = "";
        }
        //  var str=$("##axiomsEditor_input").val()
        var resourcesMap = {};
        if (Array.isArray(resources)) {
            resources.forEach(function (item) {
                resourcesMap[item.label] = item;
            });
        } else {
            resourcesMap = resources;
        }

        var choices = [];
        for (var key in resourcesMap) {
            var item = resourcesMap[key];
            if (!filterStr || item.label.toLowerCase().startsWith(filterStr)) {
                if (!resourceType || item.resourceType == resourceType) {
                    choices.push(item);
                }
            }
        }
        if (choices.length == 0) {
            return;
        }
        self.currentSuggestions = choices;
        common.fillSelectOptions("axiomsEditor_suggestionsSelect", choices, false, "label", "id");
    };

    self.listFilteredClassesOrProperties = function (filterStr, resourceType) {
        self.getAllClassesOrProperties(function (err, result) {
            return self.filterResources(self.allResourcesArray, filterStr, resourceType);
        });
    };

    self.getAllClassesOrProperties = function (callback) {
        var source = self.currentSource;
        var classes = [];
        var properties = [];
        if (self.allResourcesArray) {
            return callback(null, self.allResourcesArray);
        }

        async.series(
            [
                function (callbackSeries) {
                    CommonBotFunctions.listSourceAllObjectProperties(source, null, null, function (err, result) {
                        if (err) {
                            return callbackSeries(err.responseText);
                        }
                        properties = result;
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    CommonBotFunctions.listSourceAllClasses(source, null, false, [], function (err, result) {
                        if (err) {
                            return callbackSeries(err.responseText);
                        }
                        classes = result;
                        callbackSeries();
                    });
                },
            ],
            function (err) {
                if (err) {
                    return callback(err);
                }
                var uniqueResources = {};
                self.allResourcesArray = [];
                self.allResourcesMap = {};
                properties.forEach(function (item) {
                    if (!uniqueResources[item.id]) {
                        uniqueResources[item.id] = 1;
                        item.label = item.label.replace(/ /g, "_");
                        item.resourceType = "ObjectProperty";
                        self.allResourcesArray.push(item);
                    }
                });

                classes.forEach(function (item) {
                    if (!uniqueResources[item.id]) {
                        uniqueResources[item.id] = 1;
                        item.label = item.label.replace(/ /g, "_");
                        item.resourceType = "Class";
                        self.allResourcesArray.push(item);
                    }
                });
                self.allResourcesArray.sort(function (a, b) {
                    if (a.label > b.label) {
                        return 1;
                    }
                    if (a.label < b.label) {
                        return -1;
                    }
                    return 0;
                });

                self.allResourcesArray.forEach(function (item) {
                    self.allResourcesMap[item.id] = item;
                });
                return callback(null, self.allResourcesArray);
            }
        );
    };

    self.checkSyntax = function (callback) {
        var axiomText = self.getAxiomText();
        var options = {};

        const params = new URLSearchParams({
            source: self.currentSource,
            axiom: axiomText,
            options: JSON.stringify(options),
        });

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/axioms/validator?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                var message = "";

                self.message(" syntax OK");

                if (callback) {
                    return callback();
                }
            },
            error(err) {
                self.message(err.responseText);
                if (callback) {
                    return callback(err);
                }
            },
        });
    };

    self.message = function (message, color) {
        $("#Axioms_editor_messageDiv").html(message);
    };

    self.getAxiomText = function () {
        var text = "";
        $(".axiom_element").each(function () {
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
    self.getAxiomContent = function () {
        var frame = $("#Axioms_editor_frameSelect").val();
        var text = "<" + self.currentNode.id + "> " + frame + " (";
        $(".axiom_element").each(function () {
            var id = $(this).attr("id");
            if (!id || id == "null") {
                return;
            }
            if (id.indexOf("http") == 0) {
                id = "<" + id + ">";
            }

            if (text != "") {
                text += " ";
            }

            text += id;
        });
        text += ")";
        return text;
    };

    self.removeLastElement = function () {
        var lastElement = $(".axiom_element:last");
        lastElement.remove();
        lastElement = $(".axiom_element:last");
        if (!lastElement) {
            self.clearAll();
            return self.setCurrentResource();
        }
        var cssClasses = lastElement.attr("class");

        var type = null;
        if (cssClasses.indexOf("axiom_Class") > -1) {
            type = "Class";
        } else if (cssClasses.indexOf("axiom_Property") > -1) {
            type = "ObjectProperty";
        } else if (cssClasses.indexOf("axiom_keyWord") > -1) {
            type = "axiom_keyWord";
        } else {
            return;
        }
        var id = $(this).attr("id");
        var object = {
            id: id,
            type: type,
        };
        Axioms_suggestions.getManchesterParserSuggestions(selectedObject, function (err, result) {
            self.currentSuggestions = result;
            common.fillSelectOptions("axiomsEditor_suggestionsSelect", result, false, "label", "id");
        });
    };

    self.getAxiomElements = function () {
        var frame = $("#Axioms_editor_frameSelect").val();
        var text = "<" + self.currentNode + "> " + frame + " (";
        var elements = [
            {
                id: self.currentNode,
                type: "class",
            },
            {
                id: frame,
                type: "property",
            },
        ];

        $(".axiom_element").each(function () {
            var id = $(this).attr("id");
            var cssClasses = $(this).attr("class");

            var type = null;
            if (cssClasses.indexOf("axiom_Class") > -1) {
                type = "Class";
            } else if (cssClasses.indexOf("axiom_Property") > -1) {
                type = "ObjectProperty";
            } else if (cssClasses.indexOf("axiom_keyWord") > -1) {
                type = "axiom_keyWord";
            } else {
                return;
            }
            elements.push({
                id: id,
                type: type,
            });
        });

        return elements;
    };

    self.clear = function () {
        self.init();
        /*   $(".axiom_element").each(function() {
               $(this).remove();
           });
           $("#axiomsEditor_suggestionsSelect").find("option").remove();*/
    };

    self.saveAxiom = function () {};

    self.generateTriples = function (callback) {
        var options = {};
        var content = self.getAxiomContent();
        var sourceGraph = Config.sources[self.currentSource].graphUri;
        if (!sourceGraph) {
            return alert("no graph Uri");
        }

        console.log(content);

        var triples;
        async.series(
            [
                function (callbackSeries) {
                    self.message("checking axiom syntax");
                    self.checkSyntax(function (err, result) {
                        return callbackSeries(err);
                    });
                },

                function (callbackSeries) {
                    const params = new URLSearchParams({
                        graphUri: sourceGraph,
                        manchesterContent: content,
                        options: JSON.stringify(options),
                    });
                    self.message("generating axioms triples");
                    $.ajax({
                        type: "GET",
                        url: Config.apiUrl + "/jowl/manchesterAxiom2triples?" + params.toString(),
                        dataType: "json",

                        success: function (data, _textStatus, _jqXHR) {
                            if (data.result && data.result.indexOf("Error") > -1) {
                                return callbackSeries(data.result);
                            }
                            triples = data;
                            callbackSeries();
                            //  callback(null, data);
                        },
                        error(err) {
                            callbackSeries(err.responseText);
                        },
                    });
                },
                function (callbackSeries) {
                    self.message("drawing axioms triples");
                    var html = Axioms_graph.showTriplesInDataTable("Axioms_editor_triplesDataTableDiv", triples);
                },
            ],
            function (err) {
                if (err) {
                    alert(err);
                }
                self.message("");
            }
        );
    };

    return self;
})();

export default Axioms_editor;
window.Axioms_editor = Axioms_editor;
