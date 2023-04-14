const { processResponse } = require("./utils");
const ExportGraph = require("../../../bin/exportGraph.");
const GraphTraversal = require("../../../bin/graphTraversal.");
const ConfigManager = require("../../../bin/configManager.");
const UserRequestFiltering = require("../../../bin/userRequestFiltering.");

module.exports = function() {
  let operations = {
    POST
  };

  async function POST(req, res, next) {
    const body = req.body.body;
    var auth = null;
    if (ConfigManager.config && body.sparqlServerUrl.indexOf(ConfigManager.config.default_sparql_url) == 0) {
      auth = {
        user: ConfigManager.config.sparql_server.user,
        pass: ConfigManager.config.sparql_server.password,
        sendImmediately: false
      };

      ConfigManager.getUserSources(req, res, function(err, userSources) {
        if (err) {
          return processResponse(res, err, userSources);
        }

        var userGraphUrisMap = UserRequestFiltering.getUserGraphUrisMap(userSources);
        if (!userGraphUrisMap[body.graphUri]) {
          return processResponse(res, "DATA PROTECTION : graphUri no tallowed for user", null);
        }


        if (body.numberOfPathes > 1) {
          GraphTraversal.getAllShortestPath(body.sparqlServerUrl, body.graphUri, body.fromNodeUri, body.toNodeUri, body.numberOfPathes, { auth: auth }, function(err, result) {
            processResponse(res, err, result);
          });
        }
        else {
          GraphTraversal.getShortestPath(body.sparqlServerUrl, body.graphUri, body.fromNodeUri, body.toNodeUri, { auth: auth }, function(err, result) {
            processResponse(res, err, result);
          });
        }

      })
    }
};
POST.apiDoc = {
  summary: "Get the shortest path between two node",
  security: [{ loginScheme: [] }],
  operationId: "getShortestPath",
  parameters: [
    {
      name: "body",
      description: "body",
      in: "body",
      schema: {
        type: "object",
        properties: {
          sparqlServerUrl: {
            type: "string"
          },
          graphUri: {
            type: "string"
          },
          fromNodeUri: {
            type: "string"
          },
          toNodeUri: {
            type: "string"
          },
          numberOfPathes: {
            type: "number"
          }
        }
      }
    }
  ],
  responses: {
    default: {
      description: "Response…"
    }
  }
};

return operations;
}
;
