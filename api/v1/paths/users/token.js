import { userModel } from '../../../../model/users.js';

export default function () {
    let operations = {
        POST,
    };

    async function POST(req, res, _next) {
        try {
            const token = await userModel.generateUserToken(req.body.login);
            res.status(200).json({ token: token });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "An error occurs on the server" });
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
        tags: ["Users"],
    };

    return operations;
};
