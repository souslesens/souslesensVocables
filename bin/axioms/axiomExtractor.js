import util from "../util.js";
import { parseString } from "xml2js";

var AxiomExtractor = {
    xxx: function () {
        var queryRestriction =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            " PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "SELECT distinct *  FROM   <https://spec.industrialontologies.org/ontology/202401/core/Core/> \n" +
            "WHERE {{ ?subject rdfs:subClassOf ?node.  ?node rdf:type owl:Restriction.  ?node owl:onProperty ?prop .\n" +
            "    ?node ?constraintType ?value. optional {?node ?cardinalityType ?cardinalityValue filter (?cardinalityType in (owl:maxCardinality,owl:minCardinality,owl:cardinality,owl:maxQualifiedCardinality,owl:minQualifiedCardinality,owl:qualifiedCardinality ))}  filter (?constraintType in (owl:someValuesFrom, owl:allValuesFrom,owl:hasValue,owl:onClass))  } } limit 10000";

        var queryDisjoint =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            " PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            " SELECT distinct *  FROM   <https://spec.industrialontologies.org/ontology/202401/core/Core/> \n" +
            "WHERE {\n" +
            "\n" +
            "  { ?subject (owl:intersectionOf | owl:unionOf |owl:disjointWith)?disjoint. ?disjoint (rdf:first|rdf:rest*) ?node.  \n" +
            "  }\n" +
            "} limit 10000";
    },

    axiomTextToTriples: function (axiomText) {
        var triples = [];

        function recurse(node) {
            for (var key in node) {
                if (key == "xx") {
                    // blankNode
                    var subject = "_:" + util.getRandomHexaId(8);
                    node[key].forEach(function (child) {
                        if (child == "__") {
                        } else {
                        }
                    });
                } else if (key == "__") {
                }
            }
        }

        axiomText = axiomText.replace(/</g, "").replace(/>/g, "");

        var str = axiomText.replace(/\(/g, "<xx>").replace(/\)/g, "</xx>");
        // parseString imported at top of file
        var xml = "<xml>" + str + "</xml>";
        parseString(xml, function (err, result) {
            recurse(result);
        });
    },
};

export default AxiomExtractor;
if (false) {
    var input =
        "Axiom:EquivalentClasses(<https://spec.industrialontologies.org/ontology/core/Core/GainOfRole> ObjectIntersectionOf(<http://purl.obolibrary.org/obo/BFO_0000015> ObjectIntersectionOf(ObjectSomeValuesFrom(<http://purl.obolibrary.org/obo/BFO_0000199> ObjectIntersectionOf(<http://purl.obolibrary.org/obo/BFO_0000202> ObjectUnionOf(ObjectSomeValuesFrom(<https://spec.industrialontologies.org/ontology/core/Core/meets> ObjectIntersectionOf(<http://purl.obolibrary.org/obo/BFO_0000202> ObjectSomeValuesFrom(ObjectInverseOf(<http://purl.obolibrary.org/obo/BFO_0000108>) <http://purl.obolibrary.org/obo/BFO_0000023>))) ObjectSomeValuesFrom(<https://spec.industrialontologies.org/ontology/core/Core/temporallyOverlaps> ObjectIntersectionOf(<http://purl.obolibrary.org/obo/BFO_0000202> ObjectSomeValuesFrom(ObjectInverseOf(<http://purl.obolibrary.org/obo/BFO_0000108>) <http://purl.obolibrary.org/obo/BFO_0000023>))) ObjectSomeValuesFrom(<https://spec.industrialontologies.org/ontology/core/Core/temporallyStarts> ObjectIntersectionOf(<http://purl.obolibrary.org/obo/BFO_0000202> ObjectSomeValuesFrom(ObjectInverseOf(<http://purl.obolibrary.org/obo/BFO_0000108>) <http://purl.obolibrary.org/obo/BFO_0000023>)))))) ObjectSomeValuesFrom(<https://spec.industrialontologies.org/ontology/core/Core/hasOutput> <http://purl.obolibrary.org/obo/BFO_0000023>)) ObjectSomeValuesFrom(<http://purl.obolibrary.org/obo/BFO_0000167> ObjectIntersectionOf(<http://purl.obolibrary.org/obo/BFO_0000004> ObjectComplementOf(<http://purl.obolibrary.org/obo/BFO_0000006>)))))";
    input =
        "(<https://spec.industrialontologies.org/ontology/core/Core/MaterialArtifact> ObjectIntersectionOf(<http://purl.obolibrary.org/obo/BFO_0000030> ObjectSomeValuesFrom(<http://purl.obolibrary.org/obo/BFO_0000196> <https://spec.industrialontologies.org/ontology/core/Core/DesignedFunction>)))";

    AxiomExtractor.axiomTextToTriples(input);
}

var directDraw = function () {
    var axiom =
        "<https://spec.industrialontologies.org/ontology/core/Core/ServiceProvider> ObjectIntersectionOf(ObjectUnionOf(<https://spec.industrialontologies.org/ontology/core/Core/Organization> <https://spec.industrialontologies.org/ontology/core/Core/Person>) ObjectSomeValuesFrom(<https://spec.industrialontologies.org/ontology/core/Core/hasRole> <https://spec.industrialontologies.org/ontology/core/Core/ServiceProviderRole>)))";

    var visjData = { nodes: [], edges: [] };
    var currentword = "";
    var state = null;
    for (var i = 0; i < axiom.length; i++) {
        var char = axiom.charAt(i);
        if (char == "<") {
            state = "URI";
        } else if (char == ">") {
            state = null;
            visjData.nodes.push(currentword);
            currentword = "";
        } else {
            if (state == "URI") {
                currentword += char;
            }
        }
    }

    var x = visjData.nodes;
};

directDraw();

/**
import fs from "fs";
 var file="C:\\Users\\claud\\Downloads\\VaccineOntology.ttl"

 var str=""+fs.readFileSync(file)
 var str2=str.replace(/"(_:.*)"/gm,function(match,p1){
 return "<"+p1+">"
 })
 var file2="C:\\Users\\claud\\Downloads\\VaccineOntology2.ttl"
 fs.writeFileSync(file2,str2)**/
