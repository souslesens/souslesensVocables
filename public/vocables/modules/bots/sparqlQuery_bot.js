import Lineage_sources from "../tools/lineage/lineage_sources.js";
import Lineage_whiteboard from "../tools/lineage/lineage_whiteboard.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import CommonBotFunctions from "./_commonBotFunctions.js";
import OntologyModels from "../shared/ontologyModels.js";
import _botEngine from "./_botEngine.js";
import Export from "../shared/export.js";

var SparqlQuery_bot = (function () {
    var self = {};

    self.start = function () {
        self.title = "Query graph";
        _botEngine.init(SparqlQuery_bot, self.workflow, null, function () {
            self.params = {source: Lineage_sources.activeSource};
            _botEngine.nextStep();
        });
    };

    self.workflow = {


        _OR: {
            keyword: {
                promptKeywordFn: {
                    chooseQueryScopeFn: {
                        chooseResourceTypeFn: {
                            _OR: {
                                ObjectProperty: {
                                    chooseObjectPropertyResourceFn: {
                                        chooseOutputTypeFn: {
                                            searchKeywordFn: {}
                                        }
                                    }
                                },
                                DatatypeProperty: {
                                    chooseDatatypePropertyResourceFn: {
                                        chooseOutputTypeFn: {
                                            searchKeywordFn: {}
                                        }
                                    }
                                },
                                _DEFAULT: {
                                    chooseOutputTypeFn: {
                                        searchKeywordFn: {}
                                    }
                                }


                            },

                        }
                    }
                }
            },
            sparqlQuery: {showSparqlEditorFn: {}},
            similars: {
                chooseQueryScopeFn: {}
            },

        }
    }


    self.functionTitles = {
        chooseQueryScopeFn: "choose query scope",
        promptKeywordFn: "enter a keyword or enter for any ",
        searchKeywordFn: "matching keywords",
        chooseResourceTypeFn: "choose resource type",
        chooseOutputTypeFn: "choose outup type",
        chooseObjectPropertyResourceFn: "choose propety resources",


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
                {id: "activeSource", label: "active source"},
                {id: "whiteboardSources", label: "current sources"},
                {id: "", label: "all sources"}


            ]
            _botEngine.showList(choices, "queryScope")
        },
        promptKeywordFn: function () {
            _botEngine.promptValue("keyword", "keyword", "pump")
        }
        ,
        showSparqlEditorFn: function () {
            MainController.onToolSelect("SPARQL")
            _botEngine.end()
        },

        chooseResourceTypeFn: function () {
            var choices = [
                "Class",
                "ObjectProperty",
                "dataTypeProperty",
                "Individual",
                "litteral value"
            ]
            _botEngine.showList(choices, "resourceType")

        },

        chooseOutputTypeFn: function () {
            var choices = [
                "Tree",
                "Table",
                "Graph",
            ]
            _botEngine.showList(choices, "outputType")

        },

        searchKeywordFn: function () {


            var resourceType = self.params.resourceType;
            if (resourceType == "Class") {
                self.processClassQuery()
            }
            if (resourceType == "ObjectProperty") {
                self.processObjectPropertyQuery()
            }
            if (resourceType == "dataTypeProperty") {

            }
            if (resourceType == "Individual") {

            }
            if (resourceType == "litteral value") {

            }

        },
        chooseObjectPropertyResourceFn: function () {
            var choices = [

                "RangeAndDomain",
                "Restriction",
                "Predicate",

            ]

            _botEngine.showList(choices, "objectPropertyResourceType")

        }
    }


    self.processClassQuery = function () {
        var outputType = self.params.outputType;
        var searchedSources = self.params.queryScope
        if (searchedSources == "activeSource") {
            searchedSources = [Lineage_sources.activeSource]
        } else if (searchedSources == "whiteboardSources") {
            searchedSources = Object.keys(Lineage_sources.loadedSources)
        } else {
            searchedSources = Config.currentProfile.userSources
        }
        async.series([

            //search Elastic
            function (callbackSeries) {
                var options = {
                    term: self.params.keyword,
                    searchedSources: searchedSources
                }
                SearchWidget.searchTermInSources(options, function (err, result) {
                    if (err) {
                        callbackSeries(err)
                    }
                    if (result.length == 0)
                        // alert("no result")
                    {
                        return _botEngine.abort("no result")
                    }
                    self.params.elasticResult = result
                    callbackSeries()
                })
            },

            //tree
            function (callbackSeries) {
                if (outputType != "Tree") {
                    return callbackSeries()
                }

                UI.openTab('lineage-tab', 'classesTab', Lineage_whiteboard.initClassesTab, this)
                setTimeout(function () {
                    SearchWidget.searchResultToJstree("LineageNodesJsTreeDiv", self.params.elasticResult, {}, function (err, _result) {
                        callbackSeries(err)
                    });
                }, 500)


            },

            //table
            function (callbackSeries) {
                if (outputType != "Table") {
                    return callbackSeries()
                }

                var cols = []
                cols.push(
                    {title: "source", defaultContent: ""},
                    {title: "label", defaultContent: ""},
                    {title: "uri", defaultContent: ""},
                )
                var dataset = []


                self.params.elasticResult.forEach(function (item0) {

                    for (var source in item0.matches) {
                        item0.matches[source].forEach(function (item) {
                            var obj = [item.source, item.label, item.id]
                            if (!item.parents || !item.parents.forEach) {
                                var x = 3
                            } else {
                                item.parents.forEach(function (parent, indexParent) {
                                    if (indexParent == 0) {
                                        return;
                                    }
                                    if (cols.length <= indexParent + 3) {
                                        cols.push({title: "ancestor_" + indexParent, defaultContent: ""})
                                    }

                                    var parentLabel = self.params.elasticResult.parentIdsLabelsMap[parent]
                                    obj.push(parentLabel || parent)

                                })
                            }
                            dataset.push(obj)

                        })
                    }


                })

                Export.showDataTable("mainDialogDiv", cols, dataset)
                callbackSeries()

            },

            //graph
            function (callbackSeries) {
                if (outputType != "Graph") {
                    return callbackSeries()
                }
                var visjsData = {nodes: [], edges: []}
                var sources = []
                self.params.elasticResult.forEach(function (item0) {


                    var uniqueNodes = {}
                    for (var source in item0.matches) {
                        if (sources.indexOf(source) < 0) {
                            sources.push(source)
                        }
                        item0.matches[source].forEach(function (item) {
                            if (!uniqueNodes[item.id]) {
                                uniqueNodes[item.id] = 1
                                visjsData.nodes.push({
                                    id: item.id,
                                    label: item.label,
                                    shape: "dot",
                                    color: "#dda",
                                    data: {
                                        id: item.id,
                                        label: item.label,
                                        source: item.source
                                    }

                                })
                            }
                        })

                    }
                })
                Lineage_whiteboard.drawNewGraph(visjsData)
                //   Lineage_sources.loadSources(sources);

                // Lineage_whiteboard.lineageVisjsGraph.data.nodes.add(visjsData.nodes)
                callbackSeries()


            }

        ], function (err) {
            if (err) {
                return _botEngine.abort(err.responseText || err)
            }
            return _botEngine.end()
        })


    }


    self.processObjectPropertyQuery = function () {
        var outputType = self.params.outputType;
        var searchedSources = self.params.queryScope
        if (searchedSources == "activeSource") {
            searchedSources = [Lineage_sources.activeSource]
        } else if (searchedSources == "whiteboardSources") {
            searchedSources = Object.keys(Lineage_sources.loadedSources)
        } else {
            searchedSources = Config.currentProfile.userSources
        }

        var objectPropertyResourceType = self.params.objectPropertyResourceType
        var properties = {}
        async.series([

            //select propertie in Config.ontologiesVocabularyModels
            function (callbackSeries) {


                OntologyModels.registerSourcesModel(searchedSources, function (err, result) {
                    searchedSources.forEach(function (source) {

                        var sourceOntologyModel = Config.ontologiesVocabularyModels[source]
                        for (var property in sourceOntologyModel.properties) {
                            var propLabel=sourceOntologyModel.properties[property].label
                            if (!self.params.keyword || propLabel.indexOf(self.params.keyword) > -1) {
                                properties[property] = sourceOntologyModel.properties[property];
                                properties[property].source = source
                                properties[property].constraints = sourceOntologyModel.constraints[property] ||{};
                                properties[property].restrictions = sourceOntologyModel.restrictions[property] ||{};

                            }

                        }
                    })

                    callbackSeries();


                })
            }

            //draw Graph
            , function (callbackSeries) {
                if (outputType != "Graph") {
                    return callbackSeries()
                }
                var visjsData = {nodes: [], edges: []}
                var existingNodes={}
                for (var property in properties) {

                    if (objectPropertyResourceType.indexOf("RangeAndDomain") > -1) {
                        var constraint= properties[property].constraints
                        var range =constraint.range
                        var domain = constraint.domain
                        if (range && range !=domain) {
                            if(!existingNodes[range]) {
                                existingNodes[range]=1
                                visjsData.nodes.push({
                                    id: range,
                                    label: constraint.rangeLabel,
                                    shape: "dot",
                                    color: "#d44",
                                    data: {
                                        id: range,
                                        label: constraint.rangeLabel,
                                        source: properties[property].source
                                    }
                                })
                            }
                        } else {
                            range=common.getRandomHexaId(5),
                            visjsData.nodes.push({
                                id:range,
                                label: "none",
                                shape: "text",
                                color: "#efbf00",
                                data: {

                                }
                            })
                        }
                        if (domain && range !=domain) {
                            if(!existingNodes[domain]) {
                                existingNodes[domain] = 1
                                visjsData.nodes.push({
                                    id: domain,
                                    label: constraint.domainLabel,
                                    shape: "dot",
                                    color: "#d44",
                                    data: {
                                        id: domain,
                                        label: constraint.domainLabel,
                                        source: properties[property].source
                                    }
                                })
                            }
                        } else {
                            domain=common.getRandomHexaId(5),
                            visjsData.nodes.push({
                                id: common.getRandomHexaId(5),
                                label: "none",
                                shape: "text",
                                color: "#efbf00",
                                data: {

                                }
                            })
                        }
                        var label=properties[property].label
                        visjsData.edges.push({
                            id:property,
                            label:label,
                            from:domain,
                            to:range,
                            data:{
                                id:property,
                                label:label,
                                source:properties[property] .source


                            }
                        })

                        Lineage_whiteboard.drawNewGraph(visjsData)


                    } else if (objectPropertyResourceType.indexOf("Restriction") > -1) {

                    }
                    if (objectPropertyResourceType.indexOf("Predicate") > -1) {

                    }

                }

            }


        ], function (err) {

        })

    }

    self.workflowOld = {
        _OR: {
            Class: {
                listVocabsFn: {
                    listClassesFn: {
                        _OR: {
                            "Any Predicate": {listWhiteBoardFilterType: {executeQuery: {}}},
                            "Choose Predicate": {
                                listPredicatePathsFn: {
                                    _OR: {
                                        empty: {listWhiteBoardFilterType: {executeQuery: {}}},
                                        ok: {listWhiteBoardFilterType: {executeQuery: {}}}, //self.workflow_individualsRole,
                                    },
                                },
                            },
                            " Restrictions": {listWhiteBoardFilterType: {drawRestrictions: {}}},
                            "Inverse Restrictions": {listWhiteBoardFilterType: {drawInverseRestrictions: {}}},
                            Individuals: {setIndividualsTypeFilter: {executeQuery: {}}},
                        },
                    },
                },
            },
            Individual: {
                listActiveSourceVocabsFn: {
                    listClassesFn: {switchToIndividualsBotFn: {}},
                },
            },
            "Object Property": {
                listVocabsFn: {
                    listPropertiesFn: {
                        _OR: {
                            "Any Predicate": {listWhiteBoardFilterType: {executeQuery: {}}},

                            //  _DEFAULT: {
                            "Choose Predicate": {
                                listPredicatePathsFn: {
                                    _OR: {
                                        empty: {listWhiteBoardFilterType: {executeQuery: {}}},
                                        ok: self.workflow_individualsRole,
                                    },
                                },
                            },
                            Restrictions: {listWhiteBoardFilterType: {drawRestrictions: {}}},
                            "Inverse Restrictions": {listWhiteBoardFilterType: {drawInverseRestrictions: {}}},
                            Individuals: {setIndividualsTypeFilter: {executeQuery: {}}},

                            // },
                        },
                    },
                },
            },
            "Annotation/Datatype property": {
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
            /*  "Sample of Classes": { promptClassesSampleSizeFn: { executeQuery: {} } },
              "Sample of Individuals": { promptIndividualsSampleSizeFn: { executeQuery: {} } },*/
            "Sample of Predicates": {promptPredicatesSampleSizeFn: {executeQuery: {}}},
        },
    };

    self.functionTitlesOld = {
        listVocabsFn: "Choose a reference ontology",
        listQueryTypeFn: "Choose a query type ",
        listClassesFn: "Choose a  a class ",
        listPropertiesFn: "Choose a property",
        listAnnotationPropertiesVocabsFn: "Choose a reference ontology",
        listAnnotationPropertiesFn: "Choose a property",
        promptAnnotationPropertyValue: "Filter value ",
        listWhiteBoardFilterType: "Choose a scope",
    };

    self.functionsOld = {
        listVocabsFn: function () {
            CommonBotFunctions.listVocabsFn(Lineage_sources.activeSource, "currentVocab", true);
        },
        listActiveSourceVocabsFn: function () {
            self.params.currentVocab = self.params.source;
            self.params.allindividuals = true;
            self.params.individualsFilterRole = "subject";
            _botEngine.nextStep();
        },

        listClassesFn: function () {
            CommonBotFunctions.listVocabClasses(self.params.currentVocab, "currentClass", true, [{
                label: ".Any Class",
                id: "AnyClass"
            }]);
        },

        listPropertiesFn: function () {
            CommonBotFunctions.listVocabPropertiesFn(self.params.currentVocab, "currentProperty", [{
                label: ".Any property",
                id: "AnyProperty"
            }]);
        },

        listPredicatePathsFn: function () {
            var property = self.params.currentProperty;
            var fromClass = self.params.currentClass;
            var toClass = self.params.currentClass;

            self.getSourceInferredModelVisjsData(self.params.source + "_KGmodelGraph.json", function (err, visjsData) {
                if (err) {
                    console.log(err.responseText);
                    return _botEngine.nextStep("empty");
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
                    _botEngine.nextStep("empty");
                    return;
                }
                _botEngine.showList(paths, "path", "ok");
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
            _botEngine.promptValue("value contains ", "annotationValue");
        },

        switchToIndividualsBotFn: function () {
            OntologyModels.getKGnonObjectProperties(self.params.source, null, function (err, allProps) {
                var obj = {
                    label: Sparql_common.getLabelFromURI(self.params.currentClass),
                    id: self.params.currentClass,

                    source: self.params.source,
                    nonObjectProperties: allProps[self.params.currentClass].properties,
                };
                var currentFilterQuery = {
                    source: self.currentSource,
                    currentClass: self.params.currentClass,
                    varName: "x",
                };

                KGquery_filter_bot.start(obj, currentFilterQuery, function (err, result) {
                    var individualBotFilter = "?object <" + result.filterParams.property + "> ?x_" + result.filterParams.propertyLabel + ". " + result.filter;
                    var typeFilter = " ?subject rdf:type <" + self.params.currentClass + ">.";

                    var options = {
                        filter: individualBotFilter + typeFilter,
                        limit: self.searchLimit,
                        getFilteredTriples2: null,
                        OnlySubjects: false,
                        withImports: false,
                    };

                    Lineage_whiteboard.drawPredicatesGraph(Lineage_sources.activeSource, [], null, options);
                });
            });
        },

        listWhiteBoardFilterType: function () {
            var choices = [
                {id: "sourceNodes", label: "active Source "},
                {id: "allSources", label: "all referenced Sources "},
            ];
            if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                choices.push({id: "whiteboardNodes", label: "whiteboard nodes"});
            }
            if (Lineage_whiteboard.currentGraphNode) {
                choices.push({id: "selectedNode", label: "selectedNode"});
            }
            _botEngine.showList(choices, "whiteboardFilterType");
        },

        promptClassesSampleSizeFn: function () {
            self.params.sampleType = "owl:Class";
            _botEngine.promptValue("enter sample size", "sampleSize", 500);
        },
        promptIndividualsSampleSizeFn: function () {
            self.params.sampleType = "owl:NamedIndividual";
            _botEngine.promptValue("enter sample size", "sampleSize", 500);
        },
        promptPredicatesSampleSizeFn: function () {
            self.params.sampleType = "Predicates";
            _botEngine.promptValue("enter sample size", "sampleSize", 500);
        },
        setIndividualsTypeFilter: function () {
            self.params.allindividuals = true;
            _botEngine.nextStep();
        },

        drawRestrictions: function (inverse) {
            var options = {};
            var whiteboardFilterType = self.params.whiteboardFilterType;
            var nodeIds = null;
            if (whiteboardFilterType == "whiteboardNodes") {
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
            } else {
                options.allNodes = true;
            }
            if (self.params.currentProperty && self.params.currentProperty != "AnyProperty") {
                options.filter = Sparql_common.setFilter("prop", self.params.currentProperty);
            }
            if (self.params.currentClass && self.params.currentClass != "AnyClass") {
                options.filter = Sparql_common.setFilter(inverse ? "value" : "subject", self.params.currentClass);
            }
            if (inverse) {
                options.inverseRestriction = true;
            }
            Lineage_whiteboard.drawRestrictions(self.params.source, nodeIds, null, null, options, function (err, result) {
                if (err) {
                }
                _botEngine.nextStep();
            });
        },
        drawInverseRestrictions: function () {
            self.functions.drawRestrictions(true);
        },
        executeQuery: function () {
            var source = self.params.source;
            var currentClass = self.params.currentClass;
            var currentProperty = self.params.currentProperty;
            var path = self.params.path;
            var individualsFilterRole = self.params.individualsFilterRole;
            var individualsFilterType = self.params.individualsFilterType;
            var individualsFilterValue = self.params.individualsFilterValue;
            var allindividuals = self.params.allindividuals;
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
                        if (allindividuals) {
                            return "filter(?prop=rdf:type)" + Sparql_common.setFilter("object", currentClass, null, {useFilterKeyWord: 1});
                        }
                        filterPath = Sparql_common.setFilter("subject", currentClass, null, {useFilterKeyWord: 1});
                    } else {
                        withImports = false;
                        OnlySubjects = true;
                        filterPath = " ?subject rdf:type owl:Class. filter(!isBlank(?object))   filter (?prop=rdf:type)";
                    }
                    if (currentProperty && currentProperty != "AnyProperty") {
                        OnlySubjects = false;
                        filterPath = Sparql_common.setFilter("prop", currentProperty);
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
                var subjectClassFilter = Sparql_common.setFilter("subjectType", array[0], null, {useFilterKeyWord: 1});
                var objectClassFilter = Sparql_common.setFilter("objectType", array[2], null, {useFilterKeyWord: 1});
                return propFilter + " " + subjectClassFilter + " " + objectClassFilter;
            }

            function getIndividualsFilter() {
                var filter = "";

                if (self.params.individualBotFilter) {
                    return self.params.individualBotFilter;
                }

                if (!individualsFilterRole) {
                    return "";
                }
                if (individualsFilterType == "label") {
                    filter = Sparql_common.setFilter(individualsFilterRole, null, individualsFilterValue);
                } else if (individualsFilterType == "list") {
                    filter = Sparql_common.setFilter(individualsFilterRole, individualsFilterValue, null, {useFilterKeyWord: 1});
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
                    return _botEngine.reset();
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

            _botEngine.nextStep();
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
