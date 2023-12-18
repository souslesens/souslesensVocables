const userManager = require("../../../../bin/user.");
const { userModel } = require("../../../../model/users");

module.exports = function () {
    let operations = {
        POST,
    };

    async function POST(req, res, next) {
        try {
            const token = await userModel.generateUserToken(req.user.login);
            res.status(200).json({ token: token });
        } catch (error) {
            next(error);
        }
    }

    POST.apiDoc = {
        summary: "Update user token",
        description: "Update user token",
        security: [{ restrictLoggedUser: [] }],
        parameters: [],
        responses: {
            200: {
                description: "",
                schema: {
                    type: "object",
                },
            },
        },
    };

    return operations;
};
