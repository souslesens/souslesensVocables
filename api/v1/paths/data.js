const path = require("path");
const dataController = require(path.resolve("bin/dataController."));

module.exports = function() {
  let operations = {
    POST
  };

  function POST(req, res, next) {

    dataController.saveDataToFile(req.body.dir, req.body.fileName, req.body.data, function (err, result) {
      if (err) {
        return res.status(400).json({error: err})
      }
      return res.status(200).json(result);
    });
  }

  POST.apiDoc = {

    security: [{loginScheme: []}],
    summary: 'Save Data to file',
    description: "Save Data to file",
    operationId: 'Save Data to file',
    parameters: [
      {
        name: 'body',
        description: "body",
        in: 'body',
        schema: {
          type: 'object',
          properties: {
            dir: {
              type: "string",
            },
            fileName: {
              type: "string",
            },
            data: {
              type: "object",
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
        }
      },
    }
  }

  return operations;
}
