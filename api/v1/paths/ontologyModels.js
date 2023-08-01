const { responseSchema, processResponse } = require("./utils");
var ontologyModelsCache = {};
module.exports = function() {
  let operations = {
    GET,
    POST,
    DELETE,
    UPDATE
  };

  ///// GET api/v1/sources
  async function GET(req, res, next) {
    const model = ontologyModelsCache[req.query.source];
    if (model) {
      return processResponse(res, null, model);
    }
    return processResponse(res, "no data", null);
  }

  GET.apiDoc = {
    summary: "return ontology model",
    security: [{ loginScheme: [] }],
    operationId: "getOntologyModel",

    parameters: [
      {
        name: "source",
        description: "source",
        type: "string",
        in: "query",
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

  ///// POST api/v1/sources
  async function POST(req, res, next) {
    ontologyModelsCache[req.body.source] = req.body.model;
    return processResponse(res, null, "done");
  }

  POST.apiDoc = {
    summary: "Write source model in memory cache",
    security: [{ restrictAdmin: [] }],
    operationId: "Write source model in memory cache",
    parameters: [
      {
        name: "body",
        description: "body",
        in: "body",
        schema: {
          type: "object",
          properties: {
            source: {
              type: "string"
            },
            model: {
              type: "object"
            }
          }
        }
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
  DELETE.apiDoc = {
    summary: "delete ontology model",
    security: [{ loginScheme: [] }],
    operationId: "deleteOntologyModel",

    parameters: [
      {
        name: "source",
        description: "source",
        type: "string",
        in: "query",
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


  ///// POST api/v1/sources
  async function DELETE(req, res, next) {
    if (req.query.source && req.query.source!="null") {
      delete ontologyModelsCache[req.query.source];
    }
    else {
      ontologyModelsCache = {};
    }
    return processResponse(res, null, "done");
  }


  UPDATE.apiDoc = {
    summary: "update ontology model",
    security: [{ loginScheme: [] }],
    operationId: "updateOntologyModel",

    parameters: [
      {
        name: "body",
        description: "body",
        in: "body",
        schema: {
          type: "object",
          properties: {
            source: {
              type: "string"
            },

            data: {
              type: "object"
            }
          }
        }
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


  async function UPDATE(req, res, next) {
    if (!ontologyModelsCache[req.body.source]) {
      return processResponse(res, null, "source not exists in ontologyModelsCache");

    }
    else {

      for (var entryType in data) {
        for (var id in data[entryType]) {

          ontologyModelsCache[req.body.source][entryType][id] = data[entryType][id];

        }
      }
    }
    return processResponse(res, null, "done");
  }

  return operations;
};
