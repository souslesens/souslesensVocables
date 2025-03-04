import Lineage_sources from "../tools/lineage/lineage_sources.js";
import Lineage_whiteboard from "../tools/lineage/lineage_whiteboard.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import CommonBotFunctions from "./_commonBotFunctions.js";
import OntologyModels from "../shared/ontologyModels.js";
import NonObjectPropertyFilterWorklow  from "./_nonObjectPropertyFilterWorklow.js";
//importmysBotEngine from "./myBotEngine.js";
import botEngine from "./_botEngineClass.js";
import Export from "../shared/export.js";
import KGquery from "../tools/KGquery/KGquery.js";
import _commonBotFunctions from "./_commonBotFunctions.js";
import _botEngine from "./_botEngine.js";


var SparqlQuery_bot = (function () {
    var self = {};
    self.maxGraphDisplay = 150;

    var myBotEngine = _botEngine;// new botEngine();

    self.start = function (options) {
        self.title = "Query graph";
        myBotEngine.init(SparqlQuery_bot, self.workflow, options, function () {
            self.params = {
                source: Lineage_sources.activeSource,
                labelsMap: {},
                maxPredicates: 500,
                currentClass: "",
                currentFilter: ""
            };

            myBotEngine.nextStep();
        });
    };

    self.nonObjectPropertiesWorkflow= {
        listNonObjectPropertiesFn: {
            choosePropertyOperatorFn: {
                _OR: {
                    ChooseInList: {
                        listIndividualsFn: {
                            listLogicalOperatorFn: {
                                setSparqlQueryFilterFn: {
                                    chooseBindingPredicatesFn: {
                                        chooseOutputTypeFn: {
                                            buildResultFn: {}
                                        }
                                    }
                                }
                            }
                        }
                    },
                    _DEFAULT: {
                        promptPropertyValueFn: {
                            listLogicalOperatorFn: {
                                setSparqlQueryFilterFn: {
                                    chooseOutputTypeFn: {
                                        chooseBindingPredicatesFn: {
                                            buildResultFn: {}
                                        }
                                    }
                                }
                            }
                        },
                    },
                },
            },
        }
    }



    self.workflow = {
        chooseResourceTypeFn: {
            _OR: {
                Facts: {
                    chooseQueryScopeFn: {
                        _OR: {
                            "whiteboardNodes": {
                                listWhiteboardNodesObectProperties: {
                                    buildResultFn: {}
                                }
                            }

                            , "_DEFAULT": {
                                chooseFactFilterTypeFn: {
                                    _OR: {
                                        "Class": {
                                            listClassesFn: {

                                                    listObjectPropertiesFn: {
                                                        setNonObjectPropertiesFilter:{
                                                            chooseOutputTypeFn: {
                                                                buildResultFn: {}
                                                            }
                                                    }
                                                }
                                            },
                                        },

                                        "ObjectProperty": {
                                            listObjectPropertiesFn: {
                                                addQueryFilterFn: {

                                                    chooseOutputTypeFn: {
                                                        buildResultFn: {
                                                            _OR: {
                                                                "REFINE_QUERY": {
                                                                    chooseObjectPropertyClassFn: {
                                                                        listNonObjectPropertiesFn: {
                                                                            choosePropertyOperatorFn: {
                                                                                _OR: {
                                                                                    ChooseInList: {
                                                                                        listIndividualsFn: {
                                                                                            listLogicalOperatorFn: {
                                                                                                setSparqlQueryFilterFn: {
                                                                                                    chooseOutputTypeFn: {
                                                                                                        buildResultFn: {}
                                                                                                    }

                                                                                                }
                                                                                            }
                                                                                        }
                                                                                    },
                                                                                    _DEFAULT: {
                                                                                        promptPropertyValueFn: {
                                                                                            listLogicalOperatorFn: {
                                                                                                setSparqlQueryFilterFn: {
                                                                                                    chooseOutputTypeFn: {
                                                                                                        buildResultFn: {}
                                                                                                    }

                                                                                                }
                                                                                            }
                                                                                        },
                                                                                    },
                                                                                },
                                                                            },
                                                                        }
                                                                    }
                                                                },

                                                                "TRUNCATE_RESULT": {
                                                                    truncateQueryFn: {
                                                                        buildResultFn: {}
                                                                    }
                                                                },
                                                                "ABORT": {}


                                                            }
                                                        }
                                                    }

                                                }

                                            }
                                        }
                                    }
                                }

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

            },
        },

    };
    
   



        self.functionTitles = {
        chooseFactFilterTypeFn: "chooseFactFilterType",
        chooseConstraintRole: "chooseConstraintRole",
        listObjectPropertiesFn: "listObjectPropertiesFn",
        chooseQueryScopeFn: "choose query scope",


        promptKeywordFn: "enter a keyword or enter for any ",
        addQueryFilterFn: "matching keywords",
        chooseResourceTypeFn: "choose resource type",
        chooseOutputTypeFn: "choose outup type",
        chooseObjectPropertyResourceTypeFn: "choose propety resources",

        listWhiteboardNodesObectProperties: "choose an objectProperty",


        listClassesFn: "Choose a  a class ",
        listPropertiesFn: "Choose a property",
        listAnnotationPropertiesVocabsFn: "Choose a reference ontology",
        listAnnotationPropertiesFn: "Choose a property",
        promptAnnotationPropertyValue: "Filter value ",
        listWhiteBoardFilterType: "Choose a scope",
        listQueryTypeFn: "Choose a query type ",
        chooseSelectPredicates: "choose Select Predicates"
    };

    self.functions = {
        chooseResourceTypeFn: function () {
            var choices = ["Facts", "Contraints"];
            myBotEngine.showList(choices, "resourceType");
        },


        chooseQueryScopeFn: function () {

            var choices = [
                {id: "activeSource", label: "active source"},
                {id: "whiteboardSources", label: "all loaded sources"},
            ];

            if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {

                choices.push({id: "whiteboardNodes", label: "whiteboardNodes"})
            } /*else {
                self.params.queryScope = "activeSource"
                return myBotEngine.nextStep()
            }*/


            myBotEngine.showList(choices, "queryScope");
        },


        chooseFactFilterTypeFn: function () {
            var choices = ["Class", "ObjectProperty", "Value"];
            myBotEngine.showList(choices, "predicateFilterType");
        },

        chooseConstraintRole: function () {
            var choices = ["subCLassOfRestriction", "propertyOfRestriction", "targetClassOfRestriction", "objectPropertyConstraints", "classDomainOfProperty", "classRangeOfProperty"];
            myBotEngine.showList(choices, "axiomRole");
        },


        chooseOutputTypeFn: function () {

            var choices = ["New Graph", "Table", "CSV", "SPARQLquery"];

            if (self.params.currentObjectProperty) {
                choices.unshift("Refine query")
            }


            if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                choices.splice(1, 0, "Add to Graph");
            }
            myBotEngine.showList(choices, "outputType");
        },


        listClassesFn: function () {
            var options = {};
            if (self.params.queryScope == "activeSource") {
                options.withoutImports = true
            }
            self.getResourcesList("Class", null, null, options, function (err, result) {
                if (err) {
                    alert(err.responseText || err);
                    return myBotEngine.previousStep();
                }
                var classes = [];
                for (var key in result.labels) {
                    classes.push({id: key, label: result.labels[key]});
                }
                common.array.sort(classes, "label");
                classes.unshift({id: "anyClass", label: "anyClass"});

                myBotEngine.showList(classes, "currentClass");
            });
        },


        listWhiteboardNodesObectProperties: function () {
            var nodes = Lineage_whiteboard.lineageVisjsGraph.data.nodes.getIds();
            var filter = Sparql_common.setFilter("subject", nodes)
            self.getResourcesList("Predicate", "predicate", filter, {}, function (err, result) {
                if (err) {
                    alert(err.responseText || err);
                    return myBotEngine.previousStep();
                }

                var properties = [];
                for (var key in result.labels) {
                    properties.push({id: key, label: result.labels[key]});
                }
                common.array.sort(properties, "label");
                properties.unshift({id: "anyProperty", label: "anyProperty"});

                myBotEngine.showList(properties, "whiteboardCurrentObjectProperty");
            });
        },


        listObjectPropertiesFn: function () {
            var options = {};
            if (self.params.queryScope == "activeSource") {
                options.withoutImports = 1;
            }
            var filter = self.params.whiteboardNodesfilter || "";
            if(self.params.currentClass)
                filter="filter (?subject = <"+self.params.currentClass+">)"


            self.getResourcesList("ObjectProperty", null, filter, {}, function (err, result) {
                if (err) {
                    alert(err.responseText || err);
                    return myBotEngine.previousStep();
                }
                var properties = [];
                result.predicates.forEach(function (item) {
                    properties.push({
                        id: JSON.stringify(item),
                        label: result.labels[item.subject] + "-- " + result.labels[item.predicate] + " ->" + result.labels[item.object]
                    })
                })

                common.array.sort(properties, "label");
                //  properties.unshift({id: "anyProperty", label: "anyProperty"});

                myBotEngine.showList(properties, "currentObjectProperty");
            });

        },
        setNonObjectPropertiesFilter:function(){
            var nonObjectPropertyFilterWorklow=new NonObjectPropertyFilterWorklow(self.params,myBotEngine)
            nonObjectPropertyFilterWorklow.listNonObjectPropertiesFn(function(err, filter){
                if (err) {
                    alert(err.responseText || err);
                    return myBotEngine.previousStep();

                }
                return myBotEngine.nextStep();
            })
        },

        addQueryFilterFn: function () {

            if (self.params.resourceType == "Axioms") {
                self.processObjectPropertyQuery();
            } else {
                myBotEngine.nextStep();
            }

        },


        onValidateSparqlQuery: function () {
            var sparql = $("#sparqlQueryBot_textArea").text();
            self.params.outputType = $("#sparqlQueryBot_outputTypeSelect").val();
            self.params.sparqlQuery = sparql;
            $("#smallDialogDiv").dialog("close");
            $("#" + myBotEngine.divId).dialog("open");
            self.functions.buildResultFn();
        },


        chooseObjectPropertyResourceTypeFn: function () {
            var choices = ["Predicate", "Restriction", "RangeAndDomain"]; //

            myBotEngine.showList(choices, "objectPropertyResourceType");
        },


        /* choose predicates to graph or list based on objectProperties where curerntClass isSubject
         *
        */
        chooseBindingPredicatesFn: function () {
            if (!self.params.currentClass) {
                alert(" missing currentClass")
                return myBotEngine.previousStep()
            }

            var filter = "";
            if (self.params.ObjectProperty) {
                var filter = "filter (?predicate =<" + self.params.currentObjectProperty + ">)"
            }
            self.getResourcesList("Predicate", "predicate", filter, {}, function (err, result) {
                if (err) {
                    alert(err.responseText || err)
                    return myBotEngine.previousStep();
                }

                var jstreeData = []
                result.predicates.forEach(function (item) {
                    jstreeData.push({
                        id: item.predicate,
                        text: result.labels[item.predicate],
                        parent: "#"
                    })
                })
                $("#smallDialogDiv").html(
                    "<div id='sparqlQueryBot_bindingPredJstree'style='width:300px;height:500px;overflow: auto;z-index:200'></div>" +
                    "<button onclick='SparqlQuery_bot.functions.afterChooseBindingPredicates()'>OK</button>"
                )
                $("#botPanel").css("display", "none");
                $("#smallDialogDiv").dialog("open");
                var options = {openAll: true, withCheckboxes: true};
                JstreeWidget.loadJsTree("sparqlQueryBot_bindingPredJstree", jstreeData, options);

            })
        },
        afterChooseBindingPredicates: function () {
            var checkedProps = $("#sparqlQueryBot_bindingPredJstree").jstree().get_checked()
            $("#smallDialogDiv").dialog("close");
            $("#botPanel").css("display", "block");
            if (checkedProps.length > 0) {
                self.params.currentFilter += Sparql_common.setFilter("predicate", checkedProps)
            } else {
                // self.params.currentFilter += "filter(?predicate rdf:type ?type)"
                self.params.drawOnlySubject = 1
            }
            myBotEngine.nextStep()
        }
        , buildResultFn: function () {
            var outputType = self.params.outputType;

            if (outputType == "Refine query") {
                return self.functions.chooseObjectPropertyClassFn()
            }


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
            if (self.params.currentClass) {
                role = "subject"
                self.params.currentFilter += "?subject rdf:type <" + self.params.currentClass + ">."
            }
            if (self.params.currentObjectProperty) {
                var propObj = JSON.parse(self.params.currentObjectProperty)
                role = null

               // options.getType = 1
                self.params.currentFilter +=
                    "  ?subject rdf:type ?subjectType.\n" +
                    "    ?object rdf:type ?objectType." +
                    "FILTER (?predicate =<" + propObj.predicate + ">" +
                    " && ?subjectType =<" + propObj.subject + ">" +
                    " && ?objectType =<" + propObj.object + ">" +
                    ")  "
            }

            if(self.params.whiteboardCurrentObjectProperty){
                role = null
                self.params.currentFilter += "FILTER (?predicate =<" + self.params.whiteboardCurrentObjectProperty + ">)"
            }


            // at first call count result
          /*  if(!options.count)
                options.count=true*/



            self.getResourcesList("Predicate", role, self.params.currentFilter, options, function (err, result) {
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
                    self.params.queryResult = result
                    return self.functions.showResultFn()
                }


                self.params.queryResult = result
                if (self.params.outputType == "SPARQLquery") {
                    return self.editSparql()
                } else if (result.predicates.length >= self.params.maxPredicates && outputType != "CSV") {
                    self.params.queryLimit = null;

                    myBotEngine.message("result cannot be displayed too many predicates :"+result.predicates.length)

                    var choices = [
                        {id: "REFINE_QUERY", label: "Refine query"},
                        {id: "TRUNCATE_RESULT", label: "Truncate query"},
                        {id: "EDIT_SPARQL", label: "Edit query"},
                        {id: "ABORT", label: "Abort"},
                    ]

                    myBotEngine.showList(choices, null, null, false, function (action) {

                        if (action == "REFINE_QUERY") {
                            myBotEngine.backToStep(" chooseObjectPropertyClassFn")
                        } else if (action == "TRUNCATE_RESULT") {
                            self.functions.truncateQueryFn()
                        } else if (action == "EDIT_SPARQL") {
                            return self.editSparql()
                        } else if (action == "ABORT") {
                            myBotEngine.end()
                        }


                    })


                } else {

                    self.functions.showResultFn()
                }

            });
        },


        truncateQueryFn: function () {

            self.params.queryLimit = self.params.maxPredicates;
            self.params.queryResult.predicates = self.params.queryResult.predicates.slice(0, self.params.maxPredicates)
            self.functions.showResultFn()

        },

        chooseObjectPropertyClassFn: function () {
            var choices = [];
            var distinctValues = {}
            var labels = self.params.queryResult.labels
            self.params.queryResult.predicates.forEach(function (item) {
                if (item.subjectType && !distinctValues[item.subjectType]) {
                    distinctValues[item.subjectType] = 1
                    choices.push({id: item.subjectType, label: labels[item.subjectType]})
                }
                if (item.objectType && !distinctValues[item.objectType]) {
                    distinctValues[item.objectType] = 1
                    choices.push({id: item.objectType, label: labels[item.objectType]})
                }
            })


            myBotEngine.showList(choices, "currentClass")
        },


        showResultFn: function () {

            var outputType = self.params.outputType;
            var result = self.params.queryResult;

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
            var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
                "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>"
            ;

            var selectVars = " ?subject ?predicate ?object ";

            if (type == "Class") {
                query += "SELECT distinct  ?subject " + fromStr + " WHERE {{" + "?subject rdf:type owl:Class. " + "filter (exists{?subject ?p ?o} || exists{?s ?p ?subject })";
            } else if (type == "ObjectProperty") {
                query += "SELECT distinct  " + selectVars + fromStr + " WHERE {{" + "?predicate rdf:type owl:ObjectProperty. ?s ?predicate ?o." +
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
                    selectVars += " ?subjectType ?objectType "
                }
                if(options.count){
                    selectVars =" count(*) "
                }
                query += "SELECT distinct   " + selectVars + fromStr + " WHERE {{  ?subject ?predicate ?object.\n";
            }

            if (filter) {
                query += filter;
            }
            if (options.getType) {
                query += "OPTIONAL {?subject rdf:type ?subjectType} OPTIONAL {?object rdf:type ?objectType}"
            }
            query += "}";

           // var limit = self.params.queryLimit || 10000;
           var limit=(self.params.outputType == "CSV")?10000:self.params.maxPredicates

            query += "} limit " + limit;

            UI.message("");

            if (options.returnSparql) {
                return callback(null, query);
            }
        }


        self.params.currentSparql = query
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
                    return callback(null, {predicates: predicates, labels: allLabels});
                },
            );
        });
    }
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
        var visjsData = {nodes: [], edges: []};
        var existingNodes = {};
        if (addTograph) {
            existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
        }
        var labelsMap = queryResult.labels;
        var drawOnlySubject = self.params.drawOnlySubject

        var shape = "dot";
        if (self.params.resourceType = "Facts") {
            shape = "triangle"
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
            Lineage_whiteboard.drawNewGraph(visjsData, null, {skipDrawLegend: 1});
        }
        if (callback) {
            callback();
        }
    };

    self.drawDataTableQueryResult = function (queryResult, callbacl) {
        var cols = [];
        var dataset = [];
        cols.push(
            {title: "subject", defaultContent: ""},
            {title: "Predicate", defaultContent: ""},
            {title: "Object", defaultContent: ""},
            {title: "subjectURI", defaultContent: ""},
            {title: "PredicateURI", defaultContent: ""},
            {title: "ObjectURI", defaultContent: ""},
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

    self.editSparql = function () {
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
        $("#sparqlQueryBot_textArea").text(self.params.currentSparql);
    }

    return self;
})();

export default SparqlQuery_bot;
window.SparqlQuery_bot = SparqlQuery_bot;
