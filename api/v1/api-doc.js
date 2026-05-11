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
        restrictQuota: {
            type: "basic",
        },
    },
    definitions: {
        AuthCheck: {
            type: "object",
            properties: {
                logged: {
                    type: "boolean",
                },
                user: {
                    type: "object",
                    additionalProperties: true,
                },
                authSource: {
                    type: "string",
                },
                auth: {
                    type: "object",
                    additionalProperties: true,
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
        Databases: {
            type: "object",
            additionalProperties: { $ref: "#/definitions/Database" },
        },
        Tool: {
            type: "object",
            properties: {
                type: {
                    enum: ["tool", "plugin"],
                },
                name: {
                    type: "string",
                },
                config: {
                    type: "object",
                    additionalProperties: true,
                    description: "Tool/plugin-specific config (free-form).",
                },
            },
        },
        Tools: {
            type: "array",
            items: {
                $ref: "#/definitions/Tool",
            },
        },
        PluginConfig: {
            type: "object",
            additionalProperties: true,
            description: "Free-form plugin config payload.",
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
            additionalProperties: true,
            properties: {
                id: { type: "string" },
                login: { type: "string" },
                password: { type: "string" },
                groups: { type: "array", items: { type: "string" } },
                _type: { type: "string" },
                source: { type: "string" },
                token: { type: "string" },
                allowSourceCreation: { type: "boolean" },
                maxNumberCreatedSource: { type: "number" },
            },
            required: ["login", "groups"],
            title: "User Model",
        },
        UserMe: {
            type: "object",
            additionalProperties: true,
            properties: {
                id: { type: "string" },
                login: { type: "string" },
                groups: { type: "array", items: { type: "string" } },
                allowSourceCreation: { type: "boolean" },
                maxNumberCreatedSource: { type: "number" },
            },
            required: ["login", "groups"],
            title: "UserMe Model",
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
                    $ref: "#/definitions/DataSource",
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
                    items: { type: "string" },
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
                "schemaType",
                "sparql_server",
                "topClassFilter",
                "type",
            ],
            title: "Source Model",
        },
        SourceCreate: {
            type: "object",
            properties: {
                name: { type: "string" },
                _type: { type: "string" },
                id: { type: "string" },
                type: { type: "string" },
                graphUri: { type: "string", format: "uri" },
                sparql_server: { $ref: "#/definitions/SparqlServer" },
                controller: { type: "string" },
                topClassFilter: { type: "string" },
                schemaType: { type: "string" },
                dataSource: { $ref: "#/definitions/DataSource" },
                schema: { type: "null" },
                isDraft: { type: "boolean" },
                editable: { type: "boolean" },
                color: { type: "string" },
                predicates: { $ref: "#/definitions/Predicates" },
                group: { type: "string" },
                imports: { type: "array", items: { type: "string" } },
                owner: { type: "string" },
                published: { type: "boolean" },
            },
            required: ["name"],
            title: "Source Create Model",
        },
        SourceUpdate: {
            type: "object",
            properties: {
                name: { type: "string" },
                _type: { type: "string" },
                id: { type: "string" },
                type: { type: "string" },
                graphUri: { type: "string", format: "uri" },
                sparql_server: { $ref: "#/definitions/SparqlServer" },
                controller: { type: "string" },
                topClassFilter: { type: "string" },
                schemaType: { type: "string" },
                dataSource: { $ref: "#/definitions/DataSource" },
                schema: { type: "null" },
                isDraft: { type: "boolean" },
                editable: { type: "boolean" },
                color: { type: "string" },
                predicates: { $ref: "#/definitions/Predicates" },
                group: { type: "string" },
                imports: { type: "array", items: { type: "string" } },
            },
            required: ["name"],
            title: "Source Update Model",
        },
        DataSource: {
            type: "object",
            "x-nullable": true,
            properties: {
                type: { type: "string" },
                connection: { type: "string" },
                dbName: { type: "string" },
                table_schema: { type: "string" },
                local_dictionary: {
                    type: "object",
                    properties: {
                        table: { type: "string" },
                        idColumn: { type: "string" },
                        labelColumn: { type: "string" },
                    },
                },
            },
            title: "DataSource",
        },
        Predicates: {
            type: "object",
            additionalProperties: true,
            properties: {
                broaderPredicate: {
                    type: "string",
                },
                lang: {
                    type: "string",
                },
            },
            title: "Predicates",
        },
        SparqlServer: {
            type: "object",
            properties: {
                url: {
                    type: "string",
                },
            },
            required: ["url"],
            title: "SparqlServer",
        },
        Profile: {
            type: "object",
            required: ["id", "name"],
            properties: {
                id: { type: "string" },
                name: { type: "string" },
                _type: { type: "string", default: "profile" },
                theme: { type: "string", default: "" },
                allowedSourceSchemas: {
                    type: "array",
                    items: { type: "string", enum: ["OWL", "SKOS"] },
                },
                allowedTools: {
                    type: "array",
                    items: { type: "string" },
                },
                allowedDatabases: {
                    type: "array",
                    items: { type: "string" },
                },
                sourcesAccessControl: {
                    type: "object",
                    additionalProperties: { type: "string" },
                    description: "Map of source name → access level (read|readwrite).",
                },
                isShared: { type: "boolean", default: true },
                quota: {
                    type: "object",
                    description: "Map of route → method → quota value or quota config object.",
                    additionalProperties: {
                        type: "object",
                        additionalProperties: {
                            oneOf: [
                                { type: "number" },
                                {
                                    type: "object",
                                    required: ["quota", "wholeProfileQuota"],
                                    properties: {
                                        quota: { type: "number" },
                                        wholeProfileQuota: { type: "boolean" },
                                    },
                                },
                            ],
                        },
                    },
                },
            },
        },
        DatabaseNames: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                },
            },
        },
        Database: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                },
                name: {
                    type: "string",
                },
                driver: {
                    type: "string",
                },
                host: {
                    type: "string",
                },
                port: {
                    type: "number",
                },
                database: {
                    type: "string",
                },
                user: {
                    type: "string",
                },
                password: {
                    type: "string",
                },
            },
        },
        DatabaseMinimal: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                },
                name: {
                    type: "string",
                },
                driver: {
                    type: "string",
                },
                database: {
                    type: "string",
                },
            },
        },
        GetSources: {
            type: "object",
            additionalProperties: true,
            description: "Free-form sources map (legacy placeholder).",
        },
        Blender: {
            type: "object",
            additionalProperties: true,
            properties: {
                contextMenuActionStartLevel: {
                    type: "integer",
                },
            },
            title: "Blender",
        },

        AuthLogout: {
            type: "object",
            properties: {
                redirect: {
                    type: "string",
                },
            },
            required: [],
        },
        Config: {
            type: "object",
            properties: {
                auth: { type: "string" },
                defaultGroups: { type: "array", items: { type: "string" } },
                default_lang: { type: "string" },
                sparql_server: {
                    type: "object",
                    properties: {
                        url: { type: "string" },
                    },
                },
                formalOntologySourceLabel: { type: "string" },
                wiki: {
                    type: "object",
                    properties: {
                        url: { type: "string" },
                    },
                },
                version: { type: "string" },
                sentryDsnJsFront: { type: "string" },
                tools_available: { type: "array", items: { type: "string" } },
                slsPyApi: {
                    type: "object",
                    properties: {
                        enabled: { type: "boolean" },
                        url: { type: "string" },
                    },
                },
                theme: {
                    type: "object",
                    properties: {
                        defaultTheme: { type: "string" },
                        selector: { type: "boolean" },
                    },
                },
                sparqlDownloadLimit: { type: "integer" },
                generalQuota: { type: "object", additionalProperties: true },
            },
            required: [],
        },
        SparqlQueryResponse: {
            type: "object",
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
                    type: "object",
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
        UserData: {
            type: "object",
            properties: {
                id: {
                    type: "number",
                    minimum: 1,
                },
                data_type: {
                    type: "string",
                },
                data_label: {
                    type: "string",
                    default: "",
                },
                data_comment: {
                    type: "string",
                    default: "",
                },
                data_group: {
                    type: "string",
                    default: "",
                },
                data_tool: {
                    type: "string",
                    default: "",
                },
                data_source: {
                    type: "string",
                    default: "",
                },
                data_content: {
                    $ref: "#/definitions/UserDataContent",
                },
                is_shared: {
                    type: "boolean",
                    default: false,
                },
                shared_profiles: {
                    type: "array",
                    default: [],
                    items: { type: "string" },
                },
                shared_users: {
                    type: "array",
                    default: [],
                    items: { type: "string" },
                },
                owned_by: {
                    type: "string",
                },
                modification_date: {
                    type: "string",
                },
                readwrite: {
                    type: "boolean",
                    default: false,
                },
                created_at: {
                    type: "string",
                },
            },
            required: ["data_type"],
        },
        UserDataWithoutContent: {
            type: "object",
            properties: {
                id: {
                    type: "number",
                    minimum: 1,
                },
                data_type: {
                    type: "string",
                },
                data_label: {
                    type: "string",
                    default: "",
                },
                data_comment: {
                    type: "string",
                    default: "",
                },
                data_group: {
                    type: "string",
                    default: "",
                },
                data_tool: {
                    type: "string",
                    default: "",
                },
                data_source: {
                    type: "string",
                    default: "",
                },
                is_shared: {
                    type: "boolean",
                    default: false,
                },
                shared_profiles: {
                    type: "array",
                    default: [],
                    items: { type: "string" },
                },
                shared_users: {
                    type: "array",
                    default: [],
                    items: { type: "string" },
                },
                owned_by: {
                    type: "string",
                },
                modification_date: {
                    type: "string",
                },
                created_at: {
                    type: "string",
                },
            },
            required: ["data_type"],
        },
        UserDataWithoutID: {
            type: "object",
            properties: {
                data_type: {
                    type: "string",
                },
                data_label: {
                    type: "string",
                    default: "",
                },
                data_comment: {
                    type: "string",
                    default: "",
                },
                data_group: {
                    type: "string",
                    default: "",
                },
                data_tool: {
                    type: "string",
                    default: "",
                },
                data_source: {
                    type: "string",
                    default: "",
                },
                data_content: {
                    $ref: "#/definitions/UserDataContent",
                },
                is_shared: {
                    type: "boolean",
                    default: false,
                },
                shared_profiles: {
                    type: "array",
                    default: [],
                    items: { type: "string" },
                },
                shared_users: {
                    type: "array",
                    default: [],
                    items: { type: "string" },
                },
                readwrite: {
                    type: "boolean",
                    default: false,
                },
            },
            required: ["data_type"],
        },
        UserDataWithoutOwner: {
            type: "object",
            properties: {
                id: {
                    type: "number",
                    minimum: 1,
                },
                data_type: {
                    type: "string",
                },
                data_label: {
                    type: "string",
                    default: "",
                },
                data_comment: {
                    type: "string",
                    default: "",
                },
                data_group: {
                    type: "string",
                    default: "",
                },
                data_tool: {
                    type: "string",
                    default: "",
                },
                data_source: {
                    type: "string",
                    default: "",
                },
                data_content: {
                    $ref: "#/definitions/UserDataContent",
                },
                is_shared: {
                    type: "boolean",
                    default: false,
                },
                shared_profiles: {
                    type: "array",
                    default: [],
                    items: { type: "string" },
                },
                shared_users: {
                    type: "array",
                    default: [],
                    items: { type: "string" },
                },
                modification_date: {
                    type: "string",
                },
                created_at: {
                    type: "string",
                },
            },
        },
        UserDataContent: {
            type: "object",
            additionalProperties: true,
            description: "Free-form payload — shape depends on `data_type` (e.g. `sparqlQuery`, `template`).",
        },
    },
    tags: [
        { name: "Annotate", description: "Manage annotation" },
        { name: "Authentication", description: "Manage user connection" },
        { name: "Axiom", description: "Manage axiom" },
        { name: "Config", description: "Manage main configuration file" },
        { name: "Data", description: "Manage access to inner data files" },
        { name: "Databases", description: "Manage external databases" },
        { name: "ElasticSearch", description: "Manage ElasticSearch server" },
        { name: "Graph", description: "Manage graph and triple store" },
        { name: "JOWL", description: "Manage JOWL server and data" },
        { name: "KG", description: "Manage KG tools suite" },
        { name: "Logs", description: "Manage logging of the user actions" },
        { name: "Misc", description: "The list of the useful routes" },
        { name: "Ontology", description: "Manage ontology models" },
        { name: "Plugins", description: "Manage external tools used to extend the application" },
        { name: "Profiles", description: "Manage profiles used to limit access to information" },
        { name: "RDF", description: "Manage RDF graphs" },
        { name: "Sources", description: "Manage sources related to a graph URI" },
        { name: "Sparql", description: "Manage Sparql requests" },
        { name: "Tools", description: "Manage tools available for each user" },
        { name: "UserData", description: "Manage shared data for each user and profile" },
        { name: "Users", description: "Manage information about the registered users" },
    ],
};

export default apiDoc;
