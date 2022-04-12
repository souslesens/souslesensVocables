var processor = require("../bin/KG/CsvTripleBuilder.");

// var x = [
//     "classFamily",
//     "classDescription",
//     "subClass",
//     "subClassDescription",
//     "fLRecommended",
//     "eQManagement",
//     "classType",
//     "owner",
//     "equipmentCategory",
//     "fAMERelevant",
//     "subseaApplicable",
//     "catISO14224",
//     "action2021",
// ];
let mappingsMap = {
    CLASSES: {
        type: "owl:Class",
        topClass: "<http://w3id.org/readi/rdl/CFIHOS-30000311>",
        fileName: "D:\\NLP\\ontologies\\MIE\\GSEP207classes.txt",
        lookups: [],
        transform: {
            catISO14224: function (value) {
                return "http://data.total.com/resource/tsf/iso_14224/" + value.substring(3);
            },
        },
        tripleModels: [
            { s: "classFamily", p: "rdfs:label", o: "classDescription" },
            { s: "subClass", p: "rdfs:subClassOf", o: "http://w3id.org/readi/rdl/CFIHOS-30000311" },
            { s: "classFamily", p: "rdf:type", o: "owl:Class" },
            { s: "subClass", p: "rdf:type", o: "http://w3id.org/readi/rdl/CFIHOS-30000311" },

            { s: "subClass", p: "rdfs:subClassOf", o: "classFamily" },
            { s: "subClass", p: "rdf:type", o: "owl:Class" },
            { s: "subClass", p: "rdf:type", o: "http://w3id.org/readi/rdl/CFIHOS-30000311" },
            { s: "subClass", p: "rdfs:label", o: "subClassDescription" },
            // {s: "subClass",p: "_restriction",  o: "catISO14224",prop: "owl:sameAs"},
            { s: "subClass", p: "owl:sameAs", o: "catISO14224" },
            { s: "catISO14224", p: "rdf:type", o: "http://w3id.org/readi/rdl/CFIHOS-30000311" },

            { s: "subClass", p: "_restriction", o: "owner", prop: "part14:interestOf" },
            { s: "owner", p: "rdfs:label", o: "owner" },
            { s: "owner", p: "rdf:type", o: "owl:Class" },
            { s: "owner", p: "rdf:type", o: "http://w3id.org/readi/z018-rdl/Discipline" },
            { s: "owner", p: "rdfs:subClassOf", o: "http://w3id.org/readi/z018-rdl/Discipline" },
        ],
    },
    SYSTEM: {
        type: "owl:Class",
        topClass: "<http://w3id.org/readi/z018-rdl/prod_SYS>",
        fileName: "D:\\NLP\\ontologies\\MIE\\GS_EP_EXP_207_09_Systems_Units.txt",
        transform: {
            label2: function (value) {
                return "Pack-" + value;
            },
        },
        lookups: [],
        tripleModels: [
            // {s: "id", p: "rdfs:subClassOf", o: "superClass"},
            { s: "system", p: "rdfs:label", o: "system" },
            { s: "system", p: "rdf:type", o: "http://w3id.org/readi/z018-rdl/prod_SYS" },
            { s: "system", p: "rdfs:subClassOf", o: "http://w3id.org/readi/z018-rdl/prod_SYS" },
            { s: "unit", p: "rdfs:label", o: "unitDescription" },
            { s: "unit", p: "rdf:type", o: "http://w3id.org/readi/z018-rdl/prod_SYS" },
            // {s: "unit", p: "rdfs:subClassOf", o: "http://w3id.org/readi/z018-rdl/prod_SYS"},
            { s: "unit", p: "rdfs:subClassOf", o: "system" },
        ],
    },
    CLASSES_4: {
        type: "owl:Class",
        topClass: "<http://w3id.org/readi/rdl/CFIHOS-30000311>",
        fileName: "D:\\NLP\\ontologies\\14224\\classes_4.txt",
        lookups: [],
        transform: {
            label2: function (value) {
                return "Class" + value;
            },
        },
        tripleModels: [
            { s: "id", p: "rdfs:subClassOf", o: "superClass" },
            { s: "id", p: "skos:prefLabel", o: "label1" },
            { s: "id", p: "rdfs:label", o: "label2" },
            //  {s: "id", p:"_restriction" , o: "system",prop:"part14:functionalPartOf"},
        ],
    },
    CLASSES_5: {
        type: "owl:Class",
        topClass: "<http://standards.iso.org/iso/15926/part14/FunctionalObject>",
        fileName: "D:\\NLP\\ontologies\\14224\\classes_5.txt",
        transform: {
            label2: function (value) {
                return "Fn-" + value;
            },
        },
        lookups: [],
        tripleModels: [
            { s: "id", p: "skos:prefLabel", o: "label1" },
            { s: "id", p: "rdfs:label", o: "label2" },
            { s: "id", p: "_restriction", o: "superClass", prop: "part14:hasFunctionalPart" },
        ],
    },
    CLASSES_6c: {
        type: "owl:Class",
        topClass: "<http://w3id.org/readi/rdl/Z101001232>",
        fileName: "D:\\NLP\\ontologies\\14224\\classes_6c.txt",
        transform: {
            rDLDescriptionEN: function (value) {
                return "Cmpt-" + value;
            },
        },
        lookups: [],
        tripleModels: [
            { s: "rDLLibrary", p: "rdfs:label", o: "rDLDescriptionEN" },
            { s: "rDLLibrary", p: "skos:prefLabel", o: "rDLLibrary" },
            { s: "rDLLibrary", p: "_restriction", o: "rDLParent", prop: "part14:concretizes" },
            { s: "rDLLibrary", p: "_restriction", o: "cLASSLink", prop: "part14:assembledPartOf" },
        ],
    },
    CLASSES_6_XXX: {
        type: "owl:Class",
        topClass: "<http://w3id.org/readi/rdl/CFIHOS-30000311>",
        fileName: "D:\\NLP\\ontologies\\14224\\classes_6.txt",
        transform: {
            label2: function (value) {
                return "Cmpt-" + value;
            },
        },
        lookups: [],
        tripleModels: [
            { s: "component", p: "skos:prefLabel", o: "componentCode" },
            { s: "component", p: "rdfs:label", o: "label2" },
            { s: "component", p: "_restriction", o: "superClass", prop: "part14:hasAssembledPart" },
            { s: "component", p: "_restriction", o: "class4", prop: "part14:hasAssembledPart" },
        ],
    },
    // Equipment	Attribute	Description	Unit_Code_List	Priority
    QUALITIES: {
        //   type: "owl:NamedIndividual",
        topClass: null,
        fileName: "D:\\NLP\\ontologies\\14224\\qualities.txt",
        transform: {
            attribute: function (value) {
                return "Qty-" + value;
            },
            priority: function (value) {
                if (value == "High") return "https://w3id.org/requirement-ontology/rdl/REQ_0011";
                else if (value == "Low") return "https://w3id.org/requirement-ontology/rdl/REQ_0010";
                else return "https://w3id.org/requirement-ontology/rdl/REQ_0007";
            },
        },
        lookups: [],
        tripleModels: [
            { s: "req:REQ_0008", p: "rdf:type", o: "owl:ObjectProperty" },
            { s: "req:REQ_0008", p: "rdfs:label", o: "has SCD clause", o_type: "fixed" },
            { s: "req:REQ_0020", p: "rdf:type", o: "owl:ObjectProperty" },
            { s: "req:REQ_0020", p: "rdfs:label", o: "#has demand", o_type: "fixed" },
            { s: "req:REQ_0021", p: "rdf:type", o: "owl:ObjectProperty" },
            { s: "req:REQ_0021", p: "rdfs:label", o: "has scope", o_type: "fixed" },

            { s: "clauseId", p: "rdf:type", o: "priority" },
            { s: "clauseId", p: "rdf:type", o: "req:REQ_0008", o_type: "fixed" }, // SDC clause
            { s: "clauseId", p: "rdf:type", o: "owl:NamedIndividual" },
            { s: "clauseId", p: "rdfs:label", o: "" },
            { s: "clauseId", p: "owl:comment", o: "description" },

            { s: "clauseId", p: "req:REQ_0021", o: "equipmentId" }, //scope
            { s: "equipmentId", p: "rdfs:label", o: "equipmentId" },
            { s: "equipmentId", p: "rdf:type", o: "owl:Class" },

            { s: "clauseId", p: "req:REQ_0020", o: "physicalQuantity" }, //scope  if physicalQuantity
            { s: "physicalQuantity", p: "rdfs:label", o: "physicalQuantity" },
            { s: "physicalQuantity", p: "rdf:type", o: "part14:PhysicalQuantity" },
            { s: "physicalQuantity", p: "rdf:type", o: "owl:Class" },

            { s: "clauseId", p: "req:REQ_0020", o: "datatype" }, //scope
            { s: "datatype", p: "rdfs:label", o: "datatype" },
            { s: "datatype", p: "rdf:type", o: "part14:Quality" },
            { s: "datatype", p: "rdf:type", o: "owl:Class" },

            { s: "clauseId", p: "req:REQ_0020", o: "pickList" }, //scope
            { s: "pickList", p: "rdfs:label", o: "pickList" },
            { s: "pickList", p: "rdf:type", o: "http://w3id.org/readi/rdl/D101001535" },
            { s: "pickList", p: "rdf:type", o: "owl:Class" },
        ],
    },
};

