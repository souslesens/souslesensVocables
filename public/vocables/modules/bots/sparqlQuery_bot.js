import Lineage_sources from "../tools/lineage/lineage_sources.js";
import Lineage_whiteboard from "../tools/lineage/lineage_whiteboard.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import CommonBotFunctions from "./_commonBotFunctions.js";
import OntologyModels from "../shared/ontologyModels.js";
import NonObjectPropertyFilterWorklow from "./_nonObjectPropertyFilterWorklow.js";
//importmysBotEngine from "./myBotEngine.js";
import botEngine from "./_botEngineClass.js";
import Export from "../shared/export.js";
import KGquery from "../tools/KGquery/KGquery.js";
import _commonBotFunctions from "./_commonBotFunctions.js";
import _botEngine from "./_botEngine.js";
import VisjsGraphClass from "../graph/VisjsGraphClass.js";
import KGquery_graph from "../tools/KGquery/KGquery_graph.js";
import UserDataWidget from "../uiWidgets/userDataWidget.js";

var SparqlQuery_bot = (function () {
    var self = {};
    self.maxGraphDisplay = 150;

    var myBotEngine = _botEngine; // new botEngine();

    self.start = function (options) {
        self.title = "Query graph";

        myBotEngine.init(SparqlQuery_bot, self.workflow, options, function () {
            self.params = {
                source: Lineage_sources.activeSource,
                labelsMap: {},
                maxPredicates: 1500,
                currentClass: "",
                currentFilter: "",
            };
            myBotEngine.nextStep();
        });
    };

    self.workflow = {
        chooseResourceTypeFn: {
            _OR: {
                Facts: {
                    afterChooseQueryType: {
                        chooseQueryScopeFn: {
                            _OR: {
                                whiteboardNodes: {
                                    listWhiteboardNodesObectProperties: {
                                        buildResultFn: {},
                                    },
                                },

                                _DEFAULT: {
                                    chooseFactFilterTypeFn: {
                                        _OR: {
                                            Class: {
                                                listClassesFn: {
                                                    setNonObjectPropertiesFilter: {
                                                        listObjectPropertiesFn: {
                                                            chooseOutputTypeFn: {
                                                                buildResultFn: {
                                                                    _OR: {
                                                                        addPredicateToGraph: {
                                                                            listWhiteboardNodesObectProperties: {
                                                                                buildResultFn: {},
                                                                            },
                                                                        },
                                                                        _DEFAULT: {},
                                                                    },
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                            },

                                            ObjectProperty: {
                                                listObjectPropertiesFn: {
                                                    chooseObjectPropertyClass: {
                                                        setNonObjectPropertiesFilter: {
                                                            chooseOutputTypeFn: {
                                                                buildResultFn: {},
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                Constraints: {
                    chooseConstraintRoleFn: {
                        _OR: {
                            Class: {
                                chooseConstraintClassFn: {
                                    chooseConstraintTypeFn: {
                                        chooseOutputTypeFn: {
                                            buildConstraintResult: {},
                                        },
                                    },
                                },
                            },
                            ObjectProperty: {
                                chooseConstraintPropertyFn: {
                                    chooseConstraintTypeFn: {
                                        chooseOutputTypeFn: {
                                            buildConstraintResult: {},
                                        },
                                    },
                                },
                            },
                            "Whiteboard nodes": {
                                chooseConstraintTypeFn: {
                                    chooseOutputTypeFn: {
                                        buildConstraintResult: {},
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    };

    self.functionTitles = {
        chooseFactFilterTypeFn: "chooseFactFilterType",
        chooseConstraintRoleFn: "chooseConstraintRoleFn",
        listObjectPropertiesFn: "listObjectPropertiesFn",
        chooseQueryScopeFn: "choose query scope",
        chooseObjectPropertyClass: "chooseObjectPropertyClass",

        promptKeywordFn: "enter a keyword or enter for any ",

        chooseResourceTypeFn: "choose resource type",
        chooseOutputTypeFn: "choose outup type",

        chooseConstraintTypeFn: "chooseConstraintTypeFn",

        listWhiteboardNodesObectProperties: "choose an objectProperty",

        listClassesFn: "Choose a  a class ",
        listPropertiesFn: "Choose a property",
        listAnnotationPropertiesVocabsFn: "Choose a reference ontology",
        listAnnotationPropertiesFn: "Choose a property",
        promptAnnotationPropertyValue: "Filter value ",
        listWhiteBoardFilterType: "Choose a scope",
        listQueryTypeFn: "Choose a query type ",
        chooseSelectPredicates: "choose Select Predicates",
    };

    self.functions = {
        chooseResourceTypeFn: function () {
            var choices = [
                {
                    id: "Facts",
                    label: "SKG Facts",
                },
                { id: "Constraints", label: "Ontology onstraints" },
            ];
            if (self.noFacts) {
                choices = ["Constraints"];
            }

            myBotEngine.showList(choices, "resourceType");
        },
        afterChooseQueryType: function () {
            if (self.params.resourceType == "Facts") {
                self.loadImplicitModel(Lineage_sources.activeSource, false, function (err, result) {
                    if (err) {
                        myBotEngine.message("No  implicitModel available: probably no NamedIndividuals with type and/or ObjectProperty predicates");
                        self.noFacts = true;
                        myBotEngine.reset();
                    } else {
                        myBotEngine.message("");
                        self.implicitModel = result;
                        myBotEngine.nextStep();
                    }
                });
            } else {
                myBotEngine.nextStep();
            }
        },

        chooseQueryScopeFn: function () {
            var choices = [
                { id: "activeSource", label: "active source" },
                //{id: "whiteboardSources", label: "all loaded sources"},
            ];

            if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                choices.push({ id: "whiteboardNodes", label: "whiteboard content" });
                myBotEngine.showList(choices, "queryScope");
            } else {
                self.params.queryScope = "activeSource";
                //myBotEngine.deleteLastMessages();
                return myBotEngine.nextStep("activeSource");
            }
        },

        chooseFactFilterTypeFn: function () {
            var choices = ["Class", "ObjectProperty"];
            myBotEngine.showList(choices, "predicateFilterType");
        },

        chooseOutputTypeFn: function () {
            var choices = ["New Graph", "Table", "CSV", "SPARQLquery"];

            if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                choices.splice(1, 0, "Add to Graph");
            }
            myBotEngine.showList(choices, "outputType");
        },

        listClassesFn: function () {
            var options = {};
            if (self.params.queryScope == "activeSource") {
                options.withoutImports = true;
            }
            var classes = [];
            self.implicitModel.nodes.forEach(function (item) {
                classes.push({ id: item.id, label: item.label });
            });

            common.array.sort(classes, "label");
            myBotEngine.showList(classes, "currentClass");
        },

        listWhiteboardNodesObectProperties: function () {
            var nodeIds = Lineage_whiteboard.lineageVisjsGraph.data.nodes.getIds();

            self.params.whiteboardNodes = nodeIds;
            Sparql_OWL.getIndividualsType(self.params.source, nodeIds, null, function (err, result) {
                if (err) {
                    alert(err.responseText || err);
                    return myBotEngine.end();
                }
                self.params.currentClass = null;
                self.params.addToGraph = 1;

                var allClasses = {};
                result.forEach(function (item) {
                    if (!allClasses[item.type.value]) {
                        allClasses[item.type.value] = 1;
                    }
                });

                var properties = self.filterObjectProperties(Object.keys(allClasses), null);

                myBotEngine.showList(properties, "currentObjectProperty");
            });
        },

        listObjectPropertiesFn: function () {
            var options = {};
            if (self.params.queryScope == "activeSource") {
                options.withoutImports = 1;
            }
            var filter = "";
            var properties = self.filterObjectProperties(self.params.currentClass, null);
            common.array.sort(properties, "label");

            properties.unshift({ id: "any", label: "any" });
            myBotEngine.showList(properties, "currentObjectProperty");
        },
        setNonObjectPropertiesFilter: function () {
            if (!self.params.currentClass) {
                return myBotEngine.nextStep();
            }

            var nonObjectPropertyFilterWorklow = new NonObjectPropertyFilterWorklow(self.implicitModel, self.params, myBotEngine);
            nonObjectPropertyFilterWorklow.listNonObjectPropertiesFn(function (err, filter) {
                if (err) {
                    alert(err.responseText || err);
                    return myBotEngine.previousStep();
                }
                self.params.nonObjectPropertyFilter = filter;
                return myBotEngine.nextStep();
            });
        },

        onValidateSparqlQuery: function () {
            var sparql = $("#sparqlQueryBot_textArea").val();
            self.params.outputType = $("#sparqlQueryBot_outputTypeSelect").val();
            self.params.sparqlQuery = sparql;
            $("#smallDialogDiv").dialog("close");
            // $("#" + myBotEngine.divId).dialog("open");
            self.functions.buildResultFn();
        },

        chooseObjectPropertyClass: function () {
            var choices = ["all predicate"];
            var uniqueItems = {};
            if (self.params.objectProperties) {
                self.params.objectProperties.forEach(function (item) {
                    var obj = JSON.parse(item);
                    if (!uniqueItems[obj.subject]) {
                        uniqueItems[obj.subject] = 1;
                    }
                });

                var choices = ["Predicate", "Restriction", "RangeAndDomain"]; //
            }

            myBotEngine.showList(choices, "objectPropertyResourceType");
        },

        /* choose predicates to graph or list based on objectProperties where curerntClass isSubject
         *
         */
        chooseBindingPredicatesFn: function () {
            if (!self.params.currentClass) {
                alert(" missing currentClass");
                return myBotEngine.previousStep();
            }

            var filter = "";
            if (self.params.ObjectProperty) {
                var filter = "filter (?predicate =<" + self.params.currentObjectProperty + ">)";
            }
            self.getResourcesList("Predicate", "predicate", filter, {}, function (err, result) {
                if (err) {
                    alert(err.responseText || err);
                    return myBotEngine.previousStep();
                }

                var jstreeData = [];
                result.predicates.forEach(function (item) {
                    jstreeData.push({
                        id: item.predicate,
                        text: result.labels[item.predicate],
                        parent: "#",
                    });
                });
                $("#smallDialogDiv").html(
                    "<div id='sparqlQueryBot_bindingPredJstree'style='width:300px;height:500px;overflow: auto;z-index:200'></div>" +
                        "<button onclick='SparqlQuery_bot.functions.afterChooseBindingPredicates()'>OK</button>",
                );
                $("#botPanel").css("display", "none");
                $("#smallDialogDiv").dialog("open");
                var options = { openAll: true, withCheckboxes: true };
                JstreeWidget.loadJsTree("sparqlQueryBot_bindingPredJstree", jstreeData, options);
            });
        },
        afterChooseBindingPredicates: function () {
            var checkedProps = $("#sparqlQueryBot_bindingPredJstree").jstree().get_checked();
            $("#smallDialogDiv").dialog("close");
            $("#botPanel").css("display", "block");
            if (checkedProps.length > 0) {
                self.params.currentFilter += Sparql_common.setFilter("predicate", checkedProps);
            } else {
                // self.params.currentFilter += "filter(?predicate rdf:type ?type)"
                self.params.drawOnlySubject = 1;
            }
            myBotEngine.nextStep();
        },

        buildResultFn: function () {
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
            var role = null;
            var filter = "";
            if (self.params.whiteboardNodes) {
                var filterSubject = Sparql_common.setFilter("subject", self.params.whiteboardNodes);

                var filterObject = Sparql_common.setFilter("object", self.params.whiteboardNodes);
                filter += filterSubject.substring(0, filterSubject.length - 1) + " || " + filterObject.replace("FILTER(", "");
            }

            if (self.params.currentObjectProperty && self.params.currentObjectProperty != "any") {
                var propObj = JSON.parse(self.params.currentObjectProperty);
                role = null;
                myBotEngine.message("filter property " + propObj.predicate);
                // options.getType = 1
                filter +=
                    "  ?subject rdf:type ?subjectType.\n" +
                    "    ?object rdf:type ?objectType." +
                    "FILTER (?predicate =<" +
                    propObj.predicate +
                    ">" +
                    " && ?subjectType =<" +
                    propObj.subject +
                    ">" +
                    " && ?objectType =<" +
                    propObj.object +
                    ">" +
                    ")  ";
            } else {
                if (self.params.currentClass) {
                    role = "subject";
                    filter += "?subject rdf:type <" + self.params.currentClass + ">.";
                }
            }
            if (self.params.nonObjectPropertyFilter) {
                filter += self.params.nonObjectPropertyFilter;
            }

            // at first call count result
            /*  if(!options.count)
                      options.count=true*/

            self.getResourcesList("Predicate", role, filter, options, function (err, result) {
                if (err) {
                    alert(err.responseText || err);
                    return myBotEngine.previousStep();
                }

                /*   if(options.count){
                           myBotEngine.message("predicates found "+result.predicates.length)
                           options.count=false
                         return   self.functions.buildResultFn()
                       }*/

                if (self.params.sparqlQuery) {
                    self.params.queryResult = result;
                    return self.functions.showResultFn();
                }

                self.params.queryResult = result;
                if (self.params.outputType == "SPARQLquery") {
                    return self.editSparql();
                } else if (result.predicates.length >= self.params.maxPredicates && outputType != "CSV") {
                    self.params.queryLimit = null;

                    myBotEngine.message(" too many predicates :display truncated at" + result.predicates.length);

                    var choices = [
                        // {id: "REFINE_QUERY", label: "Refine query"},
                        // {id: "TRUNCATE_RESULT", label: "Truncate query"},
                        { id: "EDIT_SPARQL", label: "Edit query" },
                        { id: "ABORT", label: "Abort" },
                    ];

                    myBotEngine.showList(choices, null, null, false, function (action) {
                        if (action == "TRUNCATE_RESULT") {
                            self.functions.truncateQueryFn();
                        } else if (action == "EDIT_SPARQL") {
                            return self.editSparql();
                        } else if (action == "ABORT") {
                            myBotEngine.end();
                        }
                    });
                } else {
                    self.functions.showResultFn();
                }
            });
        },

        chooseConstraintRoleFn: function () {
            //  var choices = ["subCLassOfRestriction", "propertyOfRestriction", "targetClassOfRestriction", "objectPropertyConstraints", "classDomainOfProperty", "classRangeOfProperty"];
            var choices = ["Class", "ObjectProperty"];
            if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                choices.splice(0, 0, "Whiteboard nodes");
            }
            myBotEngine.showList(choices, "constraintObject");
        },

        chooseConstraintClassFn: function () {
            self.getResourcesList("Class", "subject", null, { withoutImports: 1 }, function (err, result) {
                if (err) {
                    alert(err.responseText || err);
                    return myBotEngine.previousStep();
                }

                var choices = [];
                result.predicates.forEach(function (item) {
                    choices.push({
                        id: item.subject,
                        label: result.labels[item.subject],
                    });
                });
                common.array.sort(choices, "label");
                choices.unshift({ id: "any", label: "any" });
                myBotEngine.showList(choices, "constraintClass");
            });
        },
        chooseConstraintPropertyFn: function () {
            var filter = "  ?subject rdf:type owl:ObjectProperty   filter( ?predicate=rdf:type)";
            self.getResourcesList("Predicate", "subject", filter, { withoutImports: 0 }, function (err, result) {
                if (err) {
                    alert(err.responseText || err);
                    return myBotEngine.previousStep();
                }

                var choices = [];
                result.predicates.forEach(function (item) {
                    choices.push({
                        id: item.subject,
                        label: result.labels[item.subject],
                    });
                });

                common.array.sort(choices, "label");
                choices.unshift({ id: "any", label: "any" });
                myBotEngine.showList(choices, "constraintObjectProperty");
            });
        },
        chooseConstraintTypeFn: function () {
            var choices = [" subClassOfRestriction", " targetClassRestriction", " domain", "range"];
            if (self.params.constraintClass) {
                choices.push("subClassOf");
                choices.push("equivalentClass");
            }

            myBotEngine.showList(choices, "constraintType");
        },

        buildConstraintResult: function () {
            var filter = "";

            var constraintType = self.params.constraintType;
            if (constraintType.indexOf("Restriction") > -1) {
                if (self.params.constraintObject == "Whiteboard nodes") {
                    var nodeIds = Lineage_whiteboard.lineageVisjsGraph.data.nodes.getIds();
                    if (constraintType == " subClassOfRestriction") {
                        filter = Sparql_common.setFilter("subject", nodeIds);
                    } else {
                        filter = Sparql_common.setFilter("object", nodeIds);
                    }
                } else if (self.params.constraintClass && self.params.constraintClass != "any") {
                    if (constraintType == " subClassOfRestriction") {
                        filter = "FILTER (?subject=<" + self.params.constraintClass + "> )";
                    } else {
                        filter = "FILTER (?object=<" + self.params.constraintClass + "> )";
                    }
                }
                self.getResourcesList("Restriction", null, filter, { withoutImports: 0 }, function (err, result) {
                    if (err) {
                        alert(err.responseText || err);
                        return myBotEngine.previousStep();
                    }

                    self.params.queryResult = result;
                    return self.functions.showResultFn();
                });
            } else {
                if (self.params.constraintObject == "Whiteboard nodes") {
                    var nodeIds = Lineage_whiteboard.lineageVisjsGraph.data.nodes.getIds();
                    filter += Sparql_common.setFilter("subject", nodeIds);
                } else if (self.params.constraintClass && self.params.constraintClass != "any") {
                    filter += "FILTER (?subject=<" + self.params.constraintClass + "> )"; //|| ?object=<" + self.params.constraintClass + ">)"
                } else if (self.params.constraintObjectProperty && self.params.constraintObjectProperty != "any") {
                    filter += "FILTER (?predicate=<" + self.params.constraintObjectProperty + ">)";
                }

                var map = {
                    " domain": "rdfs:domain",
                    range: "rdfs:range",
                    subClassOf: "owl:subClassOf",
                    equivalentClass: "owl:equivalentClassOf",
                };
                filter += "FILTER (?predicate=" + map[constraintType] + ")";
                self.getResourcesList("Predicate", null, filter, { withoutImports: 0 }, function (err, result) {
                    if (err) {
                        alert(err.responseText || err);
                        return myBotEngine.previousStep();
                    }

                    self.params.queryResult = result;
                    return self.functions.showResultFn();
                });
            }
        },

        truncateQueryFn: function () {
            self.params.queryLimit = self.params.maxPredicates;
            self.params.queryResult.predicates = self.params.queryResult.predicates.slice(0, self.params.maxPredicates);
            self.functions.showResultFn();
        },

        showResultFn: function () {
            var outputType = self.params.outputType;
            var result = self.params.queryResult;

            if (outputType == "New Graph") {
                self.drawPredicateGraph(result, false, {});
            } else if (outputType == "Add to Graph" || self.params.addToGraph) {
                self.drawPredicateGraph(result, true, {});
            } else if (outputType == "Table") {
                self.drawDataTableQueryResult(result);
            } else if (outputType == "CSV") {
                self.exportResultToCSV(result);
            }
            myBotEngine.nextStep();
        },
    };

    /**
     *
     * type :Class or ObjectProperty or RangeAndDomain  role Predicate
     * role:subject predicate  object range domain
     * selectVars Sparql vars to select distinct ?subject ?predicate ?object
     *
     */
    self.getResourcesList = function (type, role, filter, options, callback) {
        if (!options) {
            options = {};
        }
        var sparql_url = Config.sources[self.params.source].sparql_server.url;
        var fromStr = Sparql_common.getFromStr(self.params.source, null, options.withoutImports);
        var query = "";
        if (self.params.sparqlQuery) {
            query = self.params.sparqlQuery;
        } else {
            var query =
                "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
                "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>";
            var selectVars = " ?subject ?predicate ?object ";

            if (type == "Class") {
                query += "SELECT distinct  ?subject " + fromStr + " WHERE {{" + "?subject rdf:type owl:Class. " + "filter (exists{?subject ?p ?o} || exists{?s ?p ?subject })";
            } else if (type == "ObjectProperty") {
                query +=
                    "SELECT distinct  " +
                    selectVars +
                    fromStr +
                    " WHERE {{" +
                    "?predicate rdf:type owl:ObjectProperty. ?s ?predicate ?o." +
                    "   ?s ?predicate ?o. ?s rdf:type ?subject." +
                    "    ?o rdf:type ?object. filter (?subject !=owl:NamedIndividual && ?object !=owl:NamedIndividual)";
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
                    selectVars = "?predicate ";
                }
                if (role == "subject") {
                    selectVars = "?subject ";
                }
                if (role == "object") {
                    selectVars = "?object ";
                }
                if (options.getType) {
                    selectVars += " ?subjectType ?objectType ";
                }
                if (options.count) {
                    selectVars = " count(*) ";
                }
                query += "SELECT distinct   " + selectVars + fromStr + " WHERE {{  ?subject ?predicate ?object.\n";
            }

            if (filter) {
                query += filter;
            }
            if (options.getType) {
                query += "OPTIONAL {?subject rdf:type ?subjectType} OPTIONAL {?object rdf:type ?objectType}";
            }
            query += "}";

            // var limit = self.params.queryLimit || 10000;
            var limit = self.params.outputType == "CSV" ? 10000 : self.params.maxPredicates;

            query += "} limit " + limit;

            UI.message("");
            self.params.currentSparql = query;
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
                alert("no result");
                return self.editSparql();
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
                    }
                }
                predicates.push(obj);
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
    };
    self.fillLabelsFromUris = function (uris, callback) {
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
    };

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
        var drawOnlySubject = self.params.drawOnlySubject;

        var shape = "dot";
        if (self.params.resourceType == "Facts") {
            shape = "triangle";
        }
        queryResult.predicates.forEach(function (item) {
            if (item.subject) {
                if (!existingNodes[item.subject]) {
                    existingNodes[item.subject] = 1;
                    visjsData.nodes.push({
                        id: item.subject,
                        label: labelsMap[item.subject],
                        shape: shape,
                        color: "#096eac",
                        size: Lineage_whiteboard.defaultShapeSize,
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
                        shape: shape,
                        color: "#a8da83",
                        size: Lineage_whiteboard.defaultShapeSize,
                        data: {
                            id: item.object,
                            label: labelsMap[item.object],
                            source: self.params.source,
                        },
                    });
                }
            }
            if (item.subject && item.object) {
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
            }
        });

        if (addTograph) {
            Lineage_whiteboard.lineageVisjsGraph.data.nodes.add(visjsData.nodes);
            Lineage_whiteboard.lineageVisjsGraph.data.edges.add(visjsData.edges);
        } else {
            Lineage_whiteboard.drawNewGraph(visjsData, null, { skipDrawLegend: 1 });
        }

        myBotEngine.reset();
        var choices = [
            { id: "end", label: "end" },
            { id: "addPredicateToGraph", label: "add predicate to graph" },
        ];
        myBotEngine.showList(choices);
        /*  myBotEngine.showList(choices, null, null, null, function (value) {
                  if (value == "end") {
                      return myBotEngine.end();
                  } else {
                      self.functions.listWhiteboardNodesObectProperties();
                  }
              })*/

        if (callback) {
            callback();
        }
    };

    self.drawDataTableQueryResult = function (queryResult) {
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

        Export.showDataTable("mainDailogDiv", cols, dataset);
    };

    self.exportResultToCSV = function (queryResult) {
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
        myBotEngine.message("CSV export done in download dir");
    };

    self.editSparql = function () {
        // $("#" + myBotEngine.divId).dialog("close");
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
        $("#sparqlQueryBot_textArea").text(self.params.currentSparql);
    };

    self.loadImplicitModel = function (source, reload, callback) {
        if (self.implicitModel) {
            return callback(null, self.implicitModel);
        }
        myBotEngine.message("loading graph implicitModel...");

        var visjsData = null;
        var save = false;
        var KGqueryGraph = new VisjsGraphClass("KGquery_graphDiv", { nodes: [], edges: [] }, {});
        async.series(
            [
                //saved visjgraphData
                function (callbackSeries) {
                    if (reload) {
                        return callbackSeries();
                    }

                    var visjsGraphFileName = source + "_KGmodelGraph.json";
                    var label = source + "_model";
                    UserDataWidget.getUserdatabyLabel(label, function (err, result) {
                        if (err || !result) {
                            return callbackSeries();
                        }
                        visjsData = result.data_content;
                        return callbackSeries();
                    });
                },
                function (callbackSeries) {
                    if (visjsData) {
                        return callbackSeries();
                    }
                    KGquery_graph.getImplicitModelVisjsData(source, function (err, result2) {
                        if (err) {
                            return callbackSeries(err);
                        } else if (!result2 || result2.nodes.length == 0) {
                            return callbackSeries("emptyModel");
                        } else {
                            visjsData = result2;
                            save = true;
                            return callbackSeries();
                        }
                    });
                },
                function (callbackSeries) {
                    if (!save) {
                        return callbackSeries();
                    }

                    var label = source + "_model";
                    var group = "KGquery/models";
                    /*  var fileName = KGquery.currentSource + "_KGmodelGraph.json";
                      KGqueryGraph.saveGraph(fileName, true);
                      return;*/

                    UserDataWidget.saveMetadata(label, null, visjsData, group, function (err, result) {
                        return callbackSeries();
                    });
                },
                function (callbackSeries) {
                    if (visjsData.labelsMap) {
                        return callbackSeries();
                    }
                    var labelsMap = {};
                    visjsData.nodes.forEach(function (item) {
                        labelsMap[item.id] = item.label;
                    });
                    visjsData.edges.forEach(function (item) {
                        labelsMap[item.id] = item.label;
                    });
                    visjsData.labelsMap = labelsMap;
                    return callbackSeries();
                },
            ],
            function (err) {
                return callback(err, visjsData);
            },
        );
    };

    self.filterObjectProperties = function (subjectClasses, objectClasses) {
        var filteredProperties = [];
        self.implicitModel.edges.forEach(function (edge) {
            if (!subjectClasses || subjectClasses.indexOf(edge.from) > -1 || (!objectClasses && subjectClasses.indexOf(edge.to) > -1)) {
                if (!objectClasses || objectClasses.indexOf(edge.to) > -1) {
                    var obj = {
                        subject: edge.from,
                        predicate: edge.data.propertyId,
                        object: edge.to,
                    };
                    filteredProperties.push({
                        id: JSON.stringify(obj),
                        label: self.implicitModel.labelsMap[edge.from] + "-" + self.implicitModel.labelsMap[edge.id] + "->" + self.implicitModel.labelsMap[edge.to],
                    });
                }
            }
        });
        return filteredProperties;
    };

    return self;
})();

export default SparqlQuery_bot;
window.SparqlQuery_bot = SparqlQuery_bot;
