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
    restrictAdmin: {
      type: 'basic'
    }
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
        },
        default_lang: {
          type: 'string'
        },
        default_sparql_url: {
          type: 'string'
        },
        wiki: {
          type: 'object',
          properties: {
            url: {
              type: 'string'
            }          }
        },
        version: {
          type: 'string'
        }
      },
      required: []
    },
    Source: {
      properties: {
        name: {
          type: 'string',
        },
        label: {
          type: 'string',
        },
        _type: {
          type: 'string',
        },
        id: {
          type: 'string',
        },
        type: {
          type: 'string',
        },
        graphUri: {
          type: 'string',
        },
        sparql_server: {
          type: 'object',
          properties: {
            url: {
              type: 'string'
            }          }
        },
        controller: {
          type: 'string',
        },
        topClassFilter: {
          type: 'string',
        },
        schemaType: {
          type: 'string',
        },
        dataSource: {
          type: 'string',
        },
        schema: {
          type: 'string',
        },
        isDraft: {
          type: 'boolean',
        },
        editable: {
          type: 'boolean',
        },
        color: {
          type: 'string',
        },
        predicates: {
          type: 'object',
          properties: {
            broaderPredicate: {
              type: 'string'
            },
            lang: {
              type: 'string'
            }
          }
        },
        group: {
          type: 'string',
        },
        imports: {
          type: 'array',
        }
      }
    }
  },
  paths: {}
};

module.exports = apiDoc;
