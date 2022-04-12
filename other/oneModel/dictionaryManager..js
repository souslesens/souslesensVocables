var httpProxy = require("../../bin/httpProxy.");
var SQLserverConnector = require("../../bin/KG/SQLserverConnector.");
var async = require("async");
var util = require("../../bin/util.");
var DictionaryManager = {
    sqlServerDictionaryTotriples: function () {
        var sparql_server_url = "http://51.178.139.80:8890/sparql";
        var dictionaryGraphUri = "http://vocables.souslesens.org/dictionary/";

        var resultSize = 1;
        var totalLines = 0;
        async.whilst(
            function (callbackTest) {
                //test
                var w = resultSize > 0;
                callbackTest(null, w);
            },

            function (callbackWhilst) {
                //iterate
                var query = "select distinct * from souslesensDictionary order by classLabel";
                SQLserverConnector.getData("rdlquantum", query, function (err, data) {
                    if (err) callbackWhilst(err);
                    var slices = util.sliceArray(data, 200);
                    var distinctLabels = {};

                    var schemes = {
                        CFIHOS_READI: "http://w3id.org/readi/rdl/",
                        "ISO_15926-PCA": "http://staging.data.posccaesar.org/rdl/",
                        "ISO_15926-org": "http://data.15926.org/",
                    };

                    async.eachSeries(slices, function (data, callbackSeries) {
                        var sparql =
                            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                            " PREFIX owl: <http://www.w3.org/2002/07/owl#> PREFIX skos: <http://www.w3.org/2004/02/skos/core#>" +
                            "WITH <" +
                            dictionaryGraphUri +
                            "> insert {\n";
                        data.forEach(function (item) {
                            if (!item.source || !schemes[item.source]) return;
                            var label = util.formatStringForTriple(item.classLabel);
                            var id = distinctLabels[label];
                            if (!id) {
                                id = util.getRandomHexaId(15);
                                distinctLabels[label] = id;
                                sparql += "<" + dictionaryGraphUri + id + "> rdfs:label '" + label + "'.\n";
                            }

                            sparql += "<" + dictionaryGraphUri + id + "> owl:sameAs <" + item.class + ">.\n";
                            if (!distinctLabels[item.class]) {
                                distinctLabels[item.class] = 1;
                                sparql += "<" + item.class + "> skos:inScheme <" + schemes[item.source] + ">.\n";
                                sparql += "<" + item.class + "> rdfs:label '" + util.formatStringForTriple(item.classLabel) + "'.\n";
                            }
                        });
                        sparql += "}";

                        //   console.log(sparql)
                        var params = { query: sparql };
                        httpProxy.post(sparql_server_url, null, params, function (err, result) {
                            if (err) {
                                console.log(err);
                                return callbackSeries(err);
                            }
                            //  console.log(result)
                            totalLines += data.length;
                            console.log(totalLines);
                            return callbackSeries(null, result);
                        });
                    });
                });
            },
            function (_err) {
                console.log("ALL DONE" + totalLines);
            }
        );
    },

    getDictionaryEntries: function (_words, _graphUris, _options, _callback) {
        // var query =
        //     "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +
        //     "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
        //     "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
        //     "SELECT * from <http://vocables.souslesens.org/dictionary/>  from <http://w3id.org/readi/rdl/>  WHERE {\n" +
        //     "  ?sub rdfs:label ?label filter (?label='pump')\n" +
        //     "  ?sub owl:sameAs ?uri.\n" +
        //     "  optional { ?uri rdfs:subClassOf* ?parent. ?parent rdfs:label ?parentLabel}\n" +
        //     "} LIMIT 10";
    },
};
module.exports = DictionaryManager;

DictionaryManager.sqlServerDictionaryTotriples();
