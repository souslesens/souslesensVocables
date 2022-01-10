


const apiDoc = {
  swagger: '2.0',
  paths: {},
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
    Profile: {
      type: "object",
      properties: {
        allowedSourceSchemas: {
          type: "array",
          items: {
            type: "string"
          }
        },
        allowedSources: {
          type: "string"
        },
        "forbiddenSources": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "allowedTools": {
          "type": "string"
        },
        "forbiddenTools": {
          "type": "array",
          "items": {}
        },
        "blender": {
          "$ref": "#/definitions/Blender"
        },
      }
    },
    GetSources: {
      type: 'object'
      , properties: {}
    },
    "Blender": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "contextMenuActionStartLevel": {
          "type": "integer"
        }
      },
      "required": [
        "contextMenuActionStartLevel"
      ],
      "title": "Blender"
    },

    AuthLogout: {
      properties: {
        redirect: {
          type: 'string'
        }
      },
      required: []
    }
  }

};


module.exports = apiDoc;

