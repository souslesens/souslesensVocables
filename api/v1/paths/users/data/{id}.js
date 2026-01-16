import { userDataModel } from "../../../../../model/userData.js";
import userManager from "../../../../../bin/user.js";

export default () => {
    const DELETE = async (req, res, _next) => {
        try {
            const userInfo = await userManager.getUser(req.user);
            const userData = await userDataModel.find(req.params.id, userInfo.user);
            if (!userData.readwrite && userData.owned_by !== parseInt(userInfo.user.id)) {
                throw Error(`The resources is readonly and not owned by ${userInfo.user.login}`, { cause: 403 });
            }
            await userDataModel.remove(req.params.id, userInfo.user);
            res.status(200).json({ message: "The resource has been removed successfully" });
        } catch (error) {
            if (error.cause !== undefined) {
                res.status(error.cause).json({ message: error.message });
            } else {
                console.error(error);
                res.status(500).json({ message: "An error occurs on the server" });
            }
        }
    };
    DELETE.apiDoc = {
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
                description: "The resource has been deleted successfully",
                schema: {
                    $ref: "#/definitions/UserData",
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
        summary: "Delete a specific user data from the database",
        tags: ["UserData"],
    };

    const GET = async (req, res, _next) => {
        try {
            const userInfo = await userManager.getUser(req.user);
            const data = await userDataModel.find(req.params.id, userInfo.user);
            res.status(200).json(data);
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
                description: "Retrieve a specific user data from the database",
                schema: {
                    $ref: "#/definitions/UserData",
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
        summary: "Retrieve a specific user data from the database",
        tags: ["UserData"],
    };

    return { DELETE, GET };
};
