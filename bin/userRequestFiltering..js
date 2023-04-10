/*
const rootPath="D:\\webstorm\\souslesensVocables\\"

const ConfigManager = require(rootPath+"bin\\configManager.");
//const Sources = require(rootPath+"api\\v1\\path\\sources");
const { userModel } = require(rootPath+"model\\users");

 */


const ConfigManager = require("../bin/configManager.");
const { userModel } = require("../model/users");


const async = require("async");
const SparqlParser = require("sparqljs").Parser;
const parser = new SparqlParser({ skipValidation: true });

var UserRequestFiltering = {


    existingSources: null,


    getUserGraphUrisMap: function(userSourcesMap) {
      var basicVocabularies = {
        rdf: { graphUri: "https://www.w3.org/1999/02/22-rdf-syntax-ns" },
        rdfs: { graphUri: "https://www.w3.org/2000/01/rdf-schema" },
        owl: { graphUri: "https://www.w3.org/2002/07/owl" },
        "iof-av": { graphUri: "https://spec.industrialontologies.org/ontology/core/meta/AnnotationVocabulary/" },
        skos: { graphUri: "http://www.w3.org/2004/02/skos/core/" }
      };

      var userGraphUrisMap = {};

      for (var key in basicVocabularies) {
        var source = basicVocabularies[key];
        userGraphUrisMap[source.graphUri] = { source: key, acl: "r" };
      }


      for (var key in userSourcesMap) {
        var source = userSourcesMap[key];
        if (source.sparql_server.url == "_default" && source.graphUri) {
          userGraphUrisMap[source.graphUri] = { source: key, acl: source.acl };
        }
      }

      return userGraphUrisMap;

    },

    /**
     *
     *
     *
     *
     *
     * @param query
     * @param userSourcesMap
     * @param callback
     * @returns {string|*}
     */
    /*
     3.1.1 INSERT DATA
          3.1.2 DELETE DATA
          3.1.3 DELETE/INSERT
              3.1.3.1 DELETE (Informative)
              3.1.3.2 INSERT (Informative)
              3.1.3.3 DELETE WHERE
          3.1.4 LOAD
          3.1.5 CLEAR
      3.2 Graph Management
          3.2.1 CREATE
          3.2.2 DROP
          3.2.3 COPY
          3.2.4 MOVE
          3.2.5 ADD
   */


    checkQueryByRegex: function(query, userGraphUrisMap, callback) {


      var error = "";
      var operation = null;
      var modifyRegex = /(DELETE|INSERT|CLEAR|LOAD|CREATE|DROP|COPY|MOVE|ADD)  /gim;
      var array = modifyRegex.exec(query);
      if (array.length == 1) {
        operation = array[1];
      }

      if (!operation) {
        error = ("no operation");
      }
      else {
        var graphUri = null;
        var graphRegex = /(INTO|GRAPH) +<(.*)> /gim;
        var array = graphRegex.exec(query);
        if (array.length ==3) {
          graphUri = array[2];
        }
        if (!graphUri) {
          error = ("operation " + operation + " needs explicit graph declaration");
        }
        else {
          if (!userGraphUrisMap[graphUri]) {
            error = " graphUri not allowed for user  " + fromGraphUri.value + "\n";
          }
        }

      }

      return callback(error, query);
    }
    ,

    checkSelectQuery: function(query, userGraphUrisMap, callback) {

      try {
        var json = parser.parse(query);
      } catch (e) {
        return callback(e);
      }

      var error = "";
      if (!json.from) {
        error += " missing from named graph clause \n";
      }
      // check no from graph
     else {
        if (json.from.default.length == 0 && json.from.named.length == 0) {
          error += " missing from named graph clause \n";
        }

        //check graphuris authorized for user
        var fromError = "";
        json.from.default.forEach(function(fromGraphUri) {
          if (!userGraphUrisMap[fromGraphUri.value]) {
            fromError += " graphUri not allowed for user  " + fromGraphUri.value + "\n";
          }
        });

        json.from.named.forEach(function(fromGraphUri) {
          if (!userGraphUrisMap[fromGraphUri.value]) {
            fromError += " graphUri not allowed for user  " + fromGraphUri.value + "\n";
          }
        });
        error += fromError;
      }


      callback(error, query);


    },


    filterSparqlRequest: function(query, userSourcesMap, callback) {
   // return callback(null,query);
      var login = "TEST_r";
      var error = "";
      var filteredQuery = query;
      var userGraphUrisMap = UserRequestFiltering.getUserGraphUrisMap(userSourcesMap);

      selectRegex = /(SELECT)/gim;
      var array = selectRegex.exec(query);
      if (array.length > 0) {
        UserRequestFiltering.checkSelectQuery(query, userGraphUrisMap, function(err, result) {
          if(error)
            return callback(error)
          callback(null, result);
        });

      }
      else {
        UserRequestFiltering.checkQueryByRegex(query, userGraphUrisMap, function(err, result) {
          if(error)
            return callback(error)
          callback(null, result);
        });


      }
    },
    filterElasticRequest: function(request, user, callback) {


    }


  }
