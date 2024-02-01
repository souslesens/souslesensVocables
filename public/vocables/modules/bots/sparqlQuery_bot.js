import Lineage_sources from "../tools/lineage/lineage_sources.js";
import common from "../shared/common.js";
//import KGquery_graph from "..tools/KGquery/KGquery_graph.js";
import Sparql_OWL from "../sparqlProxies/sparql_OWL.js";
import Lineage_relationIndividualsFilter from "../tools/lineage/lineage_relationIndividualsFilter.js";
import Lineage_whiteboard from "../tools/lineage/lineage_whiteboard.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import IndividualValueFilterWidget from "../uiWidgets/individualValuefilterWidget.js";
import BotEngine from "./botEngine.js";
import CommonBotFunctions from "./commonBotFunctions.js";

var SparqlQuery_bot = (function () {
    var self = {};

    self.start = function () {
        self.title = "Query graph";
        BotEngine.init(SparqlQuery_bot, self.workflow,null, function () {
            self.params = { source: Lineage_sources.activeSource };
            BotEngine.nextStep();
        });
    };

    self.workflow_individualsFilter = {
        listFilterTypes: {
            _OR: {
                label: { promptIndividualsLabelFn: { listWhiteBoardFilterType: { executeQuery: {} } } },
                list: { listIndividualsFn: { listWhiteBoardFilterType: { executeQuery: {} } } },
                advanced: { promptIndividualsAdvandedFilterFn: { listWhiteBoardFilterType: { executeQuery: {} } } },
                // }
            },
        },
    };

    self.workflow_individualsRole = {
        listIndividualFilterRole: {
            _OR: {
                all: {
                    listWhiteBoardFilterType: {
                        executeQuery: {},
                    },
                },
                subject: self.workflow_individualsFilter,
                object: self.workflow_individualsFilter,
            },
        },
    };

    self.workflow = {
        listQueryTypeFn: {
            _OR: {
                "By Class": {
                    listVocabsFn: {
                        listClassesFn: {
                            listPredicatePathsFn: {
                                _OR: {
                                    empty: { listWhiteBoardFilterType: { executeQuery: {} } },
                                    ok: self.workflow_individualsRole,
                                },
                            },
                        },
                    },
                },
                "By Object Property": {
                    listVocabsFn: {
                        listPropertiesFn: {
                            listPredicatePathsFn: {
                                _OR: {
                                    empty: { listWhiteBoardFilterType: { executeQuery: {} } },
                                    ok: self.workflow_individualsRole,
                                },
                            },
                        },
                    },
                },
                "By Annotation property": {
                    listAnnotationPropertiesVocabsFn: {
                        listAnnotationPropertiesFn: {
                            promptAnnotationPropertyValue: {
                                listWhiteBoardFilterType: {
                                    executeQuery: {},
                                },
                            },
                        },
                    },
                },
            },
        },
    };

    self.functionTitles = {
        listVocabsFn: "Choose a reference ontology",
        listQueryTypeFn: "Choose a query type ",
        listClassesFn: "Choose a  a class ",
        listPropertiesFn: "Choose a property",
        listAnnotationPropertiesVocabsFn: "Choose a reference ontology",
        listAnnotationPropertiesFn: "Choose a property",
        promptAnnotationPropertyValue: "Filter value ",
    };

    self.functions = {
        listVocabsFn: function () {
            CommonBotFunctions.listVocabsFn(Lineage_sources.activeSource, "currentVocab", true);
        },
        listQueryTypeFn: function () {
            var choices = ["By Class", "By Object Property", "By Annotation property"];

            BotEngine.showList(choices, null);
            return;
        },

        listClassesFn: function () {
            CommonBotFunctions.listVocabClasses(self.params.currentVocab, "currentClass", true);
        },

        listPropertiesFn: function () {
            CommonBotFunctions.listVocabPropertiesFn(self.params.currentVocab, "currentProperty");
        },

        listPredicatePathsFn: function () {
            var property = self.params.currentProperty;
            var fromClass = self.params.currentClass;
            var toClass = self.params.currentClass;

            self.getSourceInferredModelVisjsData(self.params.source + "_KGmodelGraph.json", function (err, visjsData) {
                if (err) {
                    console.log(err.responseText);
                    return BotEngine.nextStep("empty");
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
                    BotEngine.nextStep("empty");
                    return;
                }
                BotEngine.showList(paths, "path", "ok");
                return;
            });
        },

        listAnnotationPropertiesVocabsFn: function () {
            CommonBotFunctions.listVocabsFn(self.params.source, "annotationPropertyVocab", true);
        },

        listAnnotationPropertiesFn: function () {
            // filter properties compatible with
            CommonBotFunctions.listAnnotationPropertiesFn(self.params.annotationPropertyVocab, "annotationPropertyId");
        },

        promptAnnotationPropertyValue: function () {
            BotEngine.promptValue("value contains ", "annotationValue");
        },

        listIndividualFilterRole: function () {
            var subject = "subject";
            var object = "object";
            if (self.params.path) {
                var array = self.params.path.split("|");
                if (array.length == 3) {
                    subject = Sparql_common.getLabelFromURI(array[0]);
                    object = Sparql_common.getLabelFromURI(array[2]);
                }
            }
            var choices = [
                { id: "all", label: "all individuals" },
                { id: "subject", label: "filter " + subject },
                { id: "object", label: "filter " + object },
            ];
            BotEngine.showList(choices, "individualsFilterRole");
            return;
        },
        listFilterTypes: function (target) {
            var choices = [
                { id: "label", label: "label contains" },
                { id: "list", label: "choose in list" },
                { id: "advanced", label: "advanced search" },
            ];
            BotEngine.showList(choices, "individualsFilterType");
        },

        listIndividualsFn: function () {
            Sparql_OWL.getDistinctClassLabels(self.params.source, [self.params.currentClass], {}, function (err, result) {
                if (err) {
                    return alert(err);
                }
                var individuals = [];
                result.forEach(function (item) {
                    individuals.push({
                        id: item.id.value,
                        label: item.label.value,
                    });
                });
                BotEngine.showList(individuals, "individualsFilterValue");
            });
        },
        promptIndividualsLabelFn: function () {
            BotEngine.promptValue("label contains ", "individualsFilterValue");
            /* self.params.individualsFilterValue = prompt("label contains ");
      BotEngine.writeCompletedHtml(self.params.individualsFilterValue);
      BotEngine.nextStep();*/
        },
        promptIndividualsAdvandedFilterFn: function () {
            IndividualValueFilterWidget.showDialog(null, self.params.source, self.params.individualsFilterRole, self.params.currentClass, null, function (err, filter) {
                self.params.advancedFilter = filter;
                BotEngine.writeCompletedHtml(self.params.advancedFilter);
                BotEngine.nextStep("advanced");
            });
        },

        listWhiteBoardFilterType: function () {
            var choices = [
                { id: "sourceNodes", label: "active Source " },
                { id: "allSources", label: "all referenced Sources " },
            ];
            if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                choices.push({ id: "whiteboardNodes", label: "whiteboard nodes" });
            }
            if (Lineage_whiteboard.currentGraphNode) {
                choices.push({ id: "selectedNode", label: "selectedNode" });
            }
            BotEngine.showList(choices, "whiteboardFilterType");
        },
        executeQuery: function () {
            var source = self.params.source;
            var currentClass = self.params.currentClass;
            var currentProperty = self.params.currentProperty;
            var path = self.params.path;
            var individualsFilterRole = self.params.individualsFilterRole;
            var individualsFilterType = self.params.individualsFilterType;
            var individualsFilterValue = self.params.individualsFilterValue;
            var advancedFilter = self.params.advancedFilter || "";
            var annotationPropertyId = self.params.annotationPropertyId;
            var annotationValue = self.params.annotationValue;

            function setAnnotationPropertyFilter() {
                if (!annotationPropertyId) {
                    return "";
                }
                var filterProp = "FILTER (?prop=<" + annotationPropertyId + ">)";
                var filterValue = annotationValue ? 'FILTER(regex(?object, "' + annotationValue + '", "i"))' : "";
                return filterProp + "" + filterValue;
            }

            function getPathFilter() {
                if (!path) {
                    if (currentClass) {
                        return Sparql_common.setFilter("subject", currentClass, null, { useFilterKeyWord: 1 });
                    }
                    if (currentProperty) {
                        return Sparql_common.setFilter("prop", currentProperty);
                    }
                }
                if (!path) {
                    return "";
                }
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
                    filter = advancedFilter;
                }

                return filter;
            }

            function getWhiteBoardFilter() {
                var data;

                var whiteboardFilterType = self.params.whiteboardFilterType;

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
                } else if (whiteboardFilterType == "all") {
                    data = null;
                } else if (whiteboardFilterType == "allSources") {
                    // use search engine first
                    return alert("coming soon");
                }

                return data;
            }

            var data = getWhiteBoardFilter();
            var filter = setAnnotationPropertyFilter() || getPathFilter() + " " + getIndividualsFilter();
            var options = {
                filter: filter,
            };

            Lineage_whiteboard.drawPredicatesGraph(source, data, null, options);
            
            BotEngine.nextStep();
        },
    };

    self.getSourceInferredModelVisjsData = function (sourceLabel, callback) {
        if (self.params.currentSourceInferredModelVijsData) {
            return callback(null, self.params.currentSourceInferredModelVijsData);
        }
        var visjsGraphFileName = self.params.source + "_KGmodelGraph.json";
        $.ajax({
            type: "GET",
            url: `${Config.apiUrl}/data/file?dir=graphs&fileName=${visjsGraphFileName}`,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                self.params.currentSourceInferredModelVijsData = JSON.parse(result);
                return callback(null, self.params.currentSourceInferredModelVijsData);
            },
            error: function (err) {
                return callback(err);
            },
        });
    };

    return self;
})();

export default SparqlQuery_bot;
window.SparqlQuery_bot = SparqlQuery_bot;
