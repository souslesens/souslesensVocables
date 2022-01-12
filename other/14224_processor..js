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

            { s: "id", p: "rdfs:subClassOf", o: "http://standards.iso.org/iso/15926/part14/System" },
            { s: "id", p: "rdf:type", o: "http://w3id.org/readi/z018-rdl/prod_SYS" },
            /*  {s: "id", p: "rdf:type", o: "owl:Class"},
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
            // {s: "id", p: "rdfs:subClassOf", o: "superClass"},
            { s: "id", p: "skos:prefLabel", o: "label1" },
            {s: "id", p: "rdf:type", o: "owl:Class"},
            { s: "id", p: "rdf:type", o: "http://w3id.org/readi/rdl/CFIHOS-30000311" },
            {s: "id", p: "rdf:type", o: "http://standards.iso.org/iso/15926/part14/PhysicalObject"},
            { s: "id", p: "rdfs:subClassOf", o: "system" },
            { s: "id", p: "rdfs:label", o: "label2" },

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
            {s: "id", p: "rdf:type", o: "owl:Class"},
            { s: "id", p: "rdfs:subClassOf", o: "superClass" },
            { s: "id", p: "rdf:type", o: "http://w3id.org/readi/z018-rdl/prod_EQUI" },
            {s: "id", p: "rdf:type", o: "http://standards.iso.org/iso/15926/part14/PhysicalObject"},
            { s: "id", p: "skos:prefLabel", o: "label1" },
            { s: "id", p: "rdfs:label", o: "label2" },
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
         /*   {s: "SubClass", p: "rdf:type", o: "owl:Class"},
            {s: "SubClass", p:  "rdf:type", o: "http://standards.iso.org/iso/15926/part14/FunctionalObject"},
            {s: "SubClass", p:  "rdfs:subClassOf", o: "EquipmentClass"},
            { s: "SubClass", p: "rdfs:label", o: "SubClassDescription" },
            { s: "SubClass", p: "skos:prefLabel", o: "SubClassCode" },*/
            { s: "SubClass", p: "skos:prefLabel", o: "SubClass" },

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
            {s: "ComponentCode", p: "rdf:type", o: "owl:Class"},
            {s: "ComponentCode", p:  "rdf:type", o: "http://w3id.org/readi/z018-rdl/prod_COMP"},
            {s: "ComponentCode", p: "rdf:type", o: "http://standards.iso.org/iso/15926/part14/PhysicalObject"},
            {s: "ComponentCode", p: "rdf:type", o: "http://standards.iso.org/iso/15926/part14/PhysicalObject"},
            { s: "ComponentCode", p: "rdfs:subClassOf", o: "SubClass" },
            { s: "ComponentCode", p: "rdfs:label", o: "ComponentDescription" },
            { s: "ComponentCode", p: "skos:prefLabel", o: "ComponentCode" },

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
    CLASSES_6_XXX: {
        type: "owl:Class",
        topClass: "<http://w3id.org/readi/rdl/CFIHOS-30000311>",
        fileName: "D:\\NLP\\ontologies\\14224\\classes_6.txt",
        transform: {
            label2: function (value,role,prop) {
                return "Cmpt-" + value;
            },
        },
        lookups: [],
        tripleModels: [
            {s: "component", p: "rdf:type", o: "owl:Class"},
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
            attribute: function (value,role,prop) {
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
            {s: "id", p: "rdf:type", o: "owl:Class"},
            { s: "req:REQ_0008", p: "rdf:type", o: "owl:ObjectProperty" },
            { s: "req:REQ_0008", p: "rdfs:label", o: "has SCD clause", o_type: "fixed" },
            { s: "req:REQ_0020", p: "rdf:type", o: "owl:ObjectProperty" },
            { s: "req:REQ_0020", p: "rdfs:label", o: "#has demand", o_type: "fixed" },
            { s: "req:REQ_0021", p: "rdf:type", o: "owl:ObjectProperty" },
            { s: "req:REQ_0021", p: "rdfs:label", o: "has scope", o_type: "fixed" },

            {s: "id", p: "rdf:type", o: "owl:Class"},
            { s: "clauseId", p: "rdf:type", o: "priority" },
            { s: "clauseId", p: "rdf:type", o: "req:REQ_0008", o_type: "fixed" }, // SDC clause
            { s: "clauseId", p: "rdf:type", o: "owl:NamedIndividual" },
            { s: "clauseId", p: "rdfs:label", o: "" },
            { s: "clauseId", p: "owl:comment", o: "description" },

            {s: "id", p: "rdf:type", o: "owl:Class"},
            { s: "clauseId", p: "req:REQ_0021", o: "equipmentId" }, //scope
            { s: "equipmentId", p: "rdfs:label", o: "equipmentId" },
            { s: "equipmentId", p: "rdf:type", o: "owl:Class" },

            {s: "id", p: "rdf:type", o: "owl:Class"},
            { s: "clauseId", p: "req:REQ_0020", o: "physicalQuantity" }, //scope  if physicalQuantity
            { s: "physicalQuantity", p: "rdfs:label", o: "physicalQuantity" },
            { s: "physicalQuantity", p: "rdf:type", o: "part14:PhysicalQuantity" },
            { s: "physicalQuantity", p: "rdf:type", o: "owl:Class" },

            {s: "id", p: "rdf:type", o: "owl:Class"},
            { s: "clauseId", p: "req:REQ_0020", o: "datatype" }, //scope
            { s: "datatype", p: "rdfs:label", o: "datatype" },
            { s: "datatype", p: "rdf:type", o: "part14:Quality" },
            { s: "datatype", p: "rdf:type", o: "owl:Class" },

            { s: "clauseId", p: "req:REQ_0020", o: "pickList" }, //scope
            { s: "pickList", p: "rdfs:label", o: "pickList" },
            { s: "pickList", p: "rdf:type", o: "http://w3id.org/readi/rdl/D101001535" },
            { s: "pickList", p: "rdf:type", o: "owl:Class" },

            /*    {s: "clauseId", p: " \"req:REQ_0021\"", o: "physicalQuantity"},// if physicalQuantity
                {s: "clauseId", p: "rdf:type", o: "part14:PhysicalQuantity"},
                {s: "clauseId", p: "rdfs:label", o: "pickList"},// if physicalQuantity
                {s: "clauseId", p: "rdf:type", o: "part14:Quality"},
                {s: "clauseId", p: "rdfs:label", o: "datataype"}, // if physicalQuantity
                {s: "clauseId", p: "rdf:type", o: "part14:Quality"},



                {s: "reqId", p: "_restriction", o: "clauseId", prop: "https://w3id.org/requirement-ontology/rdl/REQ_0018"},
                {s: "reqId", p: "rdf:type", o:"priority"},

                {s: "reqId", p: "req:REQ_0022", o: "http://data.total.com/resource/tsf/iso_14224/"},//posited by
                {s: "clauseId", p: "owl:comment", o: "description"},
                {s: "clauseId", p: "req:REQ_0021", o: "equipmentId"},//scope
                {s: "clauseId", p: "req:REQ_0020", o: "physicalQuantity"},//demand
                {s: "clauseId", p: "req:REQ_0020", o: "pickList"},//demand
                {s: "clauseId", p: "req:REQ_0020", o: "datataype"},//demand


                {s: "physicalQuantity", p: "rdfs:label", o: "physicalQuantity"},
                {s: "physicalQuantity", p: "rdf:type", o: "part14:PhysicalQuantity"},
                {s: "pickList", p: "rdfs:label", o: "pickList"},
                {s: "pickList", p: "rdf:type", o: "part14:Quality"},
                {s: "datataype", p: "rdfs:label", o: "datataype"},
                {s: "datataype", p: "rdf:type", o: "part14:Quality"},*/
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
