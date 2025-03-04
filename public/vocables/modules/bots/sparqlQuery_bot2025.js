import Lineage_sources from "../tools/lineage/lineage_sources.js";
import Lineage_whiteboard from "../tools/lineage/lineage_whiteboard.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import CommonBotFunctions from "./_commonBotFunctions.js";
import OntologyModels from "../shared/ontologyModels.js";
import _botEngine from "./_botEngine.js";
import Export from "../shared/export.js";
import KGquery from "../tools/KGquery/KGquery.js";
import _commonBotFunctions from "./_commonBotFunctions.js";

var SparqlQuery_bot = (function () {
    var self = {};
    self.maxGraphDisplay = 150;

    self.start = function () {
        self.title = "Query graph";
        _botEngine.init(SparqlQuery_bot, self.workflow, null, function () {
            self.params = { source: Lineage_sources.activeSource, labelsMap: {} };

            _botEngine.nextStep();
        });
    };

    self.workflow = {
        chooseResourceTypeFn: {
            _OR: {
                ObjectProperty: {
                    chooseObjectPropertyResourceTypeFn: {
                        listObjectPropertiesFn: {
                            chooseQueryScopeFn: {
                                chooseOutputTypeFn: {
                                    finalizeQuery: {},
                                },
                                //  },
                            },
                        },
                    },
                },
                Individuals: {
                    choosePredicateFilterFn: {
                        setPredicateFilterFn: {
                            chooseIndividualsOutputTypeFn: {
                                queryIndiviudalsFn: {},
                            },
                        },
                    },
                },
                Class: {
                    chooseQueryScopeFn: {
                        promptKeywordFn: {
                            chooseOutputTypeFn: {
                                finalizeQuery: {},
                            },
                        },
                    },
                },
            },
        },
        sparqlQuery: { showSparqlEditorFn: {} },
        similars: {
            chooseQueryScopeFn: {},
        },
    };

    self.functionTitles = {
        chooseQueryScopeFn: "choose query scope",
        promptKeywordFn: "enter a keyword or enter for any ",
        finalizeQuery: "matching keywords",
        chooseResourceTypeFn: "choose resource type",
        chooseOutputTypeFn: "choose outup type",
        chooseObjectPropertyResourceTypeFn: "choose propety resources",
        choosePredicateFilterFn: "choose predicateFilter mode",
        listObjectPropertiesFn: "choose objectProperty ",
        listVocabsFn: "Choose a source",
        showSparqlEditorFn: "",

        listClassesFn: "Choose a  a class ",
        listPropertiesFn: "Choose a property",
        listAnnotationPropertiesVocabsFn: "Choose a reference ontology",
        listAnnotationPropertiesFn: "Choose a property",
        promptAnnotationPropertyValue: "Filter value ",
        listWhiteBoardFilterType: "Choose a scope",
        listQueryTypeFn: "Choose a query type ",
    };

    self.functions = {
        chooseQueryScopeFn: function () {
            var choices = [
                { id: "activeSource", label: "active source" },
                { id: "whiteboardSources", label: "current sources" },
            ];
            if (self.params.resourceType == "Class") {
                choices.push({ id: "", label: "all sources" });
            }

            _botEngine.showList(choices, "queryScope");
        },

        showSparqlEditorFn: function () {
            MainController.onToolSelect("SPARQL");
            _botEngine.end();
        },

        chooseResourceTypeFn: function () {
            var choices = ["Class", "ObjectProperty", "Individuals"];
            _botEngine.showList(choices, "resourceType");
        },

        chooseOutputTypeFn: function () {
            var choices = ["Tree", "Table", "New Graph"];
            if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                choices.push("Add to Graph");
            }
            _botEngine.showList(choices, "outputType");
        },
        chooseIndividualsOutputTypeFn: function () {
            var choices = ["Table", "New Graph"];
            if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                choices.push("Add to Graph");
            }
            _botEngine.showList(choices, "outputType");
        },

        finalizeQuery: function () {
            var resourceType = self.params.resourceType;
            if (resourceType == "Class") {
                self.processClassQuerySearch();
                // self.processClassQuery()
            }
            if (resourceType == "ObjectProperty") {
                self.processObjectPropertyQuery();
            }
        },
        listObjectPropertiesFn: function () {
            self.getResourcesList(self.params.objectPropertyResourceType, "property", null, function (err, result) {
                var properties = [];
                for (var key in result.labels) {
                    properties.push({ id: key, label: result.labels[key] });
                }
                common.array.sort(properties, "label");
                properties.unshift({ id: "anyProperty", label: "anyProperty" });
                _botEngine.showList(properties, "currentObjectProperty");
            });
        },

        listClassesFn: function () {
            self.getResourcesList(self.params.objectPropertyResourceType, "property", null, function (err, result) {
                var properties = [];
                for (var key in result.labels) {
                    properties.push({ id: key, label: result.labels[key] });
                }
                common.array.sort(properties, "label");
                properties.unshift({ id: "anyClass", label: "anyClass" });
                _botEngine.showList(properties, "currentObjectProperty");
            });
        },

        chooseObjectPropertyResourceTypeFn: function () {
            var choices = ["Predicate", "Restriction", "RangeAndDomain"]; //

            _botEngine.showList(choices, "objectPropertyResourceType");
        },

        choosePredicateFilterFn: function () {
            var choices = ["filterObjectProperty", "filterDatatypeProperty", "filterSubject", "filterObject", "_proceed"];

            _botEngine.showList(choices, "predicateFilterType");
        },
        setPredicateFilterFn: function () {
            self.loadIndiviualsModel(self.params.source, function (err, model) {
                if (self.params.predicateFilterType == "filterObjectProperty") {
                    var properties = [];
                    var distinctNodes = {};
                    model.forEach(function (item) {
                        if (self.params.IndividualSubjectClass && item.sClass.value != self.params.IndividualSubjectClass) {
                            return;
                        }
                        if (self.params.IndividualObjectClass && item.oClass.value != self.params.IndividualObjectClass) {
                            return;
                        }

                        if (!distinctNodes[item.prop.value]) {
                            distinctNodes[item.prop.value] = 1;
                            properties.push({
                                id: item.prop.value,
                                label: item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value),
                            });
                        }
                    });

                    if (properties.length == 0) {
                        alert("no matching property ");
                        return self.functions.choosePredicateFilterFn();
                    }

                    common.array.sort(properties, "label");
                    _botEngine.showList(properties, "IndividualObjectPropertyFilter", null, true, function (selectedValue) {
                        self.params.IndividualObjectPropertyFilter = selectedValue;
                        _botEngine.previousStep();
                    });
                } else if (self.params.predicateFilterType == "filterSubject") {
                    var distinctValues = {};
                    var filteredClasses = [];
                    model.forEach(function (item) {
                        var ok = false;
                        if (!self.params.IndividualObjectPropertyFilter && !self.params.IndividualObjectClass) {
                            ok = true;
                        } else if (item.prop.value == self.params.IndividualObjectPropertyFilter) {
                            ok = true;
                        } else if (item.oClass.value == self.params.IndividualObjectClass) {
                            ok = true;
                        }

                        if (ok) {
                            if (!distinctValues[item.sClass.value]) {
                                distinctValues[item.sClass.value] = 1;
                                filteredClasses.push({ id: item.sClass.value, label: item.sClassLabel.value });
                            }
                        }
                    });

                    _botEngine.showList(filteredClasses, "IndividualSubjectClass", null, true, function (selectedValue) {
                        self.params.IndividualSubjectClass = selectedValue;

                        _botEngine.previousStep();
                    });
                } else if (self.params.predicateFilterType == "filterObject") {
                    var filteredClasses = [];
                    model.forEach(function (item) {
                        var ok = false;
                        if (!self.params.IndividualObjectPropertyFilter && !self.params.IndividualSubjectClass) {
                            ok = true;
                        } else if (item.prop.value == self.params.IndividualObjectPropertyFilter) {
                            ok = true;
                        } else if (item.sClass.value == self.params.IndividualSubjectClass) {
                            ok = true;
                        }

                        if (ok) {
                            if (!distinctValues[item.oClass.value]) {
                                distinctValues[item.oClass.value] = 1;
                                filteredClasses.push({ id: item.oClass.value, label: item.oClassLabel.value });
                            }
                        }
                    });
                    _botEngine.showList(filteredClasses, "IndividualObjectClass", null, true, function (selectedValue) {
                        self.params.IndividualObjectClass = selectedValue;
                        _botEngine.previousStep();
                    });
                } else if (self.params.predicateFilterType == "_proceed") {
                    async.series(
                        [
                            function (callbackSeries) {
                                if (!self.params.IndividualObjectClass) {
                                    return callbackSeries();
                                }
                                var currentClass = {
                                    id: self.params.IndividualObjectClass,
                                    label: "object",
                                };
                                self.runFilterClassBot(model, currentClass, function (err, result) {
                                    self.params.IndividualObjectFilter = result;
                                    return callbackSeries();
                                });
                            },

                            function (callbackSeries) {
                                if (!self.params.IndividualSubjectClass) {
                                    return callbackSeries();
                                }

                                var currentClass = {
                                    id: self.params.IndividualSubjectClass,
                                    label: "subject",
                                };
                                self.runFilterClassBot(model, currentClass, function (err, result) {
                                    self.params.IndividualSubjectFilter = result;
                                    return callbackSeries();
                                });
                            },
                        ],
                        function (err) {
                            if (err) {
                                return alert(err.responseText || err);
                            }
                            _botEngine.nextStep();

                            // _botEngine.end()
                        },
                    );
                }
            });
        },
        queryIndiviudalsFn: function () {
            self.processIndividualsQuery();
        },
    };


    self.processClassQuerySearch = function () {
        var outputType = self.params.outputType;
        var searchedSources = self.params.queryScope;
        if (searchedSources == "activeSource") {
            searchedSources = [Lineage_sources.activeSource];
        } else if (searchedSources == "whiteboardSources") {
            searchedSources = Object.keys(Lineage_sources.loadedSources);
        } else {
            searchedSources = Config.currentProfile.userSources;
        }
        async.series(
            [
                //search Elastic
                function (callbackSeries) {
                    var options = {
                        term: self.params.keyword,
                        searchedSources: searchedSources,
                        type: "Class",
                    };
                    SearchWidget.searchTermInSources(options, function (err, result) {
                        if (err) {
                            callbackSeries(err);
                        }
                        if (result.length == 0) {
                            // alert("no result")
                            return _botEngine.abort("no result");
                        }
                        self.params.elasticResult = result;
                        callbackSeries();
                    });
                },

                //tree
                function (callbackSeries) {
                    if (outputType != "Tree") {
                        return callbackSeries();
                    }

                    UI.openTab("lineage-tab", "classesTab", Lineage_whiteboard.initClassesTab, this);
                    setTimeout(function () {
                        SearchWidget.searchResultToJstree("LineageNodesJsTreeDiv", self.params.elasticResult, {}, function (err, _result) {
                            callbackSeries(err);
                        });
                    }, 500);
                },

                //table
                function (callbackSeries) {
                    if (outputType != "Table") {
                        return callbackSeries();
                    }

                    var cols = [];
                    cols.push(
                        { title: "source", defaultContent: "" },
                        {
                            title: "label",
                            defaultContent: "",
                        },
                        { title: "uri", defaultContent: "" },
                    );
                    var dataset = [];

                    self.params.elasticResult.forEach(function (item0) {
                        for (var source in item0.matches) {
                            item0.matches[source].forEach(function (item) {
                                var obj = [item.source, item.label, item.id];
                                if (!item.parents || !item.parents.forEach) {
                                    var x = 3;
                                } else {
                                    item.parents.forEach(function (parent, indexParent) {
                                        if (indexParent == 0) {
                                            return;
                                        }
                                        if (cols.length <= indexParent + 3) {
                                            cols.push({ title: "ancestor_" + indexParent, defaultContent: "" });
                                        }

                                        var parentLabel = self.params.elasticResult.parentIdsLabelsMap[parent];
                                        obj.push(parentLabel || parent);
                                    });
                                }
                                dataset.push(obj);
                            });
                        }
                    });

                    Export.showDataTable("mainDialogDiv", cols, dataset);
                    callbackSeries();
                },

                //graph
                function (callbackSeries) {
                    if (outputType != "Graph") {
                        return callbackSeries();
                    }
                    var visjsData = { nodes: [], edges: [] };
                    var sources = [];
                    self.params.elasticResult.forEach(function (item0) {
                        var uniqueNodes = {};
                        for (var source in item0.matches) {
                            if (sources.indexOf(source) < 0) {
                                sources.push(source);
                            }
                            item0.matches[source].forEach(function (item) {
                                if (!uniqueNodes[item.id]) {
                                    uniqueNodes[item.id] = 1;
                                    visjsData.nodes.push({
                                        id: item.id,
                                        label: item.label,
                                        shape: "dot",
                                        color: "#dda",
                                        data: {
                                            id: item.id,
                                            label: item.label,
                                            source: item.source,
                                        },
                                    });
                                }
                            });
                        }
                    });
                    Lineage_whiteboard.drawNewGraph(visjsData);
                    //   Lineage_sources.loadSources(sources);

                    // Lineage_whiteboard.lineageVisjsGraph.data.nodes.add(visjsData.nodes)
                    callbackSeries();
                },
            ],
            function (err) {
                if (err) {
                    return _botEngine.abort(err.responseText || err);
                }
                return _botEngine.end();
            },
        );
    };

    self.processClassQuery = function () {
        var outputType = self.params.outputType;
        var searchedSources = self.params.queryScope;
        if (searchedSources == "activeSource") {
            searchedSources = [Lineage_sources.activeSource];
        } else if (searchedSources == "whiteboardSources") {
            searchedSources = Object.keys(Lineage_sources.loadedSources);
        } else {
            searchedSources = Config.currentProfile.userSources;
        }

        var classes = {};
        async.series(
            [
                //select propertie in Config.ontologiesVocabularyModels
                function (callbackSeries) {
                    OntologyModels.registerSourcesModel(searchedSources, { noCache: false }, function (err, result) {
                        searchedSources.forEach(function (source) {
                            var sourceOntologyModel = Config.ontologiesVocabularyModels[source];
                            for (var classId in sourceOntologyModel.classes) {
                                var classLabel = sourceOntologyModel.classes[classId].label;

                                if ((!self.params.selectedClass && !self.params.keyword) || classLabel.indexOf(self.params.keyword) > -1 || classId == self.params.selectedClass) {
                                    classes[classId] = sourceOntologyModel.classes[classId];
                                    classes[classId].source = source;
                                }
                            }
                        });

                        callbackSeries();
                    });
                },

                //draw Graph
                function (callbackSeries) {
                    if (outputType != "Graph") {
                        return callbackSeries();
                    }
                    if (Object.keys(classes).length > self.maxGraphDisplay) {
                        return _botEngine.abort("too many nodes to display a usable graph");
                    }
                    var visjsData = { nodes: [], edges: [] };
                    var existingNodes = {};
                    for (var classId in classes) {
                        var classLabel = classes[classId].label;
                        var superClass = classes[classId].superClass;
                        var superClassLabel = classes[classId].superClassLabel;
                        var source = classes[classId].source;

                        if (!existingNodes[classId]) {
                            existingNodes[classId] = 1;
                            visjsData.nodes.push({
                                id: classId,
                                label: classLabel,
                                shape: "dot",
                                color: "#d44",
                                data: {
                                    id: classId,
                                    label: classLabel,
                                    source: source,
                                },
                            });
                        }

                        /*      if (!existingNodes[superClass]) {
                                      existingNodes[superClass] = 1
                                      visjsData.nodes.push({
                                          id: superClass,
                                          label: superClassLabel,
                                          shape: "dot",
                                          color: "#d44",
                                          data: {
                                              id: superClass,
                                              label: superClassLabel,
                                              source: source
                                          }
                                      })
                                  }


                                  visjsData.edges.push({
                                      id: common.getRandomHexaId(10),
                                      label: "subClassOf",
                                      from: classId,
                                      to: superClass,
                                      data: {},
                                      arrows: "to"
                                  })*/
                    }
                    Lineage_whiteboard.drawNewGraph(visjsData);
                    callbackSeries();
                },
            ],

            function (err) {
                _botEngine.end();
            },
        );
    };
    self.processObjectPropertyQuery = function () {
        var outputType = self.params.outputType;
        var searchedSources = self.params.queryScope;
        if (searchedSources == "activeSource") {
            searchedSources = [Lineage_sources.activeSource];
        } else if (searchedSources == "whiteboardSources") {
            searchedSources = Object.keys(Lineage_sources.loadedSources);
        } else {
            searchedSources = Config.currentProfile.userSources;
        }

        var filter = null;
        if (self.params.currentObjectProperty != "anyProperty") {
            filter = Sparql_common.setFilter("predicate", self.params.currentObjectProperty);
        }

        self.getResourcesList(self.params.objectPropertyResourceType, null, filter, function (err, result) {
            if (outputType == "New Graph") {
                self.drawPredicateGraph(result, false, {});
            } else if (outputType == "Add to Graph") {
                self.drawPredicateGraph(result, true, {});
            } else if (outputType == "Table") {
                self.drawDataTableQueryResult(result);
            }
            _botEngine.nextStep();
        });
    };

    /**
     *
     * type :
     * selectVars Sparql vars to select distinct ?subject ?predicate ?object
     *
     */
    (self.getResourcesList = function (type, role, filter, callback) {
        var sparql_url = Config.sources[self.params.source].sparql_server.url;
        var fromStr = Sparql_common.getFromStr(self.params.source);

        var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#>" + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" + "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>";

        var selectVars = "*";
        if (type == "Restriction") {
            if (role == "property") {
                selectVars = "?predicate";
            }
            if (role == "domain") {
                selectVars = "?subject";
            }
            if (role == "range") {
                selectVars = "?object";
            }

            query += "SELECT distinct   " + selectVars + fromStr + " WHERE {   ?subject rdfs:subClassOf ?b.\n" + "  ?b owl:onProperty ?predicate .\n" + "  ?b ?q ?object .?object rdf:type owl:Class\n";
        } else if (type == "RangeAndDomain") {
            if (role == "property") {
                selectVars = "?predicate";
            }
            if (role == "domain") {
                selectVars = "?subject";
            }
            if (role == "range") {
                selectVars = "?object";
            }
            query +=
                "SELECT distinct   " +
                selectVars +
                fromStr +
                " WHERE {   ?predicate rdf:type owl:ObjectProperty.\n" +
                "  OPTIONAL {?predicate rdfs:domain ?subject} .\n" +
                "  OPTIONAL {?predicate rdfs:object ?object} .\n";
        } else if (type == "Predicate") {
            if (role == "property") {
                selectVars = "?predicate";
            }
            if (role == "subject") {
                selectVars = "?subject";
            }
            if (role == "object") {
                selectVars = "?object";
            }
            query += "SELECT distinct   " + selectVars + fromStr + " WHERE {  ?subject ?predicate ?object.\n";
        } else if (type == "Class") {
            if (role == "subject") {
                selectVars = "?subject";
            } else if (role == "object") {
                selectVars = "?object";
            }
        }
        if (filter) {
            query += filter;
        }

        query += "} limit 10000";

        Sparql_proxy.querySPARQL_GET_proxy(sparql_url, query, null, null, function (err, result) {
            if (err) {
                return callback(err);
            }

            var predicates = [];
            var labelsMap = {};
            result.results.bindings.forEach(function (item) {
                var obj = {};
                for (var key in item) {
                    obj[key] = item[key].value;
                    labelsMap[item[key].value] = "";
                }
                predicates.push(obj);
            });

            self.fillLabelsFromUris(Object.keys(labelsMap), function (err, result) {
                if (err) {
                    return callback(err);
                }

                return callback(null, { predicates: predicates, labels: result });
            });
        });
    }),
        (self.fillLabelsFromUris = function (uris, callback) {
            var sparql_url = Config.sources[self.params.source].sparql_server.url;
            var fromStr = Sparql_common.getFromStr(self.params.source);

            var filter = Sparql_common.setFilter("s", uris);

            var query =
                "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
                "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                "SELECT distinct * " +
                fromStr +
                " WHERE {\n" +
                "  ?s rdfs:label ?sLabel. " +
                filter +
                "} limit 10000";
            Sparql_proxy.querySPARQL_GET_proxy(sparql_url, query, null, null, function (err, result) {
                if (err) {
                    return callback(err);
                }
                var labelsMap = {};
                result.results.bindings.forEach(function (item) {
                    labelsMap[item.s.value] = item.sLabel.value;
                });
                uris.forEach(function (uri) {
                    if (!labelsMap[uri]) {
                        labelsMap[uri] = Sparql_common.getLabelFromURI(uri);
                    }
                });

                callback(null, labelsMap);
            });
        });

    self.drawPredicateGraph = function (queryResult, addTograph, options, callback) {
        if (!options) {
            options = {};
        }
        var visjsData = { nodes: [], edges: [] };
        var existingNodes = {};
        if (addTograph) {
            existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
        }
        var labelsMap = queryResult.labels;

        queryResult.predicates.forEach(function (item) {
            if (item.subject) {
                if (!existingNodes[item.subject]) {
                    existingNodes[item.subject] = 1;
                    visjsData.nodes.push({
                        id: item.subject,
                        label: labelsMap[item.subject],
                        shape: "dot",
                        color: "#d44",
                        data: {
                            id: item.subject,
                            label: labelsMap[item.subject],
                            source: self.params.source,
                        },
                    });
                }
            }

            if (item.object) {
                if (!existingNodes[item.object]) {
                    existingNodes[item.object] = 1;
                    visjsData.nodes.push({
                        id: item.object,
                        label: labelsMap[item.object],
                        shape: "dot",
                        color: "#07b611",
                        data: {
                            id: item.object,
                            label: labelsMap[item.object],
                            source: self.params.source,
                        },
                    });
                }
            }

            visjsData.edges.push({
                id: common.getRandomHexaId(10),
                label: labelsMap[item.predicate],
                from: item.subject,
                to: item.object,
                data: {},
                arrows: "to",
            });
        });

        if (addTograph) {
            Lineage_whiteboard.lineageVisjsGraph.data.nodes.add(visjsData.nodes);
            Lineage_whiteboard.lineageVisjsGraph.data.edges.add(visjsData.edges);
        } else {
            Lineage_whiteboard.drawNewGraph(visjsData);
        }
        if (callback) {
            callback();
        }
    };

    self.drawDataTableQueryResult = function (queryResult, callbacl) {
        var cols = [];
        var dataset = [];
        cols.push(
            { title: "subject", defaultContent: "" },
            { title: "Predicate", defaultContent: "" },
            { title: "Object", defaultContent: "" },
            { title: "subjectURI", defaultContent: "" },
            { title: "PredicateURI", defaultContent: "" },
            { title: "ObjectURI", defaultContent: "" },
        );
        var labelsMap = queryResult.labels;
        queryResult.predicates.forEach(function (item) {
            dataset.push([labelsMap[item.subject], labelsMap[item.predicate], labelsMap[item.object], item.subject, item.predicate, item.object]);
        });

        Export.showDataTable("mainDialogDiv", cols, dataset);
    };

    return self;
})();

export default SparqlQuery_bot;
window.SparqlQuery_bot = SparqlQuery_bot;
