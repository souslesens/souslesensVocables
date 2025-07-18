const { userModel } = require("../../../../model/users");
const { mainConfigModel } = require("../../../../model/mainConfig");

module.exports = function () {
    let operations = {
        GET,
    };

    async function GET(req, res, _next) {
        try {
            const config = await mainConfigModel.getConfig();
            if (config.auth === "disabled") {
                res.status(200).json({
                    id: "0",
                    login: "admin",
                    groups: ["admin"],
                    allowSourceCreation: true,
                    maxNumberCreatedSource: 1000,
                });
                return;
            }
            const user = req.user;
            delete user.password;
            delete user.token;
            delete user.source;
            res.status(200).json(user);
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
