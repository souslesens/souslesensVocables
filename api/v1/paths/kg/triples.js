const KGtripleBuilder = require("../../../../bin/KGtripleBuilder.");
const { processResponse } = require("../utils");

module.exports = function() {
  let operations = {
    POST
  };

  function POST(req, res, next) {
    try {
      KGtripleBuilder.createTriplesFromCsvOrTable(req.body.source,req.body.type, req.body.datasource, req.body.table, JSON.parse(req.body.options), function(err, result) {
        processResponse(res, err, result);
      });
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    security: [{ restrictLoggedUser: [] }],
    summary: "Creates triples from csv file",
    description: "Takes a csv filename and directory and returns triples",
    operationId: "createTriplesFromCsvOrTable",
    parameters: [
      {
        name: "body",
        description: "subDirectory in /dataDir",
        in: "body",
        schema: {
          type: "object",
          properties: {
            datasource: { type: "string" },
            type: { type: "string" },
            source: { type: "string" },
            table: { type: "string" },
            options: { type: "string" }
          }
        },
        required: true
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
