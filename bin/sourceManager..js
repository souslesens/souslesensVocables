var httpProxy = require("./httpProxy.");
var async = require("async");
var util = require("./util.");
var SourceManager = {
    createNewOwlSourceGraph: function (
        sourceName,
        graphUri,
        targetSparqlServerUrl,
        options,
        callback
    ) {},
    createNewSkosSourceGraph: function (
        sourceName,
        graphUri,
        targetSparqlServerUrl,
        options,
        callback
    ) {
        var type = options.type;
        var lang = options.lang;
        var referenceSource = options.referenceSource;
        var keepOriginalUris = options.keepOriginalUris;
        var addExactMatchPredicate = options.addExactMatchPredicate;
        options.createCollectionRootNode = true;

        var sourceData = [];
        async.series(
            [
                //select source Data
                function (callbackSeries) {
                    var query =
                        "PREFIX  terms:<http://purl.org/dc/terms/>" +
                        " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#>" +
                        " PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                        " PREFIX  skos:<http://www.w3.org/2004/02/skos/core#>" +
                        " PREFIX  elements:<http://purl.org/dc/elements/1.1/> " +
                        " select distinct *  FROM <" +
                        referenceSource.graphUri +
                        ">  WHERE" +
                        " {{?concept skos:prefLabel ?conceptLabel.    OPTIONAL{?concept rdf:type ?type.}  " +
                        "?concept skos:broader ?broader1.?broader1 skos:prefLabel ?broader1Label.?broader1 rdf:type ?type." +
                        "" +
                        "?broader1 skos:broader ?broader2.?broader2 skos:prefLabel ?broader2Label.?broader2 rdf:type ?type." +
                        "filter (?broader2Label='Thing'@en)" +
                        "}}limit 5000";

                    var sourceSparqlUrl = referenceSource.sparql_server.url;
                    if (sourceSparqlUrl.charAt(sourceSparqlUrl.length - 1) != "/")
                        sourceSparqlUrl += "/";
                    var body = {
                        url: sourceSparqlUrl,
                        params: { query: query },
                        headers: {
                            Accept: "application/sparql-results+json",
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                    };
                    sourceSparqlUrl += "format=json&query=";
                    httpProxy.post(
                        sourceSparqlUrl,
                        body.headers,
                        body.params,
                        function (err, result) {
                            if (err) return callbackSeries(err);
                            sourceData = result.results.bindings;
                            callbackSeries();
                        }
                    );

                    sourceData;
                },

                function (callbackSeries) {
                    SourceManager.createTriples(
                        sourceData,
                        graphUri,
                        targetSparqlServerUrl,
                        options,
                        function (err, result) {
                            callbackSeries(err, result);
                        }
                    );
                },
            ],
            function (err) {
                callback(err, "done");
            }
        );
    },

    createTriples: function (sourceData, graphUri, targetSparqlServerUrl, options, callback) {
        var type = options.type;
        var lang = options.lang;
        var keepOriginalUris = options.keepOriginalUris;
        var addExactMatchPredicate = options.addExactMatchPredicate;

        var broaderPredicate = "";
        var labelPredicate = "";

        var urisMap = {};
        var slices = util.sliceArray(sourceData, 50);

        async.eachSeries(
            slices,
            function (sourcePredicates, callbackEach) {
                var predicates = "";

                sourcePredicates.forEach(function (item) {
                    var conceptUri = urisMap[item.concept.value];
                    if (!conceptUri) {
                        if (!keepOriginalUris) {
                            conceptUri = " <" + graphUri + util.getRandomHexaId(10) + ">";
                            urisMap[item.concept.value] = conceptUri;
                            if (addExactMatchPredicate)
                                predicates +=
                                    conceptUri + " skos:exactMatch <" + item.concept.value + "> .";
                        } else {
                            urisMap[item.concept.value] = "<" + item.concept.value + ">";
                        }
                        predicates += conceptUri + " rdf:type " + "skos:Concept.";
                        predicates +=
                            conceptUri +
                            " skos:prefLabel " +
                            "'" +
                            item.conceptLabel.value +
                            "'@" +
                            lang +
                            ". ";
                    }

                    var previousBroader = null;
                    for (var i = 1; i < 5; i++) {
                        var broader = item["broader" + i];
                        if (broader && item["broader" + i + "Label"].value) {
                            broaderUri = urisMap[broader.value];
                            if (!broaderUri) {
                                if (!keepOriginalUris) {
                                    var broaderUri =
                                        " <" + graphUri + util.getRandomHexaId(10) + ">";
                                    urisMap[broader.value] = broaderUri;
                                    if (addExactMatchPredicate)
                                        predicates +=
                                            broaderUri +
                                            " skos:exactMatch <" +
                                            item.concept.value +
                                            "> .";
                                } else {
                                    urisMap[broader.value] = "<" + broader.value + ">";
                                }
                                predicates += broaderUri + " rdf:type " + "skos:Concept.";
                                predicates +=
                                    broaderUri +
                                    " skos:prefLabel " +
                                    "'" +
                                    item["broader" + i + "Label"].value +
                                    "'@" +
                                    lang +
                                    ". ";
                            }

                            if (i == 1) {
                                predicates += conceptUri + " skos:broader " + broaderUri + ". ";
                            } else {
                                predicates +=
                                    previousBroader + " skos:broader " + broaderUri + ". ";
                            }
                            previousBroader = broaderUri;
                        }
                    }
                });
                if (options.createCollectionRootNode) {
                    var collectionUri = " <" + graphUri + util.getRandomHexaId(10) + ">";
                    predicates += collectionUri + " rdf:type skos:Collection.";
                    predicates += collectionUri + " skos:prefLabel 'Collections'";
                }

                var query =
                    "  PREFIX  skos:<http://www.w3.org/2004/02/skos/core#> PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>";

                query += "insert into <" + graphUri + "> {" + predicates + "}";

                if (targetSparqlServerUrl.charAt(targetSparqlServerUrl.length - 1) != "/")
                    targetSparqlServerUrl += "/";
                var body = {
                    url: targetSparqlServerUrl,
                    params: { query: query },
                    headers: {
                        Accept: "application/sparql-results+json",
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                };

                targetSparqlServerUrl += "format=json&query=";

                httpProxy.post(
                    targetSparqlServerUrl,
                    body.headers,
                    body.params,
                    function (err, result) {
                        if (err) return callbackEach(err);

                        callbackEach();
                    }
                );
            },
            function (err) {
                callback();
            }
        );
    },

    deleteSourceGraph: function (graphUri, sparqlServerUrl, callback) {
        var query = "CLEAR GRAPH <" + graphUri + "> ";

        var body = {
            url: sparqlServerUrl,
            params: { query: query },
            headers: {
                Accept: "application/sparql-results+json",
                "Content-Type": "application/x-www-form-urlencoded",
            },
        };
        if (sparqlServerUrl.charAt(sparqlServerUrl.length - 1) != "/") sparqlServerUrl += "/";
        sparqlServerUrl += "format=json&query=";
        httpProxy.post(sparqlServerUrl, body.headers, body.params, function (err, result) {
            callback(err, "graph deleted");
        });
    },
};

module.exports = SourceManager;
