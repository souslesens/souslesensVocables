const fs = require("node:fs");
const { userDataModel } = require("../../../../../../model/userData");
const { RdfDataModel } = require("../../../../../../model/rdfData");

module.exports = () => {
    GET = async (req, res, _next) => {
        try {
            const userData = await userDataModel.find(req.params.id);
            if (userData.type === "sparqlQuery") {
                let query;
                if (userDataModel._mainConfig.userData.location === "file") {
                    query = fs.readFileSync(userData.data_content);
                } else {
                    query = fs.userData.data_content;
                }
                const jsonResult = await RdfDataModel.execQuery(query);
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
