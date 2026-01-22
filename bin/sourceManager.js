import httpProxy from "./httpProxy.js";
import async from "async";
import util from "./util.js";
import fs from "fs";
var SourceManager = {
    createNewOwlSourceGraph: function (_sourceName, _graphUri, _targetSparqlServerUrl, _options, _callback) {
        // do nothing ? XXX
    },

    createNewSkosSourceGraph: function (_sourceName, graphUri, targetSparqlServerUrl, options, callback) {
        var referenceSource = options.referenceSource;
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
                        " {{?subject skos:prefLabel ?subjectLabel.    OPTIONAL{?subject rdf:type ?type.}  " +
                        "?subject skos:broader ?broader1.?broader1 skos:prefLabel ?broader1Label.?broader1 rdf:type ?type." +
                        "" +
                        "?broader1 skos:broader ?broader2.?broader2 skos:prefLabel ?broader2Label.?broader2 rdf:type ?type." +
                        "filter (?broader2Label='Thing'@en)" +
                        "}}limit 5000";

                    var sourceSparqlUrl = referenceSource.sparql_server.url;
                    if (sourceSparqlUrl.charAt(sourceSparqlUrl.length - 1) != "/") sourceSparqlUrl += "/";
                    var body = {
                        url: sourceSparqlUrl,
                        params: { query: query },
                        headers: {
                            Accept: "application/sparql-results+json",
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                    };
                    sourceSparqlUrl += "format=json&query=";
                    httpProxy.post(sourceSparqlUrl, body.headers, body.params, function (err, result) {
                        if (err) return callbackSeries(err);
                        if (typeof result === "string") result = JSON.parse(result);
                        var sourceData = result.results.bindings;
                        callbackSeries();
                    });
                },

                function (callbackSeries) {
                    SourceManager.createTriples(sourceData, graphUri, targetSparqlServerUrl, options, function (err, result) {
                        callbackSeries(err, result);
                    });
                },
            ],
            function (err) {
                callback(err, "done");
            },
        );
    },

    createTriples: function (sourceData, graphUri, targetSparqlServerUrl, options, callback) {
        var lang = options.lang;
        var keepOriginalUris = options.keepOriginalUris;
        var addExactMatchPredicate = options.addExactMatchPredicate;

        var urisMap = {};
        var slices = util.sliceArray(sourceData, 50);

        async.eachSeries(
            slices,
            function (sourcePredicates, callbackEach) {
                var predicates = "";

                sourcePredicates.forEach(function (item) {
                    var conceptUri = urisMap[item.subject.value];
                    if (!conceptUri) {
                        if (!keepOriginalUris) {
                            conceptUri = " <" + graphUri + util.getRandomHexaId(10) + ">";
                            urisMap[item.subject.value] = conceptUri;
                            if (addExactMatchPredicate) predicates += conceptUri + " skos:exactMatch <" + item.subject.value + "> .";
                        } else {
                            urisMap[item.subject.value] = "<" + item.subject.value + ">";
                        }
                        predicates += conceptUri + " rdf:type " + "skos:Concept.";
                        predicates += conceptUri + " skos:prefLabel " + "'" + item.subjectLabel.value + "'@" + lang + ". ";
                    }

                    var previousBroader = null;
                    for (var i = 1; i < 5; i++) {
                        var broader = item["broader" + i];
                        if (broader && item["broader" + i + "Label"].value) {
                            var broaderUri = urisMap[broader.value];
                            if (!broaderUri) {
                                if (!keepOriginalUris) {
                                    var broaderUri = " <" + graphUri + util.getRandomHexaId(10) + ">";
                                    urisMap[broader.value] = broaderUri;
                                    if (addExactMatchPredicate) predicates += broaderUri + " skos:exactMatch <" + item.subject.value + "> .";
                                } else {
                                    urisMap[broader.value] = "<" + broader.value + ">";
                                }
                                predicates += broaderUri + " rdf:type " + "skos:Concept.";
                                predicates += broaderUri + " skos:prefLabel " + "'" + item["broader" + i + "Label"].value + "'@" + lang + ". ";
                            }

                            if (i == 1) {
                                predicates += conceptUri + " skos:broader " + broaderUri + ". ";
                            } else {
                                predicates += previousBroader + " skos:broader " + broaderUri + ". ";
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

                var query = "  PREFIX  skos:<http://www.w3.org/2004/02/skos/core#> PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>";

                query += "insert into <" + graphUri + "> {" + predicates + "}";

                if (targetSparqlServerUrl.charAt(targetSparqlServerUrl.length - 1) != "/") targetSparqlServerUrl += "/";
                var body = {
                    url: targetSparqlServerUrl,
                    params: { query: query },
                    headers: {
                        Accept: "application/sparql-results+json",
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                };

                targetSparqlServerUrl += "format=json&query=";

                httpProxy.post(targetSparqlServerUrl, body.headers, body.params, function (err, _result) {
                    if (err) return callbackEach(err);

                    callbackEach();
                });
            },
            function (_err) {
                callback();
            },
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
        httpProxy.post(sparqlServerUrl, body.headers, body.params, function (err, _result) {
            callback(err, "graph deleted");
        });
    },

    sourcesToCsv: function () {
        var str = "" + fs.readFileSync("../config/sources.json");
        var json = JSON.parse(str);
        var sep = ";";
        var str2 = "source" + sep;
        var fields = ["schemaType", "group", "sparql_server", "editable", "imports", "topClassFilter", "taxonomyPredicates"];
        fields.forEach(function (field) {
            str2 += field + sep;
        });
        str2 += "\n";

        for (var key in json) {
            str2 += key + sep;
            var source = json[key];
            fields.forEach(function (field) {
                var value = source[field];
                if (typeof value == "object") value = JSON.stringify(value);
                str2 += (value || "") + sep;
            });
            str2 += "\n";
        }
        fs.writeFileSync("../config/sources.json.csv", str2);
    },
};

export default SourceManager;
//SourceManager.sourcesToCsv();
