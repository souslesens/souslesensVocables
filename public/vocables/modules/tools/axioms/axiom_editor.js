import CommonBotFunctions from "../../bots/_commonBotFunctions.js";
import Axioms_graph from "./axioms_graph.js";
import Export from "../../shared/export.js";
import SourceSelectorWidget from "../../uiWidgets/sourceSelectorWidget.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";

const Axiom_editor = (function() {
    var self = {};
    self.classColor = "#00afef";
    self.propertyColor = "#f5ef39";
    self.keywordColor = "#cb9801";


    self.onLoaded = function() {
        self.showSourcesDialog(function(err, source) {
            if (err) {
                return alert(err);
            }
            if (!source) {

                return alert("choose a source");
            }

            self.init("mainDialogDiv", null, source);
        });
    };

    self.showSourcesDialog = function(callback) {
        if (Config.userTools["AxiomEditor"].urlParam_source) {
            var source = Config.userTools["AxiomEditor"].urlParam_source;
            if (!source) {
                source = "IOF-CORE-202401";
            }
            return callback(null, source);
        } else {
            source = "IOF-CORE-202401";
            return callback(null, source);
        }

        var options = {
            withCheckboxes: false
        };
        var selectTreeNodeFn = function() {
            var source = SourceSelectorWidget.getSelectedSource()[0];
            $("#AxiomEditor_sourceDiv").html(self.currentSlsvSource);
            $("#KGcreator_dialogDiv").dialog("close");

            return callback(null, source);
            //  self.initCentralPanel();
        };

        SourceSelectorWidget.initWidget(["OWL"], "mainDialogDiv", true, selectTreeNodeFn, null, options);
        if (callback) {
            callback();
        }
    };

    self.init = function(divId, nodeId, source) {
        self.currentSource = source;
        self.clearAll();
        if (nodeId) {
            self.currentNode = nodeId;
        }
        Axiom_editorUI.initUI();

    };

    self.clearAll = function() {
        $("#axiomsEditor_suggestionsSelect").empty();
        //  $("#axiomsEditor_textDiv").html("");

        Axioms_graph.clearGraph();
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
        self.getAllClasses(function() {
            self.getAllProperties(function() {


                self.allResourcesMap = {};
                self.getAllClasses().forEach(function(item) {
                    self.allResourcesMap[item.id] = item;
                });
                self.getAllProperties().forEach(function(item) {
                    self.allResourcesMap[item.id] = item;
                });
            });
        });


        //   $("#axiomsEditor_textDiv").html("");
    };

    self.setCurrentResource = function(resourceNode) {
        self.currentNode = resourceNode;
        self.clearAll();
        if (!self.currentNode) {
            return;//alert("select a resource");
        }

        self.axiomContext.classes.push(self.currentNode.id);
        self.axiomContext.currentClassIndex += 1;
        Axioms_suggestions.getManchesterParserSuggestions(self.currentNode, false, false, function(err, result) {
            self.filterResources(result, "*");
        });
    };

    self.onInputChar = function(text) {

        var text2 = text.toLowerCase();


        if (self.currentSuggestions.length > 0) {

            self.filterResources(self.currentSuggestions, text);
            if (self.currentSuggestions.length == 1) {
                $("#axiomsEditor_input").val("");
                $("#axiomsEditor_input").val(self.currentSuggestions[0].label);

            }

        } else if (!self.previousTokenType) {
            // at the begining of the axiom
        } else {
            Axioms_suggestions.getManchesterParserSuggestions(text, false, false, function(err, suggestions) {
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



    self.onAxiomIntputKey = function(evt) {
        if (evt.ctrlKey && evt.key == "Backspace") {
            Axiom_editor.removeLastElement();
        }

       else if (evt.key == "Tab" || evt.key == "Enter") {
            if (self.currentSuggestions.length == 1) {
                // $("axiomsEditor_suggestionsSelect").val(self.currentSuggestions[0].id);
                self.onSelectSuggestion(self.currentSuggestions[0]);
            }
        } else {
            Axiom_editor.onInputChar($("#axiomsEditor_input").val());
        }


    };


    self.showAllResource = function() {
        Axioms_suggestions.getManchesterParserSuggestions(Axioms_suggestions.currentObject, true, true, function(err, suggestions) {
            if (err) {
                return alert(err.responseText);
            }

            self.currentSuggestions = suggestions;
            self.drawSuggestions(suggestions);
            if (err) {
                alert(err);
            }
        });
    };

    self.addSuggestion = function(suggestion) {
        var cssClass = null;
        if (suggestion.resourceType == "ObjectProperty") {
            cssClass = "axiom_Property";

            if (!self.axiomContext.lastKeyword || self.axiomContext.lastKeyword == "(") {
                self.axiomContext.properties.push(suggestion.id || suggestion);
                self.axiomContext.currentPropertyIndex += 1;
            } else if (self.axiomContext.lastKeyword == ")") {
                if (self.axiomContext.currentPropertyIndex > 0) {
                    self.axiomContext.currentPropertyIndex -= 1;
                }
            }
        } else if (suggestion.resourceType == "Class") {
            cssClass = "axiom_Class";
            if (!self.axiomContext.lastKeyword || self.axiomContext.lastKeyword == "(") {

                self.axiomContext.classes.push(suggestion.id || suggestion);
                self.axiomContext.currentClassIndex += 1;
            } else if (self.axiomContext.lastKeyword == ")") {
                if (self.axiomContext.currentClassIndex > 0) {
                    self.axiomContext.currentClassIndex -= 1;
                }
            }
        } else {
            cssClass = "axiom_keyWord";
            if (suggestion.id == "and") {
                if (self.axiomContext.currentClassIndex > 0) {
                    self.axiomContext.currentClassIndex -= 1;
                }

                cssClass = " axiom_and_or";
            } else if (suggestion.id == "or") {
                cssClass = " axiom_and_or";
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
        if (suggestion.id == ")") {
            separatorStr = "<br>";
            self.textoffset -= 1;
            if (self.textoffset < 0) {
                self.textoffset = 0;
            }

        }

        $("#axiomsEditor_input").val("");
        $("#axiomsEditor_input").focus();
        //   self.onInputChar(suggestion.label);

        var spanStr = "<span class='axiom_element " + cssClass + "' onclick='Axiom_editor.onElementClick($(this).attr(\"id\"),$(this).attr(\"class\"))' id='" + suggestion.id + "'>" + suggestion.label + "</span>";
        // $("#axiomsEditor_textDiv").append(separatorStr + spanStr);
        $("#axiomsEditor_input").before(separatorStr + spanStr);
        $("#axiomsEditor_input").val("");
        Axiom_editor.checkSyntax(function(err, result) {
            if (result) {
                Axiom_editor.drawTriples();
            }
        });
    };

    self.onSelectSuggestion = function(selectedObject) {
        var resource;
        if (!selectedObject) {
            var selectedText = $("#axiomsEditor_suggestionsSelect option:selected").text();
            selectedText = selectedText.replace(/ /g, "_");

            var selectedId = $("#axiomsEditor_suggestionsSelect").val();
            var selectedObject = { id: selectedId, label: selectedText };
            resource = self.allResourcesMap[selectedId];
        } else {
            resource = self.allResourcesMap[selectedObject.id];
        }


        if (resource) {
            //class or Property
            self.previousTokenType = resource.resourceType;
            selectedObject.resourceType = resource.resourceType;
        } else {
            //keyword
            selectedObject.resourceType = "keyword";
        }

        Axioms_suggestions.getManchesterParserSuggestions(selectedObject, false, false, function(err, result) {
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
                color = Axiom_editor.classColor;
            } else if (resource && resource.resourceType == "ObjectProperty") {
                color = Axiom_editor.propertyColor;
            } else {
                color = Axiom_editor.keywordColor;
            }


            $(this).css("color", color);

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
                var message = "syntax OK";


                if (callback) {
                    return callback(null, message);
                } else {
                    self.message(message);
                }
            },
            error(err) {

                if (callback) {
                    return callback(err);
                } else {
                    self.message(err.responseText);
                }
            }
        });
    };

    self.message = function(message, color) {
        $("#Axioms_editor_messageDiv").html(message);
    };

    self.onElementClick = function(elementId, cssClass) {
        if (cssClass.indexOf("axiom_Class") > -1 || cssClass.indexOf("axiom_Property") > -1) {
            var node = { data: { id: elementId } };
            NodeInfosWidget.showNodeInfos(Axiom_editor.currentSource, node, "mainDialogDiv");
        }
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


        var text = "<" + self.currentNode.id + "> " + Axiom_editor.axiomType + " (";
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
        var stop = false;
        if (lastElement.length == 0) {
            self.clearAll();
            return self.setCurrentResource(self.currentNode);
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
        var id = $(lastElement).attr("id");
        var label = $(lastElement).html();
        var object = {
            label: "",
            id: id,
            type: type
        };
        Axioms_suggestions.getManchesterParserSuggestions(object, false, false, function(err, result) {
            self.currentSuggestions = result;
            self.drawSuggestions(result);
        });
    };

    self.getAxiomElements = function() {
        //  var frame = $("#Axioms_editor_frameSelect").val();
        var text = "<" + self.currentNode + "> " + self.axiomType + " (";
        var elements = [
            {
                id: self.currentNode,
                type: "class"
            },
            {
                id: self.axiomType,
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
        self.clearAll();
        Axiom_editor.setCurrentResource(self.currentNode);

    };


    self.generateTriples = function(callback) {
        var options = {};
        var content = self.getAxiomContent();
        var sourceGraph = Config.sources[self.currentSource].graphUri;
        if (!sourceGraph) {
            return alert("no graph Uri");
        }


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
                    var html = Axiom_editor.showTriplesInDataTable("Axioms_editor_triplesDataTableDiv", triples);
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
            Axioms_graph.drawNodeAxioms2(self.currentSource, self.currentNode.id, triples, "axiomGraphDiv", {}, function(err) {

            });

        });
    };


    self.test = function() {
        self.currentNode = {
            id: "https://spec.industrialontologies.org/ontology/core/Core/MeasurementInformationContentEntity",
            label: "MeasurementInformationContentEntity"
        };
        var html = "<span class=\"axiom_element axiom_Class\" id=\"https://spec.industrialontologies.org/ontology/core/Core/InformationContentEntity\">information_content_entity</span>\n" +
            "<span class=\"axiom_element axiom_and_or\" id=\"and\">and</span>\n" +
            "<span class=\"axiom_element axiom_keyWord\" id=\"(\">(</span>\n" +
            "<span class=\"axiom_element axiom_Property\" id=\"http://purl.obolibrary.org/obo/BFO_0000110\">has_continuant_part_at_all_times</span>            <span class=\"axiom_element axiom_keyWord\" id=\"some\">some</span>\n" +
            "<span class=\"axiom_element axiom_Class\" id=\"https://spec.industrialontologies.org/ontology/core/Core/MeasuredValueExpression\">measured_value_expression</span>\n" +
            "<span class=\"axiom_element axiom_keyWord\" id=\")\">)</span>\n" +
            "<span class=\"axiom_element axiom_and_or\" id=\"and\">and</span>\n" +
            "<br>&nbsp;&nbsp;&nbsp;<span class=\"axiom_element axiom_keyWord\" id=\"(\">(</span>\n" +
            "<span class=\"axiom_element axiom_Property\" id=\"https://spec.industrialontologies.org/ontology/core/Core/describes\">describes</span>\n" +
            "<span class=\"axiom_element axiom_keyWord\" id=\"some\">some</span>\n" +
            "<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class=\"axiom_element axiom_keyWord\" id=\"(\">(</span>\n" +
            "<span class=\"axiom_element axiom_Class\" id=\"http://purl.obolibrary.org/obo/BFO_0000008\">temporal_region</span>\n" +
            "<span class=\"axiom_element axiom_and_or\" id=\"or\">or</span>\n" +
            "<span class=\"axiom_element axiom_Class\" id=\"http://purl.obolibrary.org/obo/BFO_0000020\">specifically_dependent_continuant</span>\n" +
            "<span class=\"axiom_element axiom_and_or\" id=\"or\">or</span>\n" +
            "<span class=\"axiom_element axiom_Class\" id=\"https://spec.industrialontologies.org/ontology/core/Core/ProcessCharacteristic\">process_characteristic</span>\n" +
            "<span class=\"axiom_element axiom_keyWord\" id=\")\">)</span>\n" +
            "<span class=\"axiom_element axiom_keyWord\" id=\")\">)</span>\n" +
            "            <span class=\"axiom_element axiom_and_or\" id=\"and\">and</span>\n" +
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


        Axiom_editor.axiomType = "subClassOf";
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

export default Axiom_editor;
window.Axiom_editor = Axiom_editor;
