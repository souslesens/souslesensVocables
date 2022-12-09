var async = require("async");
var httpProxy = require("./httpProxy.");

const path = require("path");
const jsonFileStorage = require("./jsonFileStorage");
const N3 = require("n3");
const { RdfXmlParser } = require("rdfxml-streaming-parser");
const { processResponse } = require("../api/v1/paths/utils");
const request = require("request");
const Util = require("./util.");


var SourceIntegrator = {


  ontologyUrl2SparqlInsertQuery: function(url, graphUri, callback) {

    var writer = new N3.Writer({ format: "N-Triples", prefixes: {} });
    var fecthCount = 0;
    var fechSize = 10000;
    var imports = [];

    const myParser = new RdfXmlParser();
    myParser.on("data", function(quad) {
      if (!graphUri && quad.object.value == "http://www.w3.org/2002/07/owl#Ontology")
        var graphUri = quad.subject.value;
      if (quad.predicate.value == "http://www.w3.org/2002/07/owl#imports")
        imports.push(quad.object.value);

      writer.addQuad(quad.subject, quad.predicate, quad.object);

    });
    myParser.on("end", function(quad) {
      writer.end((error, result) => {
        var triples = result.replace(/_:([^\s.]+)\s/g, function(a, b) {
          return "<" + b + ">";
        });
        triples = triples.replace(/\n/g, "");
        triples = triples.replace(/\\"/g, "");
        var strInsert = "with <" + graphUri + "> insert data{" +
          triples +
          "}";
        return callback(null, { graphUri: graphUri, imports: imports, sparqlInsertStr: strInsert });
      });
    });


    request.get(url).pipe(myParser);


  },


  importSourceFromTurtle: function(ontologyUrl, sourceName, options, callback) {
    var Config;
    var documentStr = "";
    var graphUri = null;
    var sparqlInsertStr = null;
    var sources = null;
    var Config = null;
    var sourceStatus = {};
    var sparqlServerUrl = null;
    var imports = [];
    async.series([


        //parse triples
        function(callbackSeries) {
          SourceIntegrator.ontologyUrl2SparqlInsertQuery(url, options.graphUri, function(err, result) {
            if (err)
              return callbackSeries(err);
            graphUri = result.graphUri;
            sparqlInsertStr = result.sparqlInsertStr;
            imports = result.imports;
            return callbackSeries();
          });

        },
        //getConfig
        function(callbackSeries) {

          configPath = path.join(__dirname, "../" + "config" + "/mainConfig.json");
          jsonFileStorage.retrieve(path.resolve(configPath), function(err, _config) {
            Config = _config;
            sparqlServerUrl = options.sparqlServerUrl || Config.default_sparql_url;
            return callbackSeries();
          });

        },


//get sources
        function(callbackSeries) {
          var sourcesPath = path.join(__dirname, "../" + "config" + "/sources.json");
          jsonFileStorage.retrieve(path.resolve(sourcesPath), function(err, _sources) {
            sources = _sources;
            return callbackSeries();

          });
        },


        //check if ontology already exist (with graphUri)
        function(callbackSeries) {
          for (var source in sources) {
            if (sources[source].graphUri == graphUri)
              sourceStatus.exists = source;
            else
              sourceStatus.exists = false;

          }
          return callbackSeries();
        }


        , //writeTriples
        function(callbackSeries) {

          if (sourceStatus.exists)
            return callbackSeries();


          var headers = {};
          headers["Accept"] = "application/sparql-results+json";
          headers["Content-Type"] = "application/x-www-form-urlencoded";
          var sparqlUrl = sparqlServerUrl + "?query=";
          httpProxy.post(sparqlUrl, headers, { query: sparqlInsertStr }, function(err, result) {

            if (err)
              return callbackSeries(err);
            sourceStatus.triplesCreated = true;
            return callbackSeries();

          });
        },

        //register source if not exists
        function(callbackSeries) {
          if (!sourceStatus.exists && sourceStatus.triplesCreated) {
            var id = Util.getRandomHexaId(10);
            var newSource = {
              "name": sourceName,
              "_type": "source",
              "id": id,
              "type": "",
              "graphUri": graphUri,
              "sparql_server": {
                "url": sparqlServerUrl,
                "method": "Post",
                "headers": []
              },
              "editable": options.editable,
              "controller": "Sparql_OWL",
              "topClassFilter": "?topConcept rdf:type owl:Class .",
              "schemaType": "OWL",
              "allowIndividuals": options.allowIndividuals,
              "predicates": {
                "broaderPredicate": "",
                "lang": ""
              },
              "group": "ONTOCOMMONS",
              "imports": imports,
              "taxonomyPredicates": ["rdfs:subClassOf", "rdf:type"]
            };


          }

          sources[sourceName]=newSource;
          var sourcesPath = path.join(__dirname, "../" + "config" + "/sources.json");
          jsonFileStorage.store(path.resolve(sourcesPath),sources, function(err,result) {
          if(err)
            return callbackSeries(err);
            sourceStatus.exists = true;
            return callbackSeries();


          });


        }

      ],

      function(err) {
        return callback(err, "done");
      }
    );


  }


};
module.exports = SourceIntegrator;


var url = "http://data.industryportal.enit.fr/ontologies/VVO/submissions/1/download?apikey=521da659-7f0a-4961-b0d8-5e15b52fd185";
url = "http://data.industryportal.enit.fr/ontologies/VVO/submissions/1/download?apikey=521da659-7f0a-4961-b0d8-5e15b52fd185";


var sourceName = "TEST_ONTOCOMMONS";
var options = {
  graphUri: "htp://slsv/temp/",
  visibility: null,
  sourceName: null,
  user: null,
  profile: null,
  sparqlServerUrl: null,
  allowIndividuals: true,
  editable: false

};
SourceIntegrator.importSourceFromTurtle(url, sourceName, options, function(err, result) {

});