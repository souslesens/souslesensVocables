module.exports = function() {
  let operations = {
    GET
  };

  function GET(req, res, next) {
    res.status(200).json({
      message: req.query.name ? "hello " + req.query.name + "!" : "hello world!" 
    });
  }

  // NOTE: We could also use a YAML string here.
  GET.apiDoc = {
    summary: 'Returns hello world message.',
    operationId: 'sayHello',
    parameters: [
      {
        in: 'query',
        name: 'name',
        required: false,
        type: 'string'
      }
    ],
    responses: {
      200: {
        description: 'Welcome message',
        schema: {
          type: 'object',
          items: {
            $ref: '#/definitions/Hello'
          }
        }
      },
      default: {
        description: 'An error occurred',
        schema: {
          additionalProperties: true
        }
      }
    }
  };

  return operations;
}