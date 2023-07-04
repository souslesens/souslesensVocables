var fs = require("fs");
//const ConfigManager = require("./configManager.");
const async = require("async");
const request = require("request");

async function  getRdfsLabels(source,callback) {
    var graphUri=source.graphUri
    var query = "" +
      "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>\n" +
      "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
      "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
      "SELECT count(*) as ?count FROM    <"+graphUri+">  WHERE {\n" +

      "  ?sub rdfs:label|skos:prefLabel ?label\n" +
      "} LIMIT 10"

    var url ="http://51.178.139.80:8890/sparql" +"?query=";
    var requestOptions = {
        method: "POST",
        url: url,
        auth: {
            user: "dba",
            pass: "SlSv@51",
            sendImmediately: false,
        },
        headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        form: {
            query: query,

            auth: {
                user: "dba",
                pass: "SlSv@51",
                sendImmediately: false,
            },
        },
        rejectUnauthorized: false,
    };



          request(requestOptions, function (error, response, body) {
              if (error) {
               return callback(err)
                  }
var json=JSON.parse(body)
            var count=json.results.bindings[0].count.value
            console.log(source.schemaType+":"+source.name+" : "+count)

              callback()
              });



}
  function listLabels() {
    var sources = fs.readFileSync("../config/sources.json");
    sources = JSON.parse(sources);
    var sourceObjs = []
    var graphUris=""
    for (var key in sources) {
      var source = sources[key];
      if (source.schemaType == "OWL") {
        source.name = key
        sourceObjs.push(source)

        if (source.graphUri && source.graphUri.indexOf("industryportal")<0)
          graphUris += "FROM <" +source.graphUri+"> ";
      }
    }
    console.log(graphUris)
  /*    async.eachSeries(sourceObjs, function(source, callbackEach) {
        getRdfsLabels(source, function(err, result) {
          return callbackEach()
        })
      })*/


  }

listLabels()
return;












var str =
    "ROMAIN\n" +
    "QUDT\n" +
    "UNIK\n" +
    "WFA\n" +
    "IMF-VOCABULARY\n" +
    "LML\n" +
    "UNSPSC\n" +
    "GEOSCMIL\n" +
    "INT_CHRONOSTRATIGRAPHIC_CHART\n" +
    "LOTERRE\n" +
    "BFO\n" +
    "IAO\n" +
    "DOLCE\n" +
    "GUFO\n" +
    "SUMO\n" +
    "DATA_KNOWLEDGE\n" +
    "NPD\n" +
    "CIDOC\n" +
    "IOF-CORE\n" +
    "plant_ontology\n" +
    "cido_coronavirus\n" +
    "ONTO_WIND\n" +
    "EMMO\n" +
    "o3po_PRODUCTION_PLANT\n" +
    "IDO\n" +
    "AnnotationVocabulary\n" +
    "O3PO\n" +
    "PIZZA\n" +
    "iof-av\n";

var data = str.split("\n");
var yyy = {};
for (var key in sources) {
    if (data.indexOf(key) > -1) yyy[key] = sources[key];
}

var xx = JSON.stringify(yyy, null, 2);
var y = xx;
