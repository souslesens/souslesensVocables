import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";

var Lineage_subGraph = (function () {
    var self = {};
    self.source = "DEXPIProcess_gfi_2";
    self.turtle = [];
    self.getSubGraph = function () {
        self.turtle = [];
        var word = prompt("word");
        if (!word) {
            return;
        }

        var filter = 'filter (regex(?sLabel,"' + word + '","i"))';

        self.getProps(filter, function (err, result) {});
    };

    self.getProps = function (filter, callback) {
        self.restrictionsUri = [];
        async.series(
            // get predicateTriples turtle
            [
                function (callbackSeries) {
                    var query =
                        "PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX" +
                        " rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                        "construct  {?s ?p ?o}  FROM   <http://tsf/resources/ontology/DEXPIProcess_gfi_2/>  WHERE {\n" +
                        "  ?s ?p ?o. ?s rdfs:label ?sLabel " +
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

                //get RestrictionsUri
                function (callbackSeries) {
                    var filter2 = 'filter (regex(str(?o),"_:b")) ';
                    var query =
                        "PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX" +
                        " rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                        "select  ?s ?p ?o  FROM   <http://tsf/resources/ontology/DEXPIProcess_gfi_2/>  WHERE {\n" +
                        "  ?s ?p ?o. ?s rdfs:label ?sLabel " +
                        filter +
                        filter2 +
                        "} limit 10000";

                    self.query(query, function (err, result) {
                        if (err) {
                            return alert(err);
                        }
                        result.results.bindings.forEach(function (item) {
                            self.restrictionsUri.push(item.o.value);
                        });

                        callbackSeries();
                    });
                },

                //getResrictionsTurtle
                function (callbackSeries) {
                    var filter2 = Sparql_common.setFilter("s", self.restrictionsUri);
                    var query =
                        "PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX" +
                        " rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                        "construct  {?s ?p ?o}  FROM   <http://tsf/resources/ontology/DEXPIProcess_gfi_2/>  WHERE {\n" +
                        "  ?s ?p ?o. optional {?s rdfs:label ?sLabel} " +
                        filter2 +
                        "} limit 10000";

                    self.query(query, function (err, result) {
                        if (err) {
                            return alert(err);
                        }
                        self.turtle.push(result.result);

                        callbackSeries();
                    });
                },

                ///getsubClasses

                //getRestriction
            ],
            function (err) {
                var x = self.turtle;

                self.turtle.forEach(function (turtle) {
                    console.log(turtle);
                });

                return err;
            }
        );

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

    self.getSubGraphX = function (topUri) {};

    return self;
})();

export default Lineage_subGraph;
window.Lineage_subGraph = Lineage_subGraph;
