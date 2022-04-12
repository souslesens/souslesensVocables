var processor = require("../bin/KG/CsvTripleBuilder.");
var sparqlServerUrl = "http://51.178.139.80:8890/sparql";

var decode81346 = function (str) {
    var regex = /(?<code>[A-Z]{3}[1|2|3] [A-Z]{1,3}) (?<label>[A-z \-\/]{3,})/;
    var array = regex.exec(str);
    return array.groups;
};

module.exports = decode81346;

mappingsMap = {
    LOCATIONS: {
        type: "owl:Class",

        fileName: "D:\\NLP\\ontologies\\ISO 81346\\Readi_81346_Locations.txt",
        lookups: [],
        transform: {},

        //Class	Parent_1	Parent_2	Parent_3
        tripleModels: [
            { s: "Class", p: "skos:prefLabel", o: "Class", isString: "true" },
            { s: "Class", p: "rdf:type", o: "http://data.total.com/resource/tsf/IEC_ISO_81346/Location" },
            { s: "Class", p: "rdf:type", o: "owl:Class" },
            { s: "Class", p: "rdfs:subClassOf", o: "Parent_1" },
            {
                s: "Class",
                p: "iso81346:hasCode",
                o: function (line, _item) {
                    return "'" + decode81346(line.Class).code + "'";
                },
            },
            {
                s: "Class",
                p: "rdfs:label",
                o: function (line, _item) {
                    return "'" + decode81346(line.Class).label + "'";
                },
            },

            { s: "Parent_1", p: "skos:prefLabel", o: "Parent_1", isString: "true" },
            { s: "Parent_1", p: "rdf:type", o: "http://data.total.com/resource/tsf/IEC_ISO_81346/Location" },
            { s: "Parent_1", p: "rdf:type", o: "owl:Class" },
            { s: "Parent_1", p: "rdfs:subClassOf", o: "Parent_2" },
            {
                s: "Parent_1",
                p: "iso81346:hasCode",
                o: function (line, _item) {
                    return "'" + decode81346(line.Parent_1).code + "'";
                },
            },
            {
                s: "Parent_1",
                p: "rdfs:label",
                o: function (line, _item) {
                    return "'" + decode81346(line.Parent_1).label + "'";
                },
            },

            { s: "Parent_2", p: "skos:prefLabel", o: "Parent_2", isString: "true" },
            { s: "Parent_2", p: "rdf:type", o: "http://data.total.com/resource/tsf/IEC_ISO_81346/Location" },
            { s: "Parent_2", p: "rdf:type", o: "owl:Class" },
            { s: "Parent_2", p: "rdfs:subClassOf", o: "top" },
            {
                s: "Parent_2",
                p: "iso81346:hasCode",
                o: function (line, _item) {
                    return "'" + decode81346(line.Parent_2).code + "'";
                },
            },
            {
                s: "Parent_2",
                p: "rdfs:label",
                o: function (line, _item) {
                    return "'" + decode81346(line.Parent_2).label + "'";
                },
            },

            { s: "top", p: "rdfs:label", o: "top", isString: "true" },
            { s: "top", p: "rdf:type", o: "http://data.total.com/resource/tsf/IEC_ISO_81346/Location" },
            { s: "top", p: "rdf:type", o: "owl:Class" },
            { s: "top", p: "rdfs:subClassOf", o: "part14:Site" },

            { s: "part14:Site", p: "rdf:type", o: "http://data.total.com/resource/tsf/IEC_ISO_81346/topClass" },
            { s: "part14:Site", p: "rdf:type", o: "owl:Class" },
        ],
    },

    FUNCTIONS: {
        type: "owl:Class",

        fileName: "D:\\NLP\\ontologies\\ISO 81346\\Readi_81346_Functions.txt",
        lookups: [],
        transform: {},
        //   Class	Parent_1	Parent_2	Parent_3	Parent_4	Parent_5

        //Class	Parent_1	Parent_2	Parent_3
        tripleModels: [
            { s: "Class", p: "skos:prefLabel", o: "Class", isString: "true" },
            { s: "Class", p: "rdf:type", o: "http://data.total.com/resource/tsf/IEC_ISO_81346/System" },
            { s: "Class", p: "rdf:type", o: "owl:Class" },
            { s: "Class", p: "rdfs:subClassOf", o: "Parent_1" },
            {
                s: "Class",
                p: "iso81346:hasCode",
                o: function (line, _item) {
                    return "'" + decode81346(line.Class).code + "'";
                },
            },
            {
                s: "Class",
                p: "rdfs:label",
                o: function (line, _item) {
                    return "'" + decode81346(line.Class).label + "'";
                },
            },

            { s: "Parent_1", p: "skos:prefLabel", o: "Parent_1", isString: "true" },
            { s: "Parent_1", p: "rdf:type", o: "http://data.total.com/resource/tsf/IEC_ISO_81346/System" },
            { s: "Parent_1", p: "rdf:type", o: "owl:Class" },
            { s: "Parent_1", p: "rdfs:subClassOf", o: "top" },
            {
                s: "Parent_1",
                p: "iso81346:hasCode",
                o: function (line, _item) {
                    return "'" + decode81346(line.Parent_1).code + "'";
                },
            },
            {
                s: "Parent_1",
                p: "rdfs:label",
                o: function (line, _item) {
                    return "'" + decode81346(line.Parent_1).label + "'";
                },
            },

            { s: "top", p: "rdfs:label", o: "top", isString: "true" },
            { s: "top", p: "rdf:type", o: "http://data.total.com/resource/tsf/IEC_ISO_81346/System" },
            { s: "top", p: "rdf:type", o: "owl:Class" },
            { s: "top", p: "rdfs:subClassOf", o: "part14:System" },

            { s: "part14:System", p: "rdf:type", o: "http://data.total.com/resource/tsf/IEC_ISO_81346/topClass" },
            { s: "part14:System", p: "rdf:type", o: "owl:Class" },
        ],
    },

    FUNCTIONS_SYS3: {
        type: "owl:Class",

        fileName: "D:\\NLP\\ontologies\\ISO 81346\\Readi_81346_Functions_SYS3.txt",
        lookups: [],
        transform: {},

        //Class	Parent_1	Parent_2	Parent_3
        tripleModels: [
            { s: "Parent_1", p: "skos:prefLabel", o: "Parent_1", isString: "true" },
            { s: "Parent_1", p: "rdf:type", o: "http://data.total.com/resource/tsf/IEC_ISO_81346/FunctionalObject" },
            { s: "Parent_1", p: "rdf:type", o: "owl:Class" },
            { s: "Parent_1", p: "rdfs:subClassOf", o: "Parent_2" },
            {
                s: "Parent_1",
                p: "iso81346:hasCode",
                o: function (line, _item) {
                    return "'" + decode81346(line.Parent_1).code + "'";
                },
            },
            {
                s: "Parent_1",
                p: "rdfs:label",
                o: function (line, _item) {
                    return "'" + decode81346(line.Parent_1).label + "'";
                },
            },

            { s: "Parent_2", p: "skos:prefLabel", o: "Parent_2", isString: "true" },
            { s: "Parent_2", p: "rdf:type", o: "http://data.total.com/resource/tsf/IEC_ISO_81346/FunctionalObject" },
            { s: "Parent_2", p: "rdf:type", o: "owl:Class" },
            { s: "Parent_2", p: "rdfs:subClassOf", o: "Parent_3" },
            {
                s: "Parent_2",
                p: "iso81346:hasCode",
                o: function (line, _item) {
                    return "'" + decode81346(line.Parent_2).code + "'";
                },
            },
            {
                s: "Parent_2",
                p: "rdfs:label",
                o: function (line, _item) {
                    return "'" + decode81346(line.Parent_2).label + "'";
                },
            },

            { s: "Parent_3", p: "skos:prefLabel", o: "Parent_2", isString: "true" },
            { s: "Parent_3", p: "rdf:type", o: "http://data.total.com/resource/tsf/IEC_ISO_81346/FunctionalObject" },
            { s: "Parent_3", p: "rdf:type", o: "owl:Class" },
            { s: "Parent_3", p: "rdfs:subClassOf", o: "top" },
            {
                s: "Parent_3",
                p: "iso81346:hasCode",
                o: function (line, _item) {
                    return "'" + decode81346(line.Parent_3).code + "'";
                },
            },
            {
                s: "Parent_3",
                p: "rdfs:label",
                o: function (line, _item) {
                    return "'" + decode81346(line.Parent_3).label + "'";
                },
            },

            { s: "top", p: "rdfs:label", o: "top", isString: "true" },
            { s: "top", p: "rdf:type", o: "http://data.total.com/resource/tsf/IEC_ISO_81346/FunctionalObject" },
            { s: "top", p: "rdf:type", o: "owl:Class" },
            { s: "top", p: "rdfs:subClassOf", o: "part14:FunctionalObject" },

            { s: "part14:FunctionalObject", p: "rdf:type", o: "http://data.total.com/resource/tsf/IEC_ISO_81346/topClass" },
            { s: "part14:FunctionalObject", p: "rdf:type", o: "owl:Class" },
        ],
    },
};

//var mappingNames = ["SYSTEMS", "CLASSES_3", "CLASSES_4", "CLASSES_5", "CLASSES_6c"];
//var mappingNames = ["CLASSES_5"];
//var mappingNames = ["CLASSES_4"];
//var mappingNames = ["CLASSES_3"]

var mappingNames = ["LOCATIONS", "FUNCTIONS", "FUNCTIONS_SYS3"];

var mappings = [];
mappingNames.forEach(function (mappingName) {
    mappings.push(mappingsMap[mappingName]);
});

var graphUri = "http://data.total.com/resource/tsf/iso_14224/requirements/";
var graphUri = "http://data.total.com/resource/tsf/maintenance/romain_14224/";
var graphUri = "http://data.total.com/resource/tsf/IEC_ISO_81346/";

if (true) {
    //  graphUri="http://data.total.com/resource/tsf/top_ontology/"

    processor.processSubClasses(mappings, graphUri, sparqlServerUrl);
}
