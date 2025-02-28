import Lineage_sources from "../tools/lineage/lineage_sources.js";
import Lineage_whiteboard from "../tools/lineage/lineage_whiteboard.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import CommonBotFunctions from "./_commonBotFunctions.js";
import OntologyModels from "../shared/ontologyModels.js";
//importmysBotEngine from "./myBotEngine.js";
import botEngine from "./_botEngineClass.js";
import Export from "../shared/export.js";
import KGquery from "../tools/KGquery/KGquery.js";
import _commonBotFunctions from "./_commonBotFunctions.js";

var SparqlQuery_bot = (function () {
    var self = {};
    self.maxGraphDisplay = 150;

    var myBotEngine = new botEngine();
    self.start = function () {
        self.title = "Query graph";
        myBotEngine.init(SparqlQuery_bot, self.workflow, null, function () {
            self.params = { source: Lineage_sources.activeSource, labelsMap: {}, maxPredicates: 300 };

            myBotEngine.nextStep();
        });
    };

    self.workflow_filterClass = {
        listNonObjectPropertiesFn: {
            choosePropertyOperatorFn: {
                _OR: {
                    ChooseInList: { listIndividualsFn: { listLogicalOperatorFn: { setSparqlQueryFilterFn: {} } } },
                    _DEFAULT: {
                        promptPropertyValueFn: { listLogicalOperatorFn: { setSparqlQueryFilterFn: {} } },
                    },
                },
            },
        },
    };

    self.workflow = {
        chooseResourceTypeFn: {
            _OR: {
                Facts: {
                    chooseQueryScopeFn: {
                        chooseFactFilterTypeFn: {
                            listFactQueryFilterFn: {
                                addQueryFilterFn: {
                                    _OR: {
                                        Resume: {
                                            chooseOutputTypeFn: { showResultFn: {} },
                                        },

                                        "Filter values": {
                                            objectValueFilterFn: { chooseOutputTypeFn: { showResultFn: {} } },
                                        },
                                    },
                                },
                            },
                            //  },
                        },
                    },
                },
                Constraints: {
                    chooseConstraintRole: {
                        setPredicateFilterFn: {
                            chooseIndividualsOutputTypeFn: {
                                queryIndiviudalsFn: {},
                            },
                        },
                    },
                },
                /*   Class: {
                           chooseQueryScopeFn: {
                               promptKeywordFn: {
                                   chooseOutputTypeFn: {
                                       addQueryFilterFn: {},
                                   },
                               },
                           },
                       },*/
            },
        },
        sparqlQuery: {
            showSparqlEditorFn: {},
        },
        similars: {
            chooseQueryScopeFn: {},
        },
    };

    self.functionTitles = {
        chooseFactFilterTypeFn: "chooseFactFilterType",
        chooseConstraintRole: "chooseConstraintRole",
        listFactQueryFilterFn: "listFactQueryFilterFn",
        chooseQueryScopeFn: "choose query scope",
        moreFiltersFn: "moreFiltersFn",

        promptKeywordFn: "enter a keyword or enter for any ",
        addQueryFilterFn: "matching keywords",
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
        chooseResourceTypeFn: function () {
            var choices = ["Facts", "Contraints"];
            myBotEngine.showList(choices, "resourceType");
        },
        chooseFactFilterTypeFn: function () {
            var choices = ["Class", "ObjectProperty", "Value"];
            myBotEngine.showList(choices, "predicateFilterType");
        },

        chooseConstraintRole: function () {
            var choices = ["subCLassOfRestriction", "propertyOfRestriction", "targetClassOfRestriction", "objectPropertyConstraints", "classDomainOfProperty", "classRangeOfProperty"];
            myBotEngine.showList(choices, "axiomRole");
        },

        chooseQueryScopeFn: function () {
            var choices = [
                { id: "activeSource", label: "active source" },
                { id: "whiteboardSources", label: "current sources" },
            ];
            if (self.params.resourceType == "Class") {
                choices.push({ id: "", label: "all sources" });
            }
            /*if( Lineage_whiteboard.currentGraphNode)
                          choices.unshift () {id: "activeSource", label: "active source"})*/

            myBotEngine.showList(choices, "queryScope");
        },

        chooseOutputTypeFn: function () {
            var choices = ["New Graph", "Table", "CSV", "SPARQLquery"];
            if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                choices.splice(1, 0, "Add to Graph");
            }
            myBotEngine.showList(choices, "outputType");
        },

        showSparqlEditorFn: function () {
            MainController.onToolSelect("SPARQL");
            myBotEngine.end();
        },

        listFactQueryFilterFn: function () {
            var options = {};
            if (self.params.queryScope == "activeSource") {
                options.withoutImports = 1;
            }
            var predicateFilterType = self.params.predicateFilterType;
            if (predicateFilterType == "Class") {
                self.getResourcesList("Class", null, null, options, function (err, result) {
                    if (err) {
                        return alert(err.responseText || err);
                    }
                    var classes = [];
                    for (var key in result.labels) {
                        classes.push({ id: key, label: result.labels[key] });
                    }
                    common.array.sort(classes, "label");
                    classes.unshift({ id: "anyClass", label: "anyClass" });

                    myBotEngine.showList(classes, "currentClassFilter");
                });
            } else if (predicateFilterType == "ObjectProperty") {
                self.getResourcesList("ObjectProperty", null, null, {}, function (err, result) {
                    if (err) {
                        return alert(err.responseText || err);
                    }
                    var properties = [];
                    for (var key in result.labels) {
                        properties.push({ id: key, label: result.labels[key] });
                    }
                    common.array.sort(properties, "label");
                    properties.unshift({ id: "anyProperty", label: "anyProperty" });

                    myBotEngine.showList(properties, "currentObjectPropertyFilter");
                });
            } else if (predicateFilterType == "Value") {
                OntologyModels.getKGnonObjectProperties(self.params.source, { excludeBasicVocabularies: 1 }, function (err, model) {
                    if (err) {
                        alert(err.responseText || err);
                        return myBotEngine.end();
                    }

                    var classes = [];
                    for (var key in model) {
                        if (key.indexOf("http://www.w3.org/2002/07/owl") < 0 && key.indexOf("http://www.w3.org/1999/02/22-rdf-syntax-ns") < 0) {
                            var classLabel = model[key].label;

                            classes.push({
                                label: classLabel,
                                id: key,
                            });
                        }
                    }

                    common.array.sort(classes, "label");
                    myBotEngine.showList(classes, "currentClassFilter", null, null, function (currentClassId) {
                        self.params.data = { nonObjectProperties: model[currentClassId].properties };
                        self.params.varName = "V" + common.getRandomHexaId(3);

                        return self.workflow_filterClass.listPropertiesFn();

                        var varName = "V" + common.getRandomHexaId(3);
                        self.runFilterClassBot({ id: currentClassId, label: varName }, function (err, result) {
                            if (err) {
                                alert(err.responseText || err);
                                return myBotEngine.end();
                            }

                            var propertyId = KGquery_filter_bot.params.property;

                            var filter = "?subject rdf:type|rdfs:subClassOf <" + currentClassId + ">. ?subject <" + propertyId + "> " + varName + "." + result;

                            if (!self.params.currentFilter) self.params.currentFilter = "";
                            self.params.currentFilter += " " + filter;

                            myBotEngine.nextStep();
                        });
                    });
                });
            }
        },

        addQueryFilterFn: function () {
            var resourceType = self.params.resourceType;

            if (resourceType == "Facts") {
                var filter = null;
                if (self.params.currentObjectPropertyFilter && self.params.currentObjectPropertyFilter != "anyProperty") {
                    filter = Sparql_common.setFilter("predicate", self.params.currentObjectPropertyFilter);
                } else if (self.params.currentClassFilter && self.params.currentClassFilter != "anyClass") {
                    filter =
                        "  ?subject ?q <" +
                        self.params.currentClassFilter +
                        ">.\n" +
                        "} union{\n" +
                        "     ?subject ?predicate ?object.\n" +
                        "   ?object ?q <" +
                        self.params.currentClassFilter +
                        ">\n" +
                        "  ";
                }

                if (!self.params.currentFilter) {
                    self.params.currentFilter = "";
                }
                self.params.currentFilter += " " + filter;
                myBotEngine.nextStep();
            }
            if (resourceType == "Axioms") {
                self.processObjectPropertyQuery();
            }
        },

        moreFiltersFn: function () {
            self.functions.chooseFactFilterTypeFn();
        },

        objectValueFilterFn: function () {
            var currentClass = null;
            if (self.params.currentClassFilter) {
                currentClass = { id: self.params.currentClassFilter, label: "subject" };
            }
            self.runFilterClassBot(currentClass, function (err, filter) {
                if (err) {
                    alert(err.responseText || err);
                    myBotEngine.end();
                }

                filter =
                    "?subject ?q <" +
                    self.params.currentClassFilter +
                    ">.\n" +
                    " ?subject rdfs:label ?subjectLabel " +
                    filter +
                    "} union{\n" +
                    "     ?subject ?predicate ?object.\n" +
                    "   ?object ?q <" +
                    self.params.currentClassFilter +
                    ">.\n" +
                    " ?object rdfs:label ?objectLabel " +
                    filter.replace("subject", "object") +
                    "";

                self.params.currentFilter = filter;
                $("#botPanel").dialog("open");
                myBotEngine.nextStep();
            });
        },

        showResultFn: function () {
            var outputType = self.params.outputType;
            var searchedSources = self.params.queryScope;
            if (searchedSources == "activeSource") {
                searchedSources = [Lineage_sources.activeSource];
            } else if (searchedSources == "whiteboardSources") {
                searchedSources = Object.keys(Lineage_sources.loadedSources);
            } else {
                searchedSources = Config.currentProfile.userSources;
            }

            var options = {};
            if (self.params.outputType == "SPARQLquery") {
                options.returnSparql = 1;
            }
            self.getResourcesList("Predicate", null, self.params.currentFilter, options, function (err, result) {
                if (err) {
                    return alert(err.responseText || err);
                }

                if (self.params.outputType == "SPARQLquery") {
                    $("#" + myBotEngine.divId).dialog("close");
                    $("#smallDialogDiv").html(
                        "<div style='background-color:#ddd' >" +
                            "<textarea  id='sparqlQueryBot_textArea'" +
                            " style='width:800px;height:500px'></textarea></div>" +
                            "Output <select id='sparqlQueryBot_outputTypeSelect'><option></option></select>" +
                            "<button onclick='SparqlQuery_bot.functions.onValidateSparqlQuery()'>Execute</button>",
                    );
                    $("#smallDialogDiv").dialog("open");
                    $("#sparqlQueryBot_outputTypeSelect").css("z-index", 101);

                    var array = ["New Graph", "Add to Graph", "Table", "CSV"];
                    common.fillSelectOptions("sparqlQueryBot_outputTypeSelect", array);
                    $("#sparqlQueryBot_textArea").text(result);

                    return;
                }

                if (result.predicates.length > self.params.maxPredicates && outputType != "CSV") {
                    self.params.queryLimit = null;
                    if (confirm("too many items add additional filter?")) {
                        self.functions.chooseFactFilterTypeFn();
                        return;
                        //  returnmysBotEngine.backToStep("chooseFactFilterTypeFn")
                    } else {
                        if (!confirm("only " + self.params.maxPredicates + "items will be displayed")) {
                            return myBotEngine.end();
                        } else {
                            self.params.queryLimit = self.params.maxPredicates;
                        }
                    }
                }

                if (outputType == "New Graph") {
                    self.drawPredicateGraph(result, false, {});
                } else if (outputType == "Add to Graph") {
                    self.drawPredicateGraph(result, true, {});
                } else if (outputType == "Table") {
                    self.drawDataTableQueryResult(result);
                } else if (outputType == "CSV") {
                    self.exportResultToCSV(result);
                }
                myBotEngine.nextStep();
            });
        },

        onValidateSparqlQuery: function () {
            var sparql = $("#sparqlQueryBot_textArea").text();
            self.params.outputType = $("#sparqlQueryBot_outputTypeSelect").val();
            self.params.sparqlQuery = sparql;
            $("#smallDialogDiv").dialog("close");
            $("#" + myBotEngine.divId).dialog("open");
            self.functions.showResultFn();
        },

        listClassesFn: function () {
            self.getResourcesList(self.params.objectPropertyResourceType, "property", null, { withoutImports: 1 }, function (err, result) {
                if (err) {
                    return alert(err.responseText || err);
                }
                var properties = [];
                for (var key in result.labels) {
                    properties.push({ id: key, label: result.labels[key] });
                }
                common.array.sort(properties, "label");
                properties.unshift({ id: "anyClass", label: "anyClass" });
                myBotEngine.showList(properties, "currentObjectProperty");
            });
        },

        chooseObjectPropertyResourceTypeFn: function () {
            var choices = ["Predicate", "Restriction", "RangeAndDomain"]; //

            myBotEngine.showList(choices, "objectPropertyResourceType");
        },

        choosePredicateFilterFn: function () {
            var choices = ["filterObjectProperty", "filterDatatypeProperty", "filterSubject", "filterObject", "_proceed"];

            myBotEngine.showList(choices, "predicateFilterType");
        },
    };

    //     functions called in KGquery_filter_bot
    self.functions.listPropertiesFn = function () {
        KGquery_filter_bot.listPropertiesFn();
    };
    self.functions.choosePropertyOperatorFn = function () {
        KGquery_filter_bot.choosePropertyOperatorFn();
    };
    self.functions.ChooseInList = function () {
        KGquery_filter_bot.ChooseInList();
    };
    self.functions.listIndividualsFn = function () {
        KGquery_filter_bot.listIndividualsFn();
    };
    self.functions.listLogicalOperatorFn = function () {
        KGquery_filter_bot.listLogicalOperatorFn();
    };
    self.functions.setSparqlQueryFilterFn = function () {
        KGquery_filter_bot.setSparqlQueryFilterFn();
    };

    self.runFilterClassBot = function (currentClass, callback) {
        var filter = "";

        OntologyModels.getKGnonObjectProperties(self.params.source, { filter: filter }, function (err, model) {
            var currentFilterQuery = {
                currentClass: currentClass ? currentClass.id : "xxx",
                source: self.params.source,
                varName: currentClass ? currentClass.label : "xxx",
            };

            var nonObjectProperties = [];
            var uniqueProps = {};
            for (var key in model) {
                if (!uniqueProps[key]) {
                    uniqueProps[key] = 1;
                    nonObjectProperties.push(model[key]);
                }
            }

            var data = { nonObjectProperties: nonObjectProperties };
            if (currentClass) {
                data = { nonObjectProperties: model[currentClass.id].properties };
            }
            KGquery_filter_bot.start(data, currentFilterQuery, function (err, result) {
                return callback(err, result.filter.replace("_label", "Label"));
            });
        });
    };
    self.runFilfilterOtherProperties = function (currentClass, callback) {
        var filter = "";
        if (currentClass) {
            filter = "filter( ?s=<" + currentClass.id + ">)";
        }
        OntologyModels.getKGnonObjectProperties(self.params.source, { filter: filter }, function (err, model) {
            var currentFilterQuery = {
                currentClass: currentClass ? currentClass.id : "xxx",
                source: self.params.source,
                varName: currentClass ? currentClass.label : "xxx",
            };

            var nonObjectProperties = [];
            var uniqueProps = {};
            for (var key in model) {
                if (!uniqueProps[key]) {
                    uniqueProps[key] = 1;
                    nonObjectProperties.push(model[key]);
                }
            }

            var data = { nonObjectProperties: nonObjectProperties };
            if (currentClass) {
                data = { nonObjectProperties: model[currentClass.id] };
            }
            KGquery_filter_bot.start(data, currentFilterQuery, function (err, result) {
                return callback(err, result.filter.replace("_label", "Label"));
            });
        });
    };

    /**
     *
     * type :
     * selectVars Sparql vars to select distinct ?subject ?predicate ?object
     *
     */
    (self.getResourcesList = function (type, role, filter, options, callback) {
        if (!options) {
            options = {};
        }
        var sparql_url = Config.sources[self.params.source].sparql_server.url;
        var fromStr = Sparql_common.getFromStr(self.params.source, null, options.withoutImports);
        var query = "";
        if (self.params.sparqlQuery) {
            query = self.params.sparqlQuery;
        } else {
            var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#>" + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" + "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>";

            var selectVars = " ?subject ?predicate ?object ";

            if (type == "Class") {
                query += "SELECT distinct  ?subject " + fromStr + " WHERE {{" + "?subject rdf:type owl:Class. " + "filter (exists{?subject ?p ?o} || exists{?s ?p ?subject })";
            } else if (type == "ObjectProperty") {
                query += "SELECT distinct  ?predicate " + fromStr + " WHERE {{" + "?predicate rdf:type owl:ObjectProperty. " + "filter (exists{?subject ?predicate ?o})";
            } else if (type == "Restriction") {
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
                    "SELECT distinct   " + selectVars + fromStr + " WHERE {{   ?subject rdfs:subClassOf ?b.\n" + "  ?b owl:onProperty ?predicate .\n" + "  ?b ?q ?object .?object rdf:type owl:Class\n";
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
                    " WHERE {{   ?predicate rdf:type owl:ObjectProperty.\n" +
                    "  OPTIONAL {?predicate rdfs:domain ?subject} .\n" +
                    "  OPTIONAL {?predicate rdfs:object ?object} .\n";
            } else if (type == "Predicate") {
                if (role == "predicate") {
                    selectVars = "?predicate";
                }
                if (role == "subject") {
                    selectVars = "?subjectClass";
                }
                if (role == "object") {
                    selectVars = "?objectClass";
                }
                query += "SELECT distinct   " + selectVars + fromStr + " WHERE {{  ?subject ?predicate ?object.\n";
            }

            if (filter) {
                query += filter;
            }
            if (options.objectValueFilter) {
                query += options.objectValueFilter;
            }
            query += "}";

            var limit = self.params.queryLimit || 10000;
            query += "} limit " + limit;

            UI.message("");

            if (options.returnSparql) {
                return callback(null, query);
            }
        }
        Sparql_proxy.querySPARQL_GET_proxy(sparql_url, query, null, null, function (err, result) {
            if (err) {
                return callback(err);
            }

            var predicates = [];
            var labelsMap = {};

            if (result.results.bindings.length == 0) {
                return callback("no result");
            }

            UI.message(result.results.bindings.length + " items found");

            result.results.bindings.forEach(function (item) {
                var obj = {};
                for (var key in item) {
                    obj[key] = item[key].value;
                    if (!labelsMap[item[key].value]) {
                        if (item[key].type == "uri" && !item[key].value.startsWith("_:b")) {
                            labelsMap[item[key].value] = "";
                        }

                        predicates.push(obj);
                    }
                }
            });

            var slices = common.array.slice(Object.keys(labelsMap), 50);

            var allLabels = {};
            async.eachSeries(
                slices,
                function (slice, callbackEach) {
                    self.fillLabelsFromUris(slice, function (err, result) {
                        if (err) {
                            return callbackEach(err);
                        }
                        for (var key in result) {
                            allLabels[key] = result[key];
                        }
                        return callbackEach();
                    });
                },
                function (err) {
                    return callback(null, { predicates: predicates, labels: allLabels });
                },
            );
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

    /**
     *
     * @param queryResult
     * @param addTograph
     * @param options
     * @param callback
     */
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
        var drawOnlySubject = false; //queryResult.predicates.length>500

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

            if (item.object && !drawOnlySubject) {
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

            var id = item.subject + item.predicate + item.object;
            if (!existingNodes[id] && !drawOnlySubject) {
                visjsData.edges.push({
                    id: common.getRandomHexaId(10),
                    label: labelsMap[item.predicate],
                    from: item.subject,
                    to: item.object,
                    data: {
                        id: item.predicate,
                        label: labelsMap[item.predicate],
                        source: self.params.source,
                    },
                    arrows: "to",
                });
            }
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
        var existingNodes = {};
        queryResult.predicates.forEach(function (item) {
            var id = item.subject + item.predicate + item.object;
            if (!existingNodes[id]) {
                existingNodes[id] = 1;

                dataset.push([labelsMap[item.subject], labelsMap[item.predicate], labelsMap[item.object], item.subject, item.predicate, item.object]);
            }
        });
    };

    self.exportResultToCSV = function (queryResult, callbacl) {
        var str = "";
        var sep = ";";
        str += "subject" + sep + "predicate" + sep + "object" + sep + "subjectURI" + sep + "predicateURI" + sep + "objectURI" + "\n";

        var labelsMap = queryResult.labels;
        var existingNodes = {};
        queryResult.predicates.forEach(function (item) {
            var id = item.subject + item.predicate + item.object;
            if (!existingNodes[id]) {
                existingNodes[id] = 1;

                str += labelsMap[item.subject] + sep;
                str += labelsMap[item.predicate] + sep;
                str += labelsMap[item.object] + sep;
                str += item.subject + sep;
                str += item.predicate + sep;
                str += item.object + "\n";
            }
        });
        download(str, "SLS_QueryExport.csv", "text/csv");
    };

    return self;
})();

export default SparqlQuery_bot;
window.SparqlQuery_bot = SparqlQuery_bot;
