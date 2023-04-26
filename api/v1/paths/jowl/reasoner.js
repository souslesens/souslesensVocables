const HttpProxy = require("../../../../bin/httpProxy.");
const ConfigManager = require("../../../../bin/configManager.");
const GraphStore = require("../../../../bin/graphStore.");
const Util = require("../../../../bin/util.");
const fs = require("fs");
const { processResponse } = require("../utils");
const request = require("request");


//https://jena.apache.org/documentation/inference/


module.exports = function() {
  let operations = {
    GET
  };

  function GET(req, res, next) {
    let options = null;
    if (req.query.options) {
      options = JSON.parse(req.query.options);
    }


    var jowlConfig = ConfigManager.config.jowlServer;

    if (req.query.type == "externalUrl") {

      var url = jowlConfig.url + "reasoner/" + req.query.operation + "?filePath=" + req.query.url;
      HttpProxy.post(jowlConfig.url, {}, function(err, result) {
        if (err) {
          next(err);
        }
        else {
          return processResponse(res, err, JSON.parse(result));
        }
      });
    }


    else if (req.query.type == "internalGraphUri" && ConfigManager.config) {

      var ontologyContent = "";
      var sparqlServerConnection = { url: ConfigManager.config.default_sparql_url };
      if (ConfigManager.config.sparql_server.user) {
        sparqlServerConnection.auth = {
          user: ConfigManager.config.sparql_server.user,
          pass: ConfigManager.config.sparql_server.password,
          sendImmediately: false
        };
      }
      var graphUri = req.query.url;

      var ontologyContent = null;
      GraphStore.exportGraph(sparqlServerConnection, graphUri, function(err, result) {
        if (err) {
          return res.status(400).json({ error: err });
        }


        var ontologyContentEncoded64 = Buffer.from(result).toString("base64");


        var payload={
          ontologyContentEncoded64: ontologyContentEncoded64,

        };


        var options = {
          method: "POST",
          json: payload,
          headers: {
            "content-type": "application/json"
          },
         url: jowlConfig.url + "reasoner/" + req.query.operation


        };
        request(options, function(error, response, body) {
          return processResponse(res, error, body);
        });


      });


    }
  }

  GET.apiDoc = {
    security: [{ loginScheme: [] }],
    summary: "Query Jowl server",
    description: "Query Jowl server",
    operationId: "Query Jowl server",
    parameters: [
      {
        name: "operation",
        description: "operation",
        type: "string",
        in: "query",
        required: true
      },
      {
        name: "type",
        description: "externalUrl/ internalGraphUri",
        in: "query",
        type: "string",
        required: true
      },
      {
        name: "url",
        description: "source graphUri or url",
        in: "query",
        type: "string",
        required: true
      },
      {
        name: "options",
        description: "JSON ",
        in: "query",
        type: "string",
        required: false
      }
    ],

    responses: {
      200: {
        description: "Results",
        schema: {
          type: "object"
        }
      }
    }
  };

  return operations;
};
