const apiDoc = {
    swagger: "2.0",
    paths: {},
    basePath: "/api/v1",
    info: {
        title: "SouslesensVocables API",
        version: "1.0.0",
    },
    securityDefinitions: {
        restrictLoggedUser: {
            type: "basic",
        },
        restrictAdmin: {
            type: "basic",
        },
    },
    definitions: {
        AuthCheck: {
            properties: {
                logged: {
                    type: "boolean",
                },
                user: {
                    type: "object",
                },
                authSource: {
                    type: "string",
                },
                auth: {
                    type: "object",
                },
            },
            required: [],
        },
        Users: {
            type: "object",
            additionalProperties: { $ref: "#/definitions/User" },
        },
        Profiles: {
            type: "object",
            additionalProperties: { $ref: "#/definitions/Profile" },
        },
        Sources: {
            type: "object",
            additionalProperties: { $ref: "#/definitions/Source" },
        },
        BlenderSources: {
            type: "object",
            additionalProperties: { $ref: "#/definitions/BlenderSource" },
        },
        BlenderSource: {
            type: "object",
            properties: {
                editable: { type: "boolean" },
                controller: { type: "string" },
                graphUri: { type: "string" },
                protected: { type: "boolean" },
                color: { type: "string" },
                isBlenderTemplate: { type: "boolean" },
                sparql_server: { type: "object", additionalProperties: { $ref: "#/definitions/SparqlServer" } },
            },
        },
        User: {
            type: "object",
            additionalProperties: false,
            properties: {
                id: {
                    type: "string",
                },
                login: {
                    type: "string",
                },
                password: {
                    type: "string",
                },
                groups: {
                    type: "array",
                    items: {
                        type: "string",
                    },
                },
                _type: {
                    type: "string",
                },
            },
            required: ["_type", "groups", "id", "login", "password"],
            title: "User Model",
        },
        Source: {
            type: "object",
            additionalProperties: false,
            properties: {
                name: {
                    type: "string",
                },
                _type: {
                    type: "string",
                },
                id: {
                    type: "string",
                },
                type: {
                    type: "string",
                },
                graphUri: {
                    type: "string",
                    format: "uri",
                },
                sparql_server: {
                    $ref: "#/definitions/SparqlServer",
                },
                controller: {
                    type: "string",
                },
                topClassFilter: {
                    type: "string",
                },
                schemaType: {
                    type: "string",
                },
                dataSource: {
                    type: "null",
                },
                schema: {
                    type: "null",
                },
                isDraft: {
                    type: "boolean",
                },
                editable: {
                    type: "boolean",
                },
                color: {
                    type: "string",
                },
                predicates: {
                    $ref: "#/definitions/Predicates",
                },
                group: {
                    type: "string",
                },
                imports: {
                    type: "array",
                    items: {},
                },
            },
            required: [
                "_type",
                "color",
                "controller",
                "dataSource",
                "editable",
                "graphUri",
                "group",
                "id",
                "imports",
                "isDraft",
                "name",
                "predicates",
                "schema",
                "schemaType",
                "sparql_server",
                "topClassFilter",
                "type",
            ],
            title: "Source Model",
        },
        Predicates: {
            type: "object",
            additionalProperties: false,
            properties: {
                broaderPredicate: {
                    type: "string",
                },
                lang: {
                    type: "string",
                },
            },
            required: ["broaderPredicate", "lang"],
            title: "Predicates",
        },
        SparqlServer: {
            type: "object",
            additionalProperties: false,
            properties: {
                url: {
                    type: "string",
                },
                xx: {
                    type: "integer",
                },
            },
            required: ["url"],
            title: "SparqlServer",
        },
        Profile: {
            type: "object",
            properties: {
                allowedSourceSchemas: {
                    type: "array",
                    items: {
                        type: "string",
                    },
                },
                allowedSources: {
                    type: "string",
                },
                forbiddenSources: {
                    type: "array",
                    items: {
                        type: "string",
                    },
                },
                allowedTools: {
                    type: "string",
                },
                forbiddenTools: {
                    type: "array",
                    items: {},
                },
                blender: {
                    $ref: "#/definitions/Blender",
                },
            },
        },
        GetSources: {
            type: "object",
            properties: {},
        },
        Blender: {
            type: "object",
            additionalProperties: false,
            properties: {
                contextMenuActionStartLevel: {
                    type: "integer",
                },
            },
            required: ["contextMenuActionStartLevel"],
            title: "Blender",
        },

        AuthLogout: {
            properties: {
                redirect: {
                    type: "string",
                },
            },
            required: [],
        },
        Config: {
            properties: {
                auth: {
                    type: "string",
                },
                default_lang: {
                    type: "string",
                },
                default_sparql_url: {
                    type: "string",
                },
                wiki: {
                    type: "object",
                    properties: {
                        url: {
                            type: "string",
                        },
                    },
                },
                version: {
                    type: "string",
                },
            },
            required: [],
        },
        SparqlQueryResponse: {
            properties: {
                head: {
                    type: "object",
                    properties: {
                        link: {
                            type: "array",
                            items: {
                                type: "string",
                            },
                        },
                        vars: {
                            type: "array",
                            items: {
                                type: "string",
                            },
                        },
                    },
                },
                results: {
                    properties: {
                        distinct: { type: "boolean" },
                        order: { type: "boolean" },
                        bindings: {
                            type: "array",
                            items: {
                                $ref: "#/definitions/SparqlBinding",
                            },
                        },
                    },
                },
            },
        },
        SparqlBinding: {
            type: "object",
            properties: {
                sub: {
                    $ref: "#/definitions/SparqlTypeValuePair",
                },
                pred: {
                    $ref: "#/definitions/SparqlTypeValuePair",
                },
                obj: {
                    $ref: "#/definitions/SparqlTypeValuePair",
                },
            },
        },
        SparqlTypeValuePair: {
            type: "object",
            properties: {
                type: {
                    type: "string",
                },
                value: {
                    type: "string",
                },
            },
        },
    },
};

module.exports = apiDoc;
