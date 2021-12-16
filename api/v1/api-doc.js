const apiDoc = {
  swagger: '2.0',
  basePath: '/api/v1',
  info: {
    title: 'SouslesensVocables API',
    version: '1.0.0'
  },
  securityDefinitions: {
    loginScheme: {
      type: 'basic'
    },
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
    },
    AuthCheck: {
      properties: {
        logged: {
          type: "boolean"
        },
        user: {
          type: 'object'
        },
        authSource: {
          type: 'string'
        },
        auth: {
          type: 'object'
        }
      },
      required: []
    },
    AuthLogout: {
      properties: {
        redirect: {
          type: 'string'
        }
      },
      required: []
    },
    Config: {
      properties: {
        auth: {
          type: 'string'
        }
      },
      required: []
    }
  },
  paths: {}
};

module.exports = apiDoc;
