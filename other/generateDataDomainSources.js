var list = [
    "FINANCE & CONTROL",
    "CONTRACTS & PROCUREMENT",
    "HSEQ",
    "HUMAN RESOURCES",
    "FIELD MONITORING",
    "PRODUCTION PERFORMANCE",
    "WELL DESIGN & WELL OPERATIONS",
    "INDUSTRIAL LOGISTICS",
    "SPECIALTIES & KNOWLEDGE",
    "RESERVOIR",
    "2G STUDIES",
    "GEOPHYSICAL DATA",
    "GEOSPATIAL",
    "LAB DATA",
    "GEOSCIENCES WELL DATA & OPERATIONS",
    "DEVELOPMENT STUDIES",
    "INDUSTRIAL PROJECT MANAGEMENT",
    "FACILITY DESIGN",
    "FACILITY OPERATIONS",
];

var source = {
    "%s": {
        editable: true,
        allowIndividuals: true,
        graphUri: "%s",
        sparql_server: {
            url: "_default",
        },
        taxonomyPredicates: ["rdfs:subClassOf", "rdf:type"],
        imports: ["ISO_15926-part-14_PCA"],
        controller: "Sparql_OWL",
        topClassFilter: ' ?topConcept rdfs:subClassOf    ?x filter(regex(str(?x),"lis14") && ?conceptGraph =<%s/>)',

        schemaType: "OWL",
        schema: null,
        color: "#bcbd22",
        group: "TSF/DATA_DOMAINS",
    },
};

var strAll = "";
list.forEach(function (item) {
    var sourceLabel = item.replace("&", "AND");
    var graphUri = "http://data.total.com/resource/tsf/ontology/data-domains/" + item.replace("&", "").replace(" ", "-") + "/";
    graphUri = graphUri.toLowerCase();
    var str = JSON.stringify(source, null, 2);

    console.log(str, sourceLabel, graphUri, graphUri);
});

var str2 = "";
