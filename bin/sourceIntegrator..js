var async = require("async");
var httpProxy = require("./httpProxy.");

const path = require("path");
const jsonFileStorage = require("./jsonFileStorage");
const N3 = require("n3");
const { RdfXmlParser } = require("rdfxml-streaming-parser");
const { processResponse } = require("../api/v1/paths/utils");
const request = require("request");
const Util = require("./util.");
const fs = require("fs");


var exec = require("child_process").exec;


var importsSourcesMap = {
  "http://purl.org/vso/ns": "VSO-NS",
  "https://w3id.org/affectedBy": "AFFECTEDBY",
  "https://w3id.org/bot-0.3.2": "BOT-0.3.2",
  "https://w3id.org/eep": "EEP",
  "https://w3id.org/hpont": "HPONT",
  "http://www.industrialontologies.org/core": "INDUSTRIAL-ONTOLOGIES-CORE",
  "https://w3id.org/affectedBy#": "AFFECTEDBY",
  "https://w3id.org/eep#": "EEP",
  "https://w3id.org/eepsa/ek4eepsa#": "EK4EEPSA",
  "https://w3id.org/eepsa/exn4eepsa#": "EXN4EEPSA",
  "https://w3id.org/eepsa/exr4eepsa#": "EXR4EEPSA",
  "https://w3id.org/eepsa/foi4eepsa#": "FOI4EEPSA",
  "https://w3id.org/eepsa/p4eepsa#": "P4EEPSA",
  "https://w3id.org/eepsa/q4eepsa#": "Q4EEPSA",
  "https://w3id.org/rc#": "RC",
  "http://www.w3.org/2006/time": "TIME",
  "http://www.daml.org/rules/proposal/swrlb.owl": "SWRLB",
  "http://www.daml.org/rules/proposal/swrl.owl": "SWRL",
  "https://w3id.org/saref": "SAREF",
  "https://w3id.org/bot/0.3.0": "BOT-0-3-0",
  //"https://w3id.org/seas/FeatureOfInterestOntology": "FEATUREOFINTEREST-ONTOLOGY",
  // "https://www.industrialontologies.org/core": "INDUSTRIAL-ONTOLOGIES-CORE-2",
  "http://emmo.info/emmo/1.0.0-beta4/disciplines/computerscience": "EMMO-DISCIPLINES-COMPUTERSCIENCE",
  "http://emmo.info/emmo/1.0.0-beta4/disciplines/manufacturing": "EMMO-DISCIPLINES-MANUFACTURING",
  "http://emmo.info/emmo/1.0.0-beta4/disciplines/materials": "MEMMO-DISCIPLINES-ATERIALS",
  "http://emmo.info/emmo/1.0.0-beta4/disciplines/metrology": "MEMMO-DISCIPLINES-ETROLOGY",
  "http://emmo.info/emmo/1.0.0-beta4/disciplines/models": "EMMO-DISCIPLINES-MODELS",
  "http://emmo.info/emmo/1.0.0-beta4/multiperspective/persholistic": "EMMO-MULTIPERSPECTIVES-PERSHOLISTIC",
  "http://emmo.info/emmo/1.0.0-beta4/perspectives/data": "EMMO-PERSPECTIVES-DATA",
  "http://emmo.info/emmo/1.0.0-beta4/perspectives/holistic": "EMMO-PERSPECTIVES-HOLISTIC",
  "http://emmo.info/emmo/1.0.0-beta4/perspectives/perceptual": "EMMO-PERSPECTIVES-PERCEPTUAL",
  "http://emmo.info/emmo/1.0.0-beta4/perspectives/persistence": "EMMO-PERSPECTIVES-PERSISTENCE",
  "http://emmo.info/emmo/1.0.0-beta4/perspectives/semiotics": "EMMO-PERSPECTIVES-SEMIOTICS",
  "http://purl.obolibrary.org/obo/iao/2017-03-24/iao.owl": "IAO",
  "http://purl.obolibrary.org/obo/bfo/2.0/bfo.owl": "BFO",
  "http://purl.obolibrary.org/obo/ro/releases/2017-05-29/ro.owl": "RO",
  "http://emmo.info/emmo/1.0.0-alpha2": "EMMO-ALPHA2",
  "http://emmo.info/emmo/middle/chemistry": "EMMO-MIDDLE-CHEMISTRY",
  "http://purl.obolibrary.org/obo/bfo/2020/bfo.owl": "BFO-2020",
  "http://www.industrialontologies.org/IOFAnnotationVocabulary/": "IOF-ANNOTATION-VOCABULARY",
  "http://www.industrialontologies.org/core/": "INDUSTRIAL-ONTOLOGIES-CORE-3",
  "http://purl.oclc.org/NET/ssnx/ssn": "SSNX-SSN",
  "http://www.loa.istc.cnr.it/ontologies/DUL.owl": "DUL"
};

