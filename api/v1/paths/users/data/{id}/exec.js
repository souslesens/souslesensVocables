const fs = require("node:fs");
const { readMainConfig } = require("../../../../../../model/config");
const { userDataModel } = require("../../../../../../model/userData");
const { RdfDataModel } = require("../../../../../../model/rdfData");
const userManager = require("../../../../../../bin/user.");
const UserRequestFiltering = require("../../../../../../bin/userRequestFiltering..js");
const ConfigManager = require("../../../../../../bin/configManager.");
const { Template } = require("@huggingface/jinja");
module.exports = () => {
    GET = async (req, res, _next) => {
        try {
            const userInfo = await userManager.getUser(req.user);
            const userData = await userDataModel.find(req.params.id, userInfo.user);

            if (userData.data_type !== "sparqlQuery") {
                res.status(400).json({ message: "This userData is not a sparqlQuery" });
                return;
            }
            if (!userData.data_content.sparqlQuery) {
                res.status(400).json({ message: "Nothing on sparqlQuery" });
                return;
            }

            const query = userData.data_content.sparqlQuery;

            // replace query params
            const template = new Template(query);
            const renderedQuery = template.render(req.query);

            // check that query is confom before execute
            const userSources = await ConfigManager.getUserSources(req, res);
            const user = await ConfigManager.getUser(req, res);
            const filteredQuery = await UserRequestFiltering.filterSparqlRequestAsync(query, userSources, user);
            if (filteredQuery.parsingError) {
                return processResponse(res, filteredQuery.parsingError, null);
            }

            // exec query
            const config = readMainConfig();
            const rdfDataModel = new RdfDataModel(config.sparql_server.url, config.sparql_server.user, config.sparql_server.password);
            const jsonResult = await rdfDataModel.execQuery(renderedQuery);
            res.status(200).json(jsonResult);
            return;
        } catch (error) {
            if (error.cause !== undefined) {
                res.status(error.cause).json({ message: error.message });
            } else {
                console.error(error);
                res.status(500).json({ message: "An error occurs on the server" });
            }
        }
    };

    GET.apiDoc = {
        summary: "Execute sparql query",
        description: "Execute the query contained in the userData and return the result",
        parameters: [
            {
                type: "number",
                in: "path",
                name: "id",
                required: true,
            },
            {
                type: "string",
                in: "query",
                name: "params",
                required: false,
            },
        ],
        responses: {
            200: {
                description: "sparql execution result",
                schema: {
                    type: "object",
                    properties: {
                        result: { type: "string" },
                    },
                },
            },
            400: {
                description: "Wrong format for the identifier",
                schema: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            default: "Wrong format for the identifier",
                        },
                    },
                },
            },
            404: {
                description: "The specified identifier do not exists",
                schema: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            default: "The specified identifier do not exists",
                        },
                    },
                },
            },
            500: {
                description: "An error occurs on the server",
                schema: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            default: "An error occurs on the server",
                        },
                    },
                },
            },
        },
        security: [{ restrictLoggedUser: [] }],
        tags: ["UserData"],
    };

    return { GET };
};
