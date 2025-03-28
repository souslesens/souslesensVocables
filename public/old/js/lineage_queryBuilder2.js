import BotWidget from "../../uiWidgets/botWidget.js";
import Lineage_sources from "./lineage_sources.js";
import common from "../../shared/common.js";
import KGquery_graph from "../KGquery/KGquery_graph.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import Lineage_relationIndividualsFilter from "./lineage_relationIndividualsFilter.js";
import Lineage_whiteboard from "./lineage_whiteboard.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import IndividualValueFilterWidget from "../../uiWidgets/individualValuefilterWidget.js";

var Lineage_queryBuilder = (function () {
    var self = {};

    self.init = function () {
        $("#mainDialogDiv").dialog("open");
        $("#mainDialogDiv").load("modules/tools/lineage/html/queryBuilder.html", function () {
            //  self.doNext(keywordsTree)
            var html = self.getHtml();
            $("#botDiv").html(html);

            self.test();
        });
    };

    self.getSourceInferredModelVisjsData = function (sourceLabel, callback) {
        if (self.currentQuery.currentSourceInferredModelVijsData) {
            return callback(null, self.currentQuery.currentSourceInferredModelVijsData);
        }
        var visjsGraphFileName = self.currentQuery.source + "_KGmodelGraph.json";
        $.ajax({
            type: "GET",
            url: `${Config.apiUrl}/data/file?dir=graphs&fileName=${visjsGraphFileName}`,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                self.currentQuery.currentSourceInferredModelVijsData = JSON.parse(result);
                return callback(null, self.currentQuery.currentSourceInferredModelVijsData);
            },
            error: function (err) {
                return callback(err);
            },
        });
    };
    self.showList = function (values, varToFill, returnValue) {
        values.sort(function (a, b) {
            if (a.label > b.label) {
                return 1;
            }
            if (a.label < b.label) {
                return -1;
            }
            return 0;
        });

        $("#bot_resourcesProposalSelect").css("display", "block");
        common.fillSelectOptions("bot_resourcesProposalSelect", values, false, "label", "id");
        $("#bot_resourcesProposalSelect").unbind("change");
        $("#bot_resourcesProposalSelect").bind("change", function () {
            var text = $("#bot_resourcesProposalSelect option:selected").text();
            self.insertBotMessage(text + ":");

            var selectedValue = $(this).val();
            if (varToFill) {
                self.currentQuery[varToFill] = selectedValue;
            }
            self.nextStep(returnValue || selectedValue);
        });
    };

    self.insertBotMessage = function (str) {
        if (!str) {
            return;
        }
        var tokenId = "token_" + common.getRandomHexaId(5);
        var html = "<span class='bot-token " + "" + "' id='" + tokenId + "'>" + str + "</span>";
        html += "<span>&nbsp;</span>";
        $(html).insertBefore("#bot_input");
        $("#bot_input").val("");
        $("#bot_input") .trigger( "focus" );
        return;
    };

    self.nextStep = function (returnValue) {
        var keys = Object.keys(self.currentObj);
        if (keys.length == 0) {
            return;
        }
        if (keys.length == 1) {
            var fn = self.functions[keys[0]];
            if (!fn || typeof fn !== "function") {
                return alert("function not defined :" + keys[0]);
            }

            fn();
            self.currentObj = self.currentObj[keys[0]];
        } else {
            var obj = self.currentObj[returnValue];
            if (!obj) {
                return alert("condition not defined :" + returnValue);
            }
            var fnName = Object.keys(obj)[0];
            var fn = self.functions[fnName];
            if (!fn || typeof fn !== "function") {
                return alert("function not defined :" + fnName);
            }

            fn();
            self.currentObj = obj;
        }
    };

    self.workflow_individualsFilter = {
        //  "listFilterTypes": {
        label: { promptIndividualsLabelFn: { listWhiteBoardFilterType: { executeQuery: {} } } },
        list: { listIndividualsFn: { listWhiteBoardFilterType: { executeQuery: {} } } },
        advanced: { promptIndividualsAdvandedFilterFn: { listWhiteBoardFilterType: { executeQuery: {} } } },
        // }
    };

    self.workflow_individualsRole = {
        listIndividualFilterType: {
            all: {
                listWhiteBoardFilterType: {
                    executeQuery: {},
                },
            },
            subject: self.workflow_individualsFilter,
            object: self.workflow_individualsFilter,
        },
    };

    self.workflow = {
        listVocabsFn: {
            listQueryTypeFn: {
                Class: {
                    listClassesFn: {
                        listPredicatePathsFn: {
                            empty: { listWhiteBoardFilterType: { executeQuery: {} } },
                            ok: self.workflow_individualsRole,
                        },
                    },
                },
                Property: {
                    listPropertiesFn: {
                        listPredicatePathsFn: {
                            empty: { listWhiteBoardFilterType: { executeQuery: {} } },
                            ok: self.workflow_individualsRole,
                        },
                    },
                },
            },
        },
    };

    self.test = function () {
        self.currentQuery = { source: Lineage_sources.activeSource };
        self.currentObj = self.workflow;
        self.nextStep(self.workflow);
    };

    self.functions = {
        listVocabsFn: function () {
            var sourceLabel = Lineage_sources.activeSource;
            var vocabs = [{ id: sourceLabel, label: sourceLabel }];
            var imports = Config.sources[sourceLabel].imports;
            imports.forEach(function (importSource) {
                vocabs.push({ id: importSource, label: importSource });
            });

            for (var key in Config.basicVocabularies) {
                vocabs.push({ id: key, label: key });
            }
            self.showList(vocabs, "currentVocab");
        },
        listQueryTypeFn: function () {
            var choices = [
                { id: "Class", label: "Class" },
                { id: "Property", label: "Property" },
            ];

            self.showList(choices, null);
            return;
            self.showList(choices, function () {
                var currentChoice = $(this).val();
                return currentChoice;

                if (currentChoice == "Class") {
                    listClassesFn();
                } else if (currentChoice == "Property") {
                    listPropertiesFn();
                }
            });
        },

        listClassesFn: function () {
            var vocab = self.currentQuery.currentVocab;
            var classes = [];
            for (var key in Config.ontologiesVocabularyModels[vocab].classes) {
                var classId = Config.ontologiesVocabularyModels[vocab].classes[key];
                classes.push({ id: classId.id, label: classId.label });
            }
            self.showList(classes, "currentClass");
        },

        listPropertiesFn: function () {
            var vocab = self.currentQuery.currentVocab;
            var props = [];
            for (var key in Config.ontologiesVocabularyModels[vocab].properties) {
                var prop = Config.ontologiesVocabularyModels[vocab].properties[key];
                props.push({ id: prop.id, label: prop.label });
            }
            self.showList(props, "currentProperty");
        },

        listPredicatePathsFn: function () {
            var property = self.currentQuery.currentProperty;
            var fromClass = self.currentQuery.currentClass;
            var toClass = self.currentQuery.currentClass;

            self.getSourceInferredModelVisjsData(self.currentQuery.source + "_KGmodelGraph.json", function (err, visjsData) {
                if (err) {
                    return alert(err.responseText);
                }
                var nodesMap = {};
                visjsData.nodes.forEach(function (node) {
                    nodesMap[node.id] = node;
                });
                var paths = [];
                visjsData.edges.forEach(function (edge) {
                    var selected = false;
                    if (property && edge.data.propertyId == property) {
                        selected = true;
                    }
                    if (fromClass && edge.from == fromClass) {
                        selected = true;
                    }
                    if (toClass && edge.to == toClass) {
                        selected = true;
                    }
                    if (selected) {
                        edge.fromLabel = nodesMap[edge.from].label;
                        (edge.toLabel = nodesMap[edge.to].label),
                            paths.push({
                                id: edge.from + "|" + edge.data.propertyId + "|" + edge.to,
                                label: edge.fromLabel + " -" + edge.data.propertyLabel + "-> " + edge.toLabel,
                            });
                    }
                });
                if (paths.length == 0) {
                    self.nextStep("empty");
                    return;
                }
                self.showList(paths, "path", "ok");
                return;

                showList(paths, function () {
                    self.currentQuery.path = $(this).val();
                    return "ok";
                    var text = $("#bot_resourcesProposalSelect option:selected").text();
                    insertBotMessage(text + ":");
                    listIndividualFilterType();
                });
            });
        },

        listIndividualFilterType: function () {
            var choices = [
                { id: "all", label: "all individuals" },
                { id: "subject", label: "filter subject" },
                { id: "object", label: "filter object" },
            ];
            self.showList(choices, "individualsFilterRole");
            return;

            showList(choices, function () {
                var currentChoice = $(this).val();
                insertBotMessage(currentChoice + ":");
                if (currentChoice == "all") {
                    self.currentQuery.individualsFilterRole = null;
                    listWhiteBoardFilterType();
                } else if (currentChoice == "filterSubject") {
                    self.currentQuery.individualsFilterRole = "subject";
                    listFilterTypes("subject");
                } else if (currentChoice == "filterObject") {
                    self.currentQuery.individualsFilterRole = "object";
                    listFilterTypes("object");
                }
            });
        },
        listFilterTypes: function (target) {
            var choices = [
                { id: "label", label: "label contains" },
                { id: "list", label: "choose in list" },
                { id: "advanced", label: "advanced search" },
            ];
            self.showList(choices, "individualsFilterType");
            return;
            showList(choices, function () {
                var currentChoice = $(this).val();
                insertBotMessage(currentChoice + ":");
                self.currentQuery.individualsFilterType = currentChoice;
                if (currentChoice == "label") {
                    self.currentQuery.individualsFilterValue = prompt("label contains ");
                    listWhiteBoardFilterType();
                } else if (currentChoice == "list") {
                    listIndividualsFn();
                } else if (currentChoice == "advanced") {
                    Lineage_relationIndividualsFilter.init();
                }
            });
        },

        listIndividualsFn: function () {
            Sparql_OWL.getDistinctClassLabels(self.currentQuery.source, [self.currentQuery.currentClass], {}, function (err, result) {
                if (err) {
                    return alert(err);
                }
                var individuals = [];
                result.forEach(function (item) {
                    individuals.push({
                        id: item.label.value,
                        label: item.label.value,
                    });
                });
                self.showList(individuals, "individualsFilterValue");
                return;

                showList(individuals, function () {
                    var individual = $(this).val();
                    insertBotMessage(individual + ":");
                    self.currentQuery.individualsFilterValue = individual;
                    listWhiteBoardFilterType();
                });
            });
        },

        listIndividualsFn: function () {
            self.currentQuery.individualsFilterValue = prompt("label contains ");
            self.nextStep();
        },

        promptIndividualsAdvandedFilterFn: function () {
            IndividualValueFilterWidget.showDialog(null, self.currentQuery.source, varName, aClass.id, datatype, function (err, filter) {
                self.currentQuery.advancedFilter = filter;
                self.nextStep();
            });
        },

        listWhiteBoardFilterType: function () {
            var choices = [
                { id: "selectedNode", label: "selectedNode" },
                { id: "whiteboardNodes", label: "whiteboard nodes" },
                { id: "sourceNodes", label: "activeSource" },
            ];
            self.showList(choices, "whiteboardFilterType");
            return;

            showList(choices, function () {
                var currentChoice = $(this).val();
                self.currentQuery.whiteboardFilterType = currentChoice;
                self.executQuery();
            });
        },
        executeQuery: function () {
            self.executeQuery();
        },
    };

    self.getHtml = function () {
        var html =
            '  <div id="botTA" contenteditable="false">\n' +
            '          <div id="bot_inputContainer" style="display: flex;flex-direction: row;border:none;">\n' +
            // "            <button style=\"width:10px\" id=\"bot_back\"><</button>"+
            '            <input id="bot_input"  autocomplete="off" onkeyup="BotWidget.analyse($(this).val())">\n' +
            "          </div>\n" +
            '            <select id="bot_resourcesProposalSelect" size="10" )"></select>\n' +
            "        </div>" +
            "<div><button onclick='Lineage_queryBuilder.clear()'>X</button>" +
            "<button onclick='Lineage_queryBuilder.previousStage()'><ok></button></div>";

        return html;
    };

    self.clear = function () {
        //   self.test();
    };

    self.executeQuery = function () {
        var source = self.currentQuery.source;
        var currentClass = self.currentQuery.currentClass;
        var path = self.currentQuery.path;
        var individualId = self.currentQuery.individualId;
        var individualsFilterRole = self.currentQuery.individualsFilterRole;
        var individualsFilterType = self.currentQuery.individualsFilterType;
        var individualsFilterValue = self.currentQuery.individualsFilterValue;
        var advancedFilter = self.currentQuery.advancedFilter || "";

        function getPathFilter() {
            if (!path) return "";
            var array = path.split("|");
            if (array.length != 3) {
                return "";
            }
            var propFilter = Sparql_common.setFilter("prop", array[1]);
            var subjectClassFilter = Sparql_common.setFilter("subjectType", array[0], null, { useFilterKeyWord: 1 });
            var objectClassFilter = Sparql_common.setFilter("objectType", array[2], null, { useFilterKeyWord: 1 });
            return propFilter + " " + subjectClassFilter + " " + objectClassFilter;
        }

        function getIndividualsFilter() {
            var filter = "";
            if (!individualsFilterRole) {
                return "";
            }
            if (individualsFilterType == "label") {
                filter = Sparql_common.setFilter(individualsFilterRole, null, individualsFilterValue);
            } else if (individualsFilterType == "list") {
                filter = Sparql_common.setFilter(individualsFilterRole, individualsFilterValue, null, { useFilterKeyWord: 1 });
            } else if (individualsFilterType == "advanced") {
                filter = individualsFilterValue;
            }
            return filter;
        }

        function getWhiteBoardFilter() {
            var data;

            var whiteboardFilterType = self.currentQuery.whiteboardFilterType;

            if (whiteboardFilterType == "selectedNode") {
                data = Lineage_whiteboard.currentGraphNode.data.id;
            } else if (whiteboardFilterType == "whiteboardNodes") {
                Lineage_sources.fromAllWhiteboardSources = true;
                if (!Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                    data = null;
                } else {
                    data = [];
                    var nodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.get();
                    nodes.forEach(function (node) {
                        if (node.data && (!node.data.type || node.data.type != "literal")) {
                            data.push(node.id);
                        }
                    });
                }
            } else if (selection == "all") {
                data = null;
            }

            return data;
        }

        var data = getWhiteBoardFilter();
        var filter = getPathFilter() + " " + getIndividualsFilter() + "" + advancedFilter;
        var options = {
            filter: filter,
        };

        Lineage_whiteboard.drawPredicatesGraph(source, data, null, options);
    };

    return self;
})();

export default Lineage_queryBuilder;
window.Lineage_queryBuilder = Lineage_queryBuilder;
