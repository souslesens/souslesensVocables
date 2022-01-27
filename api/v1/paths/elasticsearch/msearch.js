const path = require("path");
const elasticRestProxy = require(path.resolve("bin/elasticRestProxy..js"));

module.exports = function() {
  let operations = {
    POST
  };

  function POST(req, res, next) {
    elasticRestProxy.executeMsearch(req.body.ndjson, function (err, result) {
      if (err) {
        return res.status(400).json({error: err})
      }
      return res.status(200).json(result);
    });
  }

  POST.apiDoc = {

    security: [{loginScheme: []}],
    summary: 'Elasticsearch msearch',
    description: "Elasticsearch msearch",
    operationId: 'Elasticsearch msearch',
    parameters: [
      {
        name: 'body',
        description: "body",
        in: 'body',
        schema: {
          type: 'object',
          properties: {
            ndjson: {
              type: "string",
            },
          }
          
        }
      }
    ],

    responses: {
      200: {
        description: 'Results',
        schema: {
          type: 'object',
        }
      },
    }
  }

  return operations;
}
