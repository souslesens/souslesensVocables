var processor = require("./CsvTripleBuilder.");
var sparqlServerUrl = "http://51.178.139.80:8890/sparql";

mappingsMap = {
    SYSTEMS: {
        type: "owl:Class",
        topClass: "<http://w3id.org/readi/z018-rdl/prod_SYS>",
        fileName: "D:\\NLP\\ontologies\\14224\\systems.txt",
        lookups: [],
        transform: {
            label2: function (value,role,prop) {
                if(prop=="skos:prefLabel")
                return value;
                else
                    return  "Syst-" + value
            },
        },
        tripleModels: [

            { s: "id", p:"iso14224:hasCode", o: "id",isString:true },
            /*   { s: "id", p: "rdfs:subClassOf", o: "http://standards.iso.org/iso/15926/part14/System" },
             { s: "id", p: "rdf:type", o: "http://w3id.org/readi/z018-rdl/prod_SYS" },
             {s: "id", p: "rdf:type", o: "owl:Class"},
            { s: "id", p: "skos:prefLabel", o: "label2" },

               { s: "id", p: "rdfs:label", o: "label2" },*/
        ],
    },
    CLASSES_3: {
        type: "owl:Class",
      //  topClass: "<http://w3id.org/readi/rdl/CFIHOS-30000311>",
        fileName: "D:\\NLP\\ontologies\\14224\\classes_3.txt",
        transform: {
            label2: function (value,role,prop) {
                return "Pack-" + value;
            },
        },
        lookups: [],
        tripleModels: [

            { s: "id", p:"iso14224:hasCode", o: "label1",isString:true },
            // {s: "id", p: "rdfs:subClassOf", o: "superClass"},
         /*   { s: "id", p: "skos:prefLabel", o: "label1" },
            {s: "id", p: "rdf:type", o: "owl:Class"},
            { s: "id", p: "rdf:type", o: "http://w3id.org/readi/rdl/CFIHOS-30000311" },
            {s: "id", p: "rdf:type", o: "http://standards.iso.org/iso/15926/part14/PhysicalObject"},
            { s: "id", p: "rdfs:subClassOf", o: "system" },
            { s: "id", p: "rdfs:label", o: "label2" },*/

        ],
    },
    CLASSES_4: {
        type: "owl:Class",
        topClass: "<http://w3id.org/readi/rdl/CFIHOS-30000311>",
        fileName: "D:\\NLP\\ontologies\\14224\\classes_4.txt",
        lookups: [],
        transform: {
            label2: function (value,role,prop) {
                return "Equip-" + value;
            },
        },
        tripleModels: [
            { s: "id", p:"iso14224:hasCode", o: "label1",isString:true },
          /*  {s: "id", p: "rdf:type", o: "owl:Class"},
            { s: "id", p: "rdfs:subClassOf", o: "superClass" },
            { s: "id", p: "rdf:type", o: "http://w3id.org/readi/z018-rdl/prod_EQUI" },
            {s: "id", p: "rdf:type", o: "http://standards.iso.org/iso/15926/part14/PhysicalObject"},
            { s: "id", p: "skos:prefLabel", o: "label1" },
            { s: "id", p: "rdfs:label", o: "label2" },*/
            //  {s: "id", p:"_restriction" , o: "system",prop:"part14:functionalPartOf"},
        ],
    },






    FUNCTIONALOBJECT: {
        type: "owl:Class",
        fileName: "D:\\NLP\\ontologies\\14224\\functionalObjects.txt",
        lookups: [],
        transform: {
            xx: function (value,role,prop) {
                return "Class-" + value;
            },
        },

        //SubClass	SubClassCode	LEV	SubClassDescription	EquipmentClass
        tripleModels: [
            { s: "SubClass", p:"iso14224:hasCode", o: "SubClass",isString:true },
         /*   {s: "SubClass", p: "rdf:type", o: "owl:Class"},
            {s: "SubClass", p:  "rdf:type", o: "http://standards.iso.org/iso/15926/part14/FunctionalObject"},
            {s: "SubClass", p:  "rdfs:subClassOf", o: "EquipmentClass"},
            { s: "SubClass", p: "rdfs:label", o: "SubClassDescription" },
            { s: "SubClass", p: "skos:prefLabel", o: "SubClassCode" },*/
           // { s: "SubClass", p: "skos:prefLabel", o: "SubClass" },

            //  {s: "id", p:"_restriction" , o: "system",prop:"part14:functionalPartOf"},
        ],
    },

    COMPONENTS: {
        type: "owl:Class",
        fileName: "D:\\NLP\\ontologies\\14224\\components.txt",
        lookups: [],
        transform: {
            xx: function (value,role,prop) {
                return "Class-" + value;
            },
        },
//Component	ComponentCode	LEV	ComponentDescription	SubClass

        tripleModels: [

            { s: "ComponentCode", p:"iso14224:hasCode", o: "ComponentCode",isString:true },
           /* {s: "ComponentCode", p: "rdf:type", o: "owl:Class"},
            {s: "ComponentCode", p:  "rdf:type", o: "http://w3id.org/readi/z018-rdl/prod_COMP"},
            {s: "ComponentCode", p: "rdf:type", o: "http://standards.iso.org/iso/15926/part14/PhysicalObject"},
            {s: "ComponentCode", p: "rdf:type", o: "http://standards.iso.org/iso/15926/part14/PhysicalObject"},
            { s: "ComponentCode", p: "rdfs:subClassOf", o: "SubClass" },
            { s: "ComponentCode", p: "rdfs:label", o: "ComponentDescription" },
            { s: "ComponentCode", p: "skos:prefLabel", o: "ComponentCode" },*/

            //  {s: "id", p:"_restriction" , o: "system",prop:"part14:functionalPartOf"},
        ],
    },






    EQUIPMENT: {
        type: "owl:Class",
        topClass: "<http://w3id.org/readi/rdl/CFIHOS-30000311>",
        fileName: "D:\\NLP\\ontologies\\14224\\equipements.txt",
        lookups: [],
        transform: {
            xx: function (value,role,prop) {
                return "Class-" + value;
            },
        },

        //ComponentCode	ComponentDescription-EN
        tripleModels: [
            {s: "ComponentCode", p: "rdf:type", o: "owl:Class"},
            { s: "ComponentCode", p: "rdf:type", o: "http://w3id.org/readi/z018-rdl/prod_EQUI" },
            {s: "ComponentCode", p:  "rdfs:subClassOf", o: "http://standards.iso.org/iso/15926/part14/PhysicalObject"},
            { s: "ComponentCode", p: "rdfs:label", o: "ComponentDescription" },
            //  {s: "id", p:"_restriction" , o: "system",prop:"part14:functionalPartOf"},
        ],
    },



    COMPONENTS_RELATIONS: {
        type: "owl:Class",
        fileName: "D:\\NLP\\ontologies\\14224\\functionsList.txt",
        lookups: [],
        transform: {
            xx: function (value,role,prop) {
                return "Class-" + value;
            },
        },

        //Component	ComponentCode	LEV	ComponentDescription	SubClass	FL_Identification	Strategy	MM_Identification	Reparable Item	St Constraints	St Life Cycle	Reparable Item2	Storage Constraints3	Storage Life Cycle4	Part Ratio


        tripleModels: [
            { s: "ComponentCode", p: "_restriction", o: "superClass", prop: "part14:" },
            { s: "SubClass", p: "_restriction", o: "ComponentCode", prop: "part14:FunctionalObject" },

            //  {s: "id", p:"_restriction" , o: "system",prop:"part14:functionalPartOf"},
        ],
    },




    CLASSES_5: {
        type: "owl:Class",
        topClass: "<http://standards.iso.org/iso/15926/part14/FunctionalObject>",
        fileName: "D:\\NLP\\ontologies\\14224\\equipments.txt",
        transform: {
            label2: function (value,role,prop) {
                return "Fn-" + value;
            },
        },
        lookups: [],
        tripleModels: [
            {s: "id", p: "rdf:type", o: "owl:Class"},
            { s: "id", p: "skos:prefLabel", o: "label1" },
            { s: "id", p: "rdf:type", o: "http://standards.iso.org/iso/15926/part14/FunctionalObject" },
            { s: "id", p: "rdfs:label", o: "label2" },
            { s: "id", p: "_restriction", o: "superClass", prop: "part14:hasFunctionalPart" },
        ],
    },
    CLASSES_6c: {
        type: "owl:Class",
        topClass: "<http://w3id.org/readi/rdl/Z101001232>",
        fileName: "D:\\NLP\\ontologies\\14224\\classes_6c.txt",
        transform: {
            rDLDescriptionEN: function (value,role,prop) {
                return "Cmpt-" + value;
            },
        },
        lookups: [],
        tripleModels: [
            {s: "rDLLibrary", p: "rdf:type", o: "owl:Class"},
            { s: "rDLLibrary", p: "rdfs:label", o: "rDLDescriptionEN" },
            { s: "rDLLibrary", p: "skos:prefLabel", o: "rDLLibrary" },
            { s: "rDLLibrary", p: "rdf:type", o: "http://w3id.org/readi/rdl/Z101001232" },
            { s: "rDLLibrary", p: "_restriction", o: "rDLParent", prop: "part14:concretizes" },
            { s: "rDLLibrary", p: "_restriction", o: "cLASSLink", prop: "part14:assembledPartOf" },
        ],
    },


};



