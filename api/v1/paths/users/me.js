const { userModel } = require("../../../../model/users");

module.exports = function () {
    let operations = {
        GET,
    };

    async function GET(req, res, _next) {
        try {
            const user = req.user;
            delete user.password;
            delete user.token;
            delete user.source;
            res.status(404).json(user);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "An error occurs on the server" });
        }
    }
    GET.apiDoc = {
        summary: "Returns current logged user",
        security: [{ restrictLoggedUser: [] }],
        operationId: "getMe",
        parameters: [],
        responses: {
            200: {
                description: "User",
                schema: {
                    $ref: "#/definitions/UserMe",
                },
            },
        },
        tags: ["Users"],
    };

    return operations;
};
