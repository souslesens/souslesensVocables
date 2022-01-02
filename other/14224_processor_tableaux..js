var processor = require("./CsvTripleBuilder.");
var sparqlServerUrl = "http://51.178.139.80:8890/sparql";

mappingsMap = {
    failureMechanism: {
        type: "owl:Class",
        topClass: "<http://data.total.com/resource/tsf/maintenance/romain_14224/5bc30a1337>",
        fileName: "D:\\NLP\\ontologies\\14224\\failureMechanism.txt",
        lookups: [],
        transform: {
            typeCode: function (value) {
                if(value=="")
                    return "";
                else
                    return "failureMechanism_"+value

            },
            subdivisionCodeNumber: function (value) {
                if(value=="")
                    return "";
                else
                    return "failureMechanism_"+value

            },
        },
        tripleModels: [
            // {s: "id", p: "rdfs:subClassOf", o: "superClass"},
            { s: "typeCode", p: "rdfs:label", o: "type" },
            { s: "typeCode", p: "skos:prefLabel", o: "typeCode" },
            { s: "typeCode", p: "rdf:type", o: "owl:Class" },
            { s: "typeCode", p: "rdfs:subClassOf", o: "http://data.total.com/resource/tsf/maintenance/romain_14224/5bc30a1337" },
            { s: "subTypeCode", p: "rdfs:label", o: "subType" },
            { s: "subTypeCode", p: "skos:prefLabel", o: "subTypeCode" },
            { s: "subTypeCode", p: "rdf:type", o: "owl:Class" },
            { s: "subTypeCode", p: "rdfs:subClassOf", o: "typeCode" },
            { s: "subTypeCode", p: "owl:comment", o: "comment" },
        ],
    },
    failureCauses: {
        type: "owl:Class",
        fileName: "D:\\NLP\\ontologies\\14224\\failureCauses.txt",
        lookups: [],
        transform: {
            CodeNumber: function (value) {
                if(value=="")
                    return "";
                else
                    return "failureCause_"+value

            },
            SubdivisionCodeNumber: function (value) {
                if(value=="")
                    return "";
                else
                    return "failureCause_"+value

            },
        },
        tripleModels: [
            // {s: "id", p: "rdfs:subClassOf", o: "superClass"},
            { s: "CodeNumber", p: "rdfs:label", o: "Notation" },
            { s: "CodeNumber", p: "skos:prefLabel", o: "CodeNumber" },
            { s: "CodeNumber", p: "rdf:type", o: "owl:Class" },
            { s: "CodeNumber", p: "rdfs:subClassOf", o: "http://data.total.com/resource/tsf/maintenance/romain_14224/43b40cf901" },
            { s: "SubdivisionCodeNumber", p: "rdfs:label", o: "Subdivision" },
            { s: "SubdivisionCodeNumber", p: "skos:prefLabel", o: "SubdivisionCodeNumber" },
            { s: "SubdivisionCodeNumber", p: "rdf:type", o: "owl:Class" },
            { s: "SubdivisionCodeNumber", p: "rdfs:subClassOf", o: "CodeNumber" },
            { s: "SubdivisionCodeNumber", p: "owl:comment", o: "Description" },
        ],
    },
    detectionMethods: {
        type: "owl:Class",
        fileName: "D:\\NLP\\ontologies\\14224\\detectionMethods.txt",
        lookups: [],
        transform: {
            Activity: function (value) {
                if(value=="")
                    return "";
                else
                    return "detectionMethod_"+value

            },
            Number: function (value) {
                if(value=="")
                    return "";
                else
                    return "detectionMethod_"+value

            },
        },
        tripleModels: [
            // {s: "id", p: "rdfs:subClassOf", o: "superClass"},
            { s: "Activity", p: "rdfs:label", o: "Activity" },
            { s: "Activity", p: "rdf:type", o: "owl:Class" },
            { s: "Activity", p: "rdfs:subClassOf", o: "http://data.total.com/resource/tsf/maintenance/romain_14224/6fd899794a" },
            { s: "Number", p: "rdfs:label", o: "Notation" },
            { s: "Number", p: "rdf:type", o: "owl:Class" },
            { s: "Number", p: "rdfs:subClassOf", o: "Activity" },
            { s: "Number", p: "owl:comment", o: "Description" },
        ],
    },

    maintenanceActivity: {
        type: "owl:Class",
        fileName: "D:\\NLP\\ontologies\\14224\\maintenanceActivity.txt",
        lookups: [],
        transform: {
            CodeNumber: function (value) {
                if(value=="")
                    return "";
                else
                    return "maintenanceActivity_"+value

            },
            Number: function (value) {
                if(value=="")
                    return "";
                else
                    return "detectionMethod_"+value

            },
        },
        tripleModels: [
            // {s: "id", p: "rdfs:subClassOf", o: "superClass"},
            { s: "CodeNumber", p: "rdfs:label", o: "Activity" },
            { s: "CodeNumber", p: "rdf:type", o: "owl:Class" },

            { s: "CodeNumber", p: "rdfs:subClassOf", o: "http://data.total.com/resource/tsf/maintenance/romain_14224/1970fa62bc" },
            { s: "CodeNumber", p: "<http://www.w3.org/2004/02/skos/core#example>", o: "Examples" ,isString:true},
            { s: "CodeNumber", p: "<http://www.lexinfo.net/ontology/2.0/lexinfo#explanation>", o: "Use",isString:true },
            { s: "CodeNumber", p: "owl:comment", o: "Description" },
        ],
    },


    failureMode: {
        type: "owl:Class",
        fileName: "D:\\NLP\\ontologies\\14224\\failureModes2.txt",
        lookups: [],
        transform: {
            Failure_mode_code: function (value) {
                if(value=="")
                    return "";
                else
                    return "failureMode_"+value

            },

        },

        tripleModels: [

            { s: "Failure_mode_code", p: "rdfs:label", o: "Description" },
            { s: "Failure_mode_code", p: "skos:prefLabel", o: "Failure_mode_code" },
            { s: "Failure_mode_code", p: "rdf:type", o: "owl:Class" },
            { s: "Failure_mode_code", p: "rdfs:subClassOf", o: "http://data.total.com/resource/tsf/maintenance/romain_14224/69a85b5298" },
            { s: "Failure_mode_code", p: "<http://www.w3.org/2004/02/skos/core#example>", o: "Examples" ,isString:true},
            { s: "Failure_mode_code", p: "_restriction", o: "System", prop: "part14:dispositionOf" },
            { s: "Failure_mode_code", p: "_restriction", o: "equipment", prop: "part14:dispositionOf" },
        ],
    },

    tsf_top_ontology: {
        type: "owl:Class",
        topClass: "<http://data.total.com/resource/tsf/maintenance/romain_14224/5bc30a1337>",
        fileName: "D:\\NLP\\ontologies\\15926\\part 14\\restrictionsAll.txt",
        lookups: [],
        transform: {
            from: function (value) {
                if(value=="")
                    return "owl:Thing";
                else
                    return value

            },
            to: function (value) {
                if(value=="")
                return "owl:Thing";
                else
                    return value

            },
        },
        tripleModels: [
            // {s: "id", p: "rdfs:subClassOf", o: "superClass"},
            { s: "from", p: "_restriction", o: "to", prop: "$property" },

        ],
    },


};

