const path = require("path");
const logger = require(path.resolve("bin/logger..js"));

module.exports = function() {
  let operations = {
    POST
  };

  function POST(req, res, next) {

    const ip = req.header("x-forwarded-for") || req.connection.remoteAddress;
    req.body.infos += "," + ip;
    logger.info(req.body.infos);
    return res.status(200).json({ done: true })
  }

  POST.apiDoc = {

    security: [{loginScheme: []}],
    summary: 'Write user logs',
    description: "Write user logs",
    operationId: 'Write user logs',
    parameters: [
      {
        name: 'body',
        description: "body",
        in: 'body',
        schema: {
          type: 'object',
          properties: {
            infos: {
              type: "string",
            }
          }
        }
      }
    ],
    responses: {
      200: {
        description: 'Results',
        schema: {
          type: 'object',
          properties: {
            done: {
              type: 'boolean',
            }
          }
        }
      },
    }
  }

  return operations;
}
