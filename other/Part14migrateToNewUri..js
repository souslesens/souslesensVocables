//const CsvTripleBuilder=require("../bin/KG/CsvTripleBuilder.")
const async = require("async");
const fs = require("fs");
const httpProxy = require("../bin/httpProxy.");
const Part14migrateToNewUri = {
    writeNewUris: function () {
        var sources = [];
        async.series([
            // list sources
            function (callbackSeries) {
                var str = fs.readFileSync("../config/sources.json");
                var allSources = JSON.parse(str);
                for (var source in allSources) {
                    if (allSources[source].schemaType == "OWL" && allSources[source].sparql_server.url == "_default") sources.push({ source: source, graphUri: allSources[source].graphUri });
                }
                callbackSeries();
            },
            // query each source
            function (callbackSeries) {
                var elt = "sub";
                async.eachSeries(
                    sources,
                    function (source, callbackEach) {
                        let query =
                            "SELECT * from <" + source.graphUri + "> WHERE {" + "  ?sub ?pred ?obj .  filter(regex(str(?" + elt + "),'http://standards.iso.org/iso/15926/part14/'))" + "  }LIMIT 10000";
                        var params = { query: query };

                        let url = "http://51.178.139.80:8890/sparql?";

                        httpProxy.post(url, null, params, function (err, _result) {
                            if (err) return callbackEach(err);

                            console.log(source.source + "\t" + item.sub.value + "\t" + item.pred.value + "\t" + item.obj.value + "\n");

                            return callbackEach(null);
                        });
                    },
                    function (err) {
                        return callbackSeries(err);
                    }
                );
            },
        ]);
    },
};
Part14migrateToNewUri.writeNewUris();
