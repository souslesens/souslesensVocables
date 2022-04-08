var processor = require("../bin/KG/CsvTripleBuilder.");
var util = require("../bin/util.");
var sparqlServerUrl = "http://51.178.139.80:8890/sparql";

//source	class	system	code1	code2	code3	ClassName	ClassDefinition	ExamplesOfTerms	Criteria

mappingsMap = {
    systems81346: {
        type: "owl:Class",

        fileName: "D:\\NLP\\ontologies\\ISO 81346\\81346All.csv",
        lookups: [],
        transform: {
            code1: function (value, role, prop, line) {
                if (prop == "<http://souslesens.org/resource/vocabulary/hasCode>" && role == "o") return value;

                return "http://data.total.com/resource/tsf/IEC_ISO_81346/" + util.formatStringForTriple(line.system, true) + "/" + line.code1;
            },
            code2: function (value, role, prop, line) {
                if (prop == "<http://souslesens.org/resource/vocabulary/hasCode> " && role == "o") return value;

                return "http://data.total.com/resource/tsf/IEC_ISO_81346/" + util.formatStringForTriple(line.system, true) + "/" + line.code2;
            },
            code3: function (value, role, prop, line) {
                if (prop == "<http://souslesens.org/resource/vocabulary/hasCode>" && role == "o") return value;

                return "http://data.total.com/resource/tsf/IEC_ISO_81346/" + util.formatStringForTriple(line.system, true) + "/" + line.code3;
            },
        },

        //Class	Parent_1	Parent_2	Parent_3
        tripleModels: [
            { s: "class", p: "rdfs:label", o: "class", isString: true },
            {
                s: "class",
                p: "rdf:type",
                o: function (line, _mapping) {
                    return line.class == "Function" ? "part14:Function" : "part14:Location";
                },
            },
            { s: "class", p: "rdf:type", o: "http://souslesens.org/resource/vocabulary/TopConcept" },
            { s: "class", p: "rdf:type", o: "owl:Class" },

            { s: "system", p: "rdf:type", o: "owl:Class" },
            { s: "system", p: "rdfs:label", o: "system", isString: true },
            {
                s: "system",
                p: "rdf:type",
                o: function (line, _mapping) {
                    return line.system == "object functions" ? "part14:FunctionalObject" : "part14:System";
                },
            },
            {
                s: "system",
                p: "part14:partOf",
                o: "class",
            },

            { s: "code1", p: "rdf:type", o: "owl:Class" },
            {
                s: "code1",
                p: "rdf:type",
                o: function (line, _mapping) {
                    return line.system == "object functions" ? "part14:FunctionalObject" : "part14:System";
                },
            },
            { s: "code1", p: "part14:partOf", o: "system" },

            {
                s: "code1",
                p: "rdfs:label",
                isString: true,
                o: function (line, _mapping) {
                    if (line.ClassName == "Assembly system") var x = 3;
                    if (line.code1 && !line.code2 && !line.code3) return util.formatStringForTriple(line.ClassName);
                    return "";
                },
            },

            {
                s: "code1",
                p: "skos:definition",
                isString: true,
                o: function (line, _mapping) {
                    if (line.code1 && !line.code2 && !line.code3) return util.formatStringForTriple(line.ClassDefinition);
                    return "";
                },
            },
            {
                s: "code1",
                p: "skos:example",
                isString: true,
                o: function (line, _mapping) {
                    if (line.code1 && !line.code2 && !line.code3) return util.formatStringForTriple(line.ExamplesOfTerms);
                    return "";
                },
            },
            {
                s: "code1",
                p: "<http://souslesens.org/resource/vocabulary/hasCode>",
                isString: true,
                o: "code1",
                isString: true,
            },

            { s: "code2", p: "rdf:type", o: "owl:Class" },
            {
                s: "code2",
                p: "rdfs:label",
                isString: true,
                o: function (line, _mapping) {
                    if (!line.code2 || line.code3) return "";
                    return util.formatStringForTriple(line.ClassName);
                },
            },
            {
                s: "code2",
                p: "rdf:type",
                o: function (line, _mapping) {
                    return line.system == "object functions" ? "part14:FunctionalObject" : "part14:System";
                },
            },
            { s: "code2", p: "part14:partOf", o: "code1" },

            {
                s: "code2",
                p: "skos:definition",
                isString: true,
                o: function (line, _mapping) {
                    if (!line.code2 || line.code3) return "";
                    return util.formatStringForTriple(line.ClassDefinition);
                },
            },
            {
                s: "code2",
                p: "skos:example",
                isString: true,
                o: function (line, _mapping) {
                    if (!line.code2 || line.code3) return "";
                    return util.formatStringForTriple(line.ExamplesOfTerms);
                },
            },
            {
                s: "code2",
                p: "<http://souslesens.org/resource/vocabulary/hasCode>",
                isString: true,
                o: "code2",
                isString: true,
            },

            { s: "code3", p: "rdf:type", o: "owl:Class" },
            {
                s: "code3",
                p: "rdfs:label",
                isString: true,
                o: function (line, _mapping) {
                    if (!line.code3) return "";
                    return util.formatStringForTriple(line.ClassName);
                },
            },
            {
                s: "code3",
                p: "rdf:type",
                o: function (line, _mapping) {
                    return line.system == "object functions" ? "part14:FunctionalObject" : "part14:System";
                },
            },
            { s: "code3", p: "rdf:type", o: "skos:Collection" },

            { s: "code3", p: "part14:partOf", o: "code2" },

            {
                s: "code3",
                p: "skos:definition",
                isString: true,
                o: function (line, _mapping) {
                    if (!line.code3) return "";
                    return util.formatStringForTriple(line.ClassDefinition);
                },
            },
            {
                s: "code3",
                p: "skos:example",
                isString: true,
                o: function (line, _mapping) {
                    if (!line.code3) return "";
                    return util.formatStringForTriple(line.ExamplesOfTerms);
                },
            },
            {
                s: "code3",
                p: "<http://souslesens.org/resource/vocabulary/hasCode>",
                isString: true,
                o: "code3",
                isString: true,
            },
        ],
    },

    examples81346: {
        type: "owl:Class",

        fileName: "D:\\NLP\\ontologies\\ISO 81346\\81346All.csv",
        lookups: [],
        dataProcessing: function (lines, callback) {
            var newLines = [];
            lines.forEach(function (line) {
                if (line.ExamplesOfTerms) {
                    var examples = line.ExamplesOfTerms.split(",");
                    examples.forEach(function (example) {
                        example = example.trim();
                        if (example) {
                            newLines.push({
                                code1: line.code1,
                                code2: line.code2,
                                code3: line.code3,
                                system: line.system,
                                example: example,
                            });
                        }
                    });
                }
            });
            return callback(null, newLines);
        },
        transform: {
            code1: function (value, role, prop, line) {
                return "http://data.total.com/resource/tsf/IEC_ISO_81346/" + util.formatStringForTriple(line.system, true) + "/" + util.formatStringForTriple(line.system, true) + "/" + line.code1;
            },
            code2: function (value, role, prop, line) {
                return "http://data.total.com/resource/tsf/IEC_ISO_81346/" + util.formatStringForTriple(line.system, true) + "/" + line.code2;
            },
            code3: function (value, role, prop, line) {
                return "http://data.total.com/resource/tsf/IEC_ISO_81346/" + util.formatStringForTriple(line.system, true) + "/" + line.code3;
            },

            example: function (value, role, _prop, _line) {
                if (role == "s") {
                    return "http://data.total.com/resource/tsf/IEC_ISO_81346/exampleTerm/" + util.formatStringForTriple(value, true);
                } else {
                    return value;
                }
            },
        },

        tripleModels: [
            {
                s: "example",
                p: "<http://www.w3.org/2004/02/skos/core#member>",
                o: function (line, _mapping) {
                    if (line.code3) return "http://data.total.com/resource/tsf/IEC_ISO_81346/" + util.formatStringForTriple(line.system, true) + "/" + line.code3;
                    else if (line.code2) return "http://data.total.com/resource/tsf/IEC_ISO_81346/" + util.formatStringForTriple(line.system, true) + "/" + line.code2;
                    else if (line.code1) return "http://data.total.com/resource/tsf/IEC_ISO_81346/" + util.formatStringForTriple(line.system, true) + "/" + line.code1;
                    return null;
                },
            },

            { s: "example", p: "rdf:type", o: "owl:Class" },
            { s: "example", p: "rdf:type", o: "http://www.w3.org/2004/02/skos/core#Concept" },
            { s: "example", p: "rdfs:label", isString: true, o: "example" },
        ],
    },
};

//var mappingNames = ["SYSTEMS", "CLASSES_3", "CLASSES_4", "CLASSES_5", "CLASSES_6c"];
//var mappingNames = ["CLASSES_5"];
//var mappingNames = ["CLASSES_4"];
//var mappingNames = ["CLASSES_3"]

var mappingNames = ["systems81346", "examples81346"];
var mappingNames = ["examples81346"];
var mappings = [];
mappingNames.forEach(function (mappingName) {
    mappings.push(mappingsMap[mappingName]);
});

var graphUri = "http://data.total.com/resource/tsf/iso_14224/requirements/";
var graphUri = "http://data.total.com/resource/tsf/maintenance/romain_14224/";
var graphUri = "http://data.total.com/resource/tsf/IEC_ISO_81346/";
var graphUri = "http://data.total.com/resource/tsf/IEC_ISO_81346/";

if (true) {
    //  graphUri="http://data.total.com/resource/tsf/top_ontology/"
    processor.processSubClasses(mappings, graphUri, sparqlServerUrl);
}
