const ConfigManager = require("../configManager.");
const httpProxy = require("../httpProxy.");
const async = require("async");
const util = require("../util.");
const KGbuilder_socket=require ('./KGbuilder_socket')



KGbuilder_triplesWriter={

 writeTableTriplse:function() {


 },

  writeUniqueTriples: function(triples, graphUri, sparqlServerUrl, callback) {
    //var tempGraphUri="http://souslesesn.org/temp/"+util.getRandomHexaId(5)+"/"
    var tempGraphUri = graphUri + "temp/";

    async.series(
      [
        //insert triple into tempoary graph
        function(callbackSeries) {
          KGtripleBuilder.writeTriples(triples, tempGraphUri, sparqlServerUrl, function(err, result) {
            return callbackSeries(err);
            callbackSeries();
          });
        },

        //getDifference
        function(callbackSeries) {
          var query = "" + "select count distinct *  " + "WHERE {" + "  GRAPH <" + tempGraphUri + "> { ?s ?p ?o }" + "  FILTER NOT EXISTS { GRAPH <" + graphUri + "> { ?s ?p ?o } }" + "}";

          var params = { query: query };

          if (ConfigManager.config && sparqlServerUrl.indexOf(ConfigManager.config.default_sparql_url) == 0) {
            params.auth = {
              user: ConfigManager.config.sparql_server.user,
              pass: ConfigManager.config.sparql_server.password,
              sendImmediately: false
            };
          }

          httpProxy.post(sparqlServerUrl, null, params, function(err, _result) {
            if (err) {
              return callbackSeries(err);
            }
            callbackSeries();
          });
        },

        //writeDifference
        function(callbackSeries) {
          var query =
            "" +
            // "WITH <" +graphUri+"> "+
            "insert {GRAPH <" +
            graphUri +
            "> {?s ?p ?o}} " +
            "WHERE {" +
            "  GRAPH <" +
            tempGraphUri +
            "> { ?s ?p ?o }" +
            "  FILTER NOT EXISTS { GRAPH <" +
            graphUri +
            "> { ?s ?p ?o } }" +
            "}";

          var params = { query: query };

          if (ConfigManager.config && sparqlServerUrl.indexOf(ConfigManager.config.default_sparql_url) == 0) {
            params.auth = {
              user: ConfigManager.config.sparql_server.user,
              pass: ConfigManager.config.sparql_server.password,
              sendImmediately: false
            };
          }

          httpProxy.post(sparqlServerUrl, null, params, function(err, _result) {
            if (err) {
              return callbackSeries(err);
            }
            callbackSeries();
          });
        },

        // delete tempGraph
        function(callbackSeries) {
          var query = "clear Graph  <" + tempGraphUri + "> ";
          var params = { query: query };

          if (ConfigManager.config && sparqlServerUrl.indexOf(ConfigManager.config.default_sparql_url) == 0) {
            params.auth = {
              user: ConfigManager.config.sparql_server.user,
              pass: ConfigManager.config.sparql_server.password,
              sendImmediately: false
            };
          }

          httpProxy.post(sparqlServerUrl, null, params, function(err, _result) {
            if (err) {
              return callback(err);
            }
            callbackSeries();
          });
        }
      ],
      function(err) {
        return callback(err, triples.length);
      }
    );
  },
  /**
   * Write <triples> in <graphUri> at <sparqlServerUrl>
   *
   * @param {Array} triples - array of {s: ,p: ,o: }
   * @param {string} graphUri - URI to name the graph that will be written
   * @param {string} sparqlServerUrl - URL of the sparql endpoint where to write the graph
   * @param {Function} callback - Node-style async Function called to proccess result or handle error
   */
  writeTriples: function(triples, graphUri, sparqlServerUrl, callback) {
    var insertTriplesStr = "";
    var totalTriples = 0;
    triples.forEach(function(triple) {
      var str = triple.s + " " + triple.p + " " + triple.o + ". ";
      insertTriplesStr += str;
    });

    var queryGraph = KGtripleBuilder.getSparqlPrefixesStr();

    queryGraph += " WITH GRAPH  <" + graphUri + ">  " + "INSERT DATA" + "  {" + insertTriplesStr + "  }";

    var params = { query: queryGraph };

    if (ConfigManager.config && sparqlServerUrl.indexOf(ConfigManager.config.default_sparql_url) == 0) {
      params.auth = {
        user: ConfigManager.config.sparql_server.user,
        pass: ConfigManager.config.sparql_server.password,
        sendImmediately: false
      };
    }

    httpProxy.post(sparqlServerUrl, null, params, function(err, _result) {
      if (err) {
        var x = queryGraph;
        return callback(err);
      }
      totalTriples += triples.length;
      return callback(null, totalTriples);
    });
  },

  /**
   * Delete graph named <graphUri> from sparql endpoint at <sparqlServerUrl>
   *
   * @param {string} graphUri - URI of the graph to delete
   * @param {string} sparqlServerUrl - URL of the sparql endpoint
   * @param {Function} callback - Node-style async Function called to proccess result or handle error
   */
  clearGraph: function(graphUri, sparqlServerUrl, callback) {
    async.series(
      [
        function(callbackSeries) {
          if (sparqlServerUrl) {
            return callbackSeries();
          }
          ConfigManager.getGeneralConfig(function(err, result) {
            if (err) {
              return callbackSeries(err);
            }
            sparqlServerUrl = result.default_sparql_url;
            callbackSeries();
          });
        },
        function(_callbackSeries) {
          var query = "clear graph   <" + graphUri + ">";
          var params = { query: query };

          if (ConfigManager.config && sparqlServerUrl.indexOf(ConfigManager.config.default_sparql_url) == 0) {
            params.auth = {
              user: ConfigManager.config.sparql_server.user,
              pass: ConfigManager.config.sparql_server.password,
              sendImmediately: false
            };
          }

          httpProxy.post(sparqlServerUrl, null, params, function(err, _result) {
            if (err) {
              return callback(err);
            }

            return callback(null);
          });
        }
      ],
      function(err) {
        return callback(err, "graph cleared");
      }
    );
  },

  deleteMappingFileTriples: function(mappings, callback) {
    var query = "";
    query += "with  GRAPH <" + mappings.graphUri + "> " + "delete {?s ?p ?o} where {?s ?p ?o. ?s <" + KGbuilder_triplesMaker.mappingFilePredicate + "> '" + mappings.fileName + "'}";
    var params = { query: query };
    if (ConfigManager.config && mappings.sparqlServerUrl.indexOf(ConfigManager.config.default_sparql_url) == 0) {
      params.auth = {
        user: ConfigManager.config.sparql_server.user,
        pass: ConfigManager.config.sparql_server.password,
        sendImmediately: false
      };
    }
    httpProxy.post(mappings.sparqlServerUrl, null, params, function(err, result) {
      if (err) {
        var x = query;
        return callback(err);
      }

      return callback(null, result.results.bindings[0]["callret-0"].value);
    });
  },

  deleteTriples: function(triples, graphUri, sparqlServerUrl, callback) {
    var insertTriplesStr = "";
    var totalTriples = 0;
    triples.forEach(function(triple) {
      var str = triple.s + " " + triple.p + " " + triple.o + ". ";
      insertTriplesStr += str;
    });
    var query = KGtripleBuilder.getSparqlPrefixesStr();
    query += "DELETE DATA {  GRAPH <" + graphUri + "> {  " + insertTriplesStr + " }  } ";
    var params = { query: query };
    if (ConfigManager.config && sparqlServerUrl.indexOf(ConfigManager.config.default_sparql_url) == 0) {
      params.auth = {
        user: ConfigManager.config.sparql_server.user,
        pass: ConfigManager.config.sparql_server.password,
        sendImmediately: false
      };
    }

    httpProxy.post(sparqlServerUrl, null, params, function(err, _result) {
      if (err) {
        var x = query;
        return callback(err);
      }
      totalTriples += triples.length;
      return callback(null, totalTriples);
    });
  },

  getSparqlPrefixesStr: function() {
    var str = "";
    for (var key in KGbuilder_main.sparqlPrefixes) {
      str += "PREFIX " + key + ": " + KGbuilder_main.sparqlPrefixes[key] + " ";
    }
    return str;
  },


}