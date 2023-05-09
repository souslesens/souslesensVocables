const { successfullyFetched } = require("./utils.js");
const { profileModel } = require("../../../model/profiles");
const { userModel } = require("../../../model/users");
const path = require("path");
const fs = require("fs");

module.exports = function () {
    let operations = {
        GET,
    };

    async function GET(req, res, next) {
        try {
            const user = await userModel.findUserAccount(req.user.login);
            const userTools = await profileModel.getUserTools(user);
            res.status(200).json(successfullyFetched(userTools));
        } catch (err) {
            console.log(err);
            next(err);
        }
    }
    GET.apiDoc = {
        summary: "Returns user tools",
        security: [{ loginScheme: [] }],
        operationId: "getTools",
        responses: {
            200: {
                description: "",
                schema: {
                    properties: {
                        message: { type: "string" },
                        resources: {
                            type: "array",
                        },
                    },
                },
            },
        },
    };
    return operations;
};
