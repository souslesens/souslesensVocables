const path = require("path");
const dictionariesManager = require(path.resolve("bin/KG/dictionariesManager."));


module.exports = function() {
  let operations = {
    GET
  };

  function GET(req, res, next) {

    dictionariesManager.listIndexes(function (err, result) {
      if (err) {
        return res.status(400).json({error: err})
      }
        return  res.status(200).json(result)
    });
  }


  GET.apiDoc = {

    security: [{loginScheme: []}],
    summary: 'Get ElasticSearch indices',
    description: "Get ElasticSearch indices",
    operationId: 'Get ElasticSearch indices',
    parameters: [],

    responses: {
      200: {
        description: 'Results',
        schema: {
          type: 'array',
            items:{
                type: "string",
            }
        }
      },
    }
  }

  return operations;
}
