import { userDataModel } from '../../../../model/userData.js';
import { cleanUserData } from '../../../../model/cleanUserData.js';
import userManager from '../../../../bin/user.js';

module.exports = () => {
    GET = async (req, res, _next) => {
        try {
            const userInfo = await userManager.getUser(req.user);
            let userDatas = await userDataModel.all(userInfo.user, req.query);
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
                description: "data_label filter",
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
                description: "data_tool filter",
            },
            {
                in: "query",
                type: "string",
                required: false,
                name: "data_source",
                description: "data_source filter",
            },
        ],
        responses: {
            200: {
                description: "Retrieve the entire list of User Data",
                schema: {
                    type: "array",
                    items: { $ref: "#/definitions/UserDataWithoutContent" },
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
            const identifier = await userDataModel.insert({ ...userData, owned_by: parseInt(userInfo.user.id) });
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
                        id: {
                            type: "number",
                            default: 1,
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
            const existingData = await userDataModel.find(req.body.id, userInfo.user);
            if (!existingData.readwrite && existingData.owned_by !== parseInt(userInfo.user.id)) {
                throw Error(`The resources is readonly and not owned by ${userInfo.user.login}`, { cause: 403 });
            }
            const userData = await cleanUserData.clean(req.body);
            //never change owned_by
            await userDataModel.update({ ...userData, owned_by: parseInt(existingData.owned_by) });
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