var topOntologyPatternsMap = {
  "/obo": "BFO",
  "/dul": "DOLCE",
  sumo: "SUMO",
  gufo: "gufo"
};

var SourceIntegrator = {

  jenaParse: function(filePath, callback) {
    var cmd = "D: && cd D:\\apache-jena-4.7.0 && java -cp \"./lib/*\"  mystest.java " + filePath;
    console.log("EXECUTING " + cmd);
    exec(cmd, { maxBuffer: 1024 * 30000 }, function(err, stdout, stderr) {
      if (err) {
        console.log(stderr);
        return callback(err);
      }
      console.log(stdout);
      var json=JSON.parse(stdout)
      json.forEach(function(item,index) {
          triples.push(
            {
              subject: item[0],
              predicate: item[1],
              object: item[2]
            });

      });
      callback(null, triples);
    });
  },


  insertTriples: function(sparqlServerUrl, graphUri, triples, callback) {
    triples = triples.replace(/_:([^\s.]+)\s/g, function(a, b) {
      return "<" + b + ">";
    });
    triples = triples.replace(/\n/g, "");
    triples = triples.replace(/\\"/g, "");
    var strInsert = "with <" + graphUri + "> insert data{" + triples + "}";

    var headers = {};
    headers["Accept"] = "application/sparql-results+json";
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    var sparqlUrl = sparqlServerUrl + "?query=";
    httpProxy.post(sparqlUrl, headers, { query: strInsert }, function(err, result) {
      if (err) {
        return callback(err);
      }
      return callback();
    });
  }

  ,
  clearGraph: function(sparqlServerUrl, graphUri, callback) {
    var strClear = "CLEAR GRAPH <" + graphUri + "> ";

    var headers = {};
    headers["Accept"] = "application/sparql-results+json";
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    var sparqlUrl = sparqlServerUrl + "?query=";
    httpProxy.post(sparqlUrl, headers, { query: strClear }, function(err, result) {
      if (err) {
        return callback(err);
      }
      return callback();
    });
  }
  ,
  ontologyUrl2tripleStore: function(url, sparqlServerUrl, graphUri, format, callback) {
    var totalTriples = 0;
    var fechSize = 200;
    var fetchCount = 0;

    var tripleSlices = [];
    var tripleSlice = "";
    var imports = [];

    function writeTriples(triples) {
      if (!sparqlServerUrl) {
        return callback(null, { graphUri: graphUri, imports: imports, totalTriples: totalTriples });
      }

      var triplesArray = triples.split("\n");

      triplesArray.forEach(function(item, index) {
        if (fetchCount++ < fechSize) {
          tripleSlice += item + "\n";
        }
        else {
          tripleSlices.push("" + tripleSlice);
          tripleSlice = "";
          fetchCount = 0;
        }
      });
      tripleSlices.push("" + tripleSlice);

      async.eachSeries(
        tripleSlices,
        function(triples, callbackEach) {
          SourceIntegrator.insertTriples(sparqlServerUrl, graphUri, triples, function(err, result) {
            return callbackEach(err);
          });
        },
        function(err) {
          return callback(null, { graphUri: graphUri, imports: imports, totalTriples: totalTriples });
        }
      );
    }

    function parseImports(quad) {
      if (quad.predicate.value.indexOf("owl#imports")>-1) {

        imports.push(quad.object.value);
      }

      for (var pattern in topOntologyPatternsMap) {
        var p = quad.predicate.value.indexOf(pattern);
        if (p > -1) {
          if (imports.indexOf(topOntologyPatternsMap[pattern]) < 0) {
            imports.push(topOntologyPatternsMap[pattern]);
          }
        }

        if (quad.object.value.indexOf("http") == 0) {
          var p = quad.object.value.indexOf(pattern);
          if (p > -1) {
            if (imports.indexOf(topOntologyPatternsMap[pattern]) < 0) {
              imports.push(topOntologyPatternsMap[pattern]);
            }
          }
        }
      }
    }

    function parseRdfXml() {
      try {
        const myParser = new RdfXmlParser();
        myParser.on("data", function(quad) {
          parseImports(quad);
          totalTriples++;
          writer.addQuad(quad.subject, quad.predicate, quad.object);
        });
        myParser.on("end", function(quad) {
          writer.end((error, triples) => {
            writeTriples(triples);
          });
        });
        myParser.on("error", function(err) {
          callback(err);
        });
        request.get(url).pipe(myParser);
      } catch (e) {
        return callback(e);
      }
    }

    function parseTTL() {
      var triples = [];
      const streamParser = new N3.StreamParser();
      request.get(url).pipe(streamParser);

      streamParser.on("data", function(quad) {
        parseImports(quad);
        totalTriples++;
        writer.addQuad(quad.subject, quad.predicate, quad.object);
      });
      streamParser.on("end", function(quad) {
        writer.end((error, triples) => {
          writeTriples(triples);
        });
      });

      streamParser.on("error", function(err) {
        callback(err);
      });
    }

    writer = new N3.Writer({ format: "N-Triples", prefixes: {} });
    if (format == "rdf") {
      parseRdfXml();
    }
    else if (format == "ttl") {
      parseTTL();
    }
  }
  ,

  importSourceFromTurtle: function(ontologyUrl, sourceName, options, callback) {
    console.log("----------importing " + sourceName);
    var Config;
    var documentStr = "";
    var graphUri = null;
    var sparqlInsertStr = null;
    var sources = null;
    var Config = null;
    var sourceStatus = {};
    var sparqlServerUrl = null;
    var importUris = [];
    var importsSources = [];
    var format = null;
    async.series(
      [
        //getConfig
        function(callbackSeries) {
          if (options.graphUri) {
            graphUri = options.graphUri;
          }
          else {
            graphUri = "http://industryportal.enit.fr/ontologies/" + sourceName + "#";
          }
          configPath = path.join(__dirname, "../" + "config" + "/mainConfig.json");
          jsonFileStorage.retrieve(path.resolve(configPath), function(err, _config) {
            Config = _config;
            sparqlServerUrl = options.sparqlServerUrl || Config.default_sparql_url;
            return callbackSeries();
          });
        },

        //get sources
        function(callbackSeries) {
          var sourcesPath = path.join(__dirname, "../" + "config/" + options.sourcesJsonFile);
          jsonFileStorage.retrieve(path.resolve(sourcesPath), function(err, _sources) {
            sources = _sources;
            return callbackSeries();
          });
        },

        //check if ontology already exist (with graphUri)
        function(callbackSeries) {
          if (!options.reload) {
            return callbackSeries();
          }
          SourceIntegrator.clearGraph(sparqlServerUrl, graphUri, function(err, result) {
            return callbackSeries(err);
          });
        },

        //check if ontology already exist (with graphUri)
        function(callbackSeries) {
          if (!options.clear) {
            return callbackSeries();
          }
          SourceIntegrator.clearGraph(sparqlServerUrl, graphUri, function(err, result) {
            return callback(err);
          });
        },

        //check if ontology already exist (with graphUri)
        function(callbackSeries) {
          if (options.reload) {
            sourceStatus.exists = false;
            return callbackSeries();
          }

          var sourcesArray = Object.keys(sources);
          if (sourcesArray.indexOf(sourceName) > -1) {
            sourceStatus.exists = true;
            return callbackSeries();
          }

          for (var source in sources) {
            if (sources[source].graphUri == graphUri) {
              sourceStatus.exists = source;
            }
            else {
              sourceStatus.exists = false;
            }
          }
          return callbackSeries();
        },

        //get ontology format
        function(callbackSeries) {
          if (sourceStatus.exists) {
            return callbackSeries();
          }
          SourceIntegrator.getOntologyFormat(ontologyUrl, function(err, result) {
            if (err) {
              return callbackSeries(err);
            }
            format = result;

            return callbackSeries();
          });
        },

        //parse and write triples
        function(callbackSeries) {
          if (sourceStatus.exists) {
            return callbackSeries();
          }

          SourceIntegrator.ontologyUrl2tripleStore(ontologyUrl, sparqlServerUrl, graphUri, format, function(err, result) {
            if (err) {
              return callbackSeries(err);
            }
            graphUri = result.graphUri;
            sparqlInsertStr = result.sparqlInsertStr;
            importUris = result.imports;
            return callbackSeries();
          });
        },

        // get imports sources
        function(callbackSeries) {
          if (!importUris || importUris.length == 0) {
            return callbackSeries();
          }

          importUris.forEach(function(importUri) {
            if (importsSourcesMap[importUri]) {
              importsSources.push(importsSourcesMap[importUri]);
            }
            else {
              console.log(importUri);
            }
          });

          return callbackSeries();
        },

        //register source if not exists
        function(callbackSeries) {
          if (sourceStatus.exists) {
            return callbackSeries();
          }

          var id = Util.getRandomHexaId(10);
          var newSource = {
            name: sourceName,
            _type: "source",
            id: id,
            type: "",
            graphUri: graphUri,
            sparql_server: {
              url: sparqlServerUrl,
              method: "Post",
              headers: []
            },
            editable: options.editable,
            controller: "Sparql_OWL",
            topClassFilter: "?topConcept rdf:type owl:Class .?topConcept rdfs:label|skos:prefLabel ?XX.",
            schemaType: "OWL",
            allowIndividuals: options.allowIndividuals,
            predicates: {
              broaderPredicate: "",
              lang: ""
            },
            group: "ONTOCOMMONS",
            imports: importsSources,
            taxonomyPredicates: ["rdfs:subClassOf", "rdf:type"]
          };

          sources[sourceName] = newSource;
          var sourcesPath = path.join(__dirname, "../" + "config" + "/ontocommonsSources.json");
          jsonFileStorage.store(path.resolve(sourcesPath), sources, function(err, result) {
            if (err) {
              return callbackSeries(err);
            }
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
  ,
  getOntologyFormat: function(ontologyUrl, callback) {
    request(ontologyUrl, function(error, response, body) {
      if (error) {
        return callback(err);
      }
      if (body.indexOf("<?xml") == 0) {
        format = "rdf";
      }
      else {
        format = "ttl";
      }

      return callback(null, format);
    });
  }
  ,
  getOntologyFormat: function(ontologyUrl, callback) {
    request(ontologyUrl, { timeout: 1500 }, function(error, response, body) {
      if (error) {
        return callback(error);
      }
      if (body.indexOf("<?xml") == 0) {
        format = "rdf";
      }
      else {
        format = "ttl";
      }

      return callback(null, format);
    });
  }
  ,

  listPortalOntologies: function(apiKey, callback) {
    var url = "http://data.industryportal.enit.fr/ontologies?apikey=" + apiKey;
    request(url, function(error, response, body) {
      if (error) {
        return callback(error);
      }
      var jsonArray = JSON.parse(body);
      var ontologiesMap = {};

      jsonArray.forEach(function(item) {
        ontologiesMap[item.acronym] = {};
      });
      var x = ontologiesMap;
      return callback(null, ontologiesMap);
    });
  }
  ,

  getOntologiesInfos: function(callback) {
    var apiKey = "019adb70-1d64-41b7-8f6e-8f7e5eb54942";
    SourceIntegrator.listPortalOntologies(apiKey, function(err, ontologiesMap) {
      if (err) {
        return callback(err);
      }
      var array = Object.keys(ontologiesMap);
      async.eachSeries(
        array,
        function(ontologyId, callbackEach) {
          var graphUri = "http://industryportal.enit.fr/ontologies/" + ontologyId + "#";
          var ontologyUrl = "http://data.industryportal.enit.fr/ontologies/" + ontologyId + "/submissions/1/download?apikey=" + apiKey;
          SourceIntegrator.getOntologyFormat(ontologyUrl, function(err, result) {
            if (err) {
              return callbackEach(err);
            }
            var format = result;
            SourceIntegrator.ontologyUrl2tripleStore(ontologyUrl, null, graphUri, format, function(err, result) {
              if (err) {
                ontologiesMap[ontologyId] = {
                  ERROR: err
                };
              }
              else {
                ontologiesMap[ontologyId] = {
                  graphUri: graphUri,
                  format: format,
                  totalTriples: result.totalTriples,
                  imports: result.imports
                };
              }

              return callbackEach();
            });
          });
        },
        function(err) {
          console.log(JSON.stringify(ontologiesMap));
        }
      );
    });
  }
  ,

  checkImports: function() {
    var fs = require("fs");
    var path = "D:\\NLP\\ontologies\\Ontocommons\\ontologiesStats.json";
    var str = "" + fs.readFileSync(path);
    var ontologiesMap = JSON.parse(str);
    var array = Object.keys(ontologiesMap);
    async.eachSeries(
      array,
      function(ontologyId, callbackEach) {
        var obj = ontologiesMap[ontologyId];
        ontologiesMap[ontologyId].checkedImports = {};
        if (!obj.imports || obj.imports.length == 0) {
          return callbackEach();
        }
        async.eachSeries(
          obj.imports,
          function(importUrl, callbackEach2) {
            SourceIntegrator.getOntologyFormat(importUrl, function(err, result) {
              if (err) {
                ontologiesMap[ontologyId].checkedImports[importUrl] = "KO";
              }
              else {
                ontologiesMap[ontologyId].checkedImports[importUrl] = result;
              }

              callbackEach2();
            });
          },
          function(err) {
            callbackEach();
          }
        );
      },
      function(err) {
        console.log(JSON.stringify(ontologiesMap));
      }
    );
  }
  ,

  listImports: function() {
    var fs = require("fs");
    var path = "D:\\NLP\\ontologies\\Ontocommons\\ontologiesStats2.json";
    var str = "" + fs.readFileSync(path);
    var ontologiesMap = JSON.parse(str);
    var okImports = {};
    var koImports = {};
    for (var ontologyId in ontologiesMap) {
      for (var importUri in ontologiesMap[ontologyId].checkedImports) {
        if (ontologiesMap[ontologyId].checkedImports[importUri] == "KO") {
          if (!koImports[importUri]) {
            koImports[importUri] = 0;
          }
          koImports[importUri] += 1;
        }
        else {
          if (!okImports[importUri]) {
            okImports[importUri] = 0;
          }
          okImports[importUri] += 1;
        }
      }
    }

    var importsMap = {};
    for (var importUri in okImports) {
      var array = importUri.split("/");
      var acronym = array[array.length - 1];
      importsMap[importUri] = acronym.toUpperCase();
    }

    console.log(JSON.stringify(koImports, null, 2));
    console.log(JSON.stringify(importsMap, null, 2));
  }
  ,

  importImportsMap: function() {
    async.eachSeries(
      Object.keys(importsSourcesMap),
      function(importUrl, callbackEach) {
        var sourceName = importsSourcesMap[importUrl];
        var options = {
          graphUri: importUrl,
          sourceName: sourceName,
          allowIndividuals: true,
          editable: false,
          sourcesJsonFile: "ontocommonsSources.json",
          reload: true
          // clear:true
        };

        SourceIntegrator.importSourceFromTurtle(importUrl, sourceName, options, function(err, result) {
          if (err) {
            console.log({ [importUrl]: "ERROR : " + err });
          }

          callbackEach();
        });
      },
      function(err) {
        console.log(err);
      }
    );
  }
  ,

  replaceSourcesImportUrlBySourceName: function() {
    var sourcesJsonFile = "ontocommonsSources.json";
    var sourcesPath = path.join(__dirname, "../" + "config/" + sourcesJsonFile);
    jsonFileStorage.retrieve(path.resolve(sourcesPath), function(err, _sources) {
      var sources = _sources;

      for (var sourceName in sources) {
        var source = sources[sourceName];
        var sourceImportNames = [];
        source.imports.forEach(function(importUrl) {
          if (importsSourcesMap[importUrl]) {
            sourceImportNames.push(importsSourcesMap[importUrl]);
          }
          else {
            sourceImportNames.push(importUrl);
          }
        });
        sources[sourceName].imports = sourceImportNames;
      }

      console.log(JSON.stringify(sources, null, 2));
    });
  }

};
module.exports = SourceIntegrator;


if (false) {
  try {
    var filePath = "D:\\apache-jena-4.7.0\\data\\lov_vvo.rdf";
    SourceIntegrator.jenaParse(filePath, function(err, triples) {

    });
  } catch (e) {
    var x = e;
  }
}


if (false) {
  var url = "http://data.industryportal.enit.fr/ontologies/VVO/submissions/1/download?apikey=521da659-7f0a-4961-b0d8-5e15b52fd185";
  url = "http://data.industryportal.enit.fr/ontologies/VVO/submissions/1/download?apikey=521da659-7f0a-4961-b0d8-5e15b52fd185";

  url = "http://data.industryportal.enit.fr/ontologies/CHAMEO/submissions/1/download?apikey=521da659-7f0a-4961-b0d8-5e15b52fd185";

  var sourceName = "TEST_ONTOCOMMONS";
  var options = {
    graphUri: "htp://slsv/temp/",
    visibility: null,
    sourceName: null,
    user: null,
    profile: null,
    sparqlServerUrl: null,
    allowIndividuals: true,
    editable: false,
    sourcesJsonFile: "ontocommonsSources.json",
    reload: true
  };

  SourceIntegrator.importSourceFromTurtle(url, sourceName, options, function(err, result) {
  });
}

if (false) {
  SourceIntegrator.listImports();
}

if (false) {
  SourceIntegrator.importImportsMap();
}

if (false) {
  SourceIntegrator.replaceSourcesImportUrlBySourceName();
}
