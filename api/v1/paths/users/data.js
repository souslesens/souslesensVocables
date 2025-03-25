const { userDataModel } = require("../../../../model/userData");
const { cleanUserData } = require("../../../../model/cleanUserData");
const userManager = require("../../../../bin/user.");

module.exports = () => {
    GET = async (req, res, _next) => {
        try {
            let userDatas = await userDataModel.all(req.user);
            if (req.query.data_label) {
                userDatas = Object.values(userDatas).filter((data) => {
                    return data.data_label?.includes(req.query.data_label);
                });
            }
            if (req.query.data_group) {
                userDatas = Object.values(userDatas).filter((data) => {
                    return data.data_group?.includes(req.query.data_group);
                });
            }
            if (req.query.data_type) {
                userDatas = Object.values(userDatas).filter((data) => {
                    return data.data_type?.includes(req.query.data_type);
                });
            }
            if (req.query.data_tool) {
                userDatas = Object.values(userDatas).filter((data) => {
                    return data.data_tool?.includes(req.query.data_tool);
                });
            }
            if (req.query.data_source) {
                userDatas = Object.values(userDatas).filter((data) => {
                    return data.data_source?.includes(req.query.data_source);
                });
            }
            res.status(200).json(userDatas);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "An error occurs on the server" });
        }
    };
    GET.apiDoc = {
        parameters: [
            {
                in: "query",
                type: "string",
                required: false,
                name: "data_label",
                description: "data_group filter",
            },
            {
                in: "query",
                type: "string",
                required: false,
                name: "data_group",
                description: "data_group filter",
            },
            {
                in: "query",
                type: "string",
                required: false,
                name: "data_type",
                description: "data_type filter",
            },
            {
                in: "query",
                type: "string",
                required: false,
                name: "data_tool",
                description: "data_group filter",
            },
            {
                in: "query",
                type: "string",
                required: false,
                name: "data_source",
                description: "data_type filter",
            },
        ],
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
        security: [{ restrictLoggedUser: [] }],
        summary: "Retrieve the entire list of User Data",
        tags: ["UserData"],
    };

    POST = async (req, res, _next) => {
        try {
            const userData = await cleanUserData.clean(req.body);
            const userInfo = await userManager.getUser(req.user);
            const identifier = await userDataModel.insert({ ...userData, owned_by: parseInt(userInfo.user.id)});
            if (identifier !== undefined) {
                res.status(200).json({ message: "The resource has been inserted successfully", id: identifier });
            } else {
                res.status(422).json({ message: "The resource cannot be insert in the database" });
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
            422: {
                description: "The resource cannot be insert in the database",
                schema: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            default: "The resource cannot be insert in the database",
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
            // users can only update their own data
            const userInfo = await userManager.getUser(req.user);
            const existingData = await userDataModel.find(req.body.id);

            if (userInfo.user.id != existingData.owned_by) {
                throw Error(`The resources is not owned by ${userInfo.user.login}`, { cause: 403 });
            }
            const userData = await cleanUserData.clean(req.body);
            await userDataModel.update({ ...userData, owned_by: `${userInfo.user.id}` });
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
                    $ref: "#/definitions/UserDataWithoutOwner",
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
