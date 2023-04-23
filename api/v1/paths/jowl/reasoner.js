const HttpProxy = require("../../../bin/httpProxy.");
const ConfigManager = require("../../../bin/configManager.");

module.exports = function() {
  let operations = {
    GET
  };

  function GET(req, res, next) {
    let options = null;
    if (req.query.options) {
      options = JSON.parse(req.query.options);
    }
      var jowlConfig=ConfigManager.config.jowlServer


      HttpProxy.get(jowlConfig.url,) {
      if (err) {
        next(err);
      }
      else {
        return res.status(200).json(result);
      }
    });
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
        description: "type  sourceName or url",
        in: "query",
        type: "string",
        required: true
      },
      {
        name: "name",
        description: "source name or url",
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
