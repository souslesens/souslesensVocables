const { processResponse } = require("../utils");
const SourceIntegrator = require("../../../../bin/sourceIntegrator.");
const ConfigManager = require("../../../../bin/configManager.");
const GraphStore = require("../../../../bin/graphStore.");
const async2 = require("async");
const request = require("request");
const httpProxy = require("../../../../bin/httpProxy.");
const Util = require("../../../../bin/util.");

module.exports = function () {
    let operations = {
        POST,
    };

    async function POST(req, res, next) {
        console.log("---------POST");
if(req.body.uploadUrl){

}
     if (req.files && req.files["importRDF"]) {
         console.log("---------1");
            var graphUri = req.body.graphUri
            var data = "" + req.files["importRDF"].data;
            var uploadFromUrl=false

            var jowlConfig = ConfigManager.config.jowlServer;
            ConfigManager.getUser(req, res, function(err, userInfo) {
                if (err) {
                    return res.status(400).json({ error: err });
                }
                if (userInfo.user.groups.indexOf("admin") < 0) {
                    return res.status(403);
                }
                var sparqlServerConnection = { url: ConfigManager.config.sparql_server.url };
                if (ConfigManager.config.sparql_server.user) {
                    sparqlServerConnection.auth = {
                        user: ConfigManager.config.sparql_server.user,
                        pass: ConfigManager.config.sparql_server.password,
                        sendImmediately: false,
                    };
                }
               var  clearOldGraph=false
                var graphExists = false;
                var allTriples = [];
                var totalImportedTriples = -1;
                var ontologyContentEncoded64 = null;
                async2.series(
                  [


                      // check if graphExists
                      function(callbackSeries) {
                          console.log("---------2");
                          GraphStore.graphExists(sparqlServerConnection, graphUri, function(err, result) {
                              graphExists = result;
                              return callbackSeries(err);
                          });
                      },

                      //clear graph  if reload
                      function(callbackSeries) {
                          console.log("---------3");
                          if (clearOldGraph !== "true") {
                              return callbackSeries();
                          }
                          if (!graphExists) {
                              return callbackSeries();
                          }

                          GraphStore.clearGraph(sparqlServerConnection, graphUri, function(err, result) {
                              if (err) {
                                  return callbackSeries(err);
                              }

                              graphExists = false;
                              return callbackSeries();
                          });
                      },

                      function(callbackSeries) {
                      if(uploadFromUrl) {
                          request(uploadFromUrl, {}, function(error, request, body) {
                              if (error) return callbackSeries();
                              ontologyContentEncoded64 = Buffer.from(body).toString("base64");

                              callbackSeries();
                          });
                      }
                      else{
                          console.log("---------4");
                          ontologyContentEncoded64 = Buffer.from(data).toString("base64");
                          console.log("---------ontology contentOK");
                        callbackSeries();
                      }
                      },

                      //get triples from jowl/jena/rdftriple
                      function(callbackSeries) {
                          if (graphExists) {
                              return callbackSeries();
                          }

                          var payload = {
                              ontologyContentEncoded64: ontologyContentEncoded64,
                          };

                          var options = {
                              method: "POST",
                              json: payload,
                              headers: {
                                  "content-type": "application/json",
                              },
                              url: jowlConfig.url + "jena/rdftriple",
                          };
                          console.log("---------5");
                          request(options, function(error, response, body) {
                              if (error) {
                                  return callbackSeries(error);
                              }
                              if (!body) {
                                  return callbackSeries("Cannot import ontology file");
                              }
                              if (!Array.isArray(body)) {
                                  return callbackSeries(body);
                              }
                              allTriples = body;
                              if (allTriples.length == 0) {
                                  return callbackSeries("no triples generated for url " + body.rdfUrl);
                              }
                              console.log("---------ontology transformed-OK");
                              callbackSeries();
                          });
                      },

                      //writeTriples
                      function(callbackSeries) {
                          console.log("---------6");
                          if (graphExists) {
                              return callbackSeries();
                          }

                          var slices = Util.sliceArray(allTriples, 200);
                          totalImportedTriples = -1;
                          async2.eachSeries(
                            slices,
                            function(triples, callbackEach) {
                                var insertTriplesStr = "";

                                triples.forEach(function(triple) {
                                    var p = triple.object.indexOf("@");
                                    if (p > -1) {
                                        triple.object = triple.object.replace(/(.*)(@[a-z]{2})'/, function(a, b, c) {
                                            return b + "'" + c;
                                        });
                                    }
                                    var str = triple.subject + " " + triple.predicate + " " + triple.object + ". ";
                                    insertTriplesStr += str;
                                });

                                var queryGraph = ""; //KGtripleBuilder.getSparqlPrefixesStr();

                                queryGraph += " WITH GRAPH  <" + graphUri + ">  " + "INSERT DATA" + "  {" + insertTriplesStr + "  }";
                                // console.log(query)

                                //  queryGraph=Buffer.from(queryGraph, 'utf-8').toString();

                                var params = { query: queryGraph };

                                if (ConfigManager.config) {
                                    params.auth = sparqlServerConnection.auth;
                                }

                                sparqlServerUrl = sparqlServerConnection.url;
                                console.log("---------7");
                                httpProxy.post(sparqlServerUrl, null, params, function(err, _result) {
                                    if (err) {
                                        var x = queryGraph;
                                        return callbackEach(err);
                                    }
                                    totalImportedTriples += triples.length;
                                    console.log("---------ontology import-OK"+totalImportedTriples);
                                    return callbackEach();
                                });
                            },
                            function(err) {
                                return callbackSeries(err);
                            }
                          );
                      },
                  ],
                  function(err) {
                      console.log("---------8");
                      processResponse(res, err, { result: totalImportedTriples });
                  }
                );
            });
        }
    }

    POST.apiDoc = {
        summary: "Upload files",
        security: [{ restrictLoggedUser: [] }],
        operationId: "upload",
        parameters: [],
        responses: {
            200: {
                description: "Response",
                schema: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            user: {
                                type: "string",
                            },
                            tool: {
                                type: "string",
                            },
                            timestamp: {
                                type: "string",
                            },
                        },
                    },
                },
            },
        },
    };

    return operations;
};
