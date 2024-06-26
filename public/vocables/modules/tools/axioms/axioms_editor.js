import CommonBotFunctions from "../../bots/_commonBotFunctions.js";
import Axioms_graph from "./axioms_graph.js";
import Export from "../../shared/export.js";

const Axioms_editor = (function() {
    var self = {};
    self.classColor = "#bfbfe8";
    self.propertyColor = "#aaecaa";
    self.keywordColor = "#1aa";

    self.init = function(divId, nodeId, source) {
        self.currentSource = source || Lineage_sources.activeSource;
        self.clearAll();


        if (nodeId) {
            self.currentNode = nodeId;
        } else {
            //  self.currentNode = "https://spec.industrialontologies.org/ontology/core/Core/Buyer";
        }

        $("#smallDialogDiv").dialog("open");
        $("#smallDialogDiv").dialog("option", "title", "Axiom Editor");
        $("#smallDialogDiv").load("modules/tools/axioms/html/axioms_editor.html", function(x, y) {
            $("#axiomsEditor_input").on("keyup", function(evt) {
                if (evt.key == "Backspace") {
                    Axioms_editor.removeLastElement();
                } else {
                    Axioms_editor.onInputChar($("#axiomsEditor_input").val());
                }
            });
            $("#axiomsEditor_input").focus();
            self.getAllClasses(function(err, classes) {

                common.fillSelectOptions("axiomsEditor_allClasses", classes, true, "label", "id");
            });
            self.getAllProperties(function(err, properties) {
                common.fillSelectOptions("axiomsEditor_allProperties", properties, true, "label", "id");
            });

            Axioms_suggestions.compileAxiomStr();
        });
    };

    self.clearAll = function() {

        self.textoffset = 0;
        self.axiomContext = {
            properties: [],
            classes: [],
            lastKeyWord: "",
            currentPropertyIndex: -1,
            currentClassIndex: -1,
            lastResourceType: null
        };

        self.allClasses = null;
        self.allProperties = null;
        self.currentSuggestions = [];
        self.previousTokenType = null;
        self.getAllClasses();
        self.getAllProperties();
        self.allResourcesMap = {};
        self.getAllClasses().forEach(function(item) {
            self.allResourcesMap[item.id] = item;
        });
        self.getAllProperties().forEach(function(item) {
            self.allResourcesMap[item.id] = item;
        });


        //   $("#axiomsEditor_textDiv").html("");
    };

    self.setCurrentResource = function(node, isProperty) {
        self.clearAll();
        if (isProperty) {
            self.currentNode = {
                label: $("#axiomsEditor_allClasses option:selected").text(),
                id: node.val(),
                resourceType: "ObjectProperty"
            };
        } else {
            self.currentNode = {
                label: $("#axiomsEditor_allClasses option:selected").text(),
                id: node.val(),
                resourceType: "Class"
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
        Axioms_suggestions.getManchesterParserSuggestions(self.currentNode, function(err, result) {
            self.filterResources(result, "*");
        });
    };

    self.onInputChar = function(text) {
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
            Axioms_suggestions.getManchesterParserSuggestions(text, function(err, suggestions) {
                if (err) {
                    return alert(err.responseText);
                }

                self.currentSuggestions = suggestions;
                self.drawSuggestions(suggestions);
                if (err) {
                    alert(err);
                }
            });
        }
    };

    self.addSuggestion = function(suggestion) {
        var cssClass = null;
        if (suggestion.resourceType == "ObjectProperty") {
            cssClass = "axiom_Property";

            if (!self.axiomContext.lastKeyword || self.axiomContext.lastKeyword == "(") {
                self.axiomContext.properties.push(suggestion.id || suggestion);
                self.axiomContext.currentPropertyIndex += 1;
            } else if (self.axiomContext.lastKeyword == ")") {
               if (self.axiomContext.currentPropertyIndex>0)
                self.axiomContext.currentPropertyIndex -= 1;
            }
        } else if (suggestion.resourceType == "Class") {
            cssClass = "axiom_Class";
            if (!self.axiomContext.lastKeyword || self.axiomContext.lastKeyword == "(") {

                self.axiomContext.classes.push(suggestion.id || suggestion);
                self.axiomContext.currentClassIndex += 1;
            } else if (self.axiomContext.lastKeyword == ")") {
                if (self.axiomContext.currentClassIndex>0)
                self.axiomContext.currentClassIndex -= 1;
            }
        } else {
            cssClass = "axiom_keyWord";
            if (suggestion.id == "and") {
                if (self.axiomContext.currentClassIndex>0)
                self.axiomContext.currentClassIndex -= 1;
            }
            self.axiomContext.lastKeyWord = suggestion;
        }

        if (typeof suggestion == "string") {
            var str = suggestion;
            suggestion = {
                id: str,
                label: str
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

    self.onSelectSuggestion = function() {
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

        Axioms_suggestions.getManchesterParserSuggestions(selectedObject, function(err, result) {
            self.currentSuggestions = result;
            self.drawSuggestions(result);
            self.addSuggestion(selectedObject);
        });
    };

    self.filterResources = function(resources, filterStr, resourceType) {
        if (filterStr == " " || filterStr == "*") {
            filterStr = "";
        }
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

        self.drawSuggestions(choices);
    };


    self.getAllClasses = function(callback) {
        var source = self.currentSource;
        if (!self.allClasses) {
            CommonBotFunctions.listSourceAllClasses(source, null, false, [], function(err, result) {
                if (err) {
                    return callback(err.responseText);
                }
                self.allClasses = [];
                var uniqueIds = {};
                result.forEach(function(item) {
                    if (!uniqueIds[item.id]) {
                        uniqueIds[item.id] = 1;
                        item.label = item.label.replace(/ /g, "_");
                        item.resourceType = "Class";
                        self.allClasses.push(item);
                    }

                });
                common.array.sort(self.allClasses, "label");
                if (callback) {
                    return callback(null, self.allClasses);
                }
                return self.allClasses;

            });
        } else {

            if (callback) {
                return callback(null, self.allClasses);
            }
            return self.allClasses;
        }
    };

    self.drawSuggestions = function(data) {


        common.fillSelectOptions("axiomsEditor_suggestionsSelect", data, false, "label", "id");

        $("#axiomsEditor_suggestionsSelect  option").each(function() {
            var id = $(this).val();
            var color = "";


            var resource = self.allResourcesMap[id];
            if (resource && resource.resourceType == "Class") {
                color = Axioms_editor.classColor;
            } else if (resource && resource.resourceType == "ObjectProperty") {
                color = Axioms_editor.propertyColor;
            } else {
                color = Axioms_editor.keywordColor;
            }

            /*    self.getAllClasses().forEach(function(item) {
                    if (item.id == id) {
                        color = Axioms_editor.classColor;
                    }
                });
                self.getAllProperties().forEach(function(item) {
                    if (item.id == id) {
                        color = Axioms_editor.propertyColor;
                    }
                });
                if (!color) {
                    color = Axioms_editor.keywordColor;
                }*/

            $(this).css("background-color", color);

        });
        setTimeout(function() {
            $("#axiomsEditor_suggestionsSelect option:first").focus();
        }, 200);


    };


    self.getAllProperties = function(callback) {
        var source = self.currentSource;

        if (!self.allProperties) {
            CommonBotFunctions.listSourceAllObjectProperties(source, null, false, function(err, result) {
                if (err) {
                    return callback(err.responseText);
                }
                self.allProperties = [];
                var uniqueIds = {};
                result.forEach(function(item) {
                    if (!uniqueIds[item.id]) {
                        uniqueIds[item.id] = 1;

                        item.label = item.label.replace(/ /g, "_");
                        item.resourceType = "ObjectProperty";
                        self.allProperties.push(item);
                    }
                });
                common.array.sort(self.allProperties, "label");
                if (callback) {
                    return callback(null, self.allProperties);
                }
                return self.allProperties;

            });
        } else {

            if (callback) {
                return callback(null, self.allProperties);
            }
            return self.allProperties;
        }
    };


    self.checkSyntax = function(callback) {
        var axiomText = self.getAxiomText();
        var options = {};

        const params = new URLSearchParams({
            source: self.currentSource,
            axiom: axiomText,
            options: JSON.stringify(options)
        });

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/axioms/validator?" + params.toString(),
            dataType: "json",

            success: function(data, _textStatus, _jqXHR) {
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
            }
        });
    };

    self.message = function(message, color) {
        $("#Axioms_editor_messageDiv").html(message);
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
    self.getAxiomContent = function() {
        var frame = $("#Axioms_editor_frameSelect").val();
        var text = "<" + self.currentNode.id + "> " + frame + " (";
        $(".axiom_element").each(function() {
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

    self.removeLastElement = function() {
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
            type: type
        };
        Axioms_suggestions.getManchesterParserSuggestions(selectedObject, function(err, result) {
            self.currentSuggestions = result;
            self.drawSuggestions(result);
        });
    };

    self.getAxiomElements = function() {
        var frame = $("#Axioms_editor_frameSelect").val();
        var text = "<" + self.currentNode + "> " + frame + " (";
        var elements = [
            {
                id: self.currentNode,
                type: "class"
            },
            {
                id: frame,
                type: "property"
            }
        ];

        $(".axiom_element").each(function() {
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
                type: type
            });
        });

        return elements;
    };

    self.clear = function() {
        self.init();
        /*   $(".axiom_element").each(function() {
               $(this).remove();
           });
           $("#axiomsEditor_suggestionsSelect").find("option").remove();*/
    };

    self.saveAxiom = function() {
    };

    self.generateTriples = function(callback) {
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
                function(callbackSeries) {
                    self.message("checking axiom syntax");
                    self.checkSyntax(function(err, result) {
                        return callbackSeries(err);
                    });
                },

                function(callbackSeries) {
                    const params = new URLSearchParams({
                        graphUri: sourceGraph,
                        manchesterContent: content,
                        options: JSON.stringify(options)
                    });
                    self.message("generating axioms triples");
                    $.ajax({
                        type: "GET",
                        url: Config.apiUrl + "/jowl/manchesterAxiom2triples?" + params.toString(),
                        dataType: "json",

                        success: function(data, _textStatus, _jqXHR) {
                            if (data.result && data.result.indexOf("Error") > -1) {
                                return callbackSeries(data.result);
                            }
                            triples = data;
                            callbackSeries();
                            //  callback(null, data);
                        },
                        error(err) {
                            callbackSeries(err.responseText);
                        }
                    });
                },
                function(callbackSeries) {
                    self.message("drawing axioms triples");
                    var html = Axioms_editor.showTriplesInDataTable("Axioms_editor_triplesDataTableDiv", triples);
                    callbackSeries();
                }
            ],
            function(err) {
                if (err) {
                    alert(err);
                }
                self.message("");
                if (callback) {
                    return callback(null, triples);
                }
            }
        );
    };


    self.drawTriples = function() {

        self.generateTriples(function(err, triples) {
            if (err) {
                return alert(err.responseText);
            }
            Axioms_graph.drawNodeAxiomsX(self.currentSource,self.currentNode.id ,triples, "axiomsGraphDiv", {}, function(err) {

            });

        });
    };
    self.drawTriplesTest = function() {

        self.generateTriples(function(err, triples) {
            if (err) {
                return alert(err.responseText);
            }
            Axioms_graph.drawNodeAxioms(self.currentSource,self.currentNode.id ,triples, "axiomsGraphDiv", {}, function(err) {

            });

        });
    };


    self.test = function() {
        self.currentNode = {
            id: "https://spec.industrialontologies.org/ontology/core/Core/MeasurementInformationContentEntity",
            label: "MeasurementInformationContentEntity"
        };
        var html = "<span class=\"axiom_element axiom_Class\" id=\"https://spec.industrialontologies.org/ontology/core/Core/InformationContentEntity\">information_content_entity</span>\n" +
            "<span class=\"axiom_element axiom_keyWord\" id=\"and\">and</span>\n" +
            "<span class=\"axiom_element axiom_keyWord\" id=\"(\">(</span>\n" +
            "<span class=\"axiom_element axiom_Property\" id=\"http://purl.obolibrary.org/obo/BFO_0000110\">has_continuant_part_at_all_times</span>            <span class=\"axiom_element axiom_keyWord\" id=\"some\">some</span>\n" +
            "<span class=\"axiom_element axiom_Class\" id=\"https://spec.industrialontologies.org/ontology/core/Core/MeasuredValueExpression\">measured_value_expression</span>\n" +
            "<span class=\"axiom_element axiom_keyWord\" id=\")\">)</span>\n" +
            "<span class=\"axiom_element axiom_keyWord\" id=\"and\">and</span>\n" +
            "<br>&nbsp;&nbsp;&nbsp;<span class=\"axiom_element axiom_keyWord\" id=\"(\">(</span>\n" +
            "<span class=\"axiom_element axiom_Property\" id=\"https://spec.industrialontologies.org/ontology/core/Core/describes\">describes</span>\n" +
            "<span class=\"axiom_element axiom_keyWord\" id=\"some\">some</span>\n" +
            "<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class=\"axiom_element axiom_keyWord\" id=\"(\">(</span>\n" +
            "<span class=\"axiom_element axiom_Class\" id=\"http://purl.obolibrary.org/obo/BFO_0000008\">temporal_region</span>\n" +
            "<span class=\"axiom_element axiom_keyWord\" id=\"or\">or</span>\n" +
            "<span class=\"axiom_element axiom_Class\" id=\"http://purl.obolibrary.org/obo/BFO_0000020\">specifically_dependent_continuant</span>\n" +
            "<span class=\"axiom_element axiom_keyWord\" id=\"or\">or</span>\n" +
            "<span class=\"axiom_element axiom_Class\" id=\"https://spec.industrialontologies.org/ontology/core/Core/ProcessCharacteristic\">process_characteristic</span>\n" +
            "<span class=\"axiom_element axiom_keyWord\" id=\")\">)</span>\n" +
            "<span class=\"axiom_element axiom_keyWord\" id=\")\">)</span>\n" +
            "            <span class=\"axiom_element axiom_keyWord\" id=\"and\">and</span>\n" +
            "<br>&nbsp;&nbsp;&nbsp;<span class=\"axiom_element axiom_keyWord\" id=\"(\">(</span>\n" +
            "<span class=\"axiom_element axiom_Property\" id=\"https://spec.industrialontologies.org/ontology/core/Core/isAbout\">is_about</span>\n" +
            "<span class=\"axiom_element axiom_keyWord\" id=\"some\">some</span>\n" +
            "<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class=\"axiom_element axiom_keyWord\" id=\"(\">(</span>\n" +
            "<span class=\"axiom_element axiom_Class\" id=\"http://purl.obolibrary.org/obo/BFO_0000015\">process</span>\n" +
            "<span class=\"axiom_element axiom_keyWord\" id=\"or\">or</span>\n" +
            "<span class=\"axiom_element axiom_Class\" id=\"http://purl.obolibrary.org/obo/BFO_0000035\">process_boundary</span>\n" +
            "<span class=\"axiom_element axiom_keyWord\" id=\"or\">or</span>\n" +
            "<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class=\"axiom_element axiom_keyWord\" id=\"(\">(</span>\n" +
            "<span class=\"axiom_element axiom_Class\" id=\"http://purl.obolibrary.org/obo/BFO_0000004\">independent_continuant</span>\n" +
            "<span class=\"axiom_element axiom_keyWord\" id=\"and\">and</span>\n" +
            "<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class=\"axiom_element axiom_keyWord\" id=\"(\">(</span>\n" +
            "<span class=\"axiom_element axiom_keyWord\" id=\"not\">not</span>\n" +
            "<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class=\"axiom_element axiom_keyWord\" id=\"(\">(</span>\n" +
            "<span class=\"axiom_element axiom_Class\" id=\"http://purl.obolibrary.org/obo/BFO_0000006\">spatial_region</span>\n" +
            "<span class=\"axiom_element axiom_keyWord\" id=\")\">)</span>\n" +
            "<span class=\"axiom_element axiom_keyWord\" id=\")\">)</span>\n" +
            "<span class=\"axiom_element axiom_keyWord\" id=\")\">)</span>\n" +
            "<span class=\"axiom_element axiom_keyWord\" id=\")\">)</span>\n" +
            "<span class=\"axiom_element axiom_keyWord\" id=\")\">)</span>\n" +

            "            <span class=\"axiom_element axiom_keyWord\" id=\"and\">and</span>\n" +
            "<br>&nbsp;&nbsp;&nbsp;<span class=\"axiom_element axiom_keyWord\" id=\"(\">(</span>\n" +
            "<span class=\"axiom_element axiom_Property\" id=\"https://spec.industrialontologies.org/ontology/core/Core/isOutputOf\">is_output_of</span>\n" +
            "<span class=\"axiom_element axiom_keyWord\" id=\"some\">some</span>\n" +
            "<span class=\"axiom_element axiom_Class\" id=\"https://spec.industrialontologies.org/ontology/core/Core/MeasurementProcess\">measurement_process</span>\n" +
            "<span class=\"axiom_element axiom_keyWord\" id=\")\">)</span>";
        //  "<span class=\"axiom_element axiom_keyWord\" id=\"and\">and</span> "


        common.fillSelectOptions("axiomsEditor_suggestionsSelect", [{ id: "and", label: "and" }], true, "label", "id");
        $("#axiomsEditor_textDiv").prepend(html);


    };
    self.showTriplesInDataTable = function(divId, data) {
        var escapeMarkup = function(str) {
            var str2 = str.replace(/</g, "&lt;");
            var str2 = str2.replace(/>/g, "&gt;");
            return str2;
        };

        var tableCols = [];
        var hearders = ["subject", "predicate", "object"];
        hearders.forEach(function(item) {
            tableCols.push({ title: item, defaultContent: "", width: "30%" });
        });

        var tableData = [];
        data.forEach(function(item, index) {
            tableData.push([escapeMarkup(item.subject), escapeMarkup(item.predicate), escapeMarkup(item.object)]);
        });

        var str = "<table><tr><td>subject</td><td>predicate</td><td>object</td></tr>";
        data.forEach(function(item, index) {
            str += "<tr><td>" + escapeMarkup(item.subject) + "</td><td>" + escapeMarkup(item.predicate) + "</td><td>" + escapeMarkup(item.object) + "</td></tr>";
        });
        str += "</table>";

        /*  $("#KGcreator_triplesDataTableDiv").html(str)
          return;*/
        Export.showDataTable(divId, tableCols, tableData, null, { paging: true }, function(err, datatable) {
        });
    };



    return self;
})();

export default Axioms_editor;
window.Axioms_editor = Axioms_editor;
