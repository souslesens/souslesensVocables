var processor = require("./CsvTripleBuilder.");
var util = require("../bin/util.")
var sparqlServerUrl = "http://51.178.139.80:8890/sparql";


mappingsMap = {


    locations: {
        type: "owl:Class",
        topClass: "<http://data.total.com/resource/tsf/maintenance/romain_14224/5bc30a1337>",
        fileName: "D:\\NLP\\ontologies\\ISO 81346\\Readi_81346_Locations.txt",
        lookups: [],
        transform: {
            Class: function (value, role) {
                if (value == "")
                    return "";
                else {
                    if (role == "s")
                        return "location" + value
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

        //Class	Parent_1	Parent_2	Parent_3
        tripleModels: [

             {s: "Class", p: "rdfs:label", o: "Class",isString:"true"},
               {s: "Class", p: "rdf:type", o: "http://data.total.com/resource/tsf/IEC_ISO_81346/Location"},
                 {s: "Class", p: "rdf:type", o: "owl:Class"},

            { s: "Class",
                   p: "rdfs:subClassOf",
                   o: "http://data.total.com/resource/tsf/maintenance/romain_14224/5bc30a1337"
               },



        ],
    },

};

var mappingNames = ["SYSTEMS", "CLASSES_3", "CLASSES_4", "CLASSES_5", "CLASSES_6c"];
//var mappingNames = ["CLASSES_5"];
//var mappingNames = ["CLASSES_4"];
//var mappingNames = ["CLASSES_3"]

var mappingNames = ["QUALITIES"]
//var mappingNames = ["failureMechanism","failureCauses","detectionMethods","maintenanceActivity","failureMode"];
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
