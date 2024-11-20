import Sparql_proxy from "../sparqlProxies/sparql_proxy.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";


var SubGraph = (function () {
    var self = {};

    self.getSubGraphResources = function (sourceLabel, baseClassId, callback) {
        var distinctClasses = {};
        var allClasses = [];
        var allRestrictions = [];
        var fromStr = Sparql_common.getFromStr(sourceLabel);
        async.series(
            [

                function (callbackSeries) {
                    OntologyModels.registerSourcesModel(sourceLabel,null, function(err, result){
                        callbackSeries(err);
                    })
                },
                ///getsubClasses
                function (callbackSeries) {
                    var treeData = OntologyModels.getClassHierarchyTreeData(sourceLabel, baseClassId, "descendants");
                    treeData.forEach(function (item) {
                        distinctClasses[item.id] = 1;
                        allClasses.push(item.id);
                    });

                    callbackSeries();
                },

                //get RestrictionsUri
                function (callbackSeries) {
                    var currentClasses = allClasses;
                    var currentRestrictions = [];
                    var nRestrictions = 1;

                    async.whilst(
                        function (callbackTest) {
                            return nRestrictions > 0;
                        },

                        function (callbackWhilst) {
                            var filter = Sparql_common.setFilter("s", currentClasses);
                            // var filter2 = 'filter (regex(str(?o),"_:b")) ';
                            var filter2 = " ?o rdf:type owl:Restriction.";
                            var query =
                                "PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX" +
                                " rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                                "select  ?s ?p ?o " +
                                fromStr +
                                "  WHERE {\n" +
                                "  ?s ?p ?o. " + //?s rdfs:label ?sLabel " +
                                filter +
                                filter2 +
                                "} limit 10000";

                            self.query(sourceLabel, query, function (err, result) {
                                if (err) {
                                    return alert(err);
                                }
                                currentClasses = [];
                                result.results.bindings.forEach(function (item) {
                                    if (!distinctClasses[item.o.value]) {
                                        distinctClasses[item.o.value] = 1;
                                        allRestrictions.push(item.o.value);
                                        currentClasses.push(item.o.value);
                                        currentRestrictions.push(item.o.value);
                                    }
                                });

                                var filter = Sparql_common.setFilter("x", currentRestrictions);

                                var query =
                                    "PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX" +
                                    " rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                                    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                                    "select  ?s " +
                                    fromStr +
                                    "  WHERE {\n" +
                                    "   ?x ?p ?s. ?s rdf:type owl:Class   " + //?s rdfs:label ?sLabel " +
                                    filter +
                                    "} limit 10000";

                                self.query(sourceLabel, query, function (err, result) {
                                    if (err) {
                                        return alert(err);
                                    }
                                    currentClasses = [];
                                    result.results.bindings.forEach(function (item) {
                                        if (!distinctClasses[item.s.value]) {
                                            distinctClasses[item.s.value] = 1;
                                            allClasses.push(item.s.value);
                                            currentClasses.push(item.s.value);
                                        }
                                    });

                                    nRestrictions = currentClasses.length;
                                    callbackWhilst();
                                });
                            });
                        },
                        function (err) {
                            callbackSeries();
                        }
                    );
                },
            ],
            function (err) {
                return callback(err, { classes: allClasses, restrictions: allRestrictions });
            }
        );
    };

    self.instantiateSubGraph = function (sourceLabel, classUri, callback) {
        if (!classUri) {
            classUri = "http://tsf/resources/ontology/DEXPIProcess_gfi_2/TransportingFluidsActivity";
        }

        self.getSubGraphResources(sourceLabel, classUri, function (err, result) {
            var resources = result.classes.concat(result.restrictions);
            // return;
            self.getResourcesPredicates(sourceLabel, resources, "SELECT", {}, function (err, result) {
                var itemsMap = {};
                result.forEach(function (item) {
                    if (!itemsMap[item.s.value]) itemsMap[item.s.value] = {};

                    if (item.p.value.endsWith("type")) {
                        var o = Sparql_common.getLabelFromURI(item.o.value);
                        itemsMap[item.s.value].type = o;
                    }

                    if (item.p.value.endsWith("label")) itemsMap[item.s.value].label = item.o.value;
                    if (item.p.value.endsWith("onProperty")) itemsMap[item.s.value].property = item.o.value;
                    if (item.p.value.endsWith("onClass")) itemsMap[item.s.value].range = item.o.value;
                    if (item.p.value.endsWith("someValuesFrom")) itemsMap[item.s.value].range = item.o.value;
                    if (item.p.value.endsWith("ardinality")) {
                        var p = Sparql_common.getLabelFromURI(item.p.value);
                        itemsMap[item.s.value][p] = item.o.value;
                    }
                    if (item.p.value.endsWith("subClassOf")) {
                        if (item.o.value.indexOf("http") < 0) {
                            itemsMap[item.s.value].restriction = item.o.value;
                        }
                    }
                });
                var newTriples = [];
                // var prefix=Config.sources[sourceLabel].graphUri
                for (var classUri in itemsMap) {
                    var id = classUri; //+"/"+common.getRandomHexaId(5)
                    var item = itemsMap[classUri];
                    if (item.type == "Class") {
                        newTriples.push({
                            subject: id,
                            predicate: "rdf:type",
                            object: classUri,
                        });
                        newTriples.push({
                            subject: id,
                            predicate: "rdfs:label",
                            object: item.label,
                        });
                        if (item.restriction) {
                            var restriction = itemsMap[item.restriction];
                            if (restriction)
                                newTriples.push({
                                    subject: id,
                                    predicate: restriction.property,
                                    object: restriction.range,
                                });
                        }
                    }
                }
                return callback(null, newTriples)
            });
        });
    };

    self.getResourcesPredicates = function (sourceLabel, resources, action, options, callback) {
        if (!options) {
            options = {};
        }
        var selectStr = "SELECT ?s ?p ?o ";
        if (action == "CONSTRUCT") {
            selectStr = "CONSTRUCT {?s ?p ?o} ";
        }

        var fromStr = Sparql_common.getFromStr(sourceLabel);
        var filter = Sparql_common.setFilter("s", resources);
        if (options.filter) {
            filter += options.filter;
        }
        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX" +
            " rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            selectStr +
            fromStr +
            " WHERE {\n" +
            "  ?s ?p ?o. " +
            filter +
            "} limit 10000";

        self.query(sourceLabel, query, function (err, result) {
            if (err) {
                return callback(err);
            }

            if (action == "CONSTRUCT") {
                callback(null, result.result);
            } else {
                return callback(null, result.results.bindings);
            }
        });
    };

    self.query = function (sourceLabel, query, callback) {
        var url = Config._defaultSource.sparql_server.url;
        Sparql_proxy.querySPARQL_GET_proxy(
            url,
            query,
            "",
            {
                source: sourceLabel,
            },
            function (err, result) {
                if (err) {
                    return callback(err);
                }

                return callback(null, result);
            }
        );
    };

    self.getSubGraphTurtles = function (sourceLabel, classUri) {
        if (!classUri) {
            classUri = "http://tsf/resources/ontology/DEXPIProcess_gfi_2/TransportingFluidsActivity";
        }

        self.instantiateSubGraph(sourceLabel, classUri, function (err, result) {});

        return;
        self.getSubGraphResources(sourceLabel, classUri, function (err, result) {
            var resources = result.classes.concat(result.restrictions);
            self.getResourcesPredicates(sourceLabel, resources, "SELECT", null, function (err, result) {
                console.log(result);
            });
        });
    };

    return self;
})();

export default SubGraph;
window.SubGraph = SubGraph;
