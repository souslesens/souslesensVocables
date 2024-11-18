import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import Lineage_sources from "./lineage_sources.js";

var Lineage_subGraph = (function () {
    var self = {};
    self.source = "DEXPIProcess_gfi_2";

    self.turtle = [];
    self.baseClassId = "http://tsf/resources/ontology/DEXPIProcess_gfi_2/TransportingFluidsActivity"
    self.getSubGraph = function () {
        self.turtle = [];
     /*   var word = prompt("word");
        if (!word) {
            return;
        }

        var filter = 'filter (regex(?sLabel,"' + word + '","i"))';*/
        var filter=""
        self.getProps(filter, function (err, result) {
        });
    };

    self.getProps = function (filter, callback) {
        self.restrictionsUri = [];
self.distinctClasses={}
        self.allClasses = []

        async.series(
            [

                ///getsubClasses
                function (callbackSeries) {
                    var treeData = OntologyModels.getClassHierarchyTreeData(self.source, self.baseClassId, "descendants")
                    treeData.forEach(function (item) {
                        self.distinctClasses[item.id]=1
                        self.allClasses.push(item.id)
                    })

                    callbackSeries()

                },


                //get RestrictionsUri
                function (callbackSeries) {
                    var currentClasses = self.allClasses
var currentRestrictions=[]
                    var nRestrictions = 1

                    async.whilst(
                        function (callbackTest) {

                            return nRestrictions > 0;
                        },

                        function (callbackWhilst) {
                            filter = Sparql_common.setFilter("s", currentClasses)
                           // var filter2 = 'filter (regex(str(?o),"_:b")) ';
                            var filter2=" ?o rdf:type owl:Restriction."
                            var query =
                                "PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX" +
                                " rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                                "select  ?s ?p ?o  FROM   <http://tsf/resources/ontology/DEXPIProcess_gfi_2/>  WHERE {\n" +
                                "  ?s ?p ?o. "+//?s rdfs:label ?sLabel " +
                                filter +
                                filter2 +
                                "} limit 10000";

                            self.query(query, function (err, result) {
                                if (err) {
                                    return alert(err);
                                }
                                currentClasses = []
                                result.results.bindings.forEach(function (item) {
                                    if(! self.distinctClasses[item.o.value]) {
                                        self.distinctClasses[item.o.value] = 1
                                      self.allClasses.push(item.o.value)
                                    }
                                    currentClasses.push(item.o.value);
                                    currentRestrictions.push(item.o.value)
                                });
                                nRestrictions=currentClasses.length


                                filter = Sparql_common.setFilter("o", currentRestrictions)
                                // var filter2 = 'filter (regex(str(?o),"_:b")) ';
                              //  var filter2=" ?s rdf:type owl:Restriction."
                                var query =
                                    "PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX" +
                                    " rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                                    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                                    "select  ?s ?p ?o  FROM   <http://tsf/resources/ontology/DEXPIProcess_gfi_2/>  WHERE {\n" +
                                    "  ?s rdfs:subClassOf ?o. "+//?s rdfs:label ?sLabel " +
                                    filter +
                                    filter2 +
                                    "} limit 10000";

                                self.query(query, function (err, result) {
                                    if (err) {
                                        return alert(err);
                                    }
                                    currentClasses = []
                                    result.results.bindings.forEach(function (item) {

                                        if(! self.distinctClasses[item.s.value]) {
                                            currentClasses.push(item.s.value);
                                            self.distinctClasses[item.s.value] = 1
                                            self.allClasses.push(item.s.value)
                                        }


                                    });

                                    nRestrictions=currentClasses.length
                                    callbackWhilst()
                                });




                            });


                        }, function (err) {
                            callbackSeries();
                        });

                },


                // get predicateTriples turtle
                function (callbackSeries) {
                    filter = Sparql_common.setFilter("s", self.allClasses)
                    var query =
                        "PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX" +
                        " rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                        "construct  {?s ?p ?o}  FROM   <http://tsf/resources/ontology/DEXPIProcess_gfi_2/>  WHERE {\n" +
                        "  ?s ?p ?o. " +
                        filter +
                        "} limit 10000";

                    self.query(query, function (err, result) {
                        if (err) {
                            return alert(err);
                        }
                        self.turtle.push(result.result);

                        callbackSeries();
                    });
                },


                //getRestriction
            ],

            function (err) {
                var x = self.turtle;

                self.turtle.forEach(function (turtle) {
                    console.log(turtle);
                });

                return err;
            }
        )
        ;

        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX" +
            " rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "construct  {?s ?p ?o}  FROM   <http://tsf/resources/ontology/DEXPIProcess_gfi_2/>  WHERE {\n" +
            "  ?s ?p ?o. ?s rdfs:label ?sLabel " +
            filter +
            "} limit 10000";
    };

    self.query = function (query, callback) {
        var url = Config._defaultSource.sparql_server.url;
        Sparql_proxy.querySPARQL_GET_proxy(
            url,
            query,
            "",
            {
                source: self.source,
            },
            function (err, result) {
                if (err) {
                    return callback(err);
                }

                return callback(null, result);
            }
        );
    };

    self.getSubGraphX = function (topUri) {
    };

    return self;
})();

export default Lineage_subGraph;
window.Lineage_subGraph = Lineage_subGraph;
