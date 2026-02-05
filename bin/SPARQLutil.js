import async from "async";
import util from "../bin/util.js";
import httpProxy from "../bin/httpProxy.js";

var SPARQLutil = {
    generateTriples: function (graphUri, triples, replaceGraph, callback) {
        var sparqlServerUrl = "";
        var slicedTriples = util.sliceArray(triples, 1000);
        var totalTriples = 0;
        var uniqueTriples = {};

        async.series(
            [
                function (callbackSeries) {
                    if (!replaceGraph) return callbackSeries();

                    console.log("CLEAR GRAPH <" + graphUri + ">");
                    var queryGraph = "CLEAR GRAPH <" + graphUri + ">";
                    var params = { query: queryGraph };
                    httpProxy.post(sparqlServerUrl, null, params, function (err, _result) {
                        return callbackSeries(err);
                    });
                },
                function (callbackSeries) {
                    async.eachSeries(
                        slicedTriples,
                        function (triples, callbackEach) {
                            //    return callbackEach();
                            var triplesStr = "";
                            triples.forEach(function (triple) {
                                if (!triple.subject || !triple.object) return;
                                var subject = triple.subject;
                                if (subject.indexOf("_:b") == 0);
                                else subject = "<" + subject + ">";

                                var value = triple.object;
                                if (value.indexOf("_:b") == 0);
                                else if (value.indexOf("http") == 0) value = "<" + value + ">";
                                var tripleStr = subject + " <" + triple.predicate + "> " + value + ".\n";
                                var tripleHash = util.hashCode(tripleStr);
                                if (uniqueTriples[tripleHash]) return;
                                else {
                                    uniqueTriples[tripleHash] = 1;
                                    triplesStr += tripleStr;
                                }
                            });
                            var queryGraph =
                                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                                "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                                "PREFIX owl: <http://www.w3.org/2002/07/owl#> ";
                            queryGraph += "with <" + graphUri + ">" + "insert {";
                            queryGraph += triplesStr;

                            queryGraph += "}";

                            var params = { query: queryGraph };

                            httpProxy.post(sparqlServerUrl, null, params, function (err, _result) {
                                if (err) {
                                    console.log(err);
                                    return callbackEach();
                                } else {
                                    totalTriples += triples.length;
                                    console.log(totalTriples);
                                    return callbackEach(null);
                                }
                            });
                        },
                        function (err) {
                            return callbackSeries(err);
                        },
                    );
                },
            ],
            function (err) {
                if (err) {
                    return callback(err);
                }
                return callback(null, "DONE " + totalTriples);
            },
        );
    },
};
export default SPARQLutil;
