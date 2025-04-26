var AxiomExtractor = {


    xxx: function () {
        var query = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
            "SELECT distinct ?pred from <https://spec.industrialontologies.org/ontology/202401/core/Core/> WHERE {\n" +
            "  ?sub ?pred ?obj . filter (regex(str(?pred),\"owl\") || regex(str(?pred),\"rdfs\") || regex(str(?pred),\"rdf\"))\n" +
            "} LIMIT 1000"

    }


}


module.exports = AxiomExtractor