var processor = require("./CsvTripleBuilder.");
var util = require("../bin/util.")
var sparqlServerUrl = "http://51.178.139.80:8890/sparql";


mappingsMap = {
    failureMechanism: {
        type: "owl:Class",
        topClass: "<http://data.total.com/resource/tsf/maintenance/romain_14224/5bc30a1337>",
        fileName: "D:\\NLP\\ontologies\\14224\\failureMechanism.txt",
        lookups: [],
        transform: {
            typeCode: function (value, role) {
                if (value == "")
                    return "";
                else {
                    if (role == "s")
                        return "failureMechanism_" + value
                    else if (role == "o")
                        return value

                }
            },
            subdivisionCodeNumber: function (value, role) {
                if (value == "")
                    return "";
                else {
                    if (role == "s")
                        return "failureMechanism_" + value
                    else if (role == "o")
                        return value

                }


            },
        },
        tripleModels: [
            {s: "typeCode", p: "skos:prefLabel", o: "typeCode"},
            {s: "subTypeCode", p: "skos:prefLabel", o: "subTypeCode"},
            /*  {s: "typeCode", p: "rdfs:label", o: "type"},

              {s: "typeCode", p: "rdf:type", o: "owl:Class"},
              {
                  s: "typeCode",
                  p: "rdfs:subClassOf",
                  o: "http://data.total.com/resource/tsf/maintenance/romain_14224/5bc30a1337"
              },
              {s: "subTypeCode", p: "rdfs:label", o: "subType"},

              {s: "subTypeCode", p: "rdf:type", o: "owl:Class"},
              {s: "subTypeCode", p: "rdfs:subClassOf", o: "typeCode"},
              {s: "subTypeCode", p: "owl:comment", o: "comment"},*/
        ],
    },
    failureCauses: {
        type: "owl:Class",
        fileName: "D:\\NLP\\ontologies\\14224\\failureCauses.txt",
        lookups: [],
        transform: {
            CodeNumber: function (value, role) {
                if (value == "")
                    return "";
                else {
                    if (role == "s")
                        return "failureCause_" + value
                    else if (role == "o")
                        return value

                }


            },
            SubdivisionCodeNumber: function (value) {
                if (value == "")
                    return "";
                else
                    return "failureCause_" + value

            },
        },
        tripleModels: [
            // {s: "id", p: "rdfs:subClassOf", o: "superClass"},

            {s: "CodeNumber", p: "skos:prefLabel", o: "CodeNumber"},
            /*  {s: "CodeNumber", p: "rdf:type", o: "owl:Class"},
              {s: "CodeNumber", p: "rdfs:label", o: "Notation"},
              {
                  s: "CodeNumber",
                  p: "rdfs:subClassOf",
                  o: "http://data.total.com/resource/tsf/maintenance/romain_14224/43b40cf901"
              },*/

        ],
    },
    detectionMethods: {
        type: "owl:Class",
        fileName: "D:\\NLP\\ontologies\\14224\\detectionMethods.txt",
        lookups: [],
        transform: {
            Activity: function (value) {
                if (value == "")
                    return "";
                else
                    return "detectionMethod_" + value

            },
            Number: function (value) {
                if (value == "")
                    return "";
                else
                    return "detectionMethod_" + value

            },
        },
        tripleModels: [
            // {s: "id", p: "rdfs:subClassOf", o: "superClass"},
            // { s: "Number", p: "rdf:type", o: "owl:Class" },

            /* { s: "Activity", p: "rdfs:label", o: "Activity" },
             { s: "Activity", p: "rdf:type", o: "owl:Class" },
             { s: "Activity", p: "rdfs:subClassOf", o: "http://data.total.com/resource/tsf/maintenance/romain_14224/6fd899794a" },
             { s: "Number", p: "rdfs:label", o: "Notation" },

             { s: "Number", p: "rdfs:subClassOf", o: "Activity" },
             { s: "Number", p: "owl:comment", o: "Description" },*/
        ],
    },

    maintenanceActivity: {
        type: "owl:Class",
        fileName: "D:\\NLP\\ontologies\\14224\\maintenanceActivity.txt",
        lookups: [],
        transform: {
            CodeNumber: function (value) {
                if (value == "")
                    return "";
                else
                    return "maintenanceActivity_" + value

            },
            Number: function (value) {
                if (value == "")
                    return "";
                else
                    return "detectionMethod_" + value

            },
        },
        tripleModels: [
            // {s: "id", p: "rdfs:subClassOf", o: "superClass"},
            {s: "CodeNumber", p: "rdfs:label", o: "Activity"},
            {s: "CodeNumber", p: "rdf:type", o: "owl:Class"},

            {
                s: "CodeNumber",
                p: "rdfs:subClassOf",
                o: "http://data.total.com/resource/tsf/maintenance/romain_14224/1970fa62bc"
            },
            {s: "CodeNumber", p: "<http://www.w3.org/2004/02/skos/core#example>", o: "Examples", isString: true},
            {s: "CodeNumber", p: "<http://www.lexinfo.net/ontology/2.0/lexinfo#explanation>", o: "Use", isString: true},
            {s: "CodeNumber", p: "owl:comment", o: "Description"},
        ],
    },


    failureMode: {
        type: "owl:Class",
        fileName: "D:\\NLP\\ontologies\\14224\\failureModes2.txt",
        lookups: [],
        transform: {
            Failure_mode_code: function (value, role) {

                if (value == "")
                    return "";
                else {
                    if (role == "s")
                        return "failureMode_" + value
                    else if (role == "o")
                        return value

                }

            },
            SystemXX: function (value) {
                if (value == "")
                    return "";
                else
                    var x = "http://data.total.com/resource/tsf/iso_14224/" + util.formatStringForTriple(value, true)
                return x;

            },
            equipmentXX: function (value) {
                if (value == "")
                    return "";
                else
                    return "http://data.total.com/resource/tsf/iso_14224/" + util.formatStringForTriple(value, true)

            },

        },

        tripleModels: [


            //   {s: "Failure_mode_code", p: "skos:prefLabel", o: "Failure_mode_code"},
            /*   { s: "Failure_mode_code", p: "rdfs:label", o: "Description" },

                     { s: "Failure_mode_code", p: "rdf:type", o: "owl:Class" },
                      { s: "Failure_mode_code", p: "rdfs:subClassOf", o: "http://data.total.com/resource/tsf/maintenance/romain_14224/69a85b5298" },
                      { s: "Failure_mode_code", p: "<http://www.w3.org/2004/02/skos/core#example>", o: "Examples" ,isString:true},*/
            {s: "Failure_mode_code", p: "_restriction", o: "System", prop: "part14:dispositionOf"},
            {s: "Failure_mode_code", p: "_restriction", o: "equipment", prop: "part14:dispositionOf"},
        ],
    },


    tsf_top_ontology: {
        type: "owl:Class",
        topClass: "<http://data.total.com/resource/tsf/maintenance/romain_14224/5bc30a1337>",
        fileName: "D:\\NLP\\ontologies\\15926\\part 14\\restrictionsAll.txt",
        lookups: [],
        transform: {
            from: function (value) {
                if (value == "")
                    return "owl:Thing";
                else
                    return value

            },
            to: function (value) {
                if (value == "")
                    return "owl:Thing";
                else
                    return value

            },
        },
        tripleModels: [
            // {s: "id", p: "rdfs:subClassOf", o: "superClass"},
            {s: "from", p: "_restriction", o: "to", prop: "$property"},

        ],
    },


    QUALITIES: {
        type: "owl:Class",
        fileName: "D:\\NLP\\ontologies\\14224\\qualities2.txt",
        lookups: [],

        transform: {

            line: function (value) {
                return "equip-data-" + value;
            },
            "code": function (value) {
                return "http://data.total.com/resource/tsf/maintenance/romain_14224/" + value;
            },


        },
        //line	table	item	code	Name	Description	type	physicalQuantity	ListId	UnitCodeList	Priority
        tripleModels: [
            {
                s: "code", p: "_restriction", o: "line", prop: function (line, mapping) {
                    return line.physicalQuantity ? "part14:hasPhysicalQuantity" : "part14:hasQuality"
                }
            },

            {s: "line", p: "rdf:type", o: "owl:Class"},
            {s: "line", p: "rdfs:label", o: "Name"},
            {
                s: "line",
                p: "rdfs:subClassOf",
                o: "http://data.total.com/resource/tsf/maintenance/romain_14224/b08e3714de"
            },

            {
                s: "line", p: "rdf:type", o: function (line, mapping) {
                    if (line.type == "PQ")
                        return "part14:PhysicalQuantity"
                    else if (line.type == "Bool")
                        return "xsd:boolean"
                    else if (line.type == "Number")
                        return "xsd:decimal"
                    else if (line.type == "List")
                        return "https://www.jip36-cfihos.org/ontology/cfihos_1_5/EAID_B46F0548_B6C4_4f59_9846_3BE8F5F49AA2"
                    else
                        return "xsd:string"
                }
            },


        ],
    },

};

var mappingNames = ["SYSTEMS", "CLASSES_3", "CLASSES_4", "CLASSES_5", "CLASSES_6c"];
//var mappingNames = ["CLASSES_5"];
//var mappingNames = ["CLASSES_4"];
//var mappingNames = ["CLASSES_3"]

//var mappingNames = ["QUALITIES"]
var mappingNames = ["QUALITIES",];
var mappings = [];
mappingNames.forEach(function (mappingName) {
    mappings.push(mappingsMap[mappingName]);
});

var graphUri = "http://data.total.com/resource/tsf/iso_14224/requirements/";
var graphUri = "http://data.total.com/resource/tsf/maintenance/romain_14224/";
//processor.getDescription("D:\\NLP\\ontologies\\14224\\RDL_Structure_14224_import.txt");


if (true) {
    //  graphUri="http://data.total.com/resource/tsf/top_ontology/"

    processor.processSubClasses(mappings, graphUri, sparqlServerUrl);
}
