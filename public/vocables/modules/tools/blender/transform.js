import common from "../../common.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";

/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
var Transform = (function () {
    var self = {};

    self.substituteUris = function (source, options, callback) {
        var graphUri = Config.sources[source].graphUri;
        var sparql_url = Config.sources[source].sparql_server.url;

        if (!graphUri) return callback("no graphUri for source " + source);

        var newTriples = [];
        var oldTriples = [];
        async.whilst(
            function (_test) {
                return oldTriples.length > 0;
            },
            function (callbackWhilst) {
                async.series(
                    [
                        function (callbackSeries) {
                            var query =
                                "PREFIX  skos:<http://www.w3.org/2004/02/skos/core#> " +
                                "  select  distinct  " +
                                Sparql_common.getFromStr(source) +
                                " WHERE { " +
                                "?subject ?predicate ?object" +
                                "} limit 1000";

                            newTriples = [];
                            oldTriples = [];
                            Sparql_proxy.querySPARQL_GET_proxy(sparql_url + "?format=json&query=", query, null, function (err, result) {
                                if (err) return callbackSeries(err);
                                result.results.bindings.forEach(function (item) {
                                    var subject = item.subject.value;
                                    if (!subject.indexOf(graphUri) < 0) {
                                        oldTriples.push({ subject: subject, predicate: item.predicate.value, object: item.object.value, valueType: "uri" });
                                        var newId = common.getNewUri(source);
                                        newTriples.push({ subject: newId, predicate: item.predicate.value, object: item.object.value, valueType: "uri" });
                                    }
                                });
                                callbackSeries();
                            });
                        },
                        function (_callbackSeries) {
                            Sparql_generic.deleteTriples();
                        },
                    ],
                    function (err) {
                        return callbackWhilst(err);
                    }
                );
            },
            function (err) {
                return callback(err, "done");
            }
        );
    };

    return self;
})();

export default Transform;

window.Transform = Transform;
