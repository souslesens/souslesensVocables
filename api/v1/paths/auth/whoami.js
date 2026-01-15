import path from 'path';
const userManager = require(path.resolve("bin/user.js"));

module.exports = function () {
    let operations = {
        GET,
    };

    async function GET(req, res, _next) {
        const currentUser = await userManager.getUser(req.user);
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
        tags: ["Authentication"],
    };

    return operations;
};