//var mappingNames = ["CLASSES_5"];
//var mappingNames = ["CLASSES_4"];
//var mappingNames = ["CLASSES_3"]

//var mappingNames = ["QUALITIES"]
//var mappingNames = ["CLASSES_6c",];


var graphUri = "http://data.total.com/resource/tsf/iso_14224/requirements/";
var graphUri = "http://data.total.com/resource/tsf/maintenance/romain_14224/";



if( false){
    var mappings = [];
    mappingNames.forEach(function (mappingName) {
        mappings.push(mappingsMap[mappingName]);
    });
    processor.clearGraph(graphUri, sparqlServerUrl, function (err, result) {
        if (err) return console.log(err);
        processor.writeTriples(triples, graphUri, sparqlServerUrl, function (err, result) {
            if (err) return console.log(err);
            processor.processSubClasses(mappings, graphUri, sparqlServerUrl);
        });
    });
}

if (true) {
    var mappingNames = ["SYSTEMS", "CLASSES_3", "CLASSES_4", "CLASSES_5", "CLASSES_6c"];
    var mappingNames = ["FUNCTIONALOBJECT"];

    var mappings = [];
    mappingNames.forEach(function (mappingName) {
        mappings.push(mappingsMap[mappingName]);
    });
    processor.processSubClasses(mappings, graphUri,sparqlServerUrl);
}
