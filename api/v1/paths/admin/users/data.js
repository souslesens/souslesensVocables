const { userDataModel } = require("../../../../../model/userData");

module.exports = () => {
    GET = async (_req, res, _next) => {
        try {
            const data = await userDataModel.all();
            res.status(200).json(data);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "An error occurs on the server" });
        }
    };
    GET.apiDoc = {
        parameters: [],
        responses: {
            200: {
                description: "Retrieve the entire list of User Data",
                schema: {
                    type: "array",
                    items: { $ref: "#/definitions/UserData" },
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
        security: [{ restrictAdmin: [] }],
        summary: "Retrieve the entire list of User Data",
        tags: ["UserData"],
    };

    POST = async (req, res, _next) => {
        try {
            await userDataModel.insert(req.body);
            res.status(200).json({ message: "The resource has been inserted successfully" });
        } catch (error) {
            if (error.cause !== undefined) {
                res.status(error.cause).json({ message: error.message });
            } else {
                console.error(error);
                res.status(500).json({ message: "An error occurs on the server" });
            }
        }
    };
    POST.apiDoc = {
        consumes: ["application/json"],
        parameters: [
            {
                in: "body",
                name: "body",
                schema: {
                    $ref: "#/definitions/UserDataWithoutID",
                },
            },
        ],
        responses: {
            200: {
                description: "The resource has been inserted successfully",
                schema: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            default: "The resource has been inserted successfully",
                        },
                    },
                },
            },
            404: {
                description: "The specified owned_by username do not exists",
                schema: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            default: "The specified owned_by username do not exists",
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
        summary: "Add a new entry in the user data storage",
        tags: ["UserData"],
    };

    PUT = async (req, res, _next) => {
        try {
            await userDataModel.update(req.body);
            res.status(200).json({ message: "The resource has been updated successfully" });
        } catch (error) {
            if (error.cause !== undefined) {
                res.status(error.cause).json({ message: error.message });
            } else {
                console.error(error);
                res.status(500).json({ message: "An error occurs on the server" });
            }
        }
    };
    PUT.apiDoc = {
        parameters: [
            {
                in: "body",
                name: "body",
                schema: {
                    $ref: "#/definitions/UserData",
                },
            },
        ],
        responses: {
            200: {
                description: "The resource has been updated successfully",
                schema: {
                    $ref: "#/definitions/UserData",
                },
            },
            404: {
                description: "The specified identifier/owned_by do not exists",
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
        summary: "Update the content of a specific user data from the database",
        tags: ["UserData"],
    };

    return { GET, POST, PUT };
};