;
module.exports = UserRequestFiltering;


if (false) {

  var query = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
    "PREFIX owl: <http://www.w3.org/2002/07/owl#> \n" +
    "SELECT distinct ?prop ?propLabel ?inverseProp\n" +
    " from <http://data.total.com/resource/tsf/ontology/gaia-test/>  WHERE {\n" +
    " \n" +
    " ?prop ?p ?o optional{?prop rdfs:label ?propLabel}optional{?prop owl:inverseOf ?inverseProp}" +
    " VALUES ?o {rdf:Property owl:ObjectProperty owl:OntologyProperty owl:AnnotationProperty}\n" +
    " }";


  var queryInsert = "with GRAPH <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
    "insert data{ <oo> <ppp> <oo>}";
  queryInsert = "PREFIX xs: <http://www.w3.org/2001/XMLSchema#>\n" +
    "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>\n\"";
  " PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
  " PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
  " PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +
  " PREFIX skos: <http://www.w3.org/2004/02/skos/core#>\n" +
  " PREFIX iso14224: <http://data.total.com/resource/tsf/iso_14224#>\n" +
  " PREFIX req: <https://w3id.org/requirement-ontology/rdl/>\n" +
  " PREFIX part14: <http://rds.posccaesar.org/ontology/lis14/rdl/>\n" +
  " PREFIX iso81346: <http://data.total.com/resource/tsf/IEC_ISO_81346/>\n" +
  " PREFIX bfo: <http://purl.obolibrary.org/obo/bfo.owl>\n" +
  " PREFIX dul: <http://www.ontologydesignpatterns.org/ont/dul/DUL.owl#>\n" +
  " PREFIX slsv: <http://souslesens.org/resource/vocabulary/>\n" +
  " PREFIX dcterms: <http://purl.org/dc/terms/>\n" +
  " WITH GRAPH  <http://data.total.com/resource/tsf/ontology/gaia-test/>\n" +
  " INSERT DATA  {<http://data.total.com/resource/tsf/ontology/gaia-test/JeanXXXX111> rdfs:label \"JeanXXXX111\".\n" +
  " <http://data.total.com/resource/tsf/ontology/gaia-test/JeanXXXX111> rdf:type owl:Class.\n" +
  " <http://data.total.com/resource/tsf/ontology/gaia-test/JeanXXXX111> rdfs:subClassOf owl:Thing.\n" +
  " <http://data.total.com/resource/tsf/ontology/gaia-test/JeanXXXX111> <http://purl.org/dc/terms/creator> \"admin\".\n" +
  " <http://data.total.com/resource/tsf/ontology/gaia-test/JeanXXXX111> <http://purl.org/dc/terms/created> \"2023-04-04T9:40:57\"^^xsd:dateTime.\n" +
  " <http://data.total.com/resource/tsf/ontology/gaia-test/JeanXXXX111> <https://www.dublincore.org/specifications/bibo/bibo/bibo.rdf.xml#status> \"draft\".\n" +
  " <http://data.total.com/resource/tsf/ontology/gaia-test/JeanXXXX111> <http://purl.org/dc/terms/source> \"Lineage_addNode\".\n" +
  " }\n";


  var user = "TEST_r";
  UserRequestFiltering.filterSparqlRequest(queryInsert, user, function(err, result) {

  })
}