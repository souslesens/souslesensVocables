import Sparql_common from "../sparqlProxies/sparql_common.js";
import Sparql_generic from "../sparqlProxies/sparql_generic.js";
import Sparql_proxy from "../sparqlProxies/sparql_proxy.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";

var Ontology_axioms = (function () {
    var self = {};
    Lineage_sources;

    self.getAllAxioms = function (sourceLabel) {
        if (!sourceLabel) sourceLabel = Lineage_sources.activeSource;

        var fromStr = Sparql_common.getFromStr(sourceLabel);
        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "SELECT distinct * from <https://purl.industrialontologies.org/ontology/core/Core>  from <https://purl.industrialontologies.org/ontology/core/Core> WHERE {" +
            "  ?X ?p0 ?x ." +
            "  { select ?x ?pQ ?b ?px ?b2 ?pw ?b2b from <https://purl.industrialontologies.org/ontology/core/Core>  from <https://purl.industrialontologies.org/ontology/core/Core> where{" +
            "  ?x  (owl:intersectionOf|owl:union)+ ?b." +
            "     ?x  ?pQ ?b." +
            "optional{ ?b ?px ?b2." +
            "  filter (!isBlank(?b2))}" +
            "  " +
            "  optional{ ?b ?pw ?b2b." +
            "  filter (isBlank(?b2b))" +
            "?b2b  ?pq ?q" +
            "  " +
            "      }" +
            "    }" +
            "  " +
            "  }" +
            "  " +
            " " +
            "}order by ?X ";

        var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, "topConcept", { type: "http://www.w3.org/2002/07/owl#Class" });

            return callback(null, result.results.bindings);
        });
    };

    return self;
})();

export default Ontology_axioms;
window.Ontology_axioms = Ontology_axioms;
