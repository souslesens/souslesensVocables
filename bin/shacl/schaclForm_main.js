import ShaclFormEngine from "./ShaclFormEngine";

var shaclForm_main = {
    restrictionsToShacl: function (graphUri, classUri, callback) {
        var sparql =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
            "PREFIX sh: <http://www.w3.org/ns/shacl#> \n" +
            "\n" +
            "CONSTRUCT {\n" +
            "  ?shape a sh:NodeShape ;\n" +
            "         sh:targetClass ?class ;\n" +
            "         sh:property [\n" +
            "           sh:path ?property ;\n" +
            "           sh:class ?valueClass ;\n" +
            "         ] .\n" +
            "}\n" +
            "WHERE {\n" +
            "  graph <" +
            graphUri +
            "> {\n" +
            "  ?class rdfs:subClassOf ?restriction .\n" +
            "  ?restriction a owl:Restriction ;\n" +
            "               owl:onProperty ?property ;\n" +
            "               owl:someValuesFrom ?valueClass .\n" +
            "\n" +
            "\n" +
            '  BIND(IRI(CONCAT(STR(?class), "Shape")) AS ?shape)\n' +
            "  }\n" +
            "    filter (?class=<" +
            classUri +
            ">)\n" +
            "}";

        shaclForm_main.executeQuery(sparql, function (err, result) {
            callback(err, result);
        });
    },
    executeQuery: function (query, callback) {
        var sparqlServerUrl = "http://51.178.139.80:8890/sparql";
        var params = { query: query };

        if (true) {
            //(ConfigManager.config && ConfigManager.config.sparql_server.user)) {
        }
        var headers = { "Content-Type": "text/turtle; charset=UTF-8" };

        httpProxy.post(sparqlServerUrl, headers, params, function (err, result) {
            callback(err, result);
        });
    },
};

/*"http://51.178.139.80:8890/sparql",
    "user": "dba",
    "password": "sls#209"*/

shaclForm_main.restrictionsToShacl("https://jip36-cfihos/rdl-iof/", "https://jip36-cfihos/rdl-iof/tag-CFIHOS-30000638", function (err, result) {
    console.log(result);

    var fo;

    return callback(null, result);
});

export default shaclForm_main;
