const path = require("path");
const dictionariesManager = require(path.resolve("bin/KG/dictionariesManager."));


module.exports = function () {
  let operations = {
    GET,
    POST
  };

  function GET(req, res, next) {

    dictionariesManager.listIndexes(function (err, result) {
      if (err) {
        return res.status(400).json({ error: err })
      }
      return res.status(200).json(result)
    });
  }

  function POST(req, res, next) {
    elasticRestProxy.executePostQuery("_search", req.body.query, req.body.indexes, function (err, result) {
      if (err) {
        return res.status(400).json({ error: err })
      }
      return res.status(200).json(result);
    });



  }


  GET.apiDoc = {

    security: [{ loginScheme: [] }],
    summary: 'Get ElasticSearch indices',
    description: "Get ElasticSearch indices",
    operationId: 'Get ElasticSearch indices',
    parameters: [],

    responses: {
      200: {
        description: 'Results',
        schema: {
          type: 'array',
          items: {
            type: "string",
          }
        }
      },
    }
  }
  POST.apiDoc = {

    security: [{ loginScheme: [] }],
    summary: 'Post elasticSearch Query',
    description: "Post elasticSearch Query",
    operationId: 'PostElasticSearchQuery',
    parameters: [
      {
        name: 'body',
        description: "body",
        in: 'body',
        schema: {
          type: 'object',
          properties: {
            query: {
              type: "string",
            },
            indexes: {
              type: "array"
              , items: { type: "string" }
            }

          }

        }
      }
    ],

    responses: {
      200: {
        description: 'Results',
        schema: {
          type: 'array',
          items: {
            type: "string",
          }
        }
      },
    }
  }

  return operations;
}
