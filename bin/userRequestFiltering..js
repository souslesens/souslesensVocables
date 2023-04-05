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

var UserRequestFiltering = {


  existingSources: null,


  getExistingSources: function(callback) {
    if (UserRequestFiltering.existingSources) {
      return UserRequestFiltering.existingSources;
    }
    ConfigManager.getSources(null, function(err, result) {
      if (err) {

        return callback(err);
      }
      return callback(null, result);
    });

  },


  getUserSourcesACL: function(login, callback) {
    const SourcesAPI = require("../api/v1/paths/sources");
  /*  SourcesAPI.operations.GET(login,function(err, result){

    })*/

    var userSources={}
    userSources["TSF_GAIA_TEST"] = {sparql_server:{url:"_default"}, acl: "r", graphUri:"http://data.total.com/resource/tsf/ontology/gaia-test/" }
    //import
    userSources["ISO_15926-part-14_PCA"] = {sparql_server:{url:"_default"}, acl: "r", graphUri:"http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/"};

  return callback(null, userSources )


    var existingSources = null;
    var userGroups = [];
    var userSources = [];
    async.series([


      //getAllSources
      function(callbackSeries) {
        if (UserRequestFiltering.existingSources) {
          existingSources = UserRequestFiltering.existingSources;
          return callbackSeries();
        }
        ConfigManager.getSources(null, function(err, result) {
          if (err) {
            return callbackSeries(err);
          }
          existingSources = result;
          return callbackSeries();
        });
      }

      ,
      //getUser Groups
      function(callbackSeries) {

        userModel.findUserAccount(login).then((userAccount) => {
          userGroups = userAccount.groups;
          return callbackSeries();
        }).catch((error)=> {

        });
      },


      // TODO  to implement using userGroups and profiles and also imports with acl "r"
      // get User Source ACL and graphUri
      function(callbackSeries) {
            //import

        return callbackSeries();
      }


    ], function(err) {
      return callback(err, userSources);
    });


  },

  getUserGraphUrisMap:function(userSourcesMap){
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
        userGraphUrisMap[source.graphUri] = { source: key, acl:"r" };
      }




    for (var key in userSourcesMap) {
      var source = userSourcesMap[key];
      if (source.sparql_server.url == "_default" && source.graphUri) {
        userGraphUrisMap[source.graphUri] = { source: key, acl: source.acl };
      }
    }

    return userGraphUrisMap;

  },



  filterSparqlRequest: function(query, user, callback) {
   // return callback(null,query);
    var login = "TEST_r";
    var error = "";
    var filteredQuery = query;
    UserRequestFiltering.getUserSourcesACL(login, function(err, userSourcesMap) {

      var userGraphUrisMap=UserRequestFiltering.getUserGraphUrisMap(userSourcesMap)

      var parser = new SparqlParser({ skipValidation: true });
      try {
        var json = parser.parse(query);
      }
      catch(e){
       return callback(e)
      }

      if(json.queryType.toUpperCase()=="INSERT")
        var x=33

      if(! json.from)
        error += " missing from named graph clause \n";
      // check no from graph
      if (json.from.default.length==0 && json.from.named.length==0) {
        error += " missing from named graph clause \n";
      }



      //check graphuris authorized for user
      var fromError=""
        json.from.default.forEach(function(fromGraphUri){
          if(!userGraphUrisMap[fromGraphUri.value])
            fromError += " graphUri not allowed for user  "+fromGraphUri.value+"\n";
        })

      json.from.named.forEach(function(fromGraphUri){
        if(!userGraphUrisMap[fromGraphUri.value])
          fromError += " graphUri not allowed for user  "+fromGraphUri.value+"\n";
      })
      error+=fromError

      if(user)



      if(true);


      callback(error, filteredQuery);

    });


  },
  filterElasticRequest: function(request, user, callback) {


  }


};
module.exports = UserRequestFiltering


if(false) {

  var query = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
    "PREFIX owl: <http://www.w3.org/2002/07/owl#> \n" +
    "SELECT distinct ?prop ?propLabel ?inverseProp\n" +
    " from <http://data.total.com/resource/tsf/ontology/gaia-test/>  WHERE {\n" +
    " \n" +
    " ?prop ?p ?o optional{?prop rdfs:label ?propLabel}optional{?prop owl:inverseOf ?inverseProp}" +
    " VALUES ?o {rdf:Property owl:ObjectProperty owl:OntologyProperty owl:AnnotationProperty}\n" +
    " }"


  var queryInsert="with GRAPH <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
    "insert data{ <oo> <ppp> <oo>}"
  queryInsert= 'PREFIX xs: <http://www.w3.org/2001/XMLSchema#>\n' +
    'PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>\n"'
    ' PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n' +
    ' PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n' +
    ' PREFIX owl: <http://www.w3.org/2002/07/owl#>\n' +
    ' PREFIX skos: <http://www.w3.org/2004/02/skos/core#>\n' +
    ' PREFIX iso14224: <http://data.total.com/resource/tsf/iso_14224#>\n' +
    ' PREFIX req: <https://w3id.org/requirement-ontology/rdl/>\n' +
    ' PREFIX part14: <http://rds.posccaesar.org/ontology/lis14/rdl/>\n' +
    ' PREFIX iso81346: <http://data.total.com/resource/tsf/IEC_ISO_81346/>\n' +
    ' PREFIX bfo: <http://purl.obolibrary.org/obo/bfo.owl>\n' +
    ' PREFIX dul: <http://www.ontologydesignpatterns.org/ont/dul/DUL.owl#>\n' +
    ' PREFIX slsv: <http://souslesens.org/resource/vocabulary/>\n' +
    ' PREFIX dcterms: <http://purl.org/dc/terms/>\n' +
    ' WITH GRAPH  <http://data.total.com/resource/tsf/ontology/gaia-test/>\n' +
    ' INSERT DATA  {<http://data.total.com/resource/tsf/ontology/gaia-test/JeanXXXX111> rdfs:label "JeanXXXX111".\n' +
    ' <http://data.total.com/resource/tsf/ontology/gaia-test/JeanXXXX111> rdf:type owl:Class.\n' +
    ' <http://data.total.com/resource/tsf/ontology/gaia-test/JeanXXXX111> rdfs:subClassOf owl:Thing.\n' +
    ' <http://data.total.com/resource/tsf/ontology/gaia-test/JeanXXXX111> <http://purl.org/dc/terms/creator> "admin".\n' +
    ' <http://data.total.com/resource/tsf/ontology/gaia-test/JeanXXXX111> <http://purl.org/dc/terms/created> "2023-04-04T9:40:57"^^xsd:dateTime.\n' +
    ' <http://data.total.com/resource/tsf/ontology/gaia-test/JeanXXXX111> <https://www.dublincore.org/specifications/bibo/bibo/bibo.rdf.xml#status> "draft".\n' +
    ' <http://data.total.com/resource/tsf/ontology/gaia-test/JeanXXXX111> <http://purl.org/dc/terms/source> "Lineage_addNode".\n' +
    ' }\n'


  var user = "TEST_r"
  UserRequestFiltering.filterSparqlRequest(queryInsert, user, function(err, result) {

  })
}