const { userDataModel } = require("../../../../model/userData");
<<<<<<< HEAD

module.exports = () => {
    GET = async (_req, res, _next) => {
        try {
            const data = await userDataModel.all();
=======
const userManager = require("../../../../bin/user.");

module.exports = () => {
    GET = async (req, res, _next) => {
        try {
            const data = await userDataModel.all(req.user);
>>>>>>> origin/master
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
<<<<<<< HEAD
        security: [{ restrictAdmin: [] }],
=======
        security: [{ restrictLoggedUser: [] }],
>>>>>>> origin/master
        summary: "Retrieve the entire list of User Data",
        tags: ["UserData"],
    };

    POST = async (req, res, _next) => {
        try {
<<<<<<< HEAD

            // ------------temporaire CF//
            if(typeof req.body.id=="string")
                req.body.id=parseInt( req.body.id)
            var str=req.body["is_shared"]
            if(str=="false")
                req.body.is_shared=false
            else
                req.body.is_shared=true

            await userDataModel.insert(req.body);
=======
            const userInfo = await userManager.getUser(req.user);
            await userDataModel.insert({ ...req.body, owned_by: userInfo.user.login });
>>>>>>> origin/master
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
<<<<<<< HEAD
                    // ------------temporaire CF//
                  $ref: "#/definitions/UserData",
                },
            }
=======
                    $ref: "#/definitions/UserDataWithoutID",
                },
            },
>>>>>>> origin/master
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
<<<<<<< HEAD
            await userDataModel.update(req.body);
=======
            // users can only update their own data
            const userInfo = await userManager.getUser(req.user);
            const existingData = await userDataModel.find(req.body.id);

            if (userInfo.user.login != existingData.owned_by) {
                res.status(403).json({ message: `The resources is not owned by ${userInfo.user.login}` });
            }

            await userDataModel.update({ ...req.body, owned_by: userInfo.user.login });
>>>>>>> origin/master
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
<<<<<<< HEAD
                    $ref: "#/definitions/UserData",
=======
                    $ref: "#/definitions/UserDataWithoutOwner",
>>>>>>> origin/master
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
