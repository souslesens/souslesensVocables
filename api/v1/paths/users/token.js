import { userModel } from "../../../../model/users.js";

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
        summary: "(Re)generate the API token for a user",
        description:
            "Generates a fresh API token for `login` via `userModel.generateUserToken` and persists it. " + "The returned token is intended for non-interactive API access (Authorization header).",
        security: [{ restrictLoggedUser: [] }],
        operationId: "generateUserToken",
        parameters: [
            {
                in: "body",
                name: "body",
                required: false,
                schema: {
                    type: "object",
                    properties: {
                        login: { type: "string", description: "Login of the user whose token must be (re)generated.", example: "alice" },
                    },
                    example: { login: "alice" },
                },
                "x-examples": { "Rotate alice's token": { login: "alice" } },
            },
        ],
        responses: {
            200: {
                description: "New token.",
                schema: { properties: { token: { type: "string" } } },
                examples: { "application/json": { token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." } },
            },
            500: { description: "Server error." },
        },
        tags: ["Users"],
    };

    return operations;
}
