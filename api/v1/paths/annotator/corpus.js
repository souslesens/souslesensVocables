const path = require("path");
const dirContentAnnotator = require(path.resolve("bin/annotator/dirContentAnnotator."));

module.exports = function() {
  let operations = {
    GET
  };

  function GET(req, res, next) {

    const group = req.query.group ? req.query.group : "all"

    dirContentAnnotator.getAnnotatedCorpusList(group, function (err, result) {
      if (err) {
        return res.status(400).json({error: err})
      }
        return  res.status(200).json(result)
    });
  }

  GET.apiDoc = {

    security: [{loginScheme: []}],
    summary: 'Annotator corpus list',
    description: "Annotator corpus list",
    operationId: 'Annotator corpus list',
    parameters: [
      {
        name: 'group',
        description: "group",
        in: 'query',
        type: "string",
        required: false
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
