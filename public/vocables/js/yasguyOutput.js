var YasguyOutput = (function () {
    var self = {};

    self.xx = function (data) {
        // Set and draw a SPARQL response. The parameter is either
        // - a plain response string
        // - a SuperAgent response
        // - or an object with the specified keys
        yasr.setResponse({
            data: data,
            contentType: "application/sparql-results+json",
            status: 200,
            executionTime: 1000, // ms
            // error to show
        });

        // Draw results with current plugin
        yasr.draw();

        // Check whether a result has been drawn
        yasr.somethingDrawn();

        // Select a plugin
        yasr.selectPlugin("table");

        // Download a result set (if possible)
        yasr.download();
    };

    self.draw = function (data) {
        var query =
            " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX  skos:<http://www.w3.org/2004/02/skos/core#>  select  distinct *  FROM   <http://souslesens.org/resource/stratigraphie/>    WHERE {    ?collection skos:member* ?acollection. filter( ?collection=<http://souslesens.org/resource/stratigraphie/00001f4b56>).?acollection rdf:type skos:Collection.    ?collection skos:prefLabel ?collectionLabel.   ?acollection skos:prefLabel ?acollectionLabel. \n" +
            "?acollection skos:member ?collSubject. ?subject skos:broader* ?collSubject. ?subject skos:prefLabel ?subjectLabel\n" +
            "} limit 10000";
        var url = "http://51.178.139.80:8890/sparql?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: "stratigraphie" }, function (err, result) {
            if (err) {
                return callback(err);
            }
            var yasr = new YASR();
            yasr.selectPlugin("table");
            yasr.draw();
        });
    };

    return self;
})();
