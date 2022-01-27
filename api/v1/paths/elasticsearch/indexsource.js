const path = require("path");
const dictionariesManager = require(path.resolve("bin/KG/dictionariesManager."));

module.exports = function() {
  let operations = {
    POST
  };

  function POST(req, res, next) {

    dictionariesManager.indexSource(req.body.name, req.body.data, req.body.options, function (err, result) {
      if (err) {
        return res.status(400).json({error: err})
      }
      return res.status(200).json(result);
    });
  }

  POST.apiDoc = {

    security: [{loginScheme: []}],
    summary: 'Elasticsearch index source',
    description: "Elasticsearch index source",
    operationId: 'Elasticsearch index source',
    parameters: [
      {
        name: 'body',
        description: "body",
        in: 'body',
        schema: {
          type: 'object',
          properties: {
            name: {
              type: "string",
            },
            data: {
              type: "array",
              items: {
                type: "object"
              }
            },
            options: {
              type: "object",
              properties: {
                replaceIndex: {
                  type: "boolean"
                },
                owlType: {
                  type: "string"
                }
              }
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
