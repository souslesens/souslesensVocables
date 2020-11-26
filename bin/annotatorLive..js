var httpProxy = require('../bin/httpProxy.')
var async = require('async')
var spacyServerUrl = "http://vps475829.ovh.net/spacy/pos"
var Inflector = require('inflected');


var annotatorLive = {


    annotate: function (text, sources, callback) {
        var textNouns = [];
        var entities = {};
        var missingNouns = []
        async.series([

            //extract spacy nouns
            function (callbackSeries) {
                var json = {
                    "text": text
                }

                httpProxy.post(spacyServerUrl, {'content-type': 'application/json'}, json, function (err, result) {
                    if (err) {
                        console.log(err)
                        return callbackSeries(err);
                    }

                    result.data.forEach(function (sentence) {
                        sentence.tags.forEach(function (item) {
                            if (item.tag.indexOf("NN") > -1) {//item.tag.indexOf("NN")>-1) {
                                var text = Inflector.singularize(item.text.toLowerCase());
                               // if (textNouns.indexOf(item.text) < 0)
                                    textNouns.push({text: text, entities: {}})

                            }
                        })
                    })
                    callbackSeries();
                })
            },

            //extract concepts for each source
            function (callbackSeries) {

                if (textNouns.length == 0)
                    return callbackSeries();
                var textNounsSlices = [textNouns]

                async.eachSeries(sources, function (source, callbackEachSource) {

                    async.eachSeries(textNounsSlices, function (textNouns, callbackEachNounsSlice) {

                        var regexStr = "("
                        textNouns.forEach(function (concept, index) {
                            if (index > 0)
                                regexStr += "|";
                            regexStr += "^" + concept.text + "$";
                        })
                        regexStr += ")"


                        var filter = "  regex(?prefLabel, \"" + regexStr + "\", \"i\")";

                        var query = "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>" +
                            "SELECT * " +
                            "FROM <" + source.graphUri + "> " +
                            "WHERE {" +
                            "?id skos:prefLabel|skos:altLabel ?prefLabel ." +
                            "FILTER (lang(?prefLabel) = '" + source.predicates.lang + "')" +
                            " filter " + filter + "} limit 10000";


                        var url = source.sparql_url;
                        var queryOptions = "&should-sponge=&format=application%2Fsparql-results%2Bjson&timeout=20000&debug=off"

                        var params = {query: query}
                        var headers = {
                            "Accept": "application/sparql-results+json",
                            "Content-Type": "application/x-www-form-urlencoded"
                        }
                        httpProxy.post(url, headers, params, function (err, result) {
                            if (err) {
                                return callbackEachNounsSlice(err);
                            }
                            var bindings = [];
                            var ids = [];
                            if (result.results.bindings.length > 0) {
                                result.results.bindings.forEach(function (item) {
                                    var key = item.prefLabel.value.toLowerCase()
                                    if (!entities[key])
                                        entities[key] = {}
                                    if (!entities[key][source.name])
                                        entities[key][source.name] = []
                                    entities[key][source.name].push({
                                        source: source.name,
                                        id: item.id.value,
                                        label: item.prefLabel.value

                                    })
                                })
                            }
                            return callbackEachNounsSlice(err);
                        })
                    }, function (err) {
                        callbackEachSource(err)
                    })
                }, function (err) {
                    callbackSeries(err)
                })

            },
            //set Missing nouns
            function (callbackSeries) {
                var found = Object.keys(entities);

                textNouns.forEach(function (item) {
                    var noun = item.text.toLowerCase()
                    if (found.indexOf(noun) < 0)
                        missingNouns.push(noun)

                })
                callbackSeries()
            }
        ], function (err) {
            callback(err, {entities: entities, missingNouns: missingNouns})

        })


    }
    ,
    test: function () {
        var text = "Liquid loss from a storage tank is generally caused by localized material failure in the form of localized corrosion. Tank bottom leaks can be a result of improper foundation design or operating a tank outside the recommended design pressure or temperature boundaries. Product liquid leakage remains a significant environmental concern. Any tank used to contain a hydrocarbon product can be prone to develop leaks sometime during the service life. Tank design options that reduce the risk of a leak can be considered, or in the event of a leak, any product that escapes is contained and detected in a realistic time frame."

        var source = {
            "name": "TULSA",
            "controller": "Sparql_generic",
            "sparql_url": "http://51.178.139.80:8890/sparql",
            "graphIri": "http://souslesens.org/oil-gas/upstream/",
            "sourceSchema": "SKOS",
            "predicates": {
                "lang": "en"
            },
            "color": "#17becf"
        }


        annotatorLive.annotate(text, [source], function (err, result) {

            if (err)
                return err;
        })
    }


}
module.exports = annotatorLive


//annotatorLive.test()