var mappingNames = ["CLASSES", "SYSTEM"];

//var mappingNames = ["CLASSES_6c",];
var mappings = [];
mappingNames.forEach(function (mappingName) {
    mappings.push(mappingsMap[mappingName]);
});

var graphUri = "http://data.total.com/resource/tsf/gs_ep_exp_207_11/";
var sparqlServerUrl = "http://51.178.139.80:8890/sparql";
if (mappings.length == 1) return processor.processSubClasses(mappings, graphUri, sparqlServerUrl);
var triples = [
    { s: "<http://w3id.org/readi/z018-rdl/prod_SYS>", p: "rdfs:label", o: "'READI_SYTEMS'" },
    { s: "<http://w3id.org/readi/z018-rdl/prod_SYS>", p: "rdf:type", o: "owl:Class" },
    {
        s: "<http://w3id.org/readi/z018-rdl/prod_SYS>",
        p: "rdfs:subClassOf",
        o: "<http://standards.iso.org/iso/15926/part14/System>",
    },
    { s: "<http://w3id.org/readi/rdl/CFIHOS-30000311>", p: "rdfs:label", o: "'READI_ARTEFACT'" },
    { s: "<http://w3id.org/readi/rdl/CFIHOS-30000311>", p: "rdf:type", o: "owl:Class" },
    {
        s: "<http://w3id.org/readi/rdl/CFIHOS-30000311>",
        p: "rdfs:subClassOf",
        o: "<http://w3id.org/readi/rdl/D101001053>",
    },

    {
        s: "<http://standards.iso.org/iso/15926/part14/FunctionalObject>",
        p: "rdfs:label",
        o: "'PART_14_Functional_Object'",
    },
    { s: "<http://standards.iso.org/iso/15926/part14/FunctionalObject>", p: "rdf:type", o: "owl:Class" },
    {
        s: "<http://standards.iso.org/iso/15926/part14/FunctionalObject>",
        p: "rdfs:subClassOf",
        o: "<http://standards.iso.org/iso/15926/part14/FunctionalObject>",
    },

    {
        s: "<http://w3id.org/readi/rdl/Z101001232>",
        p: "rdfs:label",
        o: "'IEC/ISO 81346 Component'",
    },

    { s: "<http://w3id.org/readi/rdl/Z101001232>", p: "rdf:type", o: "owl:Class" },
    {
        s: "<http://w3id.org/readi/rdl/Z101001232>",
        p: "rdfs:subClassOf",
        o: "<http://w3id.org/readi/rdl/Z101001232>",
    },

    {
        s: "<http://w3id.org/readi/z018-rdl/Discipline>",
        p: "rdfs:label",
        o: "'Discipline'",
    },

    { s: "<http://w3id.org/readi/z018-rdl/Discipline>", p: "rdf:type", o: "owl:Class" },
    {
        s: "<http://w3id.org/readi/z018-rdl/Discipline>",
        p: "rdfs:subClassOf",
        o: "<http://w3id.org/readi/z018-rdl/Discipline>",
    },
];

//   var graphUri = "http://data.total.com/resource/tsf/gs_ep_exp_207_11/";

processor.clearGraph(graphUri, sparqlServerUrl, function (err, _result) {
    if (err) return console.log(err);
    processor.writeTriples(triples, graphUri, sparqlServerUrl, function (err, _result) {
        if (err) return console.log(err);
        processor.processSubClasses(mappings, graphUri, sparqlServerUrl);
    });
});

// if (false) {
//     var mappingNames = ["CLASSES_4"];
//     processor.processSubClasses(mappings, graphUri);
// }
