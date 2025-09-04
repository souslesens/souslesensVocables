const fs = require("node:fs");
const { readMainConfig } = require("../../../../../../model/config");
const { userDataModel } = require("../../../../../../model/userData");
const { RdfDataModel } = require("../../../../../../model/rdfData");
const userManager = require("../../../../../../bin/user.");

module.exports = () => {
    GET = async (req, res, _next) => {
        try {
            const userInfo = await userManager.getUser(req.user);
            const userData = await userDataModel.find(req.params.id, userInfo.user);
            if (userData.data_type === "sparqlQuery") {
                let query;
                if (userDataModel._mainConfig.userData.location === "file") {
                    query = fs.readFileSync(userData.data_content);
                } else {
                    query = userData.data_content.query;
                }
                // replace query params
                if (req.query.params) {
                    for (const [key, value] of Object.entries(JSON.parse(req.query.params))) {
                        query = query.replace(`{{${key}}}`, value);
                    }
                }
                const config = readMainConfig();
                const rdfDataModel = new RdfDataModel(config.sparql_server.url, config.sparql_server.user, config.sparql_server.password);
                const jsonResult = await rdfDataModel.execQuery(query);
                res.status(200).json(jsonResult);
            } else {
                res.status(400).json({ message: "This userData is not a sparqlQuery" });
            }
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
