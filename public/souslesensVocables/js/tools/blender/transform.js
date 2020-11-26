var Transform = (function () {
    var self = {}


    self.substituteUris = function (source, options, callback) {

        var graphUri = Config.sources[source].graphUri;
        var sparql_url = Config.sources[source].sparql_url

        if (!graphUri)
            return callback("no graphUri for source " + source)


        var newTriples = []
        var oldTriples = []
        async.whilst(function (test) {
            return oldTriples.length > 0

        }, function (callbackWhilst) {

            async.series([
                function (callbackSeries) {
                    var query = "PREFIX  skos:<http://www.w3.org/2004/02/skos/core#> " +
                        "  select  distinct  FROM <" + graphUri + ">  WHERE { " +
                        "?subject ?predicate ?object" +
                        "} limit 1000"


                    newTriples = []
                    oldTriples = []
                    Sparql_proxy.querySPARQL_GET_proxy(sparql_url + "?query=&format=json", query, null, function (err, result) {
                        if (err)
                            return callbackSeries(err);
                        result.results.bindings.forEach(function (item) {
                            var subject = item.subject.value;
                            if (!subject.indexOf(graphUri) < 0) {
                                oldTriples.push({subject: subject, predicate: item.predicate.value, object: item.object.value, valueType: 'uri'})
                                var newId = common.getNewUri(source)
                                newTriples.push({subject: newId, predicate: item.predicate.value, object: item.object.value, valueType: 'uri'})
                            }
                        })
                        callbackSeries();
                    })
                },
                function (callbackSeries) {
                Sparql_generic.deleteTriples()
                }

            ], function (err) {
                return callbackWhilst(err)
            })


        }, function (err) {
            return callback(err, "done")
        })
    }


    return self;

})()
