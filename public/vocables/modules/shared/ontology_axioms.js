import Sparql_common from "../sparqlProxies/sparql_common.js";
import Sparql_generic from "../sparqlProxies/sparql_generic.js";
import Sparql_proxy from "../sparqlProxies/sparql_proxy.js";

var Ontology_axioms = (function () {
    var self = {};

    self.getAllAxioms = function (sourceLabel) {
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
    };

    return self;
})();

export default Ontology_axioms;
window.Ontology_axioms = Ontology_axioms;
