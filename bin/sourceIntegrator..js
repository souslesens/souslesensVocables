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

  insertTriples:function(sparqlServerUrl,graphUri,triples,callback){
     triples = triples.replace(/_:([^\s.]+)\s/g, function(a, b) {
      return "<" + b + ">";
    });
    triples = triples.replace(/\n/g, "");
    triples = triples.replace(/\\"/g, "");
    var strInsert = "with <" + graphUri + "> insert data{" +
      triples +
      "}";

    var headers = {};
    headers["Accept"] = "application/sparql-results+json";
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    var sparqlUrl = sparqlServerUrl + "?query=";
    httpProxy.post(sparqlUrl, headers, { query: strInsert }, function(err, result) {
      if (err)
        return callback(err);
      return callback();

    });

  },
  ontologyUrl2tripleStore: function(url, sparqlServerUrl,graphUri, callback) {

    var writer = new N3.Writer({ format: "N-Triples", prefixes: {} });

    var totalTriples=0;
    var imports = [];



    const myParser = new RdfXmlParser();
    myParser.on("data", function(quad) {
    /*  if (!graphUri && quad.object.value == "http://www.w3.org/2002/07/owl#Ontology")
        graphUri = quad.subejct.value;*/
    //  console.log(quad.subject.value+"_"+quad.predicate.value+"_"+quad.object.value)
      if (quad.predicate.value == "http://www.w3.org/2002/07/owl#imports")
        imports.push(quad.object.value);

        totalTriples++;
        writer.addQuad(quad.subject, quad.predicate, quad.object);


    });
    myParser.on("end", function(quad) {
      writer.end((error, triples) => {

        var fechSize = 200;
        var fetchCount=0;
        var triplesArray=triples.split("\n")
          var tripleSlices=[]
        var tripleSlice=""
        triplesArray.forEach(function(item,index){

          if((fetchCount++)<fechSize)
            tripleSlice+=item+"\n";
          else{
            tripleSlices.push(""+tripleSlice)
            tripleSlice=""
            fetchCount=0;
          }
        })
        tripleSlices.push(""+tripleSlice)


        async.eachSeries(tripleSlices,function(triples,callbackEach) {
          SourceIntegrator.insertTriples(sparqlServerUrl, graphUri, triples, function(err, result) {

              return callbackEach(err)

          })
        },function(err){
          return callback(null, { graphUri: graphUri, imports: imports,totalTriples:totalTriples});
        })




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
          var sourcesPath = path.join(__dirname, "../" + "config" + "/ontocommonsSources.json");
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
        },
        //parse and write triples
        function(callbackSeries) {
      if(!graphUri)
        graphUri="http://industryportal.enit.fr/ontologies/"+sourceName+"#"
          SourceIntegrator.ontologyUrl2tripleStore(ontologyUrl,sparqlServerUrl, graphUri, function(err, result) {
            if (err)
              return callbackSeries(err);
            graphUri = result.graphUri;
            sparqlInsertStr = result.sparqlInsertStr;
            imports = result.imports;
            return callbackSeries();
          });

        },


        //register source if not exists
        function(callbackSeries) {
          if (!sourceStatus.exists ) {
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


            sources[sourceName] = newSource;
            var sourcesPath = path.join(__dirname, "../" + "config" + "/ontocommonsSources.json");
            jsonFileStorage.store(path.resolve(sourcesPath), sources, function(err, result) {
              if (err)
                return callbackSeries(err);
              sourceStatus.exists = true;
              return callbackSeries();


            });
          }


        }

      ],

      function(err) {
        return callback(err, "done");
      }
    );


  }


};
module.exports = SourceIntegrator;

if (false) {
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
  })
}