var mappingNames = ["SYSTEMS", "CLASSES_3", "CLASSES_4", "CLASSES_5", "CLASSES_6c"];
//var mappingNames = ["CLASSES_5"];
//var mappingNames = ["CLASSES_4"];
//var mappingNames = ["CLASSES_3"]

//var mappingNames = ["QUALITIES"]
var mappingNames = ["failureMode",];
var mappings = [];
mappingNames.forEach(function (mappingName) {
    mappings.push(mappingsMap[mappingName]);
});

var graphUri = "http://data.total.com/resource/tsf/iso_14224/requirements/";
var graphUri = "http://data.total.com/resource/tsf/maintenance/romain_14224/";
//processor.getDescription("D:\\NLP\\ontologies\\14224\\RDL_Structure_14224_import.txt");
if (false) {
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
    ];
    processor.clearGraph(graphUri, sparqlServerUrl, function (err, result) {
        if (err) return console.log(err);
        processor.writeTriples(triples, graphUri, sparqlServerUrl, function (err, result) {
            if (err) return console.log(err);
            processor.processSubClasses(mappings, graphUri, sparqlServerUrl);
        });
    });
}

if (true) {
  //  graphUri="http://data.total.com/resource/tsf/top_ontology/"

    processor.processSubClasses(mappings, graphUri,sparqlServerUrl);
}
