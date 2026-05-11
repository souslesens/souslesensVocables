import path from "path";
import userManager from "../../../../bin/user.js";

export default function () {
    let operations = {
        GET,
    };

    async function GET(req, res, _next) {
        const currentUser = await userManager.getUser(req.user);
        res.status(200).json(currentUser);
    }

    GET.apiDoc = {
        summary: "Return the authenticated user context",
        description:
            "Returns the resolved user object (`userManager.getUser(req.user)`), including `groups`, `allowSourceCreation` " +
            "and `maxNumberCreatedSource`. Used by the frontend to bootstrap the session and decide which tools to expose. " +
            'When `mainConfig.auth === "disabled"`, this still returns a synthetic admin user with login `admin`.',
        operationId: "authWhoami",
        parameters: [],
        responses: {
            200: {
                description: "Current user info.",
                schema: { $ref: "#/definitions/AuthCheck" },
                examples: {
                    "application/json": {
                        user: { id: "0", login: "admin", groups: ["admin"] },
                        allowSourceCreation: true,
                        maxNumberCreatedSource: 1000,
                    },
                },
            },
        },
        tags: ["Authentication"],
    };

    return operations;
}
