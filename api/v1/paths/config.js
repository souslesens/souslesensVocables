const path = require("path");
const config = require(path.resolve('config/mainConfig.json'));

module.exports = function() {
  let operations = {
    GET
  };

  function GET(req, res, next) {

    result = {
      auth: config.auth,
    }

    res.status(200).json(result);
  }

  GET.apiDoc = {
    security: [{loginScheme: []}],
    summary: 'Returns serveur configuration',
    operationId: 'Config',
    parameters: [],
    responses: {
      200: {
        description: 'Welcome message',
        schema: {
          items: {
            $ref: '#/definitions/Config'
          }
        }
      },
    }
  };

  return operations;
}