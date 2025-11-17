import Lineage_sources from "../tools/lineage/lineage_sources.js";
import Sparql_OWL from "../sparqlProxies/sparql_OWL.js";
import Lineage_whiteboard from "../tools/lineage/lineage_whiteboard.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import BotEngineClass from "./_botEngineClass.js";
import CommonBotFunctions from "./_commonBotFunctions.js";
import Containers_graph from "../tools/containers/containers_graph.js";
import Containers_widget from "../tools/containers/containers_widget.js";
import Axioms_graph from "../tools/axioms/axioms_graph.js";

var NodeRelations_bot = (function () {
    var self = {};
    self.myBotEngine = new BotEngineClass();

    self.start = function () {
        self.title = "Query graph";
        self.myBotEngine.init(NodeRelations_bot, self.workflow, null, function () {
            self.params = {
                source: Lineage_sources.activeSource,
                currentClass: Lineage_whiteboard.currentGraphNode.data.id,
            };
            self.myBotEngine.nextStep();
        });
    };

    self.workflow = {
        _OR: {
            "Object Property": {
                listVocabsFn: {
                    listPredicatePathsFn: { executeQuery: {} },
                },
            },

            "Annotation/Datatype property": {
                _OR: {
                    "draw Annotation/Datatype properties": {
                        drawDatatypePropertiesFn: {},
                    },
                    "Filter on Annotation/Datatype property value": {
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
            Restrictions: {
                listRestrictions: { drawRestrictions: {} },
            },
            "Inverse Restrictions": { listInverseRestrictions: { drawInverseRestrictions: {} } },
            "Similars (same label)": {
                similarsFn: {},
            },
            "Container members": {
                containersMembersFn: {},
            },
            ParentContainers: {
                parentContainersFn: {},
            },
            "Node traversal": {
                nodeTraversalFn: {},
            },
        },
    };

    self.functionTitles = {
        listVocabsFn: "Choose a reference ontology",

        listClassesFn: "Choose a  a class ",
        listAnnotationPropertiesVocabsFn: "Choose a reference ontology",
        listAnnotationPropertiesFn: "Choose a property",
        promptAnnotationPropertyValue: "Filter value ",
        listWhiteBoardFilterType: "Choose a scope",
    };

    self.functions = {
        drawDatatypePropertiesFn: function () {
            Lineage_whiteboard.drawDataTypeProperties(null, [self.params.currentClass], {}, function (err, result) {
                self.myBotEngine.nextStep();
            });
        },
        containersMembersFn: function () {
            Containers_graph.graphResources(self.params.source, { id: self.params.currentClass }, { leaves: true });
            self.myBotEngine.nextStep();
        },
        parentContainersFn: function () {
            Containers_widget.showParentContainersDialog();
            self.myBotEngine.nextStep();
        },
        similarsFn: function () {
            Lineage_similars.showDialog(true);
            self.myBotEngine.nextStep();
        },
        listVocabsFn: function () {
            CommonBotFunctions.listVocabsFn(Lineage_sources.activeSource, true, function (err, vocabs) {
                if (err) {
                    return self.myBotEngine.abort(err);
                }
                if (vocabs.length == 0) {
                    return self.myBotEngine.previousStep("no values found, try another option");
                }
                self.myBotEngine.showList(vocabs, "currentVocab");
            });
        },

        listClassesFn: function () {
            CommonBotFunctions.listVocabClasses(self.params.currentVocab, true, [{ label: "_Any Class", id: "AnyClass" }], function (err, classes) {
                if (err) {
                    return self.myBotEngine.abort(err);
                }
                self.myBotEngine.showList(classes, "currentClass");
            });
        },

        listPredicatePathsFn: function () {
            var property = self.params.currentProperty;
            var fromClass = self.params.currentClass;
            var toClass = null;

            Sparql_OWL.getFilteredTriples2(self.params.source, self.params.currentClass, null, null, { distinct: "?prop ?propLabel" }, function (err, result) {
                if (err) {
                    console.log(err.responseText);
                    return self.myBotEngine.reset();
                }
                var properties = [];
                result.forEach(function (item) {
                    if (item.propLabel) {
                        properties.push({ id: item.prop.value, label: item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value) });
                    }
                });
                properties.splice(0, 0, { id: "AnyProperty", label: "Any Property" });
                self.myBotEngine.showList(properties, "currentProperty", null, true);
            });
        },

        listAnnotationPropertiesVocabsFn: function () {
            CommonBotFunctions.listVocabsFn(self.params.source, true, function (err, vocabs) {
                if (err) {
                    return self.myBotEngine.abort(err);
                }
                if (vocabs.length == 0) {
                    return self.myBotEngine.previousStep("no values found, try another option");
                }
                self.myBotEngine.showList(vocabs, "annotationPropertyVocab");
            });
        },

        listAnnotationPropertiesFn: function () {
            // filter properties compatible with
            CommonBotFunctions.listNonObjectPropertiesFn([self.params.annotationPropertyVocab], null, function (err, props) {
                if (err) {
                    return self.myBotEngine.abort(err);
                }
                if (props.length == 0) {
                    return self.myBotEngine.previousStep("no values found, try another option");
                }
                self.myBotEngine.showList(props, "annotationPropertyId");
            });
        },

        promptAnnotationPropertyValue: function () {
            self.myBotEngine.promptValue("value contains ", "annotationValue");
        },

        listRestrictions: function () {
            //    Lineage_whiteboard.drawRestrictions( self.params.source,  self.params.currentClass, null, null, {  }, function (err, result) {
            Sparql_OWL.getObjectRestrictions(self.params.source, self.params.currentClass, { listPropertiesOnly: true }, function (err, result) {
                if (result.length == 0) {
                    return self.myBotEngine.abort("no data found");
                }
                var properties = [];
                result.forEach(function (item) {
                    if (item.propLabel) {
                        properties.push({ id: item.prop.value, label: item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value) });
                    }
                });
                properties.splice(0, 0, { id: "AnyProperty", label: "Any Property" });
                self.myBotEngine.showList(properties, "currentProperty", null, true);
            });
        },
        listInverseRestrictions: function () {
            //    Lineage_whiteboard.drawRestrictions( self.params.source,  self.params.currentClass, null, null, {  }, function (err, result) {
            Sparql_OWL.getObjectRestrictions(self.params.source, self.params.currentClass, { listPropertiesOnly: true, inverseRestriction: true }, function (err, result) {
                var properties = [];
                result.forEach(function (item) {
                    if (item.propLabel) {
                        properties.push({ id: item.prop.value, label: item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value) });
                    }
                });
                properties.splice(0, 0, { id: "AnyProperty", label: "Any Property" });
                self.myBotEngine.showList(properties, "currentProperty", null, true);
            });
        },

        drawRestrictions: function () {
            var options = {};
            if (self.params.currentProperty && self.params.currentProperty != "AnyProperty") {
                options.filter = Sparql_common.setFilter("prop", self.params.currentProperty);
            }
            Lineage_whiteboard.drawRestrictions(self.params.source, self.params.currentClass, null, null, {}, function (err, result) {});
            self.myBotEngine.nextStep();
        },
        drawInverseRestrictions: function () {
            var options = { inverseRestriction: true };
            if (self.params.currentProperty && self.params.currentProperty != "AnyProperty") {
                options.filter = Sparql_common.setFilter("prop", self.params.currentProperty);
            }
            Lineage_whiteboard.drawRestrictions(self.params.source, self.params.currentClass, null, null, options, function (err, result) {});
            self.myBotEngine.nextStep();
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
            var sampleType = self.params.sampleType;
            var sampleSize = self.params.sampleSize;
            var OnlySubjects = false;
            var withImports = false;

            function setAnnotationPropertyFilter() {
                if (!annotationPropertyId) {
                    return "";
                }
                var filterProp = "FILTER (?prop=<" + annotationPropertyId + ">)";
                var filterValue = annotationValue ? 'FILTER(regex(?object, "' + annotationValue + '", "i"))' : "";
                return filterProp + "" + filterValue;
            }

            function getPathFilter() {
                var filterPath = "";
                if (!path) {
                    if (currentClass && currentClass != "AnyClass") {
                        filterPath = Sparql_common.setFilter("subject", currentClass, null, { useFilterKeyWord: 1 });
                    } else {
                        withImports = false;
                        OnlySubjects = true;
                        filterPath = " ?subject rdf:type owl:Class. filter(!isBlank(?object))   filter (?prop=rdf:type)";
                    }
                    if (currentProperty && currentProperty != "AnyProperty") {
                        OnlySubjects = false;
                        filterPath += Sparql_common.setFilter("prop", currentProperty);
                    } else if (!currentClass) {
                        OnlySubjects = false;
                        withImports = true;
                        filterPath = "graph ?g{ ?prop rdf:type owl:ObjectProperty.}" + "?subject rdf:type owl:Class.";
                    }

                    return filterPath;
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
                filter += " ?subject rdf:type owl:NamedIndividual.";
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
            var filter = "";
            var limit = null;
            var getFilteredTriples2 = null;
            if (sampleType) {
                getFilteredTriples2 = true;

                if (sampleType == "Predicates") {
                    filter = " filter(?prop not in (rdf:type,rdfs:subClassOf ))";
                } else {
                    filter = " ?subject rdf:type " + sampleType + ". "; //filter(?object!=" + sampleType + ") filter(?prop=rdf:type || ?prop=rdfs:subClassOf )  ";
                }
                try {
                    limit = parseInt(sampleSize);
                } catch (e) {
                    alert("wrong number for sampleSize");
                    return self.myBotEngine.reset();
                }
            } else {
                filter = setAnnotationPropertyFilter() || getPathFilter() + " " + getIndividualsFilter();
            }
            var options = {
                filter: filter,
                limit: limit,
                getFilteredTriples2: getFilteredTriples2,
                OnlySubjects: OnlySubjects,
                withImports: withImports,
            };

            Lineage_whiteboard.drawPredicatesGraph(source, data, null, options);

            self.myBotEngine.nextStep();
        },

        nodeTraversalFn: function () {
            var edgesFromMap = {};
            var edgesToMap = {};
            var nodesMap = {};
            var existingNodes = {};

            Lineage_whiteboard.lineageVisjsGraph.data.nodes.get().forEach(function (item) {
                nodesMap[item.id] = item;
            });
            Lineage_whiteboard.lineageVisjsGraph.data.edges.get().forEach(function (item) {
                if (!edgesFromMap[item.from]) edgesFromMap[item.from] = [];
                edgesFromMap[item.from].push(item);
                if (!edgesToMap[item.to]) edgesToMap[item.to] = [];
                edgesToMap[item.to].push(item);
            });

            var newNodes = [];
            var newEdges = [];
            function recurse(nodeId, level) {
                if (!existingNodes[nodeId]) {
                    existingNodes[nodeId] = 1;
                    nodesMap[nodeId].level = level;
                    newNodes.push(nodesMap[nodeId]);
                    var edges = edgesFromMap[nodeId];
                    if (edges) {
                        edges.forEach(function (edge) {
                            if (!existingNodes[edge.to]) {
                                newEdges.push(edge);
                                recurse(edge.to, level + 1);
                            }
                        });
                    }
                    edges = edgesToMap[nodeId];
                    if (edges) {
                        edges.forEach(function (edge) {
                            if (!existingNodes[edge.from]) {
                                newEdges.push(edge);
                                recurse(edge.from, level + 1);
                            }
                        });
                    }
                }
            }
            recurse(self.params.currentClass, 1);
            var visjsData = { nodes: newNodes, edges: newEdges };
            $("#mainDialogDiv").html("<div id='lineageRelation_graphDiv' style='width:800px;height:800px;overflow:auto'></div>");
            $("#mainDialogDiv").dialog("open");
            var options = {};
            Axioms_graph.drawGraph(visjsData, "lineageRelation_graphDiv", options);
        },
    };

    self.getSourceImplicitModelVisjsData = function (sourceLabel, callback) {
        if (self.params.currentSourceImplicitModelVijsData) {
            return callback(null, self.params.currentSourceImplicitModelVijsData);
        }
        var visjsGraphFileName = self.params.source + "_KGmodelGraph.json";
        $.ajax({
            type: "GET",
            url: `${Config.apiUrl}/data/file?dir=graphs&fileName=${visjsGraphFileName}`,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                self.params.currentSourceImplicitModelVijsData = JSON.parse(result);
                return callback(null, self.params.currentSourceImplicitModelVijsData);
            },
            error: function (err) {
                return callback(err);
            },
        });
    };

    return self;
})();

export default NodeRelations_bot;
window.NodeRelations_bot = NodeRelations_bot;
