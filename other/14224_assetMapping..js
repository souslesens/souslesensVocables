var processor = require("./CsvTripleBuilder.");
var util = require("../bin/util.");
var sparqlServerUrl = "http://51.178.139.80:8890/sparql";

mappingsMap = {
    ABSHERON: {
        graphUri: "http://data.total.com/resource/tsf/maintenance/romain_14224/asset-mappings/",
        fileName: null,
        dataSource: {
            type: "sql.sqlserver",
            connection: "_default",
            dbName: "data14224",
            table_schema: "dbo",
            sql: " select distinct id,RDLRelation from absheron  where RDLRelation is not null and len(RDLRelation)<11   ",
        },
        lookups: [],
        transform: {
            id: function (value, role, prop) {
                return "absheron#" + value;
            },

            RDLRelation: function (value, role, prop) {
                if (value == "") return "";
                return "http://data.total.com/resource/tsf/maintenance/romain_14224/" + value;
            },
        },
        tripleModels: [{ s: "RDLRelation", p: "<http://rds.posccaesar.org/ontology/lis14/rdl/represents>", o: "id" }],
    },
    GIRASSOL: {
        graphUri: "http://data.total.com/resource/tsf/maintenance/romain_14224/asset-mappings/",
        fileName: null,
        dataSource: {
            type: "sql.sqlserver",
            connection: "_default",
            dbName: "data14224",
            table_schema: "dbo",
            sql: " select distinct id,RDLRelation from girassol  where RDLRelation is not null and len(RDLRelation)<11   ",
        },
        lookups: [],
        transform: {
            id: function (value, role, prop) {
                return "girassol#" + value;
            },

            RDLRelation: function (value, role, prop) {
                if (value == "") return "";
                return "http://data.total.com/resource/tsf/maintenance/romain_14224/" + value;
            },
        },
        tripleModels: [{ s: "RDLRelation", p: "<http://rds.posccaesar.org/ontology/lis14/rdl/represents>", o: "id" }],
    },
};

var mappingNames = ["GIRASSOL"];
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
