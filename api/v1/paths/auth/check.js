const path = require("path");
const config = require(path.resolve("config/mainConfig.json"));
const users = require(path.resolve("config/users/users.json"));
const userManager = require(path.resolve("bin/user."));

module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, next) {
        currentUser = userManager.getUser(req.user);
        res.status(200).json(currentUser);
    }

    GET.apiDoc = {
        summary: "Check if a user is currently logged",
        operationId: "check",
        parameters: [],
        responses: {
            200: {
                description: "Current user info",
                schema: {
                    $ref: "#/definitions/AuthCheck",
                },
            },
        },
    };

    return operations;
};
