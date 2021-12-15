const apiDoc = {
  swagger: '2.0',
  basePath: '/api/v1',
  info: {
    title: 'SouslesensVocables API',
    version: '1.0.0'
  },
  definitions: {
    Hello: {
      type: 'object',
      properties: {
        name: {
          description: 'Your name',
          type: 'string'
        }
      },
      required: []
    }
  },
  paths: {}
};

module.exports = apiDoc;

